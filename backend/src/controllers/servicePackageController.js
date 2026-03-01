import { getBrandMember } from '../models/brandModel.js';
import * as pkg from '../models/servicePackageModel.js';

const requireMember = async (brandId, userId) => {
  const member = await getBrandMember(brandId, userId);
  if (!member) throw Object.assign(new Error('Access denied'), { status: 403 });
};

export const listPackages = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const packages = await pkg.getPackages(brandId, req.query.client_id);
    res.json({ success: true, data: packages });
  } catch (err) { res.status(err.status || 500).json({ success: false, message: err.message }); }
};

export const createPackage = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);
    const p = await pkg.createPackage({ ...req.body, brand_id: brandId });
    res.status(201).json({ success: true, data: p });
  } catch (err) { res.status(err.status || 500).json({ success: false, message: err.message }); }
};

export const getPackage = async (req, res) => {
  try {
    const { brandId, packageId } = req.params;
    await requireMember(brandId, req.user.id);
    const p = await pkg.getPackageById(packageId, brandId);
    if (!p) return res.status(404).json({ success: false, message: 'Package not found' });

    // Attach current period usage + history
    const [currentUsage, history] = await Promise.all([
      pkg.getCurrentPeriodSummary(packageId),
      pkg.getUsageHistory(packageId, 6),
    ]);
    res.json({ success: true, data: { ...p, currentUsage, history } });
  } catch (err) { res.status(err.status || 500).json({ success: false, message: err.message }); }
};

export const updatePackage = async (req, res) => {
  try {
    const { brandId, packageId } = req.params;
    await requireMember(brandId, req.user.id);
    const p = await pkg.updatePackage(packageId, req.body);
    if (!p) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, data: p });
  } catch (err) { res.status(err.status || 500).json({ success: false, message: err.message }); }
};

export const deletePackage = async (req, res) => {
  try {
    const { brandId, packageId } = req.params;
    await requireMember(brandId, req.user.id);
    await pkg.deletePackage(packageId, brandId);
    res.json({ success: true, message: 'Package deleted' });
  } catch (err) { res.status(err.status || 500).json({ success: false, message: err.message }); }
};

export const logUsage = async (req, res) => {
  try {
    const { brandId, packageId } = req.params;
    await requireMember(brandId, req.user.id);
    const usage = await pkg.logUsage({ ...req.body, package_id: packageId, brand_id: brandId, logged_by: req.user.id });
    res.status(201).json({ success: true, data: usage });
  } catch (err) { res.status(err.status || 500).json({ success: false, message: err.message }); }
};

export const getUsageHistory = async (req, res) => {
  try {
    const { brandId, packageId } = req.params;
    await requireMember(brandId, req.user.id);
    const history = await pkg.getUsageHistory(packageId, parseInt(req.query.limit) || 12);
    res.json({ success: true, data: history });
  } catch (err) { res.status(err.status || 500).json({ success: false, message: err.message }); }
};
