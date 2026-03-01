import crypto from 'crypto';
import * as invoiceModel from '../models/invoiceModel.js';
import * as brandModel from '../models/brandModel.js';
import * as clientModel from '../models/clientModel.js';
import { sendInvoiceEmail, sendPaymentConfirmationEmail } from '../utils/emailUtils.js';
import { deliverWebhook } from '../utils/webhookDelivery.js';
import { triggerWorkflow } from '../utils/workflowEngine.js';
import { query } from '../config/database.js';

// ============================================
// INVOICE MANAGEMENT
// ============================================

/**
 * Create a new invoice
 */
export const createInvoice = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Generate invoice number if not provided
    let invoiceNumber = req.body.invoice_number;
    if (!invoiceNumber) {
      invoiceNumber = await invoiceModel.generateInvoiceNumber(brandId);
    }

    const invoiceData = {
      brand_id: brandId,
      client_id: req.body.client_id,
      project_id: req.body.project_id,
      invoice_number: invoiceNumber,
      issue_date: req.body.issue_date || new Date().toISOString().split('T')[0],
      due_date: req.body.due_date,
      status: req.body.status || 'draft',
      currency: req.body.currency || 'USD',
      notes: req.body.notes,
      terms: req.body.terms,
      footer: req.body.footer,
      created_by: userId
    };

    const invoice = await invoiceModel.createInvoice(invoiceData);

    // Add items if provided
    if (req.body.items && Array.isArray(req.body.items)) {
      for (let i = 0; i < req.body.items.length; i++) {
        const item = req.body.items[i];
        
        await invoiceModel.addInvoiceItem({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate || 0,
          sort_order: i
        });
      }
    }

    // Get the complete invoice with items
    const completeInvoice = await invoiceModel.getInvoiceById(invoice.id);
    const items = await invoiceModel.getInvoiceItems(invoice.id);

    res.status(201).json({
      status: 'success',
      message: 'Invoice created successfully',
      data: { 
        invoice: completeInvoice,
        items
      }
    });
  } catch (error) {
    console.error('Error creating invoice: - invoiceController.js:77', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create invoice',
      error: error.message
    });
  }
};

/**
 * Get all invoices for a brand
 */
export const getBrandInvoices = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const filters = {
      client_id: req.query.client_id,
      project_id: req.query.project_id,
      status: req.query.status,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const invoices = await invoiceModel.getBrandInvoices(brandId, filters);

    res.status(200).json({
      status: 'success',
      results: invoices.length,
      data: { invoices }
    });
  } catch (error) {
    console.error('Error getting brand invoices: - invoiceController.js:120', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve invoices',
      error: error.message
    });
  }
};

/**
 * Get single invoice by ID
 */
export const getInvoice = async (req, res) => {
  try {
    const { brandId, invoiceId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const invoice = await invoiceModel.getInvoiceById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        status: 'fail',
        message: 'Invoice not found'
      });
    }

    // Verify invoice belongs to brand
    if (invoice.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Invoice does not belong to this brand'
      });
    }

    // Get invoice items
    const items = await invoiceModel.getInvoiceItems(invoiceId);

    // Get payment history
    const payments = await invoiceModel.getInvoicePayments(invoiceId);

    res.status(200).json({
      status: 'success',
      data: { 
        invoice,
        items,
        payments
      }
    });
  } catch (error) {
    console.error('Error getting invoice: - invoiceController.js:178', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve invoice',
      error: error.message
    });
  }
};

/**
 * Update invoice
 */
