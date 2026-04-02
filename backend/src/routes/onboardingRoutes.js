import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/onboardingController.js';

const router = express.Router();

router.use(protect);

router.get('/:brandId/checklists', ctrl.listChecklists);
router.post('/:brandId/checklists', ctrl.createChecklist);
router.patch('/:brandId/checklists/:checklistId', ctrl.updateChecklist);
router.delete('/:brandId/checklists/:checklistId', ctrl.deleteChecklist);
router.get('/:brandId/progress/:clientId', ctrl.getClientProgress);
router.post('/:brandId/progress/:clientId/complete-step', ctrl.completeStep);
router.post('/:brandId/start/:clientId', ctrl.startOnboarding);

export default router;
