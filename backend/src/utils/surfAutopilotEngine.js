/**
 * Surf Autopilot Engine — runs every 5 minutes.
 * When enabled, Surf automatically takes action on behalf of the agency.
 */
import { query } from '../config/database.js';
import logger from './logger.js';

async function logAction(brandId, actionType, entityType, entityId, description) {
  try {
    await query(
      `INSERT INTO surf_autopilot_log (brand_id, action_type, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [brandId, actionType, entityType, entityId, description]
    );
  } catch {}
}

async function runAutopilot() {
  try {
    // Get all brands with autopilot enabled
    const settings = await query(
      `SELECT * FROM surf_autopilot_settings WHERE autopilot_enabled = TRUE AND (paused_until IS NULL OR paused_until < NOW())`
    );

    for (const config of settings.rows) {
      const brandId = config.brand_id;

      try {
        // 1. Auto follow-up emails for stale leads
        if (config.auto_followup_emails) {
          const staleLeads = await query(
            `SELECT id, name, email FROM clients
             WHERE brand_id = $1 AND status IN ('pending', 'active') AND email IS NOT NULL
             AND is_active = TRUE
             AND (last_contacted_at IS NULL OR last_contacted_at < NOW() - INTERVAL '3 days')
             AND id NOT IN (SELECT entity_id FROM surf_autopilot_log WHERE brand_id = $1 AND action_type = 'auto_followup' AND created_at > NOW() - INTERVAL '7 days')
             LIMIT 5`,
            [brandId]
          );

          for (const lead of staleLeads.rows) {
            try {
              // Create a follow-up task instead of sending email directly (safer)
              await query(
                `INSERT INTO tasks (brand_id, title, description, priority, status, due_date)
                 VALUES ($1, $2, $3, 'high', 'pending', CURRENT_DATE)`,
                [brandId, `Follow up with ${lead.name}`, `Surf Autopilot: ${lead.name} (${lead.email}) hasn't been contacted in 3+ days. Reach out today.`]
              );
              await query(`UPDATE clients SET last_contacted_at = NOW() WHERE id = $1`, [lead.id]);
              await logAction(brandId, 'auto_followup', 'client', lead.id, `Created follow-up task for ${lead.name}`);
              logger.info({ brandId, clientId: lead.id }, '[Autopilot] Follow-up task created');
            } catch (err) {
              logger.error({ err: err.message }, '[Autopilot] Follow-up error');
            }
          }
        }

        // 2. Auto invoice reminders for overdue invoices
        if (config.auto_invoice_reminders) {
          const overdueInvoices = await query(
            `SELECT i.id, i.invoice_number, i.amount_due, c.name as client_name, c.email as client_email
             FROM invoices i
             LEFT JOIN clients c ON c.id = i.client_id
             WHERE i.brand_id = $1 AND i.status = 'overdue' AND i.amount_due > 0
             AND i.id NOT IN (SELECT entity_id FROM surf_autopilot_log WHERE brand_id = $1 AND action_type = 'auto_invoice_reminder' AND created_at > NOW() - INTERVAL '7 days')
             LIMIT 5`,
            [brandId]
          );

          for (const inv of overdueInvoices.rows) {
            try {
              await query(
                `INSERT INTO tasks (brand_id, title, description, priority, status, due_date)
                 VALUES ($1, $2, $3, 'high', 'pending', CURRENT_DATE)`,
                [brandId, `Send reminder: Invoice ${inv.invoice_number}`, `Surf Autopilot: Invoice ${inv.invoice_number} ($${inv.amount_due}) for ${inv.client_name || 'client'} is overdue. Send a payment reminder.`]
              );
              await logAction(brandId, 'auto_invoice_reminder', 'invoice', inv.id, `Created reminder task for invoice ${inv.invoice_number} ($${inv.amount_due})`);
              logger.info({ brandId, invoiceId: inv.id }, '[Autopilot] Invoice reminder task created');
            } catch (err) {
              logger.error({ err: err.message }, '[Autopilot] Invoice reminder error');
            }
          }
        }

        // 3. Auto move deals that have been won/lost indicators
        if (config.auto_deal_moves) {
          // Move deals with accepted proposals to "Won"
          const wonDeals = await query(
            `SELECT d.id, d.name FROM deals d
             JOIN proposals p ON p.client_id = d.client_id AND p.brand_id = d.brand_id
             WHERE d.brand_id = $1 AND d.status = 'active' AND p.status = 'accepted'
             AND d.id NOT IN (SELECT entity_id FROM surf_autopilot_log WHERE brand_id = $1 AND action_type = 'auto_deal_move' AND created_at > NOW() - INTERVAL '30 days')
             LIMIT 5`,
            [brandId]
          );

          for (const deal of wonDeals.rows) {
            try {
              await query(`UPDATE deals SET status = 'won', stage = 'Won', updated_at = NOW() WHERE id = $1`, [deal.id]);
              await logAction(brandId, 'auto_deal_move', 'deal', deal.id, `Moved "${deal.name}" to Won (proposal accepted)`);
              logger.info({ brandId, dealId: deal.id }, '[Autopilot] Deal moved to Won');
            } catch (err) {
              logger.error({ err: err.message }, '[Autopilot] Deal move error');
            }
          }
        }

        // 4. Auto create tasks for new clients
        if (config.auto_task_creation) {
          const newClients = await query(
            `SELECT id, name FROM clients
             WHERE brand_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
             AND id NOT IN (SELECT entity_id FROM surf_autopilot_log WHERE brand_id = $1 AND action_type = 'auto_task_create' AND created_at > NOW() - INTERVAL '24 hours')
             LIMIT 10`,
            [brandId]
          );

          for (const client of newClients.rows) {
            try {
              await query(
                `INSERT INTO tasks (brand_id, title, description, priority, status, due_date, client_id)
                 VALUES ($1, $2, $3, 'medium', 'pending', CURRENT_DATE + 1, $4)`,
                [brandId, `Welcome ${client.name}`, `Surf Autopilot: New client "${client.name}" was added. Send a welcome message and schedule an onboarding call.`, client.id]
              );
              await logAction(brandId, 'auto_task_create', 'client', client.id, `Created welcome task for new client ${client.name}`);
            } catch (err) {
              logger.error({ err: err.message }, '[Autopilot] Task create error');
            }
          }
        }

        // 5. Auto nurture leads (enroll in drip if available)
        if (config.auto_lead_nurture) {
          const unNurtured = await query(
            `SELECT c.id, c.name, c.email FROM clients c
             WHERE c.brand_id = $1 AND c.status = 'pending' AND c.email IS NOT NULL
             AND c.created_at > NOW() - INTERVAL '7 days'
             AND c.id NOT IN (SELECT entity_id FROM surf_autopilot_log WHERE brand_id = $1 AND action_type = 'auto_nurture' AND created_at > NOW() - INTERVAL '30 days')
             LIMIT 5`,
            [brandId]
          );

          if (unNurtured.rows.length > 0) {
            // Find active drip sequence
            const seq = await query(
              `SELECT id FROM drip_sequences WHERE brand_id = $1 AND status = 'active' LIMIT 1`,
              [brandId]
            );

            if (seq.rows[0]) {
              for (const lead of unNurtured.rows) {
                try {
                  await query(
                    `INSERT INTO drip_enrollments (sequence_id, brand_id, contact_email, contact_name, client_id, status)
                     VALUES ($1, $2, $3, $4, $5, 'active')
                     ON CONFLICT DO NOTHING`,
                    [seq.rows[0].id, brandId, lead.email, lead.name, lead.id]
                  );
                  await logAction(brandId, 'auto_nurture', 'client', lead.id, `Enrolled ${lead.name} in drip sequence`);
                } catch {}
              }
            }
          }
        }
      } catch (err) {
        logger.error({ err: err.message, brandId }, '[Autopilot] Brand processing error');
      }
    }
  } catch (err) {
    logger.error({ err: err.message }, '[Autopilot] Engine error');
  }
}

export function startSurfAutopilotCron() {
  // Run every 5 minutes
  setInterval(runAutopilot, 5 * 60 * 1000);
  // First run after 60 seconds
  setTimeout(runAutopilot, 60000);
  console.log('🤖 Surf Autopilot engine started (every 5 minutes)');
}
