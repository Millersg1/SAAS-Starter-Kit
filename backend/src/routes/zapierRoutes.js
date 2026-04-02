import express from 'express';
import { query } from '../config/database.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';

const router = express.Router();

// All Zapier routes use API key auth
router.use(apiKeyAuth);

/**
 * Zapier-compatible REST Hooks API.
 * Zapier polls these endpoints or subscribes to webhooks.
 */

// ── Authentication test (Zapier "Test" step) ────────────────────────────────
router.get('/me', catchAsync(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Invalid API key' });
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    brand_id: req.apiBrandId,
  });
}));

// ── Subscribe to hook (Zapier creates subscription) ─────────────────────────
router.post('/hooks/subscribe', catchAsync(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { hookUrl, event } = req.body;
  if (!hookUrl || !event) {
    return res.status(400).json({ message: 'hookUrl and event are required' });
  }

  const validEvents = [
    'client.created', 'client.updated', 'client.deleted',
    'invoice.created', 'invoice.paid', 'invoice.overdue',
    'deal.created', 'deal.moved', 'deal.won', 'deal.lost',
    'project.created', 'project.completed',
    'task.created', 'task.completed',
    'lead.submitted', 'booking.created',
    'proposal.accepted', 'proposal.rejected',
    'contract.signed', 'ticket.created',
    'chat.message', 'form.submitted',
  ];

  if (!validEvents.includes(event)) {
    return res.status(400).json({
      message: `Invalid event. Valid events: ${validEvents.join(', ')}`,
    });
  }

  const result = await query(
    `INSERT INTO zapier_subscriptions (brand_id, user_id, hook_url, event, api_key_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [req.apiBrandId, req.user.id, hookUrl, event, req.user.api_key_id]
  );

  res.status(201).json({ id: result.rows[0].id });
}));

// ── Unsubscribe from hook ───────────────────────────────────────────────────
router.delete('/hooks/subscribe/:hookId', catchAsync(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  await query(
    `DELETE FROM zapier_subscriptions WHERE id = $1 AND user_id = $2`,
    [req.params.hookId, req.user.id]
  );

  res.json({ success: true });
}));

// ── Polling triggers (fallback for Zapier if REST hooks aren't used) ────────

router.get('/triggers/new-clients', catchAsync(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const result = await query(
    `SELECT id, name, email, phone, company, status, created_at
     FROM clients WHERE brand_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.apiBrandId]
  );
  res.json(result.rows);
}));

router.get('/triggers/new-invoices', catchAsync(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const result = await query(
    `SELECT id, invoice_number, status, total_amount, amount_due, currency, created_at
     FROM invoices WHERE brand_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.apiBrandId]
  );
  res.json(result.rows);
}));

router.get('/triggers/new-deals', catchAsync(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const result = await query(
    `SELECT id, name, value, stage, status, created_at
     FROM deals WHERE brand_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.apiBrandId]
  );
  res.json(result.rows);
}));

router.get('/triggers/new-leads', catchAsync(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const result = await query(
    `SELECT id, name, email, data, status, submitted_at AS created_at
     FROM lead_submissions WHERE brand_id = $1 ORDER BY submitted_at DESC LIMIT 50`,
    [req.apiBrandId]
  );
  res.json(result.rows);
}));

router.get('/triggers/new-bookings', catchAsync(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const result = await query(
    `SELECT id, guest_name, guest_email, start_time, end_time, status, created_at
     FROM bookings WHERE brand_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.apiBrandId]
  );
  res.json(result.rows);
}));

// ── Actions (Zapier "Do" step — create entities) ────────────────────────────

router.post('/actions/create-client', catchAsync(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { name, email, phone, company, status } = req.body;
  if (!name) return res.status(400).json({ message: 'name is required' });

  const result = await query(
    `INSERT INTO clients (brand_id, name, email, phone, company, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [req.apiBrandId, name, email, phone, company, status || 'active', req.user.id]
  );
  res.status(201).json(result.rows[0]);
}));

router.post('/actions/create-task', catchAsync(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { title, description, due_date, priority, assigned_to } = req.body;
  if (!title) return res.status(400).json({ message: 'title is required' });

  const result = await query(
    `INSERT INTO tasks (brand_id, title, description, due_date, priority, assigned_to, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [req.apiBrandId, title, description, due_date, priority || 'medium', assigned_to, req.user.id]
  );
  res.status(201).json(result.rows[0]);
}));

router.post('/actions/create-note', catchAsync(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { client_id, content, activity_type } = req.body;
  if (!client_id || !content) return res.status(400).json({ message: 'client_id and content required' });

  // Verify client belongs to the authenticated brand
  const clientCheck = await query(
    `SELECT id FROM clients WHERE id = $1 AND brand_id = $2`,
    [client_id, req.apiBrandId]
  );
  if (clientCheck.rows.length === 0) {
    return res.status(404).json({ message: 'Client not found in this brand' });
  }

  const result = await query(
    `INSERT INTO client_activities (client_id, user_id, activity_type, description, brand_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [client_id, req.user.id, activity_type || 'note', content, req.apiBrandId]
  );
  res.status(201).json(result.rows[0]);
}));

export default router;

/**
 * Fire a Zapier webhook for an event.
 * Called from controllers when entities are created/updated.
 */
export async function fireZapierHook(brandId, event, data) {
  try {
    const subs = await query(
      `SELECT hook_url FROM zapier_subscriptions WHERE brand_id = $1 AND event = $2`,
      [brandId, event]
    );

    const promises = subs.rows.map(async (sub) => {
      try {
        const response = await fetch(sub.hook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok && response.status === 410) {
          // Zapier sends 410 Gone when subscription is deleted
          await query(`DELETE FROM zapier_subscriptions WHERE hook_url = $1`, [sub.hook_url]);
        }
      } catch (err) {
        console.error(`[Zapier] Hook delivery failed for ${event}:`, err.message);
      }
    });

    await Promise.allSettled(promises);
  } catch (err) {
    console.error('[Zapier] Error firing hooks:', err.message);
  }
}
