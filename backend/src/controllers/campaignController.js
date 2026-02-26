import * as campaignModel from '../models/campaignModel.js';
import * as brandModel from '../models/brandModel.js';
import nodemailer from 'nodemailer';

const auth = async (brandId, userId, res) => {
  const m = await brandModel.getBrandMember(brandId, userId);
  if (!m) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return null; }
  return m;
};

export const listCampaigns = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const campaigns = await campaignModel.getCampaignsByBrand(req.params.brandId);
    res.json({ status: 'success', data: { campaigns } });
  } catch (e) { next(e); }
};

export const getCampaign = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const campaign = await campaignModel.getCampaignById(req.params.campaignId);
    if (!campaign) return res.status(404).json({ status: 'fail', message: 'Campaign not found' });
    const recipients = await campaignModel.getRecipients(req.params.campaignId);
    res.json({ status: 'success', data: { campaign, recipients } });
  } catch (e) { next(e); }
};

export const createCampaign = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const campaign = await campaignModel.createCampaign({ ...req.body, brand_id: brandId, created_by: req.user.id });
    // Add recipients if provided
    if (Array.isArray(req.body.recipients) && req.body.recipients.length > 0) {
      await campaignModel.addRecipients(campaign.id, req.body.recipients);
    }
    res.status(201).json({ status: 'success', data: { campaign } });
  } catch (e) { next(e); }
};

export const updateCampaign = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const campaign = await campaignModel.updateCampaign(req.params.campaignId, req.body);
    if (!campaign) return res.status(404).json({ status: 'fail', message: 'Campaign not found' });
    if (Array.isArray(req.body.recipients)) await campaignModel.addRecipients(campaign.id, req.body.recipients);
    res.json({ status: 'success', data: { campaign } });
  } catch (e) { next(e); }
};

export const deleteCampaign = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    await campaignModel.deleteCampaign(req.params.campaignId);
    res.json({ status: 'success', message: 'Campaign deleted' });
  } catch (e) { next(e); }
};

export const sendCampaign = async (req, res, next) => {
  try {
    const { brandId, campaignId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const campaign = await campaignModel.getCampaignById(campaignId);
    if (!campaign) return res.status(404).json({ status: 'fail', message: 'Campaign not found' });
    if (campaign.status === 'sent') return res.status(400).json({ status: 'fail', message: 'Campaign already sent' });

    const recipients = await campaignModel.getRecipients(campaignId);
    if (!recipients.length) return res.status(400).json({ status: 'fail', message: 'No recipients added to this campaign' });

    await campaignModel.updateCampaign(campaignId, { status: 'sending' });
    res.json({ status: 'success', message: `Sending to ${recipients.length} recipients...` });

    // Send in background
    setImmediate(async () => {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      });

      const baseUrl = process.env.APP_URL || process.env.BACKEND_URL || 'http://localhost:5000';
      for (const r of recipients) {
        try {
          // Inject tracking pixel + wrap links for click tracking
          let html = campaign.html_content || `<p>${campaign.text_content}</p>`;
          html = html.replace(/href="(https?:\/\/[^"]+)"/gi, (match, url) => {
            const encoded = Buffer.from(url).toString('base64');
            return `href="${baseUrl}/api/track/click/${r.id}?url=${encoded}"`;
          });
          const pixel = `<img src="${baseUrl}/api/track/open/${r.id}" width="1" height="1" style="display:none" alt="" />`;
          html = html + pixel;

          await transporter.sendMail({
            from: `${campaign.from_name || process.env.SMTP_FROM_NAME} <${campaign.from_email || process.env.SMTP_FROM_EMAIL}>`,
            to: r.email,
            subject: campaign.subject,
            html,
            text: campaign.text_content || '',
          });
          await campaignModel.updateRecipientStatus(r.id, 'sent');
          await campaignModel.incrementSentCount(campaignId);
        } catch (err) {
          await campaignModel.updateRecipientStatus(r.id, 'failed', err.message);
        }
        // Brief pause between sends to avoid rate limits
        await new Promise(r => setTimeout(r, 100));
      }
      await campaignModel.markCampaignSent(campaignId);
    });
  } catch (e) { next(e); }
};
