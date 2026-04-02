import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { checkDomainHealth, getBounceStats } from '../utils/emailDeliverability.js';
import { getBrandMember } from '../models/brandModel.js';
import { query } from '../config/database.js';

const router = express.Router();

router.use(protect);

/**
 * GET /api/email-health/:brandId/check/:domain
 * Check SPF/DKIM/DMARC for a domain.
 */
router.get('/:brandId/check/:domain', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const health = await checkDomainHealth(req.params.domain);
  res.json({ status: 'success', data: { domain: req.params.domain, health } });
}));

/**
 * GET /api/email-health/:brandId/bounces
 * Get bounce statistics.
 */
router.get('/:brandId/bounces', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const stats = await getBounceStats(req.params.brandId);

  const recent = await query(
    `SELECT email, bounce_type, reason, created_at
     FROM email_bounces WHERE brand_id = $1
     ORDER BY created_at DESC LIMIT 50`,
    [req.params.brandId]
  );

  res.json({ status: 'success', data: { stats, recent_bounces: recent.rows } });
}));

export default router;
