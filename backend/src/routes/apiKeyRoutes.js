import express from 'express';
import crypto from 'crypto';
import { protect } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import { getBrandMember } from '../models/brandModel.js';

const router = express.Router();

router.use(protect);

/**
 * GET /api/api-keys/:brandId
 * List all API keys for a brand.
 */
router.get('/:brandId', catchAsync(async (req, res, next) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return next(new AppError('Only brand owners/admins can manage API keys.', 403));
  }

  const result = await query(
    `SELECT id, name, key_prefix, scopes, is_active, last_used_at, request_count,
            created_at, expires_at, created_by
     FROM api_keys WHERE brand_id = $1 ORDER BY created_at DESC`,
    [req.params.brandId]
  );

  res.json({ status: 'success', data: { keys: result.rows } });
}));

/**
 * POST /api/api-keys/:brandId
 * Create a new API key. The full key is returned ONCE.
 */
router.post('/:brandId', catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return next(new AppError('Only brand owners/admins can create API keys.', 403));
  }

  const { name, scopes, expires_in_days } = req.body;
  if (!name?.trim()) return next(new AppError('Key name is required.', 400));

  // Generate cryptographically secure API key
  const rawKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 12);

  const expiresAt = expires_in_days
    ? new Date(Date.now() + expires_in_days * 86400000).toISOString()
    : null;

  const result = await query(
    `INSERT INTO api_keys (brand_id, name, key_hash, key_prefix, scopes, expires_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, key_prefix, scopes, is_active, created_at, expires_at`,
    [brandId, name.trim(), keyHash, keyPrefix, JSON.stringify(scopes || ['*']), expiresAt, req.user.id]
  );

  res.status(201).json({
    status: 'success',
    data: {
      key: result.rows[0],
      api_key: rawKey, // Only returned once!
      warning: 'Save this API key now. It will not be shown again.',
    },
  });
}));

/**
 * PATCH /api/api-keys/:brandId/:keyId
 * Update key name, scopes, or active status.
 */
router.patch('/:brandId/:keyId', catchAsync(async (req, res, next) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return next(new AppError('Access denied.', 403));
  }

  const { name, scopes, is_active } = req.body;
  const sets = [];
  const vals = [];
  let idx = 1;

  if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name.trim()); }
  if (scopes !== undefined) { sets.push(`scopes = $${idx++}`); vals.push(JSON.stringify(scopes)); }
  if (is_active !== undefined) { sets.push(`is_active = $${idx++}`); vals.push(!!is_active); }

  if (sets.length === 0) return next(new AppError('Nothing to update.', 400));

  vals.push(req.params.keyId, req.params.brandId);
  const result = await query(
    `UPDATE api_keys SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${idx++} AND brand_id = $${idx}
     RETURNING id, name, key_prefix, scopes, is_active, last_used_at, request_count, created_at, expires_at`,
    vals
  );

  if (result.rows.length === 0) return next(new AppError('API key not found.', 404));
  res.json({ status: 'success', data: { key: result.rows[0] } });
}));

/**
 * DELETE /api/api-keys/:brandId/:keyId
 * Permanently delete an API key.
 */
router.delete('/:brandId/:keyId', catchAsync(async (req, res, next) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return next(new AppError('Access denied.', 403));
  }

  await query(
    `DELETE FROM api_keys WHERE id = $1 AND brand_id = $2`,
    [req.params.keyId, req.params.brandId]
  );

  res.json({ status: 'success', message: 'API key deleted.' });
}));

export default router;
