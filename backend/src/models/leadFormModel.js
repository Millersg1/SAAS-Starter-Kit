import { query } from '../config/database.js';

export const getFormsByBrand = async (brandId) => (await query(`SELECT * FROM lead_forms WHERE brand_id = $1 AND is_active = TRUE ORDER BY created_at DESC`, [brandId])).rows;
export const getFormById = async (id) => (await query(`SELECT * FROM lead_forms WHERE id = $1 AND is_active = TRUE`, [id])).rows[0] || null;
export const getFormBySlug = async (slug) => (await query(`SELECT lf.*, b.name AS brand_name FROM lead_forms lf JOIN brands b ON b.id = lf.brand_id WHERE lf.slug = $1 AND lf.is_active = TRUE`, [slug])).rows[0] || null;

export const createForm = async (data) => {
  const { brand_id, name, slug, fields, thank_you_message } = data;
  return (await query(
    `INSERT INTO lead_forms (brand_id,name,slug,fields,thank_you_message) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [brand_id, name, slug, JSON.stringify(fields || []), thank_you_message || 'Thank you! We will be in touch shortly.']
  )).rows[0];
};

export const updateForm = async (id, data) => {
  const allowed = ['name','fields','thank_you_message','is_active'];
  const updates = []; const params = []; let idx = 1;
  for (const k of allowed) {
    if (data[k] !== undefined) {
      updates.push(`${k} = $${idx}`);
      params.push(k === 'fields' ? JSON.stringify(data[k]) : data[k]);
      idx++;
    }
  }
  if (!updates.length) return getFormById(id);
  params.push(id);
  return (await query(`UPDATE lead_forms SET ${updates.join(',')} WHERE id = $${idx} RETURNING *`, params)).rows[0] || null;
};

export const deleteForm = async (id) => (await query(`UPDATE lead_forms SET is_active = FALSE WHERE id = $1 RETURNING id`, [id])).rows[0] || null;

export const getSubmissionsByForm = async (formId) => (await query(`SELECT * FROM lead_submissions WHERE form_id = $1 ORDER BY submitted_at DESC`, [formId])).rows;
export const getSubmissionsByBrand = async (brandId) => (await query(`SELECT ls.*, lf.name AS form_name FROM lead_submissions ls JOIN lead_forms lf ON lf.id = ls.form_id WHERE ls.brand_id = $1 ORDER BY ls.submitted_at DESC`, [brandId])).rows;

export const createSubmission = async (data) => {
  const { form_id, brand_id, submission_data, name, email, phone, ip_address } = data;
  return (await query(
    `INSERT INTO lead_submissions (form_id,brand_id,data,name,email,phone,ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [form_id, brand_id, JSON.stringify(submission_data || {}), name || null, email || null, phone || null, ip_address || null]
  )).rows[0];
};

export const updateSubmissionStatus = async (id, status, converted_to_client_id = null) => (await query(
  `UPDATE lead_submissions SET status = $2, converted_to_client_id = $3 WHERE id = $1 RETURNING *`,
  [id, status, converted_to_client_id]
)).rows[0] || null;
