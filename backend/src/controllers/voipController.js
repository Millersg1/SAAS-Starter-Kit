import * as brandModel from '../models/brandModel.js';
import * as smsModel from '../models/smsModel.js';
import { transcribeCallRecording } from '../utils/transcriptionUtil.js';
import { query } from '../config/database.js';

const auth = async (brandId, userId, res) => {
  const m = await brandModel.getBrandMember(brandId, userId);
  if (!m) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return null; }
  return m;
};

export const initiateCall = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const { to, client_id, notes } = req.body;
    if (!to) return res.status(400).json({ status: 'fail', message: 'to phone number is required' });

    const conn = await smsModel.getTwilioConnection(brandId);
    if (!conn) return res.status(400).json({ status: 'fail', message: 'Twilio not connected. Configure Twilio credentials first.' });

    const { default: twilio } = await import('twilio');
    const client = twilio(conn.account_sid, conn.auth_token);

    const callbackUrl = `${process.env.APP_URL || process.env.BACKEND_URL || 'http://localhost:5000'}/api/voip/recording-callback`;
    const call = await client.calls.create({
      from: conn.phone_number,
      to,
      twiml: `<Response><Record action="${callbackUrl}" recordingStatusCallback="${callbackUrl}" maxLength="3600" transcribe="false"/></Response>`,
    });

    const logResult = await query(
      `INSERT INTO call_logs (brand_id, client_id, user_id, direction, phone_number, outcome, notes, twilio_call_sid, called_at)
       VALUES ($1,$2,$3,'outbound',$4,'answered',$5,$6,NOW()) RETURNING *`,
      [brandId, client_id || null, req.user.id, to, notes || null, call.sid]
    );

    res.status(201).json({ status: 'success', data: { callSid: call.sid, log: logResult.rows[0] } });
  } catch (e) { next(e); }
};

export const recordingCallback = async (req, res, next) => {
  try {
    const { RecordingUrl, CallSid, RecordingDuration } = req.body;
    if (!CallSid || !RecordingUrl) return res.sendStatus(200);

    const result = await query(
      `UPDATE call_logs SET recording_url = $1, duration_seconds = $2 WHERE twilio_call_sid = $3 RETURNING id, brand_id`,
      [RecordingUrl, parseInt(RecordingDuration) || 0, CallSid]
    );

    const callLog = result.rows[0];
    if (callLog) {
      const connResult = await query(
        `SELECT account_sid, auth_token FROM twilio_connections WHERE brand_id = $1 AND is_active = TRUE LIMIT 1`,
        [callLog.brand_id]
      );
      const conn = connResult.rows[0];
      if (conn) {
        transcribeCallRecording(callLog.id, RecordingUrl, conn.account_sid, conn.auth_token).catch(() => {});
      }
    }
    res.sendStatus(200);
  } catch (e) { next(e); }
};
