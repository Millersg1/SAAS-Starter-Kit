import { query } from '../config/database.js';

// ── Sites ─────────────────────────────────────────────────────────────────────

export const getSites = async (brandId) => {
  const result = await query(
    `SELECT cs.*,
       (SELECT COUNT(*) FROM cms_pages cp WHERE cp.site_id = cs.id) AS page_count
     FROM cms_sites cs
     WHERE cs.brand_id = $1 AND cs.is_active = TRUE
     ORDER BY cs.created_at ASC`,
    [brandId]
  );
  return result.rows;
};

export const createSite = async (data) => {
  const { brand_id, name, domain, description, default_seo_title, default_seo_description, og_image_url, google_analytics_id } = data;
  const result = await query(
    `INSERT INTO cms_sites (brand_id, name, domain, description, default_seo_title, default_seo_description, og_image_url, google_analytics_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [brand_id, name, domain || null, description || null, default_seo_title || null, default_seo_description || null, og_image_url || null, google_analytics_id || null]
  );
  return result.rows[0];
};

export const getSiteById = async (id, brandId) => {
  const result = await query(
    `SELECT * FROM cms_sites WHERE id = $1 AND brand_id = $2`,
    [id, brandId]
  );
  return result.rows[0] || null;
};

export const updateSite = async (id, data) => {
  const allowed = ['name', 'domain', 'description', 'default_seo_title', 'default_seo_description', 'og_image_url', 'google_analytics_id'];
  const fields = Object.keys(data).filter(k => allowed.includes(k));
  if (!fields.length) return null;
  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => data[f]);
  const result = await query(
    `UPDATE cms_sites SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

export const deleteSite = async (id, brandId) => {
  await query(`DELETE FROM cms_sites WHERE id = $1 AND brand_id = $2`, [id, brandId]);
};

// ── Pages ─────────────────────────────────────────────────────────────────────

const generateSlug = (title) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const getPages = async (brandId, { siteId, type, status, search, limit = 50, offset = 0 } = {}) => {
  const conditions = ['cp.brand_id = $1'];
  const values = [brandId];
  let idx = 2;
  if (siteId) { conditions.push(`cp.site_id = $${idx++}`); values.push(siteId); }
  if (type) { conditions.push(`cp.page_type = $${idx++}`); values.push(type); }
  if (status) { conditions.push(`cp.status = $${idx++}`); values.push(status); }
  if (search) { conditions.push(`(cp.title ILIKE $${idx} OR cp.excerpt ILIKE $${idx})`); values.push(`%${search}%`); idx++; }

  const where = conditions.join(' AND ');
  const result = await query(
    `SELECT cp.*, u.name AS author_name, cs.name AS site_name
     FROM cms_pages cp
     LEFT JOIN users u ON cp.author_id = u.id
     LEFT JOIN cms_sites cs ON cp.site_id = cs.id
     WHERE ${where}
     ORDER BY cp.updated_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );
  return result.rows;
};

export const createPage = async (data) => {
  const slug = data.slug || generateSlug(data.title);
  const result = await query(
    `INSERT INTO cms_pages (site_id, brand_id, title, slug, content, excerpt, featured_image_url, page_type, status, published_at, scheduled_at, seo_title, seo_description, seo_keywords, og_image_url, category, tags, author_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [
      data.site_id, data.brand_id, data.title, slug,
      data.content || null, data.excerpt || null, data.featured_image_url || null,
      data.page_type || 'page', data.status || 'draft',
      data.status === 'published' ? new Date() : null,
      data.scheduled_at || null,
      data.seo_title || null, data.seo_description || null, data.seo_keywords || null,
      data.og_image_url || null, data.category || null,
      JSON.stringify(data.tags || []),
      data.author_id || null
    ]
  );
  return result.rows[0];
};

export const getPageById = async (id, brandId) => {
  const result = await query(
    `SELECT cp.*, u.name AS author_name, cs.name AS site_name
     FROM cms_pages cp
     LEFT JOIN users u ON cp.author_id = u.id
     LEFT JOIN cms_sites cs ON cp.site_id = cs.id
     WHERE cp.id = $1 AND cp.brand_id = $2`,
    [id, brandId]
  );
  return result.rows[0] || null;
};

export const updatePage = async (id, data) => {
  const allowed = ['title', 'slug', 'content', 'excerpt', 'featured_image_url', 'page_type', 'status', 'scheduled_at', 'seo_title', 'seo_description', 'seo_keywords', 'og_image_url', 'category', 'tags'];
  const fields = Object.keys(data).filter(k => allowed.includes(k));
  if (!fields.length) return null;

  // Auto-set published_at when first publishing
  let extraSql = '';
  if (data.status === 'published') {
    extraSql = `, published_at = COALESCE(published_at, NOW())`;
  }

  const setClause = fields.map((f, i) => {
    if (f === 'tags') return `tags = $${i + 2}::jsonb`;
    return `${f} = $${i + 2}`;
  }).join(', ');
  const values = fields.map(f => f === 'tags' ? JSON.stringify(data[f]) : data[f]);

  const result = await query(
    `UPDATE cms_pages SET ${setClause}${extraSql}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

export const deletePage = async (id, brandId) => {
  await query(`DELETE FROM cms_pages WHERE id = $1 AND brand_id = $2`, [id, brandId]);
};

export const publishScheduledPages = async () => {
  await query(
    `UPDATE cms_pages SET status = 'published', published_at = NOW()
     WHERE status = 'scheduled' AND scheduled_at <= NOW()`
  );
};

// ── Media ─────────────────────────────────────────────────────────────────────

export const getMedia = async (brandId, siteId) => {
  const conditions = ['brand_id = $1'];
  const values = [brandId];
  if (siteId) { conditions.push(`site_id = $2`); values.push(siteId); }
  const result = await query(
    `SELECT * FROM cms_media WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    values
  );
  return result.rows;
};

export const createMediaRecord = async (data) => {
  const result = await query(
    `INSERT INTO cms_media (brand_id, site_id, filename, original_name, file_url, file_type, mime_type, file_size, alt_text, caption, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      data.brand_id, data.site_id || null, data.filename, data.original_name || data.filename,
      data.file_url, data.file_type || 'image', data.mime_type || null,
      data.file_size || null, data.alt_text || null, data.caption || null,
      data.uploaded_by || null
    ]
  );
  return result.rows[0];
};

export const getMediaById = async (id, brandId) => {
  const result = await query(
    `SELECT * FROM cms_media WHERE id = $1 AND brand_id = $2`,
    [id, brandId]
  );
  return result.rows[0] || null;
};

export const deleteMedia = async (id, brandId) => {
  await query(`DELETE FROM cms_media WHERE id = $1 AND brand_id = $2`, [id, brandId]);
};

// ── Page Version History ───────────────────────────────────────────────────────

export const savePageVersion = async (page, savedByName) => {
  // Get the next version number for this page
  const vCount = await query(
    `SELECT COALESCE(MAX(version_number), 0) + 1 AS next FROM cms_page_versions WHERE page_id = $1`,
    [page.id]
  );
  const versionNumber = vCount.rows[0].next;

  const result = await query(
    `INSERT INTO cms_page_versions (page_id, brand_id, version_number, title, content, excerpt, seo_title, seo_description, seo_keywords, status, saved_by, saved_by_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      page.id, page.brand_id, versionNumber, page.title, page.content || null,
      page.excerpt || null, page.seo_title || null, page.seo_description || null,
      page.seo_keywords || null, page.status, page.author_id || null, savedByName || null
    ]
  );
  return result.rows[0];
};

export const getPageVersions = async (pageId, brandId) => {
  const result = await query(
    `SELECT id, version_number, title, status, saved_by_name, snapshot_at
     FROM cms_page_versions
     WHERE page_id = $1 AND brand_id = $2
     ORDER BY version_number DESC
     LIMIT 50`,
    [pageId, brandId]
  );
  return result.rows;
};

export const getPageVersionById = async (versionId, brandId) => {
  const result = await query(
    `SELECT * FROM cms_page_versions WHERE id = $1 AND brand_id = $2`,
    [versionId, brandId]
  );
  return result.rows[0] || null;
};

// ── Content Review (CMS pages) ────────────────────────────────────────────────

export const getPageByReviewToken = async (token) => {
  const result = await query(
    `SELECT cp.*, cs.name AS site_name, b.name AS brand_name
     FROM cms_pages cp
     LEFT JOIN cms_sites cs ON cp.site_id = cs.id
     LEFT JOIN brands b ON cp.brand_id = b.id
     WHERE cp.review_token = $1`,
    [token]
  );
  return result.rows[0] || null;
};

export const updatePageReview = async (token, { review_status, review_notes, reviewer_name }) => {
  const result = await query(
    `UPDATE cms_pages
     SET review_status = $1, review_notes = $2, reviewer_name = $3, reviewed_at = NOW(), updated_at = NOW()
     WHERE review_token = $4
     RETURNING *`,
    [review_status, review_notes || null, reviewer_name || null, token]
  );
  return result.rows[0] || null;
};

export const resetPageReviewToken = async (id, brandId) => {
  const result = await query(
    `UPDATE cms_pages SET review_token = gen_random_uuid(), review_status = 'pending_review', updated_at = NOW()
     WHERE id = $1 AND brand_id = $2 RETURNING review_token`,
    [id, brandId]
  );
  return result.rows[0] || null;
};
