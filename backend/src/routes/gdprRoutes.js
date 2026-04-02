import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

router.use(protect);

/**
 * POST /api/gdpr/export
 * Request a data export (GDPR Article 15 — Right of Access).
 */
router.post('/export', catchAsync(async (req, res) => {
  // Check for existing pending request
  const existing = await query(
    `SELECT id FROM gdpr_requests WHERE user_id = $1 AND request_type = 'export' AND status IN ('pending', 'processing')`,
    [req.user.id]
  );
  if (existing.rows.length > 0) {
    return res.json({ status: 'success', message: 'Export request already in progress.', request_id: existing.rows[0].id });
  }

  const result = await query(
    `INSERT INTO gdpr_requests (user_id, request_type) VALUES ($1, 'export') RETURNING id`,
    [req.user.id]
  );

  // Process export asynchronously
  processDataExport(req.user.id, result.rows[0].id).catch(err =>
    console.error('[GDPR] Export error:', err.message)
  );

  res.status(202).json({
    status: 'success',
    message: 'Data export request received. You will be notified when ready.',
    request_id: result.rows[0].id,
  });
}));

/**
 * POST /api/gdpr/delete
 * Request account deletion (GDPR Article 17 — Right to Erasure).
 */
router.post('/delete', catchAsync(async (req, res) => {
  const { confirmation } = req.body;
  if (confirmation !== 'DELETE MY ACCOUNT') {
    return res.status(400).json({
      status: 'fail',
      message: 'Please type "DELETE MY ACCOUNT" to confirm.',
    });
  }

  const result = await query(
    `INSERT INTO gdpr_requests (user_id, request_type) VALUES ($1, 'deletion') RETURNING id`,
    [req.user.id]
  );

  // Schedule deletion (30-day grace period)
  res.json({
    status: 'success',
    message: 'Account deletion scheduled. Your data will be permanently deleted in 30 days. Contact support to cancel.',
    request_id: result.rows[0].id,
    deletion_date: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
}));

/**
 * GET /api/gdpr/requests
 * Get user's GDPR requests.
 */
router.get('/requests', catchAsync(async (req, res) => {
  const result = await query(
    `SELECT id, request_type, status, requested_at, completed_at, download_url
     FROM gdpr_requests WHERE user_id = $1 ORDER BY requested_at DESC`,
    [req.user.id]
  );
  res.json({ status: 'success', data: { requests: result.rows } });
}));

/**
 * DELETE /api/gdpr/delete
 * Cancel a pending deletion request.
 */
router.delete('/delete', catchAsync(async (req, res) => {
  await query(
    `UPDATE gdpr_requests SET status = 'canceled' WHERE user_id = $1 AND request_type = 'deletion' AND status = 'pending'`,
    [req.user.id]
  );
  res.json({ status: 'success', message: 'Deletion request canceled.' });
}));

/**
 * GET /api/gdpr/retention/:brandId
 * Get data retention policies for a brand.
 */
router.get('/retention/:brandId', catchAsync(async (req, res) => {
  const result = await query(
    `SELECT * FROM data_retention_policies WHERE brand_id = $1 ORDER BY entity_type`,
    [req.params.brandId]
  );
  res.json({ status: 'success', data: { policies: result.rows } });
}));

/**
 * PUT /api/gdpr/retention/:brandId
 * Update data retention policy.
 */
router.put('/retention/:brandId', catchAsync(async (req, res) => {
  const { entity_type, retention_days, auto_delete } = req.body;
  if (!entity_type || !retention_days) {
    return res.status(400).json({ status: 'fail', message: 'entity_type and retention_days required.' });
  }

  const result = await query(
    `INSERT INTO data_retention_policies (brand_id, entity_type, retention_days, auto_delete)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (brand_id, entity_type) DO UPDATE
     SET retention_days = $3, auto_delete = $4
     RETURNING *`,
    [req.params.brandId, entity_type, retention_days, auto_delete || false]
  );

  res.json({ status: 'success', data: { policy: result.rows[0] } });
}));

// ── Background data export processor ─────────────────────────────────────────

async function processDataExport(userId, requestId) {
  try {
    await query(`UPDATE gdpr_requests SET status = 'processing' WHERE id = $1`, [requestId]);

    // Gather all user data
    const userData = {};

    const user = await query(`SELECT id, name, email, role, created_at FROM users WHERE id = $1`, [userId]);
    userData.profile = user.rows[0];

    const brands = await query(
      `SELECT b.* FROM brands b JOIN brand_members bm ON bm.brand_id = b.id WHERE bm.user_id = $1`, [userId]
    );
    userData.brands = brands.rows;

    const brandIds = brands.rows.map(b => b.id);
    if (brandIds.length > 0) {
      // Paginated export — fetch in chunks of 500 to avoid OOM on large tenants
      const PAGE_SIZE = 500;
      for (const table of ['clients', 'invoices', 'projects', 'tasks']) {
        userData[table] = [];
        let offset = 0;
        while (true) {
          const chunk = await query(
            `SELECT * FROM ${table} WHERE brand_id = ANY($1) ORDER BY id LIMIT $2 OFFSET $3`,
            [brandIds, PAGE_SIZE, offset]
          );
          userData[table].push(...chunk.rows);
          if (chunk.rows.length < PAGE_SIZE) break;
          offset += PAGE_SIZE;
        }
      }
    }

    // Store as JSON (in production, upload to S3 and provide download link)
    const exportData = JSON.stringify(userData, null, 2);
    const { uploadFile, generateKey } = await import('../utils/storageService.js');
    const key = generateKey('gdpr-exports', `export-${userId}.json`);
    const { url } = await uploadFile(Buffer.from(exportData), key, { contentType: 'application/json' });

    await query(
      `UPDATE gdpr_requests SET status = 'completed', completed_at = NOW(), download_url = $1 WHERE id = $2`,
      [url, requestId]
    );
  } catch (err) {
    console.error('[GDPR] Export processing error:', err.message);
    await query(`UPDATE gdpr_requests SET status = 'failed', notes = $1 WHERE id = $2`, [err.message, requestId]);
  }
}

export default router;
