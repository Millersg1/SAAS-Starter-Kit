import { query, getClient } from '../config/database.js';

// ============================================
// MESSAGE THREADS
// ============================================

/**
 * Create a new message thread
 */
export const createThread = async (threadData) => {
  const {
    brand_id,
    project_id,
    client_id,
    subject,
    created_by
  } = threadData;

  const result = await query(
    `INSERT INTO message_threads (
      brand_id, project_id, client_id, subject, created_by
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING id, brand_id, project_id, client_id, subject, status,
              last_message_at, message_count, unread_count,
              created_by, created_at, updated_at`,
    [brand_id, project_id, client_id, subject, created_by]
  );

  return result.rows[0];
};

/**
 * Get all threads for a brand with filters
 */
export const getBrandThreads = async (brandId, filters = {}) => {
  const {
    project_id,
    client_id,
    status,
    search,
    limit = 50,
    offset = 0
  } = filters;

  let queryText = `
    SELECT t.id, t.brand_id, t.project_id, t.client_id, t.subject, t.status,
           t.last_message_at, t.message_count, t.unread_count,
           t.created_by, t.created_at, t.updated_at,
           p.name as project_name,
           c.name as client_name, c.email as client_email,
           u.name as created_by_name, u.email as created_by_email
    FROM message_threads t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN clients c ON t.client_id = c.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.brand_id = $1
  `;

  const params = [brandId];
  let paramCount = 1;

  if (project_id) {
    paramCount++;
    queryText += ` AND t.project_id = $${paramCount}`;
    params.push(project_id);
  }

  if (client_id) {
    paramCount++;
    queryText += ` AND t.client_id = $${paramCount}`;
    params.push(client_id);
  }

  if (status) {
    paramCount++;
    queryText += ` AND t.status = $${paramCount}`;
    params.push(status);
  }

  if (search) {
    paramCount++;
    queryText += ` AND t.subject ILIKE $${paramCount}`;
    params.push(`%${search}%`);
  }

  queryText += ` ORDER BY t.last_message_at DESC NULLS LAST, t.created_at DESC`;
  
  paramCount++;
  queryText += ` LIMIT $${paramCount}`;
  params.push(limit);
  
  paramCount++;
  queryText += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await query(queryText, params);
  return result.rows;
};

/**
 * Get single thread by ID
 */
export const getThreadById = async (threadId) => {
  const result = await query(
    `SELECT t.id, t.brand_id, t.project_id, t.client_id, t.subject, t.status,
            t.last_message_at, t.message_count, t.unread_count,
            t.created_by, t.created_at, t.updated_at,
            p.name as project_name,
            c.name as client_name, c.email as client_email,
            u.name as created_by_name, u.email as created_by_email
     FROM message_threads t
     LEFT JOIN projects p ON t.project_id = p.id
     LEFT JOIN clients c ON t.client_id = c.id
     LEFT JOIN users u ON t.created_by = u.id
     WHERE t.id = $1`,
    [threadId]
  );

  return result.rows[0];
};

/**
 * Update thread
 */
export const updateThread = async (threadId, updates) => {
  const { subject, status } = updates;
  
  const result = await query(
    `UPDATE message_threads
     SET subject = COALESCE($2, subject),
         status = COALESCE($3, status)
     WHERE id = $1
     RETURNING id, brand_id, project_id, client_id, subject, status,
               last_message_at, message_count, unread_count,
               created_by, created_at, updated_at`,
    [threadId, subject, status]
  );

  return result.rows[0];
};

/**
 * Archive thread
 */
export const archiveThread = async (threadId) => {
  const result = await query(
    `UPDATE message_threads
     SET status = 'archived'
     WHERE id = $1
     RETURNING id`,
    [threadId]
  );

  return result.rows[0];
};

// ============================================
// MESSAGES
// ============================================

/**
 * Create a new message
 */
