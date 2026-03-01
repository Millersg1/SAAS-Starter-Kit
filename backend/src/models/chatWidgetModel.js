import { query } from '../config/database.js';

const DEFAULT_SETTINGS = {
  is_enabled: true,
  widget_name: 'Chat with us',
  greeting_message: 'Hi! How can I help you today?',
  primary_color: '#2563eb',
  position: 'right',
  collect_email: true,
  ai_enabled: true,
  ai_context: '',
  offline_message: "We're offline right now. Leave a message!",
};

// ── Settings ─────────────────────────────────────────────────────────────────

export const getSettings = async (brandId) => {
  const result = await query(
    `SELECT * FROM chat_widget_settings WHERE brand_id = $1`,
    [brandId]
  );
  return result.rows[0] || { ...DEFAULT_SETTINGS, brand_id: brandId };
};

export const upsertSettings = async (brandId, data) => {
  const fields = [
    'is_enabled', 'widget_name', 'greeting_message', 'primary_color',
    'position', 'collect_email', 'ai_enabled', 'ai_context', 'offline_message',
  ];
  const setClauses = fields
    .filter(f => data[f] !== undefined)
    .map((f, i) => `${f} = $${i + 2}`)
    .join(', ');
  const values = [brandId, ...fields.filter(f => data[f] !== undefined).map(f => data[f])];

  if (!setClauses) return getSettings(brandId);

  const result = await query(
    `INSERT INTO chat_widget_settings (brand_id, ${fields.filter(f => data[f] !== undefined).join(', ')})
     VALUES ($1, ${fields.filter(f => data[f] !== undefined).map((_, i) => `$${i + 2}`).join(', ')})
     ON CONFLICT (brand_id) DO UPDATE SET ${setClauses}, updated_at = NOW()
     RETURNING *`,
    values
  );
  return result.rows[0];
};

// ── Sessions ─────────────────────────────────────────────────────────────────

export const createSession = async ({ brand_id, visitor_id, page_url }) => {
  const result = await query(
    `INSERT INTO chat_sessions (brand_id, visitor_id, page_url)
     VALUES ($1, $2, $3) RETURNING *`,
    [brand_id, visitor_id || null, page_url || null]
  );
  return result.rows[0];
};

export const updateSession = async (id, data) => {
  const fields = [];
  const values = [];
  let idx = 1;
  if (data.visitor_name !== undefined)  { fields.push(`visitor_name = $${idx++}`);  values.push(data.visitor_name); }
  if (data.visitor_email !== undefined) { fields.push(`visitor_email = $${idx++}`); values.push(data.visitor_email); }
  if (data.status !== undefined)        { fields.push(`status = $${idx++}`);        values.push(data.status); }
  if (data.last_message_at !== undefined) { fields.push(`last_message_at = $${idx++}`); values.push(data.last_message_at); }
  if (data.converted_to_client_id !== undefined) { fields.push(`converted_to_client_id = $${idx++}`); values.push(data.converted_to_client_id); }
  if (!fields.length) return null;
  values.push(id);
  const result = await query(
    `UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
};

export const getSessions = async (brandId, opts = {}) => {
  let sql = `SELECT s.*,
      (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) AS message_count,
      (SELECT content FROM chat_messages m WHERE m.session_id = s.id ORDER BY created_at DESC LIMIT 1) AS last_message
     FROM chat_sessions s
     WHERE s.brand_id = $1`;
  const values = [brandId];
  if (opts.status) { sql += ` AND s.status = $${values.length + 1}`; values.push(opts.status); }
  sql += ` ORDER BY s.last_message_at DESC NULLS LAST`;
  if (opts.limit) { sql += ` LIMIT $${values.length + 1}`; values.push(opts.limit); }
  const result = await query(sql, values);
  return result.rows;
};

export const getSessionById = async (id, brandId) => {
  const sessionResult = await query(
    `SELECT * FROM chat_sessions WHERE id = $1 AND brand_id = $2`,
    [id, brandId]
  );
  if (!sessionResult.rows[0]) return null;
  const messagesResult = await query(
    `SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
    [id]
  );
  return { ...sessionResult.rows[0], messages: messagesResult.rows };
};

export const getSessionByIdPublic = async (id, brandId) => {
  // Same as above but no brand_id check (for public widget endpoints)
  const sessionResult = await query(
    `SELECT * FROM chat_sessions WHERE id = $1 AND brand_id = $2`,
    [id, brandId]
  );
  return sessionResult.rows[0] || null;
};

export const deleteSession = async (id, brandId) => {
  await query(`DELETE FROM chat_sessions WHERE id = $1 AND brand_id = $2`, [id, brandId]);
};

// ── Messages ─────────────────────────────────────────────────────────────────

export const addMessage = async (sessionId, brandId, role, content) => {
  const result = await query(
    `INSERT INTO chat_messages (session_id, brand_id, role, content) VALUES ($1, $2, $3, $4) RETURNING *`,
    [sessionId, brandId, role, content]
  );
  // Update last_message_at on session
  await query(
    `UPDATE chat_sessions SET last_message_at = NOW() WHERE id = $1`,
    [sessionId]
  );
  return result.rows[0];
};

export const getRecentMessages = async (sessionId, limit = 20) => {
  const result = await query(
    `SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2`,
    [sessionId, limit]
  );
  return result.rows;
};
