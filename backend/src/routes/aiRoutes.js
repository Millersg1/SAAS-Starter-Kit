import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { draftInvoice, draftProposal, generateCmsContent, generateSocialCaption, getClientInsights, draftEmail, transcribeCallNotes, getPipelineAdvice } from '../controllers/aiController.js';

const router = express.Router();
router.use(protect);

router.post('/:brandId/draft-invoice',                    draftInvoice);
router.post('/:brandId/draft-proposal',                   draftProposal);
router.post('/:brandId/draft-email',                      draftEmail);
router.post('/:brandId/transcribe-notes',                 transcribeCallNotes);
router.post('/:brandId/pipeline-advice',                  getPipelineAdvice);
router.post('/:brandId/cms-content',                      generateCmsContent);
router.post('/:brandId/social-caption',                   generateSocialCaption);
router.get( '/:brandId/client-insights/:clientId',        getClientInsights);

export default router;
