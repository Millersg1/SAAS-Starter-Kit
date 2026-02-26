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
