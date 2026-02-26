import { query } from '../config/database.js';

export const getPagesByBrand = async (brandId) => (await query(`SELECT * FROM booking_pages WHERE brand_id = $1 AND is_active = TRUE ORDER BY created_at DESC`, [brandId])).rows;
export const getPageBySlug = async (slug) => (await query(`SELECT bp.*, b.name AS brand_name FROM booking_pages bp JOIN brands b ON b.id = bp.brand_id WHERE bp.slug = $1 AND bp.is_active = TRUE`, [slug])).rows[0] || null;
export const getPageById = async (id) => (await query(`SELECT * FROM booking_pages WHERE id = $1 AND is_active = TRUE`, [id])).rows[0] || null;

export const createPage = async (data) => {
  const { brand_id, slug, title, description, duration_minutes, available_days, day_start_time, day_end_time, timezone, buffer_minutes } = data;
  return (await query(
    `INSERT INTO booking_pages (brand_id,slug,title,description,duration_minutes,available_days,day_start_time,day_end_time,timezone,buffer_minutes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [brand_id, slug, title, description || null, duration_minutes || 30, available_days || [1,2,3,4,5], day_start_time || '09:00', day_end_time || '17:00', timezone || 'America/New_York', buffer_minutes || 0]
  )).rows[0];
};

export const updatePage = async (id, data) => {
  const allowed = ['title','description','duration_minutes','available_days','day_start_time','day_end_time','timezone','buffer_minutes','is_active'];
  const updates = []; const params = []; let idx = 1;
  for (const k of allowed) { if (data[k] !== undefined) { updates.push(`${k} = $${idx}`); params.push(data[k]); idx++; } }
  if (!updates.length) return getPageById(id);
  params.push(id);
  return (await query(`UPDATE booking_pages SET ${updates.join(',')} WHERE id = $${idx} RETURNING *`, params)).rows[0] || null;
};

export const deletePage = async (id) => (await query(`UPDATE booking_pages SET is_active = FALSE WHERE id = $1 RETURNING id`, [id])).rows[0] || null;

export const getBookingsByPage = async (pageId) => (await query(`SELECT * FROM bookings WHERE booking_page_id = $1 ORDER BY start_time DESC`, [pageId])).rows;
export const getBookingsByBrand = async (brandId) => (await query(`SELECT bk.*, bp.title AS page_title FROM bookings bk JOIN booking_pages bp ON bp.id = bk.booking_page_id WHERE bk.brand_id = $1 ORDER BY bk.start_time DESC`, [brandId])).rows;

export const createBooking = async (data) => {
  const { booking_page_id, brand_id, client_name, client_email, client_message, start_time, end_time } = data;
  return (await query(
    `INSERT INTO bookings (booking_page_id,brand_id,client_name,client_email,client_message,start_time,end_time) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [booking_page_id, brand_id, client_name, client_email, client_message || null, start_time, end_time]
  )).rows[0];
};

export const getConflictingBookings = async (pageId, start, end) => (await query(
  `SELECT id FROM bookings WHERE booking_page_id = $1 AND status = 'confirmed' AND start_time < $3 AND end_time > $2`,
  [pageId, start, end]
)).rows;

export const cancelBooking = async (cancelToken) => (await query(`UPDATE bookings SET status = 'cancelled' WHERE cancel_token = $1 RETURNING id`, [cancelToken])).rows[0] || null;
