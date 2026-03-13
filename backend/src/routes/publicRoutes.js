import express from 'express';
import { query } from '../config/database.js';
import { getBrandById } from '../models/brandModel.js';
import { getInvoiceItems } from '../models/invoiceModel.js';
import * as stripeUtils from '../utils/stripeUtils.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';
import { sendContactEmail } from '../utils/emailUtils.js';
import { handlePublicSurveyView, handlePublicSurveySubmit } from '../controllers/surveyController.js';

const router = express.Router();

/**
 * GET /api/public/invoice/:token
 * Return invoice data for a public payment page (no auth required).
 */
router.get('/invoice/:token', catchAsync(async (req, res, next) => {
  const { token } = req.params;

  const result = await query(
    `SELECT i.id, i.invoice_number, i.status, i.total_amount, i.amount_due,
            i.amount_paid, i.currency, i.due_date, i.issue_date, i.notes,
            i.brand_id, i.client_id,
            b.name AS brand_name, b.logo_url AS brand_logo,
            b.primary_color, b.secondary_color,
            b.stripe_account_id, b.stripe_charges_enabled
     FROM invoices i
     JOIN brands b ON b.id = i.brand_id
     WHERE i.public_token = $1`,
    [token]
  );

  const invoice = result.rows[0];
  if (!invoice) {
    return next(new AppError('Invoice not found or link is invalid.', 404));
  }

  if (!['sent', 'partial', 'overdue'].includes(invoice.status)) {
    return next(new AppError('This invoice is not payable.', 400));
  }

  const items = await getInvoiceItems(invoice.id);

  // Strip sensitive client info — only return invoice + brand
  res.status(200).json({
    status: 'success',
    data: {
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: invoice.status,
        total_amount: invoice.total_amount,
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        due_date: invoice.due_date,
        issue_date: invoice.issue_date,
        notes: invoice.notes,
        items,
      },
      brand: {
        name: invoice.brand_name,
        logo_url: invoice.brand_logo,
        primary_color: invoice.primary_color,
        secondary_color: invoice.secondary_color,
        payment_enabled: !!(invoice.stripe_account_id && invoice.stripe_charges_enabled),
      },
    },
  });
}));

/**
 * POST /api/public/invoice/:token/pay
 * Create Stripe Checkout Session for a public invoice payment.
 */
router.post('/invoice/:token/pay', catchAsync(async (req, res, next) => {
  const { token } = req.params;

  const result = await query(
    `SELECT i.id, i.invoice_number, i.amount_due, i.currency, i.brand_id, i.status
     FROM invoices i
     WHERE i.public_token = $1`,
    [token]
  );

  const invoice = result.rows[0];
  if (!invoice) {
    return next(new AppError('Invoice not found.', 404));
  }
  if (!['sent', 'partial', 'overdue'].includes(invoice.status)) {
    return next(new AppError('Invoice is not payable.', 400));
  }

  const amountDue = Math.round(parseFloat(invoice.amount_due) * 100);
  if (amountDue <= 0) {
    return next(new AppError('Invoice has no outstanding balance.', 400));
  }

  const brand = await getBrandById(invoice.brand_id);
  if (!brand?.stripe_account_id || !brand?.stripe_charges_enabled) {
    return res.status(402).json({
      status: 'fail',
      code: 'connect_required',
      message: 'Online payment is not available for this invoice.',
    });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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
    successUrl: `${frontendUrl}/pay/${token}?payment=success`,
    cancelUrl: `${frontendUrl}/pay/${token}?payment=cancel`,
    metadata: {
      type: 'invoice_payment',
      invoiceId: invoice.id,
      brandId: invoice.brand_id,
    },
    applicationFeeAmount,
  });

  res.status(200).json({ status: 'success', data: { url: session.url } });
}));

/**
 * POST /api/public/contact
 * Contact form submission — sends email to sales inbox.
 */
router.post('/contact', catchAsync(async (req, res, next) => {
  const { name, email, company, message } = req.body;

  if (!name || !email || !message) {
    return next(new AppError('Name, email, and message are required.', 400));
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return next(new AppError('Please provide a valid email address.', 400));
  }

  if (message.length > 5000) {
    return next(new AppError('Message is too long (max 5000 characters).', 400));
  }

  try {
    await sendContactEmail({ name, email, company, message });
  } catch (err) {
    console.error('Contact email delivery failed:', err.message);
    return next(new AppError('Unable to send your message right now. Please email us directly at sales@saassurface.com', 503));
  }

  res.status(200).json({ status: 'success', message: 'Your message has been sent. We\'ll be in touch shortly.' });
}));

/** Public survey endpoints — no auth required */
router.get('/survey/:token',  handlePublicSurveyView);
router.post('/survey/:token', handlePublicSurveySubmit);

export default router;
