import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SAAS Surface API',
      version: '1.0.0',
      description: 'Agency OS API — CRM, invoicing, proposals, contracts, marketing automation, client portal, and more.',
      contact: { name: 'SAAS Surface Support', url: 'https://saassurface.com/contact' },
    },
    servers: [
      { url: '/api', description: 'API base' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'fail' },
            message: { type: 'string' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
        Client: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            brand_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            company: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive', 'lead', 'churned'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            brand_id: { type: 'string', format: 'uuid' },
            client_id: { type: 'string', format: 'uuid' },
            invoice_number: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'] },
            total_amount: { type: 'number' },
            amount_due: { type: 'number' },
            currency: { type: 'string', default: 'USD' },
            due_date: { type: 'string', format: 'date' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            brand_id: { type: 'string', format: 'uuid' },
            client_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            status: { type: 'string', enum: ['planning', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold'] },
            budget: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Deal: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            brand_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            value: { type: 'number' },
            stage: { type: 'string' },
            status: { type: 'string' },
            client_id: { type: 'string', format: 'uuid' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            brand_id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
            due_date: { type: 'string', format: 'date' },
            assigned_to: { type: 'string', format: 'uuid' },
          },
        },
        Expense: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            brand_id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            client_id: { type: 'string', format: 'uuid' },
            description: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string', default: 'USD' },
            category: { type: 'string' },
            date: { type: 'string', format: 'date' },
            receipt_url: { type: 'string' },
            billable: { type: 'boolean', default: false },
          },
        },
        Retainer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            brand_id: { type: 'string', format: 'uuid' },
            client_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            hours_allocated: { type: 'number' },
            hours_used: { type: 'number' },
            amount: { type: 'number' },
            billing_cycle: { type: 'string', enum: ['monthly', 'quarterly'] },
            status: { type: 'string', enum: ['active', 'paused', 'cancelled'] },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & account management' },
      { name: 'Users', description: 'User profile management' },
      { name: 'Brands', description: 'Brand/workspace management' },
      { name: 'Clients', description: 'Client CRM' },
      { name: 'Projects', description: 'Project management' },
      { name: 'Invoices', description: 'Invoicing & payments' },
      { name: 'Proposals', description: 'Proposal management' },
      { name: 'Contracts', description: 'Contract management & e-signatures' },
      { name: 'Pipeline', description: 'Sales pipeline & deals' },
      { name: 'Tasks', description: 'Task management' },
      { name: 'Time Tracking', description: 'Time entries & timers' },
      { name: 'Expenses', description: 'Expense tracking & profitability' },
      { name: 'Retainers', description: 'Monthly retainer tracking' },
      { name: 'Email', description: 'Email threads & connections' },
      { name: 'SMS', description: 'SMS messaging & broadcasts' },
      { name: 'Messages', description: 'Internal messaging threads' },
      { name: 'Campaigns', description: 'Email marketing campaigns' },
      { name: 'Drip Sequences', description: 'Email drip automation' },
      { name: 'Funnels', description: 'Landing page funnels' },
      { name: 'Lead Forms', description: 'Lead capture forms' },
      { name: 'Bookings', description: 'Scheduling & booking pages' },
      { name: 'Calendar', description: 'Calendar events' },
      { name: 'Tickets', description: 'Support tickets' },
      { name: 'Surveys', description: 'NPS/CSAT surveys' },
      { name: 'Workflows', description: 'Marketing automation workflows' },
      { name: 'Analytics', description: 'Revenue, pipeline & performance analytics' },
      { name: 'AI', description: 'AI-powered content & insights' },
      { name: 'Voice Agents', description: 'AI voice agent management' },
      { name: 'CMS', description: 'Content management system' },
      { name: 'Social Media', description: 'Social media management' },
      { name: 'Reputation', description: 'Review management' },
      { name: 'Subscriptions', description: 'Plan & billing management' },
      { name: 'Export', description: 'Data export (CSV)' },
      { name: 'Bulk', description: 'Bulk operations' },
      { name: 'Webhooks', description: 'Webhook endpoint management' },
      { name: 'Zapier', description: 'Zapier integration' },
      { name: 'Portal', description: 'Client portal' },
      { name: 'Knowledge Base', description: 'Help center & articles' },
      { name: 'Super Admin', description: 'Platform administration' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SAAS Surface API Docs',
  }));
  app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));
}
