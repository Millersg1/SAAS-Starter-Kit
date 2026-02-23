import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as connectController from '../controllers/connectController.js';

const router = express.Router();

// All Connect routes require authentication
router.use(protect);

// GET  /api/connect/:brandId/status  — returns cached + live-refreshed Connect status
router.get('/:brandId/status', connectController.getConnectStatus);

// POST /api/connect/:brandId/onboard — creates Express account (if needed) + returns onboarding URL
router.post('/:brandId/onboard', connectController.createOnboardingLink);

// GET  /api/connect/:brandId/return  — syncs status after returning from Stripe onboarding
router.get('/:brandId/return', connectController.handleOnboardingReturn);

export default router;
