# SAAS Surface — Project Context

## What is this?
SAAS Surface is an all-in-one **Agency OS** SaaS platform. It provides agencies with CRM, invoicing, proposals, contracts, project management, email marketing, workflow automation, client portal, AI voice agents, and white-label capabilities.

## Architecture
- **Frontend**: React 18 + Vite + Tailwind CSS (SPA)
- **Backend**: Node.js + Express (ES modules) + PostgreSQL
- **Auth**: JWT (access + refresh tokens with separate secrets), API keys, portal tokens
- **Payments**: Stripe Connect (platform fee model)
- **Email**: Nodemailer (SMTP) + IMAP sync
- **SMS/Voice**: Twilio
- **AI**: OpenAI API for content generation, drafting, transcription
- **Deployment**: cPanel with PM2 cluster mode, GitHub Actions CI/CD

## Key Directories
```
backend/
  server.js          — Entry point, migrations, cron jobs
  src/app.js         — Express app setup, middleware, 64 route mounts
  src/controllers/   — Route handlers (62 files)
  src/models/        — Database query functions
  src/middleware/     — Auth, rate limiting, plan enforcement, uploads
  src/routes/        — Express routers (64 files)
  src/utils/         — Cron jobs, email, logging, workflow engine
  src/config/        — Database pool, plan tiers

frontend/
  src/App.jsx        — React Router with 70+ routes
  src/pages/         — Page components (eagerly + lazy loaded)
  src/components/    — Shared components (SEO, Layout, ErrorBoundary)
  src/context/       — Auth, Portal, Theme, Socket, I18n providers
  src/services/      — API client (axios)
```

## Database
PostgreSQL with 50+ tables. Schema managed via inline DDL migrations in server.js (idempotent, IF NOT EXISTS). Key tables: users, brands, brand_members, clients, projects, invoices, proposals, contracts, deals, pipelines, tasks, campaigns, workflows.

## Multi-tenancy
Everything is scoped to `brand_id`. Users belong to brands via `brand_members` with roles (owner, admin, member). Plan enforcement middleware gates features per subscription tier.

## Commands
```bash
# Backend
cd backend
npm run dev          # Development server (nodemon)
npm run start        # Production server
npm test             # Run tests
npm run migrate      # Run DB migrations
npm run seed         # Seed demo data

# Frontend
cd frontend
npm run dev          # Vite dev server
npm run build        # Production build
npm run lint         # ESLint

# Docker
docker-compose up    # Full stack with PostgreSQL
```

## Environment Variables
See `backend/.env.example` for all required variables. Critical ones:
- `JWT_SECRET` — Required, app exits without it
- `JWT_REFRESH_SECRET` — Separate secret for refresh tokens (defaults to JWT_SECRET + '_refresh')
- `DB_*` — PostgreSQL connection
- `STRIPE_SECRET_KEY` — Stripe payments
- `SMTP_*` — Email sending
- `SENTRY_DSN` — Error tracking (optional)
- `TWILIO_AUTH_TOKEN` — Webhook signature validation

## Conventions
- Backend uses `catchAsync` wrapper or try/catch with `next(error)` for error handling
- Controllers verify brand membership before accessing resources
- All IDs are UUIDs
- API responses follow `{ status: 'success'|'fail', data: {...}, message: '...' }` format
- Frontend uses `react-helmet-async` for per-page SEO
- Structured logging via pino (JSON in production, pretty in development)

## Testing
- Backend: Node.js native test runner + c8 coverage
- Frontend: No tests yet (planned: vitest + react-testing-library)
- CI: GitHub Actions runs tests against PostgreSQL 16 container

## Security Notes
- Refresh tokens are stored as SHA256 hashes (not plain text)
- Access and refresh tokens use separate JWT secrets with type claims
- Twilio webhooks validate X-Twilio-Signature
- File uploads validate magic bytes (not just MIME type)
- Rate limiting uses user ID when authenticated, IP for anonymous
- Plan enforcement middleware is active on all API routes
- Portal controller enforces JWT_SECRET at startup (no fallback)
