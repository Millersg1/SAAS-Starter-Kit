-- =============================================================================
-- ClientHub — Combined Database Migration
-- Run this ONCE on a fresh database.
-- Includes all migrations: 001 through 018
--
-- HOW TO RUN IN phpPgAdmin:
--   1. Log in to phpPgAdmin
--   2. Click your database (faithharborclien_clienthub) in the left tree
--   3. Click the "SQL" tab at the top (NOT the search bar)
--   4. Paste this entire file into the text area
--   5. Click "Execute" (the run button)
--   If you get an error about COUNT(*), you are in the wrong query box.
--   Use the SQL tab, not the table-row query area.
-- =============================================================================

-- =============================================================================
-- COMPATIBILITY: gen_random_uuid() for PostgreSQL < 13
-- This replaces the need for uuid-ossp or pgcrypto extensions.
-- Uses only built-in math functions available on all PostgreSQL versions.
-- =============================================================================
CREATE OR REPLACE FUNCTION gen_random_uuid()
RETURNS UUID AS $$
SELECT (
  lpad(to_hex(floor(random()*pow(2,32))::bigint), 8, '0') || '-' ||
  lpad(to_hex(floor(random()*pow(2,16))::bigint), 4, '0') || '-' ||
  '4' || lpad(to_hex(floor(random()*pow(2,12))::bigint), 3, '0') || '-' ||
  (ARRAY['8','9','a','b'])[ceil(random()*4)::int] ||
  lpad(to_hex(floor(random()*pow(2,12))::bigint), 3, '0') || '-' ||
  lpad(to_hex(floor(random()*pow(2,32))::bigint), 8, '0') ||
  lpad(to_hex(floor(random()*pow(2,16))::bigint), 4, '0')
)::UUID;
$$ LANGUAGE SQL;

-- =============================================================================
-- MIGRATION 001: Create users table
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'agency', 'client')),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  email_verification_expires TIMESTAMP,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMP,
  refresh_token TEXT,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- MIGRATION 002: Add user profile fields
-- =============================================================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

COMMENT ON COLUMN users.preferences IS 'User preferences stored as JSON (theme, notifications, language, etc.)';

