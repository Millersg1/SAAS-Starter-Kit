import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as clientActivityController from '../controllers/clientActivityController.js';

const router = express.Router();
router.use(protect);

router.get('/client/:clientId',      clientActivityController.getClientActivities);
router.post('/client/:clientId',     clientActivityController.createActivity);
router.delete('/:activityId',        clientActivityController.deleteActivity);

export default router;
