/**
 * Voice Agent Session — bridges Twilio Media Streams ↔ OpenAI Realtime API
 *
 * Flow:
 * 1. Inbound call → Twilio webhook → TwiML connects Media Stream to our WS server
 * 2. Our WS server connects to OpenAI Realtime API
 * 3. Audio flows bidirectionally: caller ↔ Twilio ↔ our server ↔ OpenAI
 * 4. OpenAI can call tools (book appointment, capture lead, transfer, etc.)
 * 5. On hangup we generate a summary and save the transcript
 */

import WebSocket from 'ws';
import { query } from '../config/database.js';

// Active sessions: callSid → session object
const activeSessions = new Map();

export function getActiveSessions() {
  return activeSessions;
}

/**
 * Handle an incoming Twilio Media Stream WebSocket connection
 */
export function handleMediaStream(ws, agentConfig, callSid, callerPhone, brandId, streamSid) {
  const session = {
    callSid,
    agentConfig,
    brandId,
    callerPhone,
    openaiWs: null,
    streamSid: streamSid || null,
    transcript: [],
    actionsTaken: [],
    startedAt: new Date(),
    callId: null,
  };

  console.log(`[VoiceAgent] Session initialized with streamSid=${session.streamSid}`);

  activeSessions.set(callSid, session);

  // Create the voice_agent_calls record
  createCallRecord(session).catch(err => console.error('[VoiceAgent] Failed to create call record:', err.message));

  // Connect to OpenAI Realtime API
  connectToOpenAI(session, ws);

  // Handle messages from Twilio
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      switch (msg.event) {
        case 'start':
          session.streamSid = msg.start.streamSid;
          console.log(`[VoiceAgent] Stream started: ${session.streamSid} for call ${callSid}`);
          break;

        case 'media':
          // Forward audio to OpenAI
          if (session.openaiWs?.readyState === WebSocket.OPEN) {
            session.openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: msg.media.payload, // base64 mulaw audio
            }));
          }
          break;

        case 'stop':
          console.log(`[VoiceAgent] Stream stopped for call ${callSid}`);
          endSession(session);
          break;
      }
    } catch (err) {
      console.error('[VoiceAgent] Error processing Twilio message:', err.message);
    }
  });

  ws.on('close', () => {
    console.log(`[VoiceAgent] Twilio WS closed for call ${callSid}`);
    endSession(session);
  });

  ws.on('error', (err) => {
    console.error(`[VoiceAgent] Twilio WS error for call ${callSid}:`, err.message);
    endSession(session);
  });
}

function connectToOpenAI(session, twilioWs) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('[VoiceAgent] OPENAI_API_KEY not set — cannot start voice agent session');
    twilioWs.close();
    return;
  }

  const model = session.agentConfig.model || 'gpt-4o-realtime-preview';
  const url = `wss://api.openai.com/v1/realtime?model=${model}`;

  const openaiWs = new WebSocket(url, {
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  session.openaiWs = openaiWs;

  openaiWs.on('open', () => {
    console.log(`[VoiceAgent] OpenAI Realtime connected for call ${session.callSid}`);
    configureSession(session);
  });

  openaiWs.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString());
      handleOpenAIEvent(event, session, twilioWs);
    } catch (err) {
      console.error('[VoiceAgent] Error parsing OpenAI message:', err.message);
    }
  });

  openaiWs.on('close', () => {
    console.log(`[VoiceAgent] OpenAI WS closed for call ${session.callSid}`);
  });

  openaiWs.on('error', (err) => {
    console.error(`[VoiceAgent] OpenAI WS error:`, err.message);
  });
}

