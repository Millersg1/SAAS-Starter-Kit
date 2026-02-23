-- Migration: 003_create_brands_tables.sql
-- Description: Create brands and brand_members tables for multi-tenant support
-- Date: 2026-02-16

-- Create brands table
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

-- Create brand_members table (junction table for users and brands)
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_brands_owner_id ON brands(owner_id);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active);
CREATE INDEX IF NOT EXISTS idx_brand_members_brand_id ON brand_members(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_members_user_id ON brand_members(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_members_role ON brand_members(role);
CREATE INDEX IF NOT EXISTS idx_brand_members_is_active ON brand_members(is_active);

-- Create trigger to update updated_at timestamp for brands
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
    EXECUTE FUNCTION update_brands_updated_at();

-- Create trigger to update updated_at timestamp for brand_members
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
    EXECUTE FUNCTION update_brand_members_updated_at();

-- Add comment to tables
COMMENT ON TABLE brands IS 'Stores brand/agency information for multi-tenant support';
COMMENT ON TABLE brand_members IS 'Junction table linking users to brands with roles and permissions';

-- Add comments to important columns
COMMENT ON COLUMN brands.slug IS 'URL-friendly unique identifier for the brand';
COMMENT ON COLUMN brands.settings IS 'Brand-specific settings (email templates, notifications, etc.)';
COMMENT ON COLUMN brand_members.role IS 'User role within the brand: owner, admin, member, viewer';
COMMENT ON COLUMN brand_members.permissions IS 'Granular permissions for the user within the brand';
