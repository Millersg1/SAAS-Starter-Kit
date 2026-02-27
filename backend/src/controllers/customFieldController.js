import { getBrandMember } from '../models/brandModel.js';
import {
  getFieldDefs, createFieldDef, updateFieldDef, deleteFieldDef, reorderFields
} from '../models/customFieldModel.js';

const requireBrandAccess = async (brandId, userId) => {
  const member = await getBrandMember(brandId, userId);
  if (!member) throw { status: 403, message: 'Access denied' };
  return member;
};

export const listFields = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { entity_type = 'client' } = req.query;
    await requireBrandAccess(brandId, req.user.id);
    const fields = await getFieldDefs(brandId, entity_type);
    res.json({ success: true, data: { fields } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const createField = async (req, res) => {
  try {
    const { brandId } = req.params;
    const member = await requireBrandAccess(brandId, req.user.id);
    if (!['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ success: false, message: 'Only owners/admins can manage fields' });
    }
    const field = await createFieldDef({ ...req.body, brand_id: brandId });
    res.status(201).json({ success: true, data: { field } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || 'Failed to create field' });
  }
};

export const updateField = async (req, res) => {
  try {
    const { brandId, fieldId } = req.params;
    const member = await requireBrandAccess(brandId, req.user.id);
    if (!['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ success: false, message: 'Only owners/admins can manage fields' });
    }
    const field = await updateFieldDef(fieldId, brandId, req.body);
    res.json({ success: true, data: { field } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const deleteField = async (req, res) => {
  try {
    const { brandId, fieldId } = req.params;
    const member = await requireBrandAccess(brandId, req.user.id);
    if (!['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ success: false, message: 'Only owners/admins can manage fields' });
    }
    await deleteFieldDef(fieldId, brandId);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const reorderFieldsHandler = async (req, res) => {
  try {
    const { brandId } = req.params;
    const member = await requireBrandAccess(brandId, req.user.id);
    if (!['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ success: false, message: 'Only owners/admins can manage fields' });
    }
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ success: false, message: 'ids must be an array' });
    await reorderFields(ids);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};
