import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { testConnection } from './config/database.js';
import { errorMonitorMiddleware } from './utils/errorMonitor.js';
import logger from './utils/logger.js';
import { initSentry, sentryErrorHandler } from './utils/sentry.js';
import { getRedis } from './config/redis.js';
import RedisStore from 'rate-limit-redis';
import { setupSwagger } from './config/swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Initialize Sentry (must be before routes)
initSentry(app);

// Trust the reverse proxy (Apache) — required for rate limiting and IP detection
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting (disabled in development)
// Uses Redis store in production for PM2 cluster compatibility; falls back to in-memory
if (process.env.NODE_ENV !== 'development') {
  const redisClient = getRedis();
  const storeOpts = redisClient
    ? { store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }) }
    : {};

  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { status: 'fail', message: 'Too many requests, please try again later.' },
    keyGenerator: (req) => {
      if (req.user?.id) return `user:${req.user.id}`;
      if (req.headers['x-api-key']) return `key:${req.headers['x-api-key'].slice(0, 12)}`;
      return req.ip;
    },
    ...storeOpts,
  });
  app.use('/api/', limiter);

  const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { status: 'fail', message: 'Too many requests, please try again later.' },
    ...storeOpts,
  });
  app.use('/api/public', publicLimiter);

  // Auth endpoints: stricter to prevent brute force
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { status: 'fail', message: 'Too many login attempts, please try again later.' },
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
}

// Webhook routes (MUST be before body parser middleware)
// Stripe requires raw body for signature verification
import webhookRoutes from './routes/webhookRoutes.js';
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging via pino
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// Health check endpoint — deep checks for DB, Stripe, email, memory
app.get('/health', async (req, res) => {
  const checks = {};

  // Database
  try {
    const dbOk = await testConnection();
    checks.database = dbOk ? 'connected' : 'disconnected';
  } catch {
    checks.database = 'error';
  }

  // Stripe API reachability
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    checks.stripe = stripeKey && stripeKey.length > 10 ? 'configured' : 'not_configured';
  } catch {
    checks.stripe = 'error';
  }

  // Email (SMTP configured?)
  checks.email = process.env.SMTP_HOST ? 'configured' : 'not_configured';

  // Memory usage
  const mem = process.memoryUsage();
  checks.memory = {
    rss_mb: Math.round(mem.rss / 1048576),
    heap_used_mb: Math.round(mem.heapUsed / 1048576),
    heap_total_mb: Math.round(mem.heapTotal / 1048576),
  };

  const healthy = checks.database === 'connected';

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV,
    checks,
  });
});

// Serve uploaded images as static files (cross-origin allowed for frontend on different subdomain)
app.use('/images', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads/images')));

// Custom portal domain middleware (runs before all routes)
import { customDomainMiddleware } from './middleware/customDomainMiddleware.js';
app.use(customDomainMiddleware);

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import portalRoutes from './routes/portalRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import connectRoutes from './routes/connectRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import proposalRoutes from './routes/proposalRoutes.js';
import timeEntryRoutes from './routes/timeEntryRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import pipelineRoutes from './routes/pipelineRoutes.js';
import clientActivityRoutes from './routes/clientActivityRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import webhookEndpointRoutes from './routes/webhookEndpointRoutes.js';
import contractRoutes from './routes/contractRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import callLogRoutes from './routes/callLogRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import leadFormRoutes from './routes/leadFormRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import emailConnectionRoutes from './routes/emailConnectionRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import voipRoutes from './routes/voipRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import googleCalendarRoutes from './routes/googleCalendarRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import enrichmentRoutes from './routes/enrichmentRoutes.js';
import customFieldRoutes from './routes/customFieldRoutes.js';
import segmentRoutes from './routes/segmentRoutes.js';
import cmsRoutes from './routes/cmsRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import servicePackageRoutes from './routes/servicePackageRoutes.js';
import clientReportRoutes from './routes/clientReportRoutes.js';
import reputationRoutes from './routes/reputationRoutes.js';
import funnelRoutes from './routes/funnelRoutes.js';
import dripSequenceRoutes from './routes/dripSequenceRoutes.js';
import chatWidgetRoutes from './routes/chatWidgetRoutes.js';
import surveyRoutes from './routes/surveyRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import outlookCalendarRoutes from './routes/outlookCalendarRoutes.js';
import churnRoutes from './routes/churnRoutes.js';
import apiKeyRoutes from './routes/apiKeyRoutes.js';
import whiteLabelRoutes from './routes/whiteLabelRoutes.js';
import zapierRoutes from './routes/zapierRoutes.js';
import gdprRoutes from './routes/gdprRoutes.js';
import activityFeedRoutes from './routes/activityFeedRoutes.js';
import bulkRoutes from './routes/bulkRoutes.js';
import emailDeliverabilityRoutes from './routes/emailDeliverabilityRoutes.js';
import voiceAgentRoutes from './routes/voiceAgentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import retainerRoutes from './routes/retainerRoutes.js';
import projectTemplateRoutes from './routes/projectTemplateRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import knowledgeBaseRoutes from './routes/knowledgeBaseRoutes.js';
import slackRoutes from './routes/slackRoutes.js';
import accountingRoutes from './routes/accountingRoutes.js';
import siteRenderRoutes from './routes/siteRenderRoutes.js';
import surfRoutes from './routes/surfRoutes.js';
import surfAutopilotRoutes from './routes/surfAutopilotRoutes.js';
import proposalGeneratorRoutes from './routes/proposalGeneratorRoutes.js';
import resellerRoutes from './routes/resellerRoutes.js';
import unifiedInboxRoutes from './routes/unifiedInboxRoutes.js';
import testimonialRoutes from './routes/testimonialRoutes.js';
import { apiKeyAuth } from './middleware/apiKeyAuth.js';
import { enforcePlan } from './middleware/planEnforcement.js';

// API key auth middleware (before routes, after body parser)
app.use(apiKeyAuth);

// Plan enforcement middleware (after auth, before routes)
app.use(enforcePlan);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/connect', connectRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/time', timeEntryRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/activities', clientActivityRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks/endpoints', webhookEndpointRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/call-logs', callLogRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/lead-forms', leadFormRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/email-connections', emailConnectionRoutes);
app.use('/api/track', trackingRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/voip', voipRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/enrichment', enrichmentRoutes);
app.use('/api/custom-fields', customFieldRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/packages', servicePackageRoutes);
app.use('/api/client-reports', clientReportRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/funnels', funnelRoutes);
app.use('/api/drip', dripSequenceRoutes);
app.use('/api/chat-widget', chatWidgetRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/outlook-calendar', outlookCalendarRoutes);
app.use('/api/churn', churnRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/white-label', whiteLabelRoutes);
app.use('/api/zapier', zapierRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/activity-feed', activityFeedRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/email-health', emailDeliverabilityRoutes);
app.use('/api/voice-agents', voiceAgentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/retainers', retainerRoutes);
app.use('/api/project-templates', projectTemplateRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/kb', knowledgeBaseRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/surf', surfRoutes);
app.use('/api/surf-autopilot', surfAutopilotRoutes);
app.use('/api/proposal-generator', proposalGeneratorRoutes);
app.use('/api/reseller', resellerRoutes);
app.use('/api/unified-inbox', unifiedInboxRoutes);
app.use('/api/testimonials', testimonialRoutes);

// CMS website rendering (public — serves full HTML pages)
app.use(siteRenderRoutes);

// Swagger API documentation
setupSwagger(app);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'SAAS Surface API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// 404 handler
app.use(notFound);

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler());

// Structured error logging (before generic error handler)
app.use(errorMonitorMiddleware);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
