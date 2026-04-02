import express from 'express';
import * as accountingController from '../controllers/accountingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// ACCOUNTING INTEGRATION ROUTES
// ============================================

// Get connected accounting service (QuickBooks or Xero)
router.get('/:brandId/connection', accountingController.getConnection);

// Start QuickBooks OAuth flow (returns auth URL)
router.post('/:brandId/connect/quickbooks', accountingController.connectQuickBooks);

// Start Xero OAuth flow (returns auth URL)
router.post('/:brandId/connect/xero', accountingController.connectXero);

// OAuth callback handlers
router.get('/callback/quickbooks', accountingController.callbackQuickBooks);
router.get('/callback/xero', accountingController.callbackXero);

// Disconnect accounting integration
router.delete('/:brandId/disconnect', accountingController.disconnect);

// Manual sync (push invoices + payments to accounting)
router.post('/:brandId/sync', accountingController.syncInvoices);

// Get last sync status and history
router.get('/:brandId/sync-status', accountingController.getSyncStatus);

export default router;
