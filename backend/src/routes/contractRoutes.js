import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  listContracts, getContract, createContract,
  updateContract, sendContract, deleteContract
} from '../controllers/contractController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId',               listContracts);
router.post('/:brandId',              createContract);
router.get('/:brandId/:contractId',   getContract);
router.patch('/:brandId/:contractId', updateContract);
router.post('/:brandId/:contractId/send', sendContract);
router.delete('/:brandId/:contractId', deleteContract);

export default router;
