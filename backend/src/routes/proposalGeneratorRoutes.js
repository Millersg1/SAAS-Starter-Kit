import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { getBrandMember } from '../models/brandModel.js';

const router = express.Router();

router.use(protect);

const OPENAI_MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are a professional proposal writer for agencies. Generate detailed, client-ready proposals. Return JSON with: title, executive_summary, scope_sections[{title, description}], deliverables[], timeline_weeks, items[{description, quantity, unit_price}], terms, notes.

Rules:
- Be professional, persuasive, and specific
- Scope sections should be detailed paragraphs
- Items should have realistic pricing that respects the given budget
- Timeline should be realistic for the deliverables
- Return ONLY valid JSON, no markdown fences`;

async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// ── POST /:brandId/generate — Generate a proposal from a brief ───────────────
router.post('/:brandId/generate', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const { client_id, brief, budget, timeline } = req.body;
  if (!brief) return res.status(400).json({ message: 'Brief is required' });

  // Get client info if provided
  let clientInfo = '';
  if (client_id) {
    const clientResult = await query(
      `SELECT name, company, industry FROM clients WHERE id = $1 AND brand_id = $2`,
      [client_id, req.params.brandId]
    );
    if (clientResult.rows.length) {
      const c = clientResult.rows[0];
      clientInfo = `\nClient: ${c.name}${c.company ? ` (${c.company})` : ''}${c.industry ? `, Industry: ${c.industry}` : ''}`;
    }
  }

  // Get brand info for context
  const brandResult = await query(`SELECT name FROM brands WHERE id = $1`, [req.params.brandId]);
  const brandName = brandResult.rows[0]?.name || 'Our Agency';

  const userPrompt = `Generate a professional proposal for the following:
${clientInfo}
Agency: ${brandName}
Brief: ${brief}
${budget ? `Budget: $${budget}` : ''}
${timeline ? `Timeline: ${timeline}` : ''}

Generate a complete, detailed proposal.`;

  const proposal = await callOpenAI([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]);

  res.json({ status: 'success', data: { proposal } });
}));

// ── POST /:brandId/generate-and-save — Generate and save to proposals table ──
router.post('/:brandId/generate-and-save', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const { client_id, brief, budget, timeline } = req.body;
  if (!brief) return res.status(400).json({ message: 'Brief is required' });
  if (!client_id) return res.status(400).json({ message: 'client_id is required to save a proposal' });

  // Verify client belongs to this brand
  const clientResult = await query(
    `SELECT id, name, company, industry FROM clients WHERE id = $1 AND brand_id = $2`,
    [client_id, req.params.brandId]
  );
  if (!clientResult.rows.length) {
    return res.status(404).json({ message: 'Client not found' });
  }
  const client = clientResult.rows[0];

  const brandResult = await query(`SELECT name FROM brands WHERE id = $1`, [req.params.brandId]);
  const brandName = brandResult.rows[0]?.name || 'Our Agency';

  const userPrompt = `Generate a professional proposal for the following:
Client: ${client.name}${client.company ? ` (${client.company})` : ''}${client.industry ? `, Industry: ${client.industry}` : ''}
Agency: ${brandName}
Brief: ${brief}
${budget ? `Budget: $${budget}` : ''}
${timeline ? `Timeline: ${timeline}` : ''}

Generate a complete, detailed proposal.`;

  const generated = await callOpenAI([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]);

  // Calculate total from items
  const total = (generated.items || []).reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0);
  }, 0);

  // Build proposal content from scope sections
  const content = [
    `## Executive Summary\n${generated.executive_summary || ''}`,
    ...(generated.scope_sections || []).map(s => `## ${s.title}\n${s.description}`),
    generated.deliverables?.length ? `## Deliverables\n${generated.deliverables.map(d => `- ${d}`).join('\n')}` : '',
    generated.terms ? `## Terms & Conditions\n${generated.terms}` : '',
    generated.notes ? `## Notes\n${generated.notes}` : '',
  ].filter(Boolean).join('\n\n');

  // Save the proposal
  const proposalResult = await query(
    `INSERT INTO proposals (brand_id, client_id, title, content, total, status, created_by, valid_until)
     VALUES ($1, $2, $3, $4, $5, 'draft', $6, NOW() + INTERVAL '30 days')
     RETURNING *`,
    [req.params.brandId, client_id, generated.title || 'Untitled Proposal', content, total, req.user.id]
  );

  const proposalId = proposalResult.rows[0].id;

  // Save proposal items
  for (const item of (generated.items || [])) {
    await query(
      `INSERT INTO proposal_items (proposal_id, description, quantity, unit_price)
       VALUES ($1, $2, $3, $4)`,
      [proposalId, item.description, parseFloat(item.quantity) || 1, parseFloat(item.unit_price) || 0]
    );
  }

  // Fetch saved proposal with items
  const savedProposal = proposalResult.rows[0];
  const itemsResult = await query(
    `SELECT * FROM proposal_items WHERE proposal_id = $1 ORDER BY created_at`,
    [proposalId]
  );

  res.json({
    status: 'success',
    data: {
      proposal: { ...savedProposal, items: itemsResult.rows },
      generated, // Include raw AI output for reference
    },
    message: 'Proposal generated and saved as draft',
  });
}));

export default router;
