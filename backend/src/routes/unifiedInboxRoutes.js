import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { getBrandMember } from '../models/brandModel.js';

const router = express.Router();

router.use(protect);

// ── Priority scoring rules ──────────────────────────────────────────────────
function scorePriority(type, subject, preview) {
  const text = ((subject || '') + ' ' + (preview || '')).toLowerCase();

  // High priority signals
  if (text.includes('overdue') || text.includes('past due') || text.includes('urgent')) return 'high';
  if (text.includes('new lead') || text.includes('new inquiry') || text.includes('interested')) return 'high';
  if (type === 'voice' && text.includes('missed')) return 'high';
  if (text.includes('payment failed') || text.includes('cancellation')) return 'high';

  // Low priority signals
  if (text.includes('newsletter') || text.includes('unsubscribe') || text.includes('auto-reply')) return 'low';
  if (text.includes('out of office') || text.includes('no-reply')) return 'low';

  return 'medium';
}

// ── GET /:brandId/inbox — Unified inbox combining all message types ──────────
router.get('/:brandId/inbox', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const { type, unread_only, limit = 50, offset = 0 } = req.query;

  // Build UNION ALL query from available sources
  const sources = [];
  const params = [req.params.brandId];
  let idx = 2;

  // Email threads
  if (!type || type === 'email') {
    sources.push(`
      SELECT
        et.id::text AS id,
        'email' AS type,
        et.from_address AS "from",
        et.subject,
        LEFT(et.last_message_preview, 200) AS preview,
        et.last_message_at AS timestamp,
        NOT COALESCE(et.is_read, false) AS is_unread,
        et.id AS source_id
      FROM email_threads et
      WHERE et.brand_id = $1
    `);
  }

  // SMS messages
  if (!type || type === 'sms') {
    sources.push(`
      SELECT
        sm.id::text AS id,
        'sms' AS type,
        sm.from_number AS "from",
        NULL AS subject,
        LEFT(sm.body, 200) AS preview,
        sm.created_at AS timestamp,
        NOT COALESCE(sm.is_read, false) AS is_unread,
        sm.id AS source_id
      FROM sms_messages sm
      WHERE sm.brand_id = $1
    `);
  }

  // Chat widget sessions
  if (!type || type === 'chat') {
    sources.push(`
      SELECT
        cws.id::text AS id,
        'chat' AS type,
        COALESCE(cws.visitor_name, cws.visitor_email, 'Visitor') AS "from",
        NULL AS subject,
        LEFT(cws.last_message, 200) AS preview,
        COALESCE(cws.last_activity_at, cws.created_at) AS timestamp,
        NOT COALESCE(cws.is_read, false) AS is_unread,
        cws.id AS source_id
      FROM chat_widget_sessions cws
      WHERE cws.brand_id = $1
    `);
  }

  // Portal message threads
  if (!type || type === 'portal') {
    sources.push(`
      SELECT
        mt.id::text AS id,
        'portal' AS type,
        u.name AS "from",
        mt.subject,
        LEFT(mt.last_message, 200) AS preview,
        COALESCE(mt.last_reply_at, mt.created_at) AS timestamp,
        NOT COALESCE(mt.is_read, false) AS is_unread,
        mt.id AS source_id
      FROM message_threads mt
      LEFT JOIN users u ON u.id = mt.created_by
      WHERE mt.brand_id = $1
    `);
  }

  // Voice agent calls
  if (!type || type === 'voice') {
    sources.push(`
      SELECT
        vac.id::text AS id,
        'voice' AS type,
        COALESCE(vac.caller_number, 'Unknown') AS "from",
        COALESCE('Call: ' || vac.status, 'Voice Call') AS subject,
        LEFT(vac.transcript_summary, 200) AS preview,
        vac.created_at AS timestamp,
        NOT COALESCE(vac.is_read, false) AS is_unread,
        vac.id AS source_id
      FROM voice_agent_calls vac
      WHERE vac.brand_id = $1
    `);
  }

  if (!sources.length) {
    return res.json({ status: 'success', data: { items: [], total: 0 } });
  }

  // Wrap each source in an existence check to avoid errors if table doesn't exist
  // Use the UNION ALL approach
  let unionSql = sources.join(' UNION ALL ');

  let sql = `
    SELECT * FROM (${unionSql}) AS inbox
  `;

  if (unread_only === 'true') {
    sql += ` WHERE inbox.is_unread = true`;
  }

  // Count before pagination
  const countSql = `SELECT COUNT(*)::int AS total FROM (${unionSql}) AS inbox${unread_only === 'true' ? ' WHERE inbox.is_unread = true' : ''}`;

  sql += ` ORDER BY timestamp DESC NULLS LAST LIMIT $${idx++} OFFSET $${idx}`;
  params.push(parseInt(limit), parseInt(offset));

  let items = [];
  let total = 0;

  try {
    const result = await query(sql, params);
    items = result.rows.map(item => ({
      ...item,
      priority: scorePriority(item.type, item.subject, item.preview),
    }));

    const countResult = await query(countSql, [req.params.brandId]);
    total = countResult.rows[0]?.total || 0;
  } catch (err) {
    // Some tables may not exist yet — degrade gracefully
    // Try each source individually and merge
    for (const source of sources) {
      try {
        const r = await query(`${source} ORDER BY 6 DESC LIMIT 20`, [req.params.brandId]);
        items.push(...r.rows.map(item => ({
          ...item,
          priority: scorePriority(item.type, item.subject, item.preview),
        })));
      } catch {
        // Table doesn't exist, skip
      }
    }
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    items = items.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    total = items.length;
  }

  res.json({
    status: 'success',
    data: { items, total },
  });
}));

