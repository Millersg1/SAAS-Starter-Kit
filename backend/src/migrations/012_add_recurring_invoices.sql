-- Migration 012: Add recurring invoice columns
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(20) DEFAULT 'none'
    CHECK (recurrence_type IN ('none','weekly','monthly','quarterly','yearly')),
  ADD COLUMN IF NOT EXISTS recurrence_day  SMALLINT,
  ADD COLUMN IF NOT EXISTS next_invoice_date DATE,
  ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES invoices(id);
