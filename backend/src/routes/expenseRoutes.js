import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as expenseController from '../controllers/expenseController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Expense stats (must be before /:brandId/:expenseId to avoid conflict)
router.get('/:brandId/stats', expenseController.getExpenseStats);

// Project profitability
router.get('/:brandId/project/:projectId/profitability', expenseController.getProjectProfitability);

// CRUD routes
router.get('/:brandId', expenseController.listExpenses);
router.post('/:brandId', expenseController.createExpense);
router.get('/:brandId/:expenseId', expenseController.getExpense);
router.patch('/:brandId/:expenseId', expenseController.updateExpense);
router.delete('/:brandId/:expenseId', expenseController.deleteExpense);

export default router;
