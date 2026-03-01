import { query } from '../config/database.js';

// ── Accounts ─────────────────────────────────────────────────────────────────

export const getAccounts = async (brandId) => {
  const result = await query(
    `SELECT sa.*,
       c.name AS client_name
     FROM social_accounts sa
     LEFT JOIN clients c ON sa.client_id = c.id
     WHERE sa.brand_id = $1 AND sa.is_active = TRUE
     ORDER BY sa.platform, sa.created_at ASC`,
    [brandId]
  );
  return result.rows;
};

export const getAccountById = async (id, brandId) => {
  const result = await query(
    `SELECT * FROM social_accounts WHERE id = $1 AND brand_id = $2`,
    [id, brandId]
  );
  return result.rows[0] || null;
};

export const createAccount = async (data) => {
  const result = await query(
    `INSERT INTO social_accounts (brand_id, client_id, platform, account_name, account_handle, platform_account_id, profile_image_url, access_token, refresh_token, token_expires_at, scope)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      data.brand_id, data.client_id || null, data.platform,
      data.account_name || null, data.account_handle || null,
      data.platform_account_id || null, data.profile_image_url || null,
      data.access_token || null, data.refresh_token || null,
      data.token_expires_at || null, data.scope || null
    ]
  );
  return result.rows[0];
};

export const updateAccount = async (id, data) => {
  const allowed = ['account_name', 'account_handle', 'platform_account_id', 'profile_image_url', 'access_token', 'refresh_token', 'token_expires_at', 'scope', 'is_active', 'last_sync_at'];
  const fields = Object.keys(data).filter(k => allowed.includes(k));
  if (!fields.length) return null;
  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const result = await query(
    `UPDATE social_accounts SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...fields.map(f => data[f])]
  );
  return result.rows[0] || null;
};

export const deleteAccount = async (id, brandId) => {
  await query(`UPDATE social_accounts SET is_active = FALSE WHERE id = $1 AND brand_id = $2`, [id, brandId]);
};

// ── Posts ─────────────────────────────────────────────────────────────────────

export const getPosts = async (brandId, { accountId, status, platform, from, to, limit = 50, offset = 0 } = {}) => {
  const conditions = ['sp.brand_id = $1'];
  const values = [brandId];
  let idx = 2;
  if (accountId) { conditions.push(`sp.social_account_id = $${idx++}`); values.push(accountId); }
  if (status) { conditions.push(`sp.status = $${idx++}`); values.push(status); }
  if (platform) { conditions.push(`sp.platform = $${idx++}`); values.push(platform); }
  if (from) { conditions.push(`sp.scheduled_at >= $${idx++}`); values.push(from); }
  if (to) { conditions.push(`sp.scheduled_at <= $${idx++}`); values.push(to); }

  const result = await query(
    `SELECT sp.*, sa.account_handle, sa.account_name, sa.profile_image_url AS account_avatar,
       u.name AS author_name
     FROM social_posts sp
     LEFT JOIN social_accounts sa ON sp.social_account_id = sa.id
     LEFT JOIN users u ON sp.created_by = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY COALESCE(sp.scheduled_at, sp.created_at) DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );
  return result.rows;
};

export const createPost = async (data) => {
  const result = await query(
    `INSERT INTO social_posts (brand_id, social_account_id, platform, content, media_urls, link_url, post_type, status, scheduled_at, group_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      data.brand_id, data.social_account_id || null, data.platform,
      data.content, JSON.stringify(data.media_urls || []),
      data.link_url || null, data.post_type || 'post',
      data.status || 'draft',
      data.scheduled_at || null, data.group_id || null,
      data.created_by || null
    ]
  );
  return result.rows[0];
};

export const getPostById = async (id, brandId) => {
  const result = await query(
    `SELECT sp.*, sa.account_handle, sa.account_name, sa.access_token, sa.profile_image_url AS account_avatar
     FROM social_posts sp
     LEFT JOIN social_accounts sa ON sp.social_account_id = sa.id
     WHERE sp.id = $1 AND sp.brand_id = $2`,
    [id, brandId]
  );
  return result.rows[0] || null;
};

