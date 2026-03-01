import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ocController from '../controllers/outlookCalendarController.js';

const router = express.Router();

// OAuth callback (no auth — browser redirect)
router.get('/callback', ocController.oauthCallback);

router.get('/:brandId/connection', protect, ocController.getConnection);
router.post('/:brandId/auth',      protect, ocController.initiateAuth);
router.delete('/:brandId/connection', protect, ocController.disconnect);
router.post('/:brandId/sync',      protect, ocController.syncNow);

export default router;
