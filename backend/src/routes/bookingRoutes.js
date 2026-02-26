import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as bookingController from '../controllers/bookingController.js';

const router = express.Router();

// Public routes (no auth)
router.get('/public/:slug', bookingController.getPublicPage);
router.get('/public/:slug/slots', bookingController.getAvailableSlots);
router.post('/public/:slug/book', bookingController.createBooking);
router.post('/public/cancel/:token', bookingController.cancelBooking);

// Protected routes
router.use(protect);
router.get('/:brandId', bookingController.listPages);
router.post('/:brandId', bookingController.createPage);
router.patch('/:brandId/:pageId', bookingController.updatePage);
router.delete('/:brandId/:pageId', bookingController.deletePage);
router.get('/:brandId/bookings/list', bookingController.listBookings);

export default router;
