import * as funnelModel from '../models/funnelModel.js';
import * as brandModel from '../models/brandModel.js';

const auth = async (brandId, userId, res) => {
  const m = await brandModel.getBrandMember(brandId, userId);
  if (!m) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return null; }
  return m;
};

// ── Funnels ───────────────────────────────────────────────────────────────────

export const listFunnels = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const funnels = await funnelModel.getFunnels(brandId);
    res.json({ status: 'success', data: { funnels } });
  } catch (e) { next(e); }
};

export const createFunnel = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const { name, goal } = req.body;
    if (!name?.trim()) return res.status(400).json({ status: 'fail', message: 'name is required' });
    const funnel = await funnelModel.createFunnel({ brand_id: brandId, name: name.trim(), goal });
    // Create a default first step
    await funnelModel.createStep({ funnel_id: funnel.id, brand_id: brandId, name: 'Page 1', blocks: [] });
    res.status(201).json({ status: 'success', data: { funnel } });
  } catch (e) { next(e); }
};

export const getFunnel = async (req, res, next) => {
  try {
    const { brandId, funnelId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const funnel = await funnelModel.getFunnelById(funnelId, brandId);
    if (!funnel) return res.status(404).json({ status: 'fail', message: 'Funnel not found' });
    const steps = await funnelModel.getSteps(funnelId);
    res.json({ status: 'success', data: { funnel, steps } });
  } catch (e) { next(e); }
};

export const updateFunnel = async (req, res, next) => {
  try {
    const { brandId, funnelId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const funnel = await funnelModel.updateFunnel(funnelId, brandId, req.body);
    if (!funnel) return res.status(404).json({ status: 'fail', message: 'Funnel not found' });
    res.json({ status: 'success', data: { funnel } });
  } catch (e) { next(e); }
};

export const deleteFunnel = async (req, res, next) => {
  try {
    const { brandId, funnelId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    await funnelModel.deleteFunnel(funnelId, brandId);
    res.json({ status: 'success', message: 'Funnel deleted' });
  } catch (e) { next(e); }
};

export const getFunnelStats = async (req, res, next) => {
  try {
    const { brandId, funnelId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const stats = await funnelModel.getStats(funnelId);
    res.json({ status: 'success', data: { stats } });
  } catch (e) { next(e); }
};

// ── Steps ─────────────────────────────────────────────────────────────────────

export const listSteps = async (req, res, next) => {
  try {
    const { brandId, funnelId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const steps = await funnelModel.getSteps(funnelId);
    res.json({ status: 'success', data: { steps } });
  } catch (e) { next(e); }
};

export const createStep = async (req, res, next) => {
  try {
    const { brandId, funnelId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const { name, blocks } = req.body;
    if (!name?.trim()) return res.status(400).json({ status: 'fail', message: 'name is required' });
    const step = await funnelModel.createStep({ funnel_id: funnelId, brand_id: brandId, name: name.trim(), blocks });
    res.status(201).json({ status: 'success', data: { step } });
  } catch (e) { next(e); }
};

export const getStep = async (req, res, next) => {
  try {
    const { brandId, funnelId, stepId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const step = await funnelModel.getStepById(stepId, funnelId);
    if (!step) return res.status(404).json({ status: 'fail', message: 'Step not found' });
    res.json({ status: 'success', data: { step } });
  } catch (e) { next(e); }
};

export const updateStep = async (req, res, next) => {
  try {
    const { brandId, funnelId, stepId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const step = await funnelModel.updateStep(stepId, funnelId, req.body);
    if (!step) return res.status(404).json({ status: 'fail', message: 'Step not found' });
    res.json({ status: 'success', data: { step } });
  } catch (e) { next(e); }
};

export const deleteStep = async (req, res, next) => {
  try {
    const { brandId, funnelId, stepId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    await funnelModel.deleteStep(stepId, funnelId);
    res.json({ status: 'success', message: 'Step deleted' });
  } catch (e) { next(e); }
};

export const duplicateStep = async (req, res, next) => {
  try {
    const { brandId, funnelId, stepId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const step = await funnelModel.duplicateStep(stepId, funnelId, brandId);
    if (!step) return res.status(404).json({ status: 'fail', message: 'Step not found' });
    res.status(201).json({ status: 'success', data: { step } });
  } catch (e) { next(e); }
};

export const reorderSteps = async (req, res, next) => {
  try {
    const { brandId, funnelId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ status: 'fail', message: 'ids array required' });
    await funnelModel.reorderSteps(funnelId, ids);
    res.json({ status: 'success', message: 'Steps reordered' });
  } catch (e) { next(e); }
};

// ── Public ────────────────────────────────────────────────────────────────────

export const publicViewFunnel = async (req, res, next) => {
  try {
    const { funnelSlug } = req.params;
    // We need brand_id — look up funnel by slug across all brands
    // For simplicity, return the first published funnel with this slug and its first step
    const result = await import('../config/database.js').then(m =>
      m.query(
        `SELECT f.brand_id, fs.slug AS step_slug
         FROM funnels f
         JOIN funnel_steps fs ON fs.funnel_id = f.id
         WHERE f.slug = $1 AND f.status = 'published'
         ORDER BY fs.step_order ASC LIMIT 1`,
        [funnelSlug]
      )
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ status: 'fail', message: 'Funnel not found' });

    // Return first step data
    const step = await funnelModel.getStepBySlug(funnelSlug, row.step_slug);
    if (!step) return res.status(404).json({ status: 'fail', message: 'Funnel not found' });

    funnelModel.recordAnalytics({
      funnel_id: step.funnel_id, step_id: step.id, brand_id: step.brand_id,
      event_type: 'view', visitor_id: req.headers['x-visitor-id'],
      referrer: req.headers.referer, utm_source: req.query.utm_source,
      utm_medium: req.query.utm_medium, utm_campaign: req.query.utm_campaign,
    }).catch(() => {});

    res.json({ status: 'success', data: { step, funnelSlug, stepSlug: row.step_slug } });
  } catch (e) { next(e); }
};

export const publicViewStep = async (req, res, next) => {
  try {
    const { funnelSlug, stepSlug } = req.params;
    const step = await funnelModel.getStepBySlug(funnelSlug, stepSlug);
    if (!step) return res.status(404).json({ status: 'fail', message: 'Page not found' });

    funnelModel.recordAnalytics({
      funnel_id: step.funnel_id, step_id: step.id, brand_id: step.brand_id,
      event_type: 'view', visitor_id: req.headers['x-visitor-id'],
      referrer: req.headers.referer, utm_source: req.query.utm_source,
      utm_medium: req.query.utm_medium, utm_campaign: req.query.utm_campaign,
    }).catch(() => {});

    res.json({ status: 'success', data: { step, funnelSlug, stepSlug } });
  } catch (e) { next(e); }
};

export const publicSubmitForm = async (req, res, next) => {
  try {
    const { stepId } = req.params;
    const { formData, redirectUrl, successMessage } = req.body;

    // Get step to find funnel/brand info
    const stepResult = await import('../config/database.js').then(m =>
      m.query(
        `SELECT fs.*, f.brand_id, f.slug AS funnel_slug
         FROM funnel_steps fs
         JOIN funnels f ON fs.funnel_id = f.id
         WHERE fs.id = $1 AND f.status = 'published'`,
        [stepId]
      )
    );
    const step = stepResult.rows[0];
    if (!step) return res.status(404).json({ status: 'fail', message: 'Form not found' });

    // Record conversion analytics
    funnelModel.recordAnalytics({
      funnel_id: step.funnel_id, step_id: step.id, brand_id: step.brand_id,
      event_type: 'conversion', visitor_id: req.headers['x-visitor-id'],
    }).catch(() => {});

    // Save lead if we have contact data
    if (formData && Object.keys(formData).length > 0) {
      const { query: dbQuery } = await import('../config/database.js');
      const name = formData['Full Name'] || formData['Name'] || formData['name'] || '';
      const email = formData['Email'] || formData['email'] || '';
      const phone = formData['Phone'] || formData['phone'] || '';
      await dbQuery(
        `INSERT INTO lead_form_submissions
           (brand_id, form_id, name, email, phone, submission_data, ip_address)
         VALUES ($1, NULL, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [step.brand_id, name, email, phone, JSON.stringify(formData), req.ip || null]
      ).catch(() => {}); // Non-fatal if lead_form_submissions requires form_id FK
    }

    // Determine redirect — next step or custom URL
    let nextStepUrl = null;
    if (step.next_step_id) {
      const nextRes = await import('../config/database.js').then(m =>
        m.query(`SELECT slug FROM funnel_steps WHERE id = $1`, [step.next_step_id])
      );
      if (nextRes.rows[0]) {
        nextStepUrl = `/lp/${step.funnel_slug}/${nextRes.rows[0].slug}`;
      }
    }

    res.json({
      status: 'success',
      data: {
        redirectUrl: redirectUrl || nextStepUrl || null,
        successMessage: successMessage || 'Thank you! We\'ll be in touch soon.',
      },
    });
  } catch (e) { next(e); }
};
