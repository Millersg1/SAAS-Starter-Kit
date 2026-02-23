-- Migration 021: Client Activity Timeline
CREATE TABLE IF NOT EXISTS client_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL DEFAULT 'note'
    CHECK (activity_type IN ('note','call','email','meeting','proposal','invoice','task_completed','system')),
  title VARCHAR(255),
  body TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_activities_brand  ON client_activities(brand_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_client ON client_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_time   ON client_activities(created_at DESC);
