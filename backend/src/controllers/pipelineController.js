import * as pipelineModel from '../models/pipelineModel.js';
import * as brandModel from '../models/brandModel.js';
import * as clientActivityModel from '../models/clientActivityModel.js';

const verifyBrandAccess = async (brandId, userId) => {
  const member = await brandModel.getBrandMember(brandId, userId);
  return !!member;
};

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

    const summary = await pipelineModel.getPipelineSummary(brandId);

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

    // Log activity when stage changes
    if (req.body.stage && req.body.stage !== existing.stage && deal.client_id) {
      const stageLabels = {
        lead: 'Lead', qualified: 'Qualified', proposal_sent: 'Proposal Sent',
        negotiation: 'Negotiation', won: 'Won', lost: 'Lost'
      };
      await clientActivityModel.createActivity({
        brand_id: brandId,
        client_id: deal.client_id,
        user_id: userId,
        activity_type: 'system',
        title: `Deal moved to ${stageLabels[req.body.stage] || req.body.stage}`,
        body: `"${deal.title}" moved from ${stageLabels[existing.stage]} to ${stageLabels[req.body.stage]}`
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
