import express from 'express';
import * as webhookController from '../controllers/webhookController.js';

const router = express.Router();

/**
 * Stripe Webhook Endpoint
 * 
 * IMPORTANT: This route must be registered BEFORE express.json() middleware
 * because Stripe requires the raw body for signature verification.
 * 
 * The raw body is handled by express.raw() middleware in app.js
 */
router.post(
  '/stripe',
  webhookController.handleStripeWebhook
);

export default router;
