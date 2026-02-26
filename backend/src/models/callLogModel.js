import { query } from '../config/database.js';

export const getCallLogsByBrand = async (brandId, { client_id, limit = 50, offset = 0 } = {}) => {
  let q = `SELECT cl.*, c.name AS client_name, u.name AS user_name
           FROM call_logs cl
           LEFT JOIN clients c ON c.id = cl.client_id
           LEFT JOIN users u ON u.id = cl.user_id
           WHERE cl.brand_id = $1`;
  const params = [brandId];
  let idx = 1;
  if (client_id) { idx++; q += ` AND cl.client_id = $${idx}`; params.push(client_id); }
  q += ` ORDER BY cl.called_at DESC LIMIT $${idx + 1} OFFSET $${idx + 2}`;
  params.push(limit, offset);
  const result = await query(q, params);
  return result.rows;
};

export const createCallLog = async (data) => {
  const { brand_id, client_id, user_id, direction, phone_number, duration_seconds, outcome, notes, called_at } = data;
  const result = await query(
    `INSERT INTO call_logs (brand_id, client_id, user_id, direction, phone_number, duration_seconds, outcome, notes, called_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [brand_id, client_id || null, user_id || null, direction || 'outbound', phone_number || null, duration_seconds || 0, outcome || null, notes || null, called_at || new Date()]
  );
  return result.rows[0];
};

export const updateCallLog = async (logId, data) => {
  const allowed = ['direction', 'phone_number', 'duration_seconds', 'outcome', 'notes', 'called_at'];
  const updates = []; const params = []; let idx = 1;
  for (const key of allowed) {
    if (data[key] !== undefined) { updates.push(`${key} = $${idx}`); params.push(data[key]); idx++; }
  }
  if (!updates.length) return getCallLogById(logId);
  params.push(logId);
  const result = await query(`UPDATE call_logs SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
  return result.rows[0] || null;
};

export const getCallLogById = async (logId) => {
  const result = await query(`SELECT * FROM call_logs WHERE id = $1`, [logId]);
  return result.rows[0] || null;
};

export const deleteCallLog = async (logId) => {
  const result = await query(`DELETE FROM call_logs WHERE id = $1 RETURNING id`, [logId]);
  return result.rows[0] || null;
};
