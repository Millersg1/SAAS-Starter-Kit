import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  listSurveys,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  sendSurveyToClient,
  getSurveyResponses,
  getSurveyStats,
} from '../controllers/surveyController.js';

const router = express.Router();
router.use(protect);

router.get('/:brandId',                      listSurveys);
router.post('/:brandId',                     createSurvey);
router.patch('/:brandId/:id',                updateSurvey);
router.delete('/:brandId/:id',               deleteSurvey);
router.post('/:brandId/:id/send',            sendSurveyToClient);
router.get('/:brandId/:id/responses',        getSurveyResponses);
router.get('/:brandId/:id/stats',            getSurveyStats);

export default router;
