import { query } from '../config/database.js';
import { getBrandMember } from '../models/brandModel.js';

const requireMember = async (brandId, userId) => {
  const member = await getBrandMember(brandId, userId);
  if (!member) throw Object.assign(new Error('Access denied'), { status: 403 });
};

export const getChurnPredictions = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);

    const result = await query(
      `SELECT cp.*, c.name AS client_name, c.company, c.email, c.health_score
       FROM churn_predictions cp
       JOIN clients c ON cp.client_id = c.id
       WHERE cp.brand_id = $1
       ORDER BY cp.churn_probability DESC`,
      [brandId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const getClientChurnPrediction = async (req, res) => {
  try {
    const { brandId, clientId } = req.params;
    await requireMember(brandId, req.user.id);

    const result = await query(
      `SELECT cp.*, c.name AS client_name, c.company, c.health_score
       FROM churn_predictions cp
       JOIN clients c ON cp.client_id = c.id
       WHERE cp.brand_id = $1 AND cp.client_id = $2`,
      [brandId, clientId]
    );

    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const recalculateChurn = async (req, res) => {
  try {
    const { brandId } = req.params;
    await requireMember(brandId, req.user.id);

    // Import and run synchronously for this brand
    const { computeClientHealthScore } = await import('./analyticsController.js');
    const clients = (await query(
      `SELECT id FROM clients WHERE brand_id = $1 AND is_active = TRUE`, [brandId]
    )).rows;

    let updated = 0;
    for (const client of clients) {
      try {
        await computeClientHealthScore(client.id, brandId);
        updated++;
      } catch { /* skip */ }
    }

    res.json({ success: true, message: `Recalculated for ${updated} clients. Churn predictions will update on next cron cycle.` });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};
