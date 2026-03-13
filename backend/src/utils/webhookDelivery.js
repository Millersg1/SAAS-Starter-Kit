import crypto from 'crypto';
import { query } from '../config/database.js';
import { createDelivery, updateDelivery } from '../models/webhookModel.js';

const MAX_ATTEMPTS = 3;

/**
 * Deliver a webhook event to all active endpoints for a brand.
 * Fire-and-forget — never throws.
 *
 * @param {string} brandId
 * @param {string} eventType  e.g. 'invoice.paid'
 * @param {Object} payload    Event data
 */
export async function deliverWebhook(brandId, eventType, payload) {
  // Wrap everything — this must never crash the calling request
  try {
    const result = await query(
      `SELECT id, url, secret FROM webhook_endpoints
       WHERE brand_id = $1 AND is_active = TRUE AND $2 = ANY(events)`,
      [brandId, eventType]
    );

    for (const endpoint of result.rows) {
      // Create delivery record
      let delivery;
      try {
        delivery = await createDelivery({ endpoint_id: endpoint.id, event_type: eventType, payload });
      } catch (err) {
        console.error('[Webhook] Failed to create delivery record:', err.message);
        continue;
      }

      // Attempt delivery with retries
      let lastStatus = null;
      let lastBody = '';
      let attempt = 0;

      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        attempt = i + 1;
        try {
          const body = JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() });
          const sig = crypto.createHmac('sha256', endpoint.secret).update(body).digest('hex');

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          const res = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-SaasSurface-Event': eventType,
              'X-SaasSurface-Signature': `sha256=${sig}`,
              'User-Agent': 'SaasSurface-Webhooks/1.0',
            },
            body,
            signal: controller.signal,
          });

          clearTimeout(timeout);
          lastStatus = res.status;
          lastBody = await res.text().catch(() => '');

          if (res.ok) break; // success — stop retrying
        } catch (err) {
          lastBody = err.message;
          if (i < MAX_ATTEMPTS - 1) {
            // Back-off: 500ms, 1000ms
            await new Promise(r => setTimeout(r, 500 * (i + 1)));
          }
        }
      }

      // Update delivery record
      const succeeded = lastStatus !== null && lastStatus >= 200 && lastStatus < 300;
      await updateDelivery(delivery.id, {
        status: succeeded ? 'delivered' : 'failed',
        response_status: lastStatus,
        response_body: lastBody?.slice(0, 1000) || null,
        attempts: attempt,
        delivered_at: succeeded ? new Date() : null,
      }).catch(err => console.error('[Webhook] Failed to update delivery:', err.message));
    }
  } catch (err) {
    console.error(`[Webhook] deliverWebhook error (brand=${brandId}, event=${eventType}):`, err.message);
  }
}
