import { query } from '../config/database.js';

/**
 * Create an audit log entry
 * @param {Object} data - Audit log data
 * @returns {Object} Created audit log
 */
export const createAuditLog = async ({
  userId,
  brandId,
  action,
  entityType,
  entityId,
  description,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null
}) => {
  const result = await query(
    `INSERT INTO audit_logs 
     (user_id, brand_id, action, entity_type, entity_id, description, old_values, new_values, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [userId, brandId, action, entityType, entityId, description, oldValues, newValues, ipAddress, userAgent]
  );
  
  return result.rows[0];
};

/**
 * Get audit logs for a brand
 * @param {string} brandId - Brand ID
 * @param {Object} options - Query options
 * @returns {Array} Array of audit logs
 */
export const getBrandAuditLogs = async (brandId, {
  action = null,
  entityType = null,
  userId = null,
  startDate = null,
  endDate = null,
  limit = 50,
  offset = 0
} = {}) => {
  let queryText = `
    SELECT al.*, u.name as user_name, u.email as user_email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.brand_id = $1
  `;
  const params = [brandId];
  let paramIndex = 2;

  if (action) {
    queryText += ` AND al.action = $${paramIndex}`;
    params.push(action);
    paramIndex++;
  }

  if (entityType) {
    queryText += ` AND al.entity_type = $${paramIndex}`;
    params.push(entityType);
    paramIndex++;
  }

  if (userId) {
    queryText += ` AND al.user_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  if (startDate) {
    queryText += ` AND al.created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    queryText += ` AND al.created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  queryText += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(queryText, params);
  return result.rows;
};

/**
 * Get audit logs for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Array} Array of audit logs
 */
export const getUserAuditLogs = async (userId, {
  limit = 50,
  offset = 0
} = {}) => {
  const result = await query(
    `SELECT al.*, u.name as user_name, u.email as user_email
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     WHERE al.user_id = $1
     ORDER BY al.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  
  return result.rows;
};

/**
 * Get audit log by ID
 * @param {string} logId - Audit log ID
 * @returns {Object|null} Audit log or null
 */
export const getAuditLogById = async (logId) => {
  const result = await query(
    `SELECT al.*, u.name as user_name, u.email as user_email
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     WHERE al.id = $1`,
    [logId]
  );
  
  return result.rows[0] || null;
};

/**
 * Get audit log statistics for a brand
 * @param {string} brandId - Brand ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Object} Statistics object
 */
export const getAuditLogStats = async (brandId, startDate = null, endDate = null) => {
  let queryText = `
    SELECT 
      COUNT(*) as total_actions,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT entity_type) as entity_types,
      action,
      entity_type,
      COUNT(*) as count
    FROM audit_logs
    WHERE brand_id = $1
  `;
  const params = [brandId];
  let paramIndex = 2;

  if (startDate) {
    queryText += ` AND created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    queryText += ` AND created_at <= $${paramIndex}`;
    params.push(endDate);
  }

  queryText += ` GROUP BY action, entity_type ORDER BY count DESC`;

  const result = await query(queryText, params);
  
  // Get total count
  const totalResult = await query(
    `SELECT COUNT(*) as count FROM audit_logs WHERE brand_id = $1`,
    [brandId]
  );

  return {
    total: parseInt(totalResult.rows[0].count),
    byAction: result.rows
  };
};

/**
 * Delete old audit logs
 * @param {number} daysToKeep - Number of days to keep
 * @returns {number} Number of deleted logs
 */
export const cleanupOldAuditLogs = async (daysToKeep = 90) => {
  const result = await query(
    `DELETE FROM audit_logs 
     WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
     RETURNING id`
  );
  
  return result.rows.length;
};

/**
 * Search audit logs
 * @param {string} brandId - Brand ID
 * @param {string} searchQuery - Search query
 * @param {Object} options - Query options
 * @returns {Array} Array of audit logs
 */
export const searchAuditLogs = async (brandId, searchQuery, {
  limit = 50,
  offset = 0
} = {}) => {
  const result = await query(
    `SELECT al.*, u.name as user_name, u.email as user_email
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     WHERE al.brand_id = $1
       AND (
         al.description ILIKE $2
         OR al.entity_type ILIKE $2
         OR al.action ILIKE $2
         OR u.name ILIKE $2
         OR u.email ILIKE $2
       )
     ORDER BY al.created_at DESC
     LIMIT $3 OFFSET $4`,
    [brandId, `%${searchQuery}%`, limit, offset]
  );
  
  return result.rows;
};
