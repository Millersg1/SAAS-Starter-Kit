/**
 * WebSocket upgrade handler for Twilio Media Streams → Voice Agent sessions.
 *
 * Twilio connects to wss://<host>/voice-agent-stream after receiving TwiML
 * with a <Connect><Stream> directive. We intercept the HTTP upgrade on that
 * path and hand the socket to voiceAgentSession.handleMediaStream().
 */

import { WebSocketServer } from 'ws';
import { query } from '../config/database.js';
import { handleMediaStream } from './voiceAgentSession.js';

export function setupVoiceAgentWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname !== '/voice-agent-stream') return; // let other upgrades pass through

    wss.handleUpgrade(request, socket, head, (ws) => {
      console.log('[VoiceAgentWS] New Twilio Media Stream connection');

      // Twilio sends a "start" event with custom parameters — we wait for it
      let initialized = false;

      ws.on('message', async (data) => {
        if (initialized) return; // after init, voiceAgentSession handles messages

        try {
          const msg = JSON.parse(data);

          if (msg.event === 'connected') {
            console.log('[VoiceAgentWS] Twilio connected event received');
            return;
          }

          if (msg.event === 'start') {
            initialized = true;
            const params = msg.start.customParameters || {};
            const { agentId, brandId, callSid, callerPhone } = params;

            if (!agentId || !brandId) {
              console.error('[VoiceAgentWS] Missing agentId or brandId in stream parameters');
              ws.close();
              return;
            }

            // Load agent config from DB
            const result = await query(
              `SELECT * FROM voice_agents WHERE id = $1 AND brand_id = $2 AND is_active = TRUE`,
              [agentId, brandId]
            );
            const agent = result.rows[0];

            if (!agent) {
              console.error(`[VoiceAgentWS] Agent ${agentId} not found or inactive`);
              ws.close();
              return;
            }

            const streamSid = msg.start.streamSid;
            console.log(`[VoiceAgentWS] Starting session: agent="${agent.name}", caller=${callerPhone}, callSid=${callSid}, streamSid=${streamSid}`);

            // Hand off to the session manager with streamSid
            handleMediaStream(ws, agent, callSid || msg.start.callSid, callerPhone, brandId, streamSid);
          }
        } catch (err) {
          console.error('[VoiceAgentWS] Error in init handler:', err.message);
        }
      });
    });
  });

  console.log('🎙️  Voice Agent WebSocket handler ready on /voice-agent-stream');
}
