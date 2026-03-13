import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const features = [
  {
    icon: '🏷️',
    title: 'White-Label Client Portal',
    desc: 'Give every client their own branded login. Your logo, your colors, your domain — clients never see "SAAS Surface."',
  },
  {
    icon: '📁',
    title: 'Project Tracking',
    desc: 'Clients see real-time progress updates on their projects. Reduce "what\'s the status?" emails by 90%.',
  },
  {
    icon: '💰',
    title: 'Invoicing & Payments',
    desc: 'Create, send, and collect card payments directly to your Stripe account. Automated overdue reminders keep cash flowing.',
  },
  {
    icon: '📋',
    title: 'Proposals & E-Signatures',
    desc: 'Send professional quotes. Clients review, sign digitally, and approve — right inside their portal. Accepted proposals auto-convert to invoices.',
  },
  {
    icon: '⏱️',
    title: 'Time Tracking & Billing',
    desc: 'Start a timer, log hours manually, then add billable entries directly to an invoice. Know exactly what to charge every client.',
  },
  {
    icon: '🔗',
    title: 'Shareable Payment Links',
    desc: 'Generate a public payment link for any invoice. Clients pay without needing a portal login — perfect for one-off projects.',
  },
  {
    icon: '📄',
    title: 'Secure Document Sharing',
    desc: 'Upload contracts, deliverables, and reports. Clients download them from their portal — no more email attachments.',
  },
  {
    icon: '💬',
    title: 'Centralized Messaging',
    desc: 'Every client conversation in one thread. No more digging through inboxes. Full history, always searchable.',
  },
  {
    icon: '🏢',
    title: 'Multi-Brand Management',
    desc: 'Run multiple agencies or sub-brands from a single account. Each brand has its own portal, team, clients, and Stripe account.',
  },
];

const salesFeatures = [
  {
    icon: '📈',
    title: 'CRM Pipeline',
    desc: 'Visual kanban board to track every deal from Lead to Won. See weighted pipeline value at a glance and never let an opportunity fall through the cracks.',
    badge: 'New',
  },
  {
    icon: '📊',
    title: 'Revenue Analytics',
    desc: 'Monthly revenue bar charts, proposal conversion rates, top clients by spend, and pipeline-by-stage breakdowns — all in one view.',
    badge: 'New',
  },
  {
    icon: '✅',
    title: 'Tasks & Reminders',
    desc: 'Create tasks linked to clients, projects, or deals. Daily email reminders for tasks due today. Never miss a follow-up again.',
    badge: 'New',
  },
  {
    icon: '📝',
    title: 'Activity Timeline',
    desc: 'Log calls, emails, meetings, and notes against any client. Full chronological history so your whole team stays in context.',
    badge: 'New',
  },
  {
    icon: '🔄',
    title: 'Automated Email Sequences',
    desc: 'When you send a proposal, follow-up emails go out automatically at day 3 and day 7 if the client hasn\'t responded. Accepted proposals cancel the sequence.',
    badge: 'New',
  },
  {
    icon: '🎯',
    title: 'Lead Source Tracking',
    desc: 'Track where every client came from — referral, website, Google Ads, social media. Know which channels drive your best clients.',
    badge: 'New',
  },
];

const contentFeatures = [
  {
    icon: '🌐',
    title: 'Multi-Site CMS',
    desc: 'Manage every client\'s website from one dashboard. Create pages, blog posts, and landing pages with a powerful rich-text editor. Full SEO title, meta description, and OG image controls on every page.',
    badge: 'New',
  },
  {
    icon: '📲',
    title: 'Social Media Management',
    desc: 'Schedule and publish posts to LinkedIn, Twitter/X, Facebook, and Instagram. Manage both your agency accounts and your clients\' accounts from a single content calendar.',
    badge: 'New',
  },
  {
    icon: '✨',
    title: 'AI Content Generation',
    desc: 'One-click AI writes full page content, blog posts, and social captions. Platform-aware — LinkedIn gets professional copy, Instagram gets engaging hooks with hashtags, Twitter gets punchy brevity.',
    badge: 'New',
  },
  {
    icon: '📅',
    title: 'Visual Content Calendar',
    desc: 'See every scheduled social post across all platforms and all clients in a single monthly calendar view. Click any day to preview and manage posts in a slide-out drawer.',
    badge: 'New',
  },
  {
    icon: '🖼️',
    title: 'Centralized Media Library',
    desc: 'Drag-and-drop image uploads organized per site. Insert directly into page content or attach to social posts. No more hunting across Google Drive for client assets.',
    badge: 'New',
  },
  {
    icon: '📊',
    title: 'Content Performance',
    desc: 'Track likes, comments, shares, and impressions on every published social post. Know which content performs best for each client and channel.',
    badge: 'New',
  },
];

