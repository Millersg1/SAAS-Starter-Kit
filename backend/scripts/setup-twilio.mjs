import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const TWILIO_SID = 'AC40e31500d742cfdf9fca8bb1867ada6d';
const TWILIO_TOKEN = 'd5eda1ecd0cd5ad7ccb32cf811023b55';
const TWILIO_PHONE = '+18554558182';

async function setup() {
  // Get first brand
  const brands = await pool.query('SELECT id, name FROM brands ORDER BY created_at ASC LIMIT 1');
  if (!brands.rows[0]) { console.error('No brands found'); process.exit(1); }
  const brandId = brands.rows[0].id;
  console.log('Brand:', brands.rows[0].name, '(' + brandId + ')');

  // Delete existing and insert fresh
  await pool.query(`DELETE FROM twilio_connections WHERE brand_id = $1`, [brandId]);
  await pool.query(
    `INSERT INTO twilio_connections (brand_id, account_sid, auth_token, phone_number, is_active)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [brandId, TWILIO_SID, TWILIO_TOKEN, TWILIO_PHONE]
  );
  console.log('Twilio connected:', TWILIO_PHONE);

  // Enable Surf Voice
  await pool.query(
    `INSERT INTO surf_voice_settings (brand_id, voice_enabled, voice_style, lead_followup_enabled, invoice_reminder_enabled, appointment_confirmation_enabled, inbound_enabled)
     VALUES ($1, TRUE, 'professional', TRUE, TRUE, TRUE, TRUE)
     ON CONFLICT (brand_id) DO UPDATE SET
       voice_enabled = TRUE, lead_followup_enabled = TRUE, invoice_reminder_enabled = TRUE,
       appointment_confirmation_enabled = TRUE, inbound_enabled = TRUE`,
    [brandId]
  );
  console.log('Surf Voice: ENABLED');
  console.log('Phone: +1 (216) 238-6665');

  await pool.end();
}

setup().catch(err => { console.error(err.message); process.exit(1); });
