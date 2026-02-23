import { query } from '../config/database.js';

// GET /api/superadmin/stats
export const getStats = async (req, res) => {
  try {
    const [users, brands, subscriptions, revenue] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`),
      query(`SELECT COUNT(*) as count FROM brands WHERE is_active = TRUE`),
      query(`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`),
      query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status = 'completed'`),
    ]);

    const recentUsers = await query(
      `SELECT id, name, email, role, is_active, is_superadmin, email_verified, last_login, created_at
       FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 10`
    );

    res.json({
      status: 'success',
      data: {
        stats: {
          total_users: parseInt(users.rows[0].count),
          total_brands: parseInt(brands.rows[0].count),
          active_subscriptions: parseInt(subscriptions.rows[0].count),
          total_revenue: parseFloat(revenue.rows[0].total),
        },
        recent_users: recentUsers.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// GET /api/superadmin/users
export const getAllUsers = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.is_superadmin,
              u.email_verified, u.last_login, u.created_at,
              COUNT(DISTINCT bm.brand_id) as brand_count
       FROM users u
       LEFT JOIN brand_members bm ON bm.user_id = u.id AND bm.is_active = TRUE
       WHERE u.deleted_at IS NULL
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json({ status: 'success', data: { users: result.rows } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// PATCH /api/superadmin/users/:id
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, email_verified, is_superadmin, role } = req.body;

    const fields = [];
    const values = [];
    let i = 1;

    if (is_active !== undefined)      { fields.push(`is_active = $${i++}`);      values.push(is_active); }
    if (email_verified !== undefined) { fields.push(`email_verified = $${i++}`); values.push(email_verified); }
    if (is_superadmin !== undefined)  { fields.push(`is_superadmin = $${i++}`);  values.push(is_superadmin); }
    if (role !== undefined)           { fields.push(`role = $${i++}`);           values.push(role); }

    if (fields.length === 0) return res.status(400).json({ status: 'fail', message: 'No fields to update.' });

    values.push(id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, name, email, role, is_active, is_superadmin, email_verified`,
      values
    );

    res.json({ status: 'success', data: { user: result.rows[0] } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// DELETE /api/superadmin/users/:id
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ status: 'fail', message: 'Cannot delete yourself.' });
    await query(`DELETE FROM users WHERE id = $1`, [id]);
    res.json({ status: 'success', message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// GET /api/superadmin/brands
export const getAllBrands = async (req, res) => {
  try {
    const result = await query(
      `SELECT b.id, b.name, b.slug, b.is_active, b.created_at,
              u.email as owner_email, u.name as owner_name,
              COUNT(DISTINCT bm.user_id) as member_count
       FROM brands b
       LEFT JOIN users u ON u.id = b.owner_id
       LEFT JOIN brand_members bm ON bm.brand_id = b.id AND bm.is_active = TRUE
       GROUP BY b.id, u.email, u.name
       ORDER BY b.created_at DESC`
    );
    res.json({ status: 'success', data: { brands: result.rows } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// DELETE /api/superadmin/brands/:id
export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM brands WHERE id = $1`, [id]);
    res.json({ status: 'success', message: 'Brand deleted.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// GET /api/superadmin/subscriptions
export const getAllSubscriptions = async (req, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.status, sp.price as amount, sp.name as plan_name,
              sp.billing_interval, s.current_period_end, s.trial_end,
              s.created_at, b.name as brand_name
       FROM subscriptions s
       LEFT JOIN brands b ON b.id = s.brand_id
       LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
       ORDER BY s.created_at DESC`
    );
    res.json({ status: 'success', data: { subscriptions: result.rows } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// PATCH /api/superadmin/subscriptions/:id
export const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trial_end } = req.body;

    const fields = [];
    const values = [];
    let i = 1;

    if (status !== undefined)    { fields.push(`status = $${i++}`);    values.push(status); }
    if (trial_end !== undefined) { fields.push(`trial_end = $${i++}`); values.push(trial_end); }

    if (fields.length === 0) return res.status(400).json({ status: 'fail', message: 'No fields to update.' });

    values.push(id);
    const result = await query(
      `UPDATE subscriptions SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    res.json({ status: 'success', data: { subscription: result.rows[0] } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// GET /api/superadmin/audit
export const getAuditLogs = async (req, res) => {
  try {
    const result = await query(
      `SELECT al.id, al.action, al.entity_type, al.entity_id, al.description,
              al.created_at, b.name as brand_name,
              u.name as user_name, u.email as user_email
       FROM audit_logs al
       LEFT JOIN brands b ON b.id = al.brand_id
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC
       LIMIT 100`
    );
    res.json({ status: 'success', data: { logs: result.rows } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// POST /api/superadmin/fix
export const runFix = async (req, res) => {
  try {
    const { operation } = req.body;
    let message = '';

    if (operation === 'fix_zero_invoices') {
      // Recalculate totals for invoices that have items but show $0
      await query(`
        UPDATE invoices i
        SET subtotal = sub.subtotal,
            total_amount = sub.subtotal,
            amount_due = sub.subtotal - COALESCE(i.amount_paid, 0)
        FROM (
          SELECT invoice_id, COALESCE(SUM(amount), 0) as subtotal
          FROM invoice_items GROUP BY invoice_id
        ) sub
        WHERE i.id = sub.invoice_id AND i.total_amount = 0 AND sub.subtotal > 0
      `);
      message = 'Invoice totals recalculated.';
    } else if (operation === 'fix_overdue_invoices') {
      const result = await query(`
        UPDATE invoices SET status = 'overdue'
        WHERE due_date < CURRENT_DATE
          AND status IN ('sent', 'partial')
          AND amount_due > 0
      `);
      message = `${result.rowCount} invoices marked overdue.`;
    } else if (operation === 'verify_all_emails') {
      const result = await query(`UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE`);
      message = `${result.rowCount} users verified.`;
    } else {
      return res.status(400).json({ status: 'fail', message: 'Unknown operation.' });
    }

    res.json({ status: 'success', message });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