export const updatePost = async (id, data) => {
  const allowed = ['content', 'media_urls', 'link_url', 'post_type', 'status', 'scheduled_at', 'social_account_id'];
  const fields = Object.keys(data).filter(k => allowed.includes(k));
  if (!fields.length) return null;
  const setClause = fields.map((f, i) => {
    if (f === 'media_urls') return `media_urls = $${i + 2}::jsonb`;
    return `${f} = $${i + 2}`;
  }).join(', ');
  const values = fields.map(f => f === 'media_urls' ? JSON.stringify(data[f]) : data[f]);
  const result = await query(
    `UPDATE social_posts SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

export const deletePost = async (id, brandId) => {
  await query(`DELETE FROM social_posts WHERE id = $1 AND brand_id = $2`, [id, brandId]);
};

export const getScheduledDuePosts = async () => {
  const result = await query(
    `SELECT sp.*, sa.access_token, sa.refresh_token, sa.platform_account_id, sa.account_handle
     FROM social_posts sp
     LEFT JOIN social_accounts sa ON sp.social_account_id = sa.id
     WHERE sp.status = 'scheduled' AND sp.scheduled_at <= NOW()
     LIMIT 50`
  );
  return result.rows;
};

export const markPublished = async (id, platformPostId) => {
  await query(
    `UPDATE social_posts SET status = 'published', published_at = NOW(), platform_post_id = $2, updated_at = NOW() WHERE id = $1`,
    [id, platformPostId]
  );
};

export const markFailed = async (id, errorMsg) => {
  await query(
    `UPDATE social_posts SET status = 'failed', error_message = $2, updated_at = NOW() WHERE id = $1`,
    [id, errorMsg]
  );
};

export const getCalendarPosts = async (brandId, from, to) => {
  const result = await query(
    `SELECT sp.*, sa.account_handle, sa.platform AS account_platform, sa.profile_image_url AS account_avatar
     FROM social_posts sp
     LEFT JOIN social_accounts sa ON sp.social_account_id = sa.id
     WHERE sp.brand_id = $1
       AND COALESCE(sp.scheduled_at, sp.published_at, sp.created_at) BETWEEN $2 AND $3
     ORDER BY COALESCE(sp.scheduled_at, sp.published_at, sp.created_at) ASC`,
    [brandId, from, to]
  );
  // Group by date string
  const grouped = {};
  for (const post of result.rows) {
    const dt = post.scheduled_at || post.published_at || post.created_at;
    const dateKey = new Date(dt).toISOString().split('T')[0];
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(post);
  }
  return grouped;
};

export const getPostStats = async (brandId) => {
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled_count,
       COUNT(*) FILTER (WHERE status = 'published' AND published_at >= NOW() - INTERVAL '30 days') AS published_last_30,
       COUNT(*) FILTER (WHERE status = 'draft') AS draft_count,
       COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
       COUNT(DISTINCT social_account_id) AS active_accounts
     FROM social_posts WHERE brand_id = $1`,
    [brandId]
  );
  return result.rows[0] || {};
};

// ── Content Review (social posts) ────────────────────────────────────────────

export const getPostByReviewToken = async (token) => {
  const result = await query(
    `SELECT sp.*, sa.account_handle, sa.platform_account_id, b.name AS brand_name
     FROM social_posts sp
     LEFT JOIN social_accounts sa ON sp.social_account_id = sa.id
     LEFT JOIN brands b ON sp.brand_id = b.id
     WHERE sp.review_token = $1`,
    [token]
  );
  return result.rows[0] || null;
};

export const updatePostReview = async (token, { review_status, review_notes, reviewer_name }) => {
  const result = await query(
    `UPDATE social_posts
     SET review_status = $1, review_notes = $2, reviewer_name = $3, reviewed_at = NOW(), updated_at = NOW()
     WHERE review_token = $4
     RETURNING *`,
    [review_status, review_notes || null, reviewer_name || null, token]
  );
  return result.rows[0] || null;
};

export const resetPostReviewToken = async (id, brandId) => {
  const result = await query(
    `UPDATE social_posts SET review_token = gen_random_uuid(), review_status = 'pending_review', updated_at = NOW()
     WHERE id = $1 AND brand_id = $2 RETURNING review_token`,
    [id, brandId]
  );
  return result.rows[0] || null;
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getEngagementOverTime = async (brandId, days = 30) => {
  const result = await query(
    `SELECT
       DATE_TRUNC('day', published_at)::DATE AS day,
       platform,
       COUNT(*) AS posts_count,
       SUM(like_count) AS likes,
       SUM(comment_count) AS comments,
       SUM(share_count) AS shares,
       SUM(impression_count) AS impressions
     FROM social_posts
     WHERE brand_id = $1
       AND status = 'published'
       AND published_at >= NOW() - ($2 || ' days')::INTERVAL
     GROUP BY 1, 2
     ORDER BY 1 ASC`,
    [brandId, days]
  );
  return result.rows;
};

export const getTopPosts = async (brandId, limit = 10) => {
  const result = await query(
    `SELECT sp.*, sa.account_handle
     FROM social_posts sp
     LEFT JOIN social_accounts sa ON sp.social_account_id = sa.id
     WHERE sp.brand_id = $1 AND sp.status = 'published'
     ORDER BY (sp.like_count + sp.comment_count + sp.share_count) DESC
     LIMIT $2`,
    [brandId, limit]
  );
  return result.rows;
};

export const getPostsByPlatform = async (brandId) => {
  const result = await query(
    `SELECT platform,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'published') AS published,
       COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled,
       SUM(like_count) AS total_likes,
       SUM(comment_count) AS total_comments,
       SUM(share_count) AS total_shares,
       SUM(impression_count) AS total_impressions
     FROM social_posts
     WHERE brand_id = $1
     GROUP BY platform`,
    [brandId]
  );
  return result.rows;
};
