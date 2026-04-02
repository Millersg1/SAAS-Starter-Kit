/**
 * Database seed script — creates demo data for development/demos.
 * Usage: node scripts/seed.mjs
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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

const q = (text, params) => pool.query(text, params);

async function seed() {
  console.log('Seeding database...\n');

  // ── Demo User (admin) ──
  const password = await bcrypt.hash('Demo1234!', 12);
  const userRes = await q(
    `INSERT INTO users (name, email, password, role, email_verified, is_superadmin)
     VALUES ($1, $2, $3, 'admin', TRUE, TRUE)
     ON CONFLICT (email) DO UPDATE SET name = $1
     RETURNING id, email`,
    ['Demo Admin', 'demo@saassurface.com', password]
  );
  const userId = userRes.rows[0].id;
  console.log(`User: demo@saassurface.com / Demo1234!  (id: ${userId})`);

  // ── Demo Brand ──
  const brandRes = await q(
    `INSERT INTO brands (name, slug, owner_id, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (slug) DO UPDATE SET name = $1
     RETURNING id`,
    ['Acme Digital Agency', 'acme-digital', userId]
  );
  const brandId = brandRes.rows[0].id;
  console.log(`Brand: Acme Digital Agency (id: ${brandId})`);

  // ── Brand membership ──
  await q(
    `INSERT INTO brand_members (brand_id, user_id, role, is_active)
     VALUES ($1, $2, 'owner', TRUE)
     ON CONFLICT (brand_id, user_id) DO NOTHING`,
    [brandId, userId]
  );

  // ── Demo Clients ──
  const clients = [
    ['Sarah Johnson', 'sarah@example.com', '+15551234567', 'Johnson Corp', 'active'],
    ['Mike Chen', 'mike@example.com', '+15559876543', 'Chen Industries', 'active'],
    ['Lisa Park', 'lisa@example.com', '+15555551234', 'Park Design Co', 'active'],
    ['James Wilson', 'james@example.com', '+15554443333', 'Wilson Media', 'lead'],
    ['Emma Davis', 'emma@example.com', '+15556667777', 'Davis Consulting', 'active'],
  ];

  const clientIds = [];
  for (const [name, email, phone, company, status] of clients) {
    const res = await q(
      `INSERT INTO clients (brand_id, name, email, phone, company, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING RETURNING id`,
      [brandId, name, email, phone, company, status, userId]
    );
    if (res.rows[0]) clientIds.push(res.rows[0].id);
  }
  console.log(`Clients: ${clientIds.length} created`);

  // ── Demo Projects ──
  const projects = [
    ['Website Redesign', 'Complete rebrand and website rebuild', 'in_progress', 15000],
    ['SEO Campaign', 'Monthly SEO optimization and reporting', 'active', 5000],
    ['Social Media Management', 'Content creation and scheduling for Q2', 'planning', 3000],
  ];

  for (let i = 0; i < projects.length && i < clientIds.length; i++) {
    const [name, desc, status, budget] = projects[i];
    await q(
      `INSERT INTO projects (brand_id, client_id, name, description, status, budget, currency, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'USD', $7)
       ON CONFLICT DO NOTHING`,
      [brandId, clientIds[i], name, desc, status, budget, userId]
    );
  }
  console.log(`Projects: ${Math.min(projects.length, clientIds.length)} created`);

  // ── Demo Invoices ──
  for (let i = 0; i < 3 && i < clientIds.length; i++) {
    const num = `INV-${String(i + 1).padStart(4, '0')}`;
    const total = [2500, 5000, 1200][i];
    const status = ['sent', 'paid', 'overdue'][i];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (status === 'overdue' ? -15 : 30));

    await q(
      `INSERT INTO invoices (brand_id, client_id, invoice_number, status, total_amount, amount_due, currency, issue_date, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'USD', CURRENT_DATE, $7, $8)
       ON CONFLICT DO NOTHING`,
      [brandId, clientIds[i], num, status, total, status === 'paid' ? 0 : total, dueDate.toISOString().split('T')[0], userId]
    );
  }
  console.log('Invoices: 3 created');

  // ── Demo Tasks ──
  const tasks = [
    ['Review brand guidelines', 'high', 3],
    ['Create wireframes for homepage', 'medium', 7],
    ['Write blog post about agency growth', 'low', 14],
    ['Send monthly report to Sarah', 'high', 1],
    ['Follow up with James on proposal', 'medium', 2],
  ];

  for (const [title, priority, dueDays] of tasks) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);
    await q(
      `INSERT INTO tasks (brand_id, title, priority, due_date, status, created_by)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       ON CONFLICT DO NOTHING`,
      [brandId, title, priority, dueDate.toISOString().split('T')[0], userId]
    );
  }
  console.log('Tasks: 5 created');

  // ── Demo Pipeline ──
  await q(
    `INSERT INTO pipelines (brand_id, name, stages, created_by)
     VALUES ($1, 'Sales Pipeline', $2, $3)
     ON CONFLICT DO NOTHING`,
    [brandId, JSON.stringify(['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']), userId]
  );
  console.log('Pipeline: 1 created');

  console.log('\nSeed complete!');
  console.log('Login: demo@saassurface.com / Demo1234!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
