import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { query, getClient } from '../config/database.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { getBrandMember } from '../models/brandModel.js';

const router = express.Router();

router.use(protect);

// ── Inline table creation ────────────────────────────────────────────────────
const ensureTables = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS reseller_settings (
      brand_id UUID PRIMARY KEY REFERENCES brands(id) ON DELETE CASCADE,
      is_reseller BOOLEAN NOT NULL DEFAULT false,
      markup_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
      custom_domain VARCHAR(255),
      white_label_name VARCHAR(255),
      commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS reseller_clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reseller_brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      client_brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      monthly_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
      commission_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(reseller_brand_id, client_brand_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_reseller_clients_reseller ON reseller_clients(reseller_brand_id)`);
};
ensureTables().catch(err => console.error('[Reseller] Table creation error:', err.message));

// ── Helpers ──────────────────────────────────────────────────────────────────
async function ensureResellerSettings(brandId) {
  const existing = await query(`SELECT * FROM reseller_settings WHERE brand_id = $1`, [brandId]);
  if (existing.rows.length) return existing.rows[0];
  const result = await query(
    `INSERT INTO reseller_settings (brand_id) VALUES ($1) ON CONFLICT (brand_id) DO NOTHING RETURNING *`,
    [brandId]
  );
  return result.rows[0] || (await query(`SELECT * FROM reseller_settings WHERE brand_id = $1`, [brandId])).rows[0];
}

// ── GET /:brandId/reseller — Get reseller settings ───────────────────────────
router.get('/:brandId/reseller', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const settings = await ensureResellerSettings(req.params.brandId);
  res.json({ status: 'success', data: { settings } });
}));

// ── PATCH /:brandId/reseller — Update reseller settings ──────────────────────
router.patch('/:brandId/reseller', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });
  if (!['owner', 'admin'].includes(member.role)) {
    return res.status(403).json({ message: 'Only owners and admins can update reseller settings' });
  }

  await ensureResellerSettings(req.params.brandId);

  const allowedFields = ['is_reseller', 'markup_percent', 'custom_domain', 'white_label_name', 'commission_rate'];
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
    `UPDATE reseller_settings SET ${updates.join(', ')} WHERE brand_id = $${idx} RETURNING *`,
    values
  );

  res.json({ status: 'success', data: { settings: result.rows[0] } });
}));

// ── GET /:brandId/reseller/clients — List reseller's sub-accounts ────────────
router.get('/:brandId/reseller/clients', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const { status, limit = 50, offset = 0 } = req.query;

  let sql = `
    SELECT rc.*, b.name AS client_brand_name, b.created_at AS client_created_at
    FROM reseller_clients rc
    JOIN brands b ON b.id = rc.client_brand_id
    WHERE rc.reseller_brand_id = $1
  `;
  const params = [req.params.brandId];
  let idx = 2;

  if (status) {
    sql += ` AND rc.status = $${idx++}`;
    params.push(status);
  }

  sql += ` ORDER BY rc.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await query(sql, params);

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM reseller_clients WHERE reseller_brand_id = $1`,
    [req.params.brandId]
  );

  res.json({
    status: 'success',
    data: {
      clients: result.rows,
      total: countResult.rows[0]?.total || 0,
    },
  });
}));

// ── POST /:brandId/reseller/clients — Create a sub-account ──────────────────
router.post('/:brandId/reseller/clients', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });
  if (!['owner', 'admin'].includes(member.role)) {
    return res.status(403).json({ message: 'Only owners and admins can create sub-accounts' });
  }

  // Verify reseller is enabled
  const settings = await ensureResellerSettings(req.params.brandId);
  if (!settings.is_reseller) {
    return res.status(400).json({ message: 'Reseller mode is not enabled. Enable it first.' });
  }

  const { brand_name, owner_email, owner_name } = req.body;
  if (!brand_name) return res.status(400).json({ message: 'brand_name is required' });

  const dbClient = await getClient();
  try {
    await dbClient.query('BEGIN');

    // Create the new brand
    const brandResult = await dbClient.query(
      `INSERT INTO brands (name, plan, created_by) VALUES ($1, 'starter', $2) RETURNING *`,
      [settings.white_label_name ? `${settings.white_label_name} - ${brand_name}` : brand_name, req.user.id]
    );
    const newBrand = brandResult.rows[0];

    // If owner email provided, check if user exists or note for invitation
    let ownerId = req.user.id;
    if (owner_email) {
      const userResult = await dbClient.query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [owner_email]);
      if (userResult.rows.length) {
        ownerId = userResult.rows[0].id;
      }
    }

    // Add owner to new brand
    await dbClient.query(
      `INSERT INTO brand_members (brand_id, user_id, role) VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING`,
      [newBrand.id, ownerId]
    );

    // Create reseller client relationship
    const rcResult = await dbClient.query(
      `INSERT INTO reseller_clients (reseller_brand_id, client_brand_id) VALUES ($1, $2) RETURNING *`,
      [req.params.brandId, newBrand.id]
    );

    await dbClient.query('COMMIT');

    res.status(201).json({
      status: 'success',
      data: {
        brand: newBrand,
        reseller_client: rcResult.rows[0],
      },
      message: 'Sub-account created successfully',
    });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }
}));

// ── GET /:brandId/reseller/earnings — Commission earnings summary ────────────
router.get('/:brandId/reseller/earnings', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const { period = '30' } = req.query;

  const earnings = await query(
    `SELECT
       SUM(commission_earned)::decimal AS total_earned,
       SUM(monthly_revenue)::decimal AS total_revenue,
       COUNT(*)::int AS total_clients,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active_clients
     FROM reseller_clients
     WHERE reseller_brand_id = $1`,
    [req.params.brandId]
  );

  const recentCommissions = await query(
    `SELECT rc.*, b.name AS client_brand_name
     FROM reseller_clients rc
     JOIN brands b ON b.id = rc.client_brand_id
     WHERE rc.reseller_brand_id = $1 AND rc.updated_at > NOW() - ($2 || ' days')::interval
     ORDER BY rc.commission_earned DESC`,
    [req.params.brandId, period]
  );

  res.json({
    status: 'success',
    data: {
      summary: earnings.rows[0],
      recent: recentCommissions.rows,
    },
  });
}));

// ── GET /:brandId/reseller/dashboard — Reseller dashboard overview ───────────
router.get('/:brandId/reseller/dashboard', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const settings = await ensureResellerSettings(req.params.brandId);

  const stats = await query(
    `SELECT
       COUNT(*)::int AS total_clients,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active_clients,
       COUNT(*) FILTER (WHERE status = 'churned')::int AS churned_clients,
       COALESCE(SUM(monthly_revenue), 0)::decimal AS total_mrr,
       COALESCE(SUM(commission_earned), 0)::decimal AS total_commissions,
       COALESCE(SUM(monthly_revenue) FILTER (WHERE status = 'active'), 0)::decimal AS active_mrr
     FROM reseller_clients
     WHERE reseller_brand_id = $1`,
    [req.params.brandId]
  );

  const recentClients = await query(
    `SELECT rc.*, b.name AS client_brand_name
     FROM reseller_clients rc
     JOIN brands b ON b.id = rc.client_brand_id
     WHERE rc.reseller_brand_id = $1
     ORDER BY rc.created_at DESC LIMIT 5`,
    [req.params.brandId]
  );

  res.json({
    status: 'success',
    data: {
      settings,
      stats: stats.rows[0],
      recent_clients: recentClients.rows,
    },
  });
}));

export default router;