export const updateInvoice = async (req, res) => {
  try {
    const { brandId, invoiceId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if invoice exists and belongs to brand
    const existingInvoice = await invoiceModel.getInvoiceById(invoiceId);
    if (!existingInvoice) {
      return res.status(404).json({
        status: 'fail',
        message: 'Invoice not found'
      });
    }

    if (existingInvoice.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Invoice does not belong to this brand'
      });
    }

    const invoice = await invoiceModel.updateInvoice(invoiceId, req.body);

    // Webhook: invoice.sent
    if (req.body.status === 'sent' && existingInvoice.status !== 'sent') {
      deliverWebhook(brandId, 'invoice.sent', { id: invoice.id, invoice_number: invoice.invoice_number, total_amount: invoice.total_amount }).catch(() => {});
    }

    // Send invoice email to client when status changes to 'sent'
    if (req.body.status === 'sent' && existingInvoice.status !== 'sent' && invoice.client_id) {
      try {
        const client = await clientModel.getClientById(invoice.client_id);
        if (client?.email) {
          const brand = await brandModel.getBrandById(brandId);
          const portalUrl = brand ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/login?brand=${brandId}` : null;
          await sendInvoiceEmail(
            client.email, client.name,
            invoice.invoice_number, invoice.total_amount,
            invoice.due_date, portalUrl, brand?.name || 'Your Account Manager'
          );
        }
      } catch (emailErr) {
        console.error('Failed to send invoice email:', emailErr);
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Invoice updated successfully',
      data: { invoice }
    });
  } catch (error) {
    console.error('Error updating invoice: - invoiceController.js:228', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update invoice',
      error: error.message
    });
  }
};

/**
 * Delete invoice
 */
export const deleteInvoice = async (req, res) => {
  try {
    const { brandId, invoiceId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if invoice exists and belongs to brand
    const existingInvoice = await invoiceModel.getInvoiceById(invoiceId);
    if (!existingInvoice) {
      return res.status(404).json({
        status: 'fail',
        message: 'Invoice not found'
      });
    }

    if (existingInvoice.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Invoice does not belong to this brand'
      });
    }

    await invoiceModel.deleteInvoice(invoiceId);

    res.status(200).json({
      status: 'success',
      message: 'Invoice cancelled successfully'
    });
  } catch (error) {
    console.error('Error deleting invoice: - invoiceController.js:277', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete invoice',
      error: error.message
    });
  }
};

// ============================================
// INVOICE ITEMS
// ============================================

/**
 * Add item to invoice
 */
export const addInvoiceItem = async (req, res) => {
  try {
    const { brandId, invoiceId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if invoice exists and belongs to brand
    const invoice = await invoiceModel.getInvoiceById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        status: 'fail',
        message: 'Invoice not found'
      });
    }

    if (invoice.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Invoice does not belong to this brand'
      });
    }

    if (parseFloat(req.body.quantity) < 0 || parseFloat(req.body.unit_price) < 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Quantity and unit price must be non-negative'
      });
    }

    const itemData = {
      invoice_id: invoiceId,
      description: req.body.description,
      quantity: req.body.quantity,
      unit_price: req.body.unit_price,
      tax_rate: req.body.tax_rate || 0,
      sort_order: req.body.sort_order || 0
    };

    const item = await invoiceModel.addInvoiceItem(itemData);

    res.status(201).json({
      status: 'success',
      message: 'Item added successfully',
      data: { item }
    });
  } catch (error) {
    console.error('Error adding invoice item: - invoiceController.js:340', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add item',
      error: error.message
    });
  }
};

/**
 * Update invoice item
 */
export const updateInvoiceItem = async (req, res) => {
  try {
    const { brandId, invoiceId, itemId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if invoice exists and belongs to brand
    const invoice = await invoiceModel.getInvoiceById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        status: 'fail',
        message: 'Invoice not found'
      });
    }

    if (invoice.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Invoice does not belong to this brand'
      });
    }

    if (req.body.quantity !== undefined && parseFloat(req.body.quantity) < 0) {
      return res.status(400).json({ status: 'fail', message: 'Quantity must be non-negative' });
    }
    if (req.body.unit_price !== undefined && parseFloat(req.body.unit_price) < 0) {
      return res.status(400).json({ status: 'fail', message: 'Unit price must be non-negative' });
    }

    const item = await invoiceModel.updateInvoiceItem(itemId, req.body);

    if (!item) {
      return res.status(404).json({
        status: 'fail',
        message: 'Item not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Item updated successfully',
      data: { item }
    });
  } catch (error) {
    console.error('Error updating invoice item: - invoiceController.js:397', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update item',
      error: error.message
    });
  }
};

/**
 * Delete invoice item
 */
export const deleteInvoiceItem = async (req, res) => {
  try {
    const { brandId, invoiceId, itemId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if invoice exists and belongs to brand
    const invoice = await invoiceModel.getInvoiceById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        status: 'fail',
        message: 'Invoice not found'
      });
    }

    if (invoice.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Invoice does not belong to this brand'
      });
    }

    await invoiceModel.deleteInvoiceItem(itemId);

    res.status(200).json({
      status: 'success',
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting invoice item: - invoiceController.js:446', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete item',
      error: error.message
    });
  }
};

// ============================================
// PAYMENTS
// ============================================

/**
 * Record a payment
 */
export const recordPayment = async (req, res) => {
  try {
    const { brandId, invoiceId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Check if invoice exists and belongs to brand
    const invoice = await invoiceModel.getInvoiceById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        status: 'fail',
        message: 'Invoice not found'
      });
    }

    if (invoice.brand_id !== brandId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Invoice does not belong to this brand'
      });
    }

    if (!req.body.amount || parseFloat(req.body.amount) <= 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Payment amount must be greater than zero'
      });
    }

    const paymentData = {
      invoice_id: invoiceId,
      brand_id: brandId,
      client_id: invoice.client_id,
      amount: req.body.amount,
      currency: req.body.currency || invoice.currency,
      payment_method: req.body.payment_method,
      payment_status: req.body.payment_status || 'completed',
      transaction_id: req.body.transaction_id,
      payment_date: req.body.payment_date || new Date(),
      notes: req.body.notes,
      created_by: userId
    };

    const payment = await invoiceModel.recordPayment(paymentData);

    // Webhook: invoice.paid
    deliverWebhook(brandId, 'invoice.paid', { id: invoice.id, invoice_number: invoice.invoice_number, amount: req.body.amount, payment_method: req.body.payment_method }).catch(() => {});

    // Send payment confirmation email to client
    if (invoice.client_id) {
      try {
        const client = await clientModel.getClientById(invoice.client_id);
        if (client?.email) {
          const brand = await brandModel.getBrandById(brandId);
          await sendPaymentConfirmationEmail(
            client.email, client.name,
            invoice.invoice_number, req.body.amount,
            brand?.name || 'Your Account Manager'
          );
        }
      } catch (emailErr) {
        console.error('Failed to send payment confirmation email:', emailErr);
      }
    }

    // Workflow automation trigger
    if (invoice.client_id) {
      triggerWorkflow(brandId, 'invoice_paid', invoice.client_id, 'client').catch(() => {});
    }

    // Auto reputation review request trigger
    if (invoice.client_id) {
      import('../utils/reputationTrigger.js')
        .then(m => m.autoSendReviewRequest(brandId, invoice.client_id, 'invoice_paid'))
        .catch(() => {});
    }

    res.status(201).json({
      status: 'success',
      message: 'Payment recorded successfully',
      data: { payment }
    });
  } catch (error) {
    console.error('Error recording payment: - invoiceController.js:514', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record payment',
      error: error.message
    });
  }
};

/**
 * Get payment history for an invoice
 */
export const getInvoicePayments = async (req, res) => {
  try {
    const { brandId, invoiceId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const payments = await invoiceModel.getInvoicePayments(invoiceId);

    res.status(200).json({
      status: 'success',
      results: payments.length,
      data: { payments }
    });
  } catch (error) {
    console.error('Error getting invoice payments: - invoiceController.js:548', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve payments',
      error: error.message
    });
  }
};

// ============================================
// STATISTICS & REPORTS
// ============================================

/**
 * Get invoice statistics
 */
export const getInvoiceStats = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const stats = await invoiceModel.getInvoiceStats(brandId);

    res.status(200).json({
      status: 'success',
      data: { stats }
    });
  } catch (error) {
    console.error('Error getting invoice stats: - invoiceController.js:585', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve statistics',
      error: error.message
    });
  }
};

/**
 * Get overdue invoices
 */
export const getOverdueInvoices = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const invoices = await invoiceModel.getOverdueInvoices(brandId);

    res.status(200).json({
      status: 'success',
      results: invoices.length,
      data: { invoices }
    });
  } catch (error) {
    console.error('Error getting overdue invoices: - invoiceController.js:619', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve overdue invoices',
      error: error.message
    });
  }
};

// ============================================
// PUBLIC SHARE LINK
// ============================================

/**
 * POST /api/invoices/:brandId/:invoiceId/share-link
 * Generate a public payment link token for an invoice.
 */
export const generateShareLink = async (req, res) => {
  try {
    const { brandId, invoiceId } = req.params;
    const userId = req.user.id;

    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const invoice = await invoiceModel.getInvoiceById(invoiceId);
    if (!invoice || invoice.brand_id !== brandId) {
      return res.status(404).json({ status: 'fail', message: 'Invoice not found.' });
    }

    // Generate or reuse existing token
    let token = invoice.public_token;
    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      await query(
        `UPDATE invoices SET public_token = $1 WHERE id = $2`,
        [token, invoiceId]
      );
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const url = `${frontendUrl}/pay/${token}`;

    res.status(200).json({ status: 'success', data: { url, token } });
  } catch (error) {
    console.error('Error generating share link:', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate share link.' });
  }
};
