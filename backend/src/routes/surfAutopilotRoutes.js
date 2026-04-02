import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { getBrandMember } from '../models/brandModel.js';

const router = express.Router();

router.use(protect);

// ── Inline table creation ────────────────────────────────────────────────────
const ensureTables = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS surf_autopilot_settings (
      brand_id UUID PRIMARY KEY REFERENCES brands(id) ON DELETE CASCADE,
      autopilot_enabled BOOLEAN NOT NULL DEFAULT false,
      auto_followup_emails BOOLEAN NOT NULL DEFAULT false,
      auto_invoice_reminders BOOLEAN NOT NULL DEFAULT false,
      auto_deal_moves BOOLEAN NOT NULL DEFAULT false,
      auto_task_creation BOOLEAN NOT NULL DEFAULT false,
      auto_lead_nurture BOOLEAN NOT NULL DEFAULT false,
      paused_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS surf_autopilot_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      action_type VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100),
      entity_id UUID,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_autopilot_log_brand ON surf_autopilot_log(brand_id, created_at DESC)`);
};
ensureTables().catch(err => console.error('[SurfAutopilot] Table creation error:', err.message));

// ── Helpers ──────────────────────────────────────────────────────────────────
async function ensureSettings(brandId) {
  const existing = await query(`SELECT * FROM surf_autopilot_settings WHERE brand_id = $1`, [brandId]);
  if (existing.rows.length) return existing.rows[0];
  const result = await query(
    `INSERT INTO surf_autopilot_settings (brand_id) VALUES ($1) ON CONFLICT (brand_id) DO NOTHING RETURNING *`,
    [brandId]
  );
  return result.rows[0] || (await query(`SELECT * FROM surf_autopilot_settings WHERE brand_id = $1`, [brandId])).rows[0];
}

// ── GET /:brandId/settings — Get autopilot settings ──────────────────────────
router.get('/:brandId/settings', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const settings = await ensureSettings(req.params.brandId);

  // If paused_until is in the past, auto-resume
  if (settings.paused_until && new Date(settings.paused_until) < new Date()) {
    await query(`UPDATE surf_autopilot_settings SET paused_until = NULL WHERE brand_id = $1`, [req.params.brandId]);
    settings.paused_until = null;
  }

  res.json({ status: 'success', data: { settings } });
}));

// ── PATCH /:brandId/settings — Update autopilot settings (owner/admin) ───────
router.patch('/:brandId/settings', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });
  if (!['owner', 'admin'].includes(member.role)) {
    return res.status(403).json({ message: 'Only owners and admins can update autopilot settings' });
  }

  await ensureSettings(req.params.brandId);

  const allowedFields = [
    'autopilot_enabled', 'auto_followup_emails', 'auto_invoice_reminders',
    'auto_deal_moves', 'auto_task_creation', 'auto_lead_nurture'
  ];

  const updates = [];
  const values = [];
  let idx = 1;

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = $${idx++}`);
      values.push(req.body[field]);
    }
  }

  if (!updates.length) {
    return res.status(400).json({ message: 'No valid fields to update' });
  }

  updates.push(`updated_at = NOW()`);
  values.push(req.params.brandId);

  const result = await query(
    `UPDATE surf_autopilot_settings SET ${updates.join(', ')} WHERE brand_id = $${idx} RETURNING *`,
    values
  );

  res.json({ status: 'success', data: { settings: result.rows[0] } });
}));

// ── GET /:brandId/activity — Get autopilot activity log ──────────────────────
router.get('/:brandId/activity', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const { limit = 50, offset = 0, action_type } = req.query;

  let sql = `SELECT * FROM surf_autopilot_log WHERE brand_id = $1`;
  const params = [req.params.brandId];
  let idx = 2;

  if (action_type) {
    sql += ` AND action_type = $${idx++}`;
    params.push(action_type);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await query(sql, params);

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM surf_autopilot_log WHERE brand_id = $1`,
    [req.params.brandId]
  );

  res.json({
    status: 'success',
    data: {
      activities: result.rows,
      total: countResult.rows[0]?.total || 0,
    },
  });
}));

// ── POST /:brandId/pause — Pause autopilot temporarily ───────────────────────
router.post('/:brandId/pause', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });
  if (!['owner', 'admin'].includes(member.role)) {
    return res.status(403).json({ message: 'Only owners and admins can pause autopilot' });
  }

  const { hours = 24 } = req.body;
  const pauseUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

  await ensureSettings(req.params.brandId);
  const result = await query(
    `UPDATE surf_autopilot_settings SET paused_until = $1, updated_at = NOW() WHERE brand_id = $2 RETURNING *`,
    [pauseUntil, req.params.brandId]
  );

  // Log the pause action
  await query(
    `INSERT INTO surf_autopilot_log (brand_id, action_type, description) VALUES ($1, 'autopilot_paused', $2)`,
    [req.params.brandId, `Autopilot paused for ${hours} hours until ${pauseUntil.toISOString()}`]
  );

  res.json({ status: 'success', data: { settings: result.rows[0] }, message: `Autopilot paused for ${hours} hours` });
}));

// ── POST /:brandId/resume — Resume autopilot ─────────────────────────────────
router.post('/:brandId/resume', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });
  if (!['owner', 'admin'].includes(member.role)) {
    return res.status(403).json({ message: 'Only owners and admins can resume autopilot' });
  }

  await ensureSettings(req.params.brandId);
  const result = await query(
    `UPDATE surf_autopilot_settings SET paused_until = NULL, updated_at = NOW() WHERE brand_id = $1 RETURNING *`,
    [req.params.brandId]
  );

  await query(
    `INSERT INTO surf_autopilot_log (brand_id, action_type, description) VALUES ($1, 'autopilot_resumed', 'Autopilot resumed manually')`,
    [req.params.brandId]
  );

  res.json({ status: 'success', data: { settings: result.rows[0] }, message: 'Autopilot resumed' });
}));

export default router;

/**
 * Log an autopilot action. Call from cron jobs or the autopilot engine.
 */
export async function logAutopilotAction(brandId, actionType, entityType, entityId, description) {
  try {
    await query(
      `INSERT INTO surf_autopilot_log (brand_id, action_type, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [brandId, actionType, entityType, entityId, description]
    );
  } catch (err) {
    console.error('[SurfAutopilot] Log error:', err.message);
  }
}
