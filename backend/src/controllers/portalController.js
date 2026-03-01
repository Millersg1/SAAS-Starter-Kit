import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { getBrandById } from '../models/brandModel.js';
import * as stripeUtils from '../utils/stripeUtils.js';
import { updateLastPortalLogin } from '../models/clientModel.js';
import { getClientProjects, getProjectUpdates } from '../models/projectModel.js';
import { getClientDocuments } from '../models/documentModel.js';
import { getClientInvoices, getInvoiceById } from '../models/invoiceModel.js';
import { getBrandThreads, getThreadMessages, createMessage } from '../models/messageModel.js';
import { getClientProposals, updateProposal, recordView } from '../models/proposalModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';
import { createProject } from '../models/projectModel.js';
import { createActivity } from '../models/clientActivityModel.js';
import { triggerWorkflow } from '../utils/workflowEngine.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const PORTAL_TOKEN_EXPIRE = process.env.PORTAL_TOKEN_EXPIRE || '7d';

/**
 * POST /api/portal/login
 * Authenticate a client and return a portal JWT
 */
export const portalLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // brandId from body, or from custom domain middleware
  const brandId = req.body.brandId || req.customDomainBrandId;

  if (!email || !password || !brandId) {
    return next(new AppError('Email, password, and brandId are required.', 400));
  }

  // Fetch client including portal_password_hash (omitted by getClientByEmail)
  const result = await query(
    `SELECT id, brand_id, name, email, phone, company, status, client_type,
            portal_access, portal_password_hash, is_active
     FROM clients
     WHERE brand_id = $1 AND LOWER(email) = LOWER($2) AND is_active = TRUE`,
    [brandId, email]
  );

  const client = result.rows[0];

  if (!client || !client.portal_access) {
    return next(new AppError('Invalid credentials or portal access not enabled.', 401));
  }

  if (!client.portal_password_hash) {
    return next(
      new AppError('Portal password has not been set. Please contact your account manager.', 401)
    );
  }

  const isPasswordValid = await bcrypt.compare(password, client.portal_password_hash);
  if (!isPasswordValid) {
    return next(new AppError('Invalid credentials.', 401));
  }

  const brand = await getBrandById(brandId);
  if (!brand) {
    return next(new AppError('Brand not found.', 404));
  }

  await updateLastPortalLogin(client.id);

  const token = jwt.sign(
    { clientId: client.id, brandId, type: 'portal' },
    JWT_SECRET,
    { expiresIn: PORTAL_TOKEN_EXPIRE }
  );

  // Omit password hash from response
  const { portal_password_hash, ...safeClient } = client;

  res.status(200).json({
    status: 'success',
    data: {
      token,
      client: safeClient,
      brand: {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        logo_url: brand.logo_url,
        primary_color: brand.primary_color,
        secondary_color: brand.secondary_color,
      },
    },
  });
});

/**
 * GET /api/portal/me
 * Return the currently authenticated portal client
 */
export const getPortalMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: { client: req.portalClient },
  });
});

/**
 * GET /api/portal/projects
 * Return non-cancelled projects for the client, with client-visible updates
 */
export const getPortalProjects = catchAsync(async (req, res, next) => {
  const allProjects = await getClientProjects(req.portalClient.id);
  const projects = allProjects.filter((p) => p.status !== 'cancelled');

  const projectsWithUpdates = await Promise.all(
    projects.map(async (project) => {
      const updates = await getProjectUpdates(project.id, {
        visible_to_client: true,
        limit: 5,
      });
      return { ...project, recent_updates: updates };
    })
  );

  res.status(200).json({
    status: 'success',
    data: { projects: projectsWithUpdates },
  });
});

/**
 * GET /api/portal/documents
 * Return documents shared with the client (is_client_visible = true)
 */
export const getPortalDocuments = catchAsync(async (req, res, next) => {
  const documents = await getClientDocuments(req.portalClient.id);

  res.status(200).json({
    status: 'success',
    data: { documents },
  });
});

/**
 * GET /api/portal/invoices
 * Return sent/paid/overdue invoices for the client (no draft or cancelled)
 */
export const getPortalInvoices = catchAsync(async (req, res, next) => {
  const allInvoices = await getClientInvoices(req.portalClient.id);
  const invoices = allInvoices.filter(
    (inv) => !['draft', 'cancelled'].includes(inv.status)
  );

  res.status(200).json({
    status: 'success',
    data: { invoices },
  });
});

/**
 * GET /api/portal/messages
 * Return message threads for this client
 */
