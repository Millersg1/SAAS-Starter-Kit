-- Add profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create index on is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create index on deleted_at
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- Add comment to preferences column
COMMENT ON COLUMN users.preferences IS 'User preferences stored as JSON (theme, notifications, language, etc.)';
