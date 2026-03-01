import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/chatWidgetController.js';

const router = express.Router();

// Public — no auth required (called from external websites)
router.get('/widget.js',                                    ctrl.getWidgetScript);
router.get('/:brandId/config',                              ctrl.getWidgetConfig);
router.post('/:brandId/session',                            ctrl.startSession);
router.post('/:brandId/session/:sessionId/message',         ctrl.sendMessage);
router.patch('/:brandId/session/:sessionId/visitor',        ctrl.updateVisitorInfo);

router.use(protect);

router.get('/:brandId/settings',                            ctrl.getSettings);
router.patch('/:brandId/settings',                          ctrl.saveSettings);
router.get('/:brandId/sessions',                            ctrl.getSessions);
router.get('/:brandId/sessions/:sessionId',                 ctrl.getSession);
router.patch('/:brandId/sessions/:sessionId/close',         ctrl.closeSession);
router.post('/:brandId/sessions/:sessionId/convert',        ctrl.convertSession);
router.delete('/:brandId/sessions/:sessionId',              ctrl.deleteSession);
router.post('/:brandId/sessions/:sessionId/reply',          ctrl.replyAsAgent);

export default router;
