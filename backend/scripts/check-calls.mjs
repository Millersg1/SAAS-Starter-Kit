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

async function check() {
  console.log('=== Recent Voice Agent Calls ===\n');
  const calls = await pool.query(
    `SELECT id, caller_phone, direction, status, summary, sentiment, duration_seconds, lead_captured, transcript, started_at
     FROM voice_agent_calls ORDER BY started_at DESC LIMIT 3`
  );

  for (const c of calls.rows) {
    console.log(`Call: ${c.caller_phone} | ${c.direction} | ${c.status} | ${c.duration_seconds}s | ${c.started_at}`);
    console.log(`  Summary: ${c.summary || '(none)'}`);
    console.log(`  Sentiment: ${c.sentiment || '(none)'}`);
    console.log(`  Lead: ${c.lead_captured ? JSON.stringify(c.lead_captured) : '(none)'}`);
    if (c.transcript && c.transcript.length > 0) {
      console.log('  Transcript:');
      for (const t of c.transcript) {
        console.log(`    ${t.role}: ${t.text || '(audio)'}`);
      }
    }
    console.log('');
  }

  console.log('=== Leads from Voice ===\n');
  const leads = await pool.query(
    `SELECT id, name, email, phone, status, source, notes, created_at
     FROM clients WHERE source = 'voice_agent' ORDER BY created_at DESC LIMIT 5`
  );
  if (leads.rows.length > 0) {
    for (const l of leads.rows) {
      console.log(`Lead: ${l.name} | ${l.email} | ${l.phone} | ${l.status}`);
    }
  } else {
    console.log('(no voice leads in clients table)');
  }

  console.log('\n=== Recent Lead Submissions ===\n');
  const subs = await pool.query(
    `SELECT id, name, email, source, data, submitted_at
     FROM lead_submissions ORDER BY submitted_at DESC LIMIT 5`
  );
  for (const s of subs.rows) {
    console.log(`${s.name} | ${s.email} | ${s.source} | ${s.submitted_at}`);
  }

  await pool.end();
}

check().catch(err => { console.error(err.message); process.exit(1); });
