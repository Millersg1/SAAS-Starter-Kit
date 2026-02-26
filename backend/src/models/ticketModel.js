import { query } from '../config/database.js';

export const getTicketsByBrand = async (brandId, { status, priority } = {}) => {
  let q = `SELECT t.*, c.name AS client_name, u.name AS assigned_name,
             (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id = t.id) AS message_count
           FROM support_tickets t
           LEFT JOIN clients c ON c.id = t.client_id
           LEFT JOIN users u ON u.id = t.assigned_to
           WHERE t.brand_id = $1 AND t.is_active = TRUE`;
  const params = [brandId]; let idx = 1;
  if (status) { idx++; q += ` AND t.status = $${idx}`; params.push(status); }
  if (priority) { idx++; q += ` AND t.priority = $${idx}`; params.push(priority); }
  q += ` ORDER BY t.created_at DESC`;
  return (await query(q, params)).rows;
};

export const getTicketById = async (id) => (await query(
  `SELECT t.*, c.name AS client_name, c.email AS client_email, u.name AS assigned_name
   FROM support_tickets t LEFT JOIN clients c ON c.id = t.client_id LEFT JOIN users u ON u.id = t.assigned_to
   WHERE t.id = $1 AND t.is_active = TRUE`, [id]
)).rows[0] || null;

export const getTicketByClientAndId = async (clientId, ticketId) => (await query(
  `SELECT * FROM support_tickets WHERE id = $1 AND client_id = $2 AND is_active = TRUE`, [ticketId, clientId]
)).rows[0] || null;

export const createTicket = async (data) => {
  const num = (await query(`SELECT 'TKT-' || nextval('ticket_number_seq') AS num`)).rows[0].num;
  const { brand_id, client_id, subject, priority, assigned_to } = data;
  return (await query(
    `INSERT INTO support_tickets (brand_id,client_id,subject,priority,assigned_to,ticket_number) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [brand_id, client_id || null, subject, priority || 'normal', assigned_to || null, num]
  )).rows[0];
};

export const updateTicket = async (id, data) => {
  const allowed = ['subject','priority','status','assigned_to'];
  const updates = []; const params = []; let idx = 1;
  for (const k of allowed) { if (data[k] !== undefined) { updates.push(`${k} = $${idx}`); params.push(data[k]); idx++; } }
  if (data.status === 'resolved') { updates.push(`resolved_at = $${idx}`); params.push(new Date()); idx++; }
  updates.push(`updated_at = $${idx}`); params.push(new Date()); idx++;
  params.push(id);
  return (await query(`UPDATE support_tickets SET ${updates.join(',')} WHERE id = $${idx} RETURNING *`, params)).rows[0] || null;
};

export const deleteTicket = async (id) => (await query(`UPDATE support_tickets SET is_active = FALSE WHERE id = $1 RETURNING id`, [id])).rows[0] || null;

export const getMessages = async (ticketId, includeInternal = true) => {
  const q = includeInternal
    ? `SELECT tm.*, u.name AS sender_name FROM ticket_messages tm LEFT JOIN users u ON u.id::text = tm.sender_id::text WHERE tm.ticket_id = $1 ORDER BY tm.created_at ASC`
    : `SELECT tm.* FROM ticket_messages tm WHERE tm.ticket_id = $1 AND tm.is_internal = FALSE ORDER BY tm.created_at ASC`;
  return (await query(q, [ticketId])).rows;
};

export const addMessage = async (data) => {
  const { ticket_id, sender_type, sender_id, body, is_internal } = data;
  const msg = (await query(
    `INSERT INTO ticket_messages (ticket_id,sender_type,sender_id,body,is_internal) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [ticket_id, sender_type, sender_id || null, body, is_internal || false]
  )).rows[0];
  await query(`UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`, [ticket_id]);
  return msg;
};

export const getTicketsByClient = async (clientId) => (await query(
  `SELECT * FROM support_tickets WHERE client_id = $1 AND is_active = TRUE ORDER BY created_at DESC`, [clientId]
)).rows;
