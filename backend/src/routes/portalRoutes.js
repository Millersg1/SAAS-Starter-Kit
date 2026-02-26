import express from 'express';
import * as portalController from '../controllers/portalController.js';
import { portalListContracts, portalGetContract, portalSignContract } from '../controllers/contractController.js';
import { portalListTickets, portalGetTicket, portalCreateTicket, portalReplyTicket } from '../controllers/ticketController.js';
import { protectPortal } from '../middleware/portalMiddleware.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

// Client portal login
router.post('/login', portalController.portalLogin);

// ============================================
// PROTECTED ROUTES (portal JWT required)
// ============================================

router.use(protectPortal);

// Current client profile
router.get('/me', portalController.getPortalMe);

// Projects
router.get('/projects', portalController.getPortalProjects);

// Documents
router.get('/documents', portalController.getPortalDocuments);

// Invoices
router.get('/invoices', portalController.getPortalInvoices);
router.post('/invoices/:invoiceId/pay', portalController.createPortalPaymentCheckout);
router.post('/invoices/:invoiceId/sign', portalController.signInvoice);

// Messages
router.get('/messages', portalController.getPortalMessages);
router.get('/messages/:threadId', portalController.getPortalThread);
router.post('/messages/:threadId', portalController.portalSendMessage);

// Proposals
router.get('/proposals', portalController.getPortalProposals);
router.get('/proposals/:proposalId', portalController.getPortalProposal);
router.post('/proposals/:proposalId/accept', portalController.acceptProposal);
router.post('/proposals/:proposalId/reject', portalController.rejectProposal);

// Contracts
router.get('/contracts', portalListContracts);
router.get('/contracts/:contractId', portalGetContract);
router.post('/contracts/:contractId/sign', portalSignContract);

// Support Tickets
router.get('/tickets', portalListTickets);
router.get('/tickets/:ticketId', portalGetTicket);
router.post('/tickets', portalCreateTicket);
router.post('/tickets/:ticketId/reply', portalReplyTicket);

export default router;
