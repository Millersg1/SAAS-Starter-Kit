import { query } from '../config/database.js';

export const getCampaignsByBrand = async (brandId) => (await query(`SELECT * FROM email_campaigns WHERE brand_id = $1 AND is_active = TRUE ORDER BY created_at DESC`, [brandId])).rows;
export const getCampaignById = async (id) => (await query(`SELECT * FROM email_campaigns WHERE id = $1 AND is_active = TRUE`, [id])).rows[0] || null;

export const createCampaign = async (data) => {
  const { brand_id, name, subject, preview_text, html_content, text_content, from_name, from_email, created_by } = data;
  return (await query(
    `INSERT INTO email_campaigns (brand_id,name,subject,preview_text,html_content,text_content,from_name,from_email,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [brand_id, name, subject, preview_text || null, html_content || null, text_content || null, from_name || null, from_email || null, created_by]
  )).rows[0];
};

export const updateCampaign = async (id, data) => {
  const allowed = ['name','subject','preview_text','html_content','text_content','from_name','from_email','status','scheduled_at'];
  const updates = []; const params = []; let idx = 1;
  for (const k of allowed) { if (data[k] !== undefined) { updates.push(`${k} = $${idx}`); params.push(data[k]); idx++; } }
  if (!updates.length) return getCampaignById(id);
  params.push(id);
  return (await query(`UPDATE email_campaigns SET ${updates.join(',')} WHERE id = $${idx} RETURNING *`, params)).rows[0] || null;
};

export const deleteCampaign = async (id) => (await query(`UPDATE email_campaigns SET is_active = FALSE WHERE id = $1 RETURNING id`, [id])).rows[0] || null;

export const addRecipients = async (campaignId, recipients) => {
  if (!recipients.length) return;
  const values = recipients.map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`).join(',');
  const params = [campaignId, ...recipients.flatMap(r => [r.client_id || null, r.email, r.name || null])];
  await query(`INSERT INTO campaign_recipients (campaign_id,client_id,email,name) VALUES ${values} ON CONFLICT DO NOTHING`, params);
  await query(`UPDATE email_campaigns SET total_recipients = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = $1) WHERE id = $1`, [campaignId]);
};

export const getRecipients = async (campaignId) => (await query(`SELECT * FROM campaign_recipients WHERE campaign_id = $1 ORDER BY name ASC`, [campaignId])).rows;

export const updateRecipientStatus = async (id, status, error_message = null) => {
  await query(`UPDATE campaign_recipients SET status = $2, sent_at = CASE WHEN $2 = 'sent' THEN NOW() ELSE NULL END, error_message = $3 WHERE id = $1`, [id, status, error_message]);
};

export const incrementSentCount = async (campaignId) => { await query(`UPDATE email_campaigns SET sent_count = sent_count + 1 WHERE id = $1`, [campaignId]); };

export const markCampaignSent = async (id) => (await query(`UPDATE email_campaigns SET status = 'sent', sent_at = NOW() WHERE id = $1 RETURNING *`, [id])).rows[0] || null;
