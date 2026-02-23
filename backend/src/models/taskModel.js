import { query } from '../config/database.js';

export const createTask = async (data) => {
  const {
    brand_id, client_id, project_id, deal_id, title, description,
    due_date, priority = 'normal', assigned_to, created_by
  } = data;

  const result = await query(
    `INSERT INTO tasks
       (brand_id, client_id, project_id, deal_id, title, description,
        due_date, priority, assigned_to, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [brand_id, client_id || null, project_id || null, deal_id || null,
     title, description || null, due_date || null, priority,
     assigned_to || null, created_by]
  );
  return result.rows[0];
};

export const getBrandTasks = async (brandId, filters = {}) => {
  const { status, priority, assigned_to, client_id, due_today, overdue } = filters;
  let paramCount = 1;
  const params = [brandId];
  let where = `t.brand_id = $${paramCount} AND t.is_active = TRUE`;

  if (status) {
    paramCount++;
    where += ` AND t.status = $${paramCount}`;
    params.push(status);
  }
  if (priority) {
    paramCount++;
    where += ` AND t.priority = $${paramCount}`;
    params.push(priority);
  }
  if (assigned_to) {
    paramCount++;
    where += ` AND t.assigned_to = $${paramCount}`;
    params.push(assigned_to);
  }
  if (client_id) {
    paramCount++;
    where += ` AND t.client_id = $${paramCount}`;
    params.push(client_id);
  }
  if (due_today === 'true' || due_today === true) {
    where += ` AND t.due_date = CURRENT_DATE`;
  }
  if (overdue === 'true' || overdue === true) {
    where += ` AND t.due_date < CURRENT_DATE AND t.status != 'completed'`;
  }

  const result = await query(
    `SELECT t.*,
            c.name AS client_name,
            p.name AS project_name,
            u.name AS assigned_to_name
     FROM tasks t
     LEFT JOIN clients c ON t.client_id = c.id
     LEFT JOIN projects p ON t.project_id = p.id
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE ${where}
     ORDER BY
       CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
       t.due_date ASC NULLS LAST,
       t.created_at DESC`,
    params
  );
  return result.rows;
};

export const getClientTasks = async (clientId) => {
  const result = await query(
    `SELECT t.*, u.name AS assigned_to_name
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.client_id = $1 AND t.is_active = TRUE
     ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`,
    [clientId]
  );
  return result.rows;
};

export const getTaskById = async (taskId) => {
  const result = await query(
    `SELECT t.*,
            c.name AS client_name,
            p.name AS project_name,
            u.name AS assigned_to_name
     FROM tasks t
     LEFT JOIN clients c ON t.client_id = c.id
     LEFT JOIN projects p ON t.project_id = p.id
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.id = $1 AND t.is_active = TRUE`,
    [taskId]
  );
  return result.rows[0] || null;
};

export const updateTask = async (taskId, fields) => {
  const allowed = ['title','description','due_date','priority','status','assigned_to','client_id','project_id','deal_id'];
  const updates = [];
  const params = [];
  let idx = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${idx}`);
      params.push(fields[key]);
      idx++;
    }
  }

  if (updates.length === 0) return getTaskById(taskId);

  params.push(taskId);
  const result = await query(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${idx} AND is_active = TRUE RETURNING *`,
    params
  );
  return result.rows[0] || null;
};

export const completeTask = async (taskId) => {
  const result = await query(
    `UPDATE tasks SET status = 'completed', completed_at = NOW()
     WHERE id = $1 AND is_active = TRUE
     RETURNING *`,
    [taskId]
  );
  return result.rows[0] || null;
};

export const deleteTask = async (taskId) => {
  const result = await query(
    `UPDATE tasks SET is_active = FALSE WHERE id = $1 RETURNING id`,
    [taskId]
  );
  return result.rows[0] || null;
};

export const getDueTodayTasks = async () => {
  const result = await query(
    `SELECT t.*, u.email AS assigned_email, u.name AS assigned_name,
            c.name AS client_name, b.name AS brand_name
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     LEFT JOIN clients c ON t.client_id = c.id
     LEFT JOIN brands b ON t.brand_id = b.id
     WHERE t.due_date = CURRENT_DATE
       AND t.reminder_sent = FALSE
       AND t.status = 'pending'
       AND t.is_active = TRUE
       AND u.email IS NOT NULL`,
    []
  );
  return result.rows;
};

export const markReminderSent = async (taskId) => {
  await query(`UPDATE tasks SET reminder_sent = TRUE WHERE id = $1`, [taskId]);
};
