import cron from 'node-cron';
import { query } from '../config/database.js';
import { sendOverdueReminderEmail } from './emailUtils.js';

/**
 * Find overdue invoices that haven't been reminded in the last 3 days.
 */
async function getRemindableOverdueInvoices() {
  const result = await query(
    `SELECT
       i.id, i.invoice_number, i.amount_due, i.due_date, i.brand_id,
       c.email AS client_email, c.name AS client_name,
       b.name AS brand_name,
       EXTRACT(DAY FROM NOW() - i.due_date)::INTEGER AS days_overdue,
       i.client_id
     FROM invoices i
     JOIN clients c  ON c.id = i.client_id
     JOIN brands  b  ON b.id = i.brand_id
     WHERE i.status = 'overdue'
       AND c.portal_access = TRUE
       AND c.is_active = TRUE
       AND (i.last_reminder_sent IS NULL OR i.last_reminder_sent < NOW() - INTERVAL '3 days')
     ORDER BY i.due_date ASC`
  );
  return result.rows;
}

/**
 * Mark invoice reminder as sent.
 */
async function markReminderSent(invoiceId) {
  await query(
    `UPDATE invoices SET last_reminder_sent = NOW() WHERE id = $1`,
    [invoiceId]
  );
}

/**
 * Build the portal URL for a client + brand.
 */
function buildPortalUrl(brandSlug) {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${base}/portal/invoices`;
}

/**
 * Process all remindable overdue invoices.
 */
async function sendOverdueReminders() {
  console.log('[overdue-reminders] Running daily check...');
  let invoices;
  try {
    invoices = await getRemindableOverdueInvoices();
  } catch (err) {
    console.error('[overdue-reminders] Failed to fetch invoices:', err.message);
    return;
  }

  console.log(`[overdue-reminders] Found ${invoices.length} invoice(s) to remind.`);

  for (const inv of invoices) {
    try {
      const portalUrl = buildPortalUrl(inv.brand_id);
      await sendOverdueReminderEmail(
        inv.client_email,
        inv.client_name,
        inv.invoice_number,
        parseFloat(inv.amount_due),
        inv.days_overdue,
        portalUrl,
        inv.brand_name
      );
      await markReminderSent(inv.id);
      console.log(`[overdue-reminders] Reminded client ${inv.client_name} for invoice ${inv.invoice_number}`);
    } catch (err) {
      console.error(`[overdue-reminders] Failed for invoice ${inv.id}:`, err.message);
    }
  }

  console.log('[overdue-reminders] Done.');
}

/**
 * Start daily overdue reminder cron (runs at 08:00 server time).
 */
export function startOverdueReminderCron() {
  cron.schedule('0 8 * * *', sendOverdueReminders);
  console.log('[overdue-reminders] Cron job registered (daily at 08:00).');
}

/**
 * Exported for manual triggering in tests.
 */
export { sendOverdueReminders };
