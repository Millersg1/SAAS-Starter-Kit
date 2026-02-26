import express from 'express';
import { trackOpen, trackClick } from '../controllers/trackingController.js';

const router = express.Router();
router.get('/open/:recipientId', trackOpen);
router.get('/click/:recipientId', trackClick);
export default router;
