-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  category VARCHAR(50),
  date DATE DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  billable BOOLEAN DEFAULT FALSE,
  invoiced BOOLEAN DEFAULT FALSE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_brand ON expenses(brand_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_client ON expenses(client_id);

-- Retainers
CREATE TABLE IF NOT EXISTS retainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  hours_allocated DECIMAL(8,2) DEFAULT 0,
  amount DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  cycle_start DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_retainers_brand ON retainers(brand_id);
CREATE INDEX IF NOT EXISTS idx_retainers_client ON retainers(client_id);

-- Retainer usage log
CREATE TABLE IF NOT EXISTS retainer_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retainer_id UUID NOT NULL REFERENCES retainers(id) ON DELETE CASCADE,
  hours DECIMAL(8,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_retainer_usage_retainer ON retainer_usage(retainer_id);

-- Project templates
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  default_status VARCHAR(50) DEFAULT 'planning',
  default_budget DECIMAL(12,2) DEFAULT 0,
  task_templates JSONB DEFAULT '[]',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_templates_brand ON project_templates(brand_id);

-- Onboarding checklists
CREATE TABLE IF NOT EXISTS onboarding_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  trigger_event VARCHAR(50) DEFAULT 'proposal_accepted',
  steps JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_brand ON onboarding_checklists(brand_id);

-- Onboarding progress per client
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES onboarding_checklists(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  completed_steps JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_client ON onboarding_progress(client_id);

-- Knowledge base categories
CREATE TABLE IF NOT EXISTS kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kb_categories_brand ON kb_categories(brand_id);

-- Knowledge base articles
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  category_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) NOT NULL,
  content TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  is_public BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kb_articles_brand ON kb_articles(brand_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_slug ON kb_articles(brand_id, slug);

-- Slack integration config
CREATE TABLE IF NOT EXISTS slack_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  channel VARCHAR(100),
  events TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id)
);