const agencyFeatures = [
  {
    icon: '🎨',
    title: 'Brand Voice Profiles',
    desc: 'Define tone, target audience, keywords, and writing style once. Every piece of AI-generated content — pages, blog posts, social captions — automatically reflects your brand personality.',
    badge: 'New',
  },
  {
    icon: '📦',
    title: 'Service Package Tracker',
    desc: 'Set monthly hour, post, and page allowances for each client retainer. Log usage each period and instantly see who\'s over, under, or at capacity — before scope creep costs you.',
    badge: 'New',
  },
  {
    icon: '📋',
    title: 'AI Client Reports',
    desc: 'One click generates a full client report with real data: invoices paid, hours logged, projects completed, social reach, and an AI-written executive summary in your brand voice.',
    badge: 'New',
  },
  {
    icon: '👥',
    title: 'Team Workload Dashboard',
    desc: 'See every team member\'s active tasks, in-progress work, and overdue items at a glance. Spot bottlenecks before they blow deadlines.',
    badge: 'New',
  },
  {
    icon: '⭐',
    title: 'Reputation Management',
    desc: 'Auto-request Google, Facebook, and Yelp reviews after invoice payment or project completion. Track requests, monitor star ratings, and respond to reviews — all in one dashboard.',
    badge: 'New',
  },
  {
    icon: '🚀',
    title: 'Funnel & Landing Page Builder',
    desc: 'Build high-converting opt-in pages, sales funnels, and lead capture pages with a drag-free block editor. 9 section types, live preview, publish with one click, and built-in analytics.',
    badge: 'New',
  },
  {
    icon: '💬',
    title: 'AI Chat Widget',
    desc: 'Embed an AI-powered chat bot on any website. Trained on your brand context — answers questions, captures leads with name + email, and routes all conversations to your inbox.',
    badge: 'New',
  },
  {
    icon: '📧',
    title: 'Email Sequences (Drip Campaigns)',
    desc: 'Build multi-step automated email flows with custom delays. Enroll leads automatically or manually, track open rates per step, and stop sending the moment someone unsubscribes.',
    badge: 'New',
  },
  {
    icon: '⚡',
    title: 'Visual Workflow Builder',
    desc: 'Build multi-branch automation flows on a visual canvas. 11 trigger types, 10+ action types, if/else branching — set it once and let it run forever. No code, no limits.',
    badge: 'New',
  },
];

const steps = [
  {
    number: '01',
    title: 'Set Up Your Brand',
    desc: 'Add your logo, colors, and agency name. Your portal is live in minutes.',
  },
  {
    number: '02',
    title: 'Add Your Clients',
    desc: 'Import or create client accounts. Enable portal access with one click — they get a welcome email automatically.',
  },
  {
    number: '03',
    title: 'Clients Log In & Stay Informed',
    desc: 'Clients view their projects, download files, pay invoices, and message you — all in one beautiful portal.',
  },
];

