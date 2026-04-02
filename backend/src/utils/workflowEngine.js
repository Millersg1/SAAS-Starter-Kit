import * as workflowModel from '../models/workflowModel.js';
import { query } from '../config/database.js';
import { getTransporter as getSmtpTransporter } from './emailUtils.js';

// ── LEGACY: existing linear step execution (unchanged) ─────────────────────

async function executeStep(step, enrollment) {
  const { step_type, step_config } = step;

  switch (step_type) {
    case 'send_email': {
      const entityRow = (await query(
        `SELECT email, name FROM clients WHERE id = $1 AND is_active = TRUE`,
        [enrollment.entity_id]
      )).rows[0];
      if (!entityRow?.email) break;

      const transporter = getSmtpTransporter();
      await transporter.sendMail({
        from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to: entityRow.email,
        subject: step_config.subject || 'Message from us',
        html: (step_config.body || '').replace(/\n/g, '<br>'),
        text: step_config.body || ''
      });
      break;
    }

    case 'create_task': {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (parseInt(step_config.due_days) || 1));
      await query(
        `INSERT INTO tasks (brand_id, client_id, title, due_date, priority, status, created_by)
         VALUES ($1, $2, $3, $4, $5, 'pending', NULL)`,
        [
          enrollment.brand_id,
          enrollment.entity_type === 'client' ? enrollment.entity_id : null,
          step_config.title || 'Follow up',
          dueDate.toISOString().slice(0, 10),
          step_config.priority || 'normal'
        ]
      );
      break;
    }

    case 'send_sms': {
      if (!step_config.message) break;
      const { getTwilioConnection, saveMessage } = await import('../models/smsModel.js');
      const conn = await getTwilioConnection(enrollment.brand_id);
      if (!conn) break;

      const clientRow = (await query(`SELECT phone FROM clients WHERE id = $1`, [enrollment.entity_id])).rows[0];
      if (!clientRow?.phone) break;

      const { default: twilio } = await import('twilio');
      const twilioClient = twilio(conn.account_sid, conn.auth_token);
      const msg = await twilioClient.messages.create({
        from: conn.phone_number, to: clientRow.phone, body: step_config.message
      });
      await saveMessage({
        brand_id: enrollment.brand_id, client_id: enrollment.entity_id,
        direction: 'outbound', from_number: conn.phone_number,
        to_number: clientRow.phone, body: step_config.message,
        twilio_sid: msg.sid, status: msg.status
      });
      break;
    }

    case 'wait':
    default:
      break;
  }
}

export async function processEnrollment(enrollment) {
  const wf = await workflowModel.getWorkflowWithSteps(enrollment.workflow_id);
  if (!wf || !wf.is_active) {
    await workflowModel.completeEnrollment(enrollment.id);
    return;
  }

  const currentStep = wf.steps[enrollment.current_step];
  if (!currentStep) {
    await workflowModel.completeEnrollment(enrollment.id);
    return;
  }

  try {
    await executeStep(currentStep, enrollment);
  } catch (err) {
    console.error(`Workflow step error (enrollment ${enrollment.id}):`, err.message);
  }

  const nextStepIndex = enrollment.current_step + 1;
  const nextStep = wf.steps[nextStepIndex];

  if (!nextStep) {
    await workflowModel.completeEnrollment(enrollment.id);
  } else {
    const nextStepAt = new Date(Date.now() + (nextStep.delay_minutes || 0) * 60 * 1000);
    await workflowModel.advanceEnrollment(enrollment.id, nextStepIndex, nextStepAt);
  }
}

// ── GRAPH: new visual workflow execution ────────────────────────────────────

async function fetchEntityRow(enrollment) {
  if (enrollment.entity_type === 'booking') {
    return (await query(
      `SELECT c.* FROM clients c
       JOIN bookings b ON b.client_email = c.email
       WHERE b.id = $1 AND c.brand_id = $2`,
      [enrollment.entity_id, enrollment.brand_id]
    )).rows[0] || null;
  }
  if (enrollment.entity_type === 'lead') {
    return (await query(
      `SELECT * FROM lead_submissions WHERE id = $1`,
      [enrollment.entity_id]
    )).rows[0] || null;
  }
  // default: client
  return (await query(
    `SELECT c.*,
            (SELECT stage FROM pipeline_deals d WHERE d.client_id = c.id AND d.is_active = TRUE
             ORDER BY d.created_at DESC LIMIT 1) AS pipeline_stage
     FROM clients c WHERE c.id = $1`,
    [enrollment.entity_id]
  )).rows[0] || null;
}

