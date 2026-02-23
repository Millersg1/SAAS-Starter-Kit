import * as auditLogModel from '../models/auditLogModel.js';

/**
 * Get audit logs for a brand
 */
export const getBrandAuditLogs = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { action, entity_type, user_id, start_date, end_date, limit = 50, offset = 0 } = req.query;

    const logs = await auditLogModel.getBrandAuditLogs(brandId, {
      action,
      entityType: entity_type,
      userId: user_id,
      startDate: start_date,
      endDate: end_date,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: { logs }
    });
  } catch (error) {
    console.error('Error fetching audit logs: - auditController.js:26', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
};

/**
 * Get audit log statistics
 */
export const getAuditStats = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { start_date, end_date } = req.query;

    const stats = await auditLogModel.getAuditLogStats(brandId, start_date, end_date);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching audit stats: - auditController.js:49', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit statistics'
    });
  }
};

/**
 * Search audit logs
 */
export const searchAuditLogs = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { q, limit = 50, offset = 0 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const logs = await auditLogModel.searchAuditLogs(brandId, q, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: { logs }
    });
  } catch (error) {
    console.error('Error searching audit logs: - auditController.js:82', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search audit logs'
    });
  }
};

/**
 * Log an action (helper for other controllers)
 */
export const logAction = async (req, res) => {
  try {
    const { userId, brandId } = req.user;
    const { action, entityType, entityId, description, oldValues, newValues } = req.body;

    const log = await auditLogModel.createAuditLog({
      userId,
      brandId,
      action,
      entityType,
      entityId,
      description,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      data: { log }
    });
  } catch (error) {
    console.error('Error creating audit log: - auditController.js:116', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create audit log'
    });
  }
};
