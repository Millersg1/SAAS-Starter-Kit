import { query } from '../config/database.js';
import * as brandModel from '../models/brandModel.js';
import * as pipelineModel from '../models/pipelineModel.js';
import { batchProcess } from '../utils/batchProcess.js';

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

// ─────────────────────────────────────────────────────────────────────────────
// Client Health Scores
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a 0–100 health score for one client and persist it on the clients row.
 * Returns { score, breakdown } — exported so aiController can reuse it.
 */
export const computeClientHealthScore = async (clientId, brandId) => {
  const { rows } = await query(
    `SELECT
       c.last_portal_login,
       COUNT(DISTINCT CASE WHEN i.status = 'overdue' THEN i.id END)                    AS overdue_invoices,
       COUNT(DISTINCT CASE WHEN t.status != 'completed' AND t.due_date < NOW()
                            THEN t.id END)                                              AS overdue_tasks,
       MAX(a.created_at)                                                                AS last_activity_at
     FROM clients c
     LEFT JOIN invoices          i ON i.client_id = c.id AND i.brand_id = $1
     LEFT JOIN tasks             t ON t.client_id = c.id AND t.brand_id = $1
     LEFT JOIN client_activities a ON a.client_id = c.id AND a.brand_id = $1
     WHERE c.id = $2 AND c.brand_id = $1
     GROUP BY c.last_portal_login`,
    [brandId, clientId]
  );

  const row = rows[0] || {};
  const overdueInvoices = parseInt(row.overdue_invoices || 0);
  const overdueTasks    = parseInt(row.overdue_tasks    || 0);

  // Payment component (0–35)
  const payment = Math.max(0, 35 - overdueInvoices * 15);

  // Activity component (0–30): days since last logged activity
  let activity = 0;
  if (row.last_activity_at) {
    const daysSince = (Date.now() - new Date(row.last_activity_at).getTime()) / 86400000;
    if      (daysSince <= 7)  activity = 30;
    else if (daysSince <= 14) activity = 22;
    else if (daysSince <= 30) activity = 14;
    else if (daysSince <= 90) activity = 7;
  }

  // Delivery component (0–20): overdue tasks
  const delivery = Math.max(0, 20 - overdueTasks * 7);

  // Engagement component (0–15): portal login recency
  let engagement = 0;
  if (row.last_portal_login) {
    const daysSince = (Date.now() - new Date(row.last_portal_login).getTime()) / 86400000;
    if      (daysSince <= 7)  engagement = 15;
    else if (daysSince <= 30) engagement = 10;
    else if (daysSince <= 90) engagement = 5;
  }

  const score = payment + activity + delivery + engagement;
  const breakdown = { payment, activity, delivery, engagement };

  // Persist to clients table (fire-and-forget style — don't let it block)
  await query(
    `UPDATE clients
     SET health_score = $1, health_score_updated_at = NOW(), health_score_breakdown = $2
     WHERE id = $3 AND brand_id = $4`,
    [score, JSON.stringify(breakdown), clientId, brandId]
  );

  return { score, breakdown };
};

const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** GET /api/analytics/:brandId/health-scores — all active clients */
export const getHealthScores = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await verifyBrandAccess(brandId, req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    // Fetch all active clients with their stored score
    const { rows: clients } = await query(
      `SELECT id, name, company, health_score, health_score_updated_at, health_score_breakdown
       FROM clients WHERE brand_id = $1 AND is_active = TRUE ORDER BY name`,
      [brandId]
    );

    // Recalculate stale or missing scores (batched — max 5 concurrent DB queries)
    const results = await batchProcess(clients, async (c) => {
      const isStale = !c.health_score_updated_at ||
        (Date.now() - new Date(c.health_score_updated_at).getTime()) > STALE_MS;

      if (isStale) {
        try {
          const { score, breakdown } = await computeClientHealthScore(c.id, brandId);
          return { id: c.id, name: c.name, company: c.company, health_score: score, health_score_breakdown: breakdown };
        } catch {
          return { id: c.id, name: c.name, company: c.company, health_score: c.health_score, health_score_breakdown: c.health_score_breakdown };
        }
      }
      return { id: c.id, name: c.name, company: c.company, health_score: c.health_score, health_score_breakdown: c.health_score_breakdown };
    }, 5);

    res.json({ status: 'success', data: { scores: results } });
  } catch (error) {
    console.error('Error in getHealthScores - analyticsController.js', error);
    next(error);
  }
};

