import pool from '../config/database.js';
import { query } from '../config/database.js';

/**
 * Create a new project
 */
export const createProject = async (projectData) => {
  const {
    brand_id,
    client_id,
    name,
    description,
    project_type,
    status,
    priority,
    start_date,
    due_date,
    budget,
    currency,
    estimated_hours,
    project_manager_id,
    assigned_team,
    tags,
    custom_fields,
    created_by
  } = projectData;

  const result = await query(
    `INSERT INTO projects (
      brand_id, client_id, name, description, project_type, status, priority,
      start_date, due_date, budget, currency, estimated_hours,
      project_manager_id, assigned_team, tags, custom_fields, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING id, brand_id, client_id, name, description, project_type, status, priority,
              start_date, due_date, budget, currency, estimated_hours, actual_hours,
              project_manager_id, assigned_team, progress_percentage, milestones,
              tags, custom_fields, attachments, created_by, is_active,
              created_at, updated_at`,
    [
      brand_id, client_id, name, description, project_type, status, priority,
      start_date, due_date, budget, currency, estimated_hours,
      project_manager_id, 
      JSON.stringify(assigned_team || []), 
      JSON.stringify(tags || []), 
      JSON.stringify(custom_fields || {}), 
      created_by
    ]
  );

  return result.rows[0];
};

/**
 * Get all projects for a brand with optional filters
 */
