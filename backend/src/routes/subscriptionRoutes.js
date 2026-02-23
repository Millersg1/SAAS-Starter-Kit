import express from 'express';
import * as subscriptionController from '../controllers/subscriptionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// SUBSCRIPTION PLANS
// ============================================

// Get all available plans
router.get('/plans', subscriptionController.getPlans);

// Get single plan
router.get('/plans/:planId', subscriptionController.getPlan);

// ============================================
// SUBSCRIPTIONS
// ============================================

// Create subscription for brand
router.post('/:brandId', subscriptionController.createSubscription);

// Get current subscription
router.get('/:brandId', subscriptionController.getSubscription);

// Update subscription (upgrade/downgrade)
router.patch('/:brandId', subscriptionController.updateSubscription);

// Cancel subscription
router.delete('/:brandId', subscriptionController.cancelSubscription);

// Resume canceled subscription
router.post('/:brandId/resume', subscriptionController.resumeSubscription);

// ============================================
// PAYMENT METHODS
// ============================================

// Add payment method
router.post('/:brandId/payment-methods', subscriptionController.addPaymentMethod);

// Get payment methods
router.get('/:brandId/payment-methods', subscriptionController.getPaymentMethods);

// Set default payment method
router.patch('/:brandId/payment-methods/:methodId/default', subscriptionController.setDefaultPaymentMethod);

// Delete payment method
router.delete('/:brandId/payment-methods/:methodId', subscriptionController.deletePaymentMethod);

// ============================================
// BILLING
// ============================================

// Get billing history
router.get('/:brandId/billing-history', subscriptionController.getBillingHistory);

// Get upcoming invoice
router.get('/:brandId/upcoming-invoice', subscriptionController.getUpcomingInvoice);

export default router;
