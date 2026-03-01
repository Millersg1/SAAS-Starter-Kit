import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { draftInvoice, draftProposal, generateCmsContent, generateSocialCaption } from '../controllers/aiController.js';

const router = express.Router();
router.use(protect);

router.post('/:brandId/draft-invoice',    draftInvoice);
router.post('/:brandId/draft-proposal',   draftProposal);
router.post('/:brandId/cms-content',      generateCmsContent);
router.post('/:brandId/social-caption',   generateSocialCaption);

export default router;
