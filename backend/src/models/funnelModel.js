import { query } from '../config/database.js';

const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ── Funnels ───────────────────────────────────────────────────────────────────

export const getFunnels = async (brandId) => {
  const result = await query(
    `SELECT f.*,
       (SELECT COUNT(*) FROM funnel_steps fs WHERE fs.funnel_id = f.id) AS step_count,
       (SELECT COUNT(*) FROM funnel_analytics fa WHERE fa.funnel_id = f.id AND fa.event_type = 'view') AS total_views,
       (SELECT COUNT(*) FROM funnel_analytics fa WHERE fa.funnel_id = f.id AND fa.event_type = 'conversion') AS total_conversions
     FROM funnels f
     WHERE f.brand_id = $1
     ORDER BY f.created_at DESC`,
    [brandId]
  );
  return result.rows;
};

export const createFunnel = async (data) => {
  const { brand_id, name, goal, seo_title, seo_description } = data;
  let slug = slugify(name);
  // Ensure uniqueness
  const exists = await query(`SELECT id FROM funnels WHERE brand_id = $1 AND slug = $2`, [brand_id, slug]);
  if (exists.rows.length) slug = `${slug}-${Date.now()}`;

  const result = await query(
    `INSERT INTO funnels (brand_id, name, slug, goal, seo_title, seo_description)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [brand_id, name, slug, goal || 'leads', seo_title || null, seo_description || null]
  );
  return result.rows[0];
};

export const getFunnelById = async (id, brandId) => {
  const result = await query(
    `SELECT * FROM funnels WHERE id = $1 AND brand_id = $2`,
    [id, brandId]
  );
  return result.rows[0] || null;
};

export const updateFunnel = async (id, brandId, data) => {
  const { name, slug, status, goal, seo_title, seo_description, og_image_url } = data;
  const result = await query(
    `UPDATE funnels SET
       name            = COALESCE($3, name),
       slug            = COALESCE($4, slug),
       status          = COALESCE($5, status),
       goal            = COALESCE($6, goal),
       seo_title       = COALESCE($7, seo_title),
       seo_description = COALESCE($8, seo_description),
       og_image_url    = COALESCE($9, og_image_url),
       updated_at      = NOW()
     WHERE id = $1 AND brand_id = $2
     RETURNING *`,
    [id, brandId, name, slug, status, goal, seo_title, seo_description, og_image_url]
  );
  return result.rows[0] || null;
};

export const deleteFunnel = async (id, brandId) => {
  await query(`DELETE FROM funnels WHERE id = $1 AND brand_id = $2`, [id, brandId]);
};

// ── Steps ─────────────────────────────────────────────────────────────────────

export const getSteps = async (funnelId) => {
  const result = await query(
    `SELECT * FROM funnel_steps WHERE funnel_id = $1 ORDER BY step_order ASC`,
    [funnelId]
  );
  return result.rows;
};

export const createStep = async (data) => {
  const { funnel_id, brand_id, name, slug: providedSlug, blocks } = data;
  let slug = providedSlug || slugify(name);

  // Ensure uniqueness within funnel
  const exists = await query(`SELECT id FROM funnel_steps WHERE funnel_id = $1 AND slug = $2`, [funnel_id, slug]);
  if (exists.rows.length) slug = `${slug}-${Date.now()}`;

  // step_order = max + 1
  const orderRes = await query(`SELECT COALESCE(MAX(step_order), 0) AS max FROM funnel_steps WHERE funnel_id = $1`, [funnel_id]);
  const step_order = parseInt(orderRes.rows[0].max) + 1;

  const result = await query(
    `INSERT INTO funnel_steps (funnel_id, brand_id, name, slug, step_order, blocks)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [funnel_id, brand_id, name, slug, step_order, JSON.stringify(blocks || [])]
  );
  return result.rows[0];
};

export const getStepById = async (id, funnelId) => {
  const result = await query(
    `SELECT * FROM funnel_steps WHERE id = $1 AND funnel_id = $2`,
    [id, funnelId]
  );
  return result.rows[0] || null;
};

