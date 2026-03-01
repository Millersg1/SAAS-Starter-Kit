import { query } from '../config/database.js';
import * as emailConnectionModel from '../models/emailConnectionModel.js';
import * as emailModel from '../models/emailModel.js';

export const syncEmailConnection = async (connection) => {
  let ImapFlow, simpleParser;
  try {
    ({ ImapFlow } = await import('imapflow'));
    ({ simpleParser } = await import('mailparser'));
  } catch {
    console.error('imapflow or mailparser not installed — email sync skipped');
    return;
  }

  const client = new ImapFlow({
    host: connection.imap_host,
    port: connection.imap_port || 993,
    secure: true,
    auth: { user: connection.imap_user, pass: connection.imap_password },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      // Get all clients for this brand to match emails against
      const clientsResult = await query(
        `SELECT id, email, name FROM clients WHERE brand_id = $1 AND is_active = TRUE AND email IS NOT NULL`,
        [connection.brand_id]
      );
      const clientMap = new Map(clientsResult.rows.map(c => [c.email.toLowerCase(), c]));

      for await (const msg of client.fetch({ since }, { envelope: true, source: true })) {
        const from = msg.envelope.from?.[0];
        if (!from) continue;
        const fromEmail = `${from.mailbox}@${from.host}`.toLowerCase();
        const toList = (msg.envelope.to || []).map(t => `${t.mailbox}@${t.host}`.toLowerCase());

        const matchedClient = clientMap.get(fromEmail) || toList.map(e => clientMap.get(e)).find(Boolean);
        if (!matchedClient) continue;

        const msgId = msg.envelope.messageId;
        // Check if we already stored this email in the emails table
        if (msgId) {
          const exists = await query(
            `SELECT id FROM emails WHERE brand_id = $1 AND message_id = $2`,
            [connection.brand_id, msgId]
          );
          if (exists.rows.length) continue;
        }

        // Parse the full raw message
        let parsed;
        try {
          parsed = await simpleParser(msg.source);
        } catch {
          continue; // skip unparseable messages
        }

        const subject = parsed.subject || msg.envelope.subject || '(no subject)';
        const sentDate = parsed.date || msg.envelope.date || new Date();
        const direction = clientMap.get(fromEmail) ? 'inbound' : 'outbound';

        const inReplyTo = parsed.inReplyTo || null;
        const references = parsed.references
          ? (Array.isArray(parsed.references) ? parsed.references.join(' ') : String(parsed.references))
          : null;

        const ccList = (msg.envelope.cc || []).map(c => `${c.mailbox}@${c.host}`).join(', ');

        // Determine thread
        const threadId = await emailModel.findThreadId(connection.brand_id, msgId, inReplyTo, references);

        // Store full email
        await emailModel.createEmail({
          brand_id: connection.brand_id,
          connection_id: connection.id,
          client_id: matchedClient.id,
          thread_id: threadId,
          message_id: msgId || null,
          in_reply_to: inReplyTo,
          email_references: references,
          from_address: fromEmail,
          from_name: from.name || null,
          to_addresses: toList.join(', '),
          cc_addresses: ccList || null,
          subject,
          body_text: parsed.text || null,
          body_html: parsed.html || null,
          direction,
          is_read: false,
          sent_at: sentDate,
        });

        // Also log to client_activities for the activity feed
        await query(
          `INSERT INTO client_activities (brand_id, client_id, user_id, activity_type, title, body, data)
           VALUES ($1, $2, NULL, 'email', $3, $4, $5)`,
          [
            connection.brand_id,
            matchedClient.id,
            `${direction === 'inbound' ? '← ' : '→ '}Email: ${subject}`,
            `From: ${fromEmail}\nDate: ${sentDate.toISOString()}`,
            JSON.stringify({ message_id: msgId || null, direction, from: fromEmail, subject, date: sentDate })
          ]
        );
      }
    } finally {
      lock.release();
    }

    await client.logout();
    await emailConnectionModel.updateLastSynced(connection.id);
    console.log(`✅ Email sync complete for ${connection.email_address}`);
  } catch (err) {
    console.error(`❌ Email sync failed for ${connection.email_address}:`, err.message);
    try { await client.logout(); } catch { /* ignore */ }
  }
};
