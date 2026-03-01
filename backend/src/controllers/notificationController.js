import { query } from '../config/database.js';
import { getBrandMember } from '../models/brandModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

/**
 * GET /api/notifications/:brandId
 * Aggregate notifications: unread messages, overdue invoices, tasks due today, proposals pending
 */
export const getNotifications = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const userId = req.user.id;

  const member = await getBrandMember(brandId, userId);
  if (!member) return next(new AppError('You do not have access to this brand', 403));

  const notifications = [];

  // Unread message threads
  try {
    const msgResult = await query(
      `SELECT COUNT(*) as count
       FROM message_threads
       WHERE brand_id = $1 AND unread_count > 0 AND status = 'open'`,
      [brandId]
    );
    const unreadCount = parseInt(msgResult.rows[0]?.count || 0);
    if (unreadCount > 0) {
      notifications.push({
        type: 'messages',
        title: 'Unread Messages',
        body: `${unreadCount} thread${unreadCount !== 1 ? 's' : ''} with unread messages`,
        link: '/messages',
        count: unreadCount,
        icon: '💬',
      });
    }
  } catch (err) {
    console.error('Notification: failed to fetch unread messages', err.message);
  }

  // Overdue invoices
  try {
    const invResult = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
       FROM invoices
       WHERE brand_id = $1 AND status = 'overdue'`,
      [brandId]
    );
    const overdueCount = parseInt(invResult.rows[0]?.count || 0);
    if (overdueCount > 0) {
      const total = parseFloat(invResult.rows[0]?.total || 0);
      notifications.push({
        type: 'invoices',
        title: 'Overdue Invoices',
        body: `${overdueCount} overdue invoice${overdueCount !== 1 ? 's' : ''} totalling $${total.toFixed(0)}`,
        link: '/invoices',
        count: overdueCount,
        icon: '💰',
      });
    }
  } catch (err) {
    console.error('Notification: failed to fetch overdue invoices', err.message);
  }

  // Tasks due today
  try {
    const taskResult = await query(
      `SELECT COUNT(*) as count
       FROM tasks
       WHERE brand_id = $1
         AND due_date = CURRENT_DATE
         AND status NOT IN ('completed', 'cancelled')
         AND is_active = TRUE`,
      [brandId]
    );
    const taskCount = parseInt(taskResult.rows[0]?.count || 0);
    if (taskCount > 0) {
      notifications.push({
        type: 'tasks',
        title: 'Tasks Due Today',
        body: `${taskCount} task${taskCount !== 1 ? 's' : ''} due today`,
        link: '/tasks',
        count: taskCount,
        icon: '✅',
      });
    }
  } catch (err) {
    console.error('Notification: failed to fetch tasks due today', err.message);
  }

  // Overdue tasks (past due, not completed)
  try {
    const overdueTaskResult = await query(
      `SELECT COUNT(*) as count
       FROM tasks
       WHERE brand_id = $1
         AND due_date < CURRENT_DATE
         AND status NOT IN ('completed', 'cancelled')
         AND is_active = TRUE`,
      [brandId]
    );
    const overdueTaskCount = parseInt(overdueTaskResult.rows[0]?.count || 0);
    if (overdueTaskCount > 0) {
      notifications.push({
        type: 'tasks_overdue',
        title: 'Overdue Tasks',
        body: `${overdueTaskCount} task${overdueTaskCount !== 1 ? 's' : ''} past due`,
        link: '/tasks',
        count: overdueTaskCount,
        icon: '⚠️',
      });
    }
  } catch (err) {
    console.error('Notification: failed to fetch overdue tasks', err.message);
  }

  // Proposals awaiting client response (sent, not expired)
  try {
    const proposalResult = await query(
      `SELECT COUNT(*) as count
       FROM proposals
       WHERE brand_id = $1
         AND status = 'sent'
         AND is_active = TRUE
         AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)`,
      [brandId]
    );
    const proposalCount = parseInt(proposalResult.rows[0]?.count || 0);
    if (proposalCount > 0) {
      notifications.push({
        type: 'proposals',
        title: 'Proposals Awaiting Response',
        body: `${proposalCount} proposal${proposalCount !== 1 ? 's' : ''} waiting for client decision`,
        link: '/proposals',
        count: proposalCount,
        icon: '📋',
      });
    }
  } catch (err) {
    console.error('Notification: failed to fetch pending proposals', err.message);
  }

  // Pipeline deals in negotiation stage
  try {
    const dealResult = await query(
      `SELECT COUNT(*) as count
       FROM pipeline_deals
       WHERE brand_id = $1
         AND stage = 'negotiation'
         AND is_active = TRUE`,
      [brandId]
    );
    const dealCount = parseInt(dealResult.rows[0]?.count || 0);
    if (dealCount > 0) {
      notifications.push({
        type: 'pipeline',
        title: 'Deals in Negotiation',
        body: `${dealCount} deal${dealCount !== 1 ? 's' : ''} need${dealCount === 1 ? 's' : ''} attention`,
        link: '/pipeline',
        count: dealCount,
        icon: '📈',
      });
    }
  } catch (err) {
    console.error('Notification: failed to fetch pipeline deals', err.message);
  }

  // Stale pipeline deals (stuck in same stage > 14 days)
  try {
    const staleResult = await query(
      `SELECT COUNT(*) as count
       FROM pipeline_deals
       WHERE brand_id = $1 AND is_active = TRUE
         AND stage NOT IN ('won','lost','Won','Lost')
         AND updated_at < NOW() - INTERVAL '14 days'`,
      [brandId]
    );
    const staleCount = parseInt(staleResult.rows[0]?.count || 0);
    if (staleCount > 0) {
      notifications.push({
        type: 'stale_deals',
        title: 'Stale Pipeline Deals',
        body: `${staleCount} deal${staleCount !== 1 ? 's' : ''} stuck for over 14 days`,
        link: '/pipeline',
        count: staleCount,
        icon: '📊',
      });
    }
  } catch (err) {
    console.error('Notification: failed to fetch stale deals', err.message);
  }

  // Critical client health (score < 40)
  try {
    const criticalResult = await query(
      `SELECT COUNT(*) as count
       FROM clients
       WHERE brand_id = $1 AND is_active = TRUE
         AND health_score IS NOT NULL AND health_score < 40`,
      [brandId]
    );
    const criticalCount = parseInt(criticalResult.rows[0]?.count || 0);
    if (criticalCount > 0) {
      notifications.push({
        type: 'critical_health',
        title: 'Critical Client Health',
        body: `${criticalCount} client${criticalCount !== 1 ? 's' : ''} with critical health score`,
        link: '/clients',
        count: criticalCount,
        icon: '❤',
      });
    }
  } catch (err) {
    console.error('Notification: failed to fetch critical health clients', err.message);
  }

  // Deals closing within 30 days
  try {
    const closingResult = await query(
      `SELECT COUNT(*) as count
       FROM pipeline_deals
       WHERE brand_id = $1 AND is_active = TRUE
         AND stage NOT IN ('won','lost','Won','Lost')
         AND expected_close_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'`,
      [brandId]
    );
    const closingCount = parseInt(closingResult.rows[0]?.count || 0);
    if (closingCount > 0) {
      notifications.push({
        type: 'closing_soon',
        title: 'Deals Closing This Month',
        body: `${closingCount} deal${closingCount !== 1 ? 's' : ''} expected to close within 30 days`,
        link: '/pipeline',
        count: closingCount,
        icon: '🎯',
      });
    }
  } catch (err) {
    console.error('Notification: failed to fetch closing deals', err.message);
  }

  // Unsigned contracts (sent > 7 days ago)
  try {
    const contractResult = await query(
      `SELECT COUNT(*) as count
       FROM contracts
       WHERE brand_id = $1 AND is_active = TRUE
         AND status = 'sent'
         AND sent_at < NOW() - INTERVAL '7 days'`,
      [brandId]
    );
    const contractCount = parseInt(contractResult.rows[0]?.count || 0);
    if (contractCount > 0) {
      notifications.push({
        type: 'unsigned_contracts',
        title: 'Contracts Awaiting Signature',
        body: `${contractCount} contract${contractCount !== 1 ? 's' : ''} sent over 7 days ago without signature`,
        link: '/contracts',
        count: contractCount,
        icon: '📝',
      });
    }
  } catch (err) {
    console.error('Notification: failed to fetch unsigned contracts', err.message);
  }

  res.status(200).json({
    status: 'success',
    data: {
      notifications,
      total: notifications.reduce((sum, n) => sum + n.count, 0),
    },
  });
});

