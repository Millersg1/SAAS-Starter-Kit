import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import * as brandModel from '../models/brandModel.js';
import logger from '../utils/logger.js';

const router = express.Router();

const BRAND_ID = process.env.DEFAULT_BRAND_ID || 'cc3dd16b-5cf8-45d2-97d4-9e2a5ea87659';

async function getOwnerUserId(brandId) {
  const res = await query(`SELECT user_id FROM brand_members WHERE brand_id = $1 AND role = 'owner' LIMIT 1`, [brandId]);
  return res.rows[0]?.user_id || null;
}

// ══════════════════════════════════════════════════════════════════════════════
// ELEVENLABS WEBHOOK TOOLS (no auth — called by ElevenLabs during calls)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/surf/elevenlabs/capture-lead
 * ElevenLabs tool: capture caller info into CRM
 */
router.post('/elevenlabs/capture-lead', async (req, res) => {
  try {
    const { name, email, phone, interest, notes } = req.body;
    logger.info({ name, email, phone, interest }, '[Surf ElevenLabs] capture-lead called');

    if (!name) return res.json({ success: false, message: 'Name is required' });

    const ownerId = await getOwnerUserId(BRAND_ID);
    let existingId = null;
    if (email) {
      const ex = await query(`SELECT id FROM clients WHERE brand_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`, [BRAND_ID, email]);
      existingId = ex.rows[0]?.id;
    }
    if (!existingId && phone) {
      const ex = await query(`SELECT id FROM clients WHERE brand_id = $1 AND phone = $2 LIMIT 1`, [BRAND_ID, phone]);
      existingId = ex.rows[0]?.id;
    }

    if (existingId) {
      await query(`UPDATE clients SET name = COALESCE($1, name), email = COALESCE($2, email), phone = COALESCE($3, phone), updated_at = NOW() WHERE id = $4`, [name, email, phone, existingId]);
      return res.json({ success: true, message: `Updated existing contact ${name}`, client_id: existingId });
    }

    const result = await query(
      `INSERT INTO clients (brand_id, name, email, phone, status, notes, created_by)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6) RETURNING id`,
      [BRAND_ID, name, email || null, phone || null, `Surf Voice: ${interest || notes || 'General inquiry'}`, ownerId]
    );

    logger.info({ clientId: result.rows[0].id }, '[Surf ElevenLabs] New lead created');
    res.json({ success: true, message: `Lead captured: ${name}`, client_id: result.rows[0].id });
  } catch (err) {
    logger.error({ err: err.message }, '[Surf ElevenLabs] capture-lead error');
    res.json({ success: false, message: 'Information noted. Our team will follow up.' });
  }
});

/**
 * POST /api/surf/elevenlabs/book-appointment
 * ElevenLabs tool: book an appointment
 */
router.post('/elevenlabs/book-appointment', async (req, res) => {
  try {
    const { name, email, preferred_date, preferred_time, reason } = req.body;
    logger.info({ name, preferred_date, preferred_time, reason }, '[Surf ElevenLabs] book-appointment called');

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(10, 0, 0, 0);

    await query(
      `INSERT INTO calendar_events (brand_id, title, description, start_time, end_time, event_type, created_at)
       VALUES ($1, $2, $3, $4, $5, 'meeting', NOW())`,
      [BRAND_ID, `Surf Voice Booking: ${name || 'Caller'}`, `Reason: ${reason || 'Consultation'}\nPreferred: ${preferred_date || 'TBD'} ${preferred_time || 'TBD'}\nEmail: ${email || 'N/A'}`, startTime, new Date(startTime.getTime() + 30 * 60000)]
    );

    res.json({ success: true, message: `Appointment request noted for ${name || 'the caller'}. Preferred: ${preferred_date || 'soon'} ${preferred_time || ''}.` });
  } catch (err) {
    logger.error({ err: err.message }, '[Surf ElevenLabs] book-appointment error');
    res.json({ success: true, message: 'Appointment request noted. Our team will confirm.' });
  }
});

/**
 * POST /api/surf/elevenlabs/post-call
 * ElevenLabs post-call webhook: save transcript
 */
