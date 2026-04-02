import { getBrandMember, getBrandVoice } from '../models/brandModel.js';
import { getClientById } from '../models/clientModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';
import { computeClientHealthScore } from './analyticsController.js';
import { query } from '../config/database.js';

// Build a brand voice context string to inject into prompts
const buildVoiceContext = (voice) => {
  if (!voice || Object.keys(voice).length === 0) return '';
  const parts = [];
  if (voice.tone)               parts.push(`Tone: ${voice.tone}`);
  if (voice.target_audience)    parts.push(`Target audience: ${voice.target_audience}`);
  if (voice.industry)           parts.push(`Industry: ${voice.industry}`);
  if (voice.brand_keywords)     parts.push(`Use these brand keywords naturally: ${voice.brand_keywords}`);
  if (voice.avoid_words)        parts.push(`NEVER use these words: ${voice.avoid_words}`);
  if (voice.writing_style_notes) parts.push(`Writing style: ${voice.writing_style_notes}`);
  if (voice.sample_copy)        parts.push(`Brand voice example: "${voice.sample_copy}"`);
  return parts.length ? `\n\nBrand Voice Guidelines:\n${parts.join('\n')}` : '';
};

// Lazy-load OpenAI (primary) and Anthropic (fallback)
let _openai = null;
let _anthropic = null;

const getOpenAIClient = async () => {
  if (!process.env.OPENAI_API_KEY) return null;
  if (_openai) return _openai;
  try {
    const { default: OpenAI } = await import('openai');
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return _openai;
  } catch { return null; }
};

const getAnthropicClient = async () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (_anthropic) return _anthropic;
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return _anthropic;
  } catch { return null; }
};

/**
 * Unified AI call — tries OpenAI first, falls back to Anthropic.
 * Returns the text response.
 */
const callAI = async (systemPrompt, userMessage) => {
  // Try OpenAI first (Surf's brain)
  const openai = await getOpenAIClient();
  if (openai) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });
    return completion.choices[0]?.message?.content || '';
  }

  // Fallback to Anthropic
  const anthropic = await getAnthropicClient();
  if (anthropic) {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    return message.content?.[0]?.text || '';
  }

  throw new Error('No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
};

/**
 * POST /api/ai/:brandId/draft-invoice
 * Body: { description, client_id? }
 * Returns: { items: [{description, quantity, unit_price}], notes: string }
 */
export const draftInvoice = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const aiAvailable = await getOpenAIClient() || await getAnthropicClient();
  if (!aiAvailable) return next(new AppError('AI is not configured. Set OPENAI_API_KEY.', 503));

  const { description, client_id } = req.body;
  if (!description) return next(new AppError('Description is required', 400));

  let clientCtx = '';
  if (client_id) {
    try {
      const c = await getClientById(client_id);
      if (c) clientCtx = ` The client is ${c.name}${c.company ? ` at ${c.company}` : ''}.`;
    } catch { /* non-critical */ }
  }

  const prompt = `You are a professional invoicing assistant. Generate invoice line items as JSON.${clientCtx}

Work description: "${description}"

Respond ONLY with valid JSON in this exact format, no markdown, no explanation:
{
  "items": [
    {"description": "...", "quantity": 1, "unit_price": 0.00}
  ],
  "notes": "Optional payment notes or terms"
}

Rules:
- Break work into logical line items (max 8 items)
- Use reasonable market rates in USD
- quantity must be a positive number
- unit_price must be a positive number
- notes should be brief (1-2 sentences) or empty string`;

  const text = (await callAI('You are Surf, an AI assistant for agencies.', prompt)).trim() || '{}';

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try to extract JSON from response
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return next(new AppError('AI returned an unreadable response. Please try again.', 502));
    parsed = JSON.parse(match[0]);
  }

  res.json({ status: 'success', data: { items: parsed.items || [], notes: parsed.notes || '' } });
});

/**
 * POST /api/ai/:brandId/draft-proposal
 * Body: { description, client_id? }
 * Returns: { items: [{description, quantity, unit_price}], notes: string, terms: string }
 */
