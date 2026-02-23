import express from 'express';
import * as invoiceController from '../controllers/invoiceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// INVOICE ROUTES
// ============================================

// Invoice CRUD
router.post('/:brandId/invoices', invoiceController.createInvoice);
router.get('/:brandId/invoices', invoiceController.getBrandInvoices);
router.get('/:brandId/invoices/:invoiceId', invoiceController.getInvoice);
router.patch('/:brandId/invoices/:invoiceId', invoiceController.updateInvoice);
router.delete('/:brandId/invoices/:invoiceId', invoiceController.deleteInvoice);

// Invoice items
router.post('/:brandId/invoices/:invoiceId/items', invoiceController.addInvoiceItem);
router.patch('/:brandId/invoices/:invoiceId/items/:itemId', invoiceController.updateInvoiceItem);
router.delete('/:brandId/invoices/:invoiceId/items/:itemId', invoiceController.deleteInvoiceItem);

// Payments
router.post('/:brandId/invoices/:invoiceId/payments', invoiceController.recordPayment);
router.get('/:brandId/invoices/:invoiceId/payments', invoiceController.getInvoicePayments);

// Statistics & Reports
router.get('/:brandId/stats', invoiceController.getInvoiceStats);
router.get('/:brandId/overdue', invoiceController.getOverdueInvoices);

// Public share link
router.post('/:brandId/invoices/:invoiceId/share-link', invoiceController.generateShareLink);

export default router;
