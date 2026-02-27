import * as segmentModel from '../models/segmentModel.js';
import * as brandModel from '../models/brandModel.js';

const verifyAccess = async (brandId, userId) => {
  const member = await brandModel.getBrandMember(brandId, userId);
  return !!member;
};

export const listSegments = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await verifyAccess(brandId, req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }
    const segments = await segmentModel.getSegments(brandId);
    res.status(200).json({ status: 'success', data: { segments } });
  } catch (error) {
    console.error('Error in listSegments - segmentController.js', error);
    next(error);
  }
};

export const createSegment = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await verifyAccess(brandId, req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }
    const { name, description, filter_config } = req.body;
    if (!name?.trim()) return res.status(400).json({ status: 'fail', message: 'Segment name is required.' });
    const segment = await segmentModel.createSegment({ brand_id: brandId, name, description, filter_config });
    res.status(201).json({ status: 'success', data: { segment } });
  } catch (error) {
    console.error('Error in createSegment - segmentController.js', error);
    next(error);
  }
};

export const updateSegment = async (req, res, next) => {
  try {
    const { brandId, segmentId } = req.params;
    if (!await verifyAccess(brandId, req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }
    const segment = await segmentModel.updateSegment(segmentId, req.body);
    if (!segment) return res.status(404).json({ status: 'fail', message: 'Segment not found.' });
    res.status(200).json({ status: 'success', data: { segment } });
  } catch (error) {
    console.error('Error in updateSegment - segmentController.js', error);
    next(error);
  }
};

export const deleteSegment = async (req, res, next) => {
  try {
    const { brandId, segmentId } = req.params;
    if (!await verifyAccess(brandId, req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }
    const deleted = await segmentModel.deleteSegment(segmentId, brandId);
    if (!deleted) return res.status(404).json({ status: 'fail', message: 'Segment not found.' });
    res.status(200).json({ status: 'success', message: 'Segment deleted.' });
  } catch (error) {
    console.error('Error in deleteSegment - segmentController.js', error);
    next(error);
  }
};

export const getSegmentClients = async (req, res, next) => {
  try {
    const { brandId, segmentId } = req.params;
    if (!await verifyAccess(brandId, req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }
    const segments = await segmentModel.getSegments(brandId);
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return res.status(404).json({ status: 'fail', message: 'Segment not found.' });
    const clients = await segmentModel.evaluateSegment(brandId, segment.filter_config || []);
    // Update stored count
    await segmentModel.updateSegment(segmentId, { client_count: clients.length });
    res.status(200).json({ status: 'success', data: { clients, count: clients.length } });
  } catch (error) {
    console.error('Error in getSegmentClients - segmentController.js', error);
    next(error);
  }
};

export const previewSegment = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await verifyAccess(brandId, req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }
    const { filter_config } = req.body;
    const count = await segmentModel.countSegment(brandId, filter_config || []);
    res.status(200).json({ status: 'success', data: { count } });
  } catch (error) {
    console.error('Error in previewSegment - segmentController.js', error);
    next(error);
  }
};
