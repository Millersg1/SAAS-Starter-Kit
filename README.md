# SSK Lovable - React + Vite + Supabase

A SaaS Starter Kit built with React, Vite, and Supabase - optimized for Lovable import.

## Features

- ⚡️ **Vite** - Lightning fast builds
- ⚛️ **React 19** - Latest React with hooks
- 🎨 **Tailwind CSS** - Utility-first styling
- 🔐 **Supabase Auth** - Email, social, and magic link auth
- 💳 **Stripe Integration** - Subscriptions via Edge Functions
- 📧 **Email** - Transactional emails with Resend
- 🌓 **Dark Mode** - System-aware theme switching
- 📱 **Responsive** - Mobile-first design

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

## Environment Variables

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

## Project Structure

```
src/
├── components/       # UI components
│   ├── ui/          # shadcn/ui components
│   └── theme-*.tsx  # Theme components
├── hooks/           # React hooks
│   ├── useAuth.ts   # Auth hook
│   └── use-toast.ts # Toast hook
├── integrations/    # External services
│   └── supabase/    # Supabase client & types
├── lib/             # Utilities
├── pages/           # Route components
│   ├── auth/        # Auth pages
│   └── dashboard/   # Dashboard pages
├── App.tsx          # Root component
├── main.tsx         # Entry point
└── index.css        # Global styles

supabase/
├── functions/       # Edge Functions
│   ├── stripe-webhook/
│   ├── create-checkout/
│   └── send-email/
└── config.toml      # Local config
```

## Lovable Import

This project is structured for seamless Lovable import:
1. Push to GitHub
2. Connect Lovable to your repo
3. Import and customize

## Edge Functions

Deploy Edge Functions to handle server-side operations:

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set RESEND_API_KEY=re_...

# Deploy functions
supabase functions deploy
```

## License

MIT
