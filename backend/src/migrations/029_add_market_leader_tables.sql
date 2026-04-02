-- Migration: Add tables for market-leader features
-- Created: 2026-03-13
-- Adds: usage_tracking, api_keys, zapier_subscriptions, activity_feed, gdpr_requests
-- Also adds white-label columns to brands

-- ── Extend existing usage_tracking for plan enforcement ───────────────────────
-- usage_tracking already exists from 009 with (brand_id, subscription_id, metric_name, metric_value, period_start, period_end)
-- Add user_id and month columns for plan enforcement usage
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS usage_type VARCHAR(50);
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS month VARCHAR(7);
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 0;

-- Create index for plan enforcement queries (only if user_id column exists now)
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON usage_tracking(user_id, month);

-- ── API keys ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL,
  scopes JSONB DEFAULT '["*"]',
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  request_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_brand ON api_keys(brand_id);

-- ── Zapier webhook subscriptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zapier_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hook_url TEXT NOT NULL,
  event VARCHAR(50) NOT NULL,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zapier_subs_brand_event ON zapier_subscriptions(brand_id, event);

-- ── Activity feed / team changelog ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_feed_brand ON activity_feed(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_entity ON activity_feed(entity_type, entity_id);

-- ── GDPR data requests ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gdpr_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  download_url TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user ON gdpr_requests(user_id);

-- ── White-label columns on brands (each in its own block to avoid cascade failures) ──
ALTER TABLE brands ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMPTZ;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS custom_login_logo TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS custom_login_bg TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS custom_favicon TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS custom_css TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS hide_branding BOOLEAN DEFAULT FALSE;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS email_from_name VARCHAR(100);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS email_from_domain VARCHAR(255);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS portal_title VARCHAR(200);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS portal_description TEXT;

-- Add unique constraint on custom_domain if not already present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brands_custom_domain_key'
  ) THEN
    ALTER TABLE brands ADD CONSTRAINT brands_custom_domain_key UNIQUE (custom_domain);
  END IF;
END $$;

-- ── Dunning columns on subscriptions ─────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS dunning_attempts INTEGER DEFAULT 0;
    ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS dunning_last_attempt TIMESTAMPTZ;
  END IF;
END $$;

-- ── Data retention policy ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 365,
  auto_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, entity_type)
);

-- ── i18n preferences ─────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY';
ALTER TABLE users ADD COLUMN IF NOT EXISTS currency_format VARCHAR(10) DEFAULT 'USD';

-- ── Email deliverability ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_bounces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  bounce_type VARCHAR(20) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_bounces_email ON email_bounces(email);
CREATE INDEX IF NOT EXISTS idx_email_bounces_brand ON email_bounces(brand_id);
