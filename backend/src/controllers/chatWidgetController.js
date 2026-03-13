import Anthropic from '@anthropic-ai/sdk';
import { getBrandMember } from '../models/brandModel.js';
import { getBrandVoice } from '../models/brandModel.js';
import { query } from '../config/database.js';
import * as model from '../models/chatWidgetModel.js';

const API_URL = process.env.API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const checkAccess = async (brandId, userId) => {
  const member = await getBrandMember(brandId, userId);
  if (!member) throw { status: 403, message: 'Access denied' };
  return member;
};

// ── Public: Widget JS ────────────────────────────────────────────────────────

export const getWidgetScript = (req, res) => {
  const apiBase = `${API_URL}/api/chat-widget`;
  const script = `(function(){
'use strict';
var _ch = window._SaasSurfaceChat = window._SaasSurfaceChat || {};
if (_ch._loaded) return;
_ch._loaded = true;

// Find the script tag to read brandId
var scripts = document.querySelectorAll('script[data-brand-id]');
var brandId = scripts.length ? scripts[scripts.length-1].getAttribute('data-brand-id') : null;
if (!brandId) { console.warn('[SAAS Surface Chat] Missing data-brand-id attribute'); return; }

var API = '${apiBase}';
var sessionId = null;
var config = {};

// ── Inject styles ──────────────────────────────────────────────────────────
var style = document.createElement('style');
style.textContent = [
  '#ch-bubble{position:fixed;bottom:24px;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.18);z-index:999999;transition:transform .2s;border:none;font-size:24px;}',
  '#ch-bubble:hover{transform:scale(1.08);}',
  '#ch-panel{position:fixed;bottom:96px;width:340px;max-height:520px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.16);z-index:999999;display:flex;flex-direction:column;overflow:hidden;transition:opacity .2s,transform .2s;}',
  '#ch-panel.ch-hidden{opacity:0;transform:translateY(12px);pointer-events:none;}',
  '#ch-header{padding:14px 16px;color:#fff;display:flex;align-items:center;justify-content:space-between;font-family:sans-serif;}',
  '#ch-header h3{margin:0;font-size:14px;font-weight:600;}',
  '#ch-close{background:none;border:none;color:rgba(255,255,255,0.8);cursor:pointer;font-size:18px;line-height:1;padding:2px 4px;}',
  '#ch-close:hover{color:#fff;}',
  '#ch-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;font-family:sans-serif;min-height:200px;background:#f8fafc;}',
  '.ch-msg{max-width:82%;padding:9px 13px;border-radius:12px;font-size:13px;line-height:1.5;word-break:break-word;}',
  '.ch-msg.visitor{align-self:flex-end;border-bottom-right-radius:4px;color:#fff;}',
  '.ch-msg.assistant,.ch-msg.agent{align-self:flex-start;background:#fff;border:1px solid #e2e8f0;color:#1e293b;border-bottom-left-radius:4px;}',
  '.ch-typing{align-self:flex-start;background:#fff;border:1px solid #e2e8f0;color:#94a3b8;border-radius:12px;border-bottom-left-radius:4px;padding:9px 13px;font-size:13px;}',
  '#ch-info-form{padding:12px;font-family:sans-serif;background:#f8fafc;border-top:1px solid #e2e8f0;}',
  '#ch-info-form p{font-size:12px;color:#64748b;margin:0 0 8px;}',
  '#ch-info-form input{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;margin-bottom:6px;outline:none;}',
  '#ch-info-form input:focus{border-color:var(--ch-color,#2563eb);}',
  '#ch-info-btn{width:100%;padding:9px;border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;}',
  '#ch-input-row{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #e2e8f0;background:#fff;}',
  '#ch-input{flex:1;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none;font-family:sans-serif;}',
  '#ch-input:focus{border-color:var(--ch-color,#2563eb);}',
  '#ch-send{padding:9px 14px;border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;}',
  '#ch-send:disabled{opacity:.5;cursor:not-allowed;}',
].join('');
document.head.appendChild(style);

// ── Build DOM ──────────────────────────────────────────────────────────────
var bubble = document.createElement('button');
bubble.id = 'ch-bubble';
bubble.innerHTML = '💬';
bubble.style.right = '24px';
document.body.appendChild(bubble);

var panel = document.createElement('div');
panel.id = 'ch-panel';
panel.classList.add('ch-hidden');
panel.style.right = '24px';
panel.innerHTML = [
  '<div id="ch-header"><h3>Chat</h3><button id="ch-close">✕</button></div>',
  '<div id="ch-messages"></div>',
  '<div id="ch-info-form" style="display:none">',
    '<p>Before we chat, how should we reach you?</p>',
    '<input id="ch-name" type="text" placeholder="Your name"/>',
    '<input id="ch-email" type="email" placeholder="Email address"/>',
    '<button id="ch-info-btn">Start Chat</button>',
  '</div>',
  '<div id="ch-input-row">',
    '<input id="ch-input" type="text" placeholder="Type a message..." disabled/>',
    '<button id="ch-send" disabled>Send</button>',
  '</div>',
].join('');
document.body.appendChild(panel);

var msgs = panel.querySelector('#ch-messages');
var input = panel.querySelector('#ch-input');
var sendBtn = panel.querySelector('#ch-send');
var infoForm = panel.querySelector('#ch-info-form');
var infoBtn = panel.querySelector('#ch-info-btn');
var closeBtn = panel.querySelector('#ch-close');
var header = panel.querySelector('#ch-header h3');
var visitorInfoCollected = false;
var messageCount = 0;

function applyColor(color) {
  document.documentElement.style.setProperty('--ch-color', color);
  bubble.style.background = color;
  var sends = panel.querySelectorAll('#ch-send, #ch-info-btn');
  sends.forEach(function(b){ b.style.background = color; });
  header.parentElement.style.background = color;
}

function appendMessage(role, text) {
  var div = document.createElement('div');
  div.className = 'ch-msg ' + role;
  if (role === 'visitor') div.style.background = config.primary_color || '#2563eb';
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function showTyping() {
  var t = document.createElement('div');
  t.className = 'ch-typing';
  t.id = 'ch-typing';
  t.textContent = '●●●';
  msgs.appendChild(t);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping() {
  var t = panel.querySelector('#ch-typing');
  if (t) t.remove();
}

async function fetchConfig() {
  try {
    var r = await fetch(API + '/' + brandId + '/config');
    var d = await r.json();
    config = d;
    applyColor(d.primary_color || '#2563eb');
    header.textContent = d.widget_name || 'Chat with us';
  } catch(e) {}
}

async function startSession() {
  try {
    var r = await fetch(API + '/' + brandId + '/session', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ page_url: window.location.href })
    });
    var d = await r.json();
    sessionId = d.sessionId;
    if (d.greeting_message) {
      appendMessage('assistant', d.greeting_message);
    }
    // If collect_email enabled, show info form; else enable input immediately
    if (config.collect_email) {
      infoForm.style.display = 'block';
      input.disabled = true; sendBtn.disabled = true;
    } else {
      visitorInfoCollected = true;
      input.disabled = false; sendBtn.disabled = false;
      input.focus();
    }
  } catch(e) {
    appendMessage('assistant', 'Sorry, unable to connect. Please try again.');
  }
}

async function sendVisitorInfo() {
  var name = panel.querySelector('#ch-name').value.trim();
  var email = panel.querySelector('#ch-email').value.trim();
  if (!name && !email) return;
  infoForm.style.display = 'none';
  visitorInfoCollected = true;
  input.disabled = false; sendBtn.disabled = false;
  input.focus();
  try {
    await fetch(API + '/' + brandId + '/session/' + sessionId + '/visitor', {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name: name, email: email })
    });
  } catch(e) {}
}

async function sendMessage() {
  var text = input.value.trim();
  if (!text || !sessionId) return;
  input.value = '';
  sendBtn.disabled = true;
  messageCount++;
  appendMessage('visitor', text);
  showTyping();
  try {
    var r = await fetch(API + '/' + brandId + '/session/' + sessionId + '/message', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ content: text })
    });
    var d = await r.json();
    removeTyping();
    if (d.reply) appendMessage('assistant', d.reply);
  } catch(e) {
    removeTyping();
    appendMessage('assistant', 'Sorry, something went wrong. Please try again.');
  }
  sendBtn.disabled = false;
  input.focus();
}

// ── Events ─────────────────────────────────────────────────────────────────
bubble.addEventListener('click', async function() {
  panel.classList.toggle('ch-hidden');
  if (!panel.classList.contains('ch-hidden') && !sessionId) {
    await fetchConfig();
    await startSession();
  }
});

closeBtn.addEventListener('click', function() { panel.classList.add('ch-hidden'); });

infoBtn.addEventListener('click', sendVisitorInfo);
panel.querySelector('#ch-email').addEventListener('keydown', function(e){ if(e.key==='Enter') sendVisitorInfo(); });

sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keydown', function(e){ if(e.key==='Enter') sendMessage(); });

})();`;

  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(script);
};