router.post('/elevenlabs/post-call', async (req, res) => {
  try {
    logger.info('[Surf ElevenLabs] post-call webhook received');
    const data = req.body;

    const agentRes = await query(`SELECT id FROM voice_agents WHERE brand_id = $1 LIMIT 1`, [BRAND_ID]);
    const voiceAgentId = agentRes.rows[0]?.id;

    if (voiceAgentId && data) {
      await query(
        `INSERT INTO voice_agent_calls (voice_agent_id, brand_id, direction, twilio_call_sid, status, transcript, summary, sentiment, started_at, ended_at)
         VALUES ($1, $2, 'inbound', $3, 'completed', $4, $5, $6, NOW(), NOW())`,
        [voiceAgentId, BRAND_ID, data.conversation_id || 'el_' + Date.now(), JSON.stringify(data.transcript || []), data.analysis?.summary || null, data.analysis?.sentiment || 'neutral']
      );
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ err: err.message }, '[Surf ElevenLabs] post-call error');
    res.json({ success: true });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PROTECTED ROUTES (authenticated users)
// ══════════════════════════════════════════════════════════════════════════════
router.use(protect);

// ── Ensure surf_voice_settings table exists ─────────────────────────────────
query(`
  CREATE TABLE IF NOT EXISTS surf_voice_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL UNIQUE REFERENCES brands(id) ON DELETE CASCADE,
    voice_enabled BOOLEAN DEFAULT FALSE,
    voice_style VARCHAR(50) DEFAULT 'professional',
    inbound_enabled BOOLEAN DEFAULT FALSE,
    lead_followup_enabled BOOLEAN DEFAULT FALSE,
    invoice_reminder_enabled BOOLEAN DEFAULT FALSE,
    appointment_confirmation_enabled BOOLEAN DEFAULT FALSE,
    business_hours JSONB DEFAULT '{"start":"09:00","end":"17:00","timezone":"America/New_York","days":[1,2,3,4,5]}'::jsonb,
    after_hours_behavior VARCHAR(30) DEFAULT 'voicemail',
    transfer_phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_surf_voice_settings_brand ON surf_voice_settings(brand_id);
`).catch(err => logger.warn({ err: err.message }, 'surf_voice_settings table migration note'));

// ── XML escape helper for TwiML ─────────────────────────────────────────────
const xmlEscape = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// ── Voice scripts ───────────────────────────────────────────────────────────
const VOICE_SCRIPTS = {
  lead_followup: (brandName) =>
    `Hi, this is Surf calling on behalf of ${brandName}. I saw that you recently requested information, and I just wanted to follow up to see if you had any questions. We'd love to help you move forward whenever you're ready.`,
  invoice_reminder: (brandName) =>
    `Hi, this is Surf from ${brandName}. Just a quick reminder that there's an open invoice on your account. If you need the link again or have any questions, I'm here to help.`,
  appointment_confirmation: (brandName) =>
    `Hi, this is Surf from ${brandName}. Just confirming your upcoming appointment. If anything changes or you need to reschedule, I can help you do that quickly.`,
  missed_callback: (brandName) =>
    `Hi, this is Surf returning your call from ${brandName}. I'm here to help with anything you need.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/surf/:brandId/recommendations
 * Surf analyzes the user's data and returns actionable recommendations.
 */
router.get('/:brandId/recommendations', catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const member = await brandModel.getBrandMember(brandId, req.user.id);
  if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied' });

  const recommendations = [];

  // 1. Overdue invoices
  const overdue = await query(
    `SELECT COUNT(*) as count, COALESCE(SUM(amount_due), 0) as total
     FROM invoices WHERE brand_id = $1 AND status = 'overdue' AND amount_due > 0`,
    [brandId]
  );
  if (parseInt(overdue.rows[0].count) > 0) {
    recommendations.push({
      type: 'overdue_invoices',
      priority: 'high',
      icon: '💰',
      title: `${overdue.rows[0].count} overdue invoice${overdue.rows[0].count > 1 ? 's' : ''} ($${parseFloat(overdue.rows[0].total).toLocaleString()})`,
      description: 'Send reminders now or set up automatic follow-ups to recover this revenue.',
      action: { label: 'View Overdue', link: '/invoices?status=overdue' },
    });
  }

  // 2. Leads needing follow-up (no activity in 3+ days)
  const staleLeads = await query(
    `SELECT COUNT(*) as count FROM clients
     WHERE brand_id = $1 AND status = 'lead' AND is_active = TRUE
     AND (last_contacted_at IS NULL OR last_contacted_at < NOW() - INTERVAL '3 days')`,
    [brandId]
  );
  if (parseInt(staleLeads.rows[0].count) > 0) {
    recommendations.push({
      type: 'stale_leads',
      priority: 'high',
      icon: '🎯',
      title: `${staleLeads.rows[0].count} lead${staleLeads.rows[0].count > 1 ? 's' : ''} need follow-up`,
      description: 'These leads haven\'t been contacted in 3+ days. Reach out before they go cold.',
      action: { label: 'View Leads', link: '/clients?status=lead' },
    });
  }

  // 3. Tasks due today or overdue
  const dueTasks = await query(
    `SELECT COUNT(*) as count FROM tasks
     WHERE brand_id = $1 AND status != 'completed' AND due_date <= CURRENT_DATE`,
    [brandId]
  );
  if (parseInt(dueTasks.rows[0].count) > 0) {
    recommendations.push({
      type: 'due_tasks',
      priority: 'medium',
      icon: '✅',
      title: `${dueTasks.rows[0].count} task${dueTasks.rows[0].count > 1 ? 's' : ''} due today or overdue`,
      description: 'Stay on top of your commitments — complete these tasks to keep projects on track.',
      action: { label: 'View Tasks', link: '/tasks' },
    });
  }

  // 4. Deals stuck in pipeline (no movement in 7+ days)
  const stuckDeals = await query(
    `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total FROM deals
     WHERE brand_id = $1 AND status = 'active'
     AND updated_at < NOW() - INTERVAL '7 days'`,
    [brandId]
  );
  if (parseInt(stuckDeals.rows[0].count) > 0) {
    recommendations.push({
      type: 'stuck_deals',
      priority: 'medium',
      icon: '📈',
      title: `${stuckDeals.rows[0].count} deal${stuckDeals.rows[0].count > 1 ? 's' : ''} haven't moved in a week ($${parseFloat(stuckDeals.rows[0].total).toLocaleString()})`,
      description: 'Move these deals forward or mark them as lost to keep your pipeline accurate.',
      action: { label: 'View Pipeline', link: '/pipeline' },
    });
  }

  // 5. Proposals waiting for response (sent 3+ days ago)
  const pendingProposals = await query(
    `SELECT COUNT(*) as count FROM proposals
     WHERE brand_id = $1 AND status = 'sent' AND sent_at < NOW() - INTERVAL '3 days'`,
    [brandId]
  );
  if (parseInt(pendingProposals.rows[0].count) > 0) {
    recommendations.push({
      type: 'pending_proposals',
      priority: 'medium',
      icon: '📋',
      title: `${pendingProposals.rows[0].count} proposal${pendingProposals.rows[0].count > 1 ? 's' : ''} waiting for response`,
      description: 'Follow up on these proposals — the longer they wait, the less likely they close.',
      action: { label: 'View Proposals', link: '/proposals' },
    });
  }

  // 6. Clients at churn risk
  const churnRisk = await query(
    `SELECT COUNT(*) as count FROM churn_predictions
     WHERE brand_id = $1 AND churn_probability >= 70`,
    [brandId]
  );
  if (parseInt(churnRisk.rows[0].count) > 0) {
    recommendations.push({
      type: 'churn_risk',
      priority: 'high',
      icon: '⚠️',
      title: `${churnRisk.rows[0].count} client${churnRisk.rows[0].count > 1 ? 's' : ''} at high churn risk`,
      description: 'These clients may leave soon. Consider a check-in call or special offer.',
      action: { label: 'View At-Risk', link: '/analytics' },
    });
  }

  // 7. Unread messages
  const unread = await query(
    `SELECT COUNT(*) as count FROM messages
     WHERE brand_id = $1 AND is_read = FALSE`,
    [brandId]
  );
  if (parseInt(unread.rows[0].count) > 0) {
    recommendations.push({
      type: 'unread_messages',
      priority: 'low',
      icon: '💬',
      title: `${unread.rows[0].count} unread message${unread.rows[0].count > 1 ? 's' : ''}`,
      description: 'Stay responsive — quick replies build trust with clients.',
      action: { label: 'View Messages', link: '/messages' },
    });
  }

  // 8. Surf Voice — leads that could use a call
  try {
    const voiceSettings = await query(`SELECT voice_enabled, lead_followup_enabled FROM surf_voice_settings WHERE brand_id = $1`, [brandId]);
    const vs = voiceSettings.rows[0];
    if (vs?.voice_enabled && vs?.lead_followup_enabled && parseInt(staleLeads.rows[0].count) > 0) {
      recommendations.push({
        type: 'surf_voice_followup',
        priority: 'medium',
        icon: '📞',
        title: `Surf can call ${staleLeads.rows[0].count} lead${staleLeads.rows[0].count > 1 ? 's' : ''} for you`,
        description: 'Surf Voice can automatically follow up with stale leads by phone. Enable it in Voice Agent settings.',
        action: { label: 'Voice Settings', link: '/voice-agents' },
      });
    }
  } catch {}

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  res.json({ status: 'success', data: { recommendations, generated_at: new Date().toISOString() } });
}));

