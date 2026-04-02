-- Migration 032: Create accounting_connections table for QuickBooks/Xero sync
-- Run: psql -U $DB_USER -d $DB_NAME -f src/migrations/032_accounting_connections.sql

CREATE TABLE IF NOT EXISTS accounting_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('quickbooks', 'xero')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  company_name VARCHAR(255),
  company_id VARCHAR(255),
  realm_id VARCHAR(255),
  scope TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(20) DEFAULT 'never' CHECK (last_sync_status IN ('never', 'success', 'partial', 'error')),
  last_sync_error TEXT,
  last_sync_invoice_count INTEGER DEFAULT 0,
  last_sync_payment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id)
);

-- Index for quick brand lookups
CREATE INDEX IF NOT EXISTS idx_accounting_connections_brand_id ON accounting_connections(brand_id);

-- Sync history log for auditing
CREATE TABLE IF NOT EXISTS accounting_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES accounting_connections(id) ON DELETE CASCADE,
  sync_type VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (sync_type IN ('manual', 'auto')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'success', 'partial', 'error')),
  invoices_synced INTEGER DEFAULT 0,
  payments_synced INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  triggered_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_accounting_sync_log_brand_id ON accounting_sync_log(brand_id);
CREATE INDEX IF NOT EXISTS idx_accounting_sync_log_connection_id ON accounting_sync_log(connection_id);
