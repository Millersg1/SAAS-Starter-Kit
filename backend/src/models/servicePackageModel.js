import { query } from '../config/database.js';

// ── Packages ──────────────────────────────────────────────────────────────────

export const getPackages = async (brandId, clientId = null) => {
  const conditions = ['sp.brand_id = $1'];
  const values = [brandId];
  if (clientId) { conditions.push(`sp.client_id = $2`); values.push(clientId); }
  const result = await query(
    `SELECT sp.*, c.name AS client_name
     FROM service_packages sp
     LEFT JOIN clients c ON sp.client_id = c.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY sp.created_at DESC`,
    values
  );
  return result.rows;
};

export const getPackageById = async (id, brandId) => {
  const result = await query(
    `SELECT sp.*, c.name AS client_name
     FROM service_packages sp
     LEFT JOIN clients c ON sp.client_id = c.id
     WHERE sp.id = $1 AND sp.brand_id = $2`,
    [id, brandId]
  );
  return result.rows[0] || null;
};

export const createPackage = async (data) => {
  const result = await query(
    `INSERT INTO service_packages
       (brand_id, client_id, name, description, monthly_hours, monthly_posts, monthly_pages, price, billing_cycle, start_date, end_date, status, services)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      data.brand_id, data.client_id || null, data.name, data.description || null,
      data.monthly_hours || 0, data.monthly_posts || 0, data.monthly_pages || 0,
      data.price || 0, data.billing_cycle || 'monthly',
      data.start_date || null, data.end_date || null,
      data.status || 'active',
      JSON.stringify(data.services || [])
    ]
  );
  return result.rows[0];
};

export const updatePackage = async (id, data) => {
  const allowed = ['name','description','monthly_hours','monthly_posts','monthly_pages','price','billing_cycle','start_date','end_date','status','services','client_id'];
  const fields = Object.keys(data).filter(k => allowed.includes(k));
  if (!fields.length) return null;
  const setClause = fields.map((f, i) => {
    if (f === 'services') return `services = $${i + 2}::jsonb`;
    return `${f} = $${i + 2}`;
  }).join(', ');
  const values = fields.map(f => f === 'services' ? JSON.stringify(data[f]) : data[f]);
  const result = await query(
    `UPDATE service_packages SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

export const deletePackage = async (id, brandId) => {
  await query(`DELETE FROM service_packages WHERE id = $1 AND brand_id = $2`, [id, brandId]);
};

// ── Usage Logs ────────────────────────────────────────────────────────────────

export const logUsage = async (data) => {
  const result = await query(
    `INSERT INTO package_usage (package_id, brand_id, period_start, period_end, hours_used, posts_published, pages_published, notes, logged_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      data.package_id, data.brand_id, data.period_start, data.period_end,
      data.hours_used || 0, data.posts_published || 0, data.pages_published || 0,
      data.notes || null, data.logged_by || null
    ]
  );
  return result.rows[0];
};

export const getUsageHistory = async (packageId, limit = 12) => {
  const result = await query(
    `SELECT pu.*, u.name AS logged_by_name
     FROM package_usage pu
     LEFT JOIN users u ON pu.logged_by = u.id
     WHERE pu.package_id = $1
     ORDER BY pu.period_start DESC
     LIMIT $2`,
    [packageId, limit]
  );
  return result.rows;
};

// Current period = most recent usage entry OR auto-summed from real data
export const getCurrentPeriodSummary = async (packageId) => {
  // Sum usage from the last calendar month
  const result = await query(
    `SELECT
       COALESCE(SUM(hours_used), 0)       AS hours_used,
       COALESCE(SUM(posts_published), 0)  AS posts_published,
       COALESCE(SUM(pages_published), 0)  AS pages_published
     FROM package_usage
     WHERE package_id = $1
       AND period_start >= DATE_TRUNC('month', NOW())`,
    [packageId]
  );
  return result.rows[0] || { hours_used: 0, posts_published: 0, pages_published: 0 };
};
