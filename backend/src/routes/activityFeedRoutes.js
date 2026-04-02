import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { getBrandMember } from '../models/brandModel.js';

const router = express.Router();

router.use(protect);

/**
 * GET /api/activity-feed/:brandId
 * Get team activity feed / changelog.
 */
router.get('/:brandId', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const { limit = 50, offset = 0, entity_type, user_id } = req.query;

  let sql = `
    SELECT af.*, u.name AS user_name, u.email AS user_email
    FROM activity_feed af
    LEFT JOIN users u ON u.id = af.user_id
    WHERE af.brand_id = $1
  `;
  const params = [req.params.brandId];
  let idx = 2;

  if (entity_type) {
    sql += ` AND af.entity_type = $${idx++}`;
    params.push(entity_type);
  }
  if (user_id) {
    sql += ` AND af.user_id = $${idx++}`;
    params.push(user_id);
  }

  sql += ` ORDER BY af.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await query(sql, params);

  // Also get total count
  let countSql = `SELECT COUNT(*)::int AS total FROM activity_feed WHERE brand_id = $1`;
  const countParams = [req.params.brandId];
  if (entity_type) { countSql += ` AND entity_type = $2`; countParams.push(entity_type); }

  const countResult = await query(countSql, countParams);

  res.json({
    status: 'success',
    data: {
      activities: result.rows,
      total: countResult.rows[0]?.total || 0,
    },
  });
}));

/**
 * GET /api/activity-feed/:brandId/summary
 * Get activity summary for the last 7 days.
 */
router.get('/:brandId/summary', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const result = await query(
    `SELECT entity_type, action, COUNT(*)::int AS count
     FROM activity_feed
     WHERE brand_id = $1 AND created_at > NOW() - INTERVAL '7 days'
     GROUP BY entity_type, action
     ORDER BY count DESC`,
    [req.params.brandId]
  );

  const topContributors = await query(
    `SELECT af.user_id, u.name, COUNT(*)::int AS actions
     FROM activity_feed af
     JOIN users u ON u.id = af.user_id
     WHERE af.brand_id = $1 AND af.created_at > NOW() - INTERVAL '7 days'
     GROUP BY af.user_id, u.name
     ORDER BY actions DESC LIMIT 10`,
    [req.params.brandId]
  );

  res.json({
    status: 'success',
    data: {
      summary: result.rows,
      top_contributors: topContributors.rows,
    },
  });
}));

export default router;

/**
 * Log an activity to the feed.
 * Call from controllers when entities are created/updated/deleted.
 */
export async function logActivity(brandId, userId, entityType, entityId, action, description, metadata = {}) {
  try {
    await query(
      `INSERT INTO activity_feed (brand_id, user_id, entity_type, entity_id, action, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [brandId, userId, entityType, entityId, action, description, JSON.stringify(metadata)]
    );
  } catch (err) {
    // Non-fatal — don't break the main operation
    console.error('[ActivityFeed] Log error:', err.message);
  }
}
