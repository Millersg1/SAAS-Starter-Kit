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

// Voice Agents — clients can see available agents and request a callback
router.get('/voice-agents', portalController.getPortalVoiceAgents);
router.post('/voice-agents/:agentId/request-call', portalController.requestVoiceAgentCall);
router.get('/voice-agent-calls', portalController.getPortalVoiceAgentCalls);

// Surf Chat — client-facing AI assistant in portal
router.post('/surf/ask', async (req, res) => {
  try {
    const { question } = req.body;
    const clientId = req.portalClient?.id;
    const brandId = req.portalBrandId;
    if (!question) return res.status(400).json({ status: 'fail', message: 'Question is required' });

    // Get client context
    const { query: dbQuery } = await import('../config/database.js');
    const [projects, invoices, tickets] = await Promise.all([
      dbQuery(`SELECT name, status FROM projects WHERE client_id = $1 AND brand_id = $2 ORDER BY updated_at DESC LIMIT 5`, [clientId, brandId]),
      dbQuery(`SELECT invoice_number, status, amount_due, due_date FROM invoices WHERE client_id = $1 AND brand_id = $2 ORDER BY created_at DESC LIMIT 5`, [clientId, brandId]),
      dbQuery(`SELECT subject, status FROM tickets WHERE client_id = $1 AND brand_id = $2 ORDER BY created_at DESC LIMIT 5`, [clientId, brandId]),
    ]);

    const context = `Client's projects: ${projects.rows.map(p => `${p.name} (${p.status})`).join(', ') || 'none'}. Invoices: ${invoices.rows.map(i => `${i.invoice_number}: ${i.status}, $${i.amount_due} due ${i.due_date}`).join('; ') || 'none'}. Tickets: ${tickets.rows.map(t => `${t.subject} (${t.status})`).join(', ') || 'none'}.`;

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: openaiKey });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          { role: 'system', content: `You are Surf, a helpful AI assistant in a client portal. You help clients understand their projects, invoices, and account status. Be concise, friendly, and helpful. Here is this client's data: ${context}` },
          { role: 'user', content: question },
        ],
      });
      return res.json({ status: 'success', data: { answer: completion.choices[0]?.message?.content || 'I couldn\'t process that right now.' } });
    }

    res.json({ status: 'success', data: { answer: `Here's your account overview: ${context}` } });
  } catch (err) {
    res.json({ status: 'success', data: { answer: 'I\'m having trouble right now. Please try again or contact support.' } });
  }
});

export default router;