export const draftProposal = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const aiAvailable = await getOpenAIClient() || await getAnthropicClient();
  if (!aiAvailable) return next(new AppError('AI is not configured. Set OPENAI_API_KEY.', 503));

  const { description, client_id } = req.body;
  if (!description) return next(new AppError('Description is required', 400));

  let clientCtx = '';
  if (client_id) {
    try {
      const c = await getClientById(client_id);
      if (c) clientCtx = ` The client is ${c.name}${c.company ? ` at ${c.company}` : ''}.`;
    } catch { /* non-critical */ }
  }

  const prompt = `You are a professional proposal writer for a service agency. Generate a project proposal as JSON.${clientCtx}

Project description: "${description}"

Respond ONLY with valid JSON in this exact format, no markdown, no explanation:
{
  "items": [
    {"description": "...", "quantity": 1, "unit_price": 0.00}
  ],
  "notes": "Brief project overview or scope notes",
  "terms": "Payment terms and conditions"
}

Rules:
- items should reflect typical deliverables/phases for this type of project (max 10 items)
- Use reasonable agency market rates in USD
- notes: 1-3 sentences describing the scope
- terms: standard professional terms (payment schedule, revisions policy, etc.)`;

  const text = (await callAI('You are Surf, an AI assistant for agencies.', prompt)).trim() || '{}';

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return next(new AppError('AI returned an unreadable response. Please try again.', 502));
    parsed = JSON.parse(match[0]);
  }

  res.json({ status: 'success', data: { items: parsed.items || [], notes: parsed.notes || '', terms: parsed.terms || '' } });
});

/**
 * POST /api/ai/:brandId/cms-content
 * Body: { title, keywords?, pageType?, tone? }
 * Returns: { content: '<p>HTML</p>', seoTitle, seoDescription }
 */
export const generateCmsContent = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const aiClient = await getAnthropicClient();
  if (!aiClient) return next(new AppError('AI service not configured', 503));

  const { title, keywords, pageType = 'page', tone = 'professional' } = req.body;
  if (!title) return next(new AppError('Title is required', 400));

  const brandVoice = await getBrandVoice(brandId).catch(() => ({}));
  const voiceCtx = buildVoiceContext(brandVoice);

  const prompt = `You are a professional content writer. Write a ${pageType} titled "${title}"${keywords ? ` about: ${keywords}` : ''}. Tone: ${tone}.${voiceCtx}

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "content": "<p>HTML body using only h2, h3, p, ul, li, strong, em tags. At least 300 words. No html/body wrapper.</p>",
  "seoTitle": "SEO optimized title under 60 characters",
  "seoDescription": "Compelling meta description under 155 characters"
}`;

  const text = (await callAI('You are Surf, an AI assistant for agencies.', prompt)).trim() || '{}';

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return next(new AppError('AI returned an unreadable response. Please try again.', 502));
    parsed = JSON.parse(match[0]);
  }

  res.json({ status: 'success', data: { content: parsed.content || '', seoTitle: parsed.seoTitle || '', seoDescription: parsed.seoDescription || '' } });
});

/**
 * POST /api/ai/:brandId/social-caption
 * Body: { topic, platform, tone?, brandName? }
 * Returns: { caption, hashtags: ['#tag1', ...] }
 */
export const generateSocialCaption = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const aiClient = await getAnthropicClient();
  if (!aiClient) return next(new AppError('AI service not configured', 503));

  const { topic, platform = 'linkedin', tone = 'professional', brandName } = req.body;
  if (!topic) return next(new AppError('Topic is required', 400));

  const brandVoice = await getBrandVoice(brandId).catch(() => ({}));
  const voiceCtx = buildVoiceContext(brandVoice);

  const platformGuide = {
    twitter:   'Under 280 characters total. Punchy, direct, no hashtags in body — list 2-3 hashtags separately.',
    linkedin:  'Professional tone, 150-300 characters. Value-driven. List 3-5 relevant hashtags separately.',
    facebook:  'Conversational and engaging, 100-250 characters. Ask a question if possible. List 3-4 hashtags separately.',
    instagram: 'Vibrant and visual, 100-200 characters. Include a call-to-action. List 5-8 hashtags separately.',
  };

  const guide = platformGuide[platform] || platformGuide.linkedin;
  const brandCtx = brandName ? ` Brand voice: ${brandName}.` : '';

  const prompt = `You are a social media expert.${brandCtx} Write a ${platform} post about: "${topic}". Tone: ${tone}. ${guide}${voiceCtx}

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "caption": "The post text without hashtags",
  "hashtags": ["#tag1", "#tag2"]
}`;

  const text = (await callAI('You are Surf, an AI assistant for agencies.', prompt)).trim() || '{}';

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return next(new AppError('AI returned an unreadable response. Please try again.', 502));
    parsed = JSON.parse(match[0]);
  }

  res.json({ status: 'success', data: { caption: parsed.caption || '', hashtags: parsed.hashtags || [] } });
});

