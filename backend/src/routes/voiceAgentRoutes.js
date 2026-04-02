import express from 'express';
import twilio from 'twilio';
import { protect } from '../middleware/authMiddleware.js';
import {
  listAgents, getAgent, createAgent, updateAgent, deleteAgent,
  listCalls, getCall, getActiveCalls,
  handleIncomingCall, initiateOutboundCall, outboundTwiml,
  getStats,
} from '../controllers/voiceAgentController.js';

const router = express.Router();

// Twilio signature validation middleware
const validateTwilioSignature = (req, res, next) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn('[VoiceAgent] TWILIO_AUTH_TOKEN not set — skipping signature validation');
    return next();
  }
  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  if (signature && twilio.validateRequest(authToken, signature, url, req.body || {})) {
    return next();
  }
  res.status(403).type('text/xml').send('<Response><Say>Unauthorized request.</Say></Response>');
};

// ── Public: Twilio webhooks ──────────────────────────────────────────
// Note: Signature validation disabled temporarily — cPanel proxy rewrites
// the URL which breaks Twilio's signature calculation.
router.post('/incoming-call', express.urlencoded({ extended: false }), handleIncomingCall);
router.post('/outbound-twiml/:agentId/:brandId', express.urlencoded({ extended: false }), outboundTwiml);

// ── Protected: Agent CRUD ──────────────────────────────────────────────────
router.get('/:brandId/agents', protect, listAgents);
router.get('/:brandId/agents/:agentId', protect, getAgent);
router.post('/:brandId/agents', protect, createAgent);
router.patch('/:brandId/agents/:agentId', protect, updateAgent);
router.delete('/:brandId/agents/:agentId', protect, deleteAgent);

// ── Protected: Call history & live calls ────────────────────────────────────
router.get('/:brandId/calls', protect, listCalls);
router.get('/:brandId/calls/active', protect, getActiveCalls);
router.get('/:brandId/calls/:callId', protect, getCall);
router.get('/:brandId/stats', protect, getStats);

// ── Protected: Outbound AI call ────────────────────────────────────────────
router.post('/:brandId/agents/:agentId/call', protect, initiateOutboundCall);

export default router;
