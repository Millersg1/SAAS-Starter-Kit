import express from 'express';
import * as timeEntryController from '../controllers/timeEntryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Brand-scoped list + summary
router.get('/:brandId',               timeEntryController.listEntries);
router.get('/:brandId/active-timer',  timeEntryController.getActiveTimer);

// Project entries (used by ProjectDetails tab)
router.get('/project/:projectId',     timeEntryController.getProjectEntries);

// CRUD
router.post('/',                      timeEntryController.createEntry);
router.patch('/:entryId',             timeEntryController.updateEntry);
router.delete('/:entryId',            timeEntryController.deleteEntry);

// Add to invoice
router.post('/:entryId/add-to-invoice', timeEntryController.addToInvoice);

export default router;
