/**
 * Auto-send review requests when triggered by business events
 * (invoice paid, project completed). Fire-and-forget — never throws.
 */
import { getSettings, getPlatforms, createRequest } from '../models/reputationModel.js';
import { getClientById } from '../models/clientModel.js';
import { getBrandById } from '../models/brandModel.js';
import { getTwilioConnection } from '../models/smsModel.js';
import { sendReviewRequestEmail } from './emailUtils.js';

const API_BASE = process.env.API_URL || process.env.BACKEND_URL || 'https://api.faithharborclienthub.com/api';

function interpolate(template, vars) {
  return (template || '').replace(/\{(\w+)\}/g, (_, key) => vars[key] || '');
}

export async function autoSendReviewRequest(brandId, clientId, triggerSource) {
  if (!brandId || !clientId) return;

  try {
    const { settings, platforms } = await getSettings(brandId);

    // Check if auto-trigger is enabled for this event
    const enabled =
      (triggerSource === 'invoice_paid'       && settings.auto_after_invoice) ||
      (triggerSource === 'project_completed'  && settings.auto_after_project);

    if (!enabled) return;

    // Get client and brand info
    const [client, brand] = await Promise.all([
      getClientById(clientId),
      getBrandById(brandId),
    ]);

    if (!client) return;

    // Resolve review URL from default platform setting
    const defaultPlatform = settings.default_platform || 'google';
    const platformRecord = platforms.find(p => p.platform === defaultPlatform && p.is_active && p.review_url);
    if (!platformRecord?.review_url) return; // No review URL configured — skip

    const brandName = brand?.name || 'Your Provider';

    // Determine channel — prefer email, fall back to SMS
    let channel = null;
    if (client.email) {
      channel = 'email';
    } else if (client.phone) {
      const twilioConn = await getTwilioConnection(brandId).catch(() => null);
      if (twilioConn) channel = 'sms';
    }

    if (!channel) return; // No way to contact client

    // Create DB record — get tracking token from returned row
    const vars = { client_name: client.name, brand_name: brandName, review_url: platformRecord.review_url };
    const msgTemplate = channel === 'sms' ? settings.default_sms_message : settings.default_email_message;
    const message = interpolate(msgTemplate, vars);

    const requestRecord = await createRequest({
      brand_id: brandId,
      client_id: clientId,
      channel,
      platform: defaultPlatform,
      review_url: platformRecord.review_url,
      message,
      trigger_source: triggerSource,
    });

    const trackingUrl = `${API_BASE}/reputation/track/${requestRecord.tracking_token}`;

    if (channel === 'email') {
      await sendReviewRequestEmail(client.email, client.name, brandName, message, trackingUrl);
    } else {
      // SMS channel
      const twilioConn = await getTwilioConnection(brandId);
      if (twilioConn) {
        const { default: twilio } = await import('twilio');
        const twilioClient = twilio(twilioConn.account_sid, twilioConn.auth_token);
        const smsBody = interpolate(settings.default_sms_message || '{client_name}, leave us a review: {review_url}', {
          ...vars,
          review_url: trackingUrl,
        });
        await twilioClient.messages.create({
          from: twilioConn.phone_number,
          to: client.phone,
          body: smsBody,
        });
      }
    }
  } catch (err) {
    // Never crash the calling request
    console.error('[Reputation] autoSendReviewRequest error:', err.message);
  }
}