const plans = [
  {
    name: 'Basic',
    monthly: 29,
    annual: 23,
    desc: 'Perfect for freelancers and solo agencies.',
    features: [
      'Up to 5 clients',
      '10 active projects',
      '5 GB document storage',
      '2 team members',
      'White-label client portal',
      'Invoicing & card payments',
      'Proposals & e-signatures',
      'Time tracking',
      'Tasks & reminders',
      'Activity timeline',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Pro',
    monthly: 79,
    annual: 63,
    desc: 'For growing agencies managing more clients.',
    features: [
      'Up to 25 clients',
      '50 active projects',
      '25 GB document storage',
      '10 team members',
      'Everything in Basic',
      'CRM pipeline & deal tracking',
      'Revenue analytics & reporting',
      'Automated email sequences',
      'Lead source tracking',
      'CMS for up to 3 websites',
      'Social media scheduling (4 platforms)',
      'AI content & caption generation',
      'Brand Voice AI profiles',
      'Service package retainer tracker',
      'AI client report generation',
      'Reputation management & review requests',
      'Funnel & landing page builder',
      'AI chat widget (lead capture)',
      'Email sequences (drip campaigns)',
      'Visual workflow automation (11 triggers)',
      'Custom portal domain',
      'Recurring invoices',
      'Shareable payment links',
      'Two-factor authentication',
      'Priority email support',
    ],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    monthly: 199,
    annual: 159,
    desc: 'Unlimited scale for large agencies.',
    features: [
      'Unlimited clients',
      'Unlimited projects',
      '100 GB document storage',
      'Unlimited team members',
      'Everything in Pro',
      'Multiple brands',
      'Unlimited CMS websites',
      'Unlimited social accounts',
      'AI content generation (unlimited)',
      'Team workload & capacity dashboard',
      'Audit log & activity tracking',
      'Client portal activity dashboard',
      'Proposal view tracking',
      'Onboarding automation',
      'Dedicated support',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
];

const testimonials = [
  {
    name: 'Sarah Okonkwo',
    role: 'Founder, Okonkwo Creative',
    avatar: 'SO',
    quote:
      "Our clients used to email us daily asking for updates. Since we switched to SAAS Surface, those emails are almost gone. Clients love seeing their project progress in real time.",
  },
  {
    name: 'Marcus Deleon',
    role: 'CEO, Deleon Digital Agency',
    avatar: 'MD',
    quote:
      "The white-label portal is a game-changer. Clients think we built custom software for them. It elevates our entire brand and justifies our premium pricing.",
  },
  {
    name: 'Priya Nair',
    role: 'Operations Director, Nair & Co.',
    avatar: 'PN',
    quote:
      "Invoice payments used to take 45+ days. Now clients pay directly from the portal and we're averaging 12 days. The ROI paid for SAAS Surface in the first month.",
  },
  {
    name: 'James Whitfield',
    role: 'Managing Partner, Whitfield Growth',
    avatar: 'JW',
    quote:
      "The CRM pipeline and automated follow-up sequences alone closed 3 deals we would have lost. We went from manually chasing proposals to watching them close themselves.",
  },
];

const faqs = [
  {
    q: 'Will my clients ever see the SAAS Surface name?',
    a: 'Never. Your clients see only your agency name, your logo, and your colors. SAAS Surface is completely invisible — even the email notifications come from your domain.',
  },
  {
    q: 'Can I use my own domain for the client portal?',
    a: 'Yes, on Pro and Enterprise plans. Point your DNS to us (e.g. clients.youragency.com) and we handle the rest. Your clients log in on your domain, not ours.',
  },
  {
    q: 'What happens when my free trial ends?',
    a: 'You\'ll be prompted to select a plan and add a payment method. Your data is never deleted. If you choose not to continue, you have 30 days to export everything.',
  },
  {
    q: 'Do you take a cut of my invoice payments?',
    a: 'A small 2% platform fee applies on successful payments — this keeps your monthly subscription price low. Stripe\'s standard processing fee (2.9% + 30¢) also applies. There are no hidden fees, monthly payment add-ons, or per-seat charges.',
  },
  {
    q: 'How does the CRM pipeline work?',
    a: 'The pipeline is a visual kanban board with 6 stages: Lead → Qualified → Proposal Sent → Negotiation → Won → Lost. Each deal shows the client, value, probability, and expected close date. Weighted pipeline value is automatically calculated across all your deals.',
  },
  {
    q: 'How long does setup take?',
    a: 'Most agencies are live within 10 minutes. Add your logo and colors, create your first client, and enable their portal access. They get a welcome email automatically.',
  },
  {
    q: 'Do my clients need to create their own account?',
    a: 'No. You create the account for them and send a portal invite. They click the link, set a password, and they\'re in. No sign-up friction on their end.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, anytime with no penalty. Cancel from your account settings and you\'ll retain access until the end of your billing period. We also offer a 30-day money-back guarantee.',
  },
  {
    q: 'What payment methods can my clients use?',
    a: 'All major credit and debit cards (Visa, Mastercard, Amex, Discover) via Stripe. Apple Pay and Google Pay are also supported on compatible devices.',
  },
  {
    q: 'How do the automated email sequences work?',
    a: 'When you send a proposal, two follow-up emails are scheduled automatically — one at 3 days and one at 7 days. If the client accepts the proposal before the follow-up fires, it\'s automatically cancelled. No manual follow-up needed.',
  },
  {
    q: 'How does the CMS work for managing client websites?',
    a: 'Each brand can manage multiple websites from one dashboard. You create pages, blog posts, and landing pages with a rich-text editor that supports formatting, images, links, and embeds. Every page has a full SEO panel — title, meta description, OG image, and custom slug. Pages can be saved as drafts, published immediately, or scheduled to go live at a future date and time. The underlying content architecture can also be upgraded to a full block editor without any data migration.',
  },
  {
    q: 'Can I manage social media for my clients, not just my agency?',
    a: 'Yes — that\'s one of the core use cases. You can connect both your agency\'s social accounts and your clients\' accounts. Each account is labeled with the client it belongs to so your team always knows which account they\'re posting from. You can even post to multiple accounts in a single compose action to save time.',
  },
  {
    q: 'Do I need API credentials to use the social media features?',
    a: 'Not to get started. Without API credentials the app works in "manual assist" mode — it prepares your post content and copies it to your clipboard so you can paste and publish natively. For fully automated scheduling and publishing, you enter your platform developer credentials (available for free from each platform\'s developer console) in your brand settings.',
  },
];

const comparisonRows = [
  { feature: 'White-label client portal', clienthub: true, email: false, honeybook: false },
  { feature: 'Custom portal domain', clienthub: true, email: false, honeybook: false },
  { feature: 'Proposals & e-signatures', clienthub: true, email: false, honeybook: true },
  { feature: 'Invoicing & card payments', clienthub: true, email: false, honeybook: true },
  { feature: 'Time tracking & billing', clienthub: true, email: false, honeybook: false },
  { feature: 'Project progress tracking', clienthub: true, email: false, honeybook: true },
  { feature: 'CRM pipeline & deal tracking', clienthub: true, email: false, honeybook: false },
  { feature: 'Revenue analytics dashboard', clienthub: true, email: false, honeybook: false },
  { feature: 'Automated proposal follow-ups', clienthub: true, email: false, honeybook: false },
  { feature: 'Multi-brand management', clienthub: true, email: false, honeybook: false },
  { feature: 'Shareable payment links', clienthub: true, email: false, honeybook: false },
  { feature: 'Audit log & activity tracking', clienthub: true, email: false, honeybook: false },
  { feature: 'Multi-site CMS with SEO controls', clienthub: true, email: false, honeybook: false },
  { feature: 'Social media scheduling (4 platforms)', clienthub: true, email: false, honeybook: false },
  { feature: 'AI content & caption generation', clienthub: true, email: false, honeybook: false },
  { feature: 'Brand Voice AI profiles', clienthub: true, email: false, honeybook: false },
  { feature: 'Service package retainer tracker', clienthub: true, email: false, honeybook: false },
  { feature: 'AI client report generation', clienthub: true, email: false, honeybook: false },
  { feature: 'Team workload dashboard', clienthub: true, email: false, honeybook: false },
  { feature: 'Reputation & review management', clienthub: true, email: false, honeybook: false },
  { feature: 'Funnel & landing page builder', clienthub: true, email: false, honeybook: false },
  { feature: 'AI chat widget (lead capture)', clienthub: true, email: false, honeybook: false },
  { feature: 'Email drip sequences', clienthub: true, email: true, honeybook: false },
  { feature: 'Visual workflow automation', clienthub: true, email: false, honeybook: false },
  { feature: 'No per-transaction platform fee', clienthub: false, email: true, honeybook: false },
];

export default function Landing() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-bold text-xl text-gray-900">SAAS Surface</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Features</a>
            <a href="#sales-tools" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Sales Tools</a>
            <a href="#content-tools" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">CMS & Social</a>
            <a href="#agency-tools" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Agency Ops</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">How It Works</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Pricing</a>
            <a href="#faq" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard →
              </button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden px-6 pb-4 flex flex-col gap-3 border-t border-gray-100 pt-4">
            <a href="#features" className="text-sm font-medium text-gray-700" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#sales-tools" className="text-sm font-medium text-gray-700" onClick={() => setMobileMenuOpen(false)}>Sales Tools</a>
            <a href="#content-tools" className="text-sm font-medium text-gray-700" onClick={() => setMobileMenuOpen(false)}>CMS & Social</a>
            <a href="#agency-tools" className="text-sm font-medium text-gray-700" onClick={() => setMobileMenuOpen(false)}>Agency Ops</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-700" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-gray-700" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#faq" className="text-sm font-medium text-gray-700" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            {isLoggedIn ? (
              <button
                onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg text-center"
              >
                Go to Dashboard →
              </button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-700">Log In</Link>
                <Link to="/register" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg text-center">Start Free Trial</Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white pt-20 pb-28 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
              White-Label Client Portal + CRM + CMS + Social for Agencies
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tight">
              Stop chasing clients.<br />
              <span className="text-blue-600">Start impressing them.</span>
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed mb-10 max-w-2xl mx-auto">
              SAAS Surface gives your agency a branded client portal, built-in CRM pipeline, multi-site CMS,
              social media scheduling, AI content generation, and revenue analytics — everything to win more business, deliver it beautifully, and grow your clients' presence.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5"
              >
                Start Your Free Trial →
              </Link>
              <a
                href="#how-it-works"
                className="px-8 py-4 text-gray-700 font-semibold text-lg rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                See How It Works
              </a>
            </div>
            <p className="text-sm text-gray-400 mt-4">No credit card required · 14-day free trial · 30-day money-back guarantee</p>
          </div>

          {/* Hero mockup */}
          <div className="max-w-5xl mx-auto relative">
            <div className="rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
              {/* Browser chrome */}
              <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200">
                  clients.youragency.com/portal/dashboard
                </div>
              </div>

              {/* Simulated portal UI */}
              <div className="bg-white">
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">A</div>
                    <span className="font-semibold text-sm text-gray-800">Acme Agency</span>
                  </div>
                  <div className="flex items-center gap-6">
                    {['Dashboard', 'Projects', 'Proposals', 'Invoices', 'Documents'].map((tab, i) => (
                      <span
                        key={tab}
                        className={`text-xs font-medium ${i === 0 ? 'text-blue-600 border-b-2 border-blue-600 pb-3' : 'text-gray-500'}`}
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">JD</div>
                </div>

                <div className="p-6 bg-gray-50">
                  <div className="rounded-xl p-5 mb-4 text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                    <p className="text-sm opacity-80 mb-0.5">Welcome back,</p>
                    <p className="font-bold text-lg">John Davidson</p>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Active Projects', value: '3' },
                      { label: 'Pending Invoices', value: '2' },
                      { label: 'Documents', value: '14' },
                      { label: 'Messages', value: '1 new' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                        <p className="font-bold text-gray-800 text-base">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-lg border border-gray-100 p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3">YOUR PROJECTS</p>
                    {[
                      { name: 'Website Redesign', status: 'In Progress', pct: 65 },
                      { name: 'Brand Identity', status: 'Review', pct: 90 },
                    ].map((proj) => (
                      <div key={proj.name} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-800">{proj.name}</p>
                          <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${proj.pct}%` }} />
                          </div>
                        </div>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{proj.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -right-6 top-16 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 hidden lg:flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-lg">✓</div>
              <div>
                <p className="text-xs font-bold text-gray-800">Invoice Paid</p>
                <p className="text-xs text-gray-500">$4,200 received</p>
              </div>
            </div>

            <div className="absolute -left-6 top-40 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 hidden lg:flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-lg">📋</div>
              <div>
                <p className="text-xs font-bold text-gray-800">Proposal Signed</p>
                <p className="text-xs text-gray-500">Project just kicked off</p>
              </div>
            </div>

            <div className="absolute -left-6 bottom-16 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 hidden lg:flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-lg">💬</div>
              <div>
                <p className="text-xs font-bold text-gray-800">New Message</p>
                <p className="text-xs text-gray-500">Revision approved!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ── */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">Trusted by agencies of all sizes</p>
          <div className="flex flex-wrap items-center justify-center gap-10">
            {['Studio North', 'Apex Creative', 'Meridian Group', 'Blueprint Agency', 'Summit Works', 'Focal Point Studio'].map((name) => (
              <span key={name} className="text-gray-400 font-semibold text-sm">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM → SOLUTION ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-8">
              <p className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4">The Old Way</p>
              <ul className="space-y-4">
                {[
                  '"Can you send me the latest version again?"',
                  '"Did you get my invoice from two weeks ago?"',
                  '"Where are we on the project?"',
                  'Status updates buried in email threads',
                  'Proposals sent and never followed up on',
                  'No idea which deals are close to closing',
                  'Chasing payments for 60+ days',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-red-400 mt-0.5 font-bold">✗</span>
                    <span className="text-gray-700 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-2xl p-8">
              <p className="text-sm font-bold text-green-600 uppercase tracking-widest mb-4">With SAAS Surface</p>
              <ul className="space-y-4">
                {[
                  'Clients log in and see all files instantly',
                  'Send proposals — clients sign digitally in-portal',
                  'Invoices sent, tracked, and paid by card',
                  'Real-time project progress with % complete',
                  'Proposals auto-followed up at day 3 and day 7',
                  'CRM pipeline shows every deal and its value',
                  'Time tracked and billed to the right client',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-green-500 mt-0.5 font-bold">✓</span>
                    <span className="text-gray-700 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Client Management</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Built for agencies. Loved by clients.</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Every feature was designed around one goal: making your agency look exceptional to clients.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-100 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SALES POWER PACK ── */}
      <section id="sales-tools" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold mb-4">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
              Sales Power Pack — Included in Pro & Enterprise
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Win more clients. Close faster. Track everything.</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Most agency tools help you deliver work. SAAS Surface also helps you <strong>win</strong> it — with a full CRM pipeline, automated follow-ups, and revenue analytics built right in.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salesFeatures.map((f) => (
              <div
                key={f.title}
                className="relative bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="absolute top-4 right-4 bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {f.badge}
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl mb-4 group-hover:bg-indigo-200 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* CRM Pipeline visual */}
          <div className="mt-16 rounded-2xl border border-indigo-100 overflow-hidden shadow-lg">
            <div className="bg-indigo-600 px-6 py-4 text-white">
              <p className="text-sm font-bold opacity-80 uppercase tracking-widest">CRM Pipeline — Live Preview</p>
            </div>
            <div className="bg-gray-50 p-6">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { stage: 'Lead', count: 4, value: '$12,000', color: 'bg-gray-100 text-gray-700', bar: 'bg-gray-400' },
                  { stage: 'Qualified', count: 3, value: '$28,500', color: 'bg-blue-100 text-blue-700', bar: 'bg-blue-400' },
                  { stage: 'Proposal', count: 2, value: '$18,000', color: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-400' },
                  { stage: 'Negotiate', count: 2, value: '$22,000', color: 'bg-orange-100 text-orange-700', bar: 'bg-orange-400' },
                  { stage: 'Won', count: 5, value: '$64,200', color: 'bg-green-100 text-green-700', bar: 'bg-green-400' },
                  { stage: 'Lost', count: 1, value: '$5,000', color: 'bg-red-100 text-red-700', bar: 'bg-red-300' },
                ].map((col) => (
                  <div key={col.stage} className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${col.color} block mb-3`}>{col.stage}</span>
                    <p className="text-2xl font-black text-gray-900">{col.count}</p>
                    <p className="text-xs text-gray-500 mt-1">{col.value}</p>
                    <div className={`mt-3 h-1 rounded-full ${col.bar} opacity-60`} />
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">Weighted pipeline value: <strong className="text-indigo-600">$87,350</strong> · Across 17 active deals</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTENT & SOCIAL PACK ── */}
      <section id="content-tools" className="py-24 px-6 bg-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-bold mb-4">
              <span className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
              Content & Social Pack — Included in Pro & Enterprise
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Manage content. Publish everywhere.</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              SAAS Surface is the only agency platform that combines client management, CRM, <strong>website CMS, and social media scheduling</strong> — all in one place, for you and your clients.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contentFeatures.map((f) => (
              <div
                key={f.title}
                className="relative bg-gradient-to-br from-purple-50 to-white rounded-2xl p-6 border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all group"
              >
                <div className="absolute top-4 right-4 bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {f.badge}
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl mb-4 group-hover:bg-purple-200 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Content calendar visual */}
          <div className="mt-16 rounded-2xl border border-purple-100 overflow-hidden shadow-lg">
            <div className="bg-purple-600 px-6 py-4 text-white flex items-center justify-between">
              <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Social Content Calendar — Live Preview</p>
              <div className="flex items-center gap-3 text-xs font-semibold opacity-80">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-300 inline-block" /> LinkedIn</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-300 inline-block" /> Twitter</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Facebook</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" /> Instagram</span>
              </div>
            </div>
            <div className="bg-white p-6">
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="text-xs font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {[
                  { day: 1,  posts: [] },
                  { day: 2,  posts: ['linkedin', 'twitter'] },
                  { day: 3,  posts: [] },
                  { day: 4,  posts: ['instagram'] },
                  { day: 5,  posts: ['linkedin', 'facebook', 'instagram'] },
                  { day: 6,  posts: [] },
                  { day: 7,  posts: [] },
                  { day: 8,  posts: ['twitter'] },
                  { day: 9,  posts: ['linkedin'] },
                  { day: 10, posts: [] },
                  { day: 11, posts: ['facebook', 'instagram'] },
                  { day: 12, posts: ['linkedin', 'twitter'] },
                  { day: 13, posts: [] },
                  { day: 14, posts: [] },
                  { day: 15, posts: ['linkedin', 'twitter', 'facebook', 'instagram'], today: true },
                  { day: 16, posts: ['linkedin'] },
                  { day: 17, posts: [] },
                  { day: 18, posts: ['instagram'] },
                  { day: 19, posts: ['linkedin', 'twitter'] },
                  { day: 20, posts: [] },
                  { day: 21, posts: [] },
                ].map((cell) => {
                  const colors = { linkedin: 'bg-blue-400', twitter: 'bg-sky-400', facebook: 'bg-blue-600', instagram: 'bg-pink-400' };
                  return (
                    <div
                      key={cell.day}
                      className={`rounded-lg p-2 min-h-16 border ${cell.today ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:border-purple-200'} transition-colors cursor-pointer`}
                    >
                      <p className={`text-xs font-bold mb-1.5 ${cell.today ? 'text-purple-700' : 'text-gray-500'}`}>{cell.day}</p>
                      <div className="flex flex-wrap gap-0.5">
                        {cell.posts.map((p, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full ${colors[p]}`} title={p} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">18 posts scheduled this month · across 4 platforms · 3 client accounts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Simple Setup</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Live in under 10 minutes</h2>
            <p className="text-lg text-gray-600">
              No technical skills required. Your portal is ready before your next client call.
            </p>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-10 left-[calc(50%-1px)] h-[calc(100%-80px)] w-0.5 bg-blue-100" />
            <div className="space-y-12">
              {steps.map((step, i) => (
                <div key={step.number} className={`flex items-center gap-10 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                  <div className="flex-1">
                    <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all">
                      <span className="text-4xl font-black text-blue-100 block mb-3">{step.number}</span>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                      <p className="text-gray-600">{step.desc}</p>
                    </div>
                  </div>
                  <div className="relative z-10 hidden md:flex w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm items-center justify-center shadow-lg flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── AGENCY OPERATIONS PACK ── */}
      <section id="agency-tools" className="py-24 px-6 bg-emerald-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold mb-4">
              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
              Agency Operations — Included in Pro &amp; Enterprise
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Run your agency like a machine.</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The tools enterprise agencies pay for separately — brand consistency, retainer management, client reporting, and team capacity — all built in.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {agencyFeatures.map((f) => (
              <div
                key={f.title}
                className="relative bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-6 border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all group"
              >
                <div className="absolute top-4 right-4 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {f.badge}
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl mb-4 group-hover:bg-emerald-200 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Sample report preview strip */}
          <div className="mt-16 bg-white rounded-2xl border border-emerald-100 shadow-lg overflow-hidden">
            <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
              <p className="text-white text-sm font-bold uppercase tracking-widest opacity-80">AI Client Report — Live Preview</p>
              <span className="text-white text-xs opacity-60">Generated in &lt; 5 seconds</span>
            </div>
            <div className="p-6 grid md:grid-cols-4 gap-4 border-b border-gray-100">
              {[
                { label: 'Revenue', value: '$12,400', sub: '3 invoices paid', color: 'text-emerald-600' },
                { label: 'Hours Logged', value: '47.5 hrs', sub: '38 billable', color: 'text-blue-600' },
                { label: 'Projects', value: '4 active', sub: '2 completed', color: 'text-purple-600' },
                { label: 'Social Reach', value: '18,240', sub: '↑ 23% vs last month', color: 'text-orange-500' },
              ].map(stat => (
                <div key={stat.label} className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{stat.label}</p>
                  <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
                </div>
              ))}
            </div>
            <div className="p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">AI Executive Summary</p>
              <p className="text-sm text-gray-700 leading-relaxed italic">
                "Acme Corp had a strong month, generating $12,400 in revenue across 3 paid invoices. The team delivered 47.5 hours of work with a 80% billable rate. Social media performance increased 23% month-over-month, driven by 4 LinkedIn posts and 8 Instagram stories. Two projects reached completion this period with all deliverables signed off. Recommended focus for next month: close the remaining outstanding invoice ($3,200) and maintain the social posting cadence that drove the engagement spike."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="py-16 bg-blue-600 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[
            { value: '< 10min', label: 'Average setup time' },
            { value: '90%', label: 'Fewer status emails*' },
            { value: '3×', label: 'Faster invoice payment*' },
            { value: '100%', label: 'White-labeled' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl md:text-4xl font-black mb-1">{stat.value}</p>
              <p className="text-blue-200 text-sm font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-blue-300 text-xs mt-8 max-w-xl mx-auto">* Based on customer surveys conducted among SAAS Surface agency users.</p>
      </section>

      {/* ── TRUST SIGNALS ── */}
      <section className="py-14 px-6 border-b border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">Built with security and reliability in mind</p>
          <div className="flex flex-wrap items-center justify-center gap-10">
            {[
              { label: 'Payments by Stripe', icon: '💳' },
              { label: 'SSL Encrypted', icon: '🔒' },
              { label: 'GDPR Ready', icon: '🛡️' },
              { label: '99.9% Uptime SLA', icon: '⚡' },
              { label: 'Daily Backups', icon: '☁️' },
              { label: '2FA Available', icon: '🔑' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Simple Pricing</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Pay for what you need</h2>
            <p className="text-lg text-gray-600 mb-8">Start free for 14 days. No credit card required.</p>

            <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-full px-2 py-1.5">
              <button
                onClick={() => setAnnual(false)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${!annual ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600'}`}
              >
                Annual
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${annual ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 ${
                  plan.highlight
                    ? 'bg-blue-600 text-white shadow-2xl scale-105'
                    : 'bg-white border border-gray-200 hover:border-blue-200 hover:shadow-md'
                } transition-all`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-black px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}

                <h3 className={`font-bold text-xl mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-blue-200' : 'text-gray-500'}`}>
                  {plan.desc}
                </p>

                <div className="mb-6">
                  <span className={`text-5xl font-black ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    ${annual ? plan.annual : plan.monthly}
                  </span>
                  <span className={`text-sm font-medium ml-1 ${plan.highlight ? 'text-blue-200' : 'text-gray-500'}`}>
                    /month{annual ? ', billed annually' : ''}
                  </span>
                </div>

                <Link
                  to="/register"
                  className={`block w-full text-center py-3 rounded-xl font-bold text-sm mb-8 transition-all ${
                    plan.highlight
                      ? 'bg-white text-blue-600 hover:bg-blue-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5">
                      <span className={`font-bold text-sm flex-shrink-0 ${plan.highlight ? 'text-blue-200' : 'text-blue-600'}`}>✓</span>
                      <span className={`text-sm ${plan.highlight ? 'text-blue-100' : 'text-gray-700'}`}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Money-back guarantee */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-green-500 font-bold text-lg">🛡️</span>
              <span><strong className="text-gray-700">30-day money-back guarantee.</strong> Not happy? We'll refund you, no questions asked.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-500 font-bold text-lg">🔒</span>
              <span><strong className="text-gray-700">Low 2% platform fee.</strong> Only charged on successful payments — no monthly payment add-ons.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">How We Compare</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">SAAS Surface vs. the alternatives</h2>
            <p className="text-lg text-gray-600">See why agencies switch from email chaos and generic tools.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-4 font-semibold text-gray-600">Feature</th>
                  <th className="px-6 py-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="font-bold text-blue-600 text-base">SAAS Surface</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-500">Email + Sheets</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-500">HoneyBook / Dubsado</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 text-gray-700 font-medium">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      {row.clienthub
                        ? <span className="text-green-500 font-bold text-lg">✓</span>
                        : <span className="text-gray-300 font-bold text-lg">✗</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.email
                        ? <span className="text-green-500 font-bold text-lg">✓</span>
                        : <span className="text-gray-300 font-bold text-lg">✗</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.honeybook
                        ? <span className="text-green-500 font-bold text-lg">✓</span>
                        : <span className="text-gray-300 font-bold text-lg">✗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Real Results</p>
            <h2 className="text-4xl font-extrabold text-gray-900">Agencies love SAAS Surface</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => <span key={i}>★</span>)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Questions Answered</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Frequently asked questions</h2>
            <p className="text-lg text-gray-600">Everything you need to know before getting started.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 text-sm pr-4">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-10">
            Still have questions?{' '}
            <Link to="/contact" className="text-blue-600 hover:underline font-medium">
              Contact our team →
            </Link>
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 to-indigo-800">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
            Your clients deserve<br />a better experience.
          </h2>
          <p className="text-blue-200 text-lg mb-10 max-w-xl mx-auto">
            Join agencies delivering a professional, branded client experience — and winning
            more business with built-in CRM and automated follow-ups.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-blue-700 font-bold text-lg rounded-xl hover:bg-blue-50 transition-all shadow-lg"
            >
              Start Your Free Trial →
            </Link>
            <a
              href="#pricing"
              className="px-8 py-4 border border-white/30 text-white font-semibold text-lg rounded-xl hover:bg-white/10 transition-all"
            >
              View Pricing
            </a>
          </div>
          <p className="text-blue-300 text-sm mt-6">14-day free trial · No credit card · 30-day money-back guarantee</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">S</div>
                <span className="font-bold text-white text-lg">SAAS Surface</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                The white-label client portal and CRM built for agencies that want to look exceptional and close more deals.
              </p>
              <div className="flex items-center gap-3">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Twitter">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="LinkedIn">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>

            <div>
              <p className="font-semibold text-white text-sm mb-4">Product</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#sales-tools" className="hover:text-white transition-colors">Sales Tools</a></li>
                <li><a href="#content-tools" className="hover:text-white transition-colors">CMS & Social</a></li>
                <li><a href="#agency-tools" className="hover:text-white transition-colors">Agency Ops</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-white text-sm mb-4">Account</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/login" className="hover:text-white transition-colors">Log In</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Start Free Trial</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-white text-sm mb-4">Contact</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><a href="mailto:sales@saassurface.com" className="hover:text-white transition-colors">sales@saassurface.com</a></li>
                <li><a href="mailto:support@saassurface.com" className="hover:text-white transition-colors">support@saassurface.com</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© {new Date().getFullYear()} SAAS Surface · saassurface.com · All rights reserved.</p>
            <div className="flex flex-wrap gap-4 text-sm justify-center">
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link to="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link>
              <Link to="/acceptable-use-policy" className="hover:text-white transition-colors">Acceptable Use</Link>
              <Link to="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link>
              <Link to="/billing-terms" className="hover:text-white transition-colors">Billing Terms</Link>
              <Link to="/security-policy" className="hover:text-white transition-colors">Security</Link>
              <Link to="/service-level-agreement" className="hover:text-white transition-colors">SLA</Link>
              <Link to="/data-processing-agreement" className="hover:text-white transition-colors">DPA</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
