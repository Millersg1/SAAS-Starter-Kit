import * as timeEntryModel from '../models/timeEntryModel.js';
import * as brandModel from '../models/brandModel.js';
import * as invoiceModel from '../models/invoiceModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

// ─── List ─────────────────────────────────────────────────────────────────────

export const listEntries = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await brandModel.getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const entries = await timeEntryModel.getBrandTimeEntries(brandId, req.query);
  const summary = await timeEntryModel.getBillableSummary(brandId, req.query);

  res.status(200).json({ status: 'success', data: { entries, summary } });
});

// ─── Get active timer ─────────────────────────────────────────────────────────

export const getActiveTimer = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await brandModel.getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const entry = await timeEntryModel.getActiveTimer(brandId, req.user.id);
  res.status(200).json({ status: 'success', data: { entry } });
});

// ─── Get project entries ──────────────────────────────────────────────────────

export const getProjectEntries = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;
  const entries = await timeEntryModel.getProjectTimeEntries(projectId);
  res.status(200).json({ status: 'success', data: { entries } });
});

// ─── Create ───────────────────────────────────────────────────────────────────

export const createEntry = catchAsync(async (req, res, next) => {
  const { brand_id } = req.body;
  if (!brand_id) return next(new AppError('brand_id is required.', 400));

  const member = await brandModel.getBrandMember(brand_id, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const entry = await timeEntryModel.createTimeEntry({
    ...req.body,
    user_id: req.user.id,
  });

  res.status(201).json({ status: 'success', data: { entry } });
});

// ─── Update (also handles timer stop) ────────────────────────────────────────

export const updateEntry = catchAsync(async (req, res, next) => {
  const { entryId } = req.params;
  const existing = await timeEntryModel.getTimeEntryById(entryId);
  if (!existing) return next(new AppError('Time entry not found.', 404));

  const member = await brandModel.getBrandMember(existing.brand_id, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const entry = await timeEntryModel.updateTimeEntry(entryId, req.body);
  res.status(200).json({ status: 'success', data: { entry } });
});

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteEntry = catchAsync(async (req, res, next) => {
  const { entryId } = req.params;
  const existing = await timeEntryModel.getTimeEntryById(entryId);
  if (!existing) return next(new AppError('Time entry not found.', 404));

  const member = await brandModel.getBrandMember(existing.brand_id, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  await timeEntryModel.deleteTimeEntry(entryId);
  res.status(200).json({ status: 'success', message: 'Time entry deleted.' });
});

// ─── Add to invoice ───────────────────────────────────────────────────────────

export const addToInvoice = catchAsync(async (req, res, next) => {
  const { entryId } = req.params;
  const { invoice_id } = req.body;
  if (!invoice_id) return next(new AppError('invoice_id is required.', 400));

  const existing = await timeEntryModel.getTimeEntryById(entryId);
  if (!existing) return next(new AppError('Time entry not found.', 404));
  if (existing.is_invoiced) return next(new AppError('Time entry already invoiced.', 400));
  if (!existing.end_time) return next(new AppError('Cannot invoice a running timer.', 400));

  const member = await brandModel.getBrandMember(existing.brand_id, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const hours = (existing.duration_minutes / 60).toFixed(2);
  const description = existing.description
    ? `${existing.description} (${hours}h)`
    : `Time entry (${hours}h)`;

  await invoiceModel.addInvoiceItem({
    invoice_id,
    description,
    quantity: parseFloat(hours),
    unit_price: parseFloat(existing.hourly_rate || 0),
    tax_rate: 0,
    sort_order: 999,
  });

  const updated = await timeEntryModel.updateTimeEntry(entryId, {
    is_invoiced: true,
    invoice_id,
  });

  res.status(200).json({ status: 'success', data: { entry: updated } });
});
