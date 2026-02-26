import app from './src/app.js';
import { testConnection, closePool, query } from './src/config/database.js';
import { startRecurringInvoiceCron } from './src/utils/recurringInvoices.js';
import { startOverdueReminderCron } from './src/utils/overdueReminders.js';
import { startEmailSequencesCron } from './src/utils/emailSequencesCron.js';
import { startTaskRemindersCron } from './src/utils/taskRemindersCron.js';
import { startWeeklyReportCron } from './src/utils/weeklyReportCron.js';
import { startEmailSyncCron } from './src/utils/emailSyncCron.js';
import { startWorkflowCron } from './src/utils/workflowCron.js';
import { startGoogleCalendarCron } from './src/utils/googleCalendarCron.js';
import { setupWebSocket } from './src/utils/websocket.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // Test database connection
    console.log('🔍 Testing database connection... - server.js:22');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting... - server.js:26');
      process.exit(1);
    }

    // Run pending schema migrations (idempotent — uses IF NOT EXISTS)
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS webhook_endpoints (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          secret VARCHAR(64) NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
          events TEXT[] NOT NULL DEFAULT '{}',
          description VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_brand ON webhook_endpoints(brand_id);
        CREATE TABLE IF NOT EXISTS webhook_deliveries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
          event_type VARCHAR(100) NOT NULL,
          payload JSONB NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          response_status INTEGER,
          response_body TEXT,
          attempts INTEGER DEFAULT 0,
          delivered_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id);
        CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1001;
        CREATE TABLE IF NOT EXISTS contracts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
          contract_number VARCHAR(50) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL DEFAULT '',
          status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','sent','signed','declined','expired')),
          issue_date DATE,
          expiry_date DATE,
          client_signature TEXT,
          signed_by_name VARCHAR(255),
          signed_by_email VARCHAR(255),
          signed_at TIMESTAMPTZ,
          notes TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_contracts_brand  ON contracts(brand_id);
        CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
        CREATE TABLE IF NOT EXISTS contacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          first_name VARCHAR(255),
          last_name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          job_title VARCHAR(255),
          is_primary_contact BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_contacts_brand ON contacts(brand_id);
        CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_brand_email ON contacts(brand_id, email) WHERE email IS NOT NULL;
        CREATE TABLE IF NOT EXISTS call_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          direction VARCHAR(10) DEFAULT 'outbound',
          phone_number VARCHAR(50), duration_seconds INTEGER DEFAULT 0,
          outcome VARCHAR(30), notes TEXT,
          called_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_call_logs_brand ON call_logs(brand_id);
        CREATE INDEX IF NOT EXISTS idx_call_logs_client ON call_logs(client_id);
        CREATE TABLE IF NOT EXISTS calendar_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL, description TEXT, location VARCHAR(255),
          start_time TIMESTAMP NOT NULL, end_time TIMESTAMP NOT NULL,
          all_day BOOLEAN DEFAULT FALSE, event_type VARCHAR(30) DEFAULT 'meeting',
          reminder_minutes INTEGER DEFAULT 30, is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_calendar_events_brand ON calendar_events(brand_id);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);
        CREATE TABLE IF NOT EXISTS booking_pages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          slug VARCHAR(100) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL, description TEXT,
          duration_minutes INTEGER DEFAULT 30,
          available_days INTEGER[] DEFAULT '{1,2,3,4,5}',
          day_start_time TIME DEFAULT '09:00', day_end_time TIME DEFAULT '17:00',
          timezone VARCHAR(60) DEFAULT 'America/New_York',
          buffer_minutes INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS bookings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          booking_page_id UUID NOT NULL REFERENCES booking_pages(id) ON DELETE CASCADE,
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          client_name VARCHAR(255) NOT NULL, client_email VARCHAR(255) NOT NULL,
          client_message TEXT, start_time TIMESTAMP NOT NULL, end_time TIMESTAMP NOT NULL,
          status VARCHAR(20) DEFAULT 'confirmed',
          cancel_token UUID DEFAULT gen_random_uuid(),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_bookings_brand ON bookings(brand_id);
        CREATE INDEX IF NOT EXISTS idx_bookings_page ON bookings(booking_page_id);
        CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1001;
        CREATE TABLE IF NOT EXISTS support_tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          subject VARCHAR(255) NOT NULL, priority VARCHAR(10) DEFAULT 'normal',
          status VARCHAR(20) DEFAULT 'open',
          assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
          ticket_number VARCHAR(20) UNIQUE, resolved_at TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS ticket_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
          sender_type VARCHAR(10) NOT NULL, sender_id UUID,
          body TEXT NOT NULL, is_internal BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_tickets_brand ON support_tickets(brand_id);
        CREATE INDEX IF NOT EXISTS idx_ticket_msgs_ticket ON ticket_messages(ticket_id);
        CREATE TABLE IF NOT EXISTS lead_forms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL, slug VARCHAR(100) UNIQUE NOT NULL,
          fields JSONB NOT NULL DEFAULT '[]',
          thank_you_message TEXT DEFAULT 'Thank you! We will be in touch shortly.',
          is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS lead_submissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          form_id UUID NOT NULL REFERENCES lead_forms(id) ON DELETE CASCADE,
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          data JSONB NOT NULL DEFAULT '{}', name VARCHAR(255), email VARCHAR(255), phone VARCHAR(50),
          status VARCHAR(20) DEFAULT 'new',
          converted_to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_lead_forms_brand ON lead_forms(brand_id);
        CREATE INDEX IF NOT EXISTS idx_lead_submissions_brand ON lead_submissions(brand_id);
        CREATE TABLE IF NOT EXISTS email_campaigns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL, subject VARCHAR(500) NOT NULL, preview_text VARCHAR(255),
          html_content TEXT, text_content TEXT, from_name VARCHAR(255), from_email VARCHAR(255),
          status VARCHAR(20) DEFAULT 'draft',
          scheduled_at TIMESTAMP, sent_at TIMESTAMP,
          total_recipients INTEGER DEFAULT 0, sent_count INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE, created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS campaign_recipients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          email VARCHAR(255) NOT NULL, name VARCHAR(255),
          status VARCHAR(20) DEFAULT 'pending',
          sent_at TIMESTAMP, error_message TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON email_campaigns(brand_id);
        CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
        CREATE TABLE IF NOT EXISTS email_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          provider VARCHAR(20) NOT NULL,
          email_address VARCHAR(255) NOT NULL,
          imap_host VARCHAR(255) NOT NULL, imap_port INTEGER DEFAULT 993,
          imap_user VARCHAR(255) NOT NULL, imap_password TEXT NOT NULL,
          last_synced_at TIMESTAMP, is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_email_connections_brand ON email_connections(brand_id);

        -- SMS / Twilio
        CREATE TABLE IF NOT EXISTS twilio_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          account_sid VARCHAR(255) NOT NULL,
          auth_token TEXT NOT NULL,
          phone_number VARCHAR(50) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sms_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          direction VARCHAR(10) NOT NULL DEFAULT 'outbound',
          from_number VARCHAR(50), to_number VARCHAR(50),
          body TEXT NOT NULL, twilio_sid VARCHAR(255),
          status VARCHAR(30) DEFAULT 'sent',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_sms_messages_brand ON sms_messages(brand_id);
        CREATE INDEX IF NOT EXISTS idx_sms_messages_client ON sms_messages(client_id);

        -- Email Tracking (campaign open/click)
        ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP;
        ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP;
        ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;
        ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
        ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;
        ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

        -- Marketing Automation Workflows
        CREATE TABLE IF NOT EXISTS automation_workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL, trigger_type VARCHAR(50) NOT NULL,
          trigger_config JSONB DEFAULT '{}', is_active BOOLEAN DEFAULT TRUE,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS automation_steps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
          step_type VARCHAR(50) NOT NULL, step_config JSONB DEFAULT '{}',
          delay_minutes INTEGER DEFAULT 0, position INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS automation_enrollments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
          brand_id UUID NOT NULL, entity_id UUID NOT NULL,
          entity_type VARCHAR(30) DEFAULT 'client', current_step INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active', next_step_at TIMESTAMP,
          enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_automation_enrollments_next ON automation_enrollments(next_step_at) WHERE status='active';
        CREATE INDEX IF NOT EXISTS idx_automation_workflows_brand ON automation_workflows(brand_id);

        -- Google Calendar Sync
        CREATE TABLE IF NOT EXISTS google_calendar_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          access_token TEXT NOT NULL, refresh_token TEXT NOT NULL,
          token_expiry TIMESTAMP, calendar_id VARCHAR(255) DEFAULT 'primary',
          sync_token VARCHAR(500), is_active BOOLEAN DEFAULT TRUE,
          last_synced_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255);

        -- VoIP (extend call_logs)
        ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS twilio_call_sid VARCHAR(255);
        ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_url TEXT;
        ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS transcript TEXT;
        ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS transcription_status VARCHAR(20) DEFAULT 'none';
      `);
      console.log('✅ Schema migrations applied - server.js:280');
    } catch (migErr) {
      console.error('⚠️ Schema migration warning: - server.js:282', migErr.message);
    }

    // Start recurring invoice cron job
    startRecurringInvoiceCron();

    // Start overdue invoice reminder cron job
    startOverdueReminderCron();

    // Start email sequences cron (proposal follow-ups)
    startEmailSequencesCron();

    // Start task reminders cron
    startTaskRemindersCron();

    // Start weekly report cron (Mondays 08:00)
    startWeeklyReportCron();

    // Start email IMAP sync cron (every 15 minutes)
    startEmailSyncCron();

    // Start marketing automation workflow cron (every 1 minute)
    startWorkflowCron();

    // Start Google Calendar sync cron (every 30 minutes)
    startGoogleCalendarCron();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log('🚀 ClientHub API Server Started - server.js:311');
      console.log(`📡 Server running on port ${PORT} - server.js:312`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'} - server.js:313`);
      console.log(`🔗 API URL: http://localhost:${PORT} - server.js:314`);
      console.log(`💚 Health check: http://localhost:${PORT}/health - server.js:315`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT} - server.js:316`);
      console.log('');
      console.log('Press CTRL+C to stop the server - server.js:318');
    });

    // Initialize WebSocket server
    setupWebSocket(server);

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown... - server.js:326`);
      
      server.close(async () => {
        console.log('✅ HTTP server closed - server.js:329');
        
        await closePool();
        console.log('✅ Database connections closed - server.js:332');
        
        console.log('👋 Server shutdown complete - server.js:334');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout - server.js:340');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('💥 UNCAUGHT EXCEPTION! Shutting down... - server.js:351');
      console.error(err.name, err.message);
      console.error(err.stack);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('💥 UNHANDLED REJECTION! Shutting down... - server.js:359');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server: - server.js:367', error);
    process.exit(1);
  }
};

// Start the server
startServer();
