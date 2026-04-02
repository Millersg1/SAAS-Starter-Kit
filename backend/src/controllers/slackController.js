import { query } from '../config/database.js';
import { getBrandMember } from '../models/brandModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';
import { SUPPORTED_EVENTS } from '../utils/slackNotify.js';

/** GET /api/slack/:brandId — Get Slack integration config */
export const getConfig = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const result = await query(
    `SELECT id, brand_id, webhook_url, channel, events, is_active, created_at, updated_at
     FROM slack_integrations
     WHERE brand_id = $1
     LIMIT 1`,
    [brandId],
  );

  res.json({
    status: 'success',
    data: {
      integration: result.rows[0] || null,
      supportedEvents: SUPPORTED_EVENTS,
    },
  });
});

/** POST /api/slack/:brandId — Create / configure Slack integration */
export const createConfig = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const { webhook_url, channel, events } = req.body;

  if (!webhook_url) return next(new AppError('webhook_url is required', 400));
  if (!webhook_url.startsWith('https://hooks.slack.com/')) {
    return next(new AppError('webhook_url must be a valid Slack webhook URL', 400));
  }
  if (!Array.isArray(events) || events.length === 0) {
    return next(new AppError('At least one event is required', 400));
  }

  const invalid = events.filter((e) => !SUPPORTED_EVENTS.includes(e));
  if (invalid.length > 0) {
    return next(new AppError(`Unknown events: ${invalid.join(', ')}`, 400));
  }

  // Upsert — one integration per brand
  const result = await query(
    `INSERT INTO slack_integrations (brand_id, webhook_url, channel, events)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (brand_id)
     DO UPDATE SET webhook_url = EXCLUDED.webhook_url,
                   channel     = EXCLUDED.channel,
                   events      = EXCLUDED.events,
                   is_active   = TRUE,
                   updated_at  = NOW()
     RETURNING *`,
    [brandId, webhook_url, channel || null, JSON.stringify(events)],
  );

  res.status(201).json({ status: 'success', data: { integration: result.rows[0] } });
});

/** PATCH /api/slack/:brandId — Update Slack integration */
export const updateConfig = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const { webhook_url, channel, events, is_active } = req.body;

  if (webhook_url && !webhook_url.startsWith('https://hooks.slack.com/')) {
    return next(new AppError('webhook_url must be a valid Slack webhook URL', 400));
  }
  if (events !== undefined) {
    if (!Array.isArray(events) || events.length === 0) {
      return next(new AppError('At least one event is required', 400));
    }
    const invalid = events.filter((e) => !SUPPORTED_EVENTS.includes(e));
    if (invalid.length > 0) {
      return next(new AppError(`Unknown events: ${invalid.join(', ')}`, 400));
    }
  }

  // Build dynamic SET clause
  const sets = [];
  const vals = [];
  let idx = 1;

  if (webhook_url !== undefined) { sets.push(`webhook_url = $${idx++}`); vals.push(webhook_url); }
  if (channel !== undefined)     { sets.push(`channel = $${idx++}`);     vals.push(channel || null); }
  if (events !== undefined)      { sets.push(`events = $${idx++}`);      vals.push(JSON.stringify(events)); }
  if (is_active !== undefined)   { sets.push(`is_active = $${idx++}`);   vals.push(is_active); }

  if (sets.length === 0) return next(new AppError('No fields to update', 400));

  sets.push(`updated_at = NOW()`);
  vals.push(brandId);

  const result = await query(
    `UPDATE slack_integrations SET ${sets.join(', ')} WHERE brand_id = $${idx} RETURNING *`,
    vals,
  );

  if (result.rows.length === 0) {
    return next(new AppError('No Slack integration found for this brand', 404));
  }

  res.json({ status: 'success', data: { integration: result.rows[0] } });
});

/** DELETE /api/slack/:brandId — Remove Slack integration */
export const deleteConfig = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const result = await query(
    `DELETE FROM slack_integrations WHERE brand_id = $1 RETURNING id`,
    [brandId],
  );

  if (result.rows.length === 0) {
    return next(new AppError('No Slack integration found for this brand', 404));
  }

  res.json({ status: 'success', message: 'Slack integration removed' });
});

/** POST /api/slack/:brandId/test — Send a test message */
export const testNotification = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const result = await query(
    `SELECT webhook_url, channel FROM slack_integrations WHERE brand_id = $1 AND is_active = TRUE LIMIT 1`,
    [brandId],
  );

  if (result.rows.length === 0) {
    return next(new AppError('No active Slack integration found', 404));
  }

  const { webhook_url, channel } = result.rows[0];

  const payload = {
    text: 'Test notification from SAAS Surface',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: ':rocket: SAAS Surface Test', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'This is a test notification. If you see this, your Slack integration is working correctly!',
        },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Sent by *${req.user.name || req.user.email}* at ${new Date().toISOString()}` },
        ],
      },
    ],
  };

  if (channel) payload.channel = channel;

  const response = await fetch(webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    return next(new AppError(`Slack responded with ${response.status}: ${body}`, 502));
  }

  res.json({ status: 'success', message: 'Test notification sent successfully' });
});