// ── GET /:brandId/inbox/stats — Inbox statistics ─────────────────────────────
router.get('/:brandId/inbox/stats', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const statQueries = {
    email: {
      total: `SELECT COUNT(*)::int AS c FROM email_threads WHERE brand_id = $1`,
      unread: `SELECT COUNT(*)::int AS c FROM email_threads WHERE brand_id = $1 AND (is_read = false OR is_read IS NULL)`,
    },
    sms: {
      total: `SELECT COUNT(*)::int AS c FROM sms_messages WHERE brand_id = $1`,
      unread: `SELECT COUNT(*)::int AS c FROM sms_messages WHERE brand_id = $1 AND (is_read = false OR is_read IS NULL)`,
    },
    chat: {
      total: `SELECT COUNT(*)::int AS c FROM chat_widget_sessions WHERE brand_id = $1`,
      unread: `SELECT COUNT(*)::int AS c FROM chat_widget_sessions WHERE brand_id = $1 AND (is_read = false OR is_read IS NULL)`,
    },
    portal: {
      total: `SELECT COUNT(*)::int AS c FROM message_threads WHERE brand_id = $1`,
      unread: `SELECT COUNT(*)::int AS c FROM message_threads WHERE brand_id = $1 AND (is_read = false OR is_read IS NULL)`,
    },
    voice: {
      total: `SELECT COUNT(*)::int AS c FROM voice_agent_calls WHERE brand_id = $1`,
      unread: `SELECT COUNT(*)::int AS c FROM voice_agent_calls WHERE brand_id = $1 AND (is_read = false OR is_read IS NULL)`,
    },
  };

  const stats = { total: 0, unread: 0, by_type: {}, high_priority: 0 };

  for (const [type, queries] of Object.entries(statQueries)) {
    try {
      const totalResult = await query(queries.total, [req.params.brandId]);
      const unreadResult = await query(queries.unread, [req.params.brandId]);
      const t = totalResult.rows[0]?.c || 0;
      const u = unreadResult.rows[0]?.c || 0;
      stats.by_type[type] = { total: t, unread: u };
      stats.total += t;
      stats.unread += u;
    } catch {
      // Table doesn't exist yet — skip
      stats.by_type[type] = { total: 0, unread: 0 };
    }
  }

  res.json({ status: 'success', data: { stats } });
}));

