-- ── Voice Agent Tables ────────────────────────────────────────────────────────

-- Voice agents: AI-powered phone agents that handle inbound/outbound calls
CREATE TABLE IF NOT EXISTS voice_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  personality TEXT NOT NULL DEFAULT 'You are a friendly and professional AI assistant.',
  greeting TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
  voice VARCHAR(50) DEFAULT 'alloy',
  model VARCHAR(50) DEFAULT 'gpt-4o-realtime-preview',
  language VARCHAR(10) DEFAULT 'en',
  tools_config JSONB DEFAULT '[]'::jsonb,
  knowledge_base JSONB DEFAULT '[]'::jsonb,
  transfer_phone VARCHAR(50),
  max_duration_seconds INTEGER DEFAULT 600,
  is_active BOOLEAN DEFAULT TRUE,
  phone_number VARCHAR(50),
  total_calls INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_voice_agents_brand ON voice_agents(brand_id);

-- Voice agent calls: log of every AI-handled call
CREATE TABLE IF NOT EXISTS voice_agent_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_agent_id UUID NOT NULL REFERENCES voice_agents(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  caller_phone VARCHAR(50),
  direction VARCHAR(10) DEFAULT 'inbound',
  twilio_call_sid VARCHAR(100),
  status VARCHAR(30) DEFAULT 'in_progress',
  transcript JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  sentiment VARCHAR(20),
  actions_taken JSONB DEFAULT '[]'::jsonb,
  duration_seconds INTEGER DEFAULT 0,
  lead_captured JSONB,
  booking_created_id UUID,
  transferred BOOLEAN DEFAULT FALSE,
  ended_reason VARCHAR(50),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_voice_agent_calls_agent ON voice_agent_calls(voice_agent_id);
CREATE INDEX IF NOT EXISTS idx_voice_agent_calls_brand ON voice_agent_calls(brand_id);
CREATE INDEX IF NOT EXISTS idx_voice_agent_calls_sid ON voice_agent_calls(twilio_call_sid);

-- Add columns to call_logs for linking to voice agent calls
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS twilio_call_sid VARCHAR(100);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS transcription TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS transcription_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS voice_agent_call_id UUID REFERENCES voice_agent_calls(id) ON DELETE SET NULL;
