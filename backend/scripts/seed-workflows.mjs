/**
 * Seed 5 pre-built automation workflows for a brand.
 * These are production-ready, toggleable workflows using the existing visual workflow engine.
 * Usage: node scripts/seed-workflows.mjs [brandId]
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const BRAND_ID = process.argv[2] || 'cc3dd16b-5cf8-45d2-97d4-9e2a5ea87659';

// Helper to generate unique node IDs
let nodeCounter = 0;
const nid = () => `node_${++nodeCounter}_${Date.now()}`;

async function getOwnerId() {
  const r = await pool.query(`SELECT user_id FROM brand_members WHERE brand_id = $1 AND role = 'owner' LIMIT 1`, [BRAND_ID]);
  return r.rows[0]?.user_id || null;
}

async function createWorkflow(name, triggerType, triggerConfig, definition) {
  const ownerId = await getOwnerId();

  // Check if workflow already exists
  const existing = await pool.query(
    `SELECT id FROM automation_workflows WHERE brand_id = $1 AND name = $2`,
    [BRAND_ID, name]
  );
  if (existing.rows.length > 0) {
    console.log(`  ⏭  "${name}" already exists — skipping`);
    return;
  }

  await pool.query(
    `INSERT INTO automation_workflows (brand_id, name, trigger_type, trigger_config, workflow_definition, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6)`,
    [BRAND_ID, name, triggerType, JSON.stringify(triggerConfig), JSON.stringify(definition), ownerId]
  );
  console.log(`  ✅ "${name}" created`);
}

async function seed() {
  console.log(`\nSeeding workflows for brand ${BRAND_ID}...\n`);

  // ════════════════════════════════════════════════════════════════
  // WORKFLOW 1: New Lead – Instant Follow-Up
  // ════════════════════════════════════════════════════════════════
  const w1_trigger = nid();
  const w1_sms1 = nid();
  const w1_email1 = nid();
  const w1_wait = nid();
  const w1_condition = nid();
  const w1_sms2 = nid();

  await createWorkflow('New Lead – Instant Follow-Up', 'lead_submitted', {}, {
    nodes: [
      { id: w1_trigger, type: 'trigger', config: { event: 'lead_submitted' }, position: { x: 300, y: 50 } },
      {
        id: w1_sms1, type: 'send_sms', delay_minutes: 0,
        config: { message: 'Hey {{client.name}}, thanks for reaching out to us. Want to book a quick call? Here\'s the link: {{booking_link}}' },
        position: { x: 300, y: 180 },
      },
      {
        id: w1_email1, type: 'send_email', delay_minutes: 0,
        config: {
          subject: 'Got your request',
          body: 'Hi {{client.name}},\n\nWe received your request and wanted to follow up quickly.\n\nYou can book a time here:\n{{booking_link}}\n\nLooking forward to connecting.',
        },
        position: { x: 300, y: 310 },
      },
      { id: w1_wait, type: 'wait', delay_minutes: 10, config: {}, position: { x: 300, y: 440 } },
      {
        id: w1_condition, type: 'condition',
        config: { field: 'status', operator: 'equals', value: 'pending' },
        position: { x: 300, y: 570 },
      },
      {
        id: w1_sms2, type: 'send_sms', delay_minutes: 0,
        config: { message: 'Just wanted to follow up, {{client.name}} — do you still want help with this?' },
        position: { x: 150, y: 700 },
      },
    ],
    connections: [
      { from: w1_trigger, to: w1_sms1 },
      { from: w1_sms1, to: w1_email1 },
      { from: w1_email1, to: w1_wait },
      { from: w1_wait, to: w1_condition },
      { from: w1_condition, to: w1_sms2, branch: 'yes' },
    ],
  });

  // ════════════════════════════════════════════════════════════════
  // WORKFLOW 2: Missed Call – Recovery
  // ════════════════════════════════════════════════════════════════
  const w2_trigger = nid();
  const w2_sms1 = nid();
  const w2_wait = nid();
  const w2_condition = nid();
  const w2_sms2 = nid();

  await createWorkflow('Missed Call – Recovery', 'missed_call', {}, {
    nodes: [
      { id: w2_trigger, type: 'trigger', config: { event: 'missed_call' }, position: { x: 300, y: 50 } },
      {
        id: w2_sms1, type: 'send_sms', delay_minutes: 0,
        config: { message: 'Hey {{client.name}}, sorry we missed your call. Want to book a time here? {{booking_link}}' },
        position: { x: 300, y: 180 },
      },
      { id: w2_wait, type: 'wait', delay_minutes: 15, config: {}, position: { x: 300, y: 310 } },
      {
        id: w2_condition, type: 'condition',
        config: { field: 'status', operator: 'equals', value: 'pending' },
        position: { x: 300, y: 440 },
      },
      {
        id: w2_sms2, type: 'send_sms', delay_minutes: 0,
        config: { message: 'Still here if you need anything — you can grab a time here: {{booking_link}}' },
        position: { x: 150, y: 570 },
      },
    ],
    connections: [
      { from: w2_trigger, to: w2_sms1 },
      { from: w2_sms1, to: w2_wait },
      { from: w2_wait, to: w2_condition },
      { from: w2_condition, to: w2_sms2, branch: 'yes' },
    ],
  });

  // ════════════════════════════════════════════════════════════════
  // WORKFLOW 3: Trial User – Onboarding Sequence
  // ════════════════════════════════════════════════════════════════
  const w3_trigger = nid();
  const w3_email1 = nid();
  const w3_wait1 = nid();
  const w3_email2 = nid();
  const w3_wait2 = nid();
  const w3_email3 = nid();
  const w3_wait3 = nid();
  const w3_email4 = nid();

  await createWorkflow('Trial User – Onboarding Sequence', 'client_created', {}, {
    nodes: [
      { id: w3_trigger, type: 'trigger', config: { event: 'client_created' }, position: { x: 300, y: 50 } },
      {
        id: w3_email1, type: 'send_email', delay_minutes: 0,
        config: {
          subject: 'Welcome to SAAS Surface',
          body: 'You\'re in.\n\nYou now have access to a platform that can follow up with leads, answer calls, manage clients, and automate your workflow.\n\nStart here:\n{{login_link}}\n\nSurf is ready.',
        },
        position: { x: 300, y: 180 },
      },
      { id: w3_wait1, type: 'wait', delay_minutes: 1440, config: {}, position: { x: 300, y: 310 } },
      {
        id: w3_email2, type: 'send_email', delay_minutes: 0,
        config: {
          subject: 'Most people miss this',
          body: 'Most users don\'t realize this...\n\nSurf can follow up with leads automatically.\n\nThat alone can increase your conversions quickly.\n\nLog in and test it:\n{{login_link}}',
        },
        position: { x: 300, y: 440 },
      },
      { id: w3_wait2, type: 'wait', delay_minutes: 1440, config: {}, position: { x: 300, y: 570 } },
      {
        id: w3_email3, type: 'send_email', delay_minutes: 0,
        config: {
          subject: 'This replaces your VA',
          body: 'Instead of hiring...\n\nSurf can handle follow-ups, reminders, and updates automatically.\n\nYou don\'t need more tools — just one system.',
        },
        position: { x: 300, y: 700 },
      },
      { id: w3_wait3, type: 'wait', delay_minutes: 1440, config: {}, position: { x: 300, y: 830 } },
      {
        id: w3_email4, type: 'send_email', delay_minutes: 0,
        config: {
          subject: 'Founding pricing won\'t last',
          body: 'We\'re only allowing 50 agencies to lock in pricing.\n\nAfter that, prices increase permanently.\n\nIf you\'re serious, now is the time.',
        },
        position: { x: 300, y: 960 },
      },
    ],
    connections: [
      { from: w3_trigger, to: w3_email1 },
      { from: w3_email1, to: w3_wait1 },
      { from: w3_wait1, to: w3_email2 },
      { from: w3_email2, to: w3_wait2 },
      { from: w3_wait2, to: w3_email3 },
      { from: w3_email3, to: w3_wait3 },
      { from: w3_wait3, to: w3_email4 },
    ],
  });

  // ════════════════════════════════════════════════════════════════
  // WORKFLOW 4: Inactive User – Re-Engagement
  // ════════════════════════════════════════════════════════════════
  const w4_trigger = nid();
  const w4_email1 = nid();
  const w4_sms1 = nid();

  await createWorkflow('Inactive User – Re-Engagement', 'churn_risk', {}, {
    nodes: [
      { id: w4_trigger, type: 'trigger', config: { event: 'churn_risk' }, position: { x: 300, y: 50 } },
      {
        id: w4_email1, type: 'send_email', delay_minutes: 0,
        config: {
          subject: 'Still planning to set this up?',
          body: 'Hey {{client.name}},\n\nJust checking in — are you still planning to set things up?\n\nIf you want, we can help you get started quickly.',
        },
        position: { x: 300, y: 180 },
      },
      {
        id: w4_sms1, type: 'send_sms', delay_minutes: 0,
        config: { message: 'Hey {{client.name}}, need help getting set up? I can walk you through it.' },
        position: { x: 300, y: 310 },
      },
    ],
    connections: [
      { from: w4_trigger, to: w4_email1 },
      { from: w4_email1, to: w4_sms1 },
    ],
  });

  // ════════════════════════════════════════════════════════════════
  // WORKFLOW 5: Demo – Confirmation & Reminder
  // ════════════════════════════════════════════════════════════════
  const w5_trigger = nid();
  const w5_sms1 = nid();
  const w5_email1 = nid();
  const w5_wait = nid();
  const w5_sms2 = nid();
  const w5_wait2 = nid();
  const w5_email2 = nid();

  await createWorkflow('Demo – Confirmation & Reminder', 'booking_created', {}, {
    nodes: [
      { id: w5_trigger, type: 'trigger', config: { event: 'booking_created' }, position: { x: 300, y: 50 } },
      {
        id: w5_sms1, type: 'send_sms', delay_minutes: 0,
        config: { message: 'You\'re booked! Looking forward to talking with you.' },
        position: { x: 300, y: 180 },
      },
      {
        id: w5_email1, type: 'send_email', delay_minutes: 0,
        config: {
          subject: 'Your demo is confirmed',
          body: 'Your demo is scheduled.\n\nWe\'ll walk you through how SAAS Surface can run your agency with Surf.',
        },
        position: { x: 300, y: 310 },
      },
      { id: w5_wait, type: 'wait', delay_minutes: 60, config: {}, position: { x: 300, y: 440 } },
      {
        id: w5_sms2, type: 'send_sms', delay_minutes: 0,
        config: { message: 'Reminder: your demo is coming up in 1 hour.' },
        position: { x: 300, y: 570 },
      },
      { id: w5_wait2, type: 'wait', delay_minutes: 120, config: {}, position: { x: 300, y: 700 } },
      {
        id: w5_email2, type: 'send_email', delay_minutes: 0,
        config: {
          subject: 'Next steps',
          body: 'Great speaking with you.\n\nIf you\'re ready to move forward, you can get started here:\n{{signup_link}}',
        },
        position: { x: 300, y: 830 },
      },
    ],
    connections: [
      { from: w5_trigger, to: w5_sms1 },
      { from: w5_sms1, to: w5_email1 },
      { from: w5_email1, to: w5_wait },
      { from: w5_wait, to: w5_sms2 },
      { from: w5_sms2, to: w5_wait2 },
      { from: w5_wait2, to: w5_email2 },
    ],
  });

  console.log('\nAll workflows seeded!\n');
  await pool.end();
}

seed().catch(err => { console.error(err.message); process.exit(1); });
