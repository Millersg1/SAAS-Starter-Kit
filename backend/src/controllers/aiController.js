import { getBrandMember } from '../models/brandModel.js';
import { getClientById } from '../models/clientModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

// Lazy-load the SDK so the server starts even if @anthropic-ai/sdk is not installed
let _anthropic = null;
const getAnthropicClient = async () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (_anthropic) return _anthropic;
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return _anthropic;
  } catch {
    return null;
  }
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

  const aiClient = await getAnthropicClient();
  if (!aiClient) return next(new AppError('AI drafting is not configured', 503));

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

  const message = await aiClient.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0]?.text?.trim() || '{}';

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

  const aiClient = await getAnthropicClient();
  if (!aiClient) return next(new AppError('AI drafting is not configured', 503));

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

  const message = await aiClient.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0]?.text?.trim() || '{}';

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
