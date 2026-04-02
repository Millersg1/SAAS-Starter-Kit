import { query } from '../config/database.js';
import logger from './logger.js';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || 'agent_2601kn2fr76jfrcvzf821fj9dnsx';
const BRAND_ID = process.env.DEFAULT_BRAND_ID || 'cc3dd16b-5cf8-45d2-97d4-9e2a5ea87659';

async function getOwnerUserId() {
  const res = await query(`SELECT user_id FROM brand_members WHERE brand_id = $1 AND role = 'owner' LIMIT 1`, [BRAND_ID]);
  return res.rows[0]?.user_id || null;
}

async function syncConversations() {
  if (!API_KEY) return;

  try {
    const headers = { 'xi-api-key': API_KEY };

    // Get recent conversations
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations?agent_id=${AGENT_ID}&page_size=10`, { headers });
    if (!res.ok) return;

    const data = await res.json();
    const conversations = data.conversations || [];

    for (const conv of conversations) {
      // Check if we already synced this conversation
      const existing = await query(
        `SELECT id FROM voice_agent_calls WHERE twilio_call_sid = $1`,
        [conv.conversation_id]
      );
      if (existing.rows.length > 0) continue;

      // Get full conversation detail
      const detailRes = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conv.conversation_id}`, { headers });
      if (!detailRes.ok) continue;
      const detail = await detailRes.json();

      const collected = detail.analysis?.data_collection_results || {};
      const callerName = collected.caller_name?.value;
      const callerEmail = collected.caller_email?.value;
      const callerPhone = collected.caller_phone?.value;
      const painPoint = collected.primary_pain_point?.value;
      const nextStep = collected.next_step_agreed?.value;
      const duration = detail.metadata?.call_duration_secs || conv.call_duration_secs || 0;

      // Build transcript
      const transcript = (detail.transcript || []).map(t => ({
        role: t.role === 'agent' ? 'assistant' : 'user',
        text: t.message || '',
        timestamp: t.time_in_call_secs ? new Date(Date.now() - (duration - t.time_in_call_secs) * 1000).toISOString() : null,
      }));

      // Get voice agent ID
      const agentRes = await query(`SELECT id FROM voice_agents WHERE brand_id = $1 LIMIT 1`, [BRAND_ID]);
      const voiceAgentId = agentRes.rows[0]?.id;

      if (voiceAgentId) {
        // Save call record
        const durationInt = parseInt(duration) || 0;
        const startedAt = new Date(Date.now() - durationInt * 1000);
        await query(
          `INSERT INTO voice_agent_calls (voice_agent_id, brand_id, caller_phone, direction, twilio_call_sid, status, transcript, summary, sentiment, duration_seconds, started_at, ended_at)
           VALUES ($1, $2, $3, 'inbound', $4, 'completed', $5, $6, $7, $8, $9, NOW())`,
          [
            voiceAgentId, BRAND_ID, callerPhone || null,
            conv.conversation_id,
            JSON.stringify(transcript),
            detail.analysis?.transcript_summary || `Call with ${callerName || 'unknown'}: ${painPoint || 'general inquiry'}`,
            'positive',
            durationInt,
            startedAt,
          ]
        );
        logger.info({ convId: conv.conversation_id }, '[ElevenLabs Sync] Call record saved');
      }

      // Save lead to CRM if we got a name
      if (callerName) {
        const ownerId = await getOwnerUserId();

        // Check existing
        let existingClientId = null;
        if (callerEmail) {
          const ex = await query(`SELECT id FROM clients WHERE brand_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`, [BRAND_ID, callerEmail]);
          existingClientId = ex.rows[0]?.id;
        }
        if (!existingClientId && callerPhone) {
          const ex = await query(`SELECT id FROM clients WHERE brand_id = $1 AND phone = $2 LIMIT 1`, [BRAND_ID, callerPhone]);
          existingClientId = ex.rows[0]?.id;
        }

        if (existingClientId) {
          await query(
            `UPDATE clients SET name = COALESCE($1, name), email = COALESCE($2, email), phone = COALESCE($3, phone), updated_at = NOW() WHERE id = $4`,
            [callerName, callerEmail, callerPhone, existingClientId]
          );
          logger.info({ clientId: existingClientId }, '[ElevenLabs Sync] Updated existing client');
        } else if (ownerId) {
          const ins = await query(
            `INSERT INTO clients (brand_id, name, email, phone, status, notes, created_by)
             VALUES ($1, $2, $3, $4, 'pending', $5, $6) RETURNING id`,
            [BRAND_ID, callerName, callerEmail || null, callerPhone || null, `Surf Voice: ${painPoint || 'General inquiry'}. Next step: ${nextStep || 'TBD'}`, ownerId]
          );
          logger.info({ clientId: ins.rows[0].id }, '[ElevenLabs Sync] New lead created');
        }
      }
    }
  } catch (err) {
    logger.error({ err: err.message }, '[ElevenLabs Sync] Error');
  }
}

export function startElevenLabsSyncCron() {
  if (!API_KEY) {
    console.log('[ElevenLabs Sync] No API key — skipping');
    return;
  }

  // Sync every 2 minutes
  setInterval(syncConversations, 2 * 60 * 1000);
  // First sync after 30 seconds
  setTimeout(syncConversations, 30000);
  console.log('📞 ElevenLabs conversation sync cron started (every 2 minutes)');
}
