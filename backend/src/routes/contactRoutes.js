import express from 'express';
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact
} from '../controllers/contactController.js';
import { protect } from '../middleware/authMiddleware.js'; // Assuming auth middleware exists

const router = express.Router();

// All routes in this file are protected
router.use(protect);

router.route('/')
  .get(getContacts)
  .post(createContact);

router.route('/:id')
  .get(getContactById)
  .put(updateContact)
  .delete(deleteContact);

export default router;