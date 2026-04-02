import { query } from '../config/database.js';
import { getBrandMember } from '../models/brandModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

/**
 * Given a retainer's cycle_start and billing_cycle, return the start/end
 * dates of the *current* billing period.
 */
function getCurrentPeriod(cycleStart, billingCycle) {
  const start = new Date(cycleStart);
  const now = new Date();
  let periodStart = new Date(start);

  const advancePeriod = (d) => {
    const next = new Date(d);
    if (billingCycle === 'quarterly') {
      next.setMonth(next.getMonth() + 3);
    } else {
      // default monthly
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  };

  // Walk forward until the period covers "now"
  let periodEnd = advancePeriod(periodStart);
  while (periodEnd <= now) {
    periodStart = new Date(periodEnd);
    periodEnd = advancePeriod(periodStart);
  }

  return { periodStart, periodEnd };
}

/**
 * Sum hours logged in the retainer_usage table for the current billing period.
 */
async function getHoursUsed(retainerId, cycleStart, billingCycle) {
  const { periodStart, periodEnd } = getCurrentPeriod(cycleStart, billingCycle);

  const result = await query(
    `SELECT COALESCE(SUM(hours), 0) AS hours_used
     FROM retainer_usage
     WHERE retainer_id = $1
       AND date >= $2
       AND date < $3`,
    [retainerId, periodStart.toISOString(), periodEnd.toISOString()]
  );

  return {
    hours_used: parseFloat(result.rows[0].hours_used),
    period_start: periodStart.toISOString().slice(0, 10),
    period_end: periodEnd.toISOString().slice(0, 10),
  };
}

/* ────────────────────────────────────────────
   Controllers
   ──────────────────────────────────────────── */

/** GET /:brandId  —  List retainers */
export const listRetainers = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const { client_id, status } = req.query;
  let sql = 'SELECT * FROM retainers WHERE brand_id = $1';
  const vals = [brandId];
  let idx = 2;

  if (client_id) {
    sql += ` AND client_id = $${idx++}`;
    vals.push(client_id);
  }
  if (status) {
    sql += ` AND status = $${idx++}`;
    vals.push(status);
  }
  sql += ' ORDER BY created_at DESC';

  const result = await query(sql, vals);
  res.json({ status: 'success', data: { retainers: result.rows } });
});

/** POST /:brandId  —  Create retainer */
export const createRetainer = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const { client_id, name, hours_allocated, amount, billing_cycle } = req.body;
  if (!client_id || !name || !hours_allocated) {
    return next(new AppError('client_id, name, and hours_allocated are required', 400));
  }

  const cycle = billing_cycle || 'monthly';
  if (!['monthly', 'quarterly'].includes(cycle)) {
    return next(new AppError('billing_cycle must be monthly or quarterly', 400));
  }

  const result = await query(
    `INSERT INTO retainers
       (brand_id, client_id, name, hours_allocated, amount, billing_cycle, cycle_start, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'active', $7)
     RETURNING *`,
    [brandId, client_id, name, hours_allocated, amount || 0, cycle, req.user.id]
  );

  res.status(201).json({ status: 'success', data: { retainer: result.rows[0] } });
});

