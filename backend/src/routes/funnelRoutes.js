import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/funnelController.js';

const router = express.Router();

// Public (no auth)
router.get('/view/:funnelSlug',           ctrl.publicViewFunnel);
router.get('/view/:funnelSlug/:stepSlug', ctrl.publicViewStep);
router.post('/submit/:stepId',            ctrl.publicSubmitForm);

router.use(protect);
router.get('/:brandId',                                    ctrl.listFunnels);
router.post('/:brandId',                                   ctrl.createFunnel);
router.get('/:brandId/:funnelId',                          ctrl.getFunnel);
router.patch('/:brandId/:funnelId',                        ctrl.updateFunnel);
router.delete('/:brandId/:funnelId',                       ctrl.deleteFunnel);
router.get('/:brandId/:funnelId/stats',                    ctrl.getFunnelStats);
router.patch('/:brandId/:funnelId/reorder',                ctrl.reorderSteps);
router.get('/:brandId/:funnelId/steps',                    ctrl.listSteps);
router.post('/:brandId/:funnelId/steps',                   ctrl.createStep);
router.get('/:brandId/:funnelId/steps/:stepId',            ctrl.getStep);
router.patch('/:brandId/:funnelId/steps/:stepId',          ctrl.updateStep);
router.delete('/:brandId/:funnelId/steps/:stepId',         ctrl.deleteStep);
router.post('/:brandId/:funnelId/steps/:stepId/duplicate', ctrl.duplicateStep);

export default router;
