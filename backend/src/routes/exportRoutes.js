import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  exportClients, 
  exportProjects, 
  exportInvoices, 
  exportTasks, 
  exportMessages,
  exportCustom 
} from '../controllers/exportController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Export endpoints
router.get('/clients/:brandId', exportClients);
router.get('/projects/:brandId', exportProjects);
router.get('/invoices/:brandId', exportInvoices);
router.get('/tasks/:brandId', exportTasks);
router.get('/messages/:brandId', exportMessages);

// Custom export with specific fields and filters
router.post('/:brandId/custom', exportCustom);

export default router;
