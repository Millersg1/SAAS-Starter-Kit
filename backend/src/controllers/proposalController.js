import * as proposalModel from '../models/proposalModel.js';
import * as brandModel from '../models/brandModel.js';
import * as clientModel from '../models/clientModel.js';
import * as invoiceModel from '../models/invoiceModel.js';
import { sendProposalEmail } from '../utils/emailUtils.js';
import { deliverWebhook } from '../utils/webhookDelivery.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';
import { query } from '../config/database.js';

// ─── Agency Admin Handlers ───────────────────────────────────────────────────

/**
 * GET /api/proposals/:brandId
 */
export const getBrandProposals = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await brandModel.getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const proposals = await proposalModel.getBrandProposals(brandId, req.query);
  res.status(200).json({ status: 'success', data: { proposals } });
});

/**
 * POST /api/proposals
 */
export const createProposal = catchAsync(async (req, res, next) => {
  const { brand_id, client_id, items = [], ...rest } = req.body;

  const member = await brandModel.getBrandMember(brand_id, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const proposal_number = await proposalModel.generateProposalNumber(brand_id);
  const proposal = await proposalModel.createProposal({
    ...rest, brand_id, client_id, proposal_number, created_by: req.user.id,
  });

  // Add line items
  for (let i = 0; i < items.length; i++) {
    await proposalModel.addProposalItem({ ...items[i], proposal_id: proposal.id, sort_order: i });
  }

  // Recalculate totals
  await proposalModel.recalcProposalTotals(proposal.id, rest.tax_rate || 0, rest.discount_amount || 0);

  const full = await proposalModel.getProposalById(proposal.id);
  const itemsList = await proposalModel.getProposalItems(proposal.id);

  res.status(201).json({ status: 'success', data: { proposal: { ...full, items: itemsList } } });
});

/**
 * GET /api/proposals/item/:proposalId
 */
export const getProposal = catchAsync(async (req, res, next) => {
  const { proposalId } = req.params;
  const proposal = await proposalModel.getProposalById(proposalId);
  if (!proposal) return next(new AppError('Proposal not found.', 404));

  const member = await brandModel.getBrandMember(proposal.brand_id, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const items = await proposalModel.getProposalItems(proposalId);
  res.status(200).json({ status: 'success', data: { proposal: { ...proposal, items } } });
});

/**
 * PATCH /api/proposals/:proposalId
 */
export const updateProposal = catchAsync(async (req, res, next) => {
  const { proposalId } = req.params;
  const proposal = await proposalModel.getProposalById(proposalId);
  if (!proposal) return next(new AppError('Proposal not found.', 404));

  const member = await brandModel.getBrandMember(proposal.brand_id, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const updated = await proposalModel.updateProposal(proposalId, req.body);

  // If items provided, replace them
  if (req.body.items) {
    // Remove old items and re-add
    const items = req.body.items;
    const existing = await proposalModel.getProposalItems(proposalId);
    for (const item of existing) {
      await proposalModel.deleteProposalItem(item.id);
    }
    for (let i = 0; i < items.length; i++) {
      await proposalModel.addProposalItem({ ...items[i], proposal_id: proposalId, sort_order: i });
    }
    await proposalModel.recalcProposalTotals(proposalId, req.body.tax_rate || proposal.tax_rate, req.body.discount_amount || proposal.discount_amount);
  }

  const refreshed = await proposalModel.getProposalById(proposalId);
  const itemsList = await proposalModel.getProposalItems(proposalId);
  res.status(200).json({ status: 'success', data: { proposal: { ...refreshed, items: itemsList } } });
});

/**
 * POST /api/proposals/:proposalId/send
 * Set status=sent and email the client.
 */
export const sendProposal = catchAsync(async (req, res, next) => {
  const { proposalId } = req.params;
  const proposal = await proposalModel.getProposalById(proposalId);
  if (!proposal) return next(new AppError('Proposal not found.', 404));

  const member = await brandModel.getBrandMember(proposal.brand_id, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  if (!['draft'].includes(proposal.status)) {
    return next(new AppError('Only draft proposals can be sent.', 400));
  }

  await proposalModel.updateProposal(proposalId, {
    status: 'sent',
    issue_date: proposal.issue_date || new Date().toISOString().split('T')[0],
  });

  // Email the client
  try {
    const client = await clientModel.getClientById(proposal.client_id);
    const brand = await brandModel.getBrandById(proposal.brand_id);
    if (client?.email) {
      const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/proposals`;
      await sendProposalEmail(
        client.email, client.name,
        proposal.title, proposal.total_amount,
        proposal.expiry_date, portalUrl, brand?.name
      );
    }
  } catch (emailErr) {
    console.error('Failed to send proposal email:', emailErr.message);
  }

  // Webhook: proposal.sent
  deliverWebhook(proposal.brand_id, 'proposal.sent', { id: proposal.id, proposal_number: proposal.proposal_number, title: proposal.title, total_amount: proposal.total_amount }).catch(() => {});

  // Schedule email follow-up sequences (day 3 and day 7)
  try {
    const client = await clientModel.getClientById(proposal.client_id);
    if (client?.email) {
      await query(
        `INSERT INTO email_sequences (brand_id, proposal_id, client_id, sequence_day, scheduled_for)
         VALUES ($1,$2,$3,3, NOW() + INTERVAL '3 days'),
                ($1,$2,$3,7, NOW() + INTERVAL '7 days')`,
        [proposal.brand_id, proposalId, proposal.client_id]
      );
    }
  } catch (seqErr) {
    console.error('Failed to schedule email sequences:', seqErr.message);
  }

  const updated = await proposalModel.getProposalById(proposalId);
  res.status(200).json({ status: 'success', data: { proposal: updated } });
});

/**
 * POST /api/proposals/:proposalId/convert
 * Convert accepted/sent proposal to an invoice.
 */
export const convertProposalToInvoice = catchAsync(async (req, res, next) => {
  const { proposalId } = req.params;
  const proposal = await proposalModel.getProposalById(proposalId);
  if (!proposal) return next(new AppError('Proposal not found.', 404));

  const member = await brandModel.getBrandMember(proposal.brand_id, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const items = await proposalModel.getProposalItems(proposalId);
  const invoiceNumber = await invoiceModel.generateInvoiceNumber(proposal.brand_id);
  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const invoice = await invoiceModel.createInvoice({
    brand_id: proposal.brand_id,
    client_id: proposal.client_id,
    project_id: proposal.project_id,
    invoice_number: invoiceNumber,
    issue_date: today,
    due_date: dueDate,
    status: 'draft',
    currency: proposal.currency,
    notes: proposal.notes ? `${proposal.notes}\n\nConverted from proposal ${proposal.proposal_number}` : `Converted from proposal ${proposal.proposal_number}`,
    terms: proposal.terms,
    created_by: req.user.id,
  });

  for (let i = 0; i < items.length; i++) {
    await invoiceModel.addInvoiceItem({
      invoice_id: invoice.id,
      description: items[i].description,
      quantity: items[i].quantity,
      unit_price: items[i].unit_price,
      tax_rate: 0,
      sort_order: i,
    });
  }

  res.status(201).json({ status: 'success', data: { invoice } });
});

/**
 * DELETE /api/proposals/:proposalId
 */
export const deleteProposal = catchAsync(async (req, res, next) => {
  const { proposalId } = req.params;
  const proposal = await proposalModel.getProposalById(proposalId);
  if (!proposal) return next(new AppError('Proposal not found.', 404));

  const member = await brandModel.getBrandMember(proposal.brand_id, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  await proposalModel.deleteProposal(proposalId);
  res.status(200).json({ status: 'success', message: 'Proposal deleted.' });
});

// ─── Proposal Item Handlers ──────────────────────────────────────────────────

export const addProposalItem = catchAsync(async (req, res, next) => {
  const { proposalId } = req.params;
  const proposal = await proposalModel.getProposalById(proposalId);
  if (!proposal) return next(new AppError('Proposal not found.', 404));

  const member = await brandModel.getBrandMember(proposal.brand_id, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const item = await proposalModel.addProposalItem({ ...req.body, proposal_id: proposalId });
  await proposalModel.recalcProposalTotals(proposalId, proposal.tax_rate, proposal.discount_amount);

  res.status(201).json({ status: 'success', data: { item } });
});

export const updateProposalItem = catchAsync(async (req, res, next) => {
  const { proposalId, itemId } = req.params;
  const proposal = await proposalModel.getProposalById(proposalId);
  if (!proposal) return next(new AppError('Proposal not found.', 404));

  const member = await brandModel.getBrandMember(proposal.brand_id, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  const item = await proposalModel.updateProposalItem(itemId, req.body);
  await proposalModel.recalcProposalTotals(proposalId, proposal.tax_rate, proposal.discount_amount);

  res.status(200).json({ status: 'success', data: { item } });
});

export const deleteProposalItem = catchAsync(async (req, res, next) => {
  const { proposalId, itemId } = req.params;
  const proposal = await proposalModel.getProposalById(proposalId);
  if (!proposal) return next(new AppError('Proposal not found.', 404));

  const member = await brandModel.getBrandMember(proposal.brand_id, req.user.id);
  if (!member) return next(new AppError('Access denied.', 403));

  await proposalModel.deleteProposalItem(itemId);
  await proposalModel.recalcProposalTotals(proposalId, proposal.tax_rate, proposal.discount_amount);

  res.status(200).json({ status: 'success', message: 'Item removed.' });
});

// ─── Portal Handlers ─────────────────────────────────────────────────────────

/**
 * GET /api/portal/proposals
 */
export const getPortalProposals = catchAsync(async (req, res, next) => {
  const proposals = await proposalModel.getClientProposals(req.portalClient.id);
  res.status(200).json({ status: 'success', data: { proposals } });
});

/**
 * POST /api/portal/proposals/:proposalId/accept
 */
export const acceptProposal = catchAsync(async (req, res, next) => {
  const { proposalId } = req.params;
  const { signature, signer_name } = req.body;

  if (!signature || !signer_name) {
    return next(new AppError('Signature and signer name are required.', 400));
  }

  const proposal = await proposalModel.getProposalById(proposalId);
  if (!proposal || proposal.client_id !== req.portalClient.id) {
    return next(new AppError('Proposal not found.', 404));
  }
  if (proposal.status !== 'sent') {
    return next(new AppError('Only sent proposals can be accepted.', 400));
  }

  await proposalModel.updateProposal(proposalId, {
    status: 'accepted',
    client_signature: signature,
    signed_by_name: signer_name.trim(),
    signed_at: new Date().toISOString(),
    accepted_at: new Date().toISOString(),
  });

  // Webhook: proposal.accepted
  deliverWebhook(proposal.brand_id, 'proposal.accepted', { id: proposal.id, proposal_number: proposal.proposal_number, title: proposal.title, signed_by: signer_name?.trim() }).catch(() => {});

  res.status(200).json({ status: 'success', message: 'Proposal accepted.' });
});

/**
 * POST /api/portal/proposals/:proposalId/reject
 */
export const rejectProposal = catchAsync(async (req, res, next) => {
  const { proposalId } = req.params;
  const { reason } = req.body;

  const proposal = await proposalModel.getProposalById(proposalId);
  if (!proposal || proposal.client_id !== req.portalClient.id) {
    return next(new AppError('Proposal not found.', 404));
  }
  if (proposal.status !== 'sent') {
    return next(new AppError('Only sent proposals can be rejected.', 400));
  }

  await proposalModel.updateProposal(proposalId, {
    status: 'rejected',
    rejection_reason: reason?.trim() || null,
    rejected_at: new Date().toISOString(),
  });

  res.status(200).json({ status: 'success', message: 'Proposal rejected.' });
});
