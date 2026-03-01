import express from 'express';
import { trackOpen, trackClick, trackDripOpen, trackDripClick } from '../controllers/trackingController.js';

const router = express.Router();
// Campaign tracking
router.get('/open/:recipientId', trackOpen);
router.get('/click/:recipientId', trackClick);
// Drip sequence tracking (public, no auth)
router.get('/drip/open/:trackingId', trackDripOpen);
router.get('/drip/click/:trackingId', trackDripClick);
export default router;
