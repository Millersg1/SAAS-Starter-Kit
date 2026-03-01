import nodemailer from 'nodemailer';
import { query } from '../config/database.js';
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

// Build tracking pixel for open tracking
const buildTrackingPixel = (enrollmentId, stepNumber) => {
  const trackingId = Buffer.from(`${enrollmentId}:${stepNumber}`).toString('base64url');
  return `<img src="${API_URL}/api/track/drip/open/${trackingId}" width="1" height="1" style="display:none" alt="" />`;
};

// Wrap links in HTML with click tracking
const wrapLinksWithTracking = (html, enrollmentId, stepNumber) => {
  const trackingId = Buffer.from(`${enrollmentId}:${stepNumber}`).toString('base64url');
  // Replace href="..." links (except unsubscribe links and tracking links)
  return html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (match, url) => {
      // Don't wrap tracking URLs or unsubscribe links
      if (url.includes('/api/track/') || url.includes('/api/drip/unsubscribe')) return match;
      const encodedUrl = encodeURIComponent(url);
      return `href="${API_URL}/api/track/drip/click/${trackingId}?url=${encodedUrl}"`;
    }
  );
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

// Check if a condition step's condition is met
const evaluateCondition = async (conditionConfig, enrollmentId) => {
  if (!conditionConfig) return false;
  const { type, check_step } = conditionConfig;
  if (!type || check_step == null) return false;

  const eventType = type === 'email_opened' ? 'open' : type === 'email_clicked' ? 'click' : null;
  if (!eventType) return false;

  const result = await query(
    `SELECT COUNT(*) AS cnt FROM email_tracking_events
     WHERE enrollment_id = $1 AND step_number = $2 AND event_type = $3`,
    [enrollmentId, check_step, eventType]
  );
  return parseInt(result.rows[0]?.cnt || 0) > 0;
};

// Advance to next step, handling condition steps
const advanceToNext = async (enrollmentId, steps, currentIndex) => {
  let nextIndex = currentIndex + 1;

  // Skip through condition steps immediately
  while (nextIndex < steps.length && steps[nextIndex].step_type === 'condition') {
    const condStep = steps[nextIndex];
    const condMet = await evaluateCondition(condStep.condition_config, enrollmentId);
    const targetStep = condMet ? condStep.yes_next_step : condStep.no_next_step;

    if (targetStep != null) {
      // Find step by position number
      const targetIndex = steps.findIndex(s => s.position === targetStep);
      if (targetIndex >= 0) {
        nextIndex = targetIndex;
      } else {
        nextIndex++;
      }
    } else {
      nextIndex++;
    }

    // Safety: prevent infinite loops
    if (nextIndex <= currentIndex) break;
  }

  if (nextIndex >= steps.length) {
    await completeEnrollment(enrollmentId);
  } else {
    const nextStep = steps[nextIndex];
    const delayMs =
      ((nextStep.delay_days || 0) * 24 * 60 * 60 +
        (nextStep.delay_hours || 0) * 60 * 60) * 1000;
    const nextSendAt = new Date(Date.now() + (delayMs || 0));
    await advanceEnrollment(enrollmentId, nextIndex, nextSendAt);
  }
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

        // Handle condition steps (should not normally be "current" unless timing edge case)
        if (step.step_type === 'condition') {
          await advanceToNext(enrollment.id, steps, stepIndex - 1);
          continue;
        }

        // Normal email step
        const unsubUrl = buildUnsubscribeUrl(enrollment.id, enrollment.sequence_id);
        let html = appendUnsubscribe(step.html_content, unsubUrl);

        // Inject tracking pixel
        html += buildTrackingPixel(enrollment.id, step.position);

        // Wrap links with click tracking
        html = wrapLinksWithTracking(html, enrollment.id, step.position);

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
          await advanceToNext(enrollment.id, steps, stepIndex);
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