-- =============================================================================
-- MIGRATION 003: Create brands and brand_members tables
-- =============================================================================
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    website VARCHAR(255),
    primary_color VARCHAR(7) DEFAULT '#007bff',
    secondary_color VARCHAR(7) DEFAULT '#6c757d',
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brand_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions JSONB DEFAULT '{}',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_brands_owner_id ON brands(owner_id);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active);
CREATE INDEX IF NOT EXISTS idx_brand_members_brand_id ON brand_members(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_members_user_id ON brand_members(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_members_role ON brand_members(role);
CREATE INDEX IF NOT EXISTS idx_brand_members_is_active ON brand_members(is_active);

CREATE OR REPLACE FUNCTION update_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brands_updated_at_trigger
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE PROCEDURE update_brands_updated_at();

CREATE OR REPLACE FUNCTION update_brand_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_members_updated_at_trigger
    BEFORE UPDATE ON brand_members
    FOR EACH ROW
    EXECUTE PROCEDURE update_brand_members_updated_at();

COMMENT ON TABLE brands IS 'Stores brand/agency information for multi-tenant support';
COMMENT ON TABLE brand_members IS 'Junction table linking users to brands with roles and permissions';
COMMENT ON COLUMN brands.slug IS 'URL-friendly unique identifier for the brand';
COMMENT ON COLUMN brands.settings IS 'Brand-specific settings (email templates, notifications, etc.)';
COMMENT ON COLUMN brand_members.role IS 'User role within the brand: owner, admin, member, viewer';
COMMENT ON COLUMN brand_members.permissions IS 'Granular permissions for the user within the brand';

-- =============================================================================
-- MIGRATION 004: Create clients table
-- =============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    portal_access BOOLEAN DEFAULT false,
    portal_password_hash VARCHAR(255),
    last_portal_login TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'archived')),
    client_type VARCHAR(50) DEFAULT 'regular' CHECK (client_type IN ('regular', 'vip', 'enterprise', 'trial')),
    industry VARCHAR(100),
    website VARCHAR(500),
    tax_id VARCHAR(100),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_brand ON clients(brand_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_assigned ON clients(assigned_to) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_portal ON clients(portal_access) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(client_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_clients_custom_fields ON clients USING GIN (custom_fields);

CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE PROCEDURE update_clients_updated_at();

COMMENT ON TABLE clients IS 'Client records for multi-tenant brand system';
COMMENT ON COLUMN clients.portal_access IS 'Whether client has access to the client portal';
COMMENT ON COLUMN clients.is_active IS 'Soft delete flag';

-- =============================================================================
-- MIGRATION 005: Create projects and project_updates tables
-- =============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_type VARCHAR(50) DEFAULT 'general',
  status VARCHAR(50) DEFAULT 'planning',
  priority VARCHAR(20) DEFAULT 'medium',
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  budget DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  estimated_hours INTEGER,
  actual_hours INTEGER,
  project_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_team JSONB DEFAULT '[]',
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  milestones JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_dates CHECK (
    (start_date IS NULL OR due_date IS NULL OR start_date <= due_date) AND
    (completed_date IS NULL OR start_date IS NULL OR completed_date >= start_date)
  )
);

CREATE TABLE IF NOT EXISTS project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  update_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  is_visible_to_client BOOLEAN DEFAULT TRUE,
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_brand_id ON projects(brand_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_project_manager ON projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON projects(due_date);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_team ON projects USING GIN(assigned_team);
CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_type ON project_updates(update_type);
CREATE INDEX IF NOT EXISTS idx_project_updates_created_by ON project_updates(created_by);
CREATE INDEX IF NOT EXISTS idx_project_updates_created_at ON project_updates(created_at);
CREATE INDEX IF NOT EXISTS idx_project_updates_visible ON project_updates(is_visible_to_client);

CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE PROCEDURE update_projects_updated_at();

CREATE OR REPLACE FUNCTION update_project_updates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_updates_updated_at
  BEFORE UPDATE ON project_updates
  FOR EACH ROW
  EXECUTE PROCEDURE update_project_updates_updated_at();

COMMENT ON TABLE projects IS 'Projects linked to clients with comprehensive tracking';
COMMENT ON TABLE project_updates IS 'Timeline of project activities and updates';

-- =============================================================================
-- MIGRATION 006: Create documents tables
-- =============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_extension VARCHAR(10) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT TRUE,
  parent_document_id UUID REFERENCES documents(id),
  visibility VARCHAR(50) NOT NULL DEFAULT 'private',
  is_client_visible BOOLEAN DEFAULT FALSE,
  password_protected BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(255),
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP,
  last_downloaded_by UUID REFERENCES users(id),
  tags JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  uploaded_by UUID NOT NULL REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_category CHECK (category IN ('contract', 'invoice', 'proposal', 'report', 'design', 'other', 'general')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'archived', 'deleted')),
  CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'client', 'team', 'public')),
  CONSTRAINT positive_file_size CHECK (file_size > 0),
  CONSTRAINT positive_version CHECK (version > 0)
);

