import * as reputationModel from '../models/reputationModel.js';
import * as brandModel from '../models/brandModel.js';
import * as clientModel from '../models/clientModel.js';
import * as smsModel from '../models/smsModel.js';
import { sendReviewRequestEmail } from '../utils/emailUtils.js';

const auth = async (brandId, userId, res) => {
  const m = await brandModel.getBrandMember(brandId, userId);
  if (!m) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return null; }
  return m;
};

const API_BASE = process.env.API_URL || process.env.BACKEND_URL || 'https://api.saassurface.com/api';

function interpolate(template, vars) {
  return (template || '').replace(/\{(\w+)\}/g, (_, key) => vars[key] || '');
}

// ── Settings ──────────────────────────────────────────────────────────────────

export const getSettings = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const data = await reputationModel.getSettings(brandId);
    res.json({ status: 'success', data });
  } catch (e) { next(e); }
};

export const saveSettings = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    const { settings, platforms } = req.body;

    // Upsert each platform
    if (Array.isArray(platforms)) {
      for (const p of platforms) {
        if (p.platform) {
          await reputationModel.upsertPlatform(brandId, p.platform, {
            label: p.label,
            review_url: p.review_url,
            is_active: p.is_active,
          });
        }
      }
    }

    // Save settings JSONB
    if (settings && typeof settings === 'object') {
      await reputationModel.saveSettings(brandId, settings);
    }

    const updated = await reputationModel.getSettings(brandId);
    res.json({ status: 'success', data: updated });
  } catch (e) { next(e); }
};

// ── Stats ─────────────────────────────────────────────────────────────────────

export const getStats = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const stats = await reputationModel.getStats(brandId);
    res.json({ status: 'success', data: { stats } });
  } catch (e) { next(e); }
};

// ── Review Requests ───────────────────────────────────────────────────────────

export const listRequests = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const { client_id, status, limit, offset } = req.query;
    const requests = await reputationModel.getRequests(brandId, {
      clientId: client_id,
      status,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });
    res.json({ status: 'success', data: { requests } });
  } catch (e) { next(e); }
};

export const sendRequest = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;

    const { clientIds, channel, platform, message, reviewUrl } = req.body;
    if (!clientIds?.length || !channel) {
      return res.status(400).json({ status: 'fail', message: 'clientIds and channel are required' });
    }

    const brand = await brandModel.getBrandById(brandId);
    const brandName = brand?.name || 'Your Provider';
    const { settings, platforms } = await reputationModel.getSettings(brandId);

    // Resolve review URL: use provided or look up from platforms
    let resolvedUrl = reviewUrl;
    if (!resolvedUrl) {
      const platformRecord = platforms.find(p => p.platform === (platform || 'google') && p.review_url);
      resolvedUrl = platformRecord?.review_url || '';
    }

    // SMS connection if needed
    let twilioConn = null;
    if (channel === 'sms' || channel === 'both') {
      twilioConn = await smsModel.getTwilioConnection(brandId).catch(() => null);
    }

    const sent = [];
    const failed = [];

    for (const clientId of clientIds) {
      try {
        const client = await clientModel.getClientById(clientId);
        if (!client) continue;

        const vars = { client_name: client.name, brand_name: brandName, review_url: resolvedUrl };
        const channels = channel === 'both' ? ['email', 'sms'] : [channel];

        for (const ch of channels) {
          if (ch === 'email' && !client.email) continue;
          if (ch === 'sms' && (!client.phone || !twilioConn)) continue;

          const msgTemplate = ch === 'sms'
            ? (message || settings.default_sms_message)
            : (message || settings.default_email_message);
          const interpolated = interpolate(msgTemplate, vars);

          const record = await reputationModel.createRequest({
            brand_id: brandId,
            client_id: clientId,
            channel: ch,
            platform: platform || 'google',
            review_url: resolvedUrl,
            message: interpolated,
            trigger_source: 'manual',
          });

          const trackingUrl = `${API_BASE}/reputation/track/${record.tracking_token}`;

          if (ch === 'email') {
            sendReviewRequestEmail(client.email, client.name, brandName, interpolated, trackingUrl).catch(() => {});
          } else {
            const { default: twilio } = await import('twilio');
            const twilioClient = twilio(twilioConn.account_sid, twilioConn.auth_token);
            const smsBody = interpolate(message || settings.default_sms_message || '{client_name}, leave us a review: {review_url}', {
              ...vars,
              review_url: trackingUrl,
            });
            twilioClient.messages.create({ from: twilioConn.phone_number, to: client.phone, body: smsBody }).catch(() => {});
          }

          sent.push({ clientId, clientName: client.name, channel: ch });
        }
      } catch (err) {
        failed.push({ clientId, error: err.message });
      }
    }

    res.json({ status: 'success', data: { sent: sent.length, failed } });
  } catch (e) { next(e); }
};

// Public — click tracking redirect
export const trackClick = async (req, res) => {
  try {
    const { token } = req.params;
    const record = await reputationModel.markClicked(token);
    if (!record?.review_url) {
      return res.status(404).send('Review link not found.');
    }
    res.redirect(302, record.review_url);
  } catch (e) {
    res.status(500).send('Error processing review link.');
  }
};

export const markCompleted = async (req, res, next) => {
  try {
    const { brandId, requestId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const updated = await reputationModel.markCompleted(requestId, brandId);
    if (!updated) return res.status(404).json({ status: 'fail', message: 'Request not found' });
    res.json({ status: 'success', data: { request: updated } });
  } catch (e) { next(e); }
};

// ── Reviews ───────────────────────────────────────────────────────────────────

export const listReviews = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const { platform, min_rating, limit, offset } = req.query;
    const reviews = await reputationModel.getReviews(brandId, {
      platform,
      minRating: min_rating ? parseInt(min_rating) : undefined,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });
    res.json({ status: 'success', data: { reviews } });
  } catch (e) { next(e); }
};

export const addReview = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const review = await reputationModel.createReview({ brand_id: brandId, ...req.body });
    res.status(201).json({ status: 'success', data: { review } });
  } catch (e) { next(e); }
};

export const updateReview = async (req, res, next) => {
  try {
    const { brandId, reviewId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const review = await reputationModel.updateReview(reviewId, brandId, req.body);
    if (!review) return res.status(404).json({ status: 'fail', message: 'Review not found' });
    res.json({ status: 'success', data: { review } });
  } catch (e) { next(e); }
};

export const deleteReview = async (req, res, next) => {
  try {
    const { brandId, reviewId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    await reputationModel.deleteReview(reviewId, brandId);
    res.json({ status: 'success', message: 'Review deleted' });
  } catch (e) { next(e); }
};
