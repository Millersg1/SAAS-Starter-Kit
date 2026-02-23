import express from 'express';
import * as proposalController from '../controllers/proposalController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// ── Brand proposal list + create ─────────────────────────────────────────────
router.get('/:brandId',    proposalController.getBrandProposals);
router.post('/',           proposalController.createProposal);

// ── Single proposal ───────────────────────────────────────────────────────────
router.get('/item/:proposalId',    proposalController.getProposal);
router.patch('/:proposalId',       proposalController.updateProposal);
router.delete('/:proposalId',      proposalController.deleteProposal);

// ── Status transitions ────────────────────────────────────────────────────────
router.post('/:proposalId/send',    proposalController.sendProposal);
router.post('/:proposalId/convert', proposalController.convertProposalToInvoice);

// ── Line items ────────────────────────────────────────────────────────────────
router.post('/:proposalId/items',              proposalController.addProposalItem);
router.patch('/:proposalId/items/:itemId',     proposalController.updateProposalItem);
router.delete('/:proposalId/items/:itemId',    proposalController.deleteProposalItem);

export default router;
