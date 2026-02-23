// One-shot migration runner for migrations 026 and 027
// Run: node run-migrations.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const __dir = dirname(fileURLToPath(import.meta.url));
const migrations = [
  '026_create_webhooks.sql',
  '027_create_contracts.sql',
];

(async () => {
  for (const file of migrations) {
    const path = join(__dir, 'src', 'migrations', file);
    try {
      const sql = readFileSync(path, 'utf8');
      await pool.query(sql);
      console.log(`✓ Applied: ${file}`);
    } catch (err) {
      console.error(`✗ Failed: ${file}`, err.message);
    }
  }
  await pool.end();
  console.log('Done.');
})();
