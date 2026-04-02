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

const BRAND_ID = 'cc3dd16b-5cf8-45d2-97d4-9e2a5ea87659';
const PHONE = '+12162386665';

async function create() {
  // Check if agent already exists for this phone
  const existing = await pool.query(
    `SELECT id, name FROM voice_agents WHERE brand_id = $1 AND phone_number = $2`,
    [BRAND_ID, PHONE]
  );

  if (existing.rows.length > 0) {
    // Update existing agent
    await pool.query(
      `UPDATE voice_agents SET
        name = 'Surf',
        personality = $1,
        greeting = $2,
        voice = 'alloy',
        model = 'gpt-4o-realtime-preview',
        is_active = TRUE,
        knowledge_base = $3,
        updated_at = NOW()
       WHERE id = $4`,
      [
        `You are Surf, the AI assistant for Faith Harbor LLC. You are professional, warm, and helpful. You help callers with questions about the agency's services, schedule appointments, capture lead information, and handle general inquiries. Keep responses conversational and concise — you are on a live phone call. Never use markdown or formatting. Be confident and knowledgeable.`,
        `Hi there! This is Surf, the AI assistant for Faith Harbor. How can I help you today?`,
        JSON.stringify([
          { question: 'What services do you offer?', answer: 'We offer web design, branding, digital marketing, SEO, social media management, and consulting services for businesses of all sizes.' },
          { question: 'How can I get a quote?', answer: 'I can capture your information and have our team send you a detailed proposal within 24 hours.' },
          { question: 'What are your hours?', answer: 'Our office hours are Monday through Friday, 9 AM to 5 PM Eastern Time.' },
        ]),
        existing.rows[0].id,
      ]
    );
    console.log('Updated existing Surf agent:', existing.rows[0].id);
  } else {
    // Create new agent
    const result = await pool.query(
      `INSERT INTO voice_agents (brand_id, name, personality, greeting, voice, model, language, phone_number, is_active, knowledge_base, tools_config)
       VALUES ($1, 'Surf', $2, $3, 'alloy', 'gpt-4o-realtime-preview', 'en', $4, TRUE, $5, '[]')
       RETURNING id`,
      [
        BRAND_ID,
        `You are Surf, the AI assistant for Faith Harbor LLC. You are professional, warm, and helpful. You help callers with questions about the agency's services, schedule appointments, capture lead information, and handle general inquiries. Keep responses conversational and concise — you are on a live phone call. Never use markdown or formatting. Be confident and knowledgeable.`,
        `Hi there! This is Surf, the AI assistant for Faith Harbor. How can I help you today?`,
        PHONE,
        JSON.stringify([
          { question: 'What services do you offer?', answer: 'We offer web design, branding, digital marketing, SEO, social media management, and consulting services for businesses of all sizes.' },
          { question: 'How can I get a quote?', answer: 'I can capture your information and have our team send you a detailed proposal within 24 hours.' },
          { question: 'What are your hours?', answer: 'Our office hours are Monday through Friday, 9 AM to 5 PM Eastern Time.' },
        ]),
      ]
    );
    console.log('Created Surf voice agent:', result.rows[0].id);
  }

  console.log('Surf is ready to answer calls on', PHONE);
  await pool.end();
}

create().catch(err => { console.error(err.message); process.exit(1); });