/**
 * POST /api/surf/:brandId/ask
 * Ask Surf a question about your business data.
 * Uses OpenAI to generate contextual answers.
 */
router.post('/:brandId/ask', catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const { question } = req.body;
  const member = await brandModel.getBrandMember(brandId, req.user.id);
  if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied' });
  if (!question) return res.status(400).json({ status: 'fail', message: 'Question is required' });

  // Gather business context for the AI
  const [clients, invoices, deals, projects, tasks] = await Promise.all([
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active FROM clients WHERE brand_id = $1`, [brandId]),
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'overdue') as overdue, COALESCE(SUM(amount_due) FILTER (WHERE status IN ('sent','overdue')), 0) as outstanding FROM invoices WHERE brand_id = $1`, [brandId]),
    query(`SELECT COUNT(*) as total, COALESCE(SUM(value) FILTER (WHERE status = 'active'), 0) as pipeline_value, COUNT(*) FILTER (WHERE status = 'won') as won FROM deals WHERE brand_id = $1`, [brandId]),
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status IN ('active','in_progress')) as active FROM projects WHERE brand_id = $1`, [brandId]),
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status != 'completed' AND due_date <= CURRENT_DATE) as overdue FROM tasks WHERE brand_id = $1`, [brandId]),
  ]);

  const context = {
    clients: { total: clients.rows[0].total, active: clients.rows[0].active },
    invoices: { total: invoices.rows[0].total, overdue: invoices.rows[0].overdue, outstanding: invoices.rows[0].outstanding },
    deals: { total: deals.rows[0].total, pipeline_value: deals.rows[0].pipeline_value, won: deals.rows[0].won },
    projects: { total: projects.rows[0].total, active: projects.rows[0].active },
    tasks: { total: tasks.rows[0].total, overdue: tasks.rows[0].overdue },
  };

  // Try OpenAI if configured
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: openaiKey });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: `You are Surf, an AI assistant built into SAAS Surface — an agency management platform. You help agency owners understand their business data and make decisions.

Current business data:
- ${context.clients.total} total clients (${context.clients.active} active)
- ${context.invoices.total} invoices (${context.invoices.overdue} overdue, $${parseFloat(context.invoices.outstanding).toLocaleString()} outstanding)
- ${context.deals.total} deals ($${parseFloat(context.deals.pipeline_value).toLocaleString()} pipeline value, ${context.deals.won} won)
- ${context.projects.total} projects (${context.projects.active} active)
- ${context.tasks.total} tasks (${context.tasks.overdue} overdue)

Be concise, helpful, and action-oriented. Give specific advice based on the numbers. Use a friendly professional tone. Keep responses under 3 sentences when possible.`,
          },
          { role: 'user', content: question },
        ],
      });

      const answer = completion.choices[0]?.message?.content || 'I couldn\'t generate a response right now. Try again in a moment.';
      return res.json({ status: 'success', data: { answer, context, ai: true } });
    } catch (err) {
      logger.warn({ err: err.message }, 'Surf OpenAI call failed — falling back to rule-based');
    }
  }

  // Fallback: rule-based responses
  const lower = question.toLowerCase();
  let answer = `Here's a snapshot of your agency: ${context.clients.active} active clients, $${parseFloat(context.invoices.outstanding).toLocaleString()} outstanding invoices, $${parseFloat(context.deals.pipeline_value).toLocaleString()} in your pipeline, and ${context.tasks.overdue} overdue tasks. What would you like to dive into?`;

  if (lower.includes('revenue') || lower.includes('money') || lower.includes('income')) {
    answer = `You have $${parseFloat(context.invoices.outstanding).toLocaleString()} in outstanding invoices and $${parseFloat(context.deals.pipeline_value).toLocaleString()} in your pipeline. ${context.invoices.overdue > 0 ? `${context.invoices.overdue} invoices are overdue — I'd recommend sending reminders today.` : 'No overdue invoices — nice work keeping cash flowing!'}`;
  } else if (lower.includes('client') || lower.includes('customer')) {
    answer = `You have ${context.clients.total} total clients with ${context.clients.active} currently active. ${parseInt(context.clients.total) - parseInt(context.clients.active) > 0 ? `${parseInt(context.clients.total) - parseInt(context.clients.active)} are inactive — consider a win-back campaign.` : 'All clients are active!'}`;
  } else if (lower.includes('deal') || lower.includes('pipeline') || lower.includes('sales')) {
    answer = `Your pipeline has ${context.deals.total} deals worth $${parseFloat(context.deals.pipeline_value).toLocaleString()}. ${context.deals.won} deals have been won so far. Keep pushing those active deals forward!`;
  } else if (lower.includes('task') || lower.includes('todo') || lower.includes('overdue')) {
    answer = `You have ${context.tasks.total} total tasks. ${context.tasks.overdue > 0 ? `⚠️ ${context.tasks.overdue} are overdue — I'd recommend tackling those first.` : 'No overdue tasks — your team is on track!'}`;
  } else if (lower.includes('project')) {
    answer = `You have ${context.projects.active} active projects out of ${context.projects.total} total. Keep your project updates visible to clients through the portal to build trust.`;
  } else if (lower.includes('invoice') || lower.includes('payment')) {
    answer = `${context.invoices.total} invoices total. ${context.invoices.overdue > 0 ? `${context.invoices.overdue} are overdue with $${parseFloat(context.invoices.outstanding).toLocaleString()} outstanding. Send reminders or enable automatic follow-ups.` : `$${parseFloat(context.invoices.outstanding).toLocaleString()} outstanding — no overdue invoices.`}`;
  }

  res.json({ status: 'success', data: { answer, context, ai: false } });
}));

