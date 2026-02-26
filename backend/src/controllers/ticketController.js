import * as ticketModel from '../models/ticketModel.js';
import * as brandModel from '../models/brandModel.js';
import { sendNewTicketEmail, sendTicketReplyEmail } from '../utils/emailUtils.js';
import { query } from '../config/database.js';

const auth = async (brandId, userId, res) => {
  const m = await brandModel.getBrandMember(brandId, userId);
  if (!m) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return null; }
  return m;
};

// ── Agency side ──
export const listTickets = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const tickets = await ticketModel.getTicketsByBrand(req.params.brandId, req.query);
    res.json({ status: 'success', data: { tickets } });
  } catch (e) { next(e); }
};

export const getTicket = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const ticket = await ticketModel.getTicketById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ status: 'fail', message: 'Ticket not found' });
    const messages = await ticketModel.getMessages(req.params.ticketId, true);
    res.json({ status: 'success', data: { ticket, messages } });
  } catch (e) { next(e); }
};

export const createTicket = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const ticket = await ticketModel.createTicket({ ...req.body, brand_id: brandId });
    res.status(201).json({ status: 'success', data: { ticket } });
  } catch (e) { next(e); }
};

export const updateTicket = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const ticket = await ticketModel.updateTicket(req.params.ticketId, req.body);
    if (!ticket) return res.status(404).json({ status: 'fail', message: 'Ticket not found' });
    res.json({ status: 'success', data: { ticket } });
  } catch (e) { next(e); }
};

export const replyToTicket = async (req, res, next) => {
  try {
    const { brandId, ticketId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const { body, is_internal } = req.body;
    if (!body) return res.status(400).json({ status: 'fail', message: 'Reply body is required' });
    const message = await ticketModel.addMessage({ ticket_id: ticketId, sender_type: 'agent', sender_id: req.user.id, body, is_internal: !!is_internal });
    // Email client if not internal
    if (!is_internal) {
      const ticket = await ticketModel.getTicketById(ticketId);
      if (ticket?.client_email) sendTicketReplyEmail(ticket.client_email, ticket.client_name, ticket.subject, ticket.ticket_number, body).catch(() => {});
    }
    res.status(201).json({ status: 'success', data: { message } });
  } catch (e) { next(e); }
};

export const deleteTicket = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    await ticketModel.deleteTicket(req.params.ticketId);
    res.json({ status: 'success', message: 'Ticket deleted' });
  } catch (e) { next(e); }
};

// ── Portal side ──
const getPortalClient = async (req) => {
  if (!req.portalClient) return null;
  return req.portalClient;
};

export const portalListTickets = async (req, res, next) => {
  try {
    const client = await getPortalClient(req);
    if (!client) return res.status(401).json({ status: 'fail', message: 'Not authenticated' });
    const tickets = await ticketModel.getTicketsByClient(client.id);
    res.json({ status: 'success', data: { tickets } });
  } catch (e) { next(e); }
};

export const portalGetTicket = async (req, res, next) => {
  try {
    const client = await getPortalClient(req);
    if (!client) return res.status(401).json({ status: 'fail', message: 'Not authenticated' });
    const ticket = await ticketModel.getTicketByClientAndId(client.id, req.params.ticketId);
    if (!ticket) return res.status(404).json({ status: 'fail', message: 'Ticket not found' });
    const messages = await ticketModel.getMessages(req.params.ticketId, false);
    res.json({ status: 'success', data: { ticket, messages } });
  } catch (e) { next(e); }
};

export const portalCreateTicket = async (req, res, next) => {
  try {
    const client = await getPortalClient(req);
    if (!client) return res.status(401).json({ status: 'fail', message: 'Not authenticated' });
    const { subject, priority, body } = req.body;
    if (!subject || !body) return res.status(400).json({ status: 'fail', message: 'Subject and message are required' });
    const ticket = await ticketModel.createTicket({ brand_id: client.brand_id, client_id: client.id, subject, priority });
    await ticketModel.addMessage({ ticket_id: ticket.id, sender_type: 'client', sender_id: client.id, body, is_internal: false });
    // Notify brand owner
    try {
      const brand = await brandModel.getBrandById(client.brand_id);
      if (brand) {
        const ownerResult = await query(`SELECT email, name FROM users WHERE id = $1`, [brand.owner_id]);
        if (ownerResult.rows[0]) sendNewTicketEmail(ownerResult.rows[0].email, ownerResult.rows[0].name, client.name, subject, ticket.ticket_number).catch(() => {});
      }
    } catch { /* non-critical */ }
    res.status(201).json({ status: 'success', data: { ticket } });
  } catch (e) { next(e); }
};

export const portalReplyTicket = async (req, res, next) => {
  try {
    const client = await getPortalClient(req);
    if (!client) return res.status(401).json({ status: 'fail', message: 'Not authenticated' });
    const ticket = await ticketModel.getTicketByClientAndId(client.id, req.params.ticketId);
    if (!ticket) return res.status(404).json({ status: 'fail', message: 'Ticket not found' });
    const { body } = req.body;
    if (!body) return res.status(400).json({ status: 'fail', message: 'Message body is required' });
    const message = await ticketModel.addMessage({ ticket_id: ticket.id, sender_type: 'client', sender_id: client.id, body, is_internal: false });
    res.status(201).json({ status: 'success', data: { message } });
  } catch (e) { next(e); }
};
