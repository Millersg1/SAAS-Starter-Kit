import { query } from '../config/database.js';

// ─── Create ───────────────────────────────────────────────────────────────────

export const createTimeEntry = async (data) => {
  const {
    brand_id, project_id = null, client_id = null, user_id,
    description = null, start_time, end_time = null,
    hourly_rate = null, is_billable = true,
  } = data;

  let duration_minutes = null;
  let billable_amount = null;

  if (end_time) {
    const result = await query(
      `SELECT EXTRACT(EPOCH FROM ($1::TIMESTAMPTZ - $2::TIMESTAMPTZ)) / 60 AS mins`,
      [end_time, start_time]
    );
    duration_minutes = Math.round(parseFloat(result.rows[0].mins));
    if (is_billable && hourly_rate) {
      billable_amount = parseFloat(((duration_minutes / 60) * parseFloat(hourly_rate)).toFixed(2));
    }
  }

  const result = await query(
    `INSERT INTO time_entries
       (brand_id, project_id, client_id, user_id, description,
        start_time, end_time, duration_minutes, hourly_rate,
        billable_amount, is_billable)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [brand_id, project_id, client_id, user_id, description,
     start_time, end_time, duration_minutes, hourly_rate,
     billable_amount, is_billable]
  );
  return result.rows[0];
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export const getTimeEntryById = async (id) => {
  const result = await query(`SELECT * FROM time_entries WHERE id = $1`, [id]);
  return result.rows[0] || null;
};

export const getBrandTimeEntries = async (brandId, filters = {}) => {
  const conditions = ['te.brand_id = $1'];
  const params = [brandId];
  let idx = 2;

  if (filters.project_id) {
    conditions.push(`te.project_id = $${idx++}`);
    params.push(filters.project_id);
  }
  if (filters.client_id) {
    conditions.push(`te.client_id = $${idx++}`);
    params.push(filters.client_id);
  }
  if (filters.user_id) {
    conditions.push(`te.user_id = $${idx++}`);
    params.push(filters.user_id);
  }
  if (filters.is_billable !== undefined) {
    conditions.push(`te.is_billable = $${idx++}`);
    params.push(filters.is_billable === 'true' || filters.is_billable === true);
  }
  if (filters.is_invoiced !== undefined) {
    conditions.push(`te.is_invoiced = $${idx++}`);
    params.push(filters.is_invoiced === 'true' || filters.is_invoiced === true);
  }
  if (filters.start_date) {
    conditions.push(`te.start_time >= $${idx++}`);
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    conditions.push(`te.start_time <= $${idx++}`);
    params.push(filters.end_date);
  }

  const where = conditions.join(' AND ');
  const limit = parseInt(filters.limit) || 100;
  const offset = parseInt(filters.offset) || 0;

  const result = await query(
    `SELECT te.*,
            p.name  AS project_name,
            c.name  AS client_name,
            u.name  AS user_name
     FROM time_entries te
     LEFT JOIN projects p ON p.id = te.project_id
     LEFT JOIN clients  c ON c.id = te.client_id
     LEFT JOIN users    u ON u.id = te.user_id
     WHERE ${where}
     ORDER BY te.start_time DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return result.rows;
};

export const getProjectTimeEntries = async (projectId) => {
  const result = await query(
    `SELECT te.*,
            u.name AS user_name,
            c.name AS client_name
     FROM time_entries te
     LEFT JOIN users   u ON u.id = te.user_id
     LEFT JOIN clients c ON c.id = te.client_id
     WHERE te.project_id = $1
     ORDER BY te.start_time DESC`,
    [projectId]
  );
  return result.rows;
};

export const getActiveTimer = async (brandId, userId) => {
  const result = await query(
    `SELECT * FROM time_entries
     WHERE brand_id = $1 AND user_id = $2 AND end_time IS NULL
     ORDER BY start_time DESC LIMIT 1`,
    [brandId, userId]
  );
  return result.rows[0] || null;
};

export const getBillableSummary = async (brandId, filters = {}) => {
  const conditions = ['te.brand_id = $1'];
  const params = [brandId];
  let idx = 2;

  if (filters.project_id) {
    conditions.push(`te.project_id = $${idx++}`);
    params.push(filters.project_id);
  }
  if (filters.start_date) {
    conditions.push(`te.start_time >= $${idx++}`);
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    conditions.push(`te.start_time <= $${idx++}`);
    params.push(filters.end_date);
  }

  const where = conditions.join(' AND ');
  const result = await query(
    `SELECT
       COALESCE(SUM(te.duration_minutes), 0)                         AS total_minutes,
       COALESCE(SUM(te.duration_minutes) FILTER (WHERE te.is_billable), 0) AS billable_minutes,
       COALESCE(SUM(te.billable_amount)  FILTER (WHERE te.is_billable), 0) AS total_billable_amount,
       COUNT(*)                                                       AS total_entries,
       COUNT(*) FILTER (WHERE te.is_invoiced = FALSE AND te.is_billable = TRUE) AS uninvoiced_entries
     FROM time_entries te
     WHERE ${where}`,
    params
  );
  return result.rows[0];
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateTimeEntry = async (id, data) => {
  const fields = [];
  const params = [];
  let idx = 1;

  const allowed = [
    'description', 'project_id', 'client_id', 'start_time', 'end_time',
    'hourly_rate', 'is_billable', 'invoice_id', 'is_invoiced',
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      params.push(data[key]);
    }
  }

  if (fields.length === 0) return getTimeEntryById(id);

  // If both start_time and end_time will be set, compute duration
  const entry = await getTimeEntryById(id);
  const resolvedStart = data.start_time || entry.start_time;
  const resolvedEnd   = data.end_time   || entry.end_time;

  if (resolvedEnd) {
    const calc = await query(
      `SELECT EXTRACT(EPOCH FROM ($1::TIMESTAMPTZ - $2::TIMESTAMPTZ)) / 60 AS mins`,
      [resolvedEnd, resolvedStart]
    );
    const mins = Math.round(parseFloat(calc.rows[0].mins));
    const rate = data.hourly_rate !== undefined ? data.hourly_rate : entry.hourly_rate;
    const billable = data.is_billable !== undefined ? data.is_billable : entry.is_billable;

    fields.push(`duration_minutes = $${idx++}`);
    params.push(mins);

    if (billable && rate) {
      fields.push(`billable_amount = $${idx++}`);
      params.push(parseFloat(((mins / 60) * parseFloat(rate)).toFixed(2)));
    }
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE time_entries SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return result.rows[0];
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteTimeEntry = async (id) => {
  await query(`DELETE FROM time_entries WHERE id = $1`, [id]);
};
