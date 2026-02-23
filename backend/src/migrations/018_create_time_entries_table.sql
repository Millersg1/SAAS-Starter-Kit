-- Migration: 018_create_time_entries_table.sql
-- Description: Time tracking for billable hours
-- Date: 2026-02-20

CREATE TABLE IF NOT EXISTS time_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description      TEXT,
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ,
  duration_minutes INTEGER,
  hourly_rate      DECIMAL(10,2),
  billable_amount  DECIMAL(10,2),
  is_billable      BOOLEAN NOT NULL DEFAULT TRUE,
  is_invoiced      BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_id       UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_brand   ON time_entries(brand_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user    ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_active  ON time_entries(brand_id) WHERE end_time IS NULL;