export const getBrandProjects = async (brandId, filters = {}) => {
  const {
    client_id,
    status,
    priority,
    project_type,
    project_manager_id,
    search,
    limit = 50,
    offset = 0
  } = filters;

  let queryText = `
    SELECT p.id, p.brand_id, p.client_id, p.name, p.description, p.project_type,
           p.status, p.priority, p.start_date, p.due_date, p.completed_date,
           p.budget, p.currency, p.estimated_hours, p.actual_hours,
           p.project_manager_id, p.assigned_team, p.progress_percentage,
           p.milestones, p.tags, p.custom_fields, p.attachments,
           p.created_by, p.is_active, p.created_at, p.updated_at,
           c.name as client_name, c.email as client_email,
           pm.name as project_manager_name, pm.email as project_manager_email,
           creator.name as created_by_name, creator.email as created_by_email
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN users pm ON p.project_manager_id = pm.id
    LEFT JOIN users creator ON p.created_by = creator.id
    WHERE p.brand_id = $1 AND p.is_active = TRUE
  `;

  const params = [brandId];
  let paramCount = 1;

  if (client_id) {
    paramCount++;
    queryText += ` AND p.client_id = $${paramCount}`;
    params.push(client_id);
  }

  if (status) {
    paramCount++;
    queryText += ` AND p.status = $${paramCount}`;
    params.push(status);
  }

  if (priority) {
    paramCount++;
    queryText += ` AND p.priority = $${paramCount}`;
    params.push(priority);
  }

  if (project_type) {
    paramCount++;
    queryText += ` AND p.project_type = $${paramCount}`;
    params.push(project_type);
  }

  if (project_manager_id) {
    paramCount++;
    queryText += ` AND p.project_manager_id = $${paramCount}`;
    params.push(project_manager_id);
  }

  if (search) {
    paramCount++;
    queryText += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  queryText += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await query(queryText, params);
  return result.rows;
};

/**
 * Get project by ID with related data
 */
export const getProjectById = async (projectId) => {
  const result = await query(
    `SELECT p.id, p.brand_id, p.client_id, p.name, p.description, p.project_type,
            p.status, p.priority, p.start_date, p.due_date, p.completed_date,
            p.budget, p.currency, p.estimated_hours, p.actual_hours,
            p.project_manager_id, p.assigned_team, p.progress_percentage,
            p.milestones, p.tags, p.custom_fields, p.attachments,
            p.created_by, p.is_active, p.created_at, p.updated_at,
            c.name as client_name, c.email as client_email,
            pm.name as project_manager_name, pm.email as project_manager_email,
            creator.name as created_by_name, creator.email as created_by_email
     FROM projects p
     LEFT JOIN clients c ON p.client_id = c.id
     LEFT JOIN users pm ON p.project_manager_id = pm.id
     LEFT JOIN users creator ON p.created_by = creator.id
     WHERE p.id = $1 AND p.is_active = TRUE`,
    [projectId]
  );

  return result.rows[0];
};

/**
 * Update project
 */
export const updateProject = async (projectId, updateData) => {
  const allowedFields = [
    'name', 'description', 'project_type', 'status', 'priority',
    'start_date', 'due_date', 'completed_date', 'budget', 'currency',
    'estimated_hours', 'actual_hours', 'project_manager_id', 'assigned_team',
    'progress_percentage', 'milestones', 'tags', 'custom_fields', 'attachments'
  ];

  const updates = [];
  const values = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(updateData)) {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = $${paramCount}`);
      // Convert arrays and objects to JSON strings for JSONB fields
      if (['assigned_team', 'milestones', 'tags', 'attachments'].includes(key) && Array.isArray(value)) {
        values.push(JSON.stringify(value));
      } else if (['custom_fields', 'metadata'].includes(key) && typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
      paramCount++;
    }
  }

  if (updates.length === 0) {
    return null;
  }

  values.push(projectId);

  const result = await query(
    `UPDATE projects
     SET ${updates.join(', ')}
     WHERE id = $${paramCount} AND is_active = TRUE
     RETURNING id, brand_id, client_id, name, description, project_type, status, priority,
               start_date, due_date, completed_date, budget, currency,
               estimated_hours, actual_hours, project_manager_id, assigned_team,
               progress_percentage, milestones, tags, custom_fields, attachments,
               created_by, is_active, created_at, updated_at`,
    values
  );

  return result.rows[0];
};

/**
 * Delete project (soft delete)
 */
export const deleteProject = async (projectId) => {
  const result = await query(
    `UPDATE projects
     SET is_active = FALSE, deleted_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id`,
    [projectId]
  );

  return result.rows[0];
};

/**
 * Get project statistics for a brand
 */
export const getProjectStats = async (brandId) => {
  const result = await query(
    `SELECT 
      COUNT(*) as total_projects,
      COUNT(*) FILTER (WHERE status = 'planning') as planning_projects,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_projects,
      COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold_projects,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_projects,
      COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_projects,
      COUNT(*) FILTER (WHERE priority = 'high') as high_priority_projects,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) as overdue_projects,
      AVG(progress_percentage) as avg_progress,
      SUM(budget) as total_budget,
      SUM(estimated_hours) as total_estimated_hours,
      SUM(actual_hours) as total_actual_hours
     FROM projects
     WHERE brand_id = $1 AND is_active = TRUE`,
    [brandId]
  );

  const stats = result.rows[0];
  
  // Convert string counts to integers and handle nulls
  return {
    total_projects: parseInt(stats.total_projects) || 0,
    planning_projects: parseInt(stats.planning_projects) || 0,
    in_progress_projects: parseInt(stats.in_progress_projects) || 0,
    on_hold_projects: parseInt(stats.on_hold_projects) || 0,
    completed_projects: parseInt(stats.completed_projects) || 0,
    cancelled_projects: parseInt(stats.cancelled_projects) || 0,
    urgent_projects: parseInt(stats.urgent_projects) || 0,
    high_priority_projects: parseInt(stats.high_priority_projects) || 0,
    overdue_projects: parseInt(stats.overdue_projects) || 0,
    avg_progress: parseFloat(stats.avg_progress) || 0,
    total_budget: parseFloat(stats.total_budget) || 0,
    total_estimated_hours: parseInt(stats.total_estimated_hours) || 0,
    total_actual_hours: parseInt(stats.total_actual_hours) || 0
  };
};

/**
 * Get projects assigned to a user (as project manager or team member)
 */
export const getUserProjects = async (userId) => {
  const result = await query(
    `SELECT p.id, p.brand_id, p.client_id, p.name, p.status, p.priority,
            p.start_date, p.due_date, p.progress_percentage,
            p.created_at, p.updated_at,
            b.name as brand_name,
            c.name as client_name
     FROM projects p
     INNER JOIN brands b ON p.brand_id = b.id
     INNER JOIN clients c ON p.client_id = c.id
     WHERE (p.project_manager_id = $1 OR p.assigned_team @> $2::jsonb)
       AND p.is_active = TRUE
       AND b.is_active = TRUE
       AND c.is_active = TRUE
     ORDER BY p.created_at DESC`,
    [userId, JSON.stringify([userId])]
  );

  return result.rows;
};

/**
 * Get client projects
 */
export const getClientProjects = async (clientId) => {
  const result = await query(
    `SELECT p.id, p.brand_id, p.client_id, p.name, p.description, p.project_type,
            p.status, p.priority, p.start_date, p.due_date, p.completed_date,
            p.progress_percentage, p.milestones, p.tags,
            p.created_at, p.updated_at,
            pm.name as project_manager_name, pm.email as project_manager_email
     FROM projects p
     LEFT JOIN users pm ON p.project_manager_id = pm.id
     WHERE p.client_id = $1 AND p.is_active = TRUE
     ORDER BY p.created_at DESC`,
    [clientId]
  );

  return result.rows;
};

// ============= PROJECT UPDATES =============

/**
 * Create a project update
 */
export const createProjectUpdate = async (updateData) => {
  const {
    project_id,
    update_type,
    title,
    content,
    created_by,
    is_visible_to_client,
    attachments,
    metadata
  } = updateData;

  const result = await query(
    `INSERT INTO project_updates (
      project_id, update_type, title, content, created_by,
      is_visible_to_client, attachments, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, project_id, update_type, title, content, created_by,
              is_visible_to_client, attachments, metadata, created_at, updated_at`,
    [
      project_id, update_type, title, content, created_by,
      is_visible_to_client !== undefined ? is_visible_to_client : true,
      JSON.stringify(attachments || []), 
      JSON.stringify(metadata || {})
    ]
  );

  return result.rows[0];
};

/**
 * Get project updates
 */
export const getProjectUpdates = async (projectId, filters = {}) => {
  const { update_type, visible_to_client, limit = 50, offset = 0 } = filters;

  let queryText = `
    SELECT pu.id, pu.project_id, pu.update_type, pu.title, pu.content,
           pu.created_by, pu.is_visible_to_client, pu.attachments, pu.metadata,
           pu.created_at, pu.updated_at,
           u.name as created_by_name, u.email as created_by_email, u.avatar_url
    FROM project_updates pu
    LEFT JOIN users u ON pu.created_by = u.id
    WHERE pu.project_id = $1
  `;

  const params = [projectId];
  let paramCount = 1;

  if (update_type) {
    paramCount++;
    queryText += ` AND pu.update_type = $${paramCount}`;
    params.push(update_type);
  }

  if (visible_to_client !== undefined) {
    paramCount++;
    queryText += ` AND pu.is_visible_to_client = $${paramCount}`;
    params.push(visible_to_client);
  }

  queryText += ` ORDER BY pu.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await query(queryText, params);
  return result.rows;
};

/**
 * Get single project update
 */
export const getProjectUpdateById = async (updateId) => {
  const result = await query(
    `SELECT pu.id, pu.project_id, pu.update_type, pu.title, pu.content,
            pu.created_by, pu.is_visible_to_client, pu.attachments, pu.metadata,
            pu.created_at, pu.updated_at,
            u.name as created_by_name, u.email as created_by_email
     FROM project_updates pu
     LEFT JOIN users u ON pu.created_by = u.id
     WHERE pu.id = $1`,
    [updateId]
  );

  return result.rows[0];
};

/**
 * Update project update
 */
export const updateProjectUpdate = async (updateId, updateData) => {
  const allowedFields = ['title', 'content', 'is_visible_to_client', 'attachments', 'metadata'];

  const updates = [];
  const values = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(updateData)) {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = $${paramCount}`);
      // Convert arrays and objects to JSON strings for JSONB fields
      if (key === 'attachments' && Array.isArray(value)) {
        values.push(JSON.stringify(value));
      } else if (key === 'metadata' && typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
      paramCount++;
    }
  }

  if (updates.length === 0) {
    return null;
  }

  values.push(updateId);

  const result = await query(
    `UPDATE project_updates
     SET ${updates.join(', ')}
     WHERE id = $${paramCount}
     RETURNING id, project_id, update_type, title, content, created_by,
               is_visible_to_client, attachments, metadata, created_at, updated_at`,
    values
  );

  return result.rows[0];
};

/**
 * Delete project update
 */
export const deleteProjectUpdate = async (updateId) => {
  const result = await query(
    `DELETE FROM project_updates
     WHERE id = $1
     RETURNING id`,
    [updateId]
  );

  return result.rows[0];
};
