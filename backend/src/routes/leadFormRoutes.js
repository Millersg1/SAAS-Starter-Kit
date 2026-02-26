import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as leadFormController from '../controllers/leadFormController.js';

const router = express.Router();

// Public: submit form
router.post('/submit/:slug', leadFormController.submitForm);
router.get('/view/:slug', leadFormController.getPublicFormView);

// Protected
router.use(protect);
router.get('/:brandId', leadFormController.listForms);
router.post('/:brandId', leadFormController.createForm);
router.patch('/:brandId/:formId', leadFormController.updateForm);
router.delete('/:brandId/:formId', leadFormController.deleteForm);
router.get('/:brandId/submissions/all', leadFormController.listSubmissions);
router.get('/:brandId/:formId/submissions', leadFormController.listSubmissions);
router.post('/:brandId/submissions/:submissionId/convert', leadFormController.convertToClient);

export default router;
