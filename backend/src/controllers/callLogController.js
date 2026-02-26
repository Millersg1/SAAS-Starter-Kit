import * as callLogModel from '../models/callLogModel.js';
import * as brandModel from '../models/brandModel.js';

export const listCallLogs = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const member = await brandModel.getBrandMember(brandId, req.user.id);
    if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied' });
    const { client_id, limit, offset } = req.query;
    const logs = await callLogModel.getCallLogsByBrand(brandId, { client_id, limit: limit ? parseInt(limit) : 50, offset: offset ? parseInt(offset) : 0 });
    res.json({ status: 'success', data: { logs } });
  } catch (e) { next(e); }
};

export const createCallLog = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const member = await brandModel.getBrandMember(brandId, req.user.id);
    if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied' });
    const log = await callLogModel.createCallLog({ ...req.body, brand_id: brandId, user_id: req.user.id });
    res.status(201).json({ status: 'success', data: { log } });
  } catch (e) { next(e); }
};

export const updateCallLog = async (req, res, next) => {
  try {
    const { brandId, logId } = req.params;
    const member = await brandModel.getBrandMember(brandId, req.user.id);
    if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied' });
    const log = await callLogModel.updateCallLog(logId, req.body);
    if (!log) return res.status(404).json({ status: 'fail', message: 'Call log not found' });
    res.json({ status: 'success', data: { log } });
  } catch (e) { next(e); }
};

export const deleteCallLog = async (req, res, next) => {
  try {
    const { brandId, logId } = req.params;
    const member = await brandModel.getBrandMember(brandId, req.user.id);
    if (!member) return res.status(403).json({ status: 'fail', message: 'Access denied' });
    const deleted = await callLogModel.deleteCallLog(logId);
    if (!deleted) return res.status(404).json({ status: 'fail', message: 'Call log not found' });
    res.json({ status: 'success', message: 'Call log deleted' });
  } catch (e) { next(e); }
};
