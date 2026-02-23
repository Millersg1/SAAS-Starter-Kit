-- Migration 006: Create Documents Table
-- Phase 7: Document Management
-- Description: Document storage and sharing system with version control

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Document information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL, -- in bytes
  file_type VARCHAR(100) NOT NULL, -- MIME type
  file_extension VARCHAR(10) NOT NULL,
  
  -- Document metadata
  category VARCHAR(50) NOT NULL DEFAULT 'general', -- contract, invoice, proposal, report, design, other, general
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, archived, deleted
  version INTEGER NOT NULL DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT TRUE,
  parent_document_id UUID REFERENCES documents(id), -- for version control
  
  -- Access control
  visibility VARCHAR(50) NOT NULL DEFAULT 'private', -- private, client, team, public
  is_client_visible BOOLEAN DEFAULT FALSE,
  password_protected BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(255),
  
  -- Download tracking
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP,
  last_downloaded_by UUID REFERENCES users(id),
  
  -- Additional metadata
  tags JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  
  -- Audit fields
  uploaded_by UUID NOT NULL REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_category CHECK (category IN ('contract', 'invoice', 'proposal', 'report', 'design', 'other', 'general')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'archived', 'deleted')),
  CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'client', 'team', 'public')),
  CONSTRAINT positive_file_size CHECK (file_size > 0),
  CONSTRAINT positive_version CHECK (version > 0)
);

-- Create document_shares table for granular access control
CREATE TABLE IF NOT EXISTS document_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_with_client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Share settings
  permission VARCHAR(20) NOT NULL DEFAULT 'view', -- view, download, edit
  can_reshare BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,
  
  -- Access tracking
  accessed_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  
  -- Audit fields
  shared_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_permission CHECK (permission IN ('view', 'download', 'edit')),
  CONSTRAINT share_target CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_client_id IS NULL) OR
    (shared_with_user_id IS NULL AND shared_with_client_id IS NOT NULL)
  )
);

-- Create document_versions table for version history
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  -- Version file information
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  
  -- Version metadata
  change_description TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT positive_version_number CHECK (version_number > 0),
  CONSTRAINT unique_document_version UNIQUE (document_id, version_number)
);

-- Create indexes for performance
CREATE INDEX idx_documents_brand_id ON documents(brand_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_client_id ON documents(client_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_visibility ON documents(visibility);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_is_active ON documents(is_active);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_is_latest_version ON documents(is_latest_version);
CREATE INDEX idx_documents_parent_document_id ON documents(parent_document_id);

CREATE INDEX idx_document_shares_document_id ON document_shares(document_id);
CREATE INDEX idx_document_shares_shared_with_user_id ON document_shares(shared_with_user_id);
CREATE INDEX idx_document_shares_shared_with_client_id ON document_shares(shared_with_client_id);
CREATE INDEX idx_document_shares_expires_at ON document_shares(expires_at);

CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_version_number ON document_versions(version_number);

-- Create trigger for updated_at timestamp on documents
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
  EXECUTE FUNCTION update_documents_updated_at();

-- Create trigger for updated_at timestamp on document_shares
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
  EXECUTE FUNCTION update_document_shares_updated_at();

-- Create trigger to update parent document's is_latest_version when new version is created
CREATE OR REPLACE FUNCTION update_document_latest_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all previous versions as not latest
  UPDATE documents
  SET is_latest_version = FALSE
  WHERE parent_document_id = NEW.parent_document_id
    AND id != NEW.id
    AND is_latest_version = TRUE;
  
  -- Mark the new document as latest
  NEW.is_latest_version = TRUE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_latest_version
  BEFORE INSERT ON documents
  FOR EACH ROW
  WHEN (NEW.parent_document_id IS NOT NULL)
  EXECUTE FUNCTION update_document_latest_version();

-- Add comments for documentation
COMMENT ON TABLE documents IS 'Stores document metadata and file information';
COMMENT ON TABLE document_shares IS 'Manages document sharing and access permissions';
COMMENT ON TABLE document_versions IS 'Tracks document version history';

COMMENT ON COLUMN documents.visibility IS 'Document visibility: private (brand only), client (specific client), team (brand team), public (anyone with link)';
COMMENT ON COLUMN documents.is_latest_version IS 'Indicates if this is the latest version of the document';
COMMENT ON COLUMN documents.parent_document_id IS 'References the original document for version tracking';
COMMENT ON COLUMN document_shares.permission IS 'Access permission level: view, download, or edit';
COMMENT ON COLUMN document_shares.can_reshare IS 'Whether the recipient can share the document with others';
