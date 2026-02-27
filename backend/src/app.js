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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

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
if (process.env.NODE_ENV !== 'development') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { status: 'fail', message: 'Too many requests from this IP, please try again later.' },
    skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
  });
  app.use('/api/', limiter);
}

// Webhook routes (MUST be before body parser middleware)
// Stripe requires raw body for signature verification
import webhookRoutes from './routes/webhookRoutes.js';
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.status(dbStatus ? 200 : 503).json({
    status: dbStatus ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: dbStatus ? 'connected' : 'disconnected'
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

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'ClientHub API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// 404 handler
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
