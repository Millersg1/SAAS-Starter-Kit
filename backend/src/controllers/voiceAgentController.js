import * as brandModel from '../models/brandModel.js';
import * as smsModel from '../models/smsModel.js';
import { query } from '../config/database.js';
import { getActiveSessions } from '../utils/voiceAgentSession.js';

// Escape XML special characters to prevent XML injection in TwiML
const xmlEscape = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const auth = async (brandId, userId, res) => {
  const m = await brandModel.getBrandMember(brandId, userId);
  if (!m) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return null; }
  return m;
};

// ── CRUD: Voice Agents ─────────────────────────────────────────────────────

export const listAgents = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    const result = await query(
      `SELECT * FROM voice_agents WHERE brand_id = $1 ORDER BY created_at DESC`,
      [brandId]
    );
    res.json({ status: 'success', data: { agents: result.rows } });
  } catch (e) { next(e); }
};

export const getAgent = async (req, res, next) => {
  try {
    const { brandId, agentId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    const result = await query(
      `SELECT * FROM voice_agents WHERE id = $1 AND brand_id = $2`,
      [agentId, brandId]
    );
    if (!result.rows[0]) return res.status(404).json({ status: 'fail', message: 'Agent not found' });
    res.json({ status: 'success', data: { agent: result.rows[0] } });
  } catch (e) { next(e); }
};

export const createAgent = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    const {
      name, personality, greeting, voice, model, language,
      tools_config, knowledge_base, transfer_phone, max_duration_seconds, phone_number,
    } = req.body;

    if (!name) return res.status(400).json({ status: 'fail', message: 'Name is required' });

    const result = await query(
      `INSERT INTO voice_agents (brand_id, name, personality, greeting, voice, model, language,
        tools_config, knowledge_base, transfer_phone, max_duration_seconds, phone_number, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        brandId, name,
        personality || 'You are a friendly and professional AI assistant.',
        greeting || 'Hello! How can I help you today?',
        voice || 'alloy', model || 'gpt-4o-realtime-preview', language || 'en',
        JSON.stringify(tools_config || []),
        JSON.stringify(knowledge_base || []),
        transfer_phone || null,
        max_duration_seconds || 600,
        phone_number || null,
        req.user.id,
      ]
    );

    res.status(201).json({ status: 'success', data: { agent: result.rows[0] } });
  } catch (e) { next(e); }
};

export const updateAgent = async (req, res, next) => {
  try {
    const { brandId, agentId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    const fields = ['name', 'personality', 'greeting', 'voice', 'model', 'language',
      'tools_config', 'knowledge_base', 'transfer_phone', 'max_duration_seconds',
      'phone_number', 'is_active'];

    const sets = [];
    const vals = [];
    let idx = 1;

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        const val = (f === 'tools_config' || f === 'knowledge_base')
          ? JSON.stringify(req.body[f])
          : req.body[f];
        sets.push(`${f} = $${idx++}`);
        vals.push(val);
      }
    }

    if (sets.length === 0) return res.status(400).json({ status: 'fail', message: 'No fields to update' });

    sets.push(`updated_at = NOW()`);
    vals.push(agentId, brandId);

    const result = await query(
      `UPDATE voice_agents SET ${sets.join(', ')} WHERE id = $${idx++} AND brand_id = $${idx} RETURNING *`,
      vals
    );

    if (!result.rows[0]) return res.status(404).json({ status: 'fail', message: 'Agent not found' });
    res.json({ status: 'success', data: { agent: result.rows[0] } });
  } catch (e) { next(e); }
};

export const deleteAgent = async (req, res, next) => {
  try {
    const { brandId, agentId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    await query(`DELETE FROM voice_agents WHERE id = $1 AND brand_id = $2`, [agentId, brandId]);
    res.json({ status: 'success', message: 'Agent deleted' });
  } catch (e) { next(e); }
};

// ── Call History ────────────────────────────────────────────────────────────

export const listCalls = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    const { agent_id, page = 1, limit = 25 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'vac.brand_id = $1';
    const params = [brandId];

    if (agent_id) {
      params.push(agent_id);
      where += ` AND vac.voice_agent_id = $${params.length}`;
    }

    const result = await query(
      `SELECT vac.*, va.name as agent_name
       FROM voice_agent_calls vac
       LEFT JOIN voice_agents va ON va.id = vac.voice_agent_id
       WHERE ${where}
       ORDER BY vac.started_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM voice_agent_calls vac WHERE ${where}`,
      params
    );

    res.json({
      status: 'success',
      data: {
        calls: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (e) { next(e); }
};

export const getCall = async (req, res, next) => {
  try {
    const { brandId, callId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    const result = await query(
      `SELECT vac.*, va.name as agent_name
       FROM voice_agent_calls vac
       LEFT JOIN voice_agents va ON va.id = vac.voice_agent_id
       WHERE vac.id = $1 AND vac.brand_id = $2`,
      [callId, brandId]
    );

    if (!result.rows[0]) return res.status(404).json({ status: 'fail', message: 'Call not found' });
    res.json({ status: 'success', data: { call: result.rows[0] } });
  } catch (e) { next(e); }
};

// ── Live Calls ─────────────────────────────────────────────────────────────

export const getActiveCalls = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    const sessions = getActiveSessions();
    const brandCalls = [];

    for (const [callSid, session] of sessions) {
      if (session.brandId === brandId) {
        brandCalls.push({
          callSid,
          agentName: session.agentConfig.name,
          callerPhone: session.callerPhone,
          duration: Math.round((Date.now() - session.startedAt.getTime()) / 1000),
          transcriptLength: session.transcript.length,
          actionsTaken: session.actionsTaken.length,
        });
      }
    }

    res.json({ status: 'success', data: { activeCalls: brandCalls } });
  } catch (e) { next(e); }
};

// ── Twilio Incoming Call Webhook ────────────────────────────────────────────

export const handleIncomingCall = async (req, res) => {
  try {
    const { To, From, CallSid } = req.body;
    console.log(`[VoiceAgent] Incoming call: ${From} → ${To}, SID: ${CallSid}`);

    // Find a voice agent configured for this phone number
    const agentResult = await query(
      `SELECT va.*, tc.account_sid, tc.auth_token
       FROM voice_agents va
       JOIN twilio_connections tc ON tc.brand_id = va.brand_id AND tc.is_active = TRUE
       WHERE va.phone_number = $1 AND va.is_active = TRUE
       LIMIT 1`,
      [To]
    );

    const agent = agentResult.rows[0];

    if (!agent) {
      res.type('text/xml').send(
        `<Response><Say>Sorry, this number is not currently accepting calls. Please try again later.</Say></Response>`
      );
      return;
    }

    // Respond with TwiML to start a Media Stream (OpenAI Realtime API)
    const wsUrl = `wss://${req.get('host')}/voice-agent-stream`;

    res.type('text/xml').send(
      `<Response>
        <Connect>
          <Stream url="${xmlEscape(wsUrl)}">
            <Parameter name="agentId" value="${xmlEscape(agent.id)}" />
            <Parameter name="brandId" value="${xmlEscape(agent.brand_id)}" />
            <Parameter name="callSid" value="${xmlEscape(CallSid)}" />
            <Parameter name="callerPhone" value="${xmlEscape(From)}" />
          </Stream>
        </Connect>
      </Response>`
    );
  } catch (err) {
    console.error('[VoiceAgent] Error handling incoming call:', err.message);
    res.type('text/xml').send(
      `<Response><Say>We're experiencing technical difficulties. Please try again later.</Say></Response>`
    );
  }
};

