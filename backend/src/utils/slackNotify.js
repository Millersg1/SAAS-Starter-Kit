import { query } from '../config/database.js';

const EVENT_FORMATTERS = {
  'client.created': (data) => ({
    text: `New client created: ${data.name || 'Unknown'}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: ':bust_in_silhouette: New Client Created', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Name:*\n${data.name || 'N/A'}` },
          { type: 'mrkdwn', text: `*Email:*\n${data.email || 'N/A'}` },
        ],
      },
      ...(data.company ? [{
        type: 'section',
        fields: [{ type: 'mrkdwn', text: `*Company:*\n${data.company}` }],
      }] : []),
    ],
  }),

  'invoice.paid': (data) => ({
    text: `Invoice #${data.invoice_number || data.id || '?'} paid`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: ':white_check_mark: Invoice Paid', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Invoice:*\n#${data.invoice_number || data.id || '?'}` },
          { type: 'mrkdwn', text: `*Amount:*\n$${Number(data.amount || 0).toFixed(2)}` },
          { type: 'mrkdwn', text: `*Client:*\n${data.client_name || 'N/A'}` },
          { type: 'mrkdwn', text: `*Paid At:*\n${data.paid_at || new Date().toISOString()}` },
        ],
      },
    ],
  }),

  'deal.won': (data) => ({
    text: `Deal won: ${data.title || data.name || 'Unknown'}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: ':tada: Deal Won', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Deal:*\n${data.title || data.name || 'N/A'}` },
          { type: 'mrkdwn', text: `*Value:*\n$${Number(data.value || 0).toFixed(2)}` },
          ...(data.client_name ? [{ type: 'mrkdwn', text: `*Client:*\n${data.client_name}` }] : []),
          ...(data.owner ? [{ type: 'mrkdwn', text: `*Owner:*\n${data.owner}` }] : []),
        ],
      },
    ],
  }),

  'lead.submitted': (data) => ({
    text: `New lead submitted: ${data.name || data.email || 'Unknown'}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: ':incoming_envelope: New Lead Submitted', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Name:*\n${data.name || 'N/A'}` },
          { type: 'mrkdwn', text: `*Email:*\n${data.email || 'N/A'}` },
          ...(data.source ? [{ type: 'mrkdwn', text: `*Source:*\n${data.source}` }] : []),
          ...(data.phone ? [{ type: 'mrkdwn', text: `*Phone:*\n${data.phone}` }] : []),
        ],
      },
    ],
  }),

  'booking.created': (data) => ({
    text: `New booking: ${data.title || data.service || 'Appointment'}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: ':calendar: New Booking Created', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Booking:*\n${data.title || data.service || 'N/A'}` },
          { type: 'mrkdwn', text: `*Client:*\n${data.client_name || 'N/A'}` },
          ...(data.date ? [{ type: 'mrkdwn', text: `*Date:*\n${data.date}` }] : []),
          ...(data.time ? [{ type: 'mrkdwn', text: `*Time:*\n${data.time}` }] : []),
        ],
      },
    ],
  }),

  'proposal.accepted': (data) => ({
    text: `Proposal accepted: ${data.title || 'Unknown'}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: ':handshake: Proposal Accepted', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Proposal:*\n${data.title || 'N/A'}` },
          { type: 'mrkdwn', text: `*Client:*\n${data.client_name || 'N/A'}` },
          ...(data.value ? [{ type: 'mrkdwn', text: `*Value:*\n$${Number(data.value).toFixed(2)}` }] : []),
        ],
      },
    ],
  }),

  'task.completed': (data) => ({
    text: `Task completed: ${data.title || data.name || 'Unknown'}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: ':white_check_mark: Task Completed', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Task:*\n${data.title || data.name || 'N/A'}` },
          ...(data.project ? [{ type: 'mrkdwn', text: `*Project:*\n${data.project}` }] : []),
          ...(data.assignee ? [{ type: 'mrkdwn', text: `*Assignee:*\n${data.assignee}` }] : []),
          ...(data.completed_by ? [{ type: 'mrkdwn', text: `*Completed By:*\n${data.completed_by}` }] : []),
        ],
      },
    ],
  }),
};

/**
 * Send a Slack notification for a given brand and event.
 * Fire-and-forget: catches all errors internally and never throws.
 *
 * @param {string} brandId - The brand UUID
 * @param {string} event   - Event name (e.g. 'invoice.paid')
 * @param {object} data    - Event-specific payload used to format the message
 */
export async function sendSlackNotification(brandId, event, data = {}) {
  try {
    const result = await query(
      `SELECT webhook_url, channel, events
       FROM slack_integrations
       WHERE brand_id = $1 AND is_active = TRUE
       LIMIT 1`,
      [brandId],
    );

    if (result.rows.length === 0) return;

    const config = result.rows[0];
    const events = Array.isArray(config.events) ? config.events : [];

    if (!events.includes(event)) return;

    const formatter = EVENT_FORMATTERS[event];
    if (!formatter) return;

    const payload = formatter(data);

    // If a channel override is stored, attach it
    if (config.channel) {
      payload.channel = config.channel;
    }

    await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Fire-and-forget — log but never propagate
    console.error(`[slackNotify] Failed for brand=${brandId} event=${event}:`, err.message);
  }
}

export const SUPPORTED_EVENTS = Object.keys(EVENT_FORMATTERS);
