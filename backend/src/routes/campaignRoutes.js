import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as campaignController from '../controllers/campaignController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId',                                         campaignController.listCampaigns);
router.post('/:brandId',                                        campaignController.createCampaign);
router.get('/:brandId/:campaignId',                             campaignController.getCampaign);
router.patch('/:brandId/:campaignId',                           campaignController.updateCampaign);
router.delete('/:brandId/:campaignId',                          campaignController.deleteCampaign);
router.post('/:brandId/:campaignId/send',                       campaignController.sendCampaign);
router.post('/:brandId/:campaignId/recipients',                 campaignController.addRecipients);

// A/B Variants
router.get('/:brandId/:campaignId/variants',                    campaignController.getVariants);
router.put('/:brandId/:campaignId/variants/:variantName',       campaignController.upsertVariant);
router.delete('/:brandId/:campaignId/variants/:variantId',      campaignController.deleteVariant);
router.post('/:brandId/:campaignId/variants/:variantId/winner', campaignController.declareWinner);

export default router;