// ── Public: Config ───────────────────────────────────────────────────────────

export const getWidgetConfig = async (req, res) => {
  try {
    const { brandId } = req.params;
    const settings = await model.getSettings(brandId);
    if (!settings.is_enabled) {
      return res.json({ is_enabled: false });
    }
    // Return only public fields (no ai_context — that's internal)
    res.json({
      is_enabled: settings.is_enabled,
      widget_name: settings.widget_name,
      greeting_message: settings.greeting_message,
      primary_color: settings.primary_color,
      position: settings.position,
      collect_email: settings.collect_email,
      ai_enabled: settings.ai_enabled,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Public: Start session ────────────────────────────────────────────────────

export const startSession = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { visitor_id, page_url } = req.body;
    const settings = await model.getSettings(brandId);
    const session = await model.createSession({ brand_id: brandId, visitor_id, page_url });
    res.json({ sessionId: session.id, greeting_message: settings.greeting_message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Public: Send message ─────────────────────────────────────────────────────

export const sendMessage = async (req, res) => {
  try {
    const { brandId, sessionId } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Content required' });

    const session = await model.getSessionByIdPublic(sessionId, brandId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    // Save visitor message
    await model.addMessage(sessionId, brandId, 'visitor', content.trim());

    // Get conversation history for AI context
    const history = await model.getRecentMessages(sessionId, 20);

    // Generate AI reply
    let reply = "Thanks for your message! We'll get back to you shortly.";

    if (anthropic) {
      try {
        const settings = await model.getSettings(brandId);
        const brandResult = await query(
          `SELECT b.name, b.description, b.website, bv.*
           FROM brands b
           LEFT JOIN LATERAL (
             SELECT brand_voice FROM brands WHERE id = b.id
           ) bv ON TRUE
           WHERE b.id = $1`,
          [brandId]
        );
        const brand = brandResult.rows[0] || {};
        const voice = brand.brand_voice || {};

        let systemPrompt = `You are a helpful customer service assistant for ${brand.name || 'our company'}.`;
        if (brand.description) systemPrompt += ` ${brand.description}`;
        if (settings.ai_context) systemPrompt += `\n\n${settings.ai_context}`;
        if (voice.tone) systemPrompt += `\n\nCommunication style: ${voice.tone}.`;
        if (voice.target_audience) systemPrompt += ` Target audience: ${voice.target_audience}.`;
        if (brand.website) systemPrompt += `\n\nWebsite: ${brand.website}`;
        systemPrompt += '\n\nBe concise (2-4 sentences max). Be friendly and helpful. If you don\'t know specific details, offer to have someone from the team follow up.';

        const messages = history.map(m => ({
          role: m.role === 'visitor' ? 'user' : 'assistant',
          content: m.content,
        }));

        const aiResponse = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 300,
          system: systemPrompt,
          messages,
        });
        reply = aiResponse.content[0]?.text || reply;
      } catch (aiErr) {
        console.error('[ChatWidget] AI error:', aiErr.message);
      }
    }

    // Save AI reply
    await model.addMessage(sessionId, brandId, 'assistant', reply);

    res.json({ reply, sessionId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Public: Update visitor info ───────────────────────────────────────────────

export const updateVisitorInfo = async (req, res) => {
  try {
    const { brandId, sessionId } = req.params;
    const { name, email } = req.body;

    const session = await model.getSessionByIdPublic(sessionId, brandId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    await model.updateSession(sessionId, {
      visitor_name: name || null,
      visitor_email: email || null,
    });

    // Save as a lead submission if email provided
    if (email) {
      try {
        await query(
          `INSERT INTO lead_submissions (brand_id, data, name, email, status, submitted_at)
           VALUES ($1, $2::jsonb, $3, $4, 'new', NOW())
           ON CONFLICT DO NOTHING`,
          [brandId, JSON.stringify({ source: 'chat_widget', page_url: session.page_url }), name || null, email]
        );
      } catch (e) {
        // Non-fatal — lead submission table may have constraints
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Protected: Settings ──────────────────────────────────────────────────────

export const getSettings = async (req, res) => {
  try {
    const { brandId } = req.params;
    await checkAccess(brandId, req.user.id);
    const settings = await model.getSettings(brandId);
    res.json({ settings });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const saveSettings = async (req, res) => {
  try {
    const { brandId } = req.params;
    await checkAccess(brandId, req.user.id);
    const settings = await model.upsertSettings(brandId, req.body);
    res.json({ settings });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// ── Protected: Sessions ──────────────────────────────────────────────────────

export const getSessions = async (req, res) => {
  try {
    const { brandId } = req.params;
    await checkAccess(brandId, req.user.id);
    const sessions = await model.getSessions(brandId, req.query);
    res.json({ sessions });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const getSession = async (req, res) => {
  try {
    const { brandId, sessionId } = req.params;
    await checkAccess(brandId, req.user.id);
    const session = await model.getSessionById(sessionId, brandId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json({ session });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const closeSession = async (req, res) => {
  try {
    const { brandId, sessionId } = req.params;
    await checkAccess(brandId, req.user.id);
    await model.updateSession(sessionId, { status: 'closed' });
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const convertSession = async (req, res) => {
  try {
    const { brandId, sessionId } = req.params;
    await checkAccess(brandId, req.user.id);
    const session = await model.getSessionById(sessionId, brandId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (!session.visitor_email && !session.visitor_name) {
      return res.status(400).json({ message: 'No visitor information to create client from' });
    }

    // Create client
    const clientResult = await query(
      `INSERT INTO clients (brand_id, name, email, status, client_type, created_by)
       VALUES ($1, $2, $3, 'active', 'regular', $4)
       ON CONFLICT (brand_id, email) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [brandId, session.visitor_name || session.visitor_email, session.visitor_email || null, req.user.id]
    );
    const client = clientResult.rows[0];

    await model.updateSession(sessionId, { status: 'converted', converted_to_client_id: client.id });
    res.json({ success: true, client });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const { brandId, sessionId } = req.params;
    await checkAccess(brandId, req.user.id);
    await model.deleteSession(sessionId, brandId);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const replyAsAgent = async (req, res) => {
  try {
    const { brandId, sessionId } = req.params;
    await checkAccess(brandId, req.user.id);
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Content required' });
    const message = await model.addMessage(sessionId, brandId, 'agent', content.trim());
    res.json({ message });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
