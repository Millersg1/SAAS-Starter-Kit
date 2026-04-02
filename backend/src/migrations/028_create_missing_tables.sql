-- Migration 028: Create all missing tables for SaaS Starter Kit
-- Generated 2026-03-13
-- This migration adds all tables referenced in model files that do not yet exist.

BEGIN;

-- ============================================================================
-- ALTER existing tables
-- ============================================================================

-- Add photo_url to clients if missing
ALTER TABLE clients ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add reputation_settings JSONB to brands if missing
ALTER TABLE brands ADD COLUMN IF NOT EXISTS reputation_settings JSONB DEFAULT '{}';

-- ============================================================================
-- call_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  direction VARCHAR(20) DEFAULT 'outbound',
  phone_number VARCHAR(50),
  duration_seconds INTEGER DEFAULT 0,
  outcome VARCHAR(100),
  notes TEXT,
  called_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_brand ON call_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_client ON call_logs(client_id);

-- ============================================================================
-- calendar_events
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  location VARCHAR(500),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  event_type VARCHAR(50) DEFAULT 'meeting',
  reminder_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_brand ON calendar_events(brand_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);

-- ============================================================================
-- booking_pages
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  available_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  day_start_time VARCHAR(10) DEFAULT '09:00',
  day_end_time VARCHAR(10) DEFAULT '17:00',
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  buffer_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_pages_brand ON booking_pages(brand_id);
CREATE INDEX IF NOT EXISTS idx_booking_pages_slug ON booking_pages(slug);

-- ============================================================================
-- bookings
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_page_id UUID NOT NULL REFERENCES booking_pages(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  client_message TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(30) DEFAULT 'confirmed',
  cancel_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_page ON bookings(booking_page_id);
CREATE INDEX IF NOT EXISTS idx_bookings_brand ON bookings(brand_id);
CREATE INDEX IF NOT EXISTS idx_bookings_cancel_token ON bookings(cancel_token);

-- ============================================================================
-- support_tickets
-- ============================================================================

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1000;

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ticket_number VARCHAR(30),
  subject VARCHAR(500) NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(30) DEFAULT 'open',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_brand ON support_tickets(brand_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_client ON support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- ============================================================================
-- ticket_messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type VARCHAR(30) NOT NULL,
  sender_id UUID,
  body TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);

-- ============================================================================
-- lead_forms
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  fields JSONB DEFAULT '[]',
  thank_you_message TEXT DEFAULT 'Thank you! We will be in touch shortly.',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_forms_brand ON lead_forms(brand_id);
CREATE INDEX IF NOT EXISTS idx_lead_forms_slug ON lead_forms(slug);

-- ============================================================================
-- lead_submissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES lead_forms(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  ip_address VARCHAR(50),
  status VARCHAR(30) DEFAULT 'new',
  converted_to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_submissions_form ON lead_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_lead_submissions_brand ON lead_submissions(brand_id);

-- ============================================================================
-- twilio_connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS twilio_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  account_sid VARCHAR(255) NOT NULL,
  auth_token VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_twilio_connections_brand ON twilio_connections(brand_id);
CREATE INDEX IF NOT EXISTS idx_twilio_connections_phone ON twilio_connections(phone_number);

-- ============================================================================
-- sms_messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  direction VARCHAR(20) NOT NULL,
  from_number VARCHAR(50) NOT NULL,
  to_number VARCHAR(50) NOT NULL,
  body TEXT NOT NULL,
  twilio_sid VARCHAR(100),
  status VARCHAR(30) DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_brand ON sms_messages(brand_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_client ON sms_messages(client_id);

-- ============================================================================
-- custom_field_definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) DEFAULT 'client',
  field_key VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) DEFAULT 'text',
  options JSONB DEFAULT '[]',
  required BOOLEAN DEFAULT FALSE,
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_field_defs_brand ON custom_field_definitions(brand_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_defs_entity ON custom_field_definitions(entity_type);

-- ============================================================================
-- pipelines
-- ============================================================================
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  stages JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipelines_brand ON pipelines(brand_id);

-- ============================================================================
-- client_segments
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  filter_config JSONB DEFAULT '[]',
  client_count INTEGER DEFAULT 0,
  last_evaluated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_segments_brand ON client_segments(brand_id);

-- ============================================================================
-- email_campaigns
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  preview_text VARCHAR(500),
  html_content TEXT,
  text_content TEXT,
  from_name VARCHAR(255),
  from_email VARCHAR(255),
  status VARCHAR(30) DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_brand ON email_campaigns(brand_id);

-- ============================================================================
-- campaign_recipients
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  status VARCHAR(30) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  variant_name VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_recipients_unique ON campaign_recipients(campaign_id, email);

-- ============================================================================
-- campaign_variants
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaign_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  variant_name VARCHAR(50) NOT NULL,
  subject VARCHAR(500),
  html_content TEXT,
  text_content TEXT,
  send_percentage INTEGER DEFAULT 50,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (campaign_id, variant_name)
);

CREATE INDEX IF NOT EXISTS idx_campaign_variants_campaign ON campaign_variants(campaign_id);

-- ============================================================================
-- cms_sites
-- ============================================================================
CREATE TABLE IF NOT EXISTS cms_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  description TEXT,
  default_seo_title VARCHAR(500),
  default_seo_description TEXT,
  og_image_url TEXT,
  google_analytics_id VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_sites_brand ON cms_sites(brand_id);

-- ============================================================================
-- cms_pages
-- ============================================================================
CREATE TABLE IF NOT EXISTS cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES cms_sites(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(300) NOT NULL,
  content TEXT,
  excerpt TEXT,
  featured_image_url TEXT,
  page_type VARCHAR(50) DEFAULT 'page',
  status VARCHAR(30) DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  seo_title VARCHAR(500),
  seo_description TEXT,
  seo_keywords VARCHAR(500),
  og_image_url TEXT,
  category VARCHAR(100),
  tags JSONB DEFAULT '[]',
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  review_token UUID DEFAULT gen_random_uuid(),
  review_status VARCHAR(30) DEFAULT 'none',
  review_notes TEXT,
  reviewer_name VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_pages_brand ON cms_pages(brand_id);
CREATE INDEX IF NOT EXISTS idx_cms_pages_site ON cms_pages(site_id);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status);
CREATE INDEX IF NOT EXISTS idx_cms_pages_review_token ON cms_pages(review_token);

-- ============================================================================
-- cms_page_versions
-- ============================================================================
CREATE TABLE IF NOT EXISTS cms_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(500),
  content TEXT,
  excerpt TEXT,
  seo_title VARCHAR(500),
  seo_description TEXT,
  seo_keywords VARCHAR(500),
  status VARCHAR(30),
  saved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  saved_by_name VARCHAR(255),
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_page_versions_page ON cms_page_versions(page_id);

-- ============================================================================
-- cms_media
-- ============================================================================
CREATE TABLE IF NOT EXISTS cms_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  site_id UUID REFERENCES cms_sites(id) ON DELETE SET NULL,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500),
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) DEFAULT 'image',
  mime_type VARCHAR(100),
  file_size BIGINT,
  alt_text VARCHAR(500),
  caption TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_media_brand ON cms_media(brand_id);

