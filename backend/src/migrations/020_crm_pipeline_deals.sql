-- Migration 020: CRM Pipeline Deals
CREATE TABLE IF NOT EXISTS pipeline_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  value DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  stage VARCHAR(50) NOT NULL DEFAULT 'lead'
    CHECK (stage IN ('lead','qualified','proposal_sent','negotiation','won','lost')),
  probability INTEGER DEFAULT 20 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  lost_reason TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_deals_brand  ON pipeline_deals(brand_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_deals_client ON pipeline_deals(client_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_deals_stage  ON pipeline_deals(stage);

CREATE OR REPLACE FUNCTION update_pipeline_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pipeline_deals_updated_at ON pipeline_deals;
CREATE TRIGGER trigger_pipeline_deals_updated_at
  BEFORE UPDATE ON pipeline_deals
  FOR EACH ROW EXECUTE PROCEDURE update_pipeline_deals_updated_at();
