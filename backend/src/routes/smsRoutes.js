import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as smsController from '../controllers/smsController.js';
import * as smsBroadcastController from '../controllers/smsBroadcastController.js';

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

// SMS Broadcasts
router.get('/:brandId/broadcasts',                    smsBroadcastController.listBroadcasts);
router.post('/:brandId/broadcasts',                   smsBroadcastController.createBroadcast);
router.get('/:brandId/broadcasts/:broadcastId',       smsBroadcastController.getBroadcast);
router.delete('/:brandId/broadcasts/:broadcastId',    smsBroadcastController.deleteBroadcast);
router.post('/:brandId/broadcasts/:broadcastId/send', smsBroadcastController.sendBroadcast);

export default router;
