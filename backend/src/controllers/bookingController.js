import * as bookingModel from '../models/bookingModel.js';
import * as brandModel from '../models/brandModel.js';
import { sendBookingConfirmationEmail, sendBookingNotificationEmail } from '../utils/emailUtils.js';

const auth = async (brandId, userId, res) => {
  const m = await brandModel.getBrandMember(brandId, userId);
  if (!m) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return null; }
  return m;
};

// ── Protected ──
export const listPages = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const pages = await bookingModel.getPagesByBrand(req.params.brandId);
    res.json({ status: 'success', data: { pages } });
  } catch (e) { next(e); }
};

export const createPage = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    // Auto-generate slug if not provided
    const slug = req.body.slug || req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
    const page = await bookingModel.createPage({ ...req.body, slug, brand_id: brandId });
    res.status(201).json({ status: 'success', data: { page } });
  } catch (e) { next(e); }
};

export const updatePage = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const page = await bookingModel.updatePage(req.params.pageId, req.body);
    if (!page) return res.status(404).json({ status: 'fail', message: 'Booking page not found' });
    res.json({ status: 'success', data: { page } });
  } catch (e) { next(e); }
};

export const deletePage = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    await bookingModel.deletePage(req.params.pageId);
    res.json({ status: 'success', message: 'Booking page deleted' });
  } catch (e) { next(e); }
};

export const listBookings = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const bookings = await bookingModel.getBookingsByBrand(req.params.brandId);
    res.json({ status: 'success', data: { bookings } });
  } catch (e) { next(e); }
};

// ── Public ──
export const getPublicPage = async (req, res, next) => {
  try {
    const page = await bookingModel.getPageBySlug(req.params.slug);
    if (!page) return res.status(404).json({ status: 'fail', message: 'Booking page not found' });
    res.json({ status: 'success', data: { page } });
  } catch (e) { next(e); }
};

export const getAvailableSlots = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { date } = req.query; // YYYY-MM-DD
    const page = await bookingModel.getPageBySlug(slug);
    if (!page) return res.status(404).json({ status: 'fail', message: 'Not found' });

    if (!date) return res.json({ status: 'success', data: { slots: [] } });

    const dayOfWeek = new Date(date + 'T12:00:00').getDay();
    if (!page.available_days.includes(dayOfWeek)) return res.json({ status: 'success', data: { slots: [] } });

    // Generate slots
    const slots = [];
    const [startH, startM] = page.day_start_time.split(':').map(Number);
    const [endH, endM] = page.day_end_time.split(':').map(Number);
    const dur = page.duration_minutes;
    const buf = page.buffer_minutes || 0;
    let cur = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    while (cur + dur <= endMin) {
      const h = Math.floor(cur / 60); const m = cur % 60;
      const start = `${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
      const endSlot = new Date(new Date(start).getTime() + dur * 60000).toISOString().replace('Z', '');
      const conflicts = await bookingModel.getConflictingBookings(page.id, start, endSlot);
      if (!conflicts.length) slots.push({ start, end: endSlot });
      cur += dur + buf;
    }

    res.json({ status: 'success', data: { slots } });
  } catch (e) { next(e); }
};

export const createBooking = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const page = await bookingModel.getPageBySlug(slug);
    if (!page) return res.status(404).json({ status: 'fail', message: 'Booking page not found' });

    const { client_name, client_email, client_message, start_time, end_time } = req.body;
    if (!client_name || !client_email || !start_time) return res.status(400).json({ status: 'fail', message: 'Name, email, and time are required' });

    const conflicts = await bookingModel.getConflictingBookings(page.id, start_time, end_time);
    if (conflicts.length) return res.status(409).json({ status: 'fail', message: 'That time slot is no longer available' });

    const booking = await bookingModel.createBooking({ booking_page_id: page.id, brand_id: page.brand_id, client_name, client_email, client_message, start_time, end_time });

    // Send emails fire-and-forget
    sendBookingConfirmationEmail(client_email, client_name, page.title, start_time, booking.cancel_token).catch(() => {});
    sendBookingNotificationEmail(page.brand_name, page.title, client_name, client_email, start_time).catch(() => {});

    res.status(201).json({ status: 'success', data: { booking } });
  } catch (e) { next(e); }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const cancelled = await bookingModel.cancelBooking(req.params.token);
    if (!cancelled) return res.status(404).json({ status: 'fail', message: 'Booking not found or already cancelled' });
    res.json({ status: 'success', message: 'Booking cancelled' });
  } catch (e) { next(e); }
};
