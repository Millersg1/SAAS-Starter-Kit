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
  // Latest call
  const calls = await pool.query(
    `SELECT caller_phone, summary, sentiment, lead_captured, duration_seconds, transcript
     FROM voice_agent_calls ORDER BY started_at DESC LIMIT 1`
  );
  const c = calls.rows[0];
  if (c) {
    console.log('=== Latest Call ===');
    console.log('Duration:', c.duration_seconds + 's');
    console.log('Summary:', c.summary || '(generating...)');
    console.log('Sentiment:', c.sentiment || '(pending)');
    console.log('Lead captured (tool):', c.lead_captured ? JSON.stringify(c.lead_captured) : 'Tool not called');
    if (c.transcript?.length > 0) {
      console.log('\nTranscript:');
      for (const t of c.transcript) {
        console.log(`  ${t.role}: ${t.text || '(audio)'}`);
      }
    }
  }

  // Recent clients (leads)
  console.log('\n=== Recent Clients/Leads ===');
  const clients = await pool.query(
    `SELECT name, email, phone, status, created_at
     FROM clients WHERE brand_id = 'cc3dd16b-5cf8-45d2-97d4-9e2a5ea87659'
     ORDER BY created_at DESC LIMIT 5`
  );
  for (const l of clients.rows) {
    console.log(`${l.name} | ${l.email || 'no email'} | ${l.phone || 'no phone'} | ${l.status} | ${l.created_at}`);
  }

  await pool.end();
}

check().catch(err => { console.error(err.message); process.exit(1); });
