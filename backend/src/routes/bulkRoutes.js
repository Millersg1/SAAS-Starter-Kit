import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import { getBrandMember } from '../models/brandModel.js';

const router = express.Router();

router.use(protect);

const MAX_BULK = 100;

const checkOwnerAdmin = async (brandId, userId) => {
  const member = await getBrandMember(brandId, userId);
  if (!member || !['owner', 'admin'].includes(member.role)) {
    throw { status: 403, message: 'Only owners/admins can perform bulk operations.' };
  }
  return member;
};

/**
 * POST /api/bulk/:brandId/invoices/send
 * Bulk send invoices.
 */
router.post('/:brandId/invoices/send', catchAsync(async (req, res, next) => {
  await checkOwnerAdmin(req.params.brandId, req.user.id);
  const { invoice_ids } = req.body;
  if (!Array.isArray(invoice_ids) || invoice_ids.length === 0) {
    return next(new AppError('invoice_ids array required.', 400));
  }
  if (invoice_ids.length > MAX_BULK) return next(new AppError(`Max ${MAX_BULK} items.`, 400));

  const result = await query(
    `UPDATE invoices SET status = 'sent', sent_at = NOW()
     WHERE id = ANY($1) AND brand_id = $2 AND status = 'draft'
     RETURNING id, invoice_number`,
    [invoice_ids, req.params.brandId]
  );

  res.json({ status: 'success', data: { sent: result.rows.length, invoices: result.rows } });
}));

/**
 * POST /api/bulk/:brandId/invoices/delete
 * Bulk delete draft invoices.
 */
router.post('/:brandId/invoices/delete', catchAsync(async (req, res, next) => {
  await checkOwnerAdmin(req.params.brandId, req.user.id);
  const { invoice_ids } = req.body;
  if (!Array.isArray(invoice_ids) || invoice_ids.length === 0) {
    return next(new AppError('invoice_ids array required.', 400));
  }
  if (invoice_ids.length > MAX_BULK) return next(new AppError(`Max ${MAX_BULK} items.`, 400));

  const result = await query(
    `DELETE FROM invoices WHERE id = ANY($1) AND brand_id = $2 AND status = 'draft'`,
    [invoice_ids, req.params.brandId]
  );

  res.json({ status: 'success', data: { deleted: result.rowCount } });
}));

/**
 * POST /api/bulk/:brandId/clients/delete
 * Bulk delete clients.
 */
router.post('/:brandId/clients/delete', catchAsync(async (req, res, next) => {
  await checkOwnerAdmin(req.params.brandId, req.user.id);
  const { client_ids } = req.body;
  if (!Array.isArray(client_ids) || client_ids.length === 0) {
    return next(new AppError('client_ids array required.', 400));
  }
  if (client_ids.length > MAX_BULK) return next(new AppError(`Max ${MAX_BULK} items.`, 400));

  const result = await query(
    `DELETE FROM clients WHERE id = ANY($1) AND brand_id = $2`,
    [client_ids, req.params.brandId]
  );

  res.json({ status: 'success', data: { deleted: result.rowCount } });
}));

/**
 * POST /api/bulk/:brandId/deals/update
 * Bulk update deal stage.
 */
router.post('/:brandId/deals/update', catchAsync(async (req, res, next) => {
  await checkOwnerAdmin(req.params.brandId, req.user.id);
  const { deal_ids, stage, status } = req.body;
  if (!Array.isArray(deal_ids) || deal_ids.length === 0) {
    return next(new AppError('deal_ids array required.', 400));
  }
  if (deal_ids.length > MAX_BULK) return next(new AppError(`Max ${MAX_BULK} items.`, 400));

  const sets = [];
  const vals = [deal_ids, req.params.brandId];
  let idx = 3;

  if (stage) { sets.push(`stage = $${idx++}`); vals.push(stage); }
  if (status) { sets.push(`status = $${idx++}`); vals.push(status); }
  if (sets.length === 0) return next(new AppError('Provide stage or status to update.', 400));

  const result = await query(
    `UPDATE deals SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = ANY($1) AND brand_id = $2
     RETURNING id, name, stage, status`,
    vals
  );

  res.json({ status: 'success', data: { updated: result.rows.length, deals: result.rows } });
}));

/**
 * POST /api/bulk/:brandId/tasks/complete
 * Bulk complete tasks.
 */
router.post('/:brandId/tasks/complete', catchAsync(async (req, res, next) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const { task_ids } = req.body;
  if (!Array.isArray(task_ids) || task_ids.length === 0) {
    return next(new AppError('task_ids array required.', 400));
  }
  if (task_ids.length > MAX_BULK) return next(new AppError(`Max ${MAX_BULK} items.`, 400));

  const result = await query(
    `UPDATE tasks SET status = 'completed', completed_at = NOW()
     WHERE id = ANY($1) AND brand_id = $2 AND status != 'completed'
     RETURNING id, title`,
    [task_ids, req.params.brandId]
  );

  res.json({ status: 'success', data: { completed: result.rows.length, tasks: result.rows } });
}));

/**
 * POST /api/bulk/:brandId/tasks/delete
 * Bulk delete tasks.
 */
router.post('/:brandId/tasks/delete', catchAsync(async (req, res, next) => {
  await checkOwnerAdmin(req.params.brandId, req.user.id);
  const { task_ids } = req.body;
  if (!Array.isArray(task_ids) || task_ids.length === 0) {
    return next(new AppError('task_ids array required.', 400));
  }
  if (task_ids.length > MAX_BULK) return next(new AppError(`Max ${MAX_BULK} items.`, 400));

  const result = await query(
    `DELETE FROM tasks WHERE id = ANY($1) AND brand_id = $2`,
    [task_ids, req.params.brandId]
  );

  res.json({ status: 'success', data: { deleted: result.rowCount } });
}));

/**
 * POST /api/bulk/:brandId/email
 * Bulk send emails to clients.
 */
router.post('/:brandId/email', catchAsync(async (req, res, next) => {
  await checkOwnerAdmin(req.params.brandId, req.user.id);
  const { client_ids, subject, body } = req.body;
  if (!Array.isArray(client_ids) || !subject || !body) {
    return next(new AppError('client_ids, subject, and body required.', 400));
  }
  if (client_ids.length > MAX_BULK) return next(new AppError(`Max ${MAX_BULK} items.`, 400));

  // Get client emails
  const clients = await query(
    `SELECT id, email, name FROM clients WHERE id = ANY($1) AND brand_id = $2 AND email IS NOT NULL`,
    [client_ids, req.params.brandId]
  );

  // Queue emails (processed by email system)
  let sent = 0;
  for (const client of clients.rows) {
    try {
      const { sendEmail } = await import('../utils/emailUtils.js');
      await sendEmail({
        to: client.email,
        subject: subject.replace('{{name}}', client.name || ''),
        html: body.replace('{{name}}', client.name || ''),
      });
      sent++;
    } catch (e) {
      console.error(`[Bulk Email] Failed to send to ${client.email}:`, e.message);
    }
  }

  res.json({ status: 'success', data: { queued: clients.rows.length, sent } });
}));

export default router;
