-- Migration 004: Create Clients Table
-- Description: Client management for multi-tenant brand system
-- Date: 2026-02-16

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    
    -- Contact Details
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Portal Access
    portal_access BOOLEAN DEFAULT false,
    portal_password_hash VARCHAR(255),
    last_portal_login TIMESTAMP,
    
    -- Status & Classification
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'archived')),
    client_type VARCHAR(50) DEFAULT 'regular' CHECK (client_type IN ('regular', 'vip', 'enterprise', 'trial')),
    
    -- Business Information
    industry VARCHAR(100),
    website VARCHAR(500),
    tax_id VARCHAR(100),
    
    -- Relationship Management
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_brand ON clients(brand_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_assigned ON clients(assigned_to) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_portal ON clients(portal_access) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(client_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);

-- Create GIN index for JSONB fields for efficient querying
CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_clients_custom_fields ON clients USING GIN (custom_fields);

-- Create trigger to automatically update updated_at timestamp
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
    EXECUTE FUNCTION update_clients_updated_at();

-- Add comments for documentation
COMMENT ON TABLE clients IS 'Client records for multi-tenant brand system';
COMMENT ON COLUMN clients.brand_id IS 'Reference to the brand this client belongs to';
COMMENT ON COLUMN clients.portal_access IS 'Whether client has access to the client portal';
COMMENT ON COLUMN clients.status IS 'Current status: active, inactive, pending, archived';
COMMENT ON COLUMN clients.client_type IS 'Client classification: regular, vip, enterprise, trial';
COMMENT ON COLUMN clients.assigned_to IS 'User responsible for this client';
COMMENT ON COLUMN clients.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN clients.custom_fields IS 'Flexible JSON storage for brand-specific fields';
COMMENT ON COLUMN clients.created_by IS 'User who created this client record';
COMMENT ON COLUMN clients.is_active IS 'Soft delete flag';