-- ============================================================================
-- social_accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  platform VARCHAR(50) NOT NULL,
  account_name VARCHAR(255),
  account_handle VARCHAR(255),
  platform_account_id VARCHAR(255),
  profile_image_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_brand ON social_accounts(brand_id);

-- ============================================================================
-- social_posts
-- ============================================================================
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES social_accounts(id) ON DELETE SET NULL,
  platform VARCHAR(50) NOT NULL,
  content TEXT,
  media_urls JSONB DEFAULT '[]',
  link_url TEXT,
  post_type VARCHAR(50) DEFAULT 'post',
  status VARCHAR(30) DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_id VARCHAR(255),
  group_id UUID,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  impression_count INTEGER DEFAULT 0,
  error_message TEXT,
  review_token UUID DEFAULT gen_random_uuid(),
  review_status VARCHAR(30) DEFAULT 'none',
  review_notes TEXT,
  reviewer_name VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_brand ON social_posts(brand_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_account ON social_posts(social_account_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_review_token ON social_posts(review_token);

-- ============================================================================
-- service_packages
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  monthly_hours NUMERIC(10,2) DEFAULT 0,
  monthly_posts INTEGER DEFAULT 0,
  monthly_pages INTEGER DEFAULT 0,
  price NUMERIC(12,2) DEFAULT 0,
  billing_cycle VARCHAR(30) DEFAULT 'monthly',
  start_date DATE,
  end_date DATE,
  status VARCHAR(30) DEFAULT 'active',
  services JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_packages_brand ON service_packages(brand_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_client ON service_packages(client_id);

-- ============================================================================
-- package_usage
-- ============================================================================
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_package_usage_package ON package_usage(package_id);

-- ============================================================================
-- reputation_platforms
-- ============================================================================
CREATE TABLE IF NOT EXISTS reputation_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  label VARCHAR(255),
  review_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_reputation_platforms_brand ON reputation_platforms(brand_id);

-- ============================================================================
-- reputation_settings (stored as JSONB on brands table, already handled above)
-- ============================================================================

-- ============================================================================
-- reputation_requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS reputation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  channel VARCHAR(30) NOT NULL,
  platform VARCHAR(50) DEFAULT 'google',
  review_url TEXT,
  tracking_token TEXT,
  message TEXT,
  trigger_source VARCHAR(50) DEFAULT 'manual',
  status VARCHAR(30) DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reputation_requests_brand ON reputation_requests(brand_id);
CREATE INDEX IF NOT EXISTS idx_reputation_requests_token ON reputation_requests(tracking_token);

-- ============================================================================
-- reputation_reviews
-- ============================================================================
CREATE TABLE IF NOT EXISTS reputation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform VARCHAR(50) DEFAULT 'google',
  reviewer_name VARCHAR(255),
  rating INTEGER,
  review_text TEXT,
  review_date DATE,
  source_url TEXT,
  platform_review_id VARCHAR(255),
  response_text TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reputation_reviews_brand ON reputation_reviews(brand_id);
CREATE INDEX IF NOT EXISTS idx_reputation_reviews_platform ON reputation_reviews(platform);

-- ============================================================================
-- funnels
-- ============================================================================
CREATE TABLE IF NOT EXISTS funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(300) NOT NULL,
  goal VARCHAR(50) DEFAULT 'leads',
  status VARCHAR(30) DEFAULT 'draft',
  seo_title VARCHAR(500),
  seo_description TEXT,
  og_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnels_brand ON funnels(brand_id);
CREATE INDEX IF NOT EXISTS idx_funnels_slug ON funnels(brand_id, slug);

-- ============================================================================
-- funnel_steps
-- ============================================================================
CREATE TABLE IF NOT EXISTS funnel_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(300) NOT NULL,
  step_order INTEGER DEFAULT 0,
  blocks JSONB DEFAULT '[]',
  next_step_id UUID REFERENCES funnel_steps(id) ON DELETE SET NULL,
  seo_title VARCHAR(500),
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_steps_funnel ON funnel_steps(funnel_id);

-- ============================================================================
-- funnel_analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS funnel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  step_id UUID REFERENCES funnel_steps(id) ON DELETE SET NULL,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  visitor_id VARCHAR(255),
  referrer TEXT,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_analytics_funnel ON funnel_analytics(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_analytics_step ON funnel_analytics(step_id);
CREATE INDEX IF NOT EXISTS idx_funnel_analytics_event ON funnel_analytics(event_type);

-- ============================================================================
-- chat_widget_settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_widget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE UNIQUE,
  is_enabled BOOLEAN DEFAULT TRUE,
  widget_name VARCHAR(255) DEFAULT 'Chat with us',
  greeting_message TEXT DEFAULT 'Hi! How can I help you today?',
  primary_color VARCHAR(20) DEFAULT '#2563eb',
  position VARCHAR(20) DEFAULT 'right',
  collect_email BOOLEAN DEFAULT TRUE,
  ai_enabled BOOLEAN DEFAULT TRUE,
  ai_context TEXT DEFAULT '',
  offline_message TEXT DEFAULT 'We''re offline right now. Leave a message!',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_widget_settings_brand ON chat_widget_settings(brand_id);

-- ============================================================================
-- chat_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  visitor_id VARCHAR(255),
  visitor_name VARCHAR(255),
  visitor_email VARCHAR(255),
  page_url TEXT,
  status VARCHAR(30) DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  converted_to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_brand ON chat_sessions(brand_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);

-- ============================================================================
-- chat_messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- ============================================================================
-- automation_workflows
-- ============================================================================
CREATE TABLE IF NOT EXISTS automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(100) NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  workflow_definition JSONB,
  is_active BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_workflows_brand ON automation_workflows(brand_id);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_trigger ON automation_workflows(trigger_type);

-- ============================================================================
-- automation_steps
-- ============================================================================
CREATE TABLE IF NOT EXISTS automation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
  step_type VARCHAR(100) NOT NULL,
  step_config JSONB DEFAULT '{}',
  delay_minutes INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_steps_workflow ON automation_steps(workflow_id);

-- ============================================================================
-- automation_enrollments
-- ============================================================================
CREATE TABLE IF NOT EXISTS automation_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) DEFAULT 'client',
  current_step INTEGER DEFAULT 0,
  current_node_id VARCHAR(255),
  next_step_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'active',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_automation_enrollments_workflow ON automation_enrollments(workflow_id);
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_status ON automation_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_next ON automation_enrollments(next_step_at);

-- ============================================================================
-- emails
-- ============================================================================
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  connection_id UUID,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  thread_id UUID NOT NULL,
  message_id VARCHAR(500),
  in_reply_to VARCHAR(500),
  email_references TEXT,
  from_address VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  to_addresses TEXT NOT NULL,
  cc_addresses TEXT,
  subject VARCHAR(500) DEFAULT '(no subject)',
  body_text TEXT,
  body_html TEXT,
  direction VARCHAR(20) DEFAULT 'inbound',
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emails_brand ON emails(brand_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_client ON emails(client_id);
CREATE INDEX IF NOT EXISTS idx_emails_direction ON emails(direction);
CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);

-- ============================================================================
-- email_connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  provider VARCHAR(50),
  email_address VARCHAR(255) NOT NULL,
  imap_host VARCHAR(255),
  imap_port INTEGER DEFAULT 993,
  imap_user VARCHAR(255),
  imap_password TEXT,
  smtp_host VARCHAR(255),
  smtp_port INTEGER DEFAULT 587,
  smtp_user VARCHAR(255),
  smtp_password TEXT,
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_connections_brand ON email_connections(brand_id);

-- ============================================================================
-- client_reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  summary_text TEXT,
  metrics JSONB DEFAULT '{}',
  sections JSONB DEFAULT '[]',
  template_id UUID,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_reports_brand ON client_reports(brand_id);
CREATE INDEX IF NOT EXISTS idx_client_reports_client ON client_reports(client_id);

-- ============================================================================
-- report_templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sections JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_templates_brand ON report_templates(brand_id);

-- ============================================================================
-- client_health_scores
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  score_breakdown JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_health_scores_brand ON client_health_scores(brand_id);
CREATE INDEX IF NOT EXISTS idx_client_health_scores_client ON client_health_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_client_health_scores_calc ON client_health_scores(calculated_at);

-- ============================================================================
-- surveys
-- ============================================================================
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(30) DEFAULT 'nps',
  question TEXT NOT NULL,
  send_trigger VARCHAR(50) DEFAULT 'manual',
  delay_days INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_brand ON surveys(brand_id);

-- ============================================================================
-- survey_sends
-- ============================================================================
CREATE TABLE IF NOT EXISTS survey_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  token UUID DEFAULT gen_random_uuid(),
  is_responded BOOLEAN DEFAULT FALSE,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_sends_survey ON survey_sends(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_sends_token ON survey_sends(token);

-- ============================================================================
-- survey_responses
-- ============================================================================
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  survey_send_id UUID REFERENCES survey_sends(id) ON DELETE SET NULL,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  comment TEXT,
  responded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_brand ON survey_responses(brand_id);

-- ============================================================================
-- drip_sequences
-- ============================================================================
CREATE TABLE IF NOT EXISTS drip_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(30) DEFAULT 'draft',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drip_sequences_brand ON drip_sequences(brand_id);

-- ============================================================================
-- drip_steps
-- ============================================================================
CREATE TABLE IF NOT EXISTS drip_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES drip_sequences(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  subject VARCHAR(500),
  html_content TEXT,
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  from_name VARCHAR(255),
  from_email VARCHAR(255),
  step_type VARCHAR(50) DEFAULT 'email',
  condition_config JSONB,
  yes_next_step INTEGER,
  no_next_step INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drip_steps_sequence ON drip_steps(sequence_id);

-- ============================================================================
-- drip_enrollments
-- ============================================================================
CREATE TABLE IF NOT EXISTS drip_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES drip_sequences(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  contact_email VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  current_step INTEGER DEFAULT 0,
  next_send_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'active',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (sequence_id, contact_email)
);

CREATE INDEX IF NOT EXISTS idx_drip_enrollments_sequence ON drip_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_status ON drip_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_next ON drip_enrollments(next_send_at);

-- ============================================================================
-- drip_sends
-- ============================================================================
CREATE TABLE IF NOT EXISTS drip_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES drip_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES drip_steps(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drip_sends_enrollment ON drip_sends(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_drip_sends_step ON drip_sends(step_id);

-- ============================================================================
-- churn_predictions (used by churnPredictionCron and churnController)
-- ============================================================================
CREATE TABLE IF NOT EXISTS churn_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  churn_probability INTEGER DEFAULT 0,
  risk_factors JSONB DEFAULT '{}',
  health_score_trend JSONB DEFAULT '[]',
  auto_action_taken BOOLEAN DEFAULT FALSE,
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_churn_predictions_brand ON churn_predictions(brand_id);
CREATE INDEX IF NOT EXISTS idx_churn_predictions_prob ON churn_predictions(churn_probability);

-- ============================================================================
-- notifications (used by churnPredictionCron and notificationController)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_brand ON notifications(brand_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- ============================================================================
-- Add pipeline_id column to pipeline_deals if missing
-- ============================================================================
ALTER TABLE pipeline_deals ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL;

COMMIT;
