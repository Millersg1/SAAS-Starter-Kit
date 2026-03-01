import express from 'express';
import * as brandController from '../controllers/brandController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../utils/validators.js';
import { 
  createBrandSchema, 
  updateBrandSchema, 
  addBrandMemberSchema, 
  updateBrandMemberSchema 
} from '../utils/validators.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Brand routes
router.post('/', validate(createBrandSchema), brandController.createBrand);
router.get('/', brandController.getUserBrands);
router.get('/:brandId', brandController.getBrand);
router.patch('/:brandId', validate(updateBrandSchema), brandController.updateBrand);
router.delete('/:brandId', brandController.deleteBrand);

// Brand member routes
router.get('/:brandId/members', brandController.getBrandMembers);
router.post('/:brandId/members', validate(addBrandMemberSchema), brandController.addBrandMember);
router.patch('/:brandId/members/:memberId', validate(updateBrandMemberSchema), brandController.updateBrandMemberRole);
router.delete('/:brandId/members/:memberId', brandController.removeBrandMember);

// Brand Voice Profile
router.get('/:brandId/voice',  brandController.getBrandVoice);
router.patch('/:brandId/voice', brandController.updateBrandVoice);

export default router;