/**
 * GET /api/ai/:brandId/client-insights/:clientId
 * Returns { summary, risks: string[], action } — AI interpretation of health score data.
 */
/**
 * POST /api/ai/:brandId/draft-email
 * Body: { context, recipient_name?, recipient_email?, intent, thread_messages? }
 * Returns: { subject, body }
 */
export const draftEmail = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const aiClient = await getAnthropicClient();
  if (!aiClient) return next(new AppError('AI email drafting not configured', 503));

  const { context, recipient_name, recipient_email, intent, thread_messages } = req.body;
  if (!context && !intent) return next(new AppError('Provide context or intent for the email', 400));

  const brandVoice = await getBrandVoice(brandId).catch(() => ({}));
  const voiceCtx = buildVoiceContext(brandVoice);

  let threadCtx = '';
  if (thread_messages?.length) {
    threadCtx = '\n\nPrevious conversation:\n' + thread_messages
      .slice(-5)
      .map(m => `${m.from || 'Unknown'}: ${m.content?.slice(0, 200)}`)
      .join('\n');
  }

  const prompt = `You are a professional email writer for a business.${voiceCtx}
${recipient_name ? `Recipient: ${recipient_name}` : ''}${recipient_email ? ` <${recipient_email}>` : ''}
Intent: ${intent || 'reply'}
Context: ${context || 'General business communication'}
${threadCtx}

Write a professional email. Respond ONLY with JSON:
{
  "subject": "Email subject line (skip if this is a reply)",
  "body": "The email body in plain text. Professional tone. 2-4 paragraphs. Include greeting and sign-off."
}`;

  const text = (await callAI('You are Surf, an AI assistant for agencies.', prompt)).trim() || '{}';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return next(new AppError('AI returned an unreadable response', 502));
    parsed = JSON.parse(match[0]);
  }

  res.json({ status: 'success', data: { subject: parsed.subject || '', body: parsed.body || '' } });
});

/**
 * POST /api/ai/:brandId/transcribe-notes
 * Body: { call_notes, client_name?, duration_minutes? }
 * Returns: { summary, action_items, follow_up_date?, sentiment }
 */
export const transcribeCallNotes = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const aiClient = await getAnthropicClient();
  if (!aiClient) return next(new AppError('AI service not configured', 503));

  const { call_notes, client_name, duration_minutes } = req.body;
  if (!call_notes) return next(new AppError('call_notes is required', 400));

  const prompt = `You are a CRM assistant. Analyze these call/meeting notes and extract structured insights.

Call with: ${client_name || 'Client'}
Duration: ${duration_minutes ? `${duration_minutes} minutes` : 'Unknown'}

Notes:
"${call_notes}"

Respond ONLY with JSON:
{
  "summary": "2-3 sentence summary of the call",
  "action_items": ["Action item 1", "Action item 2"],
  "follow_up_date": "Suggested follow-up date if mentioned, null otherwise",
  "sentiment": "positive/neutral/negative — overall client sentiment",
  "key_topics": ["Topic 1", "Topic 2"],
  "decisions_made": ["Decision 1"]
}`;

  const text = (await callAI('You are Surf, an AI assistant for agencies.', prompt)).trim() || '{}';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return next(new AppError('AI returned an unreadable response', 502));
    parsed = JSON.parse(match[0]);
  }

  res.json({
    status: 'success',
    data: {
      summary: parsed.summary || '',
      action_items: parsed.action_items || [],
      follow_up_date: parsed.follow_up_date || null,
      sentiment: parsed.sentiment || 'neutral',
      key_topics: parsed.key_topics || [],
      decisions_made: parsed.decisions_made || [],
    },
  });
});