CREATE TABLE IF NOT EXISTS document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_with_client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  permission VARCHAR(20) NOT NULL DEFAULT 'view',
  can_reshare BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,
  accessed_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  shared_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_permission CHECK (permission IN ('view', 'download', 'edit')),
  CONSTRAINT share_target CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_client_id IS NULL) OR
    (shared_with_user_id IS NULL AND shared_with_client_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  change_description TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT positive_version_number CHECK (version_number > 0),
  CONSTRAINT unique_document_version UNIQUE (document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_documents_brand_id ON documents(brand_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_is_active ON documents(is_active);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_is_latest_version ON documents(is_latest_version);
CREATE INDEX IF NOT EXISTS idx_documents_parent_document_id ON documents(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_shared_with_user_id ON document_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_shared_with_client_id ON document_shares(shared_with_client_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_expires_at ON document_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON document_versions(version_number);

CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_documents_timestamp
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE PROCEDURE update_documents_updated_at();

CREATE OR REPLACE FUNCTION update_document_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_shares_timestamp
  BEFORE UPDATE ON document_shares
  FOR EACH ROW
  EXECUTE PROCEDURE update_document_shares_updated_at();

CREATE OR REPLACE FUNCTION update_document_latest_version()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE documents
  SET is_latest_version = FALSE
  WHERE parent_document_id = NEW.parent_document_id
    AND id != NEW.id
    AND is_latest_version = TRUE;
  NEW.is_latest_version = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_latest_version
  BEFORE INSERT ON documents
  FOR EACH ROW
  WHEN (NEW.parent_document_id IS NOT NULL)
  EXECUTE PROCEDURE update_document_latest_version();

COMMENT ON TABLE documents IS 'Stores document metadata and file information';
COMMENT ON TABLE document_shares IS 'Manages document sharing and access permissions';
COMMENT ON TABLE document_versions IS 'Tracks document version history';

-- =============================================================================
-- MIGRATION 007: Create messaging tables
-- =============================================================================
CREATE TABLE IF NOT EXISTS message_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
    last_message_at TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    unread_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'client')),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    read_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_extension VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('sender', 'recipient', 'participant')),
    last_read_at TIMESTAMP,
    notification_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT participant_check CHECK (
        (user_id IS NOT NULL AND client_id IS NULL) OR
        (user_id IS NULL AND client_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_message_threads_brand_id ON message_threads(brand_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_project_id ON message_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_client_id ON message_threads(client_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_created_by ON message_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_message_threads_status ON message_threads(status);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON message_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_participants_thread_id ON message_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_message_participants_user_id ON message_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_message_participants_client_id ON message_participants(client_id);

CREATE OR REPLACE FUNCTION update_message_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_threads_updated_at
    BEFORE UPDATE ON message_threads
    FOR EACH ROW
    EXECUTE PROCEDURE update_message_threads_updated_at();

CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE PROCEDURE update_messages_updated_at();

CREATE OR REPLACE FUNCTION update_message_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_participants_updated_at
    BEFORE UPDATE ON message_participants
    FOR EACH ROW
    EXECUTE PROCEDURE update_message_participants_updated_at();

CREATE OR REPLACE FUNCTION update_thread_stats_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE message_threads
    SET last_message_at = NEW.created_at,
        message_count = message_count + 1,
        unread_count = unread_count + 1
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_stats_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE PROCEDURE update_thread_stats_on_message();

CREATE OR REPLACE FUNCTION update_thread_unread_on_read()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
        UPDATE message_threads
        SET unread_count = GREATEST(unread_count - 1, 0)
        WHERE id = NEW.thread_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_unread_on_read
    AFTER UPDATE ON messages
    FOR EACH ROW
    WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read)
    EXECUTE PROCEDURE update_thread_unread_on_read();

COMMENT ON TABLE message_threads IS 'Conversation threads between agencies and clients';
COMMENT ON TABLE messages IS 'Individual messages within threads';
COMMENT ON TABLE message_attachments IS 'File attachments for messages';
COMMENT ON TABLE message_participants IS 'Participants in message threads';

-- =============================================================================
-- MIGRATION 008: Create invoices, invoice_items, and payments tables
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(12, 2) DEFAULT 0.00,
    amount_due DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    notes TEXT,
    terms TEXT,
    footer TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(12, 2) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    transaction_id VARCHAR(255),
    payment_date TIMESTAMP,
    notes TEXT,
    receipt_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_brand_id ON invoices(brand_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_brand_status ON invoices(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_status ON invoices(client_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_sort_order ON invoice_items(invoice_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_brand_id ON payments(brand_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

CREATE OR REPLACE FUNCTION update_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_timestamp
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE PROCEDURE update_invoice_timestamp();

CREATE OR REPLACE FUNCTION update_invoice_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_item_timestamp
    BEFORE UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE PROCEDURE update_invoice_item_timestamp();

CREATE OR REPLACE FUNCTION update_payment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_timestamp
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE PROCEDURE update_payment_timestamp();

CREATE OR REPLACE FUNCTION calculate_invoice_item_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.amount = NEW.quantity * NEW.unit_price;
    IF NEW.tax_rate IS NOT NULL AND NEW.tax_rate > 0 THEN
        NEW.tax_amount = NEW.amount * (NEW.tax_rate / 100);
    ELSE
        NEW.tax_amount = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_invoice_item_amount
    BEFORE INSERT OR UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE PROCEDURE calculate_invoice_item_amount();

CREATE OR REPLACE FUNCTION recalculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(12, 2);
    v_tax_amount DECIMAL(12, 2);
    v_invoice_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_invoice_id = OLD.invoice_id;
    ELSE
        v_invoice_id = NEW.invoice_id;
    END IF;
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(tax_amount), 0)
    INTO v_subtotal, v_tax_amount
    FROM invoice_items
    WHERE invoice_id = v_invoice_id;
    UPDATE invoices
    SET
        subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        total_amount = v_subtotal + v_tax_amount - COALESCE(discount_amount, 0),
        amount_due = v_subtotal + v_tax_amount - COALESCE(discount_amount, 0) - COALESCE(amount_paid, 0)
    WHERE id = v_invoice_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_invoice_totals_insert
    AFTER INSERT ON invoice_items
    FOR EACH ROW
    EXECUTE PROCEDURE recalculate_invoice_totals();

CREATE TRIGGER trigger_recalculate_invoice_totals_update
    AFTER UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE PROCEDURE recalculate_invoice_totals();

CREATE TRIGGER trigger_recalculate_invoice_totals_delete
    AFTER DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE PROCEDURE recalculate_invoice_totals();

CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(12, 2);
    v_invoice_total DECIMAL(12, 2);
    v_new_status VARCHAR(20);
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM payments
    WHERE invoice_id = NEW.invoice_id
    AND payment_status = 'completed';
    SELECT total_amount
    INTO v_invoice_total
    FROM invoices
    WHERE id = NEW.invoice_id;
    IF v_total_paid >= v_invoice_total THEN
        v_new_status = 'paid';
    ELSIF v_total_paid > 0 THEN
        v_new_status = 'partial';
    ELSE
        v_new_status = 'sent';
    END IF;
    UPDATE invoices
    SET
        amount_paid = v_total_paid,
        amount_due = v_invoice_total - v_total_paid,
        status = v_new_status,
        paid_date = CASE WHEN v_new_status = 'paid' THEN CURRENT_DATE ELSE NULL END
    WHERE id = NEW.invoice_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_payment_status
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    WHEN (NEW.payment_status = 'completed')
    EXECUTE PROCEDURE update_invoice_payment_status();

CREATE OR REPLACE FUNCTION check_invoice_overdue()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.due_date < CURRENT_DATE
       AND NEW.status IN ('sent', 'partial')
       AND NEW.amount_due > 0 THEN
        NEW.status = 'overdue';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_invoice_overdue
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE PROCEDURE check_invoice_overdue();

COMMENT ON TABLE invoices IS 'Stores invoice information for client billing';
COMMENT ON TABLE invoice_items IS 'Stores line items for each invoice';
COMMENT ON TABLE payments IS 'Stores payment records for invoices';

-- =============================================================================
-- MIGRATION 009: Create subscriptions tables
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_interval VARCHAR(20) NOT NULL CHECK (billing_interval IN ('month', 'year')),
    features JSONB DEFAULT '{}',
    stripe_price_id VARCHAR(255),
    stripe_product_id VARCHAR(255),
    max_clients INTEGER,
    max_projects INTEGER,
    max_storage_gb INTEGER,
    max_team_members INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid')),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,
    ended_at TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id)
);

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    bank_name VARCHAR(255),
    bank_last4 VARCHAR(4),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    stripe_invoice_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL CHECK (status IN ('paid', 'open', 'void', 'uncollectible', 'draft')),
    invoice_pdf VARCHAR(500),
    hosted_invoice_url VARCHAR(500),
    billing_reason VARCHAR(100),
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_price ON subscription_plans(price);
CREATE INDEX IF NOT EXISTS idx_subscriptions_brand_id ON subscriptions(brand_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_payment_methods_brand_id ON payment_methods(brand_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id ON payment_methods(stripe_payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(brand_id, is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_billing_history_brand_id ON billing_history(brand_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_id ON billing_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_stripe_invoice_id ON billing_history(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_created_at ON billing_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_brand_id ON usage_tracking(brand_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_subscription_id ON usage_tracking(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_metric ON usage_tracking(metric_name);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start, period_end);

CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE PROCEDURE update_subscription_plans_updated_at();

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE PROCEDURE update_subscriptions_updated_at();

CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE PROCEDURE update_payment_methods_updated_at();

CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE payment_methods
        SET is_default = FALSE
        WHERE brand_id = NEW.brand_id
        AND id != NEW.id
        AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_payment_method
    BEFORE INSERT OR UPDATE ON payment_methods
    FOR EACH ROW
    WHEN (NEW.is_default = TRUE)
    EXECUTE PROCEDURE ensure_single_default_payment_method();

-- Seed subscription plans
INSERT INTO subscription_plans (name, slug, description, price, billing_interval, features, max_clients, max_projects, max_storage_gb, max_team_members, sort_order)
SELECT * FROM (VALUES
  ('Basic', 'basic-monthly', 'Perfect for small agencies just getting started', 29.00::DECIMAL, 'month', '{"client_portal":true,"custom_branding":false,"priority_support":false,"api_access":false,"white_label":false}'::JSONB, 5, 10, 10, 3, 1),
  ('Basic Annual', 'basic-yearly', 'Perfect for small agencies just getting started (Annual billing)', 290.00::DECIMAL, 'year', '{"client_portal":true,"custom_branding":false,"priority_support":false,"api_access":false,"white_label":false}'::JSONB, 5, 10, 10, 3, 2),
  ('Pro', 'pro-monthly', 'For growing agencies with more clients', 79.00::DECIMAL, 'month', '{"client_portal":true,"custom_branding":true,"priority_support":true,"api_access":true,"white_label":false}'::JSONB, 25, 50, 50, 10, 3),
  ('Pro Annual', 'pro-yearly', 'For growing agencies with more clients (Annual billing)', 790.00::DECIMAL, 'year', '{"client_portal":true,"custom_branding":true,"priority_support":true,"api_access":true,"white_label":false}'::JSONB, 25, 50, 50, 10, 4),
  ('Enterprise', 'enterprise-monthly', 'For established agencies needing unlimited access', 199.00::DECIMAL, 'month', '{"client_portal":true,"custom_branding":true,"priority_support":true,"api_access":true,"white_label":true}'::JSONB, NULL, NULL, NULL, NULL, 5),
  ('Enterprise Annual', 'enterprise-yearly', 'For established agencies needing unlimited access (Annual billing)', 1990.00::DECIMAL, 'year', '{"client_portal":true,"custom_branding":true,"priority_support":true,"api_access":true,"white_label":true}'::JSONB, NULL, NULL, NULL, NULL, 6)
) AS v(name, slug, description, price, billing_interval, features, max_clients, max_projects, max_storage_gb, max_team_members, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE slug = v.slug);

COMMENT ON TABLE subscription_plans IS 'Available subscription plans with pricing and features';
COMMENT ON TABLE subscriptions IS 'Active subscriptions linked to brands and Stripe';
COMMENT ON TABLE payment_methods IS 'Stored payment methods for recurring billing';
COMMENT ON TABLE billing_history IS 'Historical record of all billing transactions';
COMMENT ON TABLE usage_tracking IS 'Track usage metrics for billing and limits';

-- =============================================================================
-- MIGRATION 010: Create audit_logs table
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_brand_id ON audit_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_brand_action ON audit_logs(brand_id, action);

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE audit_logs IS 'Stores all user actions for audit trail and compliance';

-- =============================================================================
-- MIGRATION 012: Add recurring invoice columns
-- =============================================================================
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(20) DEFAULT 'none'
    CHECK (recurrence_type IN ('none','weekly','monthly','quarterly','yearly')),
  ADD COLUMN IF NOT EXISTS recurrence_day  SMALLINT,
  ADD COLUMN IF NOT EXISTS next_invoice_date DATE,
  ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES invoices(id);

-- =============================================================================
-- MIGRATION 013: Add e-signature columns to invoices
-- =============================================================================
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS client_signature TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by_name VARCHAR(255);

-- =============================================================================
-- MIGRATION 014: Add Stripe Connect columns to brands
-- =============================================================================
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS stripe_account_id         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_connect_status     VARCHAR(30)
      DEFAULT 'not_connected'
      CHECK (stripe_connect_status IN (
          'not_connected','onboarding_started','pending_verification',
          'active','restricted','disabled'
      )),
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_connect_created_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_brands_stripe_account_id
    ON brands(stripe_account_id)
    WHERE stripe_account_id IS NOT NULL;

-- =============================================================================
-- MIGRATION 015: Add overdue reminder, public token, and custom domain support
-- =============================================================================
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMP,
  ADD COLUMN IF NOT EXISTS public_token       VARCHAR(64) UNIQUE;

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_invoices_public_token
    ON invoices(public_token)
    WHERE public_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_brands_custom_domain
    ON brands(custom_domain)
    WHERE custom_domain IS NOT NULL;

-- =============================================================================
-- MIGRATION 016: Create proposals and proposal_items tables
-- =============================================================================
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

-- =============================================================================
-- MIGRATION 017: Add TOTP two-factor authentication to users
-- =============================================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS totp_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS totp_backup_codes JSONB;

-- =============================================================================
-- MIGRATION 018: Create time_entries table
-- =============================================================================
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

-- =============================================================================
-- VERIFY: List all created tables
-- =============================================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  RAISE NOTICE '=== ClientHub tables created ===';
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    RAISE NOTICE '  %', tbl;
  END LOOP;
  RAISE NOTICE '================================';
END $$;
