import { query } from '../config/database.js';

export const getTwilioConnection = async (brandId) =>
  (await query(`SELECT * FROM twilio_connections WHERE brand_id = $1 AND is_active = TRUE LIMIT 1`, [brandId])).rows[0] || null;

export const saveTwilioConnection = async (brandId, { account_sid, auth_token, phone_number }) => {
  const existing = await getTwilioConnection(brandId);
  if (existing) {
    return (await query(
      `UPDATE twilio_connections SET account_sid=$1, auth_token=$2, phone_number=$3 WHERE brand_id=$4 AND is_active=TRUE RETURNING *`,
      [account_sid, auth_token, phone_number, brandId]
    )).rows[0];
  }
  return (await query(
    `INSERT INTO twilio_connections (brand_id, account_sid, auth_token, phone_number) VALUES ($1,$2,$3,$4) RETURNING *`,
    [brandId, account_sid, auth_token, phone_number]
  )).rows[0];
};

export const deleteTwilioConnection = async (brandId) =>
  query(`UPDATE twilio_connections SET is_active = FALSE WHERE brand_id = $1`, [brandId]);

export const getMessages = async (brandId, clientId) => {
  const params = [brandId];
  let where = 'WHERE sm.brand_id = $1';
  if (clientId) { where += ' AND sm.client_id = $2'; params.push(clientId); }
  return (await query(
    `SELECT sm.*, c.name as client_name FROM sms_messages sm
     LEFT JOIN clients c ON c.id = sm.client_id
     ${where} ORDER BY sm.created_at DESC LIMIT 200`,
    params
  )).rows;
};

export const getConversations = async (brandId) =>
  (await query(
    `SELECT DISTINCT ON (COALESCE(sm.client_id::text, CASE WHEN sm.direction='inbound' THEN sm.from_number ELSE sm.to_number END))
      sm.*, c.name as client_name
     FROM sms_messages sm
     LEFT JOIN clients c ON c.id = sm.client_id
     WHERE sm.brand_id = $1
     ORDER BY COALESCE(sm.client_id::text, CASE WHEN sm.direction='inbound' THEN sm.from_number ELSE sm.to_number END), sm.created_at DESC`,
    [brandId]
  )).rows;

export const saveMessage = async ({ brand_id, client_id, direction, from_number, to_number, body, twilio_sid, status }) =>
  (await query(
    `INSERT INTO sms_messages (brand_id, client_id, direction, from_number, to_number, body, twilio_sid, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [brand_id, client_id || null, direction, from_number, to_number, body, twilio_sid || null, status || 'sent']
  )).rows[0];

export const findClientByPhone = async (brandId, phone) => {
  const normalized = phone.replace(/\D/g, '');
  return (await query(
    `SELECT id, name FROM clients WHERE brand_id = $1 AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $2 AND is_active = TRUE LIMIT 1`,
    [brandId, normalized]
  )).rows[0] || null;
};

export const findTwilioConnectionByPhone = async (phone) =>
  (await query(
    `SELECT tc.*, tc.brand_id FROM twilio_connections tc
     WHERE tc.phone_number = $1 AND tc.is_active = TRUE LIMIT 1`,
    [phone]
  )).rows[0] || null;