function configureSession(session) {
  const { agentConfig } = session;

  // Build system instructions from agent config
  const systemInstructions = buildSystemPrompt(agentConfig);

  // Build tools the agent can use
  const tools = buildTools(agentConfig);

  console.log(`[VoiceAgent] Configuring session with ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);

  // Configure the OpenAI session
  session.openaiWs.send(JSON.stringify({
    type: 'session.update',
    session: {
      modalities: ['text', 'audio'],
      instructions: systemInstructions,
      voice: agentConfig.voice || 'alloy',
      input_audio_format: 'g711_ulaw',
      output_audio_format: 'g711_ulaw',
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
      tool_choice: 'auto',
      tools,
    },
  }));

  // Send initial greeting — trigger a response directly
  const greeting = agentConfig.greeting || 'Hello! How can I help you today?';
  session.openaiWs.send(JSON.stringify({
    type: 'response.create',
    response: {
      modalities: ['text', 'audio'],
      instructions: `Say exactly this greeting to the caller: "${greeting}"`,
    },
  }));
}

function buildSystemPrompt(agentConfig) {
  let prompt = agentConfig.personality || 'You are a friendly and professional AI phone assistant.';

  prompt += '\n\nIMPORTANT RULES:\n';
  prompt += '- ALWAYS speak in English. Never switch to another language, even if the caller speaks a different language. Respond in English only.\n';
  prompt += '- You are on a live phone call. Keep responses concise and conversational.\n';
  prompt += '- Never use markdown, bullet points, or formatting — you are speaking aloud.\n';
  prompt += '- If the caller asks something you cannot help with, offer to transfer them to a human.\n';
  prompt += '- Be warm, empathetic, and professional at all times.\n';
  prompt += '\nCRITICAL — LEAD CAPTURE:\n';
  prompt += '- As SOON as the caller gives you their name, email, or phone number, IMMEDIATELY call the capture_lead tool. Do NOT wait until the end of the call.\n';
  prompt += '- If they give you their name first, call capture_lead with just the name. Update it again when you get email or phone.\n';
  prompt += '- If they want to schedule a meeting or appointment, call book_appointment immediately after getting the details.\n';
  prompt += '- ALWAYS use the tools — never just acknowledge information without saving it.\n';

  // Add knowledge base as context
  if (agentConfig.knowledge_base?.length > 0) {
    prompt += '\nKNOWLEDGE BASE — use this to answer questions:\n';
    for (const item of agentConfig.knowledge_base) {
      prompt += `Q: ${item.question}\nA: ${item.answer}\n\n`;
    }
  }

  if (agentConfig.transfer_phone) {
    prompt += `\nIf the caller needs to speak with a human, use the transfer_call tool to transfer them to ${agentConfig.transfer_phone}.\n`;
  }

  return prompt;
}

function buildTools(agentConfig) {
  const tools = [];

  // Default tools available to every agent
  tools.push({
    type: 'function',
    name: 'capture_lead',
    description: 'REQUIRED: You MUST call this function the moment a caller tells you their name, email, or phone number. Call it multiple times if they give info at different points. Never skip this.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Caller full name' },
        email: { type: 'string', description: 'Caller email address' },
        phone: { type: 'string', description: 'Caller phone number' },
        interest: { type: 'string', description: 'What the caller is interested in' },
        notes: { type: 'string', description: 'Any additional notes about the lead' },
      },
      required: ['name'],
    },
  });

  tools.push({
    type: 'function',
    name: 'book_appointment',
    description: 'REQUIRED: You MUST call this function when a caller wants to schedule a meeting, appointment, callback, or consultation. Call it as soon as they agree to schedule.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Caller name' },
        email: { type: 'string', description: 'Caller email' },
        preferred_date: { type: 'string', description: 'Preferred date (e.g. "tomorrow", "next Monday")' },
        preferred_time: { type: 'string', description: 'Preferred time (e.g. "2pm", "morning")' },
        reason: { type: 'string', description: 'Reason for appointment' },
      },
      required: ['name', 'reason'],
    },
  });

  tools.push({
    type: 'function',
    name: 'end_call',
    description: 'End the call politely. Use when the conversation has naturally concluded.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Why the call is ending (e.g. "caller satisfied", "information provided")' },
      },
      required: ['reason'],
    },
  });

  if (agentConfig.transfer_phone) {
    tools.push({
      type: 'function',
      name: 'transfer_call',
      description: 'Transfer the call to a human agent. Use when the caller needs human assistance.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why the call is being transferred' },
        },
        required: ['reason'],
      },
    });
  }

  // Add any custom tools from agent config
  if (agentConfig.tools_config?.length > 0) {
    for (const tool of agentConfig.tools_config) {
      if (tool.name && tool.description && tool.parameters) {
        tools.push({ type: 'function', ...tool });
      }
    }
  }

  return tools;
}

function handleOpenAIEvent(event, session, twilioWs) {
  switch (event.type) {
    case 'session.created':
      console.log(`[VoiceAgent] Session created for call ${session.callSid}`);
      break;

    case 'session.updated':
      console.log(`[VoiceAgent] Session configured for call ${session.callSid}`);
      break;

    case 'response.audio.delta':
      // Send audio back to Twilio
      if (twilioWs.readyState === WebSocket.OPEN && session.streamSid) {
        twilioWs.send(JSON.stringify({
          event: 'media',
          streamSid: session.streamSid,
          media: { payload: event.delta },
        }));
      } else {
        if (!session._audioWarnLogged) {
          console.warn(`[VoiceAgent] Cannot send audio: twilioWs=${twilioWs.readyState}, streamSid=${session.streamSid || 'NOT SET'}`);
          session._audioWarnLogged = true;
        }
      }
      break;

    case 'response.audio_transcript.done':
      console.log(`[VoiceAgent] Surf said: "${event.transcript}" (call ${session.callSid})`);
      session.transcript.push({
        role: 'assistant',
        text: event.transcript,
        timestamp: new Date().toISOString(),
      });
      break;

    case 'conversation.item.input_audio_transcription.completed':
      console.log(`[VoiceAgent] Caller said: "${event.transcript}" (call ${session.callSid})`);
      session.transcript.push({
        role: 'user',
        text: event.transcript,
        timestamp: new Date().toISOString(),
      });
      break;

    case 'response.done':
      console.log(`[VoiceAgent] Response complete for call ${session.callSid}`);
      break;

    case 'input_audio_buffer.speech_started':
      console.log(`[VoiceAgent] Caller started speaking (call ${session.callSid})`);
      break;

    case 'response.function_call_arguments.done':
      console.log(`[VoiceAgent] TOOL CALL: ${event.name}(${event.arguments}) call_id=${event.call_id}`);
      handleToolCall(event, session, twilioWs);
      break;

    case 'response.output_item.added':
      if (event.item?.type === 'function_call') {
        console.log(`[VoiceAgent] Function call queued: ${event.item.name}`);
      }
      break;

    case 'error':
      console.error('[VoiceAgent] OpenAI error:', event.error);
      break;

    default:
      // Log unknown events for debugging
      if (!event.type?.startsWith('response.audio.') && !event.type?.startsWith('input_audio_buffer')) {
        console.log(`[VoiceAgent] Event: ${event.type}`);
      }
  }
}

async function handleToolCall(event, session, twilioWs) {
  const { name, arguments: argsStr, call_id } = event;
  let args = {};
  try { args = JSON.parse(argsStr); } catch { args = {}; }

  console.log(`[VoiceAgent] Tool call: ${name}`, args);

  let result = '';

  switch (name) {
    case 'capture_lead':
      result = await handleCaptureLead(session, args);
      break;

    case 'book_appointment':
      result = await handleBookAppointment(session, args);
      break;

    case 'transfer_call':
      result = await handleTransferCall(session, twilioWs, args);
      break;

    case 'end_call':
      result = `Call ending: ${args.reason}`;
      session.actionsTaken.push({ tool: 'end_call', args, timestamp: new Date().toISOString() });
      // Let OpenAI say goodbye, then we'll close after a short delay
      setTimeout(() => endSession(session), 5000);
      break;

    default:
      result = `Tool ${name} executed with args: ${JSON.stringify(args)}`;
      session.actionsTaken.push({ tool: name, args, timestamp: new Date().toISOString() });
  }

  // Send function result back to OpenAI
  if (session.openaiWs?.readyState === WebSocket.OPEN) {
    session.openaiWs.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id,
        output: result,
      },
    }));

    // Trigger a response after tool result
    session.openaiWs.send(JSON.stringify({ type: 'response.create' }));
  }
}

async function handleCaptureLead(session, args) {
  try {
    // Check if client already exists by email or phone
    let result;
    if (args.email) {
      result = await query(
        `SELECT id FROM clients WHERE brand_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`,
        [session.brandId, args.email]
      );
    }
    if (!result?.rows?.[0] && (args.phone || session.callerPhone)) {
      result = await query(
        `SELECT id FROM clients WHERE brand_id = $1 AND phone = $2 LIMIT 1`,
        [session.brandId, args.phone || session.callerPhone]
      );
    }

    if (result?.rows?.[0]) {
      // Update existing client
      const updates = [];
      const vals = [];
      let idx = 1;
      if (args.name) { updates.push(`name = $${idx++}`); vals.push(args.name); }
      if (args.email) { updates.push(`email = $${idx++}`); vals.push(args.email); }
      if (args.phone || session.callerPhone) { updates.push(`phone = COALESCE($${idx++}, phone)`); vals.push(args.phone || session.callerPhone); }
      if (updates.length > 0) {
        vals.push(result.rows[0].id);
        await query(`UPDATE clients SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, vals);
      }
      result = { rows: [{ id: result.rows[0].id }] };
    } else {
      // Get a user ID for created_by (brand owner)
      const ownerRes = await query(
        `SELECT user_id FROM brand_members WHERE brand_id = $1 AND role = 'owner' LIMIT 1`,
        [session.brandId]
      );
      const ownerId = ownerRes.rows[0]?.user_id || null;

      // Insert new lead
      result = await query(
        `INSERT INTO clients (brand_id, name, email, phone, status, notes, created_by)
         VALUES ($1, $2, $3, $4, 'pending', $5, $6)
         RETURNING id`,
        [session.brandId, args.name || 'Unknown Caller', args.email || null, args.phone || session.callerPhone, args.notes || args.interest || 'Captured by Surf Voice', ownerId]
      );
    }

    const leadId = result.rows[0]?.id;
    session.actionsTaken.push({ tool: 'capture_lead', args, leadId, timestamp: new Date().toISOString() });

    // Update the call record with lead data
    if (session.callId) {
      await query(
        `UPDATE voice_agent_calls SET lead_captured = $1 WHERE id = $2`,
        [JSON.stringify({ ...args, client_id: leadId }), session.callId]
      );
    }

    return `Lead captured successfully: ${args.name}${args.email ? ` (${args.email})` : ''}. They are now in the system.`;
  } catch (err) {
    console.error('[VoiceAgent] Error capturing lead:', err.message);
    return 'I\'ve noted down their information. Our team will follow up.';
  }
}

