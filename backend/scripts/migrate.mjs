import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'src', 'migrations');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const getAppliedMigrationNames = async (client) => {
  const result = await client.query('SELECT name FROM schema_migrations');
  return new Set(result.rows.map((row) => row.name));
};

const listMigrationFiles = async () => {
  const files = await readdir(migrationsDir);
  return files.filter((file) => file.endsWith('.sql')).sort();
};

const applyMigration = async (client, migrationFile) => {
  const migrationPath = join(migrationsDir, migrationFile);
  const sql = await readFile(migrationPath, 'utf8');

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations(name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [migrationFile]
    );
    await client.query('COMMIT');
    console.log(`Applied: ${migrationFile}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Failed migration ${migrationFile}: ${error.message}`);
  }
};

const isAlreadyExistsError = (error) => {
  const codes = new Set(['42710', '42P07', '42723']);
  if (error?.code && codes.has(error.code)) return true;
  const message = String(error?.message || '').toLowerCase();
  return message.includes('already exists');
};

const run = async () => {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrationNames(client);
    const isBaselineRun = applied.size === 0;
    const allMigrations = await listMigrationFiles();

    for (const migration of allMigrations) {
      if (applied.has(migration)) {
        console.log(`Skipped: ${migration}`);
        continue;
      }
      try {
        await applyMigration(client, migration);
      } catch (error) {
        if (isBaselineRun && isAlreadyExistsError(error)) {
          await client.query(
            'INSERT INTO schema_migrations(name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
            [migration]
          );
          console.log(`Baselined existing migration: ${migration}`);
          continue;
        }
        throw error;
      }
    }

    console.log('Migration run complete.');
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
