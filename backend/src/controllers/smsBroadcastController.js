import { query } from '../config/database.js';
import { getTwilioConnection, saveMessage } from '../models/smsModel.js';
import { evaluateSegment } from '../models/segmentModel.js';

const auth = async (brandId, userId, res) => {
  const { rows } = await query(`SELECT id FROM brand_members WHERE brand_id = $1 AND user_id = $2`, [brandId, userId]);
  if (!rows.length) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return false; }
  return true;
};

export const listBroadcasts = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const { rows } = await query(
      `SELECT b.*, s.name AS segment_name
       FROM sms_broadcasts b
       LEFT JOIN segments s ON s.id = b.segment_id
       WHERE b.brand_id = $1
       ORDER BY b.created_at DESC`,
      [brandId]
    );
    res.json({ status: 'success', data: { broadcasts: rows } });
  } catch (e) { next(e); }
};

export const createBroadcast = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const { name, message, segment_id } = req.body;
    if (!name || !message) return res.status(400).json({ status: 'fail', message: 'Name and message are required' });
    const { rows } = await query(
      `INSERT INTO sms_broadcasts (brand_id, name, message, segment_id, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [brandId, name.trim(), message.trim(), segment_id || null, req.user.id]
    );
    res.status(201).json({ status: 'success', data: { broadcast: rows[0] } });
  } catch (e) { next(e); }
};

export const getBroadcast = async (req, res, next) => {
  try {
    const { brandId, broadcastId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const broadcast = (await query(
      `SELECT b.*, s.name AS segment_name
       FROM sms_broadcasts b
       LEFT JOIN segments s ON s.id = b.segment_id
       WHERE b.id = $1 AND b.brand_id = $2`,
      [broadcastId, brandId]
    )).rows[0];
    if (!broadcast) return res.status(404).json({ status: 'fail', message: 'Broadcast not found' });
    const recipients = (await query(
      `SELECT * FROM sms_broadcast_recipients WHERE broadcast_id = $1 ORDER BY sent_at ASC NULLS LAST`,
      [broadcastId]
    )).rows;
    res.json({ status: 'success', data: { broadcast, recipients } });
  } catch (e) { next(e); }
};

export const deleteBroadcast = async (req, res, next) => {
  try {
    const { brandId, broadcastId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const broadcast = (await query(
      `SELECT status FROM sms_broadcasts WHERE id = $1 AND brand_id = $2`,
      [broadcastId, brandId]
    )).rows[0];
    if (!broadcast) return res.status(404).json({ status: 'fail', message: 'Broadcast not found' });
    if (broadcast.status !== 'draft') return res.status(400).json({ status: 'fail', message: 'Only draft broadcasts can be deleted' });
    await query(`DELETE FROM sms_broadcasts WHERE id = $1`, [broadcastId]);
    res.json({ status: 'success', message: 'Broadcast deleted' });
  } catch (e) { next(e); }
};

export const sendBroadcast = async (req, res, next) => {
  try {
    const { brandId, broadcastId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    const broadcast = (await query(
      `SELECT b.*, s.filter_config FROM sms_broadcasts b
       LEFT JOIN segments s ON s.id = b.segment_id
       WHERE b.id = $1 AND b.brand_id = $2`,
      [broadcastId, brandId]
    )).rows[0];
    if (!broadcast) return res.status(404).json({ status: 'fail', message: 'Broadcast not found' });
    if (broadcast.status !== 'draft') return res.status(400).json({ status: 'fail', message: 'Broadcast already sent or sending' });

    // Get Twilio connection
    const conn = await getTwilioConnection(brandId);
    if (!conn) return res.status(400).json({ status: 'fail', message: 'No Twilio connection configured for this brand' });

    // Resolve recipients — from segment or all clients with phone
    let clients = [];
    if (broadcast.segment_id && broadcast.filter_config) {
      clients = await evaluateSegment(brandId, broadcast.filter_config);
    } else {
      const { rows } = await query(
        `SELECT id, name, phone FROM clients WHERE brand_id = $1 AND is_active = TRUE AND phone IS NOT NULL AND phone != ''`,
        [brandId]
      );
      clients = rows;
    }
    const recipients = clients.filter(c => c.phone);
    if (!recipients.length) return res.status(400).json({ status: 'fail', message: 'No clients with phone numbers found in this segment' });

    // Insert recipient rows
    for (const c of recipients) {
      await query(
        `INSERT INTO sms_broadcast_recipients (broadcast_id, client_id, phone, name) VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING`,
        [broadcastId, c.id, c.phone, c.name || null]
      );
    }

    // Mark as sending
    await query(
      `UPDATE sms_broadcasts SET status='sending', total_recipients=$2 WHERE id=$1`,
      [broadcastId, recipients.length]
    );

    // Respond immediately — fire and forget
    res.json({ status: 'success', message: `Sending to ${recipients.length} recipients`, data: { total: recipients.length } });

    // Background send loop
    setImmediate(async () => {
      const { default: twilio } = await import('twilio');
      const twilioClient = twilio(conn.account_sid, conn.auth_token);
      let sentCount = 0;
      let failedCount = 0;

      for (const recipient of recipients) {
        try {
          const msg = await twilioClient.messages.create({
            from: conn.phone_number,
            to: recipient.phone,
            body: broadcast.message,
          });
          await saveMessage({
            brand_id: brandId,
            client_id: recipient.id,
            direction: 'outbound',
            from_number: conn.phone_number,
            to_number: recipient.phone,
            body: broadcast.message,
            twilio_sid: msg.sid,
            status: msg.status,
          });
          await query(
            `UPDATE sms_broadcast_recipients SET status='sent', sent_at=NOW() WHERE broadcast_id=$1 AND phone=$2`,
            [broadcastId, recipient.phone]
          );
          sentCount++;
        } catch (err) {
          await query(
            `UPDATE sms_broadcast_recipients SET status='failed', error_message=$3 WHERE broadcast_id=$1 AND phone=$2`,
            [broadcastId, recipient.phone, err.message?.slice(0, 255)]
          );
          failedCount++;
        }
        await query(
          `UPDATE sms_broadcasts SET sent_count=$2, failed_count=$3 WHERE id=$1`,
          [broadcastId, sentCount, failedCount]
        );
        // Throttle to avoid Twilio rate limits
        await new Promise(r => setTimeout(r, 150));
      }

      await query(
        `UPDATE sms_broadcasts SET status='sent', sent_at=NOW() WHERE id=$1`,
        [broadcastId]
      );
    });
  } catch (e) { next(e); }
};
