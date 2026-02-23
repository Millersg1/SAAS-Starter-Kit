-- Migration: Create projects table
-- Description: Projects linked to clients with status tracking, milestones, and updates
-- Phase: 6 - Project Management

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_type VARCHAR(50) DEFAULT 'general', -- general, website, app, marketing, consulting, design, other
  
  -- Status & Timeline
  status VARCHAR(50) DEFAULT 'planning', -- planning, in_progress, on_hold, completed, cancelled
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  
  -- Budget & Resources
  budget DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  estimated_hours INTEGER,
  actual_hours INTEGER,
  
  -- Team Assignment
  project_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_team JSONB DEFAULT '[]', -- Array of user IDs
  
  -- Progress Tracking
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  milestones JSONB DEFAULT '[]', -- Array of milestone objects
  
  -- Additional Data
  tags JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]', -- Array of file metadata
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (
    (start_date IS NULL OR due_date IS NULL OR start_date <= due_date) AND
    (completed_date IS NULL OR start_date IS NULL OR completed_date >= start_date)
  )
);

-- Create project_updates table for timeline/activity feed
CREATE TABLE IF NOT EXISTS project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Update Information
  update_type VARCHAR(50) NOT NULL, -- status_change, milestone, comment, file_upload, team_change, other
  title VARCHAR(255) NOT NULL,
  content TEXT,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  is_visible_to_client BOOLEAN DEFAULT TRUE,
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}', -- For storing type-specific data
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for projects table
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

-- Indexes for project_updates table
CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_type ON project_updates(update_type);
CREATE INDEX IF NOT EXISTS idx_project_updates_created_by ON project_updates(created_by);
CREATE INDEX IF NOT EXISTS idx_project_updates_created_at ON project_updates(created_at);
CREATE INDEX IF NOT EXISTS idx_project_updates_visible ON project_updates(is_visible_to_client);

-- Trigger to update updated_at timestamp for projects
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
  EXECUTE FUNCTION update_projects_updated_at();

-- Trigger to update updated_at timestamp for project_updates
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
  EXECUTE FUNCTION update_project_updates_updated_at();

-- Comments
COMMENT ON TABLE projects IS 'Projects linked to clients with comprehensive tracking';
COMMENT ON TABLE project_updates IS 'Timeline of project activities and updates';
COMMENT ON COLUMN projects.project_type IS 'Type of project: general, website, app, marketing, consulting, design, other';
COMMENT ON COLUMN projects.status IS 'Project status: planning, in_progress, on_hold, completed, cancelled';
COMMENT ON COLUMN projects.priority IS 'Project priority: low, medium, high, urgent';
COMMENT ON COLUMN projects.assigned_team IS 'JSONB array of user IDs assigned to project';
COMMENT ON COLUMN projects.milestones IS 'JSONB array of milestone objects with dates and completion status';
COMMENT ON COLUMN project_updates.update_type IS 'Type of update: status_change, milestone, comment, file_upload, team_change, other';
COMMENT ON COLUMN project_updates.is_visible_to_client IS 'Whether this update is visible in client portal';
