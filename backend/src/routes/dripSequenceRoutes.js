import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/dripSequenceController.js';

const router = express.Router();

// Public
router.get('/unsubscribe', ctrl.unsubscribe);

router.use(protect);

router.get('/:brandId',                                       ctrl.listSequences);
router.post('/:brandId',                                      ctrl.createSequence);
router.get('/:brandId/:seqId',                                ctrl.getSequence);
router.patch('/:brandId/:seqId',                              ctrl.updateSequence);
router.delete('/:brandId/:seqId',                             ctrl.deleteSequence);
router.get('/:brandId/:seqId/stats',                          ctrl.getStats);
router.patch('/:brandId/:seqId/steps/reorder',                ctrl.reorderSteps);
router.post('/:brandId/:seqId/steps',                         ctrl.createStep);
router.patch('/:brandId/:seqId/steps/:stepId',                ctrl.updateStep);
router.delete('/:brandId/:seqId/steps/:stepId',               ctrl.deleteStep);
router.get('/:brandId/:seqId/enrollments',                    ctrl.getEnrollments);
router.post('/:brandId/:seqId/enrollments',                   ctrl.enrollContacts);
router.delete('/:brandId/:seqId/enrollments/:enrollmentId',   ctrl.unenroll);

export default router;
