import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';
import * as brandModel from '../models/brandModel.js';
import * as emailModel from '../models/emailModel.js';
import * as emailConnectionModel from '../models/emailConnectionModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';
import { query } from '../config/database.js';

const assertBrandAccess = async (brandId, userId, next) => {
  const member = await brandModel.getBrandMember(brandId, userId);
  if (!member) { next(new AppError('Access denied', 403)); return false; }
  return true;
};

/** GET /api/emails/:brandId/threads */
export const listThreads = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { client_id, page, limit } = req.query;
  const threads = await emailModel.getThreadsByBrand(brandId, {
    client_id: client_id || null,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 40,
  });

  res.json({ status: 'success', data: { threads } });
});

/** GET /api/emails/:brandId/threads/:threadId */
export const getThread = catchAsync(async (req, res, next) => {
  const { brandId, threadId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const emails = await emailModel.getThreadEmails(brandId, threadId);
  if (!emails.length) return next(new AppError('Thread not found', 404));

  // Mark thread as read
  await emailModel.markThreadRead(brandId, threadId);

  res.json({ status: 'success', data: { emails } });
});

/** POST /api/emails/:brandId/threads/:threadId/reply */
export const sendReply = catchAsync(async (req, res, next) => {
  const { brandId, threadId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { body_html, body_text, connection_id } = req.body;
  if (!body_text && !body_html) return next(new AppError('Reply body is required', 400));

  // Get SMTP credentials from connection
  const connection = await emailConnectionModel.getConnectionById(connection_id);
  if (!connection || connection.brand_id !== brandId) {
    return next(new AppError('Email connection not found', 404));
  }
  if (!connection.smtp_host || !connection.smtp_user || !connection.smtp_password) {
    return next(new AppError('SMTP not configured for this connection. Please update with SMTP settings.', 400));
  }

  // Get the latest email in the thread for reply headers
  const threadEmails = await emailModel.getThreadEmails(brandId, threadId);
  if (!threadEmails.length) return next(new AppError('Thread not found', 404));

  const lastEmail = threadEmails[threadEmails.length - 1];
  const replyToAddress = lastEmail.direction === 'inbound' ? lastEmail.from_address : lastEmail.to_addresses.split(',')[0].trim();
  const subject = lastEmail.subject?.startsWith('Re:') ? lastEmail.subject : `Re: ${lastEmail.subject || ''}`;

  // Build References header chain
  const refs = threadEmails
    .map(e => e.message_id)
    .filter(Boolean)
    .join(' ');

  const newMessageId = `<${randomUUID()}@saassurface.com>`;

  // Create nodemailer transporter with connection's SMTP credentials
  const transporter = nodemailer.createTransport({
    host: connection.smtp_host,
    port: connection.smtp_port || 587,
    secure: (connection.smtp_port || 587) === 465,
    auth: { user: connection.smtp_user, pass: connection.smtp_password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  await transporter.sendMail({
    from: `"${connection.smtp_user}" <${connection.email_address}>`,
    to: replyToAddress,
    subject,
    text: body_text || '',
    html: body_html || undefined,
    messageId: newMessageId,
    inReplyTo: lastEmail.message_id || undefined,
    references: refs || undefined,
  });

  // Store sent email in emails table
  const sentEmail = await emailModel.createEmail({
    brand_id: brandId,
    connection_id: connection.id,
    client_id: lastEmail.client_id,
    thread_id: threadId,
    message_id: newMessageId,
    in_reply_to: lastEmail.message_id || null,
    email_references: refs || null,
    from_address: connection.email_address,
    from_name: connection.smtp_user,
    to_addresses: replyToAddress,
    subject,
    body_text: body_text || null,
    body_html: body_html || null,
    direction: 'outbound',
    is_read: true,
    sent_at: new Date(),
  });

  // Also log as activity
  await query(
    `INSERT INTO client_activities (brand_id, client_id, user_id, activity_type, title, body, data)
     VALUES ($1, $2, $3, 'email', $4, $5, $6)`,
    [
      brandId, lastEmail.client_id, req.user.id,
      `→ Email: ${subject}`,
      `To: ${replyToAddress}\nDate: ${new Date().toISOString()}`,
      JSON.stringify({ message_id: newMessageId, direction: 'outbound', from: connection.email_address, subject, date: new Date() })
    ]
  );

  res.status(201).json({ status: 'success', data: { email: sentEmail } });
});

/** GET /api/emails/:brandId/unread-count */
export const getUnreadCount = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const count = await emailModel.getUnreadCount(brandId);
  res.json({ status: 'success', data: { count } });
});
