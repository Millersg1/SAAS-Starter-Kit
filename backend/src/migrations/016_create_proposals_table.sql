-- Migration: 016_create_proposals_table.sql
-- Description: Proposals / quote system
-- Date: 2026-02-20

CREATE TABLE IF NOT EXISTS proposals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  proposal_number  VARCHAR(50),
  title            VARCHAR(255) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  issue_date       DATE,
  expiry_date      DATE,
  subtotal         DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate         DECIMAL(5,2)  NOT NULL DEFAULT 0,
  tax_amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency         VARCHAR(3)    NOT NULL DEFAULT 'USD',
  notes            TEXT,
  terms            TEXT,
  client_signature TEXT,
  signed_at        TIMESTAMPTZ,
  signed_by_name   VARCHAR(255),
  accepted_at      TIMESTAMPTZ,
  rejected_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposal_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  quantity     DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price   DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_brand   ON proposals(brand_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client  ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status  ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON proposal_items(proposal_id);
