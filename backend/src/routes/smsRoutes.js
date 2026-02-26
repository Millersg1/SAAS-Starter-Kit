import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as smsController from '../controllers/smsController.js';

const router = express.Router();

// Public: Twilio incoming SMS webhook
router.post('/incoming', express.urlencoded({ extended: false }), smsController.incomingSms);

// Protected
router.use(protect);
router.get('/:brandId/connection', smsController.getConnection);
router.post('/:brandId/connection', smsController.saveConnection);
router.delete('/:brandId/connection', smsController.removeConnection);
router.get('/:brandId/conversations', smsController.getConversations);
router.get('/:brandId/messages', smsController.listMessages);
router.post('/:brandId/send', smsController.sendMessage);

export default router;
