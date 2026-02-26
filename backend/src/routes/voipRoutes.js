import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { initiateCall, recordingCallback } from '../controllers/voipController.js';

const router = express.Router();

// Public: Twilio recording callback
router.post('/recording-callback', express.urlencoded({ extended: false }), recordingCallback);

// Protected
router.post('/:brandId/call', protect, initiateCall);

export default router;
