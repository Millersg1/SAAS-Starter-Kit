import { query } from '../config/database.js';
import { getBrandMember } from '../models/brandModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

const assertBrandAccess = async (brandId, userId, next) => {
  const member = await getBrandMember(brandId, userId);
  if (!member) {
    next(new AppError('You do not have access to this brand', 403));
    return false;
  }
  return true;
};

// ============================================
// PUBLIC ENDPOINTS (no auth)
// ============================================

/** GET /api/knowledge-base/public/:brandId/categories */
export const listPublicCategories = catchAsync(async (req, res) => {
  const { brandId } = req.params;

  const result = await query(
    `SELECT kc.id, kc.name, kc.slug, kc.description,
            COUNT(ka.id)::int AS article_count
     FROM kb_categories kc
     LEFT JOIN kb_articles ka ON ka.category_id = kc.id AND ka.status = 'published' AND ka.is_public = TRUE
     WHERE kc.brand_id = $1
     GROUP BY kc.id
     ORDER BY kc.name`,
    [brandId]
  );

  res.json({ status: 'success', data: { categories: result.rows } });
});

/** GET /api/knowledge-base/public/:brandId/articles */
export const listPublicArticles = catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const { category_id, search } = req.query;

  let sql = `SELECT ka.id, ka.title, ka.slug, ka.content, ka.category_id, ka.view_count, ka.helpful_count, ka.not_helpful_count, ka.created_at, ka.updated_at,
                    kc.name AS category_name
             FROM kb_articles ka
             LEFT JOIN kb_categories kc ON kc.id = ka.category_id
             WHERE ka.brand_id = $1 AND ka.status = 'published' AND ka.is_public = TRUE`;
  const params = [brandId];

  if (category_id) {
    params.push(category_id);
    sql += ` AND ka.category_id = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (ka.title ILIKE $${params.length} OR ka.content ILIKE $${params.length})`;
  }

  sql += ` ORDER BY ka.created_at DESC`;

  const result = await query(sql, params);

  res.json({ status: 'success', data: { articles: result.rows } });
});

/** GET /api/knowledge-base/public/:brandId/articles/:slug */
export const getPublicArticleBySlug = catchAsync(async (req, res, next) => {
  const { brandId, slug } = req.params;

  const result = await query(
    `UPDATE kb_articles
     SET view_count = view_count + 1
     WHERE brand_id = $1 AND slug = $2 AND status = 'published' AND is_public = TRUE
     RETURNING *, (SELECT name FROM kb_categories WHERE id = category_id) AS category_name`,
    [brandId, slug]
  );

  if (result.rows.length === 0) return next(new AppError('Article not found', 404));

  res.json({ status: 'success', data: { article: result.rows[0] } });
});

/** POST /api/knowledge-base/public/:brandId/articles/:articleId/feedback */
export const submitArticleFeedback = catchAsync(async (req, res, next) => {
  const { brandId, articleId } = req.params;
  const { helpful } = req.body;

  if (typeof helpful !== 'boolean') return next(new AppError('helpful (boolean) is required', 400));

  const column = helpful ? 'helpful_count' : 'not_helpful_count';

  const result = await query(
    `UPDATE kb_articles
     SET ${column} = ${column} + 1
     WHERE id = $1 AND brand_id = $2 AND status = 'published' AND is_public = TRUE
     RETURNING id, helpful_count, not_helpful_count`,
    [articleId, brandId]
  );

  if (result.rows.length === 0) return next(new AppError('Article not found', 404));

  res.json({ status: 'success', message: 'Feedback submitted', data: { article: result.rows[0] } });
});

// ============================================
// PROTECTED ENDPOINTS (auth required)
// ============================================

/** GET /api/knowledge-base/:brandId/categories */
export const listCategories = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `SELECT kc.*,
            COUNT(ka.id)::int AS article_count
     FROM kb_categories kc
     LEFT JOIN kb_articles ka ON ka.category_id = kc.id
     WHERE kc.brand_id = $1
     GROUP BY kc.id
     ORDER BY kc.name`,
    [brandId]
  );

  res.json({ status: 'success', data: { categories: result.rows } });
});