/**
 * GET /api/surf/:brandId/summary
 * Quick business summary for the Surf widget.
 */
router.get('/:brandId/summary', catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const member = await brandModel.getBrandMember(brandId, req.user.id);
  if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied' });

  const [revenue, clients, tasks, deals] = await Promise.all([
    query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE brand_id = $1 AND payment_status = 'completed' AND payment_date >= date_trunc('month', CURRENT_DATE)`, [brandId]),
    query(`SELECT COUNT(*) as count FROM clients WHERE brand_id = $1 AND is_active = TRUE`, [brandId]),
    query(`SELECT COUNT(*) as count FROM tasks WHERE brand_id = $1 AND status != 'completed' AND due_date <= CURRENT_DATE`, [brandId]),
    query(`SELECT COALESCE(SUM(value), 0) as value FROM deals WHERE brand_id = $1 AND status = 'active'`, [brandId]),
  ]);

  res.json({
    status: 'success',
    data: {
      revenue_this_month: parseFloat(revenue.rows[0].total),
      active_clients: parseInt(clients.rows[0].count),
      tasks_due: parseInt(tasks.rows[0].count),
      pipeline_value: parseFloat(deals.rows[0].value),
    },
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// SURF VOICE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/surf/:brandId/voice/settings
 * Get Surf Voice settings for a brand.
 */
router.get('/:brandId/voice/settings', catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const member = await brandModel.getBrandMember(brandId, req.user.id);
  if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied' });

  let result = await query(
    `SELECT * FROM surf_voice_settings WHERE brand_id = $1`,
    [brandId]
  );

  // Return defaults if no settings exist yet
  if (result.rows.length === 0) {
    return res.json({
      status: 'success',
      data: {
        brand_id: brandId,
        voice_enabled: false,
        voice_style: 'professional',
        inbound_enabled: false,
        lead_followup_enabled: false,
        invoice_reminder_enabled: false,
        appointment_confirmation_enabled: false,
        business_hours: { start: '09:00', end: '17:00', timezone: 'America/New_York', days: [1,2,3,4,5] },
        after_hours_behavior: 'voicemail',
        transfer_phone: null,
      },
    });
  }

  res.json({ status: 'success', data: result.rows[0] });
}));

/**
 * PATCH /api/surf/:brandId/voice/settings
 * Update Surf Voice settings for a brand.
 */
router.patch('/:brandId/voice/settings', catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const member = await brandModel.getBrandMember(brandId, req.user.id);
  if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied' });

  // Only allow owner/admin to change voice settings
  if (!['owner', 'admin'].includes(member.role)) {
    return res.status(403).json({ status: 'fail', message: 'Only owners and admins can update voice settings' });
  }

  const allowedFields = [
    'voice_enabled', 'voice_style', 'inbound_enabled',
    'lead_followup_enabled', 'invoice_reminder_enabled',
    'appointment_confirmation_enabled', 'business_hours',
    'after_hours_behavior', 'transfer_phone',
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ status: 'fail', message: 'No valid fields to update' });
  }

  // Validate voice_style
  if (updates.voice_style && !['professional', 'friendly', 'casual', 'formal'].includes(updates.voice_style)) {
    return res.status(400).json({ status: 'fail', message: 'Invalid voice_style. Must be: professional, friendly, casual, or formal' });
  }

  // Validate after_hours_behavior
  if (updates.after_hours_behavior && !['voicemail', 'transfer', 'message', 'off'].includes(updates.after_hours_behavior)) {
    return res.status(400).json({ status: 'fail', message: 'Invalid after_hours_behavior. Must be: voicemail, transfer, message, or off' });
  }

  // Build upsert query
  const setClauses = [];
  const values = [brandId];
  let paramIdx = 2;

  for (const [field, value] of Object.entries(updates)) {
    setClauses.push(`${field} = $${paramIdx}`);
    values.push(field === 'business_hours' ? JSON.stringify(value) : value);
    paramIdx++;
  }

  // Build insert columns/values for the ON CONFLICT clause
  const insertColumns = ['brand_id', ...Object.keys(updates)];
  const insertPlaceholders = insertColumns.map((_, i) => `$${i + 1}`);
  const insertValues = [brandId, ...Object.values(updates).map((v, i) =>
    Object.keys(updates)[i] === 'business_hours' ? JSON.stringify(v) : v
  )];

  const result = await query(
    `INSERT INTO surf_voice_settings (${insertColumns.join(', ')})
     VALUES (${insertPlaceholders.join(', ')})
     ON CONFLICT (brand_id)
     DO UPDATE SET ${setClauses.join(', ')}, updated_at = NOW()
     RETURNING *`,
    insertValues
  );

  logger.info({ brandId, updates: Object.keys(updates) }, 'Surf Voice settings updated');
  res.json({ status: 'success', data: result.rows[0] });
}));

/**
 * POST /api/surf/:brandId/voice/test-call
 * Initiate a test call to the user's phone using Twilio.
 */
router.post('/:brandId/voice/test-call', catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const { phone_number } = req.body;
  const member = await brandModel.getBrandMember(brandId, req.user.id);
  if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied' });

  if (!phone_number) {
    return res.status(400).json({ status: 'fail', message: 'phone_number is required' });
  }

  // Get Twilio connection for this brand
  const twilioConn = await query(
    `SELECT * FROM twilio_connections WHERE brand_id = $1 AND is_active = TRUE LIMIT 1`,
    [brandId]
  );
  if (twilioConn.rows.length === 0) {
    return res.status(400).json({ status: 'fail', message: 'No active Twilio connection found for this brand. Please configure Twilio first.' });
  }

  const conn = twilioConn.rows[0];

  // Get brand name
  const brandResult = await query(`SELECT name FROM brands WHERE id = $1`, [brandId]);
  const brandName = brandResult.rows[0]?.name || 'your agency';

  // Build TwiML for test call
  const testScript = `Hello! This is a test call from Surf Voice for ${xmlEscape(brandName)}. If you can hear this message, your Surf Voice configuration is working correctly. Have a great day!`;
  const twimlUrl = `http://twimlets.com/echo?Twiml=${encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">${testScript}</Say></Response>`)}`;

  try {
    const twilio = (await import('twilio')).default;
    const client = twilio(conn.account_sid, conn.auth_token);

    const call = await client.calls.create({
      to: phone_number,
      from: conn.phone_number,
      url: twimlUrl,
    });

    // Log the test call
    await query(
      `INSERT INTO voice_agent_calls (brand_id, voice_agent_id, caller_phone, direction, twilio_call_sid, status, call_type, summary)
       VALUES ($1, (SELECT id FROM voice_agents WHERE brand_id = $1 AND is_active = TRUE LIMIT 1), $2, 'outbound', $3, 'completed', 'test', 'Surf Voice test call')
       ON CONFLICT DO NOTHING`,
      [brandId, phone_number, call.sid]
    ).catch(() => { /* voice_agent_id may be null if no agent exists — that is fine for test calls */ });

    logger.info({ brandId, phone: phone_number, callSid: call.sid }, 'Surf Voice test call initiated');
    res.json({ status: 'success', data: { call_sid: call.sid, message: 'Test call initiated. You should receive it shortly.' } });
  } catch (err) {
    logger.error({ err: err.message, brandId }, 'Surf Voice test call failed');
    throw new AppError(`Failed to initiate test call: ${err.message}`, 502);
  }
}));

