import cron from 'node-cron';
import { query } from '../config/database.js';
import { sendProposalFollowUpEmail } from './emailUtils.js';

export const startEmailSequencesCron = () => {
  // Run daily at 09:00
  cron.schedule('0 9 * * *', async () => {
    console.log('📧 Running email sequences cron...');
    try {
      // Get pending sequences that are due
      const result = await query(
        `SELECT es.*,
                p.title AS proposal_title, p.total_amount, p.status AS proposal_status,
                c.email AS client_email, c.name AS client_name,
                b.name AS brand_name
         FROM email_sequences es
         JOIN proposals p ON es.proposal_id = p.id
         JOIN clients c ON es.client_id = c.id
         JOIN brands b ON es.brand_id = b.id
         WHERE es.status = 'pending'
           AND es.scheduled_for <= NOW()`,
        []
      );

      for (const seq of result.rows) {
        try {
          // Skip if proposal already resolved
          if (['accepted', 'rejected', 'expired'].includes(seq.proposal_status)) {
            await query(
              `UPDATE email_sequences SET status = 'skipped' WHERE id = $1`,
              [seq.id]
            );
            continue;
          }

          const portalUrl = `${process.env.FRONTEND_URL || 'https://faithharborclienthub.com'}/portal/proposals`;

          await sendProposalFollowUpEmail(
            seq.client_email,
            seq.client_name,
            seq.proposal_title,
            seq.total_amount,
            portalUrl,
            seq.brand_name,
            seq.sequence_day
          );

          await query(
            `UPDATE email_sequences SET status = 'sent', sent_at = NOW() WHERE id = $1`,
            [seq.id]
          );

          console.log(`✅ Follow-up email sent (day ${seq.sequence_day}) to ${seq.client_email}`);
        } catch (err) {
          console.error(`❌ Failed to send follow-up for sequence ${seq.id}:`, err.message);
        }
      }

      console.log(`📧 Email sequences cron complete. Processed: ${result.rows.length}`);
    } catch (err) {
      console.error('❌ Email sequences cron error:', err.message);
    }
  });

  console.log('📧 Email sequences cron scheduled (daily at 09:00)');
};
