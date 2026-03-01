import { query } from '../config/database.js';

// 1×1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export const trackOpen = async (req, res) => {
  const { recipientId } = req.params;
  query(
    `UPDATE campaign_recipients SET opened_at = COALESCE(opened_at, NOW()), open_count = open_count + 1 WHERE id = $1`,
    [recipientId]
  ).then(() =>
    query(
      `UPDATE email_campaigns SET open_count = (
        SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = email_campaigns.id AND open_count > 0
       ) WHERE id = (SELECT campaign_id FROM campaign_recipients WHERE id = $1)`,
      [recipientId]
    )
  ).catch(() => {});
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate' });
  res.send(PIXEL);
};

export const trackClick = async (req, res) => {
  const { recipientId } = req.params;
  const { url } = req.query;
  query(
    `UPDATE campaign_recipients SET clicked_at = COALESCE(clicked_at, NOW()), click_count = click_count + 1 WHERE id = $1`,
    [recipientId]
  ).then(() =>
    query(
      `UPDATE email_campaigns SET click_count = (
        SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = email_campaigns.id AND click_count > 0
       ) WHERE id = (SELECT campaign_id FROM campaign_recipients WHERE id = $1)`,
      [recipientId]
    )
  ).catch(() => {});
  if (!url) return res.redirect('/');
  try { res.redirect(Buffer.from(url, 'base64').toString('utf8')); }
  catch { res.redirect('/'); }
};

// ── Drip Sequence Tracking ──────────────────────────────────────────────────

export const trackDripOpen = async (req, res) => {
  const { trackingId } = req.params;
  try {
    const decoded = Buffer.from(trackingId, 'base64url').toString('utf8');
    const [enrollmentId, stepNumber] = decoded.split(':');
    if (enrollmentId && stepNumber) {
      // Record tracking event
      query(
        `INSERT INTO email_tracking_events (enrollment_id, step_number, event_type)
         VALUES ($1, $2, 'open')`,
        [enrollmentId, parseInt(stepNumber)]
      ).catch(() => {});
      // Increment open_count on drip_sends
      query(
        `UPDATE drip_sends SET open_count = open_count + 1
         WHERE enrollment_id = $1 AND step_id = (
           SELECT id FROM drip_steps WHERE sequence_id = (
             SELECT sequence_id FROM drip_enrollments WHERE id = $1
           ) AND position = $2
         )`,
        [enrollmentId, parseInt(stepNumber)]
      ).catch(() => {});
    }
  } catch { /* non-critical */ }
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate' });
  res.send(PIXEL);
};

export const trackDripClick = async (req, res) => {
  const { trackingId } = req.params;
  const { url } = req.query;
  try {
    const decoded = Buffer.from(trackingId, 'base64url').toString('utf8');
    const [enrollmentId, stepNumber] = decoded.split(':');
    if (enrollmentId && stepNumber) {
      query(
        `INSERT INTO email_tracking_events (enrollment_id, step_number, event_type, metadata)
         VALUES ($1, $2, 'click', $3)`,
        [enrollmentId, parseInt(stepNumber), JSON.stringify({ url })]
      ).catch(() => {});
      query(
        `UPDATE drip_sends SET click_count = click_count + 1
         WHERE enrollment_id = $1 AND step_id = (
           SELECT id FROM drip_steps WHERE sequence_id = (
             SELECT sequence_id FROM drip_enrollments WHERE id = $1
           ) AND position = $2
         )`,
        [enrollmentId, parseInt(stepNumber)]
      ).catch(() => {});
    }
  } catch { /* non-critical */ }
  if (!url) return res.redirect('/');
  try { res.redirect(decodeURIComponent(url)); }
  catch { res.redirect('/'); }
};