async function handleBookAppointment(session, args) {
  try {
    // Create a calendar event for the appointment
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1); // Default to tomorrow if we can't parse
    startTime.setHours(10, 0, 0, 0);

    await query(
      `INSERT INTO calendar_events (brand_id, title, description, start_time, end_time, event_type, created_at)
       VALUES ($1, $2, $3, $4, $5, 'meeting', NOW())`,
      [
        session.brandId,
        `Voice Agent Booking: ${args.name}`,
        `Reason: ${args.reason}\nPreferred: ${args.preferred_date || 'TBD'} ${args.preferred_time || 'TBD'}\nPhone: ${session.callerPhone}`,
        startTime,
        new Date(startTime.getTime() + 30 * 60000),
      ]
    );

    session.actionsTaken.push({ tool: 'book_appointment', args, timestamp: new Date().toISOString() });
    return `Appointment request noted for ${args.name}. Our team will confirm the exact time. Preferred: ${args.preferred_date || 'soon'} ${args.preferred_time || ''}.`;
  } catch (err) {
    console.error('[VoiceAgent] Error booking appointment:', err.message);
    return 'I\'ve noted the appointment request. Our team will reach out to confirm.';
  }
}

async function handleTransferCall(session, twilioWs, args) {
  const transferTo = session.agentConfig.transfer_phone;
  if (!transferTo) return 'No transfer number configured. I\'ll take a message instead.';

  session.actionsTaken.push({ tool: 'transfer_call', args, transferTo, timestamp: new Date().toISOString() });

  // Update call record
  if (session.callId) {
    await query(`UPDATE voice_agent_calls SET transferred = TRUE WHERE id = $1`, [session.callId]).catch(() => {});
  }

  // We can't directly transfer via Media Streams, but we can use Twilio's REST API
  // For now, we end the stream and the TwiML fallback <Dial> will handle it
  try {
    const connResult = await query(
      `SELECT account_sid, auth_token FROM twilio_connections WHERE brand_id = $1 AND is_active = TRUE LIMIT 1`,
      [session.brandId]
    );
    const conn = connResult.rows[0];
    if (conn) {
      const { default: twilio } = await import('twilio');
      const client = twilio(conn.account_sid, conn.auth_token);
      await client.calls(session.callSid).update({
        twiml: `<Response><Say>I'm transferring you now. Please hold.</Say><Dial>${transferTo}</Dial></Response>`,
      });
    }
  } catch (err) {
    console.error('[VoiceAgent] Transfer error:', err.message);
  }

  return `Transferring call to ${transferTo}: ${args.reason}`;
}