/**
 * POST /api/ai/:brandId/pipeline-advice
 * Body: { deal_id }
 * Returns: { advice, next_steps, risk_factors }
 */
export const getPipelineAdvice = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const aiClient = await getAnthropicClient();
  if (!aiClient) return next(new AppError('AI service not configured', 503));

  const { deal_id } = req.body;
  if (!deal_id) return next(new AppError('deal_id is required', 400));

  const dealResult = await query(
    `SELECT d.*, c.name AS client_name, c.company AS client_company
     FROM deals d
     LEFT JOIN clients c ON c.id = d.client_id
     WHERE d.id = $1 AND d.brand_id = $2`,
    [deal_id, brandId]
  );
  const deal = dealResult.rows[0];
  if (!deal) return next(new AppError('Deal not found', 404));

  const daysSinceCreated = Math.floor((Date.now() - new Date(deal.created_at).getTime()) / 86400000);

  const prompt = `You are a sales advisor. Analyze this deal and provide actionable advice.

Deal: ${deal.name}
Value: $${deal.value || 0}
Stage: ${deal.stage}
Client: ${deal.client_name || 'Unknown'}${deal.client_company ? ` at ${deal.client_company}` : ''}
Days in pipeline: ${daysSinceCreated}
Status: ${deal.status}

Respond ONLY with JSON:
{
  "advice": "1-2 sentences of specific, actionable advice for this deal",
  "next_steps": ["Step 1", "Step 2", "Step 3"],
  "risk_factors": ["Risk 1"],
  "win_probability": "estimated percentage as string, e.g. '65%'"
}`;

  const text = (await callAI('You are Surf, an AI assistant for agencies.', prompt)).trim() || '{}';
  let parsed;
  try { parsed = JSON.parse(text); } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return next(new AppError('AI error', 502));
    parsed = JSON.parse(match[0]);
  }

  res.json({ status: 'success', data: parsed });
});

export const getClientInsights = catchAsync(async (req, res, next) => {
  const { brandId, clientId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const aiClient = await getAnthropicClient();
  if (!aiClient) return next(new AppError('AI insights require an ANTHROPIC_API_KEY to be configured', 503));

  // Gather fresh health score + recent activities for context
  const [{ score, breakdown }, clientRow, activitiesResult] = await Promise.all([
    computeClientHealthScore(clientId, brandId),
    getClientById(clientId).catch(() => null),
    query(
      `SELECT type, description, created_at
       FROM client_activities
       WHERE client_id = $1 AND brand_id = $2
       ORDER BY created_at DESC LIMIT 5`,
      [clientId, brandId]
    ),
  ]);

  const recentActivity = activitiesResult.rows
    .map(a => `${a.type}: ${a.description || '(no description)'} (${new Date(a.created_at).toLocaleDateString()})`)
    .join('\n');

  const prompt = `You are a CRM analyst. Analyze this client's health data and return a JSON object.

Client: ${clientRow?.name || 'Unknown'}${clientRow?.company ? ` at ${clientRow.company}` : ''}
Overall Health Score: ${score}/100

Score breakdown:
- Payment health: ${breakdown.payment}/35 (tracks overdue invoices — 35 is best)
- Activity recency: ${breakdown.activity}/30 (tracks when we last logged a call/email/meeting)
- Delivery health: ${breakdown.delivery}/20 (tracks overdue tasks)
- Portal engagement: ${breakdown.engagement}/15 (tracks client portal logins)

Recent activity log:
${recentActivity || '(no recent activities logged)'}

Return ONLY a JSON object with these exact keys:
{
  "summary": "One or two sentences explaining the client's health situation in plain business language.",
  "risks": ["Risk 1", "Risk 2", "Risk 3"],
  "action": "One specific recommended action to take this week to improve this client relationship."
}`;

  const text = (await callAI('You are Surf, an AI assistant for agencies.', prompt)).trim() || '{}';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return next(new AppError('AI returned an unreadable response', 502));
    parsed = JSON.parse(match[0]);
  }

  res.json({
    status: 'success',
    data: {
      summary: parsed.summary || '',
      risks:   Array.isArray(parsed.risks) ? parsed.risks.slice(0, 3) : [],
      action:  parsed.action  || '',
    },
  });
});
