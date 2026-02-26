import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as campaignController from '../controllers/campaignController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId', campaignController.listCampaigns);
router.post('/:brandId', campaignController.createCampaign);
router.get('/:brandId/:campaignId', campaignController.getCampaign);
router.patch('/:brandId/:campaignId', campaignController.updateCampaign);
router.delete('/:brandId/:campaignId', campaignController.deleteCampaign);
router.post('/:brandId/:campaignId/send', campaignController.sendCampaign);

export default router;