// ── PATCH /:brandId/inbox/:itemId/read — Mark item as read ───────────────────
router.patch('/:brandId/inbox/:itemId/read', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const { itemId } = req.params;
  const { type } = req.body;

  if (!type) return res.status(400).json({ message: 'type is required (email, sms, chat, portal, voice)' });

  const tableMap = {
    email: 'email_threads',
    sms: 'sms_messages',
    chat: 'chat_widget_sessions',
    portal: 'message_threads',
    voice: 'voice_agent_calls',
  };

  const table = tableMap[type];
  if (!table) return res.status(400).json({ message: 'Invalid type' });

  await query(`UPDATE ${table} SET is_read = true WHERE id = $1 AND brand_id = $2`, [itemId, req.params.brandId]);

  res.json({ status: 'success', message: 'Marked as read' });
}));

// ── POST /:brandId/inbox/:itemId/reply — Reply to any inbox item ─────────────
router.post('/:brandId/inbox/:itemId/reply', catchAsync(async (req, res) => {
  const member = await getBrandMember(req.params.brandId, req.user.id);
  if (!member) return res.status(403).json({ message: 'Access denied' });

  const { itemId } = req.params;
  const { type, message } = req.body;

  if (!type) return res.status(400).json({ message: 'type is required' });
  if (!message) return res.status(400).json({ message: 'message is required' });

  switch (type) {
    case 'email': {
      // Get the email thread and reply
      const thread = await query(`SELECT * FROM email_threads WHERE id = $1 AND brand_id = $2`, [itemId, req.params.brandId]);
      if (!thread.rows.length) return res.status(404).json({ message: 'Email thread not found' });

      await query(
        `INSERT INTO email_messages (thread_id, brand_id, from_address, to_address, subject, body, direction, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'outbound', $7)`,
        [itemId, req.params.brandId, thread.rows[0].to_address || 'noreply@app.com', thread.rows[0].from_address,
         'Re: ' + (thread.rows[0].subject || ''), message, req.user.id]
      );

      await query(`UPDATE email_threads SET is_read = true, last_message_at = NOW(), last_message_preview = $1 WHERE id = $2`,
        [message.substring(0, 200), itemId]);
      break;
    }

    case 'sms': {
      const sms = await query(`SELECT * FROM sms_messages WHERE id = $1 AND brand_id = $2`, [itemId, req.params.brandId]);
      if (!sms.rows.length) return res.status(404).json({ message: 'SMS not found' });

      await query(
        `INSERT INTO sms_messages (brand_id, from_number, to_number, body, direction, is_read)
         VALUES ($1, $2, $3, $4, 'outbound', true)`,
        [req.params.brandId, sms.rows[0].to_number, sms.rows[0].from_number, message]
      );
      break;
    }

    case 'chat': {
      const session = await query(`SELECT * FROM chat_widget_sessions WHERE id = $1 AND brand_id = $2`, [itemId, req.params.brandId]);
      if (!session.rows.length) return res.status(404).json({ message: 'Chat session not found' });

      await query(
        `INSERT INTO chat_widget_messages (session_id, sender_type, sender_id, message)
         VALUES ($1, 'agent', $2, $3)`,
        [itemId, req.user.id, message]
      );

      await query(`UPDATE chat_widget_sessions SET is_read = true, last_message = $1, last_activity_at = NOW() WHERE id = $2`,
        [message.substring(0, 200), itemId]);
      break;
    }

    case 'portal': {
      const thread = await query(`SELECT * FROM message_threads WHERE id = $1 AND brand_id = $2`, [itemId, req.params.brandId]);
      if (!thread.rows.length) return res.status(404).json({ message: 'Message thread not found' });

      await query(
        `INSERT INTO messages (thread_id, sender_id, content) VALUES ($1, $2, $3)`,
        [itemId, req.user.id, message]
      );

      await query(`UPDATE message_threads SET is_read = true, last_reply_at = NOW(), last_message = $1 WHERE id = $2`,
        [message.substring(0, 200), itemId]);
      break;
    }

    case 'voice': {
      // Voice calls can't be "replied" to directly — log a note instead
      await query(
        `UPDATE voice_agent_calls SET is_read = true, notes = COALESCE(notes, '') || $1 WHERE id = $2 AND brand_id = $3`,
        ['\n[Agent Note] ' + message, itemId, req.params.brandId]
      );
      break;
    }

    default:
      return res.status(400).json({ message: 'Invalid type' });
  }

  res.json({ status: 'success', message: `Reply sent via ${type}` });
}));

export default router;
