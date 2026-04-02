import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import { getBrandMember } from '../models/brandModel.js';

const router = express.Router();

router.use(protect);

/**
 * GET /api/white-label/:brandId
 * Get white-label settings for a brand.
 */
router.get('/:brandId', catchAsync(async (req, res, next) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const result = await query(
    `SELECT custom_domain, custom_login_logo, custom_login_bg,
            custom_favicon, custom_css, hide_branding,
            email_from_name, email_from_domain,
            portal_title, portal_description
     FROM brands WHERE id = $1`,
    [req.params.brandId]
  );

  if (!result.rows[0]) return next(new AppError('Brand not found.', 404));

  res.json({ status: 'success', data: { settings: result.rows[0] } });
}));

/**
 * PATCH /api/white-label/:brandId
 * Update white-label settings.
 */
router.patch('/:brandId', catchAsync(async (req, res, next) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return next(new AppError('Only owners/admins can update white-label settings.', 403));
  }

  const allowed = [
    'custom_domain', 'custom_login_logo', 'custom_login_bg',
    'custom_favicon', 'custom_css', 'hide_branding',
    'email_from_name', 'email_from_domain',
    'portal_title', 'portal_description',
  ];

  const sets = [];
  const vals = [];
  let idx = 1;

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      sets.push(`${field} = $${idx++}`);
      vals.push(req.body[field]);
    }
  }

  if (sets.length === 0) return next(new AppError('Nothing to update.', 400));

  // Validate custom domain format
  if (req.body.custom_domain) {
    const domain = req.body.custom_domain.toLowerCase().trim();
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(domain)) {
      return next(new AppError('Invalid domain format.', 400));
    }
    // Check uniqueness
    const existing = await query(
      `SELECT id FROM brands WHERE custom_domain = $1 AND id != $2`,
      [domain, req.params.brandId]
    );
    if (existing.rows.length > 0) {
      return next(new AppError('This domain is already in use by another brand.', 409));
    }
  }

  vals.push(req.params.brandId);
  const result = await query(
    `UPDATE brands SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${idx}
     RETURNING custom_domain, custom_login_logo, custom_login_bg,
               custom_favicon, custom_css, hide_branding,
               email_from_name, email_from_domain,
               portal_title, portal_description`,
    vals
  );

  res.json({ status: 'success', data: { settings: result.rows[0] } });
}));

/**
 * POST /api/white-label/:brandId/verify-domain
 * Verify DNS configuration for custom domain.
 */
router.post('/:brandId/verify-domain', catchAsync(async (req, res, next) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return next(new AppError('Access denied.', 403));
  }

  const brand = await query(`SELECT custom_domain FROM brands WHERE id = $1`, [req.params.brandId]);
  const domain = brand.rows[0]?.custom_domain;

  if (!domain) {
    return next(new AppError('No custom domain configured.', 400));
  }

  // Check DNS by attempting resolution
  const dns = await import('dns');
  const { promisify } = await import('util');
  const resolveCname = promisify(dns.resolveCname);

  try {
    const records = await resolveCname(domain);
    const appDomain = process.env.APP_HOSTNAME || 'saassurface.com';
    const isValid = records.some(r => r.toLowerCase().includes(appDomain));

    await query(
      `UPDATE brands SET domain_verified = $1, domain_verified_at = $2 WHERE id = $3`,
      [isValid, isValid ? new Date() : null, req.params.brandId]
    );

    res.json({
      status: 'success',
      data: {
        verified: isValid,
        dns_records: records,
        expected_cname: appDomain,
        instructions: isValid
          ? 'Domain verified successfully!'
          : `Please add a CNAME record pointing ${domain} to ${appDomain}`,
      },
    });
  } catch (dnsErr) {
    res.json({
      status: 'success',
      data: {
        verified: false,
        error: 'Could not resolve domain',
        instructions: `Add a CNAME record: ${domain} → ${process.env.APP_HOSTNAME || 'saassurface.com'}`,
      },
    });
  }
}));

export default router;
