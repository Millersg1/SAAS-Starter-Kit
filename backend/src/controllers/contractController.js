import * as contractModel from '../models/contractModel.js';
import { getBrandMember } from '../models/brandModel.js';
import { getClientById } from '../models/clientModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';
import { deliverWebhook } from '../utils/webhookDelivery.js';

/** GET /api/contracts/:brandId */
export const listContracts = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const contracts = await contractModel.getContractsByBrand(brandId, req.query);
  res.json({ status: 'success', data: { contracts } });
});

/** GET /api/contracts/:brandId/:contractId */
export const getContract = catchAsync(async (req, res, next) => {
  const { brandId, contractId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const contract = await contractModel.getContractById(contractId);
  if (!contract || contract.brand_id !== brandId) return next(new AppError('Contract not found', 404));
  res.json({ status: 'success', data: { contract } });
});

/** POST /api/contracts/:brandId */
export const createContract = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const { title, content, client_id, project_id, issue_date, expiry_date, notes } = req.body;
  if (!title) return next(new AppError('Title is required', 400));

  const contract = await contractModel.createContract({
    brand_id: brandId, client_id, project_id, title, content, issue_date, expiry_date, notes,
    created_by: req.user.id
  });
  res.status(201).json({ status: 'success', data: { contract } });
});

/** PATCH /api/contracts/:brandId/:contractId */
export const updateContract = catchAsync(async (req, res, next) => {
  const { brandId, contractId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const existing = await contractModel.getContractById(contractId);
  if (!existing || existing.brand_id !== brandId) return next(new AppError('Contract not found', 404));

  const contract = await contractModel.updateContract(contractId, req.body);
  res.json({ status: 'success', data: { contract } });
});

/** POST /api/contracts/:brandId/:contractId/send */
export const sendContract = catchAsync(async (req, res, next) => {
  const { brandId, contractId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const existing = await contractModel.getContractById(contractId);
  if (!existing || existing.brand_id !== brandId) return next(new AppError('Contract not found', 404));
  if (!['draft'].includes(existing.status)) return next(new AppError('Only draft contracts can be sent', 400));

  const contract = await contractModel.updateContract(contractId, {
    status: 'sent',
    issue_date: existing.issue_date || new Date().toISOString().split('T')[0],
  });

  res.json({ status: 'success', data: { contract } });
});

/** DELETE /api/contracts/:brandId/:contractId */
export const deleteContract = catchAsync(async (req, res, next) => {
  const { brandId, contractId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const existing = await contractModel.getContractById(contractId);
  if (!existing || existing.brand_id !== brandId) return next(new AppError('Contract not found', 404));

  await contractModel.deleteContract(contractId);
  res.json({ status: 'success', message: 'Contract deleted' });
});

// ── Portal endpoints ─────────────────────────────────────────────────────────

/** GET /api/portal/contracts — list client's contracts */
export const portalListContracts = catchAsync(async (req, res, next) => {
  const brandId = req.portalBrandId;
  const clientId = req.portalClient.id;
  const contracts = await contractModel.getContractsByBrand(brandId, { client_id: clientId });
  res.json({ status: 'success', data: { contracts } });
});

/** GET /api/portal/contracts/:contractId */
export const portalGetContract = catchAsync(async (req, res, next) => {
  const brandId = req.portalBrandId;
  const { contractId } = req.params;
  const contract = await contractModel.getContractByIdForPortal(contractId, brandId);
  if (!contract) return next(new AppError('Contract not found', 404));
  if (contract.client_id !== req.portalClient.id) return next(new AppError('Access denied', 403));
  res.json({ status: 'success', data: { contract } });
});

/** POST /api/portal/contracts/:contractId/sign */
export const portalSignContract = catchAsync(async (req, res, next) => {
  const brandId = req.portalBrandId;
  const { contractId } = req.params;
  const { signature, signer_name } = req.body;

  if (!signature) return next(new AppError('Signature is required', 400));
  if (!signer_name?.trim()) return next(new AppError('Signer name is required', 400));

  const contract = await contractModel.getContractByIdForPortal(contractId, brandId);
  if (!contract) return next(new AppError('Contract not found', 404));
  if (contract.client_id !== req.portalClient.id) return next(new AppError('Access denied', 403));
  if (contract.status !== 'sent') return next(new AppError('Contract is not available for signing', 400));

  await contractModel.updateContract(contractId, {
    status: 'signed',
    client_signature: signature,
    signed_by_name: signer_name.trim(),
    signed_by_email: req.portalClient.email,
    signed_at: new Date().toISOString(),
  });

  // Fire webhook
  deliverWebhook(brandId, 'contract.signed', {
    id: contract.id,
    contract_number: contract.contract_number,
    title: contract.title,
    signed_by: signer_name.trim(),
  }).catch(() => {});

  res.json({ status: 'success', message: 'Contract signed successfully.' });
});
