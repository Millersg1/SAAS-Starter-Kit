import cron from 'node-cron';
import { getDueRecurringInvoices, createInvoice, getInvoiceItems, addInvoiceItem, updateInvoice, generateInvoiceNumber } from '../models/invoiceModel.js';

/**
 * Calculate the next recurrence date from a given date.
 */
function calcNextDate(recurrenceType, recurrenceDay, fromDate) {
  const d = new Date(fromDate);
  switch (recurrenceType) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      break;
  }
  // Override day-of-month for non-weekly recurrences
  if (recurrenceDay && recurrenceType !== 'weekly') {
    const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(recurrenceDay, maxDay));
  }
  return d.toISOString().split('T')[0];
}

/**
 * Generate a due date 30 days from today.
 */
function dueDateInDays(days = 30) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Process all recurring invoices that are due today or overdue.
 * Clones the invoice as a new draft and advances next_invoice_date.
 */
async function processRecurringInvoices() {
  console.log('[recurring-invoices] Running daily check...');
  const due = await getDueRecurringInvoices();
  console.log(`[recurring-invoices] Found ${due.length} due invoice(s).`);

  for (const inv of due) {
    try {
      const newNumber = await generateInvoiceNumber(inv.brand_id);
      const today = new Date().toISOString().split('T')[0];
      const nextDate = calcNextDate(inv.recurrence_type, inv.recurrence_day, inv.next_invoice_date);

      // Create the cloned invoice as a draft
      const newInvoice = await createInvoice({
        brand_id: inv.brand_id,
        client_id: inv.client_id,
        project_id: inv.project_id,
        invoice_number: newNumber,
        issue_date: today,
        due_date: dueDateInDays(30),
        status: 'draft',
        currency: inv.currency,
        notes: inv.notes,
        terms: inv.terms,
        footer: inv.footer,
        recurrence_type: inv.recurrence_type,
        recurrence_day: inv.recurrence_day,
        next_invoice_date: nextDate,
        parent_invoice_id: inv.id,
        created_by: inv.created_by,
      });

      // Copy all line items from the parent invoice
      const items = await getInvoiceItems(inv.id);
      for (const item of items) {
        await addInvoiceItem({
          invoice_id: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          sort_order: item.sort_order,
        });
      }

      // Advance the parent invoice's next_invoice_date
      await updateInvoice(inv.id, { next_invoice_date: nextDate });

      console.log(`[recurring-invoices] Cloned invoice ${inv.invoice_number} → ${newNumber} (next: ${nextDate})`);
    } catch (err) {
      console.error(`[recurring-invoices] Failed to process invoice ${inv.id}:`, err.message);
    }
  }

  console.log('[recurring-invoices] Done.');
}

/**
 * Start the daily cron job (runs at 06:00 server time every day).
 */
export function startRecurringInvoiceCron() {
  cron.schedule('0 6 * * *', processRecurringInvoices);
  console.log('[recurring-invoices] Cron job registered (daily at 06:00).');
}