export const createMessage = async (messageData) => {
  const {
    thread_id,
    sender_id,
    sender_type,
    content
  } = messageData;

  const result = await query(
    `INSERT INTO messages (
      thread_id, sender_id, sender_type, content
    ) VALUES ($1, $2, $3, $4)
    RETURNING id, thread_id, sender_id, sender_type, content,
              is_read, read_at, read_by, is_deleted,
              created_at, updated_at`,
    [thread_id, sender_id, sender_type, content]
  );

  return result.rows[0];
};

/**
 * Get messages for a thread
 */
export const getThreadMessages = async (threadId, filters = {}) => {
  const { limit = 50, offset = 0 } = filters;

  const result = await query(
    `SELECT m.id, m.thread_id, m.sender_id, m.sender_type, m.content,
            m.is_read, m.read_at, m.read_by, m.is_deleted,
            m.created_at, m.updated_at,
            CASE 
              WHEN m.sender_type = 'user' THEN u.name
              WHEN m.sender_type = 'client' THEN c.name
            END as sender_name,
            CASE 
              WHEN m.sender_type = 'user' THEN u.email
              WHEN m.sender_type = 'client' THEN c.email
            END as sender_email,
            reader.name as read_by_name
     FROM messages m
     LEFT JOIN users u ON m.sender_type = 'user' AND m.sender_id = u.id
     LEFT JOIN clients c ON m.sender_type = 'client' AND m.sender_id = c.id
     LEFT JOIN users reader ON m.read_by = reader.id
     WHERE m.thread_id = $1 AND m.is_deleted = FALSE
     ORDER BY m.created_at ASC
     LIMIT $2 OFFSET $3`,
    [threadId, limit, offset]
  );

  return result.rows;
};

/**
 * Get single message by ID
 */
