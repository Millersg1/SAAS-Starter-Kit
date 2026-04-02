import express from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../config/database.js';
import { protect } from '../middleware/authMiddleware.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

const router = express.Router();

// ── Create table if not exists ──────────────────────────────────────────────
const initTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(255),
      company VARCHAR(255),
      quote TEXT NOT NULL,
      video_url TEXT,
      avatar_url TEXT,
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      status VARCHAR(20) DEFAULT 'pending',
      source VARCHAR(50) DEFAULT 'website',
      is_featured BOOLEAN DEFAULT FALSE,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      approved_at TIMESTAMPTZ,
      approved_by UUID REFERENCES users(id) ON DELETE SET NULL
    )
  `);
};
initTable().catch((err) => console.error('Failed to create testimonials table:', err.message));

// Rate limit for public submission
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { status: 'fail', message: 'Too many submissions, please try again later.' },
});

// ── PUBLIC ROUTES (no auth) ─────────────────────────────────────────────────

/**
 * GET /api/testimonials/public
 * List approved testimonials for the public landing page.
 */
router.get('/public', catchAsync(async (req, res) => {
  const result = await query(
    `SELECT id, name, role, company, quote, video_url, avatar_url, rating, is_featured, approved_at
     FROM testimonials
     WHERE status = 'approved'
     ORDER BY is_featured DESC, approved_at DESC
     LIMIT 20`
  );

  res.json({ status: 'success', data: result.rows });
}));

/**
 * POST /api/testimonials/submit
 * Submit a new testimonial (public, rate limited).
 */
router.post('/submit', submitLimiter, catchAsync(async (req, res) => {
  const { name, role, company, quote, video_url, rating } = req.body;

  if (!name || !quote) {
    throw new AppError('Name and review text are required.', 400);
  }

  if (rating && (rating < 1 || rating > 5)) {
    throw new AppError('Rating must be between 1 and 5.', 400);
  }

  const result = await query(
    `INSERT INTO testimonials (name, role, company, quote, video_url, rating, status, source, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'website', NOW())
     RETURNING id`,
    [name, role || null, company || null, quote, video_url || null, rating || null]
  );

  res.status(201).json({
    status: 'success',
    message: 'Thank you! Your testimonial has been submitted for review.',
    data: { id: result.rows[0].id },
  });
}));

// ── PROTECTED ROUTES (auth required) ────────────────────────────────────────

/**
 * GET /api/testimonials/:brandId
 * List all testimonials for admin management (all statuses).
 */
router.get('/:brandId', protect, catchAsync(async (req, res) => {
  const { brandId } = req.params;

  const result = await query(
    `SELECT t.*, u.name AS approved_by_name
     FROM testimonials t
     LEFT JOIN users u ON u.id = t.approved_by
     WHERE t.brand_id = $1 OR t.brand_id IS NULL
     ORDER BY t.submitted_at DESC`,
    [brandId]
  );

  res.json({ status: 'success', data: result.rows });
}));

/**
 * PATCH /api/testimonials/:brandId/:testimonialId
 * Update testimonial (approve, reject, feature).
 */
router.patch('/:brandId/:testimonialId', protect, catchAsync(async (req, res) => {
  const { brandId, testimonialId } = req.params;
  const { status, is_featured } = req.body;

  // Build dynamic SET clause
  const sets = [];
  const params = [];
  let idx = 1;

  if (status !== undefined) {
    sets.push(`status = $${idx++}`);
    params.push(status);
    if (status === 'approved') {
      sets.push(`approved_at = NOW()`);
      sets.push(`approved_by = $${idx++}`);
      params.push(req.user.id);
      sets.push(`brand_id = $${idx++}`);
      params.push(brandId);
    }
  }

  if (is_featured !== undefined) {
    sets.push(`is_featured = $${idx++}`);
    params.push(is_featured);
  }

  if (sets.length === 0) {
    throw new AppError('No fields to update.', 400);
  }

  params.push(testimonialId);

  const result = await query(
    `UPDATE testimonials SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );

  if (result.rowCount === 0) {
    throw new AppError('Testimonial not found.', 404);
  }

  res.json({ status: 'success', data: result.rows[0] });
}));

/**
 * DELETE /api/testimonials/:brandId/:testimonialId
 * Delete a testimonial.
 */
router.delete('/:brandId/:testimonialId', protect, catchAsync(async (req, res) => {
  const { testimonialId } = req.params;

  const result = await query('DELETE FROM testimonials WHERE id = $1', [testimonialId]);

  if (result.rowCount === 0) {
    throw new AppError('Testimonial not found.', 404);
  }

  res.json({ status: 'success', message: 'Testimonial deleted.' });
}));

export default router;
