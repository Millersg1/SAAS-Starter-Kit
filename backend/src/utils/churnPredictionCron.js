import { query } from '../config/database.js';
import { computeClientHealthScore } from '../controllers/analyticsController.js';
import { triggerWorkflow } from './workflowEngine.js';

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

const runChurnPrediction = async () => {
  try {
    // Get all brands
    const brandsRes = await query(`SELECT id FROM brands WHERE is_active = TRUE`);
    for (const brand of brandsRes.rows) {
      try {
        // Get all active clients for this brand
        const clientsRes = await query(
          `SELECT id, name FROM clients WHERE brand_id = $1 AND is_active = TRUE`,
          [brand.id]
        );

        for (const client of clientsRes.rows) {
          try {
            const { probability, riskFactors, trend } = await computeChurnProbability(client.id, brand.id);

            // Upsert prediction
            const existing = await query(
              `SELECT auto_action_taken FROM churn_predictions WHERE brand_id = $1 AND client_id = $2`,
              [brand.id, client.id]
            );

            if (existing.rows.length > 0) {
              await query(
                `UPDATE churn_predictions
                 SET churn_probability = $1, risk_factors = $2, health_score_trend = $3, predicted_at = NOW(),
                     auto_action_taken = CASE WHEN $1 < 70 THEN FALSE ELSE auto_action_taken END
                 WHERE brand_id = $4 AND client_id = $5`,
                [probability, JSON.stringify(riskFactors), JSON.stringify(trend), brand.id, client.id]
              );

              // Trigger workflow if newly high-risk and action not yet taken
              if (probability >= 70 && !existing.rows[0].auto_action_taken) {
                try {
                  await triggerWorkflow(brand.id, 'churn_risk', client.id, 'client');
                } catch { /* workflow may not exist */ }

                // Create notification
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
                } catch { /* non-critical */ }

                await query(
                  `UPDATE churn_predictions SET auto_action_taken = TRUE WHERE brand_id = $1 AND client_id = $2`,
                  [brand.id, client.id]
                );
              }
            } else {
              await query(
                `INSERT INTO churn_predictions (brand_id, client_id, churn_probability, risk_factors, health_score_trend)
                 VALUES ($1, $2, $3, $4, $5)`,
                [brand.id, client.id, probability, JSON.stringify(riskFactors), JSON.stringify(trend)]
              );

              // Trigger workflow for newly detected high-risk
              if (probability >= 70) {
                try {
                  await triggerWorkflow(brand.id, 'churn_risk', client.id, 'client');
                } catch { /* workflow may not exist */ }

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
                } catch { /* non-critical */ }

                await query(
                  `UPDATE churn_predictions SET auto_action_taken = TRUE WHERE brand_id = $1 AND client_id = $2`,
                  [brand.id, client.id]
                );
              }
            }
          } catch (err) {
            console.error(`Churn prediction failed for client ${client.id}:`, err.message);
          }
        }
      } catch (err) {
        console.error(`Churn prediction failed for brand ${brand.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Churn prediction cron error:', err.message);
  }
};

export const startChurnPredictionCron = () => {
  // Run every 24 hours
  setInterval(runChurnPrediction, 24 * 60 * 60 * 1000);
  // Also run once 30 seconds after startup
  setTimeout(runChurnPrediction, 30000);
  console.log('🔮 Churn prediction cron started (every 24 hours)');
};
