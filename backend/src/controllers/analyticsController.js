import { query } from '../config/database.js';
import * as brandModel from '../models/brandModel.js';
import * as pipelineModel from '../models/pipelineModel.js';

const verifyBrandAccess = async (brandId, userId) => {
  const member = await brandModel.getBrandMember(brandId, userId);
  return !!member;
};

export const getRevenueAnalytics = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    // Monthly revenue last 12 months
    const monthlyResult = await query(
      `SELECT
         TO_CHAR(date_trunc('month', p.created_at), 'Mon YYYY') AS month_label,
         date_trunc('month', p.created_at) AS month_date,
         COALESCE(SUM(p.amount), 0) AS revenue
       FROM payments p
       WHERE p.brand_id = $1
         AND p.payment_status = 'completed'
         AND p.created_at >= NOW() - INTERVAL '12 months'
       GROUP BY date_trunc('month', p.created_at)
       ORDER BY date_trunc('month', p.created_at) ASC`,
      [brandId]
    );

    // Top 5 clients by revenue
    const topClientsResult = await query(
      `SELECT
         c.id, c.name, c.company,
         COALESCE(SUM(p.amount), 0) AS total_revenue,
         COUNT(p.id) AS payment_count
       FROM clients c
       LEFT JOIN payments p ON p.client_id = c.id
         AND p.payment_status = 'completed'
         AND p.brand_id = $1
       WHERE c.brand_id = $1 AND c.is_active = TRUE
       GROUP BY c.id, c.name, c.company
       ORDER BY total_revenue DESC
       LIMIT 5`,
      [brandId]
    );

    // Total revenue all time
    const totalResult = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payments
       WHERE brand_id = $1 AND payment_status = 'completed'`,
      [brandId]
    );

    res.status(200).json({
      status: 'success',
      data: {
        monthly: monthlyResult.rows.map(r => ({
          month: r.month_label,
          revenue: parseFloat(r.revenue)
        })),
        topClients: topClientsResult.rows.map(r => ({
          id: r.id,
          name: r.company || r.name,
          total_revenue: parseFloat(r.total_revenue),
          payment_count: parseInt(r.payment_count)
        })),
        totalRevenue: parseFloat(totalResult.rows[0]?.total || 0)
      }
    });
  } catch (error) {
    console.error('Error in getRevenueAnalytics - analyticsController.js', error);
    next(error);
  }
};

export const getConversionAnalytics = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const result = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'sent' OR status = 'accepted' OR status = 'rejected' OR status = 'expired') AS total_sent,
         COUNT(*) FILTER (WHERE status = 'accepted') AS total_accepted,
         COUNT(*) FILTER (WHERE status = 'rejected') AS total_rejected,
         ROUND(
           AVG(
             EXTRACT(EPOCH FROM (accepted_at - created_at)) / 86400.0
           ) FILTER (WHERE status = 'accepted' AND accepted_at IS NOT NULL),
           1
         ) AS avg_days_to_close
       FROM proposals
       WHERE brand_id = $1 AND is_active = TRUE`,
      [brandId]
    );

    const row = result.rows[0];
    const sent = parseInt(row.total_sent) || 0;
    const accepted = parseInt(row.total_accepted) || 0;
    const rejected = parseInt(row.total_rejected) || 0;
    const conversionRate = sent > 0 ? Math.round((accepted / sent) * 100) : 0;

    // Monthly proposal trend
    const trendResult = await query(
      `SELECT
         TO_CHAR(date_trunc('month', created_at), 'Mon YYYY') AS month_label,
         COUNT(*) FILTER (WHERE status != 'draft') AS sent,
         COUNT(*) FILTER (WHERE status = 'accepted') AS accepted
       FROM proposals
       WHERE brand_id = $1 AND is_active = TRUE
         AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY date_trunc('month', created_at)
       ORDER BY date_trunc('month', created_at) ASC`,
      [brandId]
    );

    res.status(200).json({
      status: 'success',
      data: {
        sent,
        accepted,
        rejected,
        conversionRate,
        avgDaysToClose: parseFloat(row.avg_days_to_close) || 0,
        trend: trendResult.rows
      }
    });
  } catch (error) {
    console.error('Error in getConversionAnalytics - analyticsController.js', error);
    next(error);
  }
};