// ── Outbound AI Call ────────────────────────────────────────────────────────

export const initiateOutboundCall = async (req, res, next) => {
  try {
    const { brandId, agentId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    const { to } = req.body;
    if (!to) return res.status(400).json({ status: 'fail', message: 'Phone number (to) is required' });

    // Get agent and Twilio credentials
    const agentResult = await query(
      `SELECT * FROM voice_agents WHERE id = $1 AND brand_id = $2 AND is_active = TRUE`,
      [agentId, brandId]
    );
    if (!agentResult.rows[0]) return res.status(404).json({ status: 'fail', message: 'Agent not found or inactive' });

    const conn = await smsModel.getTwilioConnection(brandId);
    if (!conn) return res.status(400).json({ status: 'fail', message: 'Twilio not configured' });

    const { default: twilio } = await import('twilio');
    const client = twilio(conn.account_sid, conn.auth_token);

    const baseUrl = process.env.APP_URL || process.env.BACKEND_URL || `https://${req.get('host')}`;
    const twimlUrl = `${baseUrl}/api/voice-agents/outbound-twiml/${agentId}/${brandId}`;

    const call = await client.calls.create({
      from: agentResult.rows[0].phone_number || conn.phone_number,
      to,
      url: twimlUrl,
      method: 'POST',
    });

    // Create call record
    await query(
      `INSERT INTO voice_agent_calls (voice_agent_id, brand_id, caller_phone, direction, twilio_call_sid, status, started_at)
       VALUES ($1, $2, $3, 'outbound', $4, 'in_progress', NOW())`,
      [agentId, brandId, to, call.sid]
    );

    res.status(201).json({ status: 'success', data: { callSid: call.sid } });
  } catch (e) { next(e); }
};

export const outboundTwiml = async (req, res) => {
  try {
    const { agentId, brandId } = req.params;
    const wsUrl = `wss://${req.get('host')}/voice-agent-stream`;

    res.type('text/xml').send(
      `<Response>
        <Connect>
          <Stream url="${xmlEscape(wsUrl)}">
            <Parameter name="agentId" value="${xmlEscape(agentId)}" />
            <Parameter name="brandId" value="${xmlEscape(brandId)}" />
            <Parameter name="callSid" value="${xmlEscape(req.body?.CallSid || '')}" />
            <Parameter name="callerPhone" value="${xmlEscape(req.body?.To || '')}" />
          </Stream>
        </Connect>
      </Response>`
    );
  } catch (err) {
    console.error('[VoiceAgent] Outbound TwiML error:', err.message);
    res.type('text/xml').send(`<Response><Say>Error starting voice agent.</Say></Response>`);
  }
};

// ── Dashboard Stats ────────────────────────────────────────────────────────

export const getStats = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    const stats = await query(
      `SELECT
        COUNT(*) as total_calls,
        COALESCE(SUM(duration_seconds), 0) as total_duration,
        ROUND(AVG(duration_seconds)) as avg_duration,
        COUNT(*) FILTER (WHERE sentiment = 'positive') as positive_calls,
        COUNT(*) FILTER (WHERE sentiment = 'negative') as negative_calls,
        COUNT(*) FILTER (WHERE lead_captured IS NOT NULL) as leads_captured,
        COUNT(*) FILTER (WHERE transferred = TRUE) as calls_transferred,
        COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours') as calls_today,
        COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '7 days') as calls_this_week
       FROM voice_agent_calls WHERE brand_id = $1`,
      [brandId]
    );

    res.json({ status: 'success', data: { stats: stats.rows[0] } });
  } catch (e) { next(e); }
};
