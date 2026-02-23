import * as webhookModel from '../models/webhookModel.js';
import { getBrandMember } from '../models/brandModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

const SUPPORTED_EVENTS = [
  'invoice.paid',
  'invoice.sent',
  'proposal.accepted',
  'proposal.sent',
  'client.created',
  'project.created',
  'task.completed',
  'contract.signed',
];

/** GET /api/webhooks/endpoints/:brandId */
export const listEndpoints = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const endpoints = await webhookModel.getEndpointsByBrand(brandId);
  res.json({ status: 'success', data: { endpoints, supportedEvents: SUPPORTED_EVENTS } });
});

/** POST /api/webhooks/endpoints/:brandId */
export const createEndpoint = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const { url, description, events } = req.body;
  if (!url) return next(new AppError('URL is required', 400));
  if (!Array.isArray(events) || events.length === 0) return next(new AppError('At least one event is required', 400));

  // Validate event names
  const invalid = events.filter(e => !SUPPORTED_EVENTS.includes(e));
  if (invalid.length > 0) return next(new AppError(`Unknown events: ${invalid.join(', ')}`, 400));

  const endpoint = await webhookModel.createEndpoint({ brand_id: brandId, url, description, events });
  res.status(201).json({ status: 'success', data: { endpoint } });
});

/** PATCH /api/webhooks/endpoints/:brandId/:endpointId */
export const updateEndpoint = catchAsync(async (req, res, next) => {
  const { brandId, endpointId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const existing = await webhookModel.getEndpointById(endpointId);
  if (!existing || existing.brand_id !== brandId) return next(new AppError('Endpoint not found', 404));

  const endpoint = await webhookModel.updateEndpoint(endpointId, req.body);
  res.json({ status: 'success', data: { endpoint } });
});

/** DELETE /api/webhooks/endpoints/:brandId/:endpointId */
export const deleteEndpoint = catchAsync(async (req, res, next) => {
  const { brandId, endpointId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const existing = await webhookModel.getEndpointById(endpointId);
  if (!existing || existing.brand_id !== brandId) return next(new AppError('Endpoint not found', 404));

  await webhookModel.deleteEndpoint(endpointId);
  res.json({ status: 'success', message: 'Endpoint deleted' });
});

/** GET /api/webhooks/endpoints/:brandId/:endpointId/deliveries */
export const getDeliveries = catchAsync(async (req, res, next) => {
  const { brandId, endpointId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const existing = await webhookModel.getEndpointById(endpointId);
  if (!existing || existing.brand_id !== brandId) return next(new AppError('Endpoint not found', 404));

  const deliveries = await webhookModel.getDeliveriesByEndpoint(endpointId);
  res.json({ status: 'success', data: { deliveries } });
});
