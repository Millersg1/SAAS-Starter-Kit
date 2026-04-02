import { query } from '../config/database.js';
import * as brandModel from '../models/brandModel.js';

/**
 * List expenses for a brand
 * @route GET /api/expenses/:brandId
 */
export const listExpenses = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({ status: 'fail', message: 'You do not have access to this brand' });
    }

    const { project_id, client_id, category, date_from, date_to, billable, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT e.*, u.name AS created_by_name
      FROM expenses e
      LEFT JOIN users u ON u.id = e.created_by
      WHERE e.brand_id = $1
    `;
    const params = [brandId];
    let idx = 2;

    if (project_id) {
      sql += ` AND e.project_id = $${idx++}`;
      params.push(project_id);
    }
    if (client_id) {
      sql += ` AND e.client_id = $${idx++}`;
      params.push(client_id);
    }
    if (category) {
      sql += ` AND e.category = $${idx++}`;
      params.push(category);
    }
    if (date_from) {
      sql += ` AND e.date >= $${idx++}`;
      params.push(date_from);
    }
    if (date_to) {
      sql += ` AND e.date <= $${idx++}`;
      params.push(date_to);
    }
    if (billable !== undefined) {
      sql += ` AND e.billable = $${idx++}`;
      params.push(billable === 'true');
    }

    sql += ` ORDER BY e.date DESC, e.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // Total count for pagination
    let countSql = `SELECT COUNT(*)::int AS total FROM expenses WHERE brand_id = $1`;
    const countParams = [brandId];
    let cIdx = 2;

    if (project_id) { countSql += ` AND project_id = $${cIdx++}`; countParams.push(project_id); }
    if (client_id) { countSql += ` AND client_id = $${cIdx++}`; countParams.push(client_id); }
    if (category) { countSql += ` AND category = $${cIdx++}`; countParams.push(category); }
    if (date_from) { countSql += ` AND date >= $${cIdx++}`; countParams.push(date_from); }
    if (date_to) { countSql += ` AND date <= $${cIdx++}`; countParams.push(date_to); }
    if (billable !== undefined) { countSql += ` AND billable = $${cIdx++}`; countParams.push(billable === 'true'); }

    const countResult = await query(countSql, countParams);

    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: {
        expenses: result.rows,
        total: countResult.rows[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new expense
 * @route POST /api/expenses/:brandId
 */
export const createExpense = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({ status: 'fail', message: 'You do not have access to this brand' });
    }

    const { description, amount, currency, category, date, project_id, client_id, receipt_url, billable } = req.body;

    if (!description || amount === undefined) {
      return res.status(400).json({ status: 'fail', message: 'Description and amount are required' });
    }

    if (parseFloat(amount) < 0) {
      return res.status(400).json({ status: 'fail', message: 'Amount must be non-negative' });
    }

    const result = await query(
      `INSERT INTO expenses (brand_id, description, amount, currency, category, date, project_id, client_id, receipt_url, billable, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        brandId,
        description,
        parseFloat(amount),
        currency || 'USD',
        category || null,
        date || new Date().toISOString().split('T')[0],
        project_id || null,
        client_id || null,
        receipt_url || null,
        billable !== undefined ? billable : false,
        userId,
      ]
    );

    res.status(201).json({
      status: 'success',
      message: 'Expense created successfully',
      data: { expense: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single expense
 * @route GET /api/expenses/:brandId/:expenseId
 */
export const getExpense = async (req, res, next) => {
  try {
    const { brandId, expenseId } = req.params;
    const userId = req.user.id;

    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({ status: 'fail', message: 'You do not have access to this brand' });
    }

    const result = await query(
      `SELECT e.*, u.name AS created_by_name
       FROM expenses e
       LEFT JOIN users u ON u.id = e.created_by
       WHERE e.id = $1 AND e.brand_id = $2`,
      [expenseId, brandId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Expense not found' });
    }

    res.status(200).json({
      status: 'success',
      data: { expense: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an expense
 * @route PATCH /api/expenses/:brandId/:expenseId
 */
export const updateExpense = async (req, res, next) => {
  try {
    const { brandId, expenseId } = req.params;
    const userId = req.user.id;

    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({ status: 'fail', message: 'You do not have access to this brand' });
    }

    // Verify expense exists and belongs to brand
    const existing = await query(
      `SELECT id FROM expenses WHERE id = $1 AND brand_id = $2`,
      [expenseId, brandId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Expense not found' });
    }

    const { description, amount, currency, category, date, project_id, client_id, receipt_url, billable } = req.body;

    if (amount !== undefined && parseFloat(amount) < 0) {
      return res.status(400).json({ status: 'fail', message: 'Amount must be non-negative' });
    }

    // Build dynamic UPDATE
    const fields = [];
    const params = [];
    let idx = 1;

    if (description !== undefined) { fields.push(`description = $${idx++}`); params.push(description); }
    if (amount !== undefined) { fields.push(`amount = $${idx++}`); params.push(parseFloat(amount)); }
    if (currency !== undefined) { fields.push(`currency = $${idx++}`); params.push(currency); }
    if (category !== undefined) { fields.push(`category = $${idx++}`); params.push(category); }
    if (date !== undefined) { fields.push(`date = $${idx++}`); params.push(date); }
    if (project_id !== undefined) { fields.push(`project_id = $${idx++}`); params.push(project_id || null); }
    if (client_id !== undefined) { fields.push(`client_id = $${idx++}`); params.push(client_id || null); }
    if (receipt_url !== undefined) { fields.push(`receipt_url = $${idx++}`); params.push(receipt_url || null); }
    if (billable !== undefined) { fields.push(`billable = $${idx++}`); params.push(billable); }

    if (fields.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'No fields to update' });
    }

    fields.push(`updated_at = NOW()`);
    params.push(expenseId, brandId);

    const result = await query(
      `UPDATE expenses SET ${fields.join(', ')} WHERE id = $${idx++} AND brand_id = $${idx} RETURNING *`,
      params
    );

    res.status(200).json({
      status: 'success',
      message: 'Expense updated successfully',
      data: { expense: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an expense
 * @route DELETE /api/expenses/:brandId/:expenseId
 */
export const deleteExpense = async (req, res, next) => {
  try {
    const { brandId, expenseId } = req.params;
    const userId = req.user.id;

    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({ status: 'fail', message: 'You do not have access to this brand' });
    }

    const result = await query(
      `DELETE FROM expenses WHERE id = $1 AND brand_id = $2 RETURNING id`,
      [expenseId, brandId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Expense not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get expense statistics
 * @route GET /api/expenses/:brandId/stats
 */
export const getExpenseStats = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({ status: 'fail', message: 'You do not have access to this brand' });
    }

    // Total expenses
    const totalResult = await query(
      `SELECT
         COUNT(*)::int AS total_count,
         COALESCE(SUM(amount), 0)::numeric AS total_amount
       FROM expenses
       WHERE brand_id = $1`,
      [brandId]
    );

    // By category
    const categoryResult = await query(
      `SELECT
         COALESCE(category, 'uncategorized') AS category,
         COUNT(*)::int AS count,
         COALESCE(SUM(amount), 0)::numeric AS total
       FROM expenses
       WHERE brand_id = $1
       GROUP BY category
       ORDER BY total DESC`,
      [brandId]
    );

    // Billable vs non-billable
    const billableResult = await query(
      `SELECT
         billable,
         COUNT(*)::int AS count,
         COALESCE(SUM(amount), 0)::numeric AS total
       FROM expenses
       WHERE brand_id = $1
       GROUP BY billable`,
      [brandId]
    );

    const billableSummary = { billable: { count: 0, total: 0 }, non_billable: { count: 0, total: 0 } };
    for (const row of billableResult.rows) {
      if (row.billable) {
        billableSummary.billable = { count: row.count, total: parseFloat(row.total) };
      } else {
        billableSummary.non_billable = { count: row.count, total: parseFloat(row.total) };
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          total_count: totalResult.rows[0]?.total_count || 0,
          total_amount: parseFloat(totalResult.rows[0]?.total_amount || 0),
          by_category: categoryResult.rows.map(r => ({ ...r, total: parseFloat(r.total) })),
          ...billableSummary,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get project profitability (revenue from invoices vs expenses)
 * @route GET /api/expenses/:brandId/project/:projectId/profitability
 */
export const getProjectProfitability = async (req, res, next) => {
  try {
    const { brandId, projectId } = req.params;
    const userId = req.user.id;

    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({ status: 'fail', message: 'You do not have access to this brand' });
    }

    // Revenue: sum of paid invoice amounts for this project
    const revenueResult = await query(
      `SELECT
         COUNT(*)::int AS invoice_count,
         COALESCE(SUM(i.total_amount), 0)::numeric AS total_revenue
       FROM invoices i
       WHERE i.brand_id = $1
         AND i.project_id = $2
         AND i.status IN ('paid', 'partially_paid')`,
      [brandId, projectId]
    );

    // Expenses: sum of expenses for this project
    const expenseResult = await query(
      `SELECT
         COUNT(*)::int AS expense_count,
         COALESCE(SUM(e.amount), 0)::numeric AS total_expenses,
         COALESCE(SUM(e.amount) FILTER (WHERE e.billable = TRUE), 0)::numeric AS billable_expenses,
         COALESCE(SUM(e.amount) FILTER (WHERE e.billable = FALSE), 0)::numeric AS non_billable_expenses
       FROM expenses e
       WHERE e.brand_id = $1
         AND e.project_id = $2`,
      [brandId, projectId]
    );

    const revenue = parseFloat(revenueResult.rows[0]?.total_revenue || 0);
    const expenses = parseFloat(expenseResult.rows[0]?.total_expenses || 0);
    const profit = revenue - expenses;
    const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        profitability: {
          project_id: projectId,
          revenue: {
            invoice_count: revenueResult.rows[0]?.invoice_count || 0,
            total: revenue,
          },
          expenses: {
            expense_count: expenseResult.rows[0]?.expense_count || 0,
            total: expenses,
            billable: parseFloat(expenseResult.rows[0]?.billable_expenses || 0),
            non_billable: parseFloat(expenseResult.rows[0]?.non_billable_expenses || 0),
          },
          profit,
          margin: parseFloat(margin),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
