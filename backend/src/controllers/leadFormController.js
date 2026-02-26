import * as leadFormModel from '../models/leadFormModel.js';
import * as brandModel from '../models/brandModel.js';
import * as clientModel from '../models/clientModel.js';
import { sendLeadNotificationEmail } from '../utils/emailUtils.js';
import { query } from '../config/database.js';

const auth = async (brandId, userId, res) => {
  const m = await brandModel.getBrandMember(brandId, userId);
  if (!m) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return null; }
  return m;
};

export const listForms = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const forms = await leadFormModel.getFormsByBrand(req.params.brandId);
    res.json({ status: 'success', data: { forms } });
  } catch (e) { next(e); }
};

export const createForm = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
    const form = await leadFormModel.createForm({ ...req.body, slug, brand_id: brandId });
    res.status(201).json({ status: 'success', data: { form } });
  } catch (e) { next(e); }
};

export const updateForm = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const form = await leadFormModel.updateForm(req.params.formId, req.body);
    if (!form) return res.status(404).json({ status: 'fail', message: 'Form not found' });
    res.json({ status: 'success', data: { form } });
  } catch (e) { next(e); }
};

export const deleteForm = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    await leadFormModel.deleteForm(req.params.formId);
    res.json({ status: 'success', message: 'Form deleted' });
  } catch (e) { next(e); }
};

export const listSubmissions = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const submissions = req.params.formId
      ? await leadFormModel.getSubmissionsByForm(req.params.formId)
      : await leadFormModel.getSubmissionsByBrand(req.params.brandId);
    res.json({ status: 'success', data: { submissions } });
  } catch (e) { next(e); }
};

// Public: get form structure for rendering
export const getPublicFormView = async (req, res, next) => {
  try {
    const form = await leadFormModel.getFormBySlug(req.params.slug);
    if (!form || !form.is_active) return res.status(404).json({ status: 'fail', message: 'Form not found' });
    const { id, name, slug, fields, thank_you_message, brand_name } = form;
    res.json({ status: 'success', data: { form: { id, name, slug, fields, thank_you_message, brand_name } } });
  } catch (e) { next(e); }
};

// Public: submit a form
export const submitForm = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const form = await leadFormModel.getFormBySlug(slug);
    if (!form || !form.is_active) return res.status(404).json({ status: 'fail', message: 'Form not found' });

    const data = req.body;
    const name = data.name || data.Name || null;
    const email = data.email || data.Email || null;
    const phone = data.phone || data.Phone || null;
    const ip_address = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;

    const submission = await leadFormModel.createSubmission({ form_id: form.id, brand_id: form.brand_id, submission_data: data, name, email, phone, ip_address });

    // Notify brand owner
    try {
      const brand = await brandModel.getBrandById(form.brand_id);
      if (brand) {
        const ownerRes = await query(`SELECT email, name FROM users WHERE id = $1`, [brand.owner_id]);
        if (ownerRes.rows[0]) sendLeadNotificationEmail(ownerRes.rows[0].email, ownerRes.rows[0].name, form.name, name, email).catch(() => {});
      }
    } catch { /* non-critical */ }

    res.status(201).json({ status: 'success', message: form.thank_you_message, data: { id: submission.id } });
  } catch (e) { next(e); }
};

// Convert submission to client
export const convertToClient = async (req, res, next) => {
  try {
    const { brandId, submissionId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    const submissions = await leadFormModel.getSubmissionsByBrand(brandId);
    const sub = submissions.find(s => s.id === submissionId);
    if (!sub) return res.status(404).json({ status: 'fail', message: 'Submission not found' });

    const client = await clientModel.createClient({ brand_id: brandId, name: sub.name || 'Lead', email: sub.email, phone: sub.phone, status: 'active', client_type: 'regular', created_by: req.user.id });
    await leadFormModel.updateSubmissionStatus(submissionId, 'converted', client.id);
    res.status(201).json({ status: 'success', data: { client } });
  } catch (e) { next(e); }
};
