import * as smsModel from '../models/smsModel.js';
import * as brandModel from '../models/brandModel.js';

const auth = async (brandId, userId, res) => {
  const m = await brandModel.getBrandMember(brandId, userId);
  if (!m) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return null; }
  return m;
};

export const getConnection = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const connection = await smsModel.getTwilioConnection(brandId);
    res.json({ status: 'success', data: { connection: connection ? { ...connection, auth_token: '••••••••' } : null } });
  } catch (e) { next(e); }
};

export const saveConnection = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const { account_sid, auth_token, phone_number } = req.body;
    if (!account_sid || !auth_token || !phone_number) {
      return res.status(400).json({ status: 'fail', message: 'account_sid, auth_token, and phone_number are required' });
    }
    const connection = await smsModel.saveTwilioConnection(brandId, { account_sid, auth_token, phone_number });
    res.json({ status: 'success', data: { connection: { ...connection, auth_token: '••••••••' } } });
  } catch (e) { next(e); }
};

export const removeConnection = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    await smsModel.deleteTwilioConnection(brandId);
    res.json({ status: 'success', message: 'Twilio connection removed' });
  } catch (e) { next(e); }
};

export const listMessages = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const messages = await smsModel.getMessages(brandId, req.query.client_id || null);
    res.json({ status: 'success', data: { messages } });
  } catch (e) { next(e); }
};

export const getConversations = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const conversations = await smsModel.getConversations(brandId);
    res.json({ status: 'success', data: { conversations } });
  } catch (e) { next(e); }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const { to, body, client_id } = req.body;
    if (!to || !body) return res.status(400).json({ status: 'fail', message: 'to and body are required' });

    const conn = await smsModel.getTwilioConnection(brandId);
    if (!conn) return res.status(400).json({ status: 'fail', message: 'Twilio not connected. Add your Twilio credentials in SMS settings.' });

    const { default: twilio } = await import('twilio');
    const client = twilio(conn.account_sid, conn.auth_token);
    const msg = await client.messages.create({ from: conn.phone_number, to, body });

    const saved = await smsModel.saveMessage({
      brand_id: brandId, client_id: client_id || null,
      direction: 'outbound', from_number: conn.phone_number,
      to_number: to, body, twilio_sid: msg.sid, status: msg.status
    });
    res.status(201).json({ status: 'success', data: { message: saved } });
  } catch (e) { next(e); }
};

export const incomingSms = async (req, res, next) => {
  try {
    const { From, To, Body, MessageSid } = req.body;
    const connection = await smsModel.findTwilioConnectionByPhone(To);
    if (!connection) return res.set('Content-Type', 'text/xml').send('<Response></Response>');

    const client = await smsModel.findClientByPhone(connection.brand_id, From);
    await smsModel.saveMessage({
      brand_id: connection.brand_id, client_id: client?.id || null,
      direction: 'inbound', from_number: From,
      to_number: To, body: Body, twilio_sid: MessageSid, status: 'received'
    });
    res.set('Content-Type', 'text/xml').send('<Response></Response>');
  } catch (e) { next(e); }
};