function evaluateCondition(conditionConfig, entityRow) {
  if (!entityRow) return false;
  const { field, operator, value } = conditionConfig || {};

  let fieldValue;
  if (field === 'email')          fieldValue = entityRow.email;
  else if (field === 'phone')     fieldValue = entityRow.phone;
  else if (field === 'tags')      fieldValue = entityRow.tags || [];
  else if (field === 'status')    fieldValue = entityRow.status;
  else if (field === 'client_type') fieldValue = entityRow.client_type;
  else if (field === 'company')   fieldValue = entityRow.company;
  else if (field === 'pipeline_stage') fieldValue = entityRow.pipeline_stage;
  else if (field?.startsWith('cf_')) fieldValue = entityRow.custom_fields?.[field.slice(3)];
  else fieldValue = null;

  switch (operator) {
    case 'exists':       return fieldValue != null && fieldValue !== '';
    case 'not_exists':   return fieldValue == null || fieldValue === '';
    case 'equals':       return String(fieldValue ?? '').toLowerCase() === String(value ?? '').toLowerCase();
    case 'not_equals':   return String(fieldValue ?? '').toLowerCase() !== String(value ?? '').toLowerCase();
    case 'contains':     return String(fieldValue ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'not_contains': return !String(fieldValue ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'has_tag':      return Array.isArray(fieldValue) && fieldValue.includes(value);
    case 'no_tag':       return !Array.isArray(fieldValue) || !fieldValue.includes(value);
    case 'greater_than': return parseFloat(fieldValue) > parseFloat(value);
    case 'less_than':    return parseFloat(fieldValue) < parseFloat(value);
    default:             return false;
  }
}

async function executeGraphNode(node, enrollment) {
  const config = node.config || {};

  switch (node.type) {
    case 'send_email': {
      const entityRow = await fetchEntityRow(enrollment);
      const toEmail = entityRow?.email;
      if (!toEmail) break;
      const clientName = entityRow?.name || '';
      const subject = (config.subject || 'Message from us').replace(/\{\{client\.name\}\}/g, clientName);
      const body = (config.body || '').replace(/\{\{client\.name\}\}/g, clientName).replace(/\{\{client\.email\}\}/g, toEmail);
      const transporter = getSmtpTransporter();
      await transporter.sendMail({
        from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to: toEmail, subject, html: body.replace(/\n/g, '<br>'), text: body
      });
      break;
    }

    case 'send_sms': {
      if (!config.message) break;
      const { getTwilioConnection, saveMessage } = await import('../models/smsModel.js');
      const conn = await getTwilioConnection(enrollment.brand_id);
      if (!conn) break;
      const clientRow = (await query(`SELECT phone FROM clients WHERE id = $1`, [enrollment.entity_id])).rows[0];
      if (!clientRow?.phone) break;
      const { default: twilio } = await import('twilio');
      const twilioClient = twilio(conn.account_sid, conn.auth_token);
      const msg = await twilioClient.messages.create({
        from: conn.phone_number, to: clientRow.phone, body: config.message
      });
      await saveMessage({
        brand_id: enrollment.brand_id, client_id: enrollment.entity_id,
        direction: 'outbound', from_number: conn.phone_number,
        to_number: clientRow.phone, body: config.message,
        twilio_sid: msg.sid, status: msg.status
      });
      break;
    }

    case 'create_task': {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (parseInt(config.due_days) || 1));
      await query(
        `INSERT INTO tasks (brand_id, client_id, title, due_date, priority, status, created_by)
         VALUES ($1, $2, $3, $4, $5, 'pending', NULL)`,
        [
          enrollment.brand_id,
          enrollment.entity_type === 'client' ? enrollment.entity_id : null,
          config.title || 'Follow up',
          dueDate.toISOString().slice(0, 10),
          config.priority || 'normal'
        ]
      );
      break;
    }

    case 'add_tag': {
      if (!config.tag || enrollment.entity_type !== 'client') break;
      await query(
        `UPDATE clients SET tags = COALESCE(tags, '[]'::jsonb) || $2::jsonb
         WHERE id = $1 AND NOT (COALESCE(tags, '[]'::jsonb) @> $2::jsonb)`,
        [enrollment.entity_id, JSON.stringify([config.tag])]
      );
      break;
    }

    case 'remove_tag': {
      if (!config.tag || enrollment.entity_type !== 'client') break;
      await query(
        `UPDATE clients
         SET tags = COALESCE((SELECT jsonb_agg(t) FROM jsonb_array_elements_text(tags) t WHERE t != $2), '[]'::jsonb)
         WHERE id = $1`,
        [enrollment.entity_id, config.tag]
      );
      break;
    }

    case 'move_pipeline_stage': {
      if (!config.stage || enrollment.entity_type !== 'client') break;
      await query(
        `UPDATE pipeline_deals SET stage = $2
         WHERE client_id = $1 AND is_active = TRUE`,
        [enrollment.entity_id, config.stage]
      );
      break;
    }

    case 'enroll_in_drip': {
      if (!config.sequence_id) break;
      const clientRow = (await query(
        `SELECT email, name FROM clients WHERE id = $1`, [enrollment.entity_id]
      )).rows[0];
      if (!clientRow?.email) break;
      const { enroll } = await import('../models/dripSequenceModel.js');
      await enroll({
        sequence_id: config.sequence_id,
        brand_id: enrollment.brand_id,
        contact_email: clientRow.email,
        contact_name: clientRow.name,
        client_id: enrollment.entity_id
      }).catch(() => {}); // ignore duplicate enrollment
      break;
    }

    case 'create_note': {
      if (!config.body) break;
      await query(
        `INSERT INTO client_activities (brand_id, client_id, user_id, activity_type, title, body)
         VALUES ($1, $2, NULL, 'note', $3, $4)`,
        [enrollment.brand_id, enrollment.entity_type === 'client' ? enrollment.entity_id : null,
         config.title || 'Automated Note', config.body]
      );
      break;
    }

    case 'send_webhook': {
      if (!config.url) break;
      // SSRF protection: block private/internal URLs
      try {
        const parsed = new URL(config.url);
        const host = parsed.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1' ||
            host.startsWith('10.') || host.startsWith('192.168.') ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
            host.endsWith('.local') || host === '0.0.0.0' ||
            parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          console.error(`Workflow webhook blocked — private/invalid URL: ${config.url}`);
          break;
        }
      } catch {
        console.error(`Workflow webhook blocked — malformed URL: ${config.url}`);
        break;
      }
      const clientRow = (await query(
        `SELECT id, name, email, phone, company, tags FROM clients WHERE id = $1`,
        [enrollment.entity_id]
      )).rows[0];
      const payload = {
        event: 'workflow.action',
        entity: clientRow || { id: enrollment.entity_id },
        workflow_id: enrollment.workflow_id,
        timestamp: new Date().toISOString()
      };
      fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      }).catch(err => console.error('Workflow webhook error:', err.message));
      break;
    }

    case 'wait':
    case 'condition':
    default:
      break;
  }
}

