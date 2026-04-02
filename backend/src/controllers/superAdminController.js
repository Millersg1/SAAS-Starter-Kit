import { query } from '../config/database.js';

// GET /api/superadmin/stats
export const getStats = async (req, res, next) => {
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
    next(err);
  }
};

// GET /api/superadmin/users
export const getAllUsers = async (req, res, next) => {
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
    next(err);
  }
};

// PATCH /api/superadmin/users/:id
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active, email_verified, is_superadmin, role } = req.body;

    // Validate field types and allowed values
    const VALID_ROLES = ['admin', 'agency', 'client'];
    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ status: 'fail', message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }
    if (is_active !== undefined && typeof is_active !== 'boolean') {
      return res.status(400).json({ status: 'fail', message: 'is_active must be a boolean.' });
    }
    if (email_verified !== undefined && typeof email_verified !== 'boolean') {
      return res.status(400).json({ status: 'fail', message: 'email_verified must be a boolean.' });
    }
    if (is_superadmin !== undefined && typeof is_superadmin !== 'boolean') {
      return res.status(400).json({ status: 'fail', message: 'is_superadmin must be a boolean.' });
    }

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
    next(err);
  }
};

// DELETE /api/superadmin/users/:id
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ status: 'fail', message: 'Cannot delete yourself.' });
    await query(`DELETE FROM users WHERE id = $1`, [id]);
    res.json({ status: 'success', message: 'User deleted.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/superadmin/brands
export const getAllBrands = async (req, res, next) => {
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
    next(err);
  }
};

// DELETE /api/superadmin/brands/:id
export const deleteBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM brands WHERE id = $1`, [id]);
    res.json({ status: 'success', message: 'Brand deleted.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/superadmin/subscriptions
export const getAllSubscriptions = async (req, res, next) => {
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
    next(err);
  }
};

// PATCH /api/superadmin/subscriptions/:id
export const updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, trial_end } = req.body;

    // Validate allowed values
    const VALID_STATUSES = ['active', 'canceled', 'past_due', 'trialing', 'paused'];
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ status: 'fail', message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (trial_end !== undefined && isNaN(Date.parse(trial_end))) {
      return res.status(400).json({ status: 'fail', message: 'trial_end must be a valid date.' });
    }

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
    next(err);
  }
};

// GET /api/superadmin/audit
export const getAuditLogs = async (req, res, next) => {
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
    next(err);
  }
};

// POST /api/superadmin/fix
export const runFix = async (req, res, next) => {
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
    next(err);
  }
};

// GET /api/superadmin/platform-overview
export const getPlatformOverview = async (req, res, next) => {
  try {
    const results = await Promise.all([
      // Core counts
      query(`SELECT COUNT(*)::int as count FROM users WHERE deleted_at IS NULL`),
      query(`SELECT COUNT(*)::int as count FROM brands WHERE is_active = TRUE`),
      query(`SELECT COUNT(*)::int as count FROM clients WHERE is_active = TRUE`),
      query(`SELECT COUNT(*)::int as count FROM projects`),
      query(`SELECT COUNT(*)::int as count FROM invoices`),
      query(`SELECT COUNT(*)::int as count FROM proposals`),
      query(`SELECT COUNT(*)::int as count FROM deals`),
      query(`SELECT COUNT(*)::int as count FROM tasks`),
      query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status = 'completed'`),
      // Founding members
      query(`SELECT COUNT(*)::int as count FROM founding_members`).catch(() => ({ rows: [{ count: 0 }] })),
      // Testimonials
      query(`SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE status = 'pending')::int as pending, COUNT(*) FILTER (WHERE status = 'approved')::int as approved FROM testimonials`).catch(() => ({ rows: [{ total: 0, pending: 0, approved: 0 }] })),
      // Voice calls
      query(`SELECT COUNT(*)::int as total, COALESCE(SUM(duration_seconds), 0)::int as total_duration FROM voice_agent_calls`).catch(() => ({ rows: [{ total: 0, total_duration: 0 }] })),
      // Autopilot actions
      query(`SELECT COUNT(*)::int as count FROM surf_autopilot_log`).catch(() => ({ rows: [{ count: 0 }] })),
      // Lead submissions
      query(`SELECT COUNT(*)::int as count FROM lead_submissions`).catch(() => ({ rows: [{ count: 0 }] })),
      // Active workflows
      query(`SELECT COUNT(*)::int as count FROM automation_workflows WHERE is_active = TRUE`).catch(() => ({ rows: [{ count: 0 }] })),
      // CMS sites/pages
      query(`SELECT COUNT(*)::int as sites FROM cms_sites WHERE is_active = TRUE`).catch(() => ({ rows: [{ sites: 0 }] })),
      query(`SELECT COUNT(*)::int as pages FROM cms_pages WHERE status = 'published'`).catch(() => ({ rows: [{ pages: 0 }] })),
      // Resellers
      query(`SELECT COUNT(*)::int as count FROM reseller_settings WHERE is_reseller = TRUE`).catch(() => ({ rows: [{ count: 0 }] })),
      // Campaigns
      query(`SELECT COUNT(*)::int as count FROM campaigns`).catch(() => ({ rows: [{ count: 0 }] })),
      // Expenses
      query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses`).catch(() => ({ rows: [{ total: 0 }] })),
    ]);

    res.json({
      status: 'success',
      data: {
        users: results[0].rows[0].count,
        brands: results[1].rows[0].count,
        clients: results[2].rows[0].count,
        projects: results[3].rows[0].count,
        invoices: results[4].rows[0].count,
        proposals: results[5].rows[0].count,
        deals: results[6].rows[0].count,
        tasks: results[7].rows[0].count,
        total_revenue: parseFloat(results[8].rows[0].total),
        founding_members: results[9].rows[0].count,
        testimonials: results[10].rows[0],
        voice_calls: results[11].rows[0],
        autopilot_actions: results[12].rows[0].count,
        lead_submissions: results[13].rows[0].count,
        active_workflows: results[14].rows[0].count,
        cms_sites: results[15].rows[0].sites,
        cms_pages: results[16].rows[0].pages,
        resellers: results[17].rows[0].count,
        campaigns: results[18].rows[0].count,
        total_expenses: parseFloat(results[19].rows[0].total),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/superadmin/testimonials
export const getTestimonials = async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM testimonials ORDER BY submitted_at DESC LIMIT 50`);
    res.json({ status: 'success', data: { testimonials: result.rows } });
  } catch (err) { next(err); }
};

