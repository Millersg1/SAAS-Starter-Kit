import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const r = await pool.query(
  `SELECT name, email, phone, status, notes, created_at
   FROM clients
   WHERE brand_id = 'cc3dd16b-5cf8-45d2-97d4-9e2a5ea87659'
   ORDER BY created_at DESC LIMIT 10`
);

console.log('Latest clients:\n');
for (const l of r.rows) {
  console.log(`${l.name} | ${l.email || 'no email'} | ${l.phone || 'no phone'} | ${l.status} | ${(l.notes || '').slice(0, 60)} | ${l.created_at}`);
}

await pool.end();
