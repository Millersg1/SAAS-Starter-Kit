import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/projectTemplateController.js';

const router = express.Router();

router.use(protect);

router.get('/:brandId', ctrl.listTemplates);
router.post('/:brandId', ctrl.createTemplate);
router.get('/:brandId/:templateId', ctrl.getTemplate);
router.patch('/:brandId/:templateId', ctrl.updateTemplate);
router.delete('/:brandId/:templateId', ctrl.deleteTemplate);
router.post('/:brandId/:templateId/create-project', ctrl.createProjectFromTemplate);

export default router;