async function createCallRecord(session) {
  try {
    const result = await query(
      `INSERT INTO voice_agent_calls (voice_agent_id, brand_id, caller_phone, direction, twilio_call_sid, status, started_at)
       VALUES ($1, $2, $3, 'inbound', $4, 'in_progress', NOW()) RETURNING id`,
      [session.agentConfig.id, session.brandId, session.callerPhone, session.callSid]
    );
    session.callId = result.rows[0].id;
  } catch (err) {
    console.error('[VoiceAgent] Error creating call record:', err.message);
  }
}

async function endSession(session) {
  if (session._ended) return;
  session._ended = true;

  const duration = Math.round((Date.now() - session.startedAt.getTime()) / 1000);

  // Close OpenAI connection
  if (session.openaiWs?.readyState === WebSocket.OPEN) {
    session.openaiWs.close();
  }

  // Generate summary AND extract lead info from transcript
  let summary = '';
  let sentiment = 'neutral';
  let extractedLead = null;
  if (session.transcript.length > 0) {
    try {
      const transcriptText = session.transcript.map(t => `${t.role}: ${t.text}`).join('\n');
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `Analyze this phone call transcript. Return JSON with:
1. "summary": 2-3 sentence summary
2. "sentiment": "positive", "neutral", or "negative"
3. "lead": Extract caller info if mentioned. Object with "name", "email", "phone", "interest", "appointment_date", "appointment_time". Use null for any field not mentioned. For email, reconstruct the full address even if spelled out.

IMPORTANT: Look carefully for names, email addresses (even if spelled out like "F H M 44114 at gmail dot com" = "fhm44114@gmail.com"), and phone numbers.` },
          { role: 'user', content: transcriptText },
        ],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(completion.choices[0].message.content);
      summary = parsed.summary || '';
      sentiment = parsed.sentiment || 'neutral';
      extractedLead = parsed.lead || null;
    } catch (err) {
      console.error('[VoiceAgent] Error generating summary:', err.message);
      summary = `Call with ${session.callerPhone}, ${session.transcript.length} exchanges, ${duration}s duration.`;
    }
  }

  // Auto-save extracted lead to CRM if the tool didn't already capture it
  if (extractedLead?.name && !session.actionsTaken.find(a => a.tool === 'capture_lead')) {
    try {
      console.log(`[VoiceAgent] Auto-extracting lead from transcript: ${JSON.stringify(extractedLead)}`);
      const ownerRes = await query(
        `SELECT user_id FROM brand_members WHERE brand_id = $1 AND role = 'owner' LIMIT 1`,
        [session.brandId]
      );
      const ownerId = ownerRes.rows[0]?.user_id || null;

      // Check if client already exists
      let existingId = null;
      if (extractedLead.email) {
        const ex = await query(`SELECT id FROM clients WHERE brand_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`, [session.brandId, extractedLead.email]);
        existingId = ex.rows[0]?.id;
      }
      if (!existingId && session.callerPhone) {
        const ex = await query(`SELECT id FROM clients WHERE brand_id = $1 AND phone = $2 LIMIT 1`, [session.brandId, session.callerPhone]);
        existingId = ex.rows[0]?.id;
      }

      if (existingId) {
        await query(
          `UPDATE clients SET name = COALESCE($1, name), email = COALESCE($2, email), phone = COALESCE($3, phone), updated_at = NOW() WHERE id = $4`,
          [extractedLead.name, extractedLead.email, extractedLead.phone || session.callerPhone, existingId]
        );
        console.log(`[VoiceAgent] Updated existing client ${existingId} with voice lead data`);
      } else if (ownerId) {
        const ins = await query(
          `INSERT INTO clients (brand_id, name, email, phone, status, notes, created_by)
           VALUES ($1, $2, $3, $4, 'lead', $5, $6) RETURNING id`,
          [session.brandId, extractedLead.name, extractedLead.email, extractedLead.phone || session.callerPhone, `Surf Voice: ${extractedLead.interest || 'General inquiry'}`, ownerId]
        );
        console.log(`[VoiceAgent] Created new lead ${ins.rows[0].id} from voice transcript`);
      }

      session.actionsTaken.push({ tool: 'auto_extract_lead', data: extractedLead, timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('[VoiceAgent] Error auto-saving lead:', err.message);
    }
  }

  // Update the call record
  if (session.callId) {
    try {
      await query(
        `UPDATE voice_agent_calls SET
          status = 'completed', transcript = $1, summary = $2, sentiment = $3,
          actions_taken = $4, duration_seconds = $5, ended_at = NOW(),
          ended_reason = $6
         WHERE id = $7`,
        [
          JSON.stringify(session.transcript),
          summary,
          sentiment,
          JSON.stringify(session.actionsTaken),
          duration,
          session.actionsTaken.find(a => a.tool === 'end_call')?.args?.reason || 'caller_hangup',
          session.callId,
        ]
      );

      // Update agent stats
      await query(
        `UPDATE voice_agents SET total_calls = total_calls + 1, total_duration_seconds = total_duration_seconds + $1, updated_at = NOW() WHERE id = $2`,
        [duration, session.agentConfig.id]
      );
    } catch (err) {
      console.error('[VoiceAgent] Error updating call record:', err.message);
    }
  }

  activeSessions.delete(session.callSid);
  console.log(`[VoiceAgent] Session ended for call ${session.callSid} — ${duration}s, ${session.transcript.length} exchanges`);
}
