import { query } from '../config/database.js';
import { getBrandMember } from '../models/brandModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';
import { sendSurveyEmail } from '../utils/emailUtils.js';

const assertBrandAccess = async (brandId, userId, next) => {
  const member = await getBrandMember(brandId, userId);
  if (!member) {
    next(new AppError('You do not have access to this brand', 403));
    return false;
  }
  return true;
};

/** GET /api/surveys/:brandId */
export const listSurveys = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `SELECT
       s.*,
       COUNT(DISTINCT sr.id)::int AS response_count,
       ROUND(AVG(sr.score), 1) AS avg_score
     FROM surveys s
     LEFT JOIN survey_responses sr ON sr.survey_id = s.id
     WHERE s.brand_id = $1
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [brandId]
  );

  res.json({ status: 'success', data: { surveys: result.rows } });
});

/** POST /api/surveys/:brandId */
export const createSurvey = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { name, type = 'nps', question, send_trigger = 'manual', delay_days = 1 } = req.body;
  if (!name || !question) return next(new AppError('name and question are required', 400));

  const result = await query(
    `INSERT INTO surveys (brand_id, name, type, question, send_trigger, delay_days)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [brandId, name, type, question, send_trigger, delay_days]
  );

  res.status(201).json({ status: 'success', data: { survey: result.rows[0] } });
});

/** PATCH /api/surveys/:brandId/:id */
export const updateSurvey = catchAsync(async (req, res, next) => {
  const { brandId, id } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { name, question, send_trigger, delay_days, is_active } = req.body;
  const result = await query(
    `UPDATE surveys
     SET name = COALESCE($1, name),
         question = COALESCE($2, question),
         send_trigger = COALESCE($3, send_trigger),
         delay_days = COALESCE($4, delay_days),
         is_active = COALESCE($5, is_active)
     WHERE id = $6 AND brand_id = $7 RETURNING *`,
    [name, question, send_trigger, delay_days, is_active, id, brandId]
  );
  if (!result.rows.length) return next(new AppError('Survey not found', 404));
  res.json({ status: 'success', data: { survey: result.rows[0] } });
});

/** DELETE /api/surveys/:brandId/:id */
export const deleteSurvey = catchAsync(async (req, res, next) => {
  const { brandId, id } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  await query(`DELETE FROM surveys WHERE id = $1 AND brand_id = $2`, [id, brandId]);
  res.json({ status: 'success', data: null });
});

/** POST /api/surveys/:brandId/:id/send */
export const sendSurveyToClient = catchAsync(async (req, res, next) => {
  const { brandId, id } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const { client_id } = req.body;
  if (!client_id) return next(new AppError('client_id is required', 400));

  const [surveyRes, clientRes, brandRes] = await Promise.all([
    query(`SELECT * FROM surveys WHERE id = $1 AND brand_id = $2 AND is_active = TRUE`, [id, brandId]),
    query(`SELECT id, name, email FROM clients WHERE id = $1 AND brand_id = $2`, [client_id, brandId]),
    query(`SELECT name FROM brands WHERE id = $1`, [brandId]),
  ]);

  const survey = surveyRes.rows[0];
  const client = clientRes.rows[0];
  const brand = brandRes.rows[0];

  if (!survey) return next(new AppError('Survey not found or inactive', 404));
  if (!client) return next(new AppError('Client not found', 404));

  const sendRes = await query(
    `INSERT INTO survey_sends (survey_id, brand_id, client_id) VALUES ($1, $2, $3) RETURNING *`,
    [id, brandId, client_id]
  );
  const send = sendRes.rows[0];

  if (client.email) {
    sendSurveyEmail(
      client.email, client.name, send.token,
      survey.question, survey.type, brand?.name || 'Your Agency'
    ).catch(err => console.error('Survey email error:', err));
  }

  res.status(201).json({ status: 'success', data: { send } });
});

/** GET /api/surveys/:brandId/:id/responses */
export const getSurveyResponses = catchAsync(async (req, res, next) => {
  const { brandId, id } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const result = await query(
    `SELECT sr.*, c.name AS client_name, c.company AS client_company
     FROM survey_responses sr
     LEFT JOIN clients c ON c.id = sr.client_id
     WHERE sr.survey_id = $1 AND sr.brand_id = $2
     ORDER BY sr.responded_at DESC`,
    [id, brandId]
  );

  res.json({ status: 'success', data: { responses: result.rows } });
});

