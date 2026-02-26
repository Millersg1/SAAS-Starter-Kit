import { query } from '../config/database.js';

export const getEventsByBrand = async (brandId, { start, end } = {}) => {
  let q = `SELECT ce.*, c.name AS client_name FROM calendar_events ce
           LEFT JOIN clients c ON c.id = ce.client_id
           WHERE ce.brand_id = $1 AND ce.is_active = TRUE`;
  const params = [brandId]; let idx = 1;
  if (start) { idx++; q += ` AND ce.start_time >= $${idx}`; params.push(start); }
  if (end)   { idx++; q += ` AND ce.start_time <= $${idx}`; params.push(end); }
  q += ` ORDER BY ce.start_time ASC`;
  return (await query(q, params)).rows;
};

export const createEvent = async (data) => {
  const { brand_id, created_by, client_id, title, description, location, start_time, end_time, all_day, event_type, reminder_minutes } = data;
  const result = await query(
    `INSERT INTO calendar_events (brand_id,created_by,client_id,title,description,location,start_time,end_time,all_day,event_type,reminder_minutes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [brand_id, created_by, client_id || null, title, description || null, location || null, start_time, end_time, all_day || false, event_type || 'meeting', reminder_minutes ?? 30]
  );
  return result.rows[0];
};

export const updateEvent = async (eventId, data) => {
  const allowed = ['title','description','location','start_time','end_time','all_day','event_type','reminder_minutes','client_id'];
  const updates = []; const params = []; let idx = 1;
  for (const key of allowed) {
    if (data[key] !== undefined) { updates.push(`${key} = $${idx}`); params.push(data[key]); idx++; }
  }
  if (!updates.length) return getEventById(eventId);
  params.push(eventId);
  return (await query(`UPDATE calendar_events SET ${updates.join(',')} WHERE id = $${idx} AND is_active = TRUE RETURNING *`, params)).rows[0] || null;
};

export const deleteEvent = async (eventId) => {
  return (await query(`UPDATE calendar_events SET is_active = FALSE WHERE id = $1 RETURNING id`, [eventId])).rows[0] || null;
};

export const getEventById = async (eventId) => {
  return (await query(`SELECT * FROM calendar_events WHERE id = $1 AND is_active = TRUE`, [eventId])).rows[0] || null;
};
