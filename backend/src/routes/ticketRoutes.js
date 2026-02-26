import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ticketController from '../controllers/ticketController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId', ticketController.listTickets);
router.post('/:brandId', ticketController.createTicket);
router.get('/:brandId/:ticketId', ticketController.getTicket);
router.patch('/:brandId/:ticketId', ticketController.updateTicket);
router.post('/:brandId/:ticketId/reply', ticketController.replyToTicket);
router.delete('/:brandId/:ticketId', ticketController.deleteTicket);

export default router;