/** GET /api/analytics/:brandId/health-scores/:clientId — single client, always fresh */
export const getClientHealthScore = async (req, res, next) => {
  try {
    const { brandId, clientId } = req.params;
    if (!await verifyBrandAccess(brandId, req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const { score, breakdown } = await computeClientHealthScore(clientId, brandId);
    res.json({ status: 'success', data: { score, breakdown } });
  } catch (error) {
    console.error('Error in getClientHealthScore - analyticsController.js', error);
    next(error);
  }
};

// ─── Pipeline Deal Scoring ───────────────────────────────────────────────────

/**
 * Compute a 0–100 deal health score for a single pipeline deal.
 * Components:
 *   Momentum    (35) — recency of last update
 *   Completeness(30) — data quality of the deal record
 *   Engagement  (20) — recency of last client activity
 *   Probability (15) — deal probability field
 * Persists result to pipeline_deals.deal_score / deal_score_updated_at.
 */
const computeDealScore = async (dealId, brandId) => {
  const result = await query(
    `SELECT
       pd.updated_at, pd.probability, pd.expected_close_date,
       pd.notes, pd.client_id,
       MAX(a.created_at) AS last_activity_at
     FROM pipeline_deals pd
     LEFT JOIN client_activities a ON a.client_id = pd.client_id AND a.brand_id = $1
     WHERE pd.id = $2 AND pd.brand_id = $1
     GROUP BY pd.updated_at, pd.probability, pd.expected_close_date, pd.notes, pd.client_id`,
    [brandId, dealId]
  );

  if (!result.rows.length) throw new Error('Deal not found');
  const d = result.rows[0];

  const now = Date.now();
  const daysSinceUpdate = (now - new Date(d.updated_at).getTime()) / 86400000;
  const daysSinceActivity = d.last_activity_at
    ? (now - new Date(d.last_activity_at).getTime()) / 86400000
    : 999;

  // Momentum (35)
  let momentum = 0;
  if (daysSinceUpdate <= 7)       momentum = 35;
  else if (daysSinceUpdate <= 14) momentum = 25;
  else if (daysSinceUpdate <= 30) momentum = 15;
  else if (daysSinceUpdate <= 60) momentum = 5;

  // Completeness (30)
  let completeness = 0;
  if (d.expected_close_date) completeness += 10;
  if (d.client_id)           completeness += 10;
  if (d.notes && d.notes.trim().length > 0) completeness += 5;
  const prob = parseInt(d.probability) || 20;
  if (prob !== 20)           completeness += 5;

  // Engagement (20)
  let engagement = 0;
  if (daysSinceActivity <= 7)       engagement = 20;
  else if (daysSinceActivity <= 14) engagement = 12;
  else if (daysSinceActivity <= 30) engagement = 6;

  // Probability (15)
  let probability = 0;
  if (prob >= 80)      probability = 15;
  else if (prob >= 60) probability = 10;
  else if (prob >= 40) probability = 5;

  const score = momentum + completeness + engagement + probability;
  const breakdown = { momentum, completeness, engagement, probability };

  await query(
    `UPDATE pipeline_deals SET deal_score = $1, deal_score_updated_at = NOW() WHERE id = $2`,
    [score, dealId]
  );

  return { score, breakdown };
};

const DEAL_SCORE_STALE_MS = 24 * 60 * 60 * 1000;

/** GET /api/analytics/:brandId/deal-scores — all active deals, 24h TTL cache */
export const getDealScores = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await verifyBrandAccess(brandId, req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const dealsResult = await query(
      `SELECT id, title, deal_score, deal_score_updated_at
       FROM pipeline_deals
       WHERE brand_id = $1 AND is_active = TRUE
         AND stage NOT IN ('won','lost','Won','Lost')`,
      [brandId]
    );

    const results = await batchProcess(dealsResult.rows, async (d) => {
      const isStale = !d.deal_score_updated_at ||
        (Date.now() - new Date(d.deal_score_updated_at).getTime()) > DEAL_SCORE_STALE_MS;
      if (isStale) {
        try {
          const { score, breakdown } = await computeDealScore(d.id, brandId);
          return { id: d.id, title: d.title, deal_score: score, breakdown };
        } catch {
          return { id: d.id, title: d.title, deal_score: d.deal_score, breakdown: null };
        }
      }
      return { id: d.id, title: d.title, deal_score: d.deal_score, breakdown: null };
    }, 5);

    res.json({ status: 'success', data: { scores: results } });
  } catch (error) {
    console.error('Error in getDealScores - analyticsController.js', error);
    next(error);
  }
};

/** GET /api/analytics/:brandId/deal-scores/:dealId — single deal, always fresh */
export const getDealScore = async (req, res, next) => {
  try {
    const { brandId, dealId } = req.params;
    if (!await verifyBrandAccess(brandId, req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const { score, breakdown } = await computeDealScore(dealId, brandId);
    res.json({ status: 'success', data: { score, breakdown } });
  } catch (error) {
    console.error('Error in getDealScore - analyticsController.js', error);
    next(error);
  }
};

// ─── Team Performance ───────────────────────────────────────────────────────

/** GET /api/analytics/:brandId/team-performance */
export const getTeamPerformance = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    if (!await verifyBrandAccess(brandId, req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied.' });
    }

    const { period_start, period_end } = req.query;
    const ps = period_start ? new Date(period_start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const pe = period_end ? new Date(period_end) : new Date();

    // Get all team members for this brand
    const membersRes = await query(
      `SELECT u.id, u.name, u.email, bm.role
       FROM brand_members bm
       JOIN users u ON bm.user_id = u.id
       WHERE bm.brand_id = $1`,
      [brandId]
    );
    const members = membersRes.rows;
    if (!members.length) {
      return res.json({ status: 'success', data: { members: [], totals: {} } });
    }

    const memberIds = members.map(m => m.id);

    // Run all aggregation queries in parallel
    const [revenueRes, hoursRes, tasksRes, activitiesRes] = await Promise.all([
      // Revenue won (pipeline deals assigned_to)
      query(
        `SELECT assigned_to AS user_id,
           COUNT(*) AS deals_won,
           COALESCE(SUM(value), 0) AS revenue_won
         FROM pipeline_deals
         WHERE brand_id = $1 AND stage = 'closed_won'
           AND assigned_to = ANY($2)
           AND updated_at BETWEEN $3 AND $4
         GROUP BY assigned_to`,
        [brandId, memberIds, ps, pe]
      ),
      // Hours tracked
      query(
        `SELECT user_id,
           ROUND(COALESCE(SUM(duration_minutes) / 60.0, 0)::numeric, 1) AS hours_tracked,
           COALESCE(SUM(billable_amount), 0) AS billable_amount
         FROM time_entries
         WHERE brand_id = $1 AND user_id = ANY($2)
           AND start_time BETWEEN $3 AND $4
         GROUP BY user_id`,
        [brandId, memberIds, ps, pe]
      ),
      // Tasks completed + overdue
      query(
        `SELECT assigned_to AS user_id,
           COUNT(*) FILTER (WHERE status = 'completed') AS tasks_completed,
           COUNT(*) FILTER (WHERE status != 'completed' AND due_date < NOW()) AS tasks_overdue,
           COUNT(*) AS total_tasks
         FROM tasks
         WHERE brand_id = $1 AND assigned_to = ANY($2)
           AND created_at BETWEEN $3 AND $4
         GROUP BY assigned_to`,
        [brandId, memberIds, ps, pe]
      ),
      // Activities logged
      query(
        `SELECT created_by AS user_id, COUNT(*) AS activities_logged
         FROM client_activities
         WHERE brand_id = $1 AND created_by = ANY($2)
           AND created_at BETWEEN $3 AND $4
         GROUP BY created_by`,
        [brandId, memberIds, ps, pe]
      ),
    ]);

    // Build lookup maps
    const revenueMap = Object.fromEntries(revenueRes.rows.map(r => [r.user_id, r]));
    const hoursMap = Object.fromEntries(hoursRes.rows.map(r => [r.user_id, r]));
    const tasksMap = Object.fromEntries(tasksRes.rows.map(r => [r.user_id, r]));
    const activityMap = Object.fromEntries(activitiesRes.rows.map(r => [r.user_id, r]));

    const result = members.map(m => ({
      user_id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      revenue_won: parseFloat(revenueMap[m.id]?.revenue_won || 0),
      deals_won: parseInt(revenueMap[m.id]?.deals_won || 0),
      hours_tracked: parseFloat(hoursMap[m.id]?.hours_tracked || 0),
      billable_amount: parseFloat(hoursMap[m.id]?.billable_amount || 0),
      tasks_completed: parseInt(tasksMap[m.id]?.tasks_completed || 0),
      tasks_overdue: parseInt(tasksMap[m.id]?.tasks_overdue || 0),
      activities_logged: parseInt(activityMap[m.id]?.activities_logged || 0),
    }));

    const totals = {
      revenue_won: result.reduce((s, r) => s + r.revenue_won, 0),
      deals_won: result.reduce((s, r) => s + r.deals_won, 0),
      hours_tracked: result.reduce((s, r) => s + r.hours_tracked, 0),
      tasks_completed: result.reduce((s, r) => s + r.tasks_completed, 0),
      activities_logged: result.reduce((s, r) => s + r.activities_logged, 0),
    };

    res.json({ status: 'success', data: { members: result, totals } });
  } catch (error) {
    console.error('Error in getTeamPerformance - analyticsController.js', error);
    next(error);
  }
};
