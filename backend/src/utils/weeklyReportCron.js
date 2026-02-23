import cron from 'node-cron';
import { query } from '../config/database.js';
import { sendWeeklyReportEmail } from './emailUtils.js';

/**
 * Start the weekly report cron job — runs every Monday at 8:00 AM server time.
 */
export function startWeeklyReportCron() {
  // '0 8 * * 1' = 08:00 every Monday
  cron.schedule('0 8 * * 1', async () => {
    console.log('[WeeklyReport] Starting weekly report job...');
    try {
      // Get all brands with active/trialing subscriptions
      const brandsResult = await query(`
        SELECT DISTINCT b.id as brand_id, b.name as brand_name
        FROM brands b
        JOIN subscriptions s ON s.brand_id = b.id
        WHERE b.is_active = TRUE
          AND s.status IN ('active', 'trialing')
      `);

      const brands = brandsResult.rows;
      console.log(`[WeeklyReport] Processing ${brands.length} brand(s)...`);

      for (const brand of brands) {
        try {
          // Get owner
          const ownerResult = await query(`
            SELECT u.email, u.name
            FROM brand_members bm
            JOIN users u ON bm.user_id = u.id
            WHERE bm.brand_id = $1 AND bm.role = 'owner'
            LIMIT 1
          `, [brand.brand_id]);

          if (!ownerResult.rows[0]) continue;
          const { email: ownerEmail, name: ownerName } = ownerResult.rows[0];

          // Gather 7-day stats in a single query
          const statsResult = await query(`
            SELECT
              COALESCE(SUM(CASE WHEN p.payment_status = 'completed' AND p.created_at >= NOW() - INTERVAL '7 days' THEN p.amount ELSE 0 END), 0) as revenue_7d,
              COUNT(DISTINCT CASE WHEN i.created_at >= NOW() - INTERVAL '7 days' THEN i.id END) as invoices_sent,
              COUNT(DISTINCT CASE WHEN i.status = 'paid' AND i.updated_at >= NOW() - INTERVAL '7 days' THEN i.id END) as invoices_paid,
              COUNT(DISTINCT CASE WHEN pr.created_at >= NOW() - INTERVAL '7 days' THEN pr.id END) as proposals_sent,
              COUNT(DISTINCT CASE WHEN pr.status = 'accepted' AND pr.accepted_at >= NOW() - INTERVAL '7 days' THEN pr.id END) as proposals_accepted,
              COUNT(DISTINCT CASE WHEN t.status = 'completed' AND t.completed_at >= NOW() - INTERVAL '7 days' THEN t.id END) as tasks_completed,
              COUNT(DISTINCT CASE WHEN c.created_at >= NOW() - INTERVAL '7 days' THEN c.id END) as new_clients
            FROM brands b
            LEFT JOIN invoices i ON i.brand_id = b.id
            LEFT JOIN payments p ON p.brand_id = b.id
            LEFT JOIN proposals pr ON pr.brand_id = b.id AND pr.is_active = TRUE
            LEFT JOIN tasks t ON t.brand_id = b.id AND t.is_active = TRUE
            LEFT JOIN clients c ON c.brand_id = b.id AND c.is_active = TRUE
            WHERE b.id = $1
          `, [brand.brand_id]);

          const s = statsResult.rows[0] || {};

          await sendWeeklyReportEmail(ownerEmail, ownerName, brand.brand_name, {
            revenue7d: parseFloat(s.revenue_7d || 0),
            invoicesSent: parseInt(s.invoices_sent || 0),
            invoicesPaid: parseInt(s.invoices_paid || 0),
            proposalsSent: parseInt(s.proposals_sent || 0),
            proposalsAccepted: parseInt(s.proposals_accepted || 0),
            tasksCompleted: parseInt(s.tasks_completed || 0),
            newClients: parseInt(s.new_clients || 0),
          });

          console.log(`[WeeklyReport] Sent report for brand "${brand.brand_name}" to ${ownerEmail}`);
        } catch (err) {
          console.error(`[WeeklyReport] Failed for brand ${brand.brand_id}:`, err.message);
        }
      }

      console.log('[WeeklyReport] Job complete.');
    } catch (err) {
      console.error('[WeeklyReport] Job failed:', err.message);
    }
  });

  console.log('[WeeklyReport] Cron scheduled — runs every Monday at 08:00');
}
