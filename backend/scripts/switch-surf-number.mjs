import twilio from 'twilio';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const SID = 'AC4ef2d9f2b1eb14c287c1017b86d89424';
const TOKEN = '627232b169dafe4c4e6a3225f58a1d78';
const NEW_PHONE = '+18666516660';
const BRAND_ID = 'cc3dd16b-5cf8-45d2-97d4-9e2a5ea87659';
const WEBHOOK_URL = 'https://api.saassurface.com/api/voice-agents/incoming-call';

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function switchNumber() {
  const client = twilio(SID, TOKEN);

  // 1. Configure webhook on new number
  const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: NEW_PHONE });
  if (numbers.length === 0) {
    console.error('Number not found in Twilio account:', NEW_PHONE);
    process.exit(1);
  }

  await client.incomingPhoneNumbers(numbers[0].sid).update({
    voiceUrl: WEBHOOK_URL,
    voiceMethod: 'POST',
  });
  console.log('Twilio webhook set for', NEW_PHONE);

  // 2. Update voice agent
  await pool.query(
    `UPDATE voice_agents SET phone_number = $1, updated_at = NOW() WHERE brand_id = $2 AND name = 'Surf'`,
    [NEW_PHONE, BRAND_ID]
  );
  console.log('Voice agent updated to', NEW_PHONE);

  // 3. Update Twilio connection
  await pool.query(
    `UPDATE twilio_connections SET phone_number = $1 WHERE brand_id = $2`,
    [NEW_PHONE, BRAND_ID]
  );
  console.log('Twilio connection updated to', NEW_PHONE);

  console.log('\nSurf is now on', NEW_PHONE, '(1-866-651-6660)');
  await pool.end();
}

switchNumber().catch(err => { console.error(err.message); process.exit(1); });
