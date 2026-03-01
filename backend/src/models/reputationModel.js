import { query } from '../config/database.js';

// ── Platforms ─────────────────────────────────────────────────────────────────

export const getPlatforms = async (brandId) => {
  const result = await query(
    `SELECT * FROM reputation_platforms WHERE brand_id = $1 ORDER BY platform`,
    [brandId]
  );
  return result.rows;
};

export const upsertPlatform = async (brandId, platform, data) => {
  const { label, review_url, is_active } = data;
  const result = await query(
    `INSERT INTO reputation_platforms (brand_id, platform, label, review_url, is_active)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (brand_id, platform) DO UPDATE
       SET label = EXCLUDED.label,
           review_url = EXCLUDED.review_url,
           is_active = EXCLUDED.is_active
     RETURNING *`,
    [brandId, platform, label || null, review_url || null, is_active !== false]
  );
  return result.rows[0];
};

export const deletePlatform = async (id, brandId) => {
  await query(
    `DELETE FROM reputation_platforms WHERE id = $1 AND brand_id = $2`,
    [id, brandId]
  );
};

// ── Settings ──────────────────────────────────────────────────────────────────

export const getSettings = async (brandId) => {
  const [settingsResult, platformsResult] = await Promise.all([
    query(`SELECT reputation_settings FROM brands WHERE id = $1`, [brandId]),
    query(`SELECT * FROM reputation_platforms WHERE brand_id = $1 ORDER BY platform`, [brandId]),
  ]);
  return {
    settings: settingsResult.rows[0]?.reputation_settings || {},
    platforms: platformsResult.rows,
  };
};

export const saveSettings = async (brandId, settings) => {
  await query(
    `UPDATE brands SET reputation_settings = reputation_settings || $1::jsonb WHERE id = $2`,
    [JSON.stringify(settings), brandId]
  );
};

// ── Requests ──────────────────────────────────────────────────────────────────

export const createRequest = async (data) => {
  const { brand_id, client_id, channel, platform, review_url, message, trigger_source } = data;
  const result = await query(
    `INSERT INTO reputation_requests
       (brand_id, client_id, channel, platform, review_url, tracking_token, message, trigger_source)
     VALUES ($1, $2, $3, $4, $5, gen_random_uuid()::text, $6, $7)
     RETURNING *`,
    [brand_id, client_id || null, channel, platform || 'google', review_url || null, message || null, trigger_source || 'manual']
  );
  return result.rows[0];
};