/** POST /api/knowledge-base/:brandId/categories */
export const createCategory = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { name, slug, description } = req.body;
  if (!name || !slug) return next(new AppError('name and slug are required', 400));

  const result = await query(
    `INSERT INTO kb_categories (brand_id, name, slug, description)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [brandId, name, slug, description || null]
  );

  res.status(201).json({ status: 'success', data: { category: result.rows[0] } });
});

/** PATCH /api/knowledge-base/:brandId/categories/:categoryId */
export const updateCategory = catchAsync(async (req, res, next) => {
  const { brandId, categoryId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { name, slug, description } = req.body;

  const result = await query(
    `UPDATE kb_categories
     SET name = COALESCE($1, name),
         slug = COALESCE($2, slug),
         description = COALESCE($3, description),
         updated_at = NOW()
     WHERE id = $4 AND brand_id = $5
     RETURNING *`,
    [name, slug, description, categoryId, brandId]
  );

  if (result.rows.length === 0) return next(new AppError('Category not found', 404));

  res.json({ status: 'success', data: { category: result.rows[0] } });
});

/** DELETE /api/knowledge-base/:brandId/categories/:categoryId */
export const deleteCategory = catchAsync(async (req, res, next) => {
  const { brandId, categoryId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `DELETE FROM kb_categories WHERE id = $1 AND brand_id = $2 RETURNING id`,
    [categoryId, brandId]
  );

  if (result.rows.length === 0) return next(new AppError('Category not found', 404));

  res.json({ status: 'success', message: 'Category deleted' });
});

/** GET /api/knowledge-base/:brandId/articles */
export const listArticles = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `SELECT ka.*,
            kc.name AS category_name
     FROM kb_articles ka
     LEFT JOIN kb_categories kc ON kc.id = ka.category_id
     WHERE ka.brand_id = $1
     ORDER BY ka.created_at DESC`,
    [brandId]
  );

  res.json({ status: 'success', data: { articles: result.rows } });
});

/** POST /api/knowledge-base/:brandId/articles */
export const createArticle = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { title, slug, content, category_id, status, is_public } = req.body;
  if (!title || !slug || !content) return next(new AppError('title, slug, and content are required', 400));

  const result = await query(
    `INSERT INTO kb_articles (brand_id, title, slug, content, category_id, status, is_public, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [brandId, title, slug, content, category_id || null, status || 'draft', is_public !== false, req.user.id]
  );

  res.status(201).json({ status: 'success', data: { article: result.rows[0] } });
});

/** GET /api/knowledge-base/:brandId/articles/:articleId */
export const getArticle = catchAsync(async (req, res, next) => {
  const { brandId, articleId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `SELECT ka.*,
            kc.name AS category_name
     FROM kb_articles ka
     LEFT JOIN kb_categories kc ON kc.id = ka.category_id
     WHERE ka.id = $1 AND ka.brand_id = $2`,
    [articleId, brandId]
  );

  if (result.rows.length === 0) return next(new AppError('Article not found', 404));

  res.json({ status: 'success', data: { article: result.rows[0] } });
});

/** PATCH /api/knowledge-base/:brandId/articles/:articleId */
export const updateArticle = catchAsync(async (req, res, next) => {
  const { brandId, articleId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { title, slug, content, category_id, status, is_public } = req.body;

  const result = await query(
    `UPDATE kb_articles
     SET title = COALESCE($1, title),
         slug = COALESCE($2, slug),
         content = COALESCE($3, content),
         category_id = COALESCE($4, category_id),
         status = COALESCE($5, status),
         is_public = COALESCE($6, is_public),
         updated_at = NOW()
     WHERE id = $7 AND brand_id = $8
     RETURNING *`,
    [title, slug, content, category_id, status, is_public, articleId, brandId]
  );

  if (result.rows.length === 0) return next(new AppError('Article not found', 404));

  res.json({ status: 'success', data: { article: result.rows[0] } });
});

/** DELETE /api/knowledge-base/:brandId/articles/:articleId */
export const deleteArticle = catchAsync(async (req, res, next) => {
  const { brandId, articleId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `DELETE FROM kb_articles WHERE id = $1 AND brand_id = $2 RETURNING id`,
    [articleId, brandId]
  );

  if (result.rows.length === 0) return next(new AppError('Article not found', 404));

  res.json({ status: 'success', message: 'Article deleted' });
});

/** GET /api/knowledge-base/:brandId/stats */
export const getStats = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `SELECT
       COUNT(*)::int AS total_articles,
       COUNT(*) FILTER (WHERE status = 'published')::int AS published_articles,
       COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_articles,
       COALESCE(SUM(view_count), 0)::int AS total_views,
       COALESCE(SUM(helpful_count), 0)::int AS total_helpful,
       COALESCE(SUM(not_helpful_count), 0)::int AS total_not_helpful,
       CASE
         WHEN COALESCE(SUM(helpful_count), 0) + COALESCE(SUM(not_helpful_count), 0) > 0
         THEN ROUND(SUM(helpful_count)::numeric / (SUM(helpful_count) + SUM(not_helpful_count)) * 100, 1)
         ELSE 0
       END AS helpful_ratio
     FROM kb_articles
     WHERE brand_id = $1`,
    [brandId]
  );

  res.json({ status: 'success', data: { stats: result.rows[0] } });
});
