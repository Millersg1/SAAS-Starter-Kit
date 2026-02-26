import * as calendarModel from '../models/calendarModel.js';
import * as brandModel from '../models/brandModel.js';

const auth = async (brandId, userId, res) => {
  const member = await brandModel.getBrandMember(brandId, userId);
  if (!member) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return null; }
  return member;
};

export const listEvents = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const events = await calendarModel.getEventsByBrand(brandId, req.query);
    res.json({ status: 'success', data: { events } });
  } catch (e) { next(e); }
};

export const createEvent = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const event = await calendarModel.createEvent({ ...req.body, brand_id: brandId, created_by: req.user.id });
    res.status(201).json({ status: 'success', data: { event } });
  } catch (e) { next(e); }
};

export const updateEvent = async (req, res, next) => {
  try {
    const { brandId, eventId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const event = await calendarModel.updateEvent(eventId, req.body);
    if (!event) return res.status(404).json({ status: 'fail', message: 'Event not found' });
    res.json({ status: 'success', data: { event } });
  } catch (e) { next(e); }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const { brandId, eventId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const deleted = await calendarModel.deleteEvent(eventId);
    if (!deleted) return res.status(404).json({ status: 'fail', message: 'Event not found' });
    res.json({ status: 'success', message: 'Event deleted' });
  } catch (e) { next(e); }
};
