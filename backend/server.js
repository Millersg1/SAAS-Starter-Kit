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
import { startOutlookCalendarCron } from './src/utils/outlookCalendarCron.js';
import { startDripCron } from './src/utils/dripCron.js';
import { startChurnPredictionCron } from './src/utils/churnPredictionCron.js';
import { setupWebSocket } from './src/utils/websocket.js';
import dotenv from 'dotenv';

dotenv.config();

// ── Validate required environment variables on startup ──────────────────────
const REQUIRED_ENV = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
  console.error('Set them in .env or your hosting environment before starting the server.');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // Test database connection
    console.log('Testing database connection...');
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

        -- Visual Workflow Builder
        ALTER TABLE automation_workflows ADD COLUMN IF NOT EXISTS workflow_definition JSONB DEFAULT NULL;
        ALTER TABLE automation_enrollments ADD COLUMN IF NOT EXISTS current_node_id VARCHAR(50) DEFAULT NULL;
        ALTER TABLE automation_enrollments ADD COLUMN IF NOT EXISTS node_visit_count INTEGER DEFAULT 0;
        CREATE INDEX IF NOT EXISTS idx_automation_enrollments_node ON automation_enrollments(current_node_id) WHERE status='active';

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

        -- Feature 5+7: Social profiles + contact enrichment
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500);
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS twitter_url VARCHAR(500);
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(500);
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(500);
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_logo_url VARCHAR(500);
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP;
        ALTER TABLE brands ADD COLUMN IF NOT EXISTS hunter_api_key VARCHAR(255);

        -- Client health scores
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_score SMALLINT;
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_score_updated_at TIMESTAMPTZ;
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_score_breakdown JSONB;

        -- Feature 1: Typed Custom Field Definitions
        CREATE TABLE IF NOT EXISTS custom_field_definitions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          entity_type VARCHAR(20) DEFAULT 'client',
          field_key VARCHAR(50) NOT NULL,
          field_label VARCHAR(100) NOT NULL,
          field_type VARCHAR(20) DEFAULT 'text'
            CHECK (field_type IN ('text','number','date','dropdown','checkbox','url','email','phone')),
          options JSONB DEFAULT '[]',
          required BOOLEAN DEFAULT FALSE,
          position INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(brand_id, entity_type, field_key)
        );
        CREATE INDEX IF NOT EXISTS idx_custom_field_defs_brand ON custom_field_definitions(brand_id);

        -- Feature 2: Multiple Pipelines
        CREATE TABLE IF NOT EXISTS pipelines (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          stages JSONB NOT NULL DEFAULT '["Lead","Qualified","Proposal Sent","Negotiation","Won","Lost"]',
          is_default BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_pipelines_brand ON pipelines(brand_id);
        ALTER TABLE pipeline_deals ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_pipeline_deals_pipeline ON pipeline_deals(pipeline_id);
        ALTER TABLE pipeline_deals ADD COLUMN IF NOT EXISTS deal_score SMALLINT;
        ALTER TABLE pipeline_deals ADD COLUMN IF NOT EXISTS deal_score_updated_at TIMESTAMPTZ;

        -- Feature 3: Client Segments
        CREATE TABLE IF NOT EXISTS client_segments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          filter_config JSONB NOT NULL DEFAULT '[]',
          client_count INTEGER DEFAULT 0,
          last_evaluated_at TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_client_segments_brand ON client_segments(brand_id);

        -- Feature 6: A/B Campaign Testing
        CREATE TABLE IF NOT EXISTS campaign_variants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
          variant_name CHAR(1) NOT NULL DEFAULT 'A',
          subject VARCHAR(500) NOT NULL,
          html_content TEXT,
          text_content TEXT,
          recipient_split INTEGER DEFAULT 50,
          sent_count INTEGER DEFAULT 0,
          open_count INTEGER DEFAULT 0,
          click_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_campaign_variants_campaign ON campaign_variants(campaign_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_variants_unique ON campaign_variants(campaign_id, variant_name);
        ALTER TABLE campaign_variants ADD COLUMN IF NOT EXISTS send_percentage INTEGER DEFAULT 50;
        ALTER TABLE campaign_variants ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT FALSE;
        ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS variant_name CHAR(1) DEFAULT 'A';

        -- ── CMS ──────────────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS cms_sites (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          name VARCHAR(200) NOT NULL,
          domain VARCHAR(500),
          description TEXT,
          default_seo_title VARCHAR(200),
          default_seo_description TEXT,
          og_image_url VARCHAR(500),
          google_analytics_id VARCHAR(100),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_cms_sites_brand ON cms_sites(brand_id);

        CREATE TABLE IF NOT EXISTS cms_pages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          site_id UUID NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          slug VARCHAR(500) NOT NULL,
          content TEXT,
          excerpt TEXT,
          featured_image_url VARCHAR(500),
          page_type VARCHAR(20) DEFAULT 'page' CHECK (page_type IN ('page','post','landing')),
          status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','published','scheduled','archived')),
          published_at TIMESTAMP,
          scheduled_at TIMESTAMP,
          seo_title VARCHAR(200),
          seo_description TEXT,
          seo_keywords VARCHAR(500),
          og_image_url VARCHAR(500),
          category VARCHAR(100),
          tags JSONB DEFAULT '[]',
          author_id UUID REFERENCES users(id) ON DELETE SET NULL,
          view_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(site_id, slug)
        );
        CREATE INDEX IF NOT EXISTS idx_cms_pages_site ON cms_pages(site_id);
        CREATE INDEX IF NOT EXISTS idx_cms_pages_brand ON cms_pages(brand_id);
        CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status);

        CREATE TABLE IF NOT EXISTS cms_media (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          site_id UUID REFERENCES cms_sites(id) ON DELETE SET NULL,
          filename VARCHAR(500) NOT NULL,
          original_name VARCHAR(500),
          file_url VARCHAR(1000) NOT NULL,
          file_type VARCHAR(20) DEFAULT 'image' CHECK (file_type IN ('image','video','document','other')),
          mime_type VARCHAR(100),
          file_size INTEGER,
          alt_text VARCHAR(500),
          caption TEXT,
          uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_cms_media_brand ON cms_media(brand_id);

        -- ── Social Media ──────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS social_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
          platform VARCHAR(20) NOT NULL CHECK (platform IN ('linkedin','twitter','facebook','instagram')),
          account_name VARCHAR(200),
          account_handle VARCHAR(200),
          platform_account_id VARCHAR(500),
          profile_image_url VARCHAR(500),
          access_token TEXT,
          refresh_token TEXT,
          token_expires_at TIMESTAMP,
          scope TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_sync_at TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_social_accounts_brand ON social_accounts(brand_id);

        CREATE TABLE IF NOT EXISTS social_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          social_account_id UUID REFERENCES social_accounts(id) ON DELETE SET NULL,
          platform VARCHAR(20) NOT NULL,
          content TEXT NOT NULL,
          media_urls JSONB DEFAULT '[]',
          link_url VARCHAR(1000),
          post_type VARCHAR(20) DEFAULT 'post' CHECK (post_type IN ('post','story','thread')),
          status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','failed')),
          scheduled_at TIMESTAMP,
          published_at TIMESTAMP,
          platform_post_id VARCHAR(500),
          error_message TEXT,
          like_count INTEGER DEFAULT 0,
          comment_count INTEGER DEFAULT 0,
          share_count INTEGER DEFAULT 0,
          impression_count INTEGER DEFAULT 0,
          group_id UUID,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_social_posts_brand ON social_posts(brand_id);
        CREATE INDEX IF NOT EXISTS idx_social_posts_account ON social_posts(social_account_id);
        CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_at) WHERE status = 'scheduled';

        ALTER TABLE brands ADD COLUMN IF NOT EXISTS social_api_keys JSONB DEFAULT '{}';

        -- ── Content Approval columns ─────────────────────────────────────────
        ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'none' CHECK (review_status IN ('none','pending_review','approved','changes_requested'));
        ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS review_token UUID DEFAULT gen_random_uuid();
        ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS review_notes TEXT;
        ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
        ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR(200);
        CREATE INDEX IF NOT EXISTS idx_cms_pages_review_token ON cms_pages(review_token);

        ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'none' CHECK (review_status IN ('none','pending_review','approved','changes_requested'));
        ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS review_token UUID DEFAULT gen_random_uuid();
        ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS review_notes TEXT;
        ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
        ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR(200);
        CREATE INDEX IF NOT EXISTS idx_social_posts_review_token ON social_posts(review_token);

        -- ── CMS Page Version History ──────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS cms_page_versions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          page_id UUID NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          version_number INTEGER NOT NULL DEFAULT 1,
          title VARCHAR(500),
          content TEXT,
          excerpt TEXT,
          seo_title VARCHAR(200),
          seo_description TEXT,
          seo_keywords VARCHAR(500),
          status VARCHAR(20),
          saved_by UUID REFERENCES users(id) ON DELETE SET NULL,
          saved_by_name VARCHAR(200),
          snapshot_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_cms_page_versions_page ON cms_page_versions(page_id);
        CREATE INDEX IF NOT EXISTS idx_cms_page_versions_brand ON cms_page_versions(brand_id);

        -- ── Brand Voice Profile ───────────────────────────────────────────────
        ALTER TABLE brands ADD COLUMN IF NOT EXISTS brand_voice JSONB DEFAULT '{}';

        -- ── Service Packages / Retainer Tracker ──────────────────────────────
        CREATE TABLE IF NOT EXISTS service_packages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          monthly_hours NUMERIC(10,2) DEFAULT 0,
          monthly_posts INTEGER DEFAULT 0,
          monthly_pages INTEGER DEFAULT 0,
          price NUMERIC(10,2) DEFAULT 0,
          billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','quarterly','annual','one-time')),
          start_date DATE,
          end_date DATE,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','paused','ended')),
          services JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_service_packages_brand ON service_packages(brand_id);
        CREATE INDEX IF NOT EXISTS idx_service_packages_client ON service_packages(client_id);

        CREATE TABLE IF NOT EXISTS package_usage (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          package_id UUID NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          hours_used NUMERIC(10,2) DEFAULT 0,
          posts_published INTEGER DEFAULT 0,
          pages_published INTEGER DEFAULT 0,
          notes TEXT,
          logged_by UUID REFERENCES users(id) ON DELETE SET NULL,
          logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_package_usage_package ON package_usage(package_id);

        -- ── Client Reports ─────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS client_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
          title VARCHAR(300) NOT NULL,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          summary_text TEXT,
          metrics JSONB DEFAULT '{}',
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_client_reports_brand ON client_reports(brand_id);
        CREATE INDEX IF NOT EXISTS idx_client_reports_client ON client_reports(client_id);

        -- ── Reputation Management ────────────────────────────────────────────────────

        CREATE TABLE IF NOT EXISTS reputation_platforms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          platform VARCHAR(20) NOT NULL CHECK (platform IN ('google','facebook','yelp','custom')),
          label VARCHAR(100),
          review_url VARCHAR(1000),
          is_active BOOLEAN DEFAULT TRUE,
          UNIQUE(brand_id, platform)
        );

        CREATE TABLE IF NOT EXISTS reputation_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          channel VARCHAR(10) NOT NULL CHECK (channel IN ('email','sms')),
          platform VARCHAR(20) DEFAULT 'google',
          review_url VARCHAR(1000),
          tracking_token VARCHAR(100) UNIQUE,
          status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent','clicked','completed')),
          message TEXT,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          clicked_at TIMESTAMP,
          trigger_source VARCHAR(30) DEFAULT 'manual'
            CHECK (trigger_source IN ('manual','invoice_paid','project_completed'))
        );
        CREATE INDEX IF NOT EXISTS idx_reputation_requests_brand ON reputation_requests(brand_id);
        CREATE INDEX IF NOT EXISTS idx_reputation_requests_token ON reputation_requests(tracking_token);

        CREATE TABLE IF NOT EXISTS reputation_reviews (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          platform VARCHAR(20) DEFAULT 'google'
            CHECK (platform IN ('google','facebook','yelp','custom')),
          reviewer_name VARCHAR(200),
          rating INTEGER CHECK (rating BETWEEN 1 AND 5),
          review_text TEXT,
          review_date DATE,
          platform_review_id VARCHAR(500),
          response_text TEXT,
          responded_at TIMESTAMP,
          source_url VARCHAR(1000),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_reputation_reviews_brand ON reputation_reviews(brand_id);

        ALTER TABLE brands ADD COLUMN IF NOT EXISTS reputation_settings JSONB DEFAULT '{"auto_after_invoice":false,"auto_after_project":false,"trigger_delay_days":1,"default_platform":"google","default_email_message":"Hi {client_name}, thank you for working with {brand_name}! We would love your feedback.","default_sms_message":"Hi {client_name}, thanks for working with {brand_name}! Mind leaving us a review? {review_url}"}';

        -- ── Funnel & Landing Page Builder ────────────────────────────────────────────

        CREATE TABLE IF NOT EXISTS funnels (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          name VARCHAR(200) NOT NULL,
          slug VARCHAR(200) NOT NULL,
          status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
          goal VARCHAR(50) DEFAULT 'leads' CHECK (goal IN ('leads','sales','booking','awareness')),
          seo_title VARCHAR(200),
          seo_description TEXT,
          og_image_url VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(brand_id, slug)
        );
        CREATE INDEX IF NOT EXISTS idx_funnels_brand ON funnels(brand_id);

        CREATE TABLE IF NOT EXISTS funnel_steps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          name VARCHAR(200) NOT NULL,
          slug VARCHAR(200) NOT NULL,
          step_order INTEGER NOT NULL DEFAULT 1,
          blocks JSONB DEFAULT '[]',
          next_step_id UUID REFERENCES funnel_steps(id) ON DELETE SET NULL,
          seo_title VARCHAR(200),
          seo_description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(funnel_id, slug)
        );
        CREATE INDEX IF NOT EXISTS idx_funnel_steps_funnel ON funnel_steps(funnel_id);

        CREATE TABLE IF NOT EXISTS funnel_analytics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
          step_id UUID REFERENCES funnel_steps(id) ON DELETE CASCADE,
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('view','conversion')),
          visitor_id VARCHAR(100),
          referrer VARCHAR(1000),
          utm_source VARCHAR(100),
          utm_medium VARCHAR(100),
          utm_campaign VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_funnel_analytics_funnel ON funnel_analytics(funnel_id);
        CREATE INDEX IF NOT EXISTS idx_funnel_analytics_step ON funnel_analytics(step_id);

        -- ── AI Chat Widget ─────────────────────────────────────────────────────

        CREATE TABLE IF NOT EXISTS chat_widget_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          is_enabled BOOLEAN DEFAULT TRUE,
          widget_name VARCHAR(100) DEFAULT 'Chat with us',
          greeting_message TEXT DEFAULT 'Hi! How can I help you today?',
          primary_color VARCHAR(7) DEFAULT '#2563eb',
          position VARCHAR(10) DEFAULT 'right' CHECK (position IN ('left','right')),
          collect_email BOOLEAN DEFAULT TRUE,
          ai_enabled BOOLEAN DEFAULT TRUE,
          ai_context TEXT,
          offline_message TEXT DEFAULT 'We''re offline right now. Leave a message!',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(brand_id)
        );

        CREATE TABLE IF NOT EXISTS chat_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          visitor_id VARCHAR(100),
          visitor_name VARCHAR(200),
          visitor_email VARCHAR(200),
          page_url VARCHAR(1000),
          status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','closed','converted')),
          converted_to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          role VARCHAR(10) NOT NULL CHECK (role IN ('visitor','assistant','agent')),
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_chat_sessions_brand ON chat_sessions(brand_id);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

        -- ── Email Sequences (Drip Campaigns) ──────────────────────────────────

        CREATE TABLE IF NOT EXISTS drip_sequences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS drip_steps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sequence_id UUID NOT NULL REFERENCES drip_sequences(id) ON DELETE CASCADE,
          position INTEGER NOT NULL DEFAULT 1,
          subject VARCHAR(500) NOT NULL,
          html_content TEXT NOT NULL,
          delay_days INTEGER NOT NULL DEFAULT 0,
          delay_hours INTEGER NOT NULL DEFAULT 0,
          from_name VARCHAR(200),
          from_email VARCHAR(200),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS drip_enrollments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sequence_id UUID NOT NULL REFERENCES drip_sequences(id) ON DELETE CASCADE,
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          contact_email VARCHAR(200) NOT NULL,
          contact_name VARCHAR(200),
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','completed','unsubscribed','paused')),
          current_step INTEGER DEFAULT 0,
          next_send_at TIMESTAMP,
          enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP,
          UNIQUE(sequence_id, contact_email)
        );

        CREATE TABLE IF NOT EXISTS drip_sends (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          enrollment_id UUID NOT NULL REFERENCES drip_enrollments(id) ON DELETE CASCADE,
          step_id UUID NOT NULL REFERENCES drip_steps(id) ON DELETE CASCADE,
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          to_email VARCHAR(200) NOT NULL,
          subject VARCHAR(500),
          status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent','failed','opened','clicked')),
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          opened_at TIMESTAMP,
          clicked_at TIMESTAMP,
          open_count INTEGER DEFAULT 0,
          click_count INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_drip_sequences_brand ON drip_sequences(brand_id);
        CREATE INDEX IF NOT EXISTS idx_drip_steps_sequence ON drip_steps(sequence_id);
        CREATE INDEX IF NOT EXISTS idx_drip_enrollments_due ON drip_enrollments(next_send_at) WHERE status='active';
        CREATE INDEX IF NOT EXISTS idx_drip_enrollments_seq ON drip_enrollments(sequence_id);
        CREATE INDEX IF NOT EXISTS idx_drip_sends_enrollment ON drip_sends(enrollment_id);

        CREATE TABLE IF NOT EXISTS sms_broadcasts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,
          status VARCHAR(20) DEFAULT 'draft',
          total_recipients INTEGER DEFAULT 0,
          sent_count INTEGER DEFAULT 0,
          failed_count INTEGER DEFAULT 0,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          sent_at TIMESTAMPTZ
        );
        CREATE TABLE IF NOT EXISTS sms_broadcast_recipients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          broadcast_id UUID REFERENCES sms_broadcasts(id) ON DELETE CASCADE,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          phone VARCHAR(50) NOT NULL,
          name VARCHAR(255),
          status VARCHAR(20) DEFAULT 'pending',
          error_message TEXT,
          sent_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_sms_broadcast_recipients ON sms_broadcast_recipients(broadcast_id);

        -- NPS / CSAT Surveys
        CREATE TABLE IF NOT EXISTS surveys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(10) NOT NULL DEFAULT 'nps',
          question TEXT NOT NULL,
          send_trigger VARCHAR(30) DEFAULT 'manual',
          delay_days INTEGER DEFAULT 1,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS survey_sends (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
          brand_id UUID NOT NULL,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          token UUID NOT NULL DEFAULT gen_random_uuid(),
          sent_at TIMESTAMPTZ DEFAULT NOW(),
          responded_at TIMESTAMPTZ,
          is_responded BOOLEAN DEFAULT FALSE
        );
        CREATE TABLE IF NOT EXISTS survey_responses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
          survey_send_id UUID REFERENCES survey_sends(id),
          brand_id UUID NOT NULL,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          score SMALLINT NOT NULL CHECK (score >= 0 AND score <= 10),
          comment TEXT,
          responded_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_survey_sends_token  ON survey_sends(token);
        CREATE INDEX IF NOT EXISTS idx_survey_sends_brand  ON survey_sends(brand_id);
        CREATE INDEX IF NOT EXISTS idx_survey_responses_brand ON survey_responses(brand_id, survey_id);

        -- Two-Way Email Threading
        ALTER TABLE email_connections ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255);
        ALTER TABLE email_connections ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587;
        ALTER TABLE email_connections ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255);
        ALTER TABLE email_connections ADD COLUMN IF NOT EXISTS smtp_password TEXT;

        CREATE TABLE IF NOT EXISTS emails (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          connection_id UUID REFERENCES email_connections(id) ON DELETE SET NULL,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          thread_id VARCHAR(255) NOT NULL,
          message_id VARCHAR(500),
          in_reply_to VARCHAR(500),
          email_references TEXT,
          from_address VARCHAR(255) NOT NULL,
          from_name VARCHAR(255),
          to_addresses TEXT NOT NULL,
          cc_addresses TEXT,
          subject VARCHAR(1000),
          body_text TEXT,
          body_html TEXT,
          direction VARCHAR(10) NOT NULL DEFAULT 'inbound',
          is_read BOOLEAN DEFAULT FALSE,
          sent_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_emails_brand ON emails(brand_id);
        CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(brand_id, thread_id);
        CREATE INDEX IF NOT EXISTS idx_emails_client ON emails(client_id);
        CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);

        -- Outlook Calendar Sync
        CREATE TABLE IF NOT EXISTS outlook_calendar_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          token_expiry TIMESTAMP,
          calendar_id VARCHAR(255) DEFAULT 'primary',
          delta_link TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          last_synced_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_outlook_cal_conn_brand ON outlook_calendar_connections(brand_id);
        ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS outlook_event_id VARCHAR(255);

        -- Custom Report Builder
        CREATE TABLE IF NOT EXISTS report_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          sections JSONB NOT NULL DEFAULT '[]',
          is_system BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE client_reports ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL;
        ALTER TABLE client_reports ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]';
      `);

      // Seed system report templates (idempotent)
      await query(`
        INSERT INTO report_templates (name, description, sections, is_system)
        SELECT 'Executive Summary', 'High-level overview', '["revenue","pipeline","projects","health_score"]'::jsonb, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM report_templates WHERE name = 'Executive Summary' AND is_system = TRUE);
        INSERT INTO report_templates (name, description, sections, is_system)
        SELECT 'Quarterly Review', 'Comprehensive quarterly review', '["revenue","pipeline","projects","time","tickets","surveys","health_score"]'::jsonb, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM report_templates WHERE name = 'Quarterly Review' AND is_system = TRUE);
        INSERT INTO report_templates (name, description, sections, is_system)
        SELECT 'Project Status', 'Project-focused report', '["projects","time","tickets"]'::jsonb, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM report_templates WHERE name = 'Project Status' AND is_system = TRUE);

        -- ═══ TIER 3: Churn Prediction ═══
        CREATE TABLE IF NOT EXISTS churn_predictions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
          client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          churn_probability INTEGER NOT NULL DEFAULT 0,
          risk_factors JSONB DEFAULT '{}',
          health_score_trend JSONB DEFAULT '[]',
          auto_action_taken BOOLEAN DEFAULT FALSE,
          predicted_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(brand_id, client_id)
        );
        CREATE INDEX IF NOT EXISTS idx_churn_brand ON churn_predictions(brand_id);

        -- ═══ TIER 3: Email Tracking ═══
        CREATE TABLE IF NOT EXISTS email_tracking_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          enrollment_id UUID REFERENCES drip_enrollments(id) ON DELETE CASCADE,
          step_number INTEGER NOT NULL,
          event_type VARCHAR(20) NOT NULL,
          tracked_at TIMESTAMPTZ DEFAULT NOW(),
          metadata JSONB DEFAULT '{}'
        );
        CREATE INDEX IF NOT EXISTS idx_tracking_enrollment ON email_tracking_events(enrollment_id, step_number);

        -- ═══ TIER 3: Sequence Branching ═══
        ALTER TABLE drip_steps ADD COLUMN IF NOT EXISTS step_type VARCHAR(20) DEFAULT 'email';
        ALTER TABLE drip_steps ADD COLUMN IF NOT EXISTS condition_config JSONB;
        ALTER TABLE drip_steps ADD COLUMN IF NOT EXISTS yes_next_step INTEGER;
        ALTER TABLE drip_steps ADD COLUMN IF NOT EXISTS no_next_step INTEGER;
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

    // Start Outlook Calendar sync cron (every 30 minutes)
    startOutlookCalendarCron();

    // Start drip sequence cron (every 5 minutes)
    startDripCron();

    // Start churn prediction cron (daily)
    startChurnPredictionCron();

    // Publish CMS scheduled pages (every 60 seconds)
    const { publishScheduledPages } = await import('./src/models/cmsModel.js');
    setInterval(async () => {
      try { await publishScheduledPages(); } catch(e) { /* non-critical */ }
    }, 60_000);

    // Publish scheduled social posts (every 60 seconds)
    const { getScheduledDuePosts, markPublished, markFailed } = await import('./src/models/socialModel.js');
    const { publishPost } = await import('./src/controllers/socialController.js');
    setInterval(async () => {
      try {
        const posts = await getScheduledDuePosts();
        for (const post of posts) {
          try {
            await publishPost(post);
          } catch(e) {
            await markFailed(post.id, e.message);
          }
        }
      } catch(e) { /* non-critical */ }
    }, 60_000);

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