export const getPortalMessages = catchAsync(async (req, res, next) => {
  const threads = await getBrandThreads(req.portalBrandId, {
    client_id: req.portalClient.id,
  });

  res.status(200).json({
    status: 'success',
    data: { threads },
  });
});

/**
 * GET /api/portal/messages/:threadId
 * Return a single thread and its messages (access-controlled to this client)
 */
export const getPortalThread = catchAsync(async (req, res, next) => {
  const { threadId } = req.params;

  const threads = await getBrandThreads(req.portalBrandId, {
    client_id: req.portalClient.id,
  });

  const thread = threads.find((t) => t.id === threadId);
  if (!thread) {
    return next(new AppError('Thread not found or access denied.', 404));
  }

  const messages = await getThreadMessages(threadId);

  res.status(200).json({
    status: 'success',
    data: { thread, messages },
  });
});

/**
 * POST /api/portal/messages/:threadId
 * Allow the portal client to send a message in an existing thread
 */
export const portalSendMessage = catchAsync(async (req, res, next) => {
  const { threadId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return next(new AppError('Message content is required.', 400));
  }

  const threads = await getBrandThreads(req.portalBrandId, {
    client_id: req.portalClient.id,
  });

  const thread = threads.find((t) => t.id === threadId);
  if (!thread) {
    return next(new AppError('Thread not found or access denied.', 404));
  }

  const message = await createMessage({
    thread_id: threadId,
    sender_id: req.portalClient.id,
    sender_type: 'client',
    content: content.trim(),
  });

  res.status(201).json({
    status: 'success',
    data: { message },
  });
});

/**
 * POST /api/portal/invoices/:invoiceId/pay
 * Create a Stripe Checkout Session for the client to pay an invoice
 */
export const createPortalPaymentCheckout = catchAsync(async (req, res, next) => {
  const { invoiceId } = req.params;
  const { portalClient, portalBrandId } = req;

  const invoice = await getInvoiceById(invoiceId);
  if (!invoice || invoice.client_id !== portalClient.id || invoice.brand_id !== portalBrandId) {
    return next(new AppError('Invoice not found.', 404));
  }
  if (!['sent', 'partial', 'overdue'].includes(invoice.status)) {
    return next(new AppError('Invoice is not payable at this time.', 400));
  }
  const amountDue = Math.round(parseFloat(invoice.amount_due) * 100);
  if (amountDue <= 0) {
    return next(new AppError('Invoice has no outstanding balance.', 400));
  }

  const brand = await getBrandById(portalBrandId);

  // Require Stripe Connect — agency must have connected their own Stripe account
  if (!brand?.stripe_account_id || !brand?.stripe_charges_enabled) {
    return res.status(402).json({
      status: 'fail',
      code: 'connect_required',
      message: 'Online payment is not available yet. Please contact your account manager.',
    });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Platform fee (e.g. 2% of invoice amount)
  const feePct = parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || '2') / 100;
  const applicationFeeAmount = Math.round(amountDue * feePct);

  const session = await stripeUtils.createConnectCheckoutSession({
    connectedAccountId: brand.stripe_account_id,
    lineItems: [{
      price_data: {
        currency: invoice.currency.toLowerCase(),
        product_data: {
          name: `Invoice ${invoice.invoice_number}`,
          description: brand.name || 'Payment',
        },
        unit_amount: amountDue,
      },
      quantity: 1,
    }],
    successUrl: `${frontendUrl}/portal/invoices?payment=success&invoice=${invoiceId}`,
    cancelUrl: `${frontendUrl}/portal/invoices?payment=cancel`,
    metadata: {
      type: 'invoice_payment',
      invoiceId,
      brandId: portalBrandId,
      clientId: portalClient.id,
    },
    applicationFeeAmount,
  });

  res.status(200).json({ status: 'success', data: { url: session.url } });
});

/**
 * POST /api/portal/invoices/:invoiceId/sign
 * Allow portal client to e-sign an invoice with a canvas signature
 */
