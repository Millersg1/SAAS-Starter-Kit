import pg from 'pg';
import jwt from 'jsonwebtoken';
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

const PHONE = '+13309190037';
const BRAND_ID = 'cc3dd16b-5cf8-45d2-97d4-9e2a5ea87659';

async function call() {
  // Get user for auth token
  const u = await pool.query('SELECT id FROM users LIMIT 1');
  const token = jwt.sign({ id: u.rows[0].id, type: 'access' }, process.env.JWT_SECRET, { expiresIn: '5m' });

  const res = await fetch('https://api.saassurface.com/api/surf/' + BRAND_ID + '/voice/test-call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify({ phone_number: PHONE }),
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log(JSON.stringify(data, null, 2));
  await pool.end();
}

call().catch(err => { console.error(err.message); process.exit(1); });
