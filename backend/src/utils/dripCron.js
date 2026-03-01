import nodemailer from 'nodemailer';
import {
  getActiveEnrollmentsDue,
  getStepsForSequence,
  advanceEnrollment,
  completeEnrollment,
  recordSend,
} from '../models/dripSequenceModel.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:5000';

const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return {
    sendMail: async (opts) => {
      console.log('\n📧 [DripCron] Email (dev):', opts.to, '|', opts.subject);
      return { messageId: 'dev-' + Date.now() };
    },
  };
};

// Build unsubscribe URL using a simple base64 token (enrollmentId:sequenceId)
const buildUnsubscribeUrl = (enrollmentId, sequenceId) => {
  const token = Buffer.from(`${enrollmentId}:${sequenceId}`).toString('base64url');
  return `${API_URL}/api/drip/unsubscribe?token=${token}`;
};

// Append unsubscribe footer to HTML
const appendUnsubscribe = (html, unsubUrl) => {
  return `${html}
<br/><br/><hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
<p style="font-size:12px;color:#999;text-align:center;">
  You received this email because you were enrolled in an email sequence.
  <a href="${unsubUrl}" style="color:#999;">Unsubscribe</a>
</p>`;
};

let running = false;

const processDrip = async () => {
  if (running) return;
  running = true;
  try {
    const enrollments = await getActiveEnrollmentsDue();
    if (!enrollments.length) return;

    const transporter = createTransporter();

    for (const enrollment of enrollments) {
      try {
        const steps = await getStepsForSequence(enrollment.sequence_id);
        const stepIndex = enrollment.current_step;

        if (stepIndex >= steps.length) {
          await completeEnrollment(enrollment.id);
          continue;
        }

        const step = steps[stepIndex];
        const unsubUrl = buildUnsubscribeUrl(enrollment.id, enrollment.sequence_id);
        const html = appendUnsubscribe(step.html_content, unsubUrl);

        const fromName = step.from_name || enrollment.brand_name || 'ClientHub';
        const fromEmail = step.from_email ||
          process.env.SMTP_FROM_EMAIL ||
          process.env.EMAIL_FROM ||
          'noreply@clienthub.app';

        let sendError = null;
        try {
          await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: enrollment.contact_name
              ? `"${enrollment.contact_name}" <${enrollment.contact_email}>`
              : enrollment.contact_email,
            subject: step.subject,
            html,
          });
        } catch (err) {
          sendError = err.message;
          console.error('[DripCron] Send failed:', enrollment.contact_email, err.message);
        }

        // Record the send attempt
        await recordSend({
          enrollment_id: enrollment.id,
          step_id: step.id,
          brand_id: enrollment.brand_id,
          to_email: enrollment.contact_email,
          subject: step.subject,
        });

        if (!sendError) {
          const nextStepIndex = stepIndex + 1;
          if (nextStepIndex >= steps.length) {
            await completeEnrollment(enrollment.id);
          } else {
            const nextStep = steps[nextStepIndex];
            const delayMs =
              ((nextStep.delay_days || 0) * 24 * 60 * 60 +
                (nextStep.delay_hours || 0) * 60 * 60) * 1000;
            const nextSendAt = new Date(Date.now() + (delayMs || 0));
            await advanceEnrollment(enrollment.id, nextStepIndex, nextSendAt);
          }
        }
        // On send error: leave current_step + next_send_at as-is → retry next cron tick
      } catch (err) {
        console.error('[DripCron] Enrollment error:', enrollment.id, err.message);
      }
    }
  } catch (err) {
    console.error('[DripCron] Fatal error:', err.message);
  } finally {
    running = false;
  }
};

export const startDripCron = () => {
  // Run every 5 minutes
  setInterval(processDrip, 5 * 60 * 1000);
  // Also run once shortly after startup to catch any immediately-due enrollments
  setTimeout(processDrip, 15000);
  console.log('✅ Drip sequence cron started (every 5 minutes)');
};
