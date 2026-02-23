-- Migration: Create Contracts Table
-- Description: Full contracts module with portal signing support
-- Date: 2026-02-23

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
  -- Signing
  client_signature TEXT,
  signed_by_name VARCHAR(255),
  signed_by_email VARCHAR(255),
  signed_at TIMESTAMPTZ,
  -- Metadata
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_brand    ON contracts(brand_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client   ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status   ON contracts(status);

-- Auto-increment contract number sequence
CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1001;

COMMENT ON TABLE contracts IS 'Service contracts with portal-based client signing';
