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

/** GET /api/onboarding/:brandId/checklists */
export const listChecklists = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `SELECT * FROM onboarding_checklists
     WHERE brand_id = $1
     ORDER BY created_at DESC`,
    [brandId]
  );

  res.json({ status: 'success', data: { checklists: result.rows } });
});

/** POST /api/onboarding/:brandId/checklists */
export const createChecklist = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { name, trigger_event, steps } = req.body;
  if (!name) return next(new AppError('name is required', 400));
  if (!Array.isArray(steps) || steps.length === 0) return next(new AppError('steps array is required', 400));

  const result = await query(
    `INSERT INTO onboarding_checklists (brand_id, name, trigger_event, steps, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [brandId, name, trigger_event || null, JSON.stringify(steps), req.user.id]
  );

  res.status(201).json({ status: 'success', data: { checklist: result.rows[0] } });
});

/** PATCH /api/onboarding/:brandId/checklists/:checklistId */
export const updateChecklist = catchAsync(async (req, res, next) => {
  const { brandId, checklistId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { name, trigger_event, steps } = req.body;

  const result = await query(
    `UPDATE onboarding_checklists
     SET name = COALESCE($1, name),
         trigger_event = COALESCE($2, trigger_event),
         steps = COALESCE($3, steps),
         updated_at = NOW()
     WHERE id = $4 AND brand_id = $5
     RETURNING *`,
    [name, trigger_event, steps ? JSON.stringify(steps) : null, checklistId, brandId]
  );

  if (result.rows.length === 0) return next(new AppError('Checklist not found', 404));

  res.json({ status: 'success', data: { checklist: result.rows[0] } });
});

/** DELETE /api/onboarding/:brandId/checklists/:checklistId */
export const deleteChecklist = catchAsync(async (req, res, next) => {
  const { brandId, checklistId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `DELETE FROM onboarding_checklists WHERE id = $1 AND brand_id = $2 RETURNING id`,
    [checklistId, brandId]
  );

  if (result.rows.length === 0) return next(new AppError('Checklist not found', 404));

  res.json({ status: 'success', message: 'Checklist deleted' });
});

/** GET /api/onboarding/:brandId/progress/:clientId */
export const getClientProgress = catchAsync(async (req, res, next) => {
  const { brandId, clientId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `SELECT op.*,
            oc.name AS checklist_name,
            oc.steps AS checklist_steps
     FROM onboarding_progress op
     JOIN onboarding_checklists oc ON oc.id = op.checklist_id
     WHERE op.brand_id = $1 AND op.client_id = $2
     ORDER BY op.started_at DESC`,
    [brandId, clientId]
  );

  res.json({ status: 'success', data: { progress: result.rows } });
});

/** POST /api/onboarding/:brandId/progress/:clientId/complete-step */
export const completeStep = catchAsync(async (req, res, next) => {
  const { brandId, clientId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { step_index } = req.body;
  if (step_index === undefined || step_index === null) return next(new AppError('step_index is required', 400));

  // Get active onboarding progress
  const progressResult = await query(
    `SELECT * FROM onboarding_progress
     WHERE brand_id = $1 AND client_id = $2 AND status = 'in_progress'
     ORDER BY started_at DESC LIMIT 1`,
    [brandId, clientId]
  );

  if (progressResult.rows.length === 0) return next(new AppError('No active onboarding found for this client', 404));

  const progress = progressResult.rows[0];
  const completedSteps = progress.completed_steps || [];

  if (completedSteps.includes(step_index)) {
    return res.json({ status: 'success', message: 'Step already completed', data: { progress } });
  }

  completedSteps.push(step_index);

  // Check if all steps completed
  const checklist = await query(`SELECT steps FROM onboarding_checklists WHERE id = $1`, [progress.checklist_id]);
  const totalSteps = checklist.rows[0] ? (Array.isArray(checklist.rows[0].steps) ? checklist.rows[0].steps.length : JSON.parse(checklist.rows[0].steps).length) : 0;
  const isComplete = completedSteps.length >= totalSteps;

  const updateResult = await query(
    `UPDATE onboarding_progress
     SET completed_steps = $1,
         status = $2,
         completed_at = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [JSON.stringify(completedSteps), isComplete ? 'completed' : 'in_progress', isComplete ? new Date() : null, progress.id]
  );

  res.json({ status: 'success', data: { progress: updateResult.rows[0] } });
});

/** POST /api/onboarding/:brandId/start/:clientId */
export const startOnboarding = catchAsync(async (req, res, next) => {
  const { brandId, clientId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { checklist_id } = req.body;
  if (!checklist_id) return next(new AppError('checklist_id is required', 400));

  // Verify checklist exists and belongs to brand
  const checklistResult = await query(
    `SELECT * FROM onboarding_checklists WHERE id = $1 AND brand_id = $2`,
    [checklist_id, brandId]
  );
  if (checklistResult.rows.length === 0) return next(new AppError('Checklist not found', 404));

  // Verify client belongs to brand
  const clientCheck = await query(
    `SELECT id FROM clients WHERE id = $1 AND brand_id = $2`,
    [clientId, brandId]
  );
  if (clientCheck.rows.length === 0) return next(new AppError('Client not found in this brand', 404));

  const result = await query(
    `INSERT INTO onboarding_progress (brand_id, client_id, checklist_id, status, completed_steps, started_at, started_by)
     VALUES ($1, $2, $3, 'in_progress', '[]', NOW(), $4) RETURNING *`,
    [brandId, clientId, checklist_id, req.user.id]
  );

  res.status(201).json({ status: 'success', message: 'Onboarding started', data: { progress: result.rows[0] } });
});
