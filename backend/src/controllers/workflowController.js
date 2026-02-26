import * as workflowModel from '../models/workflowModel.js';
import * as brandModel from '../models/brandModel.js';

const auth = async (brandId, userId, res) => {
  const m = await brandModel.getBrandMember(brandId, userId);
  if (!m) { res.status(403).json({ status: 'fail', message: 'Access denied' }); return null; }
  return m;
};

export const listWorkflows = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const workflows = await workflowModel.getWorkflows(req.params.brandId);
    res.json({ status: 'success', data: { workflows } });
  } catch (e) { next(e); }
};

export const getWorkflow = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const workflow = await workflowModel.getWorkflowWithSteps(req.params.workflowId);
    if (!workflow) return res.status(404).json({ status: 'fail', message: 'Workflow not found' });
    res.json({ status: 'success', data: { workflow } });
  } catch (e) { next(e); }
};

export const createWorkflow = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await auth(brandId, req.user.id, res)) return;
    const workflow = await workflowModel.createWorkflow({ ...req.body, brand_id: brandId, created_by: req.user.id });
    if (Array.isArray(req.body.steps)) await workflowModel.setSteps(workflow.id, req.body.steps);
    res.status(201).json({ status: 'success', data: { workflow } });
  } catch (e) { next(e); }
};

export const updateWorkflow = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    const workflow = await workflowModel.updateWorkflow(req.params.workflowId, req.body);
    if (!workflow) return res.status(404).json({ status: 'fail', message: 'Workflow not found' });
    if (Array.isArray(req.body.steps)) await workflowModel.setSteps(workflow.id, req.body.steps);
    res.json({ status: 'success', data: { workflow } });
  } catch (e) { next(e); }
};

export const deleteWorkflow = async (req, res, next) => {
  try {
    if (!await auth(req.params.brandId, req.user.id, res)) return;
    await workflowModel.deleteWorkflow(req.params.workflowId);
    res.json({ status: 'success', message: 'Workflow deleted' });
  } catch (e) { next(e); }
};
