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
    const [recipients, variants] = await Promise.all([
      campaignModel.getRecipients(req.params.campaignId),
      campaignModel.getVariants(req.params.campaignId),
    ]);
    res.json({ status: 'success', data: { campaign, recipients, variants } });
  } catch (e) { next(e); }
};

export const createCampaign = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const campaign = await campaignModel.createCampaign({ ...req.body, brand_id: brandId, created_by: req.user.id });
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

export const addRecipients = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const { recipients } = req.body;
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'recipients array required' });
    }
    await campaignModel.addRecipients(req.params.campaignId, recipients);
    res.json({ status: 'success', message: `${recipients.length} recipient(s) added.` });
  } catch (e) { next(e); }
};

// ============================================
// A/B VARIANT HANDLERS
// ============================================

export const getVariants = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const variants = await campaignModel.getVariants(req.params.campaignId);
    res.json({ status: 'success', data: { variants } });
  } catch (e) { next(e); }
};

export const upsertVariant = async (req, res, next) => {
  try {
    const { brandId, campaignId, variantName } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    if (!['A', 'B'].includes(variantName)) {
      return res.status(400).json({ status: 'fail', message: 'Variant name must be A or B.' });
    }
    const variant = await campaignModel.upsertVariant(campaignId, variantName, req.body);
    res.json({ status: 'success', data: { variant } });
  } catch (e) { next(e); }
};

export const deleteVariant = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const deleted = await campaignModel.deleteVariant(req.params.variantId);
    if (!deleted) return res.status(404).json({ status: 'fail', message: 'Variant not found.' });
    res.json({ status: 'success', message: 'Variant deleted.' });
  } catch (e) { next(e); }
};

export const declareWinner = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const variant = await campaignModel.declareWinner(req.params.campaignId, req.params.variantId);
    if (!variant) return res.status(404).json({ status: 'fail', message: 'Variant not found.' });
    res.json({ status: 'success', data: { variant } });
  } catch (e) { next(e); }
};

// ============================================
// SEND (with A/B support)
// ============================================

export const sendCampaign = async (req, res, next) => {
  try {
    const { brandId, campaignId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const campaign = await campaignModel.getCampaignById(campaignId);
    if (!campaign) return res.status(404).json({ status: 'fail', message: 'Campaign not found' });
    if (campaign.status === 'sent') return res.status(400).json({ status: 'fail', message: 'Campaign already sent' });

    const [recipients, variants] = await Promise.all([
      campaignModel.getRecipients(campaignId),
      campaignModel.getVariants(campaignId),
    ]);
    if (!recipients.length) return res.status(400).json({ status: 'fail', message: 'No recipients added to this campaign' });

    await campaignModel.updateCampaign(campaignId, { status: 'sending' });
    res.json({ status: 'success', message: `Sending to ${recipients.length} recipients...` });

    setImmediate(async () => {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      });

      const baseUrl = process.env.APP_URL || process.env.BACKEND_URL || 'http://localhost:5000';

      // A/B: assign recipients to variants if 2+ variants defined
      const useAB = variants.length >= 2;
      const variantMap = {};

      if (useAB) {
        let cumulative = 0;
        const thresholds = variants.map(v => {
          cumulative += (v.send_percentage || 50);
          return { variant: v, threshold: cumulative };
        });
        for (const r of recipients) {
          const rand = Math.random() * 100;
          const assigned = thresholds.find(t => rand <= t.threshold) || thresholds[thresholds.length - 1];
          variantMap[r.id] = assigned.variant;
          await campaignModel.setRecipientVariant(r.id, assigned.variant.variant_name);
        }
      }

      for (const r of recipients) {
        try {
          const variant = useAB ? variantMap[r.id] : null;
          const subject = variant?.subject || campaign.subject;
          let html = variant?.html_content || campaign.html_content || `<p>${variant?.text_content || campaign.text_content}</p>`;

          html = html.replace(/href="(https?:\/\/[^"]+)"/gi, (match, url) => {
            const encoded = Buffer.from(url).toString('base64');
            return `href="${baseUrl}/api/track/click/${r.id}?url=${encoded}"`;
          });
          html += `<img src="${baseUrl}/api/track/open/${r.id}" width="1" height="1" style="display:none" alt="" />`;

          await transporter.sendMail({
            from: `${campaign.from_name || process.env.SMTP_FROM_NAME} <${campaign.from_email || process.env.SMTP_FROM_EMAIL}>`,
            to: r.email,
            subject,
            html,
            text: variant?.text_content || campaign.text_content || '',
          });

          await campaignModel.updateRecipientStatus(r.id, 'sent');
          await campaignModel.incrementSentCount(campaignId);
          if (useAB && variantMap[r.id]) {
            await campaignModel.incrementVariantCount(variantMap[r.id].id, 'sent_count');
          }
        } catch (err) {
          await campaignModel.updateRecipientStatus(r.id, 'failed', err.message);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await campaignModel.markCampaignSent(campaignId);
    });
  } catch (e) { next(e); }
};
