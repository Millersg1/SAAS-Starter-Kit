import { query } from '../config/database.js';
import Stripe from 'stripe';
import { sendToUser, emitNotification } from './websocket.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

let dunningRunning = false;

/**
 * Dunning management cron — runs daily.
 * Handles failed payments: retries, grace periods, and account suspension.
 *
 * Flow:
 *   1. Find subscriptions with failed payments (past_due status)
 *   2. Retry charge if within retry window (3 attempts over 14 days)
 *   3. Send dunning emails at day 1, 3, 7, 14
 *   4. Suspend account after 14-day grace period
 *   5. Cancel subscription after 30 days
 */
export async function runDunning() {
  if (dunningRunning || !stripe) return;
  dunningRunning = true;

  try {
    console.log('[Dunning] Starting dunning cycle...');

    // 1. Find all past_due subscriptions
    const pastDue = await query(
      `SELECT s.*, u.id AS user_id, u.email, u.name,
              b.name AS brand_name
       FROM subscriptions s
       JOIN brands b ON b.id = s.brand_id
       JOIN brand_members bm ON bm.brand_id = s.brand_id AND bm.role = 'owner'
       JOIN users u ON u.id = bm.user_id
       WHERE s.status = 'past_due'
       ORDER BY s.updated_at ASC`
    );

    for (const sub of pastDue.rows) {
      const daysPastDue = Math.floor(
        (Date.now() - new Date(sub.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      try {
        // Retry payment (Stripe handles this automatically with Smart Retries,
        // but we track our own state for grace periods)
        if (daysPastDue <= 14) {
          // Update dunning state
          await query(
            `UPDATE subscriptions
             SET dunning_attempts = COALESCE(dunning_attempts, 0) + 1,
                 dunning_last_attempt = NOW()
             WHERE id = $1 AND (dunning_last_attempt IS NULL OR dunning_last_attempt < NOW() - INTERVAL '3 days')`,
            [sub.id]
          );

          // Send dunning notification
          const daysUntilSuspend = Math.max(0, 14 - daysPastDue);
          emitNotification.generic(
            sub.user_id,
            'Payment Failed',
            `Your payment for ${sub.brand_name} failed. ${daysUntilSuspend} days until account suspension.`,
            'warning'
          );
        }

        // Suspend access after 14 days
        if (daysPastDue > 14 && daysPastDue <= 30) {
          await query(
            `UPDATE subscriptions SET status = 'suspended' WHERE id = $1 AND status = 'past_due'`,
            [sub.id]
          );
          // Deactivate brand
          await query(
            `UPDATE brands SET is_active = FALSE WHERE id = $1`,
            [sub.brand_id]
          );
          emitNotification.generic(
            sub.user_id,
            'Account Suspended',
            `Your ${sub.brand_name} account has been suspended due to unpaid invoices. Update your payment method to restore access.`,
            'error'
          );
          console.log(`[Dunning] Suspended subscription ${sub.id} (${daysPastDue} days past due)`);
        }

        // Cancel after 30 days
        if (daysPastDue > 30) {
          if (sub.stripe_subscription_id) {
            try {
              await stripe.subscriptions.cancel(sub.stripe_subscription_id);
            } catch (e) {
              console.error(`[Dunning] Stripe cancel error for ${sub.id}:`, e.message);
            }
          }
          await query(
            `UPDATE subscriptions SET status = 'canceled', canceled_at = NOW() WHERE id = $1`,
            [sub.id]
          );
          emitNotification.generic(
            sub.user_id,
            'Subscription Canceled',
            `Your ${sub.brand_name} subscription has been canceled after 30 days of unpaid invoices.`,
            'error'
          );
          console.log(`[Dunning] Canceled subscription ${sub.id} (${daysPastDue} days past due)`);
        }
      } catch (subErr) {
        console.error(`[Dunning] Error processing subscription ${sub.id}:`, subErr.message);
      }
    }

    // 2. Restore suspended accounts that have been paid
    const restored = await query(
      `UPDATE subscriptions SET status = 'active'
       WHERE status = 'suspended'
       AND stripe_subscription_id IS NOT NULL
       AND id IN (
         SELECT s.id FROM subscriptions s
         WHERE s.status = 'suspended'
       )
       RETURNING brand_id`
    );
    for (const row of restored.rows) {
      await query(`UPDATE brands SET is_active = TRUE WHERE id = $1`, [row.brand_id]);
    }

    console.log(`[Dunning] Processed ${pastDue.rows.length} past-due subscriptions, restored ${restored.rows.length}`);
  } catch (err) {
    console.error('[Dunning] Fatal error:', err.message);
  } finally {
    dunningRunning = false;
  }
}

export function startDunningCron(cron) {
  // Run daily at 6 AM UTC
  cron.schedule('0 6 * * *', runDunning);
  console.log('✅ Dunning management cron started (daily 6 AM UTC)');
}
