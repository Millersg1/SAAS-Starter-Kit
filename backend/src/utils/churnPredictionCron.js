import { query } from '../config/database.js';
import { computeClientHealthScore } from '../controllers/analyticsController.js';
import { triggerWorkflow } from './workflowEngine.js';
import { batchProcess } from './batchProcess.js';
import { logError } from './errorMonitor.js';

const computeChurnProbability = async (clientId, brandId) => {
  // 1. Get current health score
  const { score, breakdown } = await computeClientHealthScore(clientId, brandId);

  // 2. Get health score trend (last 5 stored values from client_health_scores if available)
  let trend = [];
  try {
    const trendRes = await query(
      `SELECT score, calculated_at FROM client_health_scores
       WHERE brand_id = $1 AND client_id = $2
       ORDER BY calculated_at DESC LIMIT 5`,
      [brandId, clientId]
    );
    trend = trendRes.rows.reverse().map(r => ({ score: r.score, date: r.calculated_at }));
  } catch { /* table may not exist */ }

  // If no historical data, use clients table
  if (trend.length === 0) {
    trend = [{ score, date: new Date().toISOString() }];
  }

  // 3. Compute trend direction (-1 declining, 0 stable, +1 improving)
  let trendScore = 0;
  if (trend.length >= 2) {
    const first = trend[0].score;
    const last = trend[trend.length - 1].score;
    const diff = last - first;
    if (diff < -15) trendScore = -2;      // steep decline
    else if (diff < -5) trendScore = -1;  // declining
    else if (diff > 10) trendScore = 1;   // improving
  }

  // 4. Get inactivity days
  const actRes = await query(
    `SELECT MAX(created_at) AS last_activity FROM client_activities
     WHERE brand_id = $1 AND client_id = $2`,
    [brandId, clientId]
  );
  const lastActivity = actRes.rows[0]?.last_activity;
  const inactivityDays = lastActivity
    ? (Date.now() - new Date(lastActivity).getTime()) / 86400000
    : 999;

  // 5. Get overdue invoice ratio
  const invRes = await query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'overdue') AS overdue
     FROM invoices WHERE brand_id = $1 AND client_id = $2`,
    [brandId, clientId]
  );
  const totalInv = parseInt(invRes.rows[0]?.total || 0);
  const overdueInv = parseInt(invRes.rows[0]?.overdue || 0);
  const overdueRatio = totalInv > 0 ? overdueInv / totalInv : 0;

  // 6. Compute churn probability (0–100)
  // Health component (40%): invert score
  const healthComponent = ((100 - score) / 100) * 40;

  // Trend component (30%): amplify if declining
  let trendComponent = 15; // neutral baseline
  if (trendScore === -2) trendComponent = 30;
  else if (trendScore === -1) trendComponent = 22;
  else if (trendScore === 0) trendComponent = 12;
  else if (trendScore === 1) trendComponent = 5;

  // Inactivity component (15%)
  let inactivityComponent = 0;
  if (inactivityDays > 90) inactivityComponent = 15;
  else if (inactivityDays > 60) inactivityComponent = 12;
  else if (inactivityDays > 30) inactivityComponent = 8;
  else if (inactivityDays > 14) inactivityComponent = 4;

  // Payment risk (15%)
  const paymentComponent = Math.min(15, Math.round(overdueRatio * 15 + overdueInv * 3));

  const probability = Math.min(100, Math.max(0, Math.round(
    healthComponent + trendComponent + inactivityComponent + paymentComponent
  )));

  const riskFactors = {
    health_score: score,
    health_breakdown: breakdown,
    trend_direction: trendScore < 0 ? 'declining' : trendScore > 0 ? 'improving' : 'stable',
    inactivity_days: Math.round(inactivityDays),
    overdue_invoices: overdueInv,
    overdue_ratio: Math.round(overdueRatio * 100),
    components: {
      health: Math.round(healthComponent),
      trend: trendComponent,
      inactivity: inactivityComponent,
      payment: paymentComponent,
    },
  };

  return { probability, riskFactors, trend };
};

let churnRunning = false;
let churnStartedAt = null;
const CHURN_MAX_DURATION = 30 * 60 * 1000; // 30 minute max runtime

const runChurnPrediction = async () => {
  // Stale-lock release: if previous run has been stuck for over 30 minutes, reset
  if (churnRunning && churnStartedAt && (Date.now() - churnStartedAt > CHURN_MAX_DURATION)) {
    console.warn('[ChurnCron] Previous run exceeded max duration — releasing stale lock');
    churnRunning = false;
  }
  if (churnRunning) return;
  churnRunning = true;
  churnStartedAt = Date.now();
  try {
    // Get all brands
    const brandsRes = await query(`SELECT id FROM brands WHERE is_active = TRUE`);
    for (const brand of brandsRes.rows) {
      try {
        // Get all active clients for this brand
        const clientsRes = await query(
          `SELECT id, name FROM clients WHERE brand_id = $1 AND is_active = TRUE LIMIT 5000`,
          [brand.id]
        );

        // Process clients in batches of 3 to limit concurrent DB load
        await batchProcess(clientsRes.rows, async (client) => {
          try {
            const { probability, riskFactors, trend } = await computeChurnProbability(client.id, brand.id);

            // Atomic upsert — eliminates TOCTOU race between SELECT and UPDATE/INSERT
            const upsertRes = await query(
              `INSERT INTO churn_predictions (brand_id, client_id, churn_probability, risk_factors, health_score_trend)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (brand_id, client_id) DO UPDATE SET
                 churn_probability = $3,
                 risk_factors = $4,
                 health_score_trend = $5,
                 predicted_at = NOW(),
                 auto_action_taken = CASE WHEN $3 < 70 THEN FALSE ELSE churn_predictions.auto_action_taken END
               RETURNING auto_action_taken`,
              [brand.id, client.id, probability, JSON.stringify(riskFactors), JSON.stringify(trend)]
            );

            const actionTaken = upsertRes.rows[0]?.auto_action_taken;

            // Trigger workflow if high-risk and action not yet taken
            if (probability >= 70 && !actionTaken) {
              try {
                await triggerWorkflow(brand.id, 'churn_risk', client.id, 'client');
              } catch (wfErr) { logError(wfErr, { context: 'churnCron.workflow', brandId: brand.id, clientId: client.id }); }

              try {
                await query(
                  `INSERT INTO notifications (brand_id, type, title, message, metadata)
                   VALUES ($1, 'churn_alert', $2, $3, $4)`,
                  [
                    brand.id,
                    `Churn Risk: ${client.name}`,
                    `${client.name} has a ${probability}% churn probability. Review their account and consider a win-back campaign.`,
                    JSON.stringify({ client_id: client.id, churn_probability: probability }),
                  ]
                );
              } catch (notifErr) { logError(notifErr, { context: 'churnCron.notification', brandId: brand.id, clientId: client.id }); }

              await query(
                `UPDATE churn_predictions SET auto_action_taken = TRUE WHERE brand_id = $1 AND client_id = $2`,
                [brand.id, client.id]
              );
            }
          } catch (err) {
            logError(err, { context: 'churnCron.client', clientId: client.id, brandId: brand.id });
          }
        }, 3);
      } catch (err) {
        logError(err, { context: 'churnCron.brand', brandId: brand.id });
      }
    }
  } catch (err) {
    logError(err, { context: 'churnCron.main' });
  } finally {
    churnRunning = false;
  }
};

export const startChurnPredictionCron = () => {
  // Run every 24 hours — return interval ID for graceful shutdown
  const intervalId = setInterval(runChurnPrediction, 24 * 60 * 60 * 1000);
  // Also run once 30 seconds after startup
  setTimeout(runChurnPrediction, 30000);
  console.log('🔮 Churn prediction cron started (every 24 hours)');
  return intervalId;
};
