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

await pool.query(`
  CREATE TABLE IF NOT EXISTS consent_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    consent_type VARCHAR(50) NOT NULL,
    consent_method VARCHAR(50) NOT NULL,
    consent_given BOOLEAN DEFAULT TRUE,
    ip_address VARCHAR(50),
    user_agent TEXT,
    source VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_consent_log_phone ON consent_log(contact_phone);
  CREATE INDEX IF NOT EXISTS idx_consent_log_email ON consent_log(contact_email);
  CREATE INDEX IF NOT EXISTS idx_consent_log_brand ON consent_log(brand_id);
`);

console.log('consent_log table created');
await pool.end();
