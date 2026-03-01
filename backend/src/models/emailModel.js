import { query } from '../config/database.js';
import { randomUUID } from 'crypto';

/**
 * Get email threads for a brand, optionally filtered by client.
 * Returns the latest email per thread with unread count.
 */
export const getThreadsByBrand = async (brandId, { client_id, page = 1, limit = 40 } = {}) => {
  const offset = (page - 1) * limit;
  const conditions = ['e.brand_id = $1'];
  const values = [brandId];

  if (client_id) {
    conditions.push(`e.client_id = $${values.length + 1}`);
    values.push(client_id);
  }

  const where = conditions.join(' AND ');
  values.push(limit, offset);

  const result = await query(
    `SELECT
       e.thread_id,
       e.subject,
       e.from_address,
       e.from_name,
       e.client_id,
       c.name AS client_name,
       MAX(e.sent_at) AS last_message_at,
       COUNT(*)::int AS message_count,
       COUNT(*) FILTER (WHERE e.is_read = FALSE AND e.direction = 'inbound')::int AS unread_count,
       (array_agg(e.body_text ORDER BY e.sent_at DESC))[1] AS snippet
     FROM emails e
     LEFT JOIN clients c ON c.id = e.client_id
     WHERE ${where}
     GROUP BY e.thread_id, e.subject, e.from_address, e.from_name, e.client_id, c.name
     ORDER BY MAX(e.sent_at) DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return result.rows;
};

/** Get all emails in a thread ordered chronologically */
export const getThreadEmails = async (brandId, threadId) => {
  const result = await query(
    `SELECT * FROM emails
     WHERE brand_id = $1 AND thread_id = $2
     ORDER BY sent_at ASC`,
    [brandId, threadId]
  );
  return result.rows;
};

/** Insert a new email record */
export const createEmail = async (data) => {
  const result = await query(
    `INSERT INTO emails (
       brand_id, connection_id, client_id, thread_id, message_id,
       in_reply_to, email_references, from_address, from_name,
       to_addresses, cc_addresses, subject, body_text, body_html,
       direction, is_read, sent_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (message_id) DO NOTHING
     RETURNING *`,
    [
      data.brand_id, data.connection_id || null, data.client_id || null,
      data.thread_id, data.message_id || null,
      data.in_reply_to || null, data.email_references || null,
      data.from_address, data.from_name || null,
      data.to_addresses, data.cc_addresses || null,
      data.subject || '(no subject)', data.body_text || null, data.body_html || null,
      data.direction || 'inbound', data.is_read || false,
      data.sent_at || new Date(),
    ]
  );
  return result.rows[0] || null;
};

/** Mark all inbound emails in a thread as read */
export const markThreadRead = async (brandId, threadId) => {
  await query(
    `UPDATE emails SET is_read = TRUE
     WHERE brand_id = $1 AND thread_id = $2 AND is_read = FALSE`,
    [brandId, threadId]
  );
};

/** Get total unread inbound email count for a brand */
export const getUnreadCount = async (brandId) => {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM emails
     WHERE brand_id = $1 AND is_read = FALSE AND direction = 'inbound'`,
    [brandId]
  );
  return result.rows[0]?.count || 0;
};

/**
 * Determine the thread_id for an incoming email.
 * Checks In-Reply-To and References headers against existing emails.
 * If a match is found, returns that email's thread_id.
 * Otherwise, generates a new UUID as thread_id.
 */
export const findThreadId = async (brandId, messageId, inReplyTo, references) => {
  // Check In-Reply-To first
  if (inReplyTo) {
    const result = await query(
      `SELECT thread_id FROM emails WHERE brand_id = $1 AND message_id = $2 LIMIT 1`,
      [brandId, inReplyTo]
    );
    if (result.rows.length) return result.rows[0].thread_id;
  }

  // Check References (space-separated message IDs)
  if (references) {
    const refs = references.split(/\s+/).filter(Boolean);
    for (const ref of refs) {
      const result = await query(
        `SELECT thread_id FROM emails WHERE brand_id = $1 AND message_id = $2 LIMIT 1`,
        [brandId, ref]
      );
      if (result.rows.length) return result.rows[0].thread_id;
    }
  }

  // No match — new thread
  return randomUUID();
};
