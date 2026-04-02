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
  const calls = await pool.query(
    `SELECT id, caller_phone, direction, status, summary, sentiment, duration_seconds, transcript, started_at
     FROM voice_agent_calls ORDER BY started_at DESC LIMIT 10`
  );

  console.log(`Found ${calls.rows.length} calls:\n`);
  for (const c of calls.rows) {
    console.log(`--- Call ${c.started_at} ---`);
    console.log(`Phone: ${c.caller_phone} | ${c.direction} | ${c.status} | ${c.duration_seconds}s`);
    console.log(`Summary: ${c.summary || '(none)'}`);
    if (c.transcript?.length > 0) {
      console.log('Transcript:');
      for (const t of c.transcript) {
        console.log(`  ${t.role}: ${t.text || '(no text)'}`);
      }
    }
    console.log('');
  }

  await pool.end();
}

check().catch(err => { console.error(err.message); process.exit(1); });