export const getMessageById = async (messageId) => {
  const result = await query(
    `SELECT m.id, m.thread_id, m.sender_id, m.sender_type, m.content,
            m.is_read, m.read_at, m.read_by, m.is_deleted,
            m.created_at, m.updated_at,
            CASE 
              WHEN m.sender_type = 'user' THEN u.name
              WHEN m.sender_type = 'client' THEN c.name
            END as sender_name,
            CASE 
              WHEN m.sender_type = 'user' THEN u.email
              WHEN m.sender_type = 'client' THEN c.email
            END as sender_email,
            reader.name as read_by_name
     FROM messages m
     LEFT JOIN users u ON m.sender_type = 'user' AND m.sender_id = u.id
     LEFT JOIN clients c ON m.sender_type = 'client' AND m.sender_id = c.id
     LEFT JOIN users reader ON m.read_by = reader.id
     WHERE m.id = $1 AND m.is_deleted = FALSE`,
    [messageId]
  );

  return result.rows[0];
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (messageId, userId) => {
  const result = await query(
    `UPDATE messages
     SET is_read = TRUE,
         read_at = CURRENT_TIMESTAMP,
         read_by = $2
     WHERE id = $1 AND is_read = FALSE
     RETURNING id, is_read, read_at, read_by`,
    [messageId, userId]
  );

  return result.rows[0];
};

/**
 * Mark all thread messages as read
 */
export const markThreadMessagesAsRead = async (threadId, userId) => {
  const result = await query(
    `UPDATE messages
     SET is_read = TRUE,
         read_at = CURRENT_TIMESTAMP,
         read_by = $2
     WHERE thread_id = $1 AND is_read = FALSE
     RETURNING id`,
    [threadId, userId]
  );

  return result.rows;
};

/**
 * Delete message (soft delete)
 */
export const deleteMessage = async (messageId) => {
  const result = await query(
    `UPDATE messages
     SET is_deleted = TRUE,
         deleted_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id`,
    [messageId]
  );

  return result.rows[0];
};

/**
 * Search messages
 */
export const searchMessages = async (brandId, searchTerm, filters = {}) => {
  const { limit = 50, offset = 0 } = filters;

  const result = await query(
    `SELECT m.id, m.thread_id, m.sender_id, m.sender_type, m.content,
            m.is_read, m.created_at,
            t.subject as thread_subject,
            CASE 
              WHEN m.sender_type = 'user' THEN u.name
              WHEN m.sender_type = 'client' THEN c.name
            END as sender_name
     FROM messages m
     JOIN message_threads t ON m.thread_id = t.id
     LEFT JOIN users u ON m.sender_type = 'user' AND m.sender_id = u.id
     LEFT JOIN clients c ON m.sender_type = 'client' AND m.sender_id = c.id
     WHERE t.brand_id = $1 
       AND m.is_deleted = FALSE
       AND (
         m.content ILIKE $2 OR
         t.subject ILIKE $2
       )
     ORDER BY m.created_at DESC
     LIMIT $3 OFFSET $4`,
    [brandId, `%${searchTerm}%`, limit, offset]
  );

  return result.rows;
};

/**
 * Get unread message count for user
 */
export const getUnreadCount = async (brandId, userId) => {
  const result = await query(
    `SELECT COUNT(*) as unread_count
     FROM messages m
     JOIN message_threads t ON m.thread_id = t.id
     WHERE t.brand_id = $1 
       AND m.is_read = FALSE
       AND m.is_deleted = FALSE
       AND m.sender_id != $2`,
    [brandId, userId]
  );

  return parseInt(result.rows[0].unread_count);
};

// ============================================
// MESSAGE ATTACHMENTS
// ============================================

/**
 * Create message attachment
 */
export const createAttachment = async (attachmentData) => {
  const {
    message_id,
    file_name,
    file_path,
    file_size,
    file_type,
    file_extension
  } = attachmentData;

  const result = await query(
    `INSERT INTO message_attachments (
      message_id, file_name, file_path, file_size, file_type, file_extension
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, message_id, file_name, file_path, file_size,
              file_type, file_extension, created_at`,
    [message_id, file_name, file_path, file_size, file_type, file_extension]
  );

  return result.rows[0];
};

/**
 * Get attachments for a message
 */
export const getMessageAttachments = async (messageId) => {
  const result = await query(
    `SELECT id, message_id, file_name, file_path, file_size,
            file_type, file_extension, created_at
     FROM message_attachments
     WHERE message_id = $1
     ORDER BY created_at ASC`,
    [messageId]
  );

  return result.rows;
};

// ============================================
// MESSAGE PARTICIPANTS
// ============================================

/**
 * Add participant to thread
 */
export const addParticipant = async (participantData) => {
  const {
    thread_id,
    user_id,
    client_id,
    role
  } = participantData;

  const result = await query(
    `INSERT INTO message_participants (
      thread_id, user_id, client_id, role
    ) VALUES ($1, $2, $3, $4)
    RETURNING id, thread_id, user_id, client_id, role,
              last_read_at, notification_enabled, created_at, updated_at`,
    [thread_id, user_id, client_id, role]
  );

  return result.rows[0];
};

/**
 * Get thread participants
 */
export const getThreadParticipants = async (threadId) => {
  const result = await query(
    `SELECT p.id, p.thread_id, p.user_id, p.client_id, p.role,
            p.last_read_at, p.notification_enabled,
            p.created_at, p.updated_at,
            u.name as user_name, u.email as user_email,
            c.name as client_name, c.email as client_email
     FROM message_participants p
     LEFT JOIN users u ON p.user_id = u.id
     LEFT JOIN clients c ON p.client_id = c.id
     WHERE p.thread_id = $1
     ORDER BY p.created_at ASC`,
    [threadId]
  );

  return result.rows;
};

/**
 * Update participant last read time
 */
export const updateParticipantLastRead = async (threadId, userId) => {
  const result = await query(
    `UPDATE message_participants
     SET last_read_at = CURRENT_TIMESTAMP
     WHERE thread_id = $1 AND user_id = $2
     RETURNING id, last_read_at`,
    [threadId, userId]
  );

  return result.rows[0];
};

/**
 * Remove participant from thread
 */
export const removeParticipant = async (participantId) => {
  const result = await query(
    `DELETE FROM message_participants
     WHERE id = $1
     RETURNING id`,
    [participantId]
  );

  return result.rows[0];
};
