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
  // Check constraint definition
  const r = await pool.query(`
    SELECT pg_get_constraintdef(oid) as def, conname
    FROM pg_constraint
    WHERE conrelid = 'clients'::regclass AND contype = 'c'
  `);
  for (const row of r.rows) console.log(row.conname + ':', row.def);

  // Existing statuses
  const s = await pool.query(`SELECT DISTINCT status FROM clients`);
  console.log('\nExisting statuses:', s.rows.map(r => r.status).join(', '));

  await pool.end();
}

check().catch(err => { console.error(err.message); process.exit(1); });
