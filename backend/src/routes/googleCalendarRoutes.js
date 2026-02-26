import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as gcController from '../controllers/googleCalendarController.js';

const router = express.Router();

// Public: OAuth callback redirect from Google
router.get('/callback', gcController.oauthCallback);

// Protected
router.get('/:brandId/connection', protect, gcController.getConnection);
router.post('/:brandId/auth', protect, gcController.initiateAuth);
router.delete('/:brandId/connection', protect, gcController.disconnect);
router.post('/:brandId/sync', protect, gcController.syncNow);

export default router;