// PATCH /api/superadmin/testimonials/:id
export const updateTestimonial = async (req, res, next) => {
  try {
    const { status, is_featured } = req.body;
    const updates = [];
    const vals = [];
    let idx = 1;
    if (status) { updates.push(`status = $${idx++}`); vals.push(status); if (status === 'approved') { updates.push(`approved_at = NOW()`); updates.push(`approved_by = $${idx++}`); vals.push(req.user.id); } }
    if (is_featured !== undefined) { updates.push(`is_featured = $${idx++}`); vals.push(is_featured); }
    if (updates.length === 0) return res.status(400).json({ status: 'fail', message: 'No updates provided' });
    vals.push(req.params.id);
    const result = await query(`UPDATE testimonials SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
    res.json({ status: 'success', data: { testimonial: result.rows[0] } });
  } catch (err) { next(err); }
};

// GET /api/superadmin/voice-calls
export const getVoiceCalls = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT vac.*, va.name as agent_name FROM voice_agent_calls vac
       LEFT JOIN voice_agents va ON va.id = vac.voice_agent_id
       ORDER BY vac.started_at DESC LIMIT 50`
    );
    res.json({ status: 'success', data: { calls: result.rows } });
  } catch (err) { next(err); }
};

// GET /api/superadmin/autopilot-log
export const getAutopilotLog = async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM surf_autopilot_log ORDER BY created_at DESC LIMIT 100`);
    res.json({ status: 'success', data: { actions: result.rows } });
  } catch (err) { next(err); }
};

// GET /api/superadmin/founding-members
export const getFoundingMembers = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT fm.*, u.name as user_name, u.email as user_email, b.name as brand_name
       FROM founding_members fm
       LEFT JOIN users u ON u.id = fm.user_id
       LEFT JOIN brands b ON b.id = fm.brand_id
       ORDER BY fm.member_number ASC`
    );
    res.json({ status: 'success', data: { members: result.rows } });
  } catch (err) { next(err); }
};