// ── Cycle detection (shared between validation and execution) ─────────────

export function detectCycles(nodes, connections) {
  const adj = {};
  for (const n of nodes) adj[n.id] = [];
  for (const c of connections) {
    if (adj[c.from]) adj[c.from].push(c.to);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  for (const n of nodes) color[n.id] = WHITE;
  const cycleNodes = new Set();

  function dfs(id) {
    color[id] = GRAY;
    for (const next of (adj[id] || [])) {
      if (color[next] === GRAY) { cycleNodes.add(id); cycleNodes.add(next); return true; }
      if (color[next] === WHITE && dfs(next)) { cycleNodes.add(id); return true; }
    }
    color[id] = BLACK;
    return false;
  }

  for (const n of nodes) {
    if (color[n.id] === WHITE) dfs(n.id);
  }
  return cycleNodes;
}

// ── Workflow validation ───────────────────────────────────────────────────

export function validateWorkflow(workflowDef) {
  const errors = [];
  if (!workflowDef) { errors.push('No workflow definition'); return errors; }
  const { nodes = [], connections = [] } = workflowDef;

  // Must have a trigger node
  const triggerNode = nodes.find(n => n.type === 'trigger');
  if (!triggerNode) errors.push('Workflow must have a trigger node');

  // Must have at least one action node
  const actionNodes = nodes.filter(n => n.type !== 'trigger' && n.type !== 'condition');
  if (actionNodes.length === 0) errors.push('Workflow must have at least one action node');

  // Trigger must have an outbound connection
  if (triggerNode) {
    const triggerOuts = connections.filter(c => c.from === triggerNode.id);
    if (triggerOuts.length === 0) errors.push('Trigger must be connected to at least one node');
  }

  // Condition nodes must have YES and NO outputs
  for (const n of nodes.filter(n => n.type === 'condition')) {
    const outs = connections.filter(c => c.from === n.id);
    if (!outs.find(c => c.branch === 'yes')) errors.push(`Condition node "${n.id}" is missing a YES branch`);
    if (!outs.find(c => c.branch === 'no'))  errors.push(`Condition node "${n.id}" is missing a NO branch`);
    if (!n.config?.field || !n.config?.operator) errors.push(`Condition node is not fully configured (missing field or operator)`);
  }

  // Action config validation
  for (const n of actionNodes) {
    const c = n.config || {};
    if (n.type === 'send_email' && !c.subject) errors.push('Send Email action is missing a subject');
    if (n.type === 'send_sms' && !c.message) errors.push('Send SMS action is missing a message');
    if (n.type === 'create_task' && !c.title) errors.push('Create Task action is missing a title');
    if (n.type === 'add_tag' && !c.tag) errors.push('Add Tag action is missing a tag name');
    if (n.type === 'remove_tag' && !c.tag) errors.push('Remove Tag action is missing a tag name');
    if (n.type === 'move_pipeline_stage' && !c.stage) errors.push('Move Pipeline Stage action is missing a stage name');
    if (n.type === 'enroll_in_drip' && !c.sequence_id) errors.push('Enroll in Sequence action is missing a sequence');
    if (n.type === 'send_webhook' && !c.url) errors.push('Send Webhook action is missing a URL');
  }

  // Cycle detection
  const cycleNodes = detectCycles(nodes, connections);
  if (cycleNodes.size > 0) errors.push('Workflow contains a circular loop — this would cause infinite execution');

  return errors;
}

// ── Max node visits (runtime safety net) ─────────────────────────────────
const MAX_NODE_VISITS = 500;

export async function executeGraphWorkflow(enrollment, workflowDef) {
  const { nodes, connections } = workflowDef;

  const currentNode = nodes.find(n => n.id === enrollment.current_node_id);
  if (!currentNode) {
    await workflowModel.completeEnrollment(enrollment.id);
    return;
  }

  // Runtime cycle guard: track total node visits via DB column
  const visitCount = (enrollment.node_visit_count || 0) + 1;
  if (visitCount > MAX_NODE_VISITS) {
    console.error(`Enrollment ${enrollment.id} exceeded ${MAX_NODE_VISITS} node visits — aborting (possible cycle)`);
    await query(
      `UPDATE automation_enrollments SET status = 'failed', completed_at = NOW() WHERE id = $1`,
      [enrollment.id]
    );
    return;
  }
  await query(`UPDATE automation_enrollments SET node_visit_count = $2 WHERE id = $1`, [enrollment.id, visitCount]);

  // Execute action (condition nodes have no side-effects, they just route)
  if (currentNode.type !== 'condition' && currentNode.type !== 'trigger') {
    try {
      await executeGraphNode(currentNode, enrollment);
    } catch (err) {
      console.error(`Graph node error (enrollment ${enrollment.id}, node ${currentNode.id}):`, err.message);
    }
  }

  // Find outbound connections
  const outboundConns = connections.filter(c => c.from === currentNode.id);
  if (outboundConns.length === 0) {
    await workflowModel.completeEnrollment(enrollment.id);
    return;
  }

  let nextConn;
  if (currentNode.type === 'condition') {
    const entityRow = await fetchEntityRow(enrollment);
    const result = evaluateCondition(currentNode.config, entityRow);
    nextConn = outboundConns.find(c => c.branch === (result ? 'yes' : 'no'))
      || outboundConns[0];
  } else {
    nextConn = outboundConns[0];
  }

  if (!nextConn) {
    await workflowModel.completeEnrollment(enrollment.id);
    return;
  }

  const nextNode = nodes.find(n => n.id === nextConn.to);
  if (!nextNode) {
    await workflowModel.completeEnrollment(enrollment.id);
    return;
  }

  const delayMs = (nextNode.delay_minutes || 0) * 60 * 1000;
  const nextAt = new Date(Date.now() + delayMs);
  await workflowModel.advanceEnrollmentByNode(enrollment.id, nextNode.id, nextAt);
}

// ── Test/Dry-Run: simulate workflow execution without side effects ────────

export async function testWorkflow(workflowDef, brandId, entityId) {
  const { nodes = [], connections = [] } = workflowDef || {};
  const triggerNode = nodes.find(n => n.type === 'trigger');
  if (!triggerNode) return { steps: [], error: 'No trigger node found' };

  const firstConn = connections.find(c => c.from === triggerNode.id);
  if (!firstConn) return { steps: [{ nodeId: triggerNode.id, label: 'Trigger fires', status: 'ok' }], error: 'No nodes connected to trigger' };

  // Fetch real entity data for condition evaluation
  let entityRow = null;
  if (entityId) {
    entityRow = (await query(
      `SELECT c.*, (SELECT stage FROM pipeline_deals d WHERE d.client_id = c.id AND d.is_active = TRUE ORDER BY d.created_at DESC LIMIT 1) AS pipeline_stage
       FROM clients c WHERE c.id = $1`, [entityId]
    )).rows[0] || null;
  }

  const steps = [{ nodeId: triggerNode.id, type: 'trigger', label: 'Trigger fires', status: 'ok' }];
  const visited = new Set();
  let currentId = firstConn.to;
  let branch = firstConn.branch || null;

  while (currentId && !visited.has(currentId) && steps.length < 50) {
    visited.add(currentId);
    const node = nodes.find(n => n.id === currentId);
    if (!node) { steps.push({ nodeId: currentId, label: 'Missing node', status: 'error' }); break; }

    if (node.type === 'condition') {
      const result = entityRow ? evaluateCondition(node.config, entityRow) : null;
      const branchTaken = result === null ? 'unknown' : (result ? 'yes' : 'no');
      steps.push({
        nodeId: node.id, type: 'condition',
        label: `Condition: ${node.config?.field || '?'} ${node.config?.operator || '?'} ${node.config?.value || ''}`.trim(),
        status: 'ok', branch: branchTaken,
        detail: result === null ? 'No test client selected — cannot evaluate' : `Evaluates to ${branchTaken.toUpperCase()}`,
      });

      if (result === null) break; // can't continue without entity data
      const nextConn = connections.filter(c => c.from === node.id).find(c => c.branch === branchTaken);
      currentId = nextConn?.to || null;
      branch = nextConn?.branch || null;
    } else {
      // Action node — validate config without executing
      const config = node.config || {};
      let status = 'ok';
      let detail = '';
      if (node.type === 'send_email') {
        if (!config.subject) { status = 'warning'; detail = 'Missing subject'; }
        else detail = `Subject: "${config.subject}"`;
      } else if (node.type === 'send_sms') {
        if (!config.message) { status = 'warning'; detail = 'Missing message'; }
        else detail = `Message: "${config.message.slice(0, 50)}"`;
      } else if (node.type === 'create_task') {
        detail = config.title || 'Untitled task';
      } else if (node.type === 'add_tag' || node.type === 'remove_tag') {
        detail = config.tag ? `Tag: ${config.tag}` : 'No tag set';
        if (!config.tag) status = 'warning';
      } else if (node.type === 'move_pipeline_stage') {
        detail = config.stage || 'No stage set';
      } else if (node.type === 'enroll_in_drip') {
        detail = config.sequence_id ? 'Sequence selected' : 'No sequence set';
        if (!config.sequence_id) status = 'warning';
      } else if (node.type === 'send_webhook') {
        detail = config.url ? config.url.slice(0, 60) : 'No URL set';
        if (!config.url) status = 'warning';
      } else if (node.type === 'wait') {
        detail = `Wait ${node.delay_minutes || 0} minutes`;
      }

      const actionLabel = ACTION_LABELS[node.type] || node.type;
      steps.push({
        nodeId: node.id, type: node.type,
        label: actionLabel,
        status, detail,
        delay: node.delay_minutes || 0,
      });

      const nextConn = connections.find(c => c.from === node.id);
      currentId = nextConn?.to || null;
      branch = nextConn?.branch || null;
    }
  }

  if (visited.has(currentId)) {
    steps.push({ nodeId: currentId, type: 'error', label: 'Cycle detected — workflow would loop here', status: 'error' });
  }

  return { steps };
}

const ACTION_LABELS = {
  send_email: 'Send Email',
  send_sms: 'Send SMS',
  create_task: 'Create Task',
  add_tag: 'Add Tag',
  remove_tag: 'Remove Tag',
  move_pipeline_stage: 'Move Pipeline Stage',
  enroll_in_drip: 'Enroll in Email Sequence',
  create_note: 'Create Note',
  send_webhook: 'Send Webhook',
  wait: 'Wait / Delay',
};

// ── TRIGGER: fire-and-forget enrollment helper ──────────────────────────────

export async function triggerWorkflow(brandId, triggerType, entityId, entityType = 'client') {
  try {
    const workflows = await workflowModel.getActiveWorkflowsForTrigger(brandId, triggerType);
    for (const wf of workflows) {
      try {
        // Skip if already actively enrolled
        const existing = await query(
          `SELECT id FROM automation_enrollments
           WHERE workflow_id = $1 AND entity_id = $2 AND status = 'active' LIMIT 1`,
          [wf.id, entityId]
        );
        if (existing.rows.length > 0) continue;

        if (wf.workflow_definition) {
          const def = wf.workflow_definition;
          const triggerNode = def.nodes?.find(n => n.type === 'trigger');
          if (!triggerNode) continue;
          const firstConn = def.connections?.find(c => c.from === triggerNode.id);
          if (!firstConn) {
            // No connections yet — enroll but complete immediately
            await workflowModel.enrollEntity({
              workflow_id: wf.id, brand_id: brandId,
              entity_id: entityId, entity_type: entityType,
              next_step_at: new Date(), current_node_id: null
            });
            continue;
          }
          const firstNode = def.nodes.find(n => n.id === firstConn.to);
          if (!firstNode) continue;
          const delayMs = (firstNode.delay_minutes || 0) * 60 * 1000;
          await workflowModel.enrollEntity({
            workflow_id: wf.id, brand_id: brandId,
            entity_id: entityId, entity_type: entityType,
            next_step_at: new Date(Date.now() + delayMs),
            current_node_id: firstNode.id
          });
        } else {
          // Legacy linear workflow
          const wfWithSteps = await workflowModel.getWorkflowWithSteps(wf.id);
          const firstStep = wfWithSteps?.steps?.[0];
          const delayMs = (firstStep?.delay_minutes || 0) * 60 * 1000;
          await workflowModel.enrollEntity({
            workflow_id: wf.id, brand_id: brandId,
            entity_id: entityId, entity_type: entityType,
            next_step_at: new Date(Date.now() + delayMs)
          });
        }
      } catch (err) {
        console.error(`triggerWorkflow enroll error (wf ${wf.id}):`, err.message);
      }
    }
  } catch (err) {
    console.error(`triggerWorkflow error (${triggerType}):`, err.message);
  }
}