/** GET /api/surveys/:brandId/:id/stats */
export const getSurveyStats = catchAsync(async (req, res, next) => {
  const { brandId, id } = req.params;
  if (!await assertBrandAccess(brandId, req.user.id, next)) return;

  const [statsRes, sendsRes] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int AS total_responses,
         ROUND(AVG(score), 1) AS avg_score,
         COUNT(*) FILTER (WHERE score >= 9)::int AS promoters,
         COUNT(*) FILTER (WHERE score BETWEEN 7 AND 8)::int AS passives,
         COUNT(*) FILTER (WHERE score <= 6)::int AS detractors
       FROM survey_responses WHERE survey_id = $1 AND brand_id = $2`,
      [id, brandId]
    ),
    query(`SELECT COUNT(*)::int AS total_sent FROM survey_sends WHERE survey_id = $1`, [id]),
  ]);

  const s = statsRes.rows[0];
  const totalSent = sendsRes.rows[0]?.total_sent || 0;
  const totalResponses = s.total_responses || 0;
  const promoterPct = totalResponses > 0 ? (s.promoters / totalResponses) * 100 : 0;
  const detractorPct = totalResponses > 0 ? (s.detractors / totalResponses) * 100 : 0;
  const npsScore = Math.round(promoterPct - detractorPct);

  res.json({
    status: 'success',
    data: {
      nps_score: npsScore,
      avg_score: parseFloat(s.avg_score) || 0,
      total_responses: totalResponses,
      total_sent: totalSent,
      response_rate: totalSent > 0 ? Math.round((totalResponses / totalSent) * 100) : 0,
      promoters: s.promoters,
      passives: s.passives,
      detractors: s.detractors,
    },
  });
});

/** GET /api/public/survey/:token — no auth, returns survey question + client name */
export const handlePublicSurveyView = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  const result = await query(
    `SELECT ss.id, ss.is_responded, ss.client_id,
            s.question, s.type, s.name AS survey_name,
            c.name AS client_name, b.name AS brand_name
     FROM survey_sends ss
     JOIN surveys s ON s.id = ss.survey_id
     LEFT JOIN clients c ON c.id = ss.client_id
     LEFT JOIN brands b ON b.id = s.brand_id
     WHERE ss.token = $1`,
    [token]
  );

  const row = result.rows[0];
  if (!row) return next(new AppError('Survey not found', 404));
  if (row.is_responded) {
    return res.json({ status: 'success', data: { already_responded: true } });
  }

  res.json({
    status: 'success',
    data: {
      question: row.question,
      type: row.type,
      client_name: row.client_name,
      brand_name: row.brand_name,
      already_responded: false,
    },
  });
});

/** POST /api/public/survey/:token — no auth, records response */
export const handlePublicSurveySubmit = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { score, comment } = req.body;

  if (score === undefined || score === null) return next(new AppError('score is required', 400));

  const sendResult = await query(
    `SELECT ss.*, s.brand_id, s.id AS survey_id
     FROM survey_sends ss JOIN surveys s ON s.id = ss.survey_id
     WHERE ss.token = $1`,
    [token]
  );

  const send = sendResult.rows[0];
  if (!send) return next(new AppError('Survey not found', 404));
  if (send.is_responded) return next(new AppError('Already responded', 409));

  await Promise.all([
    query(
      `INSERT INTO survey_responses (survey_id, survey_send_id, brand_id, client_id, score, comment)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [send.survey_id, send.id, send.brand_id, send.client_id, score, comment || null]
    ),
    query(
      `UPDATE survey_sends SET is_responded = TRUE, responded_at = NOW() WHERE id = $1`,
      [send.id]
    ),
  ]);

  res.json({ status: 'success', data: { message: 'Thank you for your feedback!' } });
});

/**
 * Internal helper: find active surveys matching a trigger and send to client.
 * Call fire-and-forget from project/invoice controllers.
 */
export const triggerSurveyForEvent = async (event, brandId, clientId) => {
  try {
    const surveys = await query(
      `SELECT * FROM surveys WHERE brand_id = $1 AND send_trigger = $2 AND is_active = TRUE`,
      [brandId, event]
    );
    if (!surveys.rows.length) return;

    const [clientRes, brandRes] = await Promise.all([
      query(`SELECT id, name, email FROM clients WHERE id = $1`, [clientId]),
      query(`SELECT name FROM brands WHERE id = $1`, [brandId]),
    ]);
    const client = clientRes.rows[0];
    const brand = brandRes.rows[0];
    if (!client) return;

    for (const survey of surveys.rows) {
      const sendRes = await query(
        `INSERT INTO survey_sends (survey_id, brand_id, client_id) VALUES ($1, $2, $3) RETURNING *`,
        [survey.id, brandId, clientId]
      );
      const send = sendRes.rows[0];
      if (client.email) {
        sendSurveyEmail(
          client.email, client.name, send.token,
          survey.question, survey.type, brand?.name || 'Your Agency'
        ).catch(err => console.error('Auto-trigger survey email error:', err));
      }
    }
  } catch (err) {
    console.error('triggerSurveyForEvent error:', err.message);
  }
};