export const updateStep = async (id, funnelId, data) => {
  const { name, slug, blocks, next_step_id, seo_title, seo_description } = data;
  const result = await query(
    `UPDATE funnel_steps SET
       name            = COALESCE($3, name),
       slug            = COALESCE($4, slug),
       blocks          = CASE WHEN $5::text IS NOT NULL THEN $5::jsonb ELSE blocks END,
       next_step_id    = CASE WHEN $6::text IS NOT NULL THEN $6::uuid
                              WHEN $6 IS NULL AND $3 IS NOT NULL THEN next_step_id
                              ELSE NULL END,
       seo_title       = COALESCE($7, seo_title),
       seo_description = COALESCE($8, seo_description),
       updated_at      = NOW()
     WHERE id = $1 AND funnel_id = $2
     RETURNING *`,
    [id, funnelId, name, slug, blocks !== undefined ? JSON.stringify(blocks) : null,
     next_step_id !== undefined ? (next_step_id || null) : null, seo_title, seo_description]
  );
  return result.rows[0] || null;
};

export const deleteStep = async (id, funnelId) => {
  await query(`DELETE FROM funnel_steps WHERE id = $1 AND funnel_id = $2`, [id, funnelId]);
};

export const reorderSteps = async (funnelId, orderedIds) => {
  for (let i = 0; i < orderedIds.length; i++) {
    await query(
      `UPDATE funnel_steps SET step_order = $1 WHERE id = $2 AND funnel_id = $3`,
      [i + 1, orderedIds[i], funnelId]
    );
  }
};

export const duplicateStep = async (id, funnelId, brandId) => {
  const original = await getStepById(id, funnelId);
  if (!original) return null;
  return createStep({
    funnel_id: funnelId,
    brand_id: brandId,
    name: `${original.name} (Copy)`,
    slug: `${original.slug}-copy`,
    blocks: original.blocks,
  });
};

// ── Public lookup ─────────────────────────────────────────────────────────────

export const getFunnelFirstStep = async (funnelSlug, brandId) => {
  const result = await query(
    `SELECT fs.*, f.name AS funnel_name, f.slug AS funnel_slug, f.seo_title AS funnel_seo_title
     FROM funnel_steps fs
     JOIN funnels f ON fs.funnel_id = f.id
     WHERE f.slug = $1 AND f.brand_id = $2 AND f.status = 'published'
     ORDER BY fs.step_order ASC
     LIMIT 1`,
    [funnelSlug, brandId]
  );
  return result.rows[0] || null;
};

export const getStepBySlug = async (funnelSlug, stepSlug) => {
  const result = await query(
    `SELECT fs.*, f.name AS funnel_name, f.slug AS funnel_slug, f.brand_id,
            f.seo_title AS funnel_seo_title, f.status AS funnel_status
     FROM funnel_steps fs
     JOIN funnels f ON fs.funnel_id = f.id
     WHERE f.slug = $1 AND fs.slug = $2 AND f.status = 'published'
     LIMIT 1`,
    [funnelSlug, stepSlug]
  );
  return result.rows[0] || null;
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const recordAnalytics = async (data) => {
  const { funnel_id, step_id, brand_id, event_type, visitor_id, referrer, utm_source, utm_medium, utm_campaign } = data;
  await query(
    `INSERT INTO funnel_analytics (funnel_id, step_id, brand_id, event_type, visitor_id, referrer, utm_source, utm_medium, utm_campaign)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [funnel_id, step_id || null, brand_id, event_type, visitor_id || null, referrer || null,
     utm_source || null, utm_medium || null, utm_campaign || null]
  );
};

export const getStats = async (funnelId) => {
  const result = await query(
    `SELECT
       fs.id,
       fs.name,
       fs.slug,
       fs.step_order,
       COUNT(fa.id) FILTER (WHERE fa.event_type = 'view')       AS views,
       COUNT(fa.id) FILTER (WHERE fa.event_type = 'conversion') AS conversions
     FROM funnel_steps fs
     LEFT JOIN funnel_analytics fa ON fa.step_id = fs.id
     WHERE fs.funnel_id = $1
     GROUP BY fs.id, fs.name, fs.slug, fs.step_order
     ORDER BY fs.step_order`,
    [funnelId]
  );
  return result.rows.map(r => ({
    ...r,
    views: parseInt(r.views) || 0,
    conversions: parseInt(r.conversions) || 0,
    conversion_rate: r.views > 0 ? Math.round((r.conversions / r.views) * 100) : 0,
  }));
};
