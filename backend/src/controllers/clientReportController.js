import { getBrandMember, getBrandById, getBrandVoice } from '../models/brandModel.js';
import { getClientById } from '../models/clientModel.js';
import * as reportModel from '../models/clientReportModel.js';

const requireMember = async (brandId, userId) => {
  const member = await getBrandMember(brandId, userId);
  if (!member) throw Object.assign(new Error('Access denied'), { status: 403 });
};

// Lazy Anthropic client (same pattern as aiController)
let _anthropic = null;
const getAI = async () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (_anthropic) return _anthropic;
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return _anthropic;
  } catch { return null; }
};

export const listReports = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const reports = await reportModel.getReports(brandId, req.query.client_id);
    res.json({ success: true, data: reports });
  } catch (err) { res.status(err.status || 500).json({ success: false, message: err.message }); }
};

export const getReport = async (req, res) => {
  try {
    const { brandId, reportId } = req.params;
    await requireMember(brandId, req.user.id);
    const report = await reportModel.getReportById(reportId, brandId);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (err) { res.status(err.status || 500).json({ success: false, message: err.message }); }
};

export const generateReport = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);

    const { client_id, period_start, period_end, title } = req.body;
    if (!period_start || !period_end) {
      return res.status(400).json({ success: false, message: 'period_start and period_end are required' });
    }

    // Aggregate real data from the database
    const metrics = await reportModel.aggregateClientMetrics(
      brandId, client_id, new Date(period_start), new Date(period_end)
    );

    // Fetch context for better AI narrative
    const [brand, client] = await Promise.all([
      getBrandById(brandId).catch(() => null),
      client_id ? getClientById(client_id).catch(() => null) : null,
    ]);

    const brandVoice = await getBrandVoice(brandId).catch(() => ({}));
    const toneGuide = brandVoice.tone ? `Use a ${brandVoice.tone} tone.` : 'Use a professional, client-friendly tone.';

    let summaryText = '';
    const aiClient = await getAI();

    if (aiClient) {
      const metricsJson = JSON.stringify(metrics, null, 2);
      const prompt = `You are writing a monthly client report for ${brand?.name || 'an agency'}.
Client: ${client?.name || 'Valued Client'}
Report period: ${period_start} to ${period_end}
${toneGuide}

Here are the metrics for this period:
${metricsJson}

Write a concise, professional executive summary (3-5 paragraphs) that:
1. Opens with a positive overview of the period
2. Highlights key accomplishments (paid invoices, completed projects, published content, engagement stats)
3. Notes any outstanding items that need attention
4. Closes with forward-looking encouragement

Return ONLY valid JSON:
{
  "summary": "The full executive summary text here..."
}`;

      try {
        const message = await aiClient.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        });
        const text = message.content[0]?.text?.trim() || '{}';
        const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
        summaryText = parsed.summary || '';
      } catch { summaryText = ''; }
    }

    const reportTitle = title || `${client?.name || 'Client'} Report — ${new Date(period_start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

    const report = await reportModel.createReport({
      brand_id: brandId,
      client_id: client_id || null,
      title: reportTitle,
      period_start,
      period_end,
      summary_text: summaryText,
      metrics,
      created_by: req.user.id,
    });

    res.status(201).json({ success: true, data: report });
  } catch (err) { res.status(err.status || 500).json({ success: false, message: err.message }); }
};

export const deleteReport = async (req, res) => {
  try {
    const { brandId, reportId } = req.params;
    await requireMember(brandId, req.user.id);
    await reportModel.deleteReport(reportId, brandId);
    res.json({ success: true, message: 'Report deleted' });
  } catch (err) { res.status(err.status || 500).json({ success: false, message: err.message }); }
};
