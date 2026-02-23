import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { draftInvoice, draftProposal } from '../controllers/aiController.js';

const router = express.Router();
router.use(protect);

router.post('/:brandId/draft-invoice',  draftInvoice);
router.post('/:brandId/draft-proposal', draftProposal);

export default router;
