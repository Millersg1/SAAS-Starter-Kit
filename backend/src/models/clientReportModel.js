import { query } from '../config/database.js';

// ── Aggregate real metrics for a client + period ───────────────────────────────

export const aggregateClientMetrics = async (brandId, clientId, periodStart, periodEnd) => {
  const p = [brandId, clientId, periodStart, periodEnd];

  const [invoices, timeEntries, projects, socialPosts, cmsPages, tickets] = await Promise.all([
    // Invoices
    query(
      `SELECT
         COUNT(*) AS total_invoices,
         COUNT(*) FILTER (WHERE status = 'paid') AS paid_invoices,
         COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) AS amount_collected,
         COALESCE(SUM(total) FILTER (WHERE status IN ('sent','overdue')), 0) AS amount_outstanding
       FROM invoices
       WHERE brand_id = $1 AND client_id = $2
         AND created_at BETWEEN $3 AND $4`,
      p
    ),
    // Time entries (hours)
    query(
      `SELECT
         COALESCE(SUM(duration_minutes) / 60.0, 0) AS hours_tracked,
         COALESCE(SUM(billable_amount), 0)          AS billable_amount,
         COUNT(*) FILTER (WHERE is_billable)        AS billable_entries
       FROM time_entries
       WHERE brand_id = $1 AND client_id = $2
         AND start_time BETWEEN $3 AND $4`,
      p
    ),
    // Projects
    query(
      `SELECT
         COUNT(*) AS total_projects,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_projects,
         COUNT(*) FILTER (WHERE status = 'in_progress') AS active_projects
       FROM projects
       WHERE brand_id = $1 AND client_id = $2 AND is_active = TRUE`,
      [brandId, clientId]
    ),
    // Social posts (if social_accounts linked to client)
    query(
      `SELECT
         COUNT(*) AS total_posts,
         COUNT(*) FILTER (WHERE sp.status = 'published') AS published_posts,
         COALESCE(SUM(sp.like_count), 0)       AS total_likes,
         COALESCE(SUM(sp.comment_count), 0)    AS total_comments,
         COALESCE(SUM(sp.share_count), 0)      AS total_shares,
         COALESCE(SUM(sp.impression_count), 0) AS total_impressions
       FROM social_posts sp
       JOIN social_accounts sa ON sp.social_account_id = sa.id
       WHERE sp.brand_id = $1 AND sa.client_id = $2
         AND sp.created_at BETWEEN $3 AND $4`,
      p
    ),
    // CMS pages published for this brand (not per-client, but worth including)
    query(
      `SELECT COUNT(*) AS pages_published
       FROM cms_pages
       WHERE brand_id = $1 AND status = 'published'
         AND published_at BETWEEN $3 AND $4`,
      [brandId, clientId, periodStart, periodEnd]
    ),
    // Support tickets
    query(
      `SELECT
         COUNT(*) AS total_tickets,
         COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'closed') AS resolved_tickets,
         COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed')) AS open_tickets
       FROM support_tickets
       WHERE brand_id = $1 AND client_id = $2
         AND created_at BETWEEN $3 AND $4`,
      p
    ),
  ]);

  return {
    invoices:    invoices.rows[0]    || {},
    timeEntries: timeEntries.rows[0] || {},
    projects:    projects.rows[0]    || {},
    socialPosts: socialPosts.rows[0] || {},
    cmsPages:    cmsPages.rows[0]    || {},
    tickets:     tickets.rows[0]     || {},
  };
};

// ── CRUD ──────────────────────────────────────────────────────────────────────

export const getReports = async (brandId, clientId = null) => {
  const conditions = ['r.brand_id = $1'];
  const values = [brandId];
  if (clientId) { conditions.push(`r.client_id = $2`); values.push(clientId); }
  const result = await query(
    `SELECT r.*, c.name AS client_name, u.name AS created_by_name
     FROM client_reports r
     LEFT JOIN clients c ON r.client_id = c.id
     LEFT JOIN users u ON r.created_by = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY r.created_at DESC`,
    values
  );
  return result.rows;
};

export const getReportById = async (id, brandId) => {
  const result = await query(
    `SELECT r.*, c.name AS client_name, u.name AS created_by_name
     FROM client_reports r
     LEFT JOIN clients c ON r.client_id = c.id
     LEFT JOIN users u ON r.created_by = u.id
     WHERE r.id = $1 AND r.brand_id = $2`,
    [id, brandId]
  );
  return result.rows[0] || null;
};

export const createReport = async (data) => {
  const result = await query(
    `INSERT INTO client_reports (brand_id, client_id, title, period_start, period_end, summary_text, metrics, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      data.brand_id, data.client_id || null, data.title,
      data.period_start, data.period_end,
      data.summary_text || null,
      JSON.stringify(data.metrics || {}),
      data.created_by || null
    ]
  );
  return result.rows[0];
};

export const deleteReport = async (id, brandId) => {
  await query(`DELETE FROM client_reports WHERE id = $1 AND brand_id = $2`, [id, brandId]);
};