/**
 * GET /api/surf/:brandId/voice/calls
 * List Surf Voice call history.
 */
router.get('/:brandId/voice/calls', catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const member = await brandModel.getBrandMember(brandId, req.user.id);
  if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied' });

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const offset = (page - 1) * limit;
  const callType = req.query.call_type || null;

  let whereClause = `WHERE vac.brand_id = $1`;
  const params = [brandId];
  let paramIdx = 2;

  if (callType) {
    whereClause += ` AND vac.call_type = $${paramIdx}`;
    params.push(callType);
    paramIdx++;
  }

  const [callsResult, countResult] = await Promise.all([
    query(
      `SELECT vac.*, va.name as agent_name
       FROM voice_agent_calls vac
       LEFT JOIN voice_agents va ON vac.voice_agent_id = va.id
       ${whereClause}
       ORDER BY vac.started_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    ),
    query(
      `SELECT COUNT(*) as total FROM voice_agent_calls vac ${whereClause}`,
      params
    ),
  ]);

  res.json({
    status: 'success',
    data: {
      calls: callsResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
      },
    },
  });
}));

/**
 * POST /api/surf/:brandId/voice/trigger
 * Manually trigger a Surf Voice call.
 * Body: { type: 'lead_followup'|'invoice_reminder'|'appointment_confirmation'|'missed_callback', target_id: UUID }
 */
router.post('/:brandId/voice/trigger', catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const { type, target_id } = req.body;
  const member = await brandModel.getBrandMember(brandId, req.user.id);
  if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied' });

  // Validate call type
  const validTypes = ['lead_followup', 'invoice_reminder', 'appointment_confirmation', 'missed_callback'];
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ status: 'fail', message: `type is required and must be one of: ${validTypes.join(', ')}` });
  }

  if (!target_id) {
    return res.status(400).json({ status: 'fail', message: 'target_id is required' });
  }

  // Check voice settings
  const settings = await query(
    `SELECT * FROM surf_voice_settings WHERE brand_id = $1`,
    [brandId]
  );
  if (settings.rows.length > 0 && !settings.rows[0].voice_enabled) {
    return res.status(400).json({ status: 'fail', message: 'Surf Voice is disabled for this brand. Enable it in settings first.' });
  }

  // Get Twilio connection
  const twilioConn = await query(
    `SELECT * FROM twilio_connections WHERE brand_id = $1 AND is_active = TRUE LIMIT 1`,
    [brandId]
  );
  if (twilioConn.rows.length === 0) {
    return res.status(400).json({ status: 'fail', message: 'No active Twilio connection found for this brand.' });
  }

  const conn = twilioConn.rows[0];

  // Get brand name
  const brandResult = await query(`SELECT name FROM brands WHERE id = $1`, [brandId]);
  const brandName = brandResult.rows[0]?.name || 'your agency';

  // Resolve phone number from target
  let targetPhone = null;
  let targetName = null;

  if (type === 'invoice_reminder') {
    // target_id is an invoice ID — look up the client's phone
    const inv = await query(
      `SELECT c.phone, c.name FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1 AND i.brand_id = $2`,
      [target_id, brandId]
    );
    if (inv.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Invoice not found or no client linked' });
    }
    targetPhone = inv.rows[0].phone;
    targetName = inv.rows[0].name;
  } else if (type === 'appointment_confirmation') {
    // target_id is a booking/appointment ID — look up via client
    const appt = await query(
      `SELECT c.phone, c.name FROM bookings b
       JOIN clients c ON b.client_id = c.id
       WHERE b.id = $1 AND b.brand_id = $2`,
      [target_id, brandId]
    );
    if (appt.rows.length === 0) {
      // Fallback: try clients table directly
      const client = await query(
        `SELECT phone, name FROM clients WHERE id = $1 AND brand_id = $2`,
        [target_id, brandId]
      );
      if (client.rows.length === 0) {
        return res.status(404).json({ status: 'fail', message: 'Appointment or client not found' });
      }
      targetPhone = client.rows[0].phone;
      targetName = client.rows[0].name;
    } else {
      targetPhone = appt.rows[0].phone;
      targetName = appt.rows[0].name;
    }
  } else {
    // lead_followup or missed_callback — target_id is a client ID
    const client = await query(
      `SELECT phone, name FROM clients WHERE id = $1 AND brand_id = $2`,
      [target_id, brandId]
    );
    if (client.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Client not found' });
    }
    targetPhone = client.rows[0].phone;
    targetName = client.rows[0].name;
  }

  if (!targetPhone) {
    return res.status(400).json({ status: 'fail', message: `No phone number found for ${targetName || 'target'}. Please add a phone number first.` });
  }

  // Get the voice script
  const scriptFn = VOICE_SCRIPTS[type];
  const script = scriptFn(xmlEscape(brandName));
  const voiceStyle = settings.rows[0]?.voice_style || 'professional';

  // Map voice_style to a Polly voice
  const voiceMap = {
    professional: 'Polly.Joanna',
    friendly: 'Polly.Salli',
    casual: 'Polly.Kendra',
    formal: 'Polly.Kimberly',
  };
  const twilioVoice = voiceMap[voiceStyle] || 'Polly.Joanna';

  // Build TwiML
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="${twilioVoice}">${script}</Say><Pause length="1"/><Say voice="${twilioVoice}">If you'd like to speak with someone, press 1 or stay on the line.</Say><Gather numDigits="1" timeout="5"><Say voice="${twilioVoice}">Press 1 to be connected to a team member.</Say></Gather><Say voice="${twilioVoice}">Thank you. Goodbye!</Say></Response>`;
  const twimlUrl = `http://twimlets.com/echo?Twiml=${encodeURIComponent(twiml)}`;

  try {
    const twilio = (await import('twilio')).default;
    const client = twilio(conn.account_sid, conn.auth_token);

    const call = await client.calls.create({
      to: targetPhone,
      from: conn.phone_number,
      url: twimlUrl,
    });

    // Log the call to voice_agent_calls
    const logResult = await query(
      `INSERT INTO voice_agent_calls
        (brand_id, voice_agent_id, caller_phone, direction, twilio_call_sid, status, call_type, summary)
       VALUES
        ($1,
         (SELECT id FROM voice_agents WHERE brand_id = $1 AND is_active = TRUE LIMIT 1),
         $2, 'outbound', $3, 'in_progress', $4, $5)
       RETURNING id`,
      [brandId, targetPhone, call.sid, type, `Surf Voice ${type.replace(/_/g, ' ')} call to ${targetName || targetPhone}`]
    );

    // Update last_contacted_at for the client (if applicable)
    if (type === 'lead_followup' || type === 'missed_callback') {
      await query(
        `UPDATE clients SET last_contacted_at = NOW() WHERE id = $1 AND brand_id = $2`,
        [target_id, brandId]
      ).catch(() => {});
    }

    logger.info({ brandId, type, targetPhone, callSid: call.sid }, 'Surf Voice call triggered');
    res.json({
      status: 'success',
      data: {
        call_id: logResult.rows[0]?.id,
        call_sid: call.sid,
        type,
        target_phone: targetPhone,
        target_name: targetName,
        message: `Surf Voice ${type.replace(/_/g, ' ')} call initiated to ${targetName || targetPhone}.`,
      },
    });
  } catch (err) {
    logger.error({ err: err.message, brandId, type, targetPhone }, 'Surf Voice trigger call failed');
    throw new AppError(`Failed to initiate Surf Voice call: ${err.message}`, 502);
  }
}));

export default router;
