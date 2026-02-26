import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as calendarController from '../controllers/calendarController.js';

const router = express.Router();
router.use(protect);
router.get('/:brandId', calendarController.listEvents);
router.post('/:brandId', calendarController.createEvent);
router.patch('/:brandId/:eventId', calendarController.updateEvent);
router.delete('/:brandId/:eventId', calendarController.deleteEvent);
export default router;
