import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const runMigration = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database - run-migration.js:20');

    // Get migration file from command line argument
    const migrationFile = process.argv[2];
    if (!migrationFile) {
      console.error('❌ Please provide a migration file name - run-migration.js:25');
      console.log('Usage: node  <migrationfile.sql> - run-migration.js:26');
      process.exit(1);
    }

    // Read migration file - handle both relative and full paths
    const migrationPath = migrationFile.startsWith('src/') ? migrationFile : `src/migrations/${migrationFile}`;
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`🔄 Running migration: ${migrationFile}... - run-migration.js:34`);
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully! - run-migration.js:37');
    
  } catch (error) {
    console.error('❌ Migration failed: - run-migration.js:40', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

runMigration();
