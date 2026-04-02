import pg from 'pg';
import fs from 'fs';
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

const file = process.argv[2] || '/tmp/voice_tables.sql';
const sql = fs.readFileSync(file, 'utf-8');

pool.query(sql)
  .then(() => { console.log('Migration applied:', file); return pool.end(); })
  .catch(err => { console.error('Migration error:', err.message); process.exit(1); });