export const getForecast = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    // Fetch last 12 months actual revenue
    const monthlyResult = await query(
      `SELECT
         TO_CHAR(date_trunc('month', p.created_at), 'Mon YYYY') AS month_label,
         date_trunc('month', p.created_at) AS month_date,
         COALESCE(SUM(p.amount), 0) AS revenue
       FROM payments p
       WHERE p.brand_id = $1
         AND p.payment_status = 'completed'
         AND p.created_at >= NOW() - INTERVAL '12 months'
       GROUP BY date_trunc('month', p.created_at)
       ORDER BY date_trunc('month', p.created_at) ASC`,
      [brandId]
    );

    // Build full 12-month array filling gaps with 0
    const now = new Date();
    const historical = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const match = monthlyResult.rows.find(r => {
        const rd = new Date(r.month_date);
        return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
      });
      historical.push({ month: label, revenue: match ? parseFloat(match.revenue) : 0 });
    }

    // 3-month moving average growth rate
    const last3 = historical.slice(-3).map(h => h.revenue);
    let avgGrowthRate = 0;
    const growthRates = [];
    for (let i = 1; i < last3.length; i++) {
      if (last3[i - 1] > 0) growthRates.push((last3[i] - last3[i - 1]) / last3[i - 1]);
    }
    if (growthRates.length > 0) {
      avgGrowthRate = growthRates.reduce((sum, r) => sum + r, 0) / growthRates.length;
    }
    avgGrowthRate = Math.max(-0.5, Math.min(1.0, avgGrowthRate));
    const lastActual = historical[historical.length - 1]?.revenue || 0;

    // Recurring base from invoices (best-effort)
    let recurringMonthlyBase = 0;
    try {
      const recurringRes = await query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total
         FROM invoices WHERE brand_id = $1 AND is_recurring = TRUE AND status != 'cancelled'`,
        [brandId]
      );
      recurringMonthlyBase = parseFloat(recurringRes.rows[0]?.total || 0);
    } catch (_) { /* column may not exist */ }

    // Project 6 future months
    const projected = [];
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

      const projRevenue = Math.max(0, lastActual * Math.pow(1 + avgGrowthRate, i));

      let pipelineContrib = 0;
      const pipeRes = await query(
        `SELECT COALESCE(SUM(value * probability / 100.0), 0) AS weighted
         FROM pipeline_deals
         WHERE brand_id = $1
           AND expected_close_date >= $2 AND expected_close_date <= $3
           AND stage NOT IN ('won','lost') AND is_active = TRUE`,
        [brandId, monthStart, monthEnd]
      );
      pipelineContrib = parseFloat(pipeRes.rows[0]?.weighted || 0);

      projected.push({ month: label, revenue: Math.round(projRevenue), pipeline: Math.round(pipelineContrib) });
    }

    const currentMRR = historical[historical.length - 1]?.revenue || 0;
    const projectedMRR = projected.reduce((sum, p) => sum + p.revenue, 0) / projected.length;

    res.status(200).json({
      status: 'success',
      data: {
        historical,
        projected,
        recurringMonthlyBase: Math.round(recurringMonthlyBase),
        currentMRR: Math.round(currentMRR),
        projectedMRR: Math.round(projectedMRR),
        growthRate: Math.round(avgGrowthRate * 100),
      }
    });
  } catch (error) {
    console.error('Error in getForecast - analyticsController.js', error);
    next(error);
  }
};

export const getPipelineAnalytics = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    if (!await verifyBrandAccess(brandId, userId)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const summary = await pipelineModel.getPipelineSummary(brandId);

    // Monthly deals won last 6 months
    const wonTrendResult = await query(
      `SELECT
         TO_CHAR(date_trunc('month', updated_at), 'Mon YYYY') AS month_label,
         COUNT(*) AS deals_won,
         COALESCE(SUM(value), 0) AS revenue_won
       FROM pipeline_deals
       WHERE brand_id = $1 AND stage = 'won' AND is_active = TRUE
         AND updated_at >= NOW() - INTERVAL '6 months'
       GROUP BY date_trunc('month', updated_at)
       ORDER BY date_trunc('month', updated_at) ASC`,
      [brandId]
    );

    res.status(200).json({
      status: 'success',
      data: {
        byStage: summary.byStage,
        totalWeighted: summary.totalWeighted,
        wonTrend: wonTrendResult.rows
      }
    });
  } catch (error) {
    console.error('Error in getPipelineAnalytics - analyticsController.js', error);
    next(error);
  }
};
