import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  listFields, createField, updateField, deleteField, reorderFieldsHandler
} from '../controllers/customFieldController.js';

const router = Router();

router.use(protect);
router.get('/:brandId',              listFields);
router.post('/:brandId',             createField);
router.patch('/:brandId/:fieldId',   updateField);
router.delete('/:brandId/:fieldId',  deleteField);
router.post('/:brandId/reorder',     reorderFieldsHandler);

export default router;
