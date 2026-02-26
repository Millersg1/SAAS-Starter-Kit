import * as workflowModel from '../models/workflowModel.js';
import { query } from '../config/database.js';
import nodemailer from 'nodemailer';

async function executeStep(step, enrollment) {
  const { step_type, step_config } = step;

  switch (step_type) {
    case 'send_email': {
      const entityRow = (await query(
        `SELECT email, name FROM clients WHERE id = $1 AND is_active = TRUE`,
        [enrollment.entity_id]
      )).rows[0];
      if (!entityRow?.email) break;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      });
      await transporter.sendMail({
        from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to: entityRow.email,
        subject: step_config.subject || 'Message from us',
        html: (step_config.body || '').replace(/\n/g, '<br>'),
        text: step_config.body || ''
      });
      break;
    }

    case 'create_task': {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (parseInt(step_config.due_days) || 1));
      await query(
        `INSERT INTO tasks (brand_id, client_id, title, due_date, priority, status, created_by)
         VALUES ($1, $2, $3, $4, $5, 'pending', NULL)`,
        [
          enrollment.brand_id,
          enrollment.entity_type === 'client' ? enrollment.entity_id : null,
          step_config.title || 'Follow up',
          dueDate.toISOString().slice(0, 10),
          step_config.priority || 'normal'
        ]
      );
      break;
    }

    case 'send_sms': {
      if (!step_config.message) break;
      const { getTwilioConnection, saveMessage } = await import('../models/smsModel.js');
      const conn = await getTwilioConnection(enrollment.brand_id);
      if (!conn) break;

      const clientRow = (await query(`SELECT phone FROM clients WHERE id = $1`, [enrollment.entity_id])).rows[0];
      if (!clientRow?.phone) break;

      const { default: twilio } = await import('twilio');
      const twilioClient = twilio(conn.account_sid, conn.auth_token);
      const msg = await twilioClient.messages.create({
        from: conn.phone_number, to: clientRow.phone, body: step_config.message
      });
      await saveMessage({
        brand_id: enrollment.brand_id, client_id: enrollment.entity_id,
        direction: 'outbound', from_number: conn.phone_number,
        to_number: clientRow.phone, body: step_config.message,
        twilio_sid: msg.sid, status: msg.status
      });
      break;
    }

    case 'wait':
    default:
      break;
  }
}

export async function processEnrollment(enrollment) {
  const wf = await workflowModel.getWorkflowWithSteps(enrollment.workflow_id);
  if (!wf || !wf.is_active) {
    await workflowModel.completeEnrollment(enrollment.id);
    return;
  }

  const currentStep = wf.steps[enrollment.current_step];
  if (!currentStep) {
    await workflowModel.completeEnrollment(enrollment.id);
    return;
  }

  try {
    await executeStep(currentStep, enrollment);
  } catch (err) {
    console.error(`Workflow step error (enrollment ${enrollment.id}):`, err.message);
  }

  const nextStepIndex = enrollment.current_step + 1;
  const nextStep = wf.steps[nextStepIndex];

  if (!nextStep) {
    await workflowModel.completeEnrollment(enrollment.id);
  } else {
    const nextStepAt = new Date(Date.now() + (nextStep.delay_minutes || 0) * 60 * 1000);
    await workflowModel.advanceEnrollment(enrollment.id, nextStepIndex, nextStepAt);
  }
}
