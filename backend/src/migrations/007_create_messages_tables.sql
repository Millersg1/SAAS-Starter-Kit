-- Migration 007: Create Messages Tables
-- Phase 8: Messaging System
-- Description: Agency-client communication with thread management

-- ============================================
-- 1. MESSAGE THREADS TABLE
-- ============================================
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

-- ============================================
-- 2. MESSAGES TABLE
-- ============================================
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

-- ============================================
-- 3. MESSAGE ATTACHMENTS TABLE
-- ============================================
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

-- ============================================
-- 4. MESSAGE PARTICIPANTS TABLE
-- ============================================
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

-- ============================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================

-- Message Threads Indexes
CREATE INDEX IF NOT EXISTS idx_message_threads_brand_id ON message_threads(brand_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_project_id ON message_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_client_id ON message_threads(client_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_created_by ON message_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_message_threads_status ON message_threads(status);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON message_threads(last_message_at DESC);

-- Messages Indexes
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(to_tsvector('english', content));

-- Message Attachments Indexes
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);

-- Message Participants Indexes
CREATE INDEX IF NOT EXISTS idx_message_participants_thread_id ON message_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_message_participants_user_id ON message_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_message_participants_client_id ON message_participants(client_id);

-- ============================================
-- 6. TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================

-- Update message_threads updated_at
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
    EXECUTE FUNCTION update_message_threads_updated_at();

-- Update messages updated_at
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
    EXECUTE FUNCTION update_messages_updated_at();

-- Update message_participants updated_at
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
    EXECUTE FUNCTION update_message_participants_updated_at();

-- ============================================
-- 7. TRIGGER TO UPDATE THREAD STATS
-- ============================================

-- Update thread stats when message is created
CREATE OR REPLACE FUNCTION update_thread_stats_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update thread's last_message_at and message_count
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
    EXECUTE FUNCTION update_thread_stats_on_message();

-- Update thread stats when message is marked as read
CREATE OR REPLACE FUNCTION update_thread_unread_on_read()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease unread count when message is marked as read
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
    EXECUTE FUNCTION update_thread_unread_on_read();

-- ============================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE message_threads IS 'Conversation threads between agencies and clients';
COMMENT ON TABLE messages IS 'Individual messages within threads';
COMMENT ON TABLE message_attachments IS 'File attachments for messages';
COMMENT ON TABLE message_participants IS 'Participants in message threads';

COMMENT ON COLUMN message_threads.status IS 'Thread status: active, archived, or closed';
COMMENT ON COLUMN messages.sender_type IS 'Type of sender: user (agency) or client';
COMMENT ON COLUMN messages.is_read IS 'Whether the message has been read';
COMMENT ON COLUMN message_participants.role IS 'Participant role: sender, recipient, or participant';

-- ============================================
-- Migration Complete
-- ============================================

-- Verify tables were created
DO $$
BEGIN
    RAISE NOTICE 'Migration 007 completed successfully';
    RAISE NOTICE 'Created tables: message_threads, messages, message_attachments, message_participants';
    RAISE NOTICE 'Created 15 indexes for query optimization';
    RAISE NOTICE 'Created 5 triggers for automatic updates';
END $$;
