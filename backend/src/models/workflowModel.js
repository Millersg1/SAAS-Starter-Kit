import { query } from '../config/database.js';

export const getWorkflows = async (brandId) =>
  (await query(
    `SELECT w.id, w.name, w.trigger_type, w.is_active, w.created_at,
            (w.workflow_definition IS NOT NULL) AS is_visual,
            jsonb_array_length(COALESCE(w.workflow_definition->'nodes', '[]'::jsonb)) AS node_count,
            COUNT(e.id) FILTER (WHERE e.status='active') as active_enrollments
     FROM automation_workflows w
     LEFT JOIN automation_enrollments e ON e.workflow_id = w.id
     WHERE w.brand_id = $1 GROUP BY w.id ORDER BY w.created_at DESC`,
    [brandId]
  )).rows;

export const getWorkflowById = async (id) =>
  (await query(`SELECT * FROM automation_workflows WHERE id = $1`, [id])).rows[0] || null;

export const getWorkflowWithSteps = async (id) => {
  const wf = await getWorkflowById(id);
  if (!wf) return null;
  const steps = (await query(`SELECT * FROM automation_steps WHERE workflow_id = $1 ORDER BY position ASC`, [id])).rows;
  return { ...wf, steps };
};

export const createWorkflow = async ({ brand_id, name, trigger_type, trigger_config, workflow_definition, created_by }) =>
  (await query(
    `INSERT INTO automation_workflows (brand_id, name, trigger_type, trigger_config, workflow_definition, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [brand_id, name, trigger_type, trigger_config || {}, workflow_definition || null, created_by]
  )).rows[0];

export const updateWorkflow = async (id, data) => {
  const allowed = ['name', 'trigger_type', 'trigger_config', 'is_active', 'workflow_definition'];
  const updates = []; const params = []; let idx = 1;
  for (const k of allowed) if (data[k] !== undefined) { updates.push(`${k} = $${idx++}`); params.push(data[k]); }
  if (!updates.length) return getWorkflowById(id);
  params.push(id);
  return (await query(`UPDATE automation_workflows SET ${updates.join(',')} WHERE id = $${idx} RETURNING *`, params)).rows[0] || null;
};

export const deleteWorkflow = async (id) =>
  query(`DELETE FROM automation_workflows WHERE id = $1`, [id]);

export const setSteps = async (workflowId, steps) => {
  await query(`DELETE FROM automation_steps WHERE workflow_id = $1`, [workflowId]);
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    await query(
      `INSERT INTO automation_steps (workflow_id, step_type, step_config, delay_minutes, position) VALUES ($1,$2,$3,$4,$5)`,
      [workflowId, s.step_type, s.step_config || {}, s.delay_minutes || 0, i]
    );
  }
};

export const getActiveEnrollments = async () =>
  (await query(
    `SELECT e.* FROM automation_enrollments e
     JOIN automation_workflows w ON w.id = e.workflow_id AND w.is_active = TRUE
     WHERE e.status = 'active' AND e.next_step_at <= NOW()
     ORDER BY e.next_step_at ASC LIMIT 50`,
    []
  )).rows;

export const enrollEntity = async ({ workflow_id, brand_id, entity_id, entity_type, next_step_at, current_node_id }) =>
  (await query(
    `INSERT INTO automation_enrollments (workflow_id, brand_id, entity_id, entity_type, next_step_at, current_node_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [workflow_id, brand_id, entity_id, entity_type || 'client', next_step_at || new Date(), current_node_id || null]
  )).rows[0];

export const advanceEnrollment = async (enrollmentId, newStep, nextStepAt) =>
  query(
    `UPDATE automation_enrollments SET current_step = $2, next_step_at = $3 WHERE id = $1`,
    [enrollmentId, newStep, nextStepAt]
  );

export const advanceEnrollmentByNode = async (enrollmentId, nodeId, nextStepAt) =>
  query(
    `UPDATE automation_enrollments SET current_node_id = $2, next_step_at = $3 WHERE id = $1`,
    [enrollmentId, nodeId, nextStepAt]
  );

export const completeEnrollment = async (enrollmentId) =>
  query(
    `UPDATE automation_enrollments SET status = 'completed', completed_at = NOW() WHERE id = $1`,
    [enrollmentId]
  );

export const getActiveWorkflowsForTrigger = async (brandId, triggerType) =>
  (await query(
    `SELECT w.* FROM automation_workflows w
     WHERE w.brand_id = $1 AND w.trigger_type = $2 AND w.is_active = TRUE`,
    [brandId, triggerType]
  )).rows;