export const signInvoice = catchAsync(async (req, res, next) => {
  const { invoiceId } = req.params;
  const { signature, signer_name } = req.body;
  const { portalClient } = req;

  if (!signature || !signer_name) {
    return next(new AppError('Signature and signer name are required.', 400));
  }

  const invoice = await getInvoiceById(invoiceId);
  if (!invoice || invoice.client_id !== portalClient.id) {
    return next(new AppError('Invoice not found.', 404));
  }
  if (invoice.client_signature) {
    return next(new AppError('Invoice has already been signed.', 400));
  }
  if (!['sent', 'partial', 'overdue'].includes(invoice.status)) {
    return next(new AppError('Only sent or unpaid invoices can be signed.', 400));
  }

  await query(
    `UPDATE invoices SET client_signature = $1, signed_at = NOW(), signed_by_name = $2 WHERE id = $3`,
    [signature, signer_name.trim(), invoiceId]
  );

  res.status(200).json({ status: 'success', message: 'Invoice signed successfully.' });
});

/**
 * GET /api/portal/proposals
 * Return sent/accepted/rejected proposals for the portal client.
 */
export const getPortalProposals = catchAsync(async (req, res) => {
  const proposals = await getClientProposals(req.portalClient.id);
  res.status(200).json({ status: 'success', data: { proposals } });
});

export const getPortalProposal = catchAsync(async (req, res, next) => {
  const { proposalId } = req.params;
  const proposals = await getClientProposals(req.portalClient.id);
  const proposal = proposals.find((p) => p.id === proposalId);
  if (!proposal) {
    return next(new AppError('Proposal not found or access denied.', 404));
  }
  // Record view
  try { await recordView(proposalId); } catch (_) {}
  res.status(200).json({ status: 'success', data: { proposal } });
});

/**
 * POST /api/portal/proposals/:proposalId/accept
 * Client accepts a proposal with an optional e-signature.
 */
export const acceptProposal = catchAsync(async (req, res, next) => {
  const { proposalId } = req.params;
  const { signature, signer_name } = req.body;

  const proposals = await getClientProposals(req.portalClient.id);
  const proposal = proposals.find((p) => p.id === proposalId);
  if (!proposal) {
    return next(new AppError('Proposal not found or access denied.', 404));
  }
  if (proposal.status !== 'sent') {
    return next(new AppError('Only sent proposals can be accepted.', 400));
  }

  const updated = await updateProposal(proposalId, {
    status: 'accepted',
    accepted_at: new Date().toISOString(),
    client_signature: signature || null,
    signed_at: signature ? new Date().toISOString() : null,
    signed_by_name: signer_name || null,
  });

  // Onboarding automation: auto-create project from accepted proposal
  try {
    const newProject = await createProject({
      brand_id: proposal.brand_id,
      client_id: proposal.client_id,
      name: proposal.title,
      description: `Auto-created from accepted proposal #${proposal.proposal_number || proposal.id.slice(0, 8)}`,
      project_type: 'general',
      status: 'planning',
      priority: 'normal',
      currency: proposal.currency || 'USD',
      budget: proposal.total_amount || 0,
      created_by: proposal.created_by,
    });

    // Link project to proposal
    await query(
      `UPDATE proposals SET onboarding_project_id = $1 WHERE id = $2`,
      [newProject.id, proposalId]
    );

    // Log activity on client
    await createActivity({
      brand_id: proposal.brand_id,
      client_id: proposal.client_id,
      user_id: null,
      activity_type: 'system',
      title: 'Proposal accepted — project created',
      body: `Client accepted proposal "${proposal.title}". Onboarding project created automatically.`,
    });

    // Cancel pending email sequences for this proposal
    await query(
      `UPDATE email_sequences SET status = 'cancelled' WHERE proposal_id = $1 AND status = 'pending'`,
      [proposalId]
    );
  } catch (automationErr) {
    console.error('Onboarding automation error (non-fatal):', automationErr.message);
  }

  triggerWorkflow(proposal.brand_id, 'proposal_accepted', proposal.client_id, 'client').catch(() => {});

  res.status(200).json({ status: 'success', data: { proposal: updated } });
});

/**
 * POST /api/portal/proposals/:proposalId/reject
 * Client rejects a proposal with an optional reason.
 */
export const rejectProposal = catchAsync(async (req, res, next) => {
  const { proposalId } = req.params;
  const { reason } = req.body;

  const proposals = await getClientProposals(req.portalClient.id);
  const proposal = proposals.find((p) => p.id === proposalId);
  if (!proposal) {
    return next(new AppError('Proposal not found or access denied.', 404));
  }
  if (proposal.status !== 'sent') {
    return next(new AppError('Only sent proposals can be rejected.', 400));
  }

  const updated = await updateProposal(proposalId, {
    status: 'rejected',
    rejected_at: new Date().toISOString(),
    rejection_reason: reason || null,
  });

  res.status(200).json({ status: 'success', data: { proposal: updated } });
});
