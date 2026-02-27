import * as pipelineModel from '../models/pipelineModel.js';
import * as brandModel from '../models/brandModel.js';
import * as clientActivityModel from '../models/clientActivityModel.js';

const verifyBrandAccess = async (brandId, userId) => {
  const member = await brandModel.getBrandMember(brandId, userId);
  return !!member;
};

// ============================================
// PIPELINE MANAGEMENT
// ============================================

export const getPipelines = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await verifyBrandAccess(brandId, req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }
    const pipelines = await pipelineModel.getBrandPipelines(brandId);
    res.status(200).json({ status: 'success', data: { pipelines } });
  } catch (error) {
    console.error('Error in getPipelines - pipelineController.js', error);
    next(error);
  }
};

export const createPipeline = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    if (!['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ status: 'fail', message: 'Only owners or admins can manage pipelines.' });
    }
    const { name, description, stages, is_default } = req.body;
    if (!name?.trim()) return res.status(400).json({ status: 'fail', message: 'Pipeline name is required.' });
    if (!Array.isArray(stages) || stages.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'At least one stage is required.' });
    }
    const pipeline = await pipelineModel.createPipeline({ brand_id: brandId, name, description, stages, is_default });
    res.status(201).json({ status: 'success', message: 'Pipeline created.', data: { pipeline } });
  } catch (error) {
    console.error('Error in createPipeline - pipelineController.js', error);
    next(error);
  }
};

export const updatePipeline = async (req, res, next) => {
  try {
    const { brandId, pipelineId } = req.params;
    const userId = req.user.id;
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    if (!['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ status: 'fail', message: 'Only owners or admins can manage pipelines.' });
    }
    const pipeline = await pipelineModel.updatePipeline(pipelineId, req.body);
    if (!pipeline) return res.status(404).json({ status: 'fail', message: 'Pipeline not found.' });
    res.status(200).json({ status: 'success', message: 'Pipeline updated.', data: { pipeline } });
  } catch (error) {
    console.error('Error in updatePipeline - pipelineController.js', error);
    next(error);
  }
};

export const deletePipeline = async (req, res, next) => {
  try {
    const { brandId, pipelineId } = req.params;
    const userId = req.user.id;
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    if (!['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ status: 'fail', message: 'Only owners or admins can manage pipelines.' });
    }
    const deleted = await pipelineModel.deletePipeline(pipelineId);
    if (!deleted) return res.status(404).json({ status: 'fail', message: 'Pipeline not found.' });
    res.status(200).json({ status: 'success', message: 'Pipeline deleted.' });
  } catch (error) {
    console.error('Error in deletePipeline - pipelineController.js', error);
    next(error);
  }
};

// ============================================
// DEALS
// ============================================

export const getDeals = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }
    const deals = await pipelineModel.getBrandDeals(brandId, req.query);
    res.status(200).json({ status: 'success', data: { deals } });
  } catch (error) {
    console.error('Error in getDeals - pipelineController.js', error);
    next(error);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }
    const pipelineId = req.query.pipeline_id || null;
    const summary = await pipelineModel.getPipelineSummary(brandId, pipelineId);
    res.status(200).json({ status: 'success', data: { summary } });
  } catch (error) {
    console.error('Error in getSummary - pipelineController.js', error);
    next(error);
  }
};

export const createDeal = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }
    const deal = await pipelineModel.createDeal({
      ...req.body,
      brand_id: brandId,
      created_by: userId
    });
    if (deal.client_id) {
      await clientActivityModel.createActivity({
        brand_id: brandId,
        client_id: deal.client_id,
        user_id: userId,
        activity_type: 'system',
        title: 'Deal created',
        body: `New deal added to pipeline: "${deal.title}" — Stage: ${deal.stage}`
      });
    }
    res.status(201).json({ status: 'success', message: 'Deal created', data: { deal } });
  } catch (error) {
    console.error('Error in createDeal - pipelineController.js', error);
    next(error);
  }
};

export const getDeal = async (req, res, next) => {
  try {
    const { brandId, dealId } = req.params;
    const userId = req.user.id;
    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }
    const deal = await pipelineModel.getDealById(dealId);
    if (!deal || deal.brand_id !== brandId) {
      return res.status(404).json({ status: 'fail', message: 'Deal not found.' });
    }
    res.status(200).json({ status: 'success', data: { deal } });
  } catch (error) {
    console.error('Error in getDeal - pipelineController.js', error);
    next(error);
  }
};

export const updateDeal = async (req, res, next) => {
  try {
    const { brandId, dealId } = req.params;
    const userId = req.user.id;
    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }
    const existing = await pipelineModel.getDealById(dealId);
    if (!existing || existing.brand_id !== brandId) {
      return res.status(404).json({ status: 'fail', message: 'Deal not found.' });
    }
    const deal = await pipelineModel.updateDeal(dealId, req.body);

    if (req.body.stage && req.body.stage !== existing.stage && deal.client_id) {
      await clientActivityModel.createActivity({
        brand_id: brandId,
        client_id: deal.client_id,
        user_id: userId,
        activity_type: 'system',
        title: `Deal stage changed to ${req.body.stage}`,
        body: `"${deal.title}" moved from ${existing.stage} to ${req.body.stage}`
      });
    }
    res.status(200).json({ status: 'success', message: 'Deal updated', data: { deal } });
  } catch (error) {
    console.error('Error in updateDeal - pipelineController.js', error);
    next(error);
  }
};

export const deleteDeal = async (req, res, next) => {
  try {
    const { brandId, dealId } = req.params;
    const userId = req.user.id;
    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }
    const existing = await pipelineModel.getDealById(dealId);
    if (!existing || existing.brand_id !== brandId) {
      return res.status(404).json({ status: 'fail', message: 'Deal not found.' });
    }
    await pipelineModel.deleteDeal(dealId);
    res.status(200).json({ status: 'success', message: 'Deal deleted.' });
  } catch (error) {
    console.error('Error in deleteDeal - pipelineController.js', error);
    next(error);
  }
};