/**
 * GET /api/notifications/:brandId/count
 * Lightweight unread count for badge polling
 */
export const getUnreadCount = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const userId = req.user.id;

  const member = await getBrandMember(brandId, userId);
  if (!member) return next(new AppError('You do not have access to this brand', 403));

  let count = 0;

  try {
    const msgResult = await query(
      `SELECT COUNT(*) as count FROM message_threads
       WHERE brand_id = $1 AND unread_count > 0 AND status = 'open'`,
      [brandId]
    );
    count += parseInt(msgResult.rows[0]?.count || 0);
  } catch (err) { /* ignore */ }

  try {
    const invResult = await query(
      `SELECT COUNT(*) as count FROM invoices
       WHERE brand_id = $1 AND status = 'overdue'`,
      [brandId]
    );
    count += parseInt(invResult.rows[0]?.count || 0);
  } catch (err) { /* ignore */ }

  try {
    const taskResult = await query(
      `SELECT COUNT(*) as count FROM tasks
       WHERE brand_id = $1
         AND due_date <= CURRENT_DATE
         AND status NOT IN ('completed', 'cancelled')
         AND is_active = TRUE`,
      [brandId]
    );
    count += parseInt(taskResult.rows[0]?.count || 0);
  } catch (err) { /* ignore */ }

  try {
    const proposalResult = await query(
      `SELECT COUNT(*) as count FROM proposals
       WHERE brand_id = $1
         AND status = 'sent'
         AND is_active = TRUE
         AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)`,
      [brandId]
    );
    count += parseInt(proposalResult.rows[0]?.count || 0);
  } catch (err) { /* ignore */ }

  try {
    const staleResult = await query(
      `SELECT COUNT(*) as count FROM pipeline_deals
       WHERE brand_id = $1 AND is_active = TRUE
         AND stage NOT IN ('won','lost','Won','Lost')
         AND updated_at < NOW() - INTERVAL '14 days'`,
      [brandId]
    );
    count += parseInt(staleResult.rows[0]?.count || 0);
  } catch (err) { /* ignore */ }

  try {
    const criticalResult = await query(
      `SELECT COUNT(*) as count FROM clients
       WHERE brand_id = $1 AND is_active = TRUE
         AND health_score IS NOT NULL AND health_score < 40`,
      [brandId]
    );
    count += parseInt(criticalResult.rows[0]?.count || 0);
  } catch (err) { /* ignore */ }

  try {
    const closingResult = await query(
      `SELECT COUNT(*) as count FROM pipeline_deals
       WHERE brand_id = $1 AND is_active = TRUE
         AND stage NOT IN ('won','lost','Won','Lost')
         AND expected_close_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'`,
      [brandId]
    );
    count += parseInt(closingResult.rows[0]?.count || 0);
  } catch (err) { /* ignore */ }

  try {
    const contractResult = await query(
      `SELECT COUNT(*) as count FROM contracts
       WHERE brand_id = $1 AND is_active = TRUE
         AND status = 'sent'
         AND sent_at < NOW() - INTERVAL '7 days'`,
      [brandId]
    );
    count += parseInt(contractResult.rows[0]?.count || 0);
  } catch (err) { /* ignore */ }

  res.status(200).json({
    status: 'success',
    data: { count },
  });
});
