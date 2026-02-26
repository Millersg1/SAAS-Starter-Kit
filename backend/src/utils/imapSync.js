import { query } from '../config/database.js';
import * as emailConnectionModel from '../models/emailConnectionModel.js';

export const syncEmailConnection = async (connection) => {
  let ImapFlow;
  try {
    ({ ImapFlow } = await import('imapflow'));
  } catch {
    console.error('imapflow not installed — email sync skipped');
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
      // Fetch emails from last 30 days that are unseen or recent
      const since = new Date();
      since.setDate(since.getDate() - 30);

      // Get all clients for this brand to match emails against
      const clientsResult = await query(
        `SELECT id, email, name FROM clients WHERE brand_id = $1 AND is_active = TRUE AND email IS NOT NULL`,
        [connection.brand_id]
      );
      const clientMap = new Map(clientsResult.rows.map(c => [c.email.toLowerCase(), c]));

      for await (const msg of client.fetch({ since }, { envelope: true, bodyStructure: true })) {
        const from = msg.envelope.from?.[0];
        if (!from) continue;
        const fromEmail = `${from.mailbox}@${from.host}`.toLowerCase();
        const toList = (msg.envelope.to || []).map(t => `${t.mailbox}@${t.host}`.toLowerCase());

        const matchedClient = clientMap.get(fromEmail) || toList.map(e => clientMap.get(e)).find(Boolean);
        if (!matchedClient) continue;

        // Check if we already logged this email (by message-id)
        const msgId = msg.envelope.messageId;
        if (msgId) {
          const exists = await query(
            `SELECT id FROM client_activities WHERE brand_id = $1 AND data->>'message_id' = $2`,
            [connection.brand_id, msgId]
          );
          if (exists.rows.length) continue;
        }

        const subject = msg.envelope.subject || '(no subject)';
        const sentDate = msg.envelope.date || new Date();
        const direction = clientMap.get(fromEmail) ? 'inbound' : 'outbound';

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
