import { query } from '../config/database.js';
import { getBrandMember } from '../models/brandModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

const assertBrandAccess = async (brandId, userId, next) => {
  const member = await getBrandMember(brandId, userId);
  if (!member) {
    next(new AppError('You do not have access to this brand', 403));
    return false;
  }
  return true;
};

/** GET /api/project-templates/:brandId */
export const listTemplates = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `SELECT pt.*,
            COALESCE(json_agg(ptt ORDER BY ptt.sort_order) FILTER (WHERE ptt.id IS NOT NULL), '[]') AS task_templates
     FROM project_templates pt
     LEFT JOIN project_template_tasks ptt ON ptt.template_id = pt.id
     WHERE pt.brand_id = $1
     GROUP BY pt.id
     ORDER BY pt.created_at DESC`,
    [brandId]
  );

  res.json({ status: 'success', data: { templates: result.rows } });
});

/** POST /api/project-templates/:brandId */
export const createTemplate = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { name, description, default_status, default_budget, task_templates } = req.body;
  if (!name) return next(new AppError('name is required', 400));

  const tplResult = await query(
    `INSERT INTO project_templates (brand_id, name, description, default_status, default_budget, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [brandId, name, description || null, default_status || 'not_started', default_budget || null, req.user.id]
  );
  const template = tplResult.rows[0];

  if (Array.isArray(task_templates) && task_templates.length > 0) {
    const values = [];
    const params = [];
    task_templates.forEach((t, i) => {
      const offset = i * 5;
      values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
      params.push(template.id, t.title, t.description || null, t.default_assignee || null, i);
    });
    const taskResult = await query(
      `INSERT INTO project_template_tasks (template_id, title, description, default_assignee, sort_order)
       VALUES ${values.join(', ')} RETURNING *`,
      params
    );
    template.task_templates = taskResult.rows;
  } else {
    template.task_templates = [];
  }

  res.status(201).json({ status: 'success', data: { template } });
});

/** GET /api/project-templates/:brandId/:templateId */
export const getTemplate = catchAsync(async (req, res, next) => {
  const { brandId, templateId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `SELECT pt.*,
            COALESCE(json_agg(ptt ORDER BY ptt.sort_order) FILTER (WHERE ptt.id IS NOT NULL), '[]') AS task_templates
     FROM project_templates pt
     LEFT JOIN project_template_tasks ptt ON ptt.template_id = pt.id
     WHERE pt.id = $1 AND pt.brand_id = $2
     GROUP BY pt.id`,
    [templateId, brandId]
  );

  if (result.rows.length === 0) return next(new AppError('Template not found', 404));

  res.json({ status: 'success', data: { template: result.rows[0] } });
});

/** PATCH /api/project-templates/:brandId/:templateId */
export const updateTemplate = catchAsync(async (req, res, next) => {
  const { brandId, templateId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { name, description, default_status, default_budget, task_templates } = req.body;

  const result = await query(
    `UPDATE project_templates
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         default_status = COALESCE($3, default_status),
         default_budget = COALESCE($4, default_budget),
         updated_at = NOW()
     WHERE id = $5 AND brand_id = $6
     RETURNING *`,
    [name, description, default_status, default_budget, templateId, brandId]
  );

  if (result.rows.length === 0) return next(new AppError('Template not found', 404));

  const template = result.rows[0];

  // Replace task_templates if provided
  if (Array.isArray(task_templates)) {
    await query(`DELETE FROM project_template_tasks WHERE template_id = $1`, [templateId]);

    if (task_templates.length > 0) {
      const values = [];
      const params = [];
      task_templates.forEach((t, i) => {
        const offset = i * 5;
        values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
        params.push(templateId, t.title, t.description || null, t.default_assignee || null, i);
      });
      const taskResult = await query(
        `INSERT INTO project_template_tasks (template_id, title, description, default_assignee, sort_order)
         VALUES ${values.join(', ')} RETURNING *`,
        params
      );
      template.task_templates = taskResult.rows;
    } else {
      template.task_templates = [];
    }
  }

  res.json({ status: 'success', data: { template } });
});

/** DELETE /api/project-templates/:brandId/:templateId */
export const deleteTemplate = catchAsync(async (req, res, next) => {
  const { brandId, templateId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `DELETE FROM project_templates WHERE id = $1 AND brand_id = $2 RETURNING id`,
    [templateId, brandId]
  );

  if (result.rows.length === 0) return next(new AppError('Template not found', 404));

  res.json({ status: 'success', message: 'Template deleted' });
});

/** POST /api/project-templates/:brandId/:templateId/create-project */
export const createProjectFromTemplate = catchAsync(async (req, res, next) => {
  const { brandId, templateId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { client_id } = req.body;
  if (!client_id) return next(new AppError('client_id is required', 400));

  // Verify client belongs to brand
  const clientCheck = await query(
    `SELECT id FROM clients WHERE id = $1 AND brand_id = $2`,
    [client_id, brandId]
  );
  if (clientCheck.rows.length === 0) return next(new AppError('Client not found in this brand', 404));

  // Fetch template with tasks
  const tplResult = await query(
    `SELECT * FROM project_templates WHERE id = $1 AND brand_id = $2`,
    [templateId, brandId]
  );
  if (tplResult.rows.length === 0) return next(new AppError('Template not found', 404));
  const template = tplResult.rows[0];

  const taskTplResult = await query(
    `SELECT * FROM project_template_tasks WHERE template_id = $1 ORDER BY sort_order`,
    [templateId]
  );

  // Create project
  const projectResult = await query(
    `INSERT INTO projects (brand_id, client_id, name, description, status, budget, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [brandId, client_id, template.name, template.description, template.default_status || 'not_started', template.default_budget, req.user.id]
  );
  const project = projectResult.rows[0];

  // Create tasks from template
  const tasks = [];
  for (const tt of taskTplResult.rows) {
    const taskResult = await query(
      `INSERT INTO tasks (brand_id, project_id, client_id, title, description, assigned_to, created_by, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [brandId, project.id, client_id, tt.title, tt.description, tt.default_assignee, req.user.id, tt.sort_order]
    );
    tasks.push(taskResult.rows[0]);
  }

  project.tasks = tasks;

  res.status(201).json({ status: 'success', message: 'Project created from template', data: { project } });
});