/** GET /:brandId/:retainerId  —  Get retainer with usage summary */
export const getRetainer = catchAsync(async (req, res, next) => {
  const { brandId, retainerId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const result = await query(
    'SELECT * FROM retainers WHERE id = $1 AND brand_id = $2',
    [retainerId, brandId]
  );
  if (result.rows.length === 0) return next(new AppError('Retainer not found', 404));

  const retainer = result.rows[0];
  const usage = await getHoursUsed(retainer.id, retainer.cycle_start, retainer.billing_cycle);

  res.json({
    status: 'success',
    data: {
      retainer: {
        ...retainer,
        ...usage,
        percent_used: retainer.hours_allocated > 0
          ? Math.round((usage.hours_used / retainer.hours_allocated) * 100)
          : 0,
      },
    },
  });
});

/** PATCH /:brandId/:retainerId  —  Update retainer */
export const updateRetainer = catchAsync(async (req, res, next) => {
  const { brandId, retainerId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const allowed = ['name', 'hours_allocated', 'amount', 'billing_cycle', 'status', 'cycle_start'];
  const sets = [];
  const vals = [retainerId, brandId];
  let idx = 3;

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = $${idx++}`);
      vals.push(req.body[key]);
    }
  }
  if (sets.length === 0) return next(new AppError('No valid fields to update', 400));

  sets.push('updated_at = NOW()');
  const result = await query(
    `UPDATE retainers SET ${sets.join(', ')} WHERE id = $1 AND brand_id = $2 RETURNING *`,
    vals
  );
  if (result.rows.length === 0) return next(new AppError('Retainer not found', 404));

  res.json({ status: 'success', data: { retainer: result.rows[0] } });
});

/** DELETE /:brandId/:retainerId */
export const deleteRetainer = catchAsync(async (req, res, next) => {
  const { brandId, retainerId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const result = await query(
    'DELETE FROM retainers WHERE id = $1 AND brand_id = $2',
    [retainerId, brandId]
  );
  if (result.rowCount === 0) return next(new AppError('Retainer not found', 404));

  res.json({ status: 'success', data: null });
});

/** POST /:brandId/:retainerId/usage  —  Log usage */
export const logUsage = catchAsync(async (req, res, next) => {
  const { brandId, retainerId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  // Verify retainer belongs to brand
  const retainer = await query(
    'SELECT id FROM retainers WHERE id = $1 AND brand_id = $2',
    [retainerId, brandId]
  );
  if (retainer.rows.length === 0) return next(new AppError('Retainer not found', 404));

  const { hours, description, date } = req.body;
  if (!hours || hours <= 0) return next(new AppError('hours must be a positive number', 400));

  const result = await query(
    `INSERT INTO retainer_usage (retainer_id, hours, description, date, logged_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [retainerId, hours, description || null, date || new Date().toISOString().slice(0, 10), req.user.id]
  );

  res.status(201).json({ status: 'success', data: { usage: result.rows[0] } });
});

/** GET /:brandId/:retainerId/usage  —  Get usage history */
export const getUsageHistory = catchAsync(async (req, res, next) => {
  const { brandId, retainerId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  // Verify retainer belongs to brand
  const retainer = await query(
    'SELECT id FROM retainers WHERE id = $1 AND brand_id = $2',
    [retainerId, brandId]
  );
  if (retainer.rows.length === 0) return next(new AppError('Retainer not found', 404));

  const result = await query(
    `SELECT ru.*, u.name AS logged_by_name
     FROM retainer_usage ru
     LEFT JOIN users u ON u.id = ru.logged_by
     WHERE ru.retainer_id = $1
     ORDER BY ru.date DESC, ru.created_at DESC`,
    [retainerId]
  );

  res.json({ status: 'success', data: { usage: result.rows } });
});

/** GET /:brandId/dashboard  —  Retainer dashboard */
export const getDashboard = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const retainers = await query(
    `SELECT r.*, c.name AS client_name
     FROM retainers r
     LEFT JOIN clients c ON c.id = r.client_id
     WHERE r.brand_id = $1
     ORDER BY r.created_at DESC`,
    [brandId]
  );

  const dashboard = await Promise.all(
    retainers.rows.map(async (r) => {
      const usage = await getHoursUsed(r.id, r.cycle_start, r.billing_cycle);
      return {
        id: r.id,
        name: r.name,
        client_id: r.client_id,
        client_name: r.client_name,
        status: r.status,
        hours_allocated: parseFloat(r.hours_allocated),
        hours_used: usage.hours_used,
        hours_remaining: Math.max(0, parseFloat(r.hours_allocated) - usage.hours_used),
        percent_used: r.hours_allocated > 0
          ? Math.round((usage.hours_used / parseFloat(r.hours_allocated)) * 100)
          : 0,
        amount: parseFloat(r.amount || 0),
        billing_cycle: r.billing_cycle,
        period_start: usage.period_start,
        period_end: usage.period_end,
      };
    })
  );

  res.json({ status: 'success', data: { retainers: dashboard } });
});