export const getRequests = async (brandId, { clientId, status, limit = 50, offset = 0 } = {}) => {
  const conditions = ['rr.brand_id = $1'];
  const params = [brandId];
  let idx = 2;

  if (clientId) { conditions.push(`rr.client_id = $${idx++}`); params.push(clientId); }
  if (status)   { conditions.push(`rr.status = $${idx++}`);    params.push(status); }

  params.push(limit, offset);
  const result = await query(
    `SELECT rr.*, c.name AS client_name, c.email AS client_email
     FROM reputation_requests rr
     LEFT JOIN clients c ON rr.client_id = c.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY rr.sent_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return result.rows;
};

export const markClicked = async (token) => {
  const result = await query(
    `UPDATE reputation_requests
     SET status = 'clicked', clicked_at = NOW()
     WHERE tracking_token = $1 AND status = 'sent'
     RETURNING review_url`,
    [token]
  );
  return result.rows[0] || null;
};

export const markCompleted = async (id, brandId) => {
  const result = await query(
    `UPDATE reputation_requests SET status = 'completed'
     WHERE id = $1 AND brand_id = $2 RETURNING *`,
    [id, brandId]
  );
  return result.rows[0];
};

// ── Reviews ───────────────────────────────────────────────────────────────────

export const getReviews = async (brandId, { platform, minRating, limit = 50, offset = 0 } = {}) => {
  const conditions = ['brand_id = $1'];
  const params = [brandId];
  let idx = 2;

  if (platform)  { conditions.push(`platform = $${idx++}`);    params.push(platform); }
  if (minRating) { conditions.push(`rating >= $${idx++}`);     params.push(minRating); }

  params.push(limit, offset);
  const result = await query(
    `SELECT * FROM reputation_reviews
     WHERE ${conditions.join(' AND ')}
     ORDER BY review_date DESC NULLS LAST, created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return result.rows;
};

export const createReview = async (data) => {
  const { brand_id, platform, reviewer_name, rating, review_text, review_date, source_url, platform_review_id } = data;
  const result = await query(
    `INSERT INTO reputation_reviews
       (brand_id, platform, reviewer_name, rating, review_text, review_date, source_url, platform_review_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [brand_id, platform || 'google', reviewer_name || null, rating || null, review_text || null,
     review_date || null, source_url || null, platform_review_id || null]
  );
  return result.rows[0];
};

export const updateReview = async (id, brandId, data) => {
  const { reviewer_name, rating, review_text, review_date, response_text, source_url } = data;
  const result = await query(
    `UPDATE reputation_reviews SET
       reviewer_name = COALESCE($3, reviewer_name),
       rating        = COALESCE($4, rating),
       review_text   = COALESCE($5, review_text),
       review_date   = COALESCE($6, review_date),
       response_text = COALESCE($7, response_text),
       responded_at  = CASE WHEN $7 IS NOT NULL AND response_text IS NULL THEN NOW()
                            WHEN $7 IS NOT NULL THEN responded_at
                            ELSE responded_at END,
       source_url    = COALESCE($8, source_url),
       updated_at    = NOW()
     WHERE id = $1 AND brand_id = $2
     RETURNING *`,
    [id, brandId, reviewer_name, rating, review_text, review_date, response_text, source_url]
  );
  return result.rows[0];
};

export const deleteReview = async (id, brandId) => {
  await query(
    `DELETE FROM reputation_reviews WHERE id = $1 AND brand_id = $2`,
    [id, brandId]
  );
};

// ── Stats ─────────────────────────────────────────────────────────────────────

export const getStats = async (brandId) => {
  const [reviewStats, requestStats] = await Promise.all([
    query(
      `SELECT
         COUNT(*)                              AS total_reviews,
         ROUND(AVG(rating)::numeric, 1)        AS avg_rating,
         COUNT(*) FILTER (WHERE rating >= 4)   AS positive_count,
         COUNT(*) FILTER (WHERE rating <= 2)   AS negative_count,
         json_object_agg(platform, cnt) AS by_platform
       FROM (
         SELECT platform, rating, COUNT(*) OVER (PARTITION BY platform) AS cnt
         FROM reputation_reviews WHERE brand_id = $1
       ) sub`,
      [brandId]
    ),
    query(
      `SELECT
         COUNT(*)                                   AS total_sent,
         COUNT(*) FILTER (WHERE status = 'clicked') AS total_clicked,
         COUNT(*) FILTER (WHERE status = 'completed') AS total_completed,
         COUNT(*) FILTER (WHERE sent_at >= date_trunc('month', NOW())) AS sent_this_month
       FROM reputation_requests WHERE brand_id = $1`,
      [brandId]
    ),
  ]);

  const rv = reviewStats.rows[0] || {};
  const rq = requestStats.rows[0] || {};
  const totalSent = parseInt(rq.total_sent) || 0;
  const totalClicked = parseInt(rq.total_clicked) || 0;

  return {
    total_reviews:   parseInt(rv.total_reviews) || 0,
    avg_rating:      parseFloat(rv.avg_rating) || 0,
    positive_count:  parseInt(rv.positive_count) || 0,
    negative_count:  parseInt(rv.negative_count) || 0,
    total_sent:      totalSent,
    total_clicked:   totalClicked,
    total_completed: parseInt(rq.total_completed) || 0,
    sent_this_month: parseInt(rq.sent_this_month) || 0,
    click_rate:      totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
  };
};
