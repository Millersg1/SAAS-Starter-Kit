import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

/* ────────────────────────────────────────────────
   OUTCOME-BASED FEATURE ARRAYS
   ──────────────────────────────────────────────── */

const winFeatures = [
  {
    icon: '📈',
    title: 'CRM Pipeline',
    desc: 'Track every deal in one place — and let Surf highlight what needs your attention before opportunities stall.',
  },
  {
    icon: '📊',
    title: 'Revenue Analytics',
    desc: 'Monthly revenue bar charts, proposal conversion rates, top clients by spend, and pipeline-by-stage breakdowns — all in one view.',
  },
  {
    icon: '🔄',
    title: 'Automated Follow-Ups',
    desc: 'Surf automatically follows up with leads when proposals go unanswered — day 3 and day 7. Accepted proposals cancel the sequence.',
  },
  {
    icon: '📝',
    title: 'AI Proposal Generator',
    desc: 'Type a one-line brief and Surf generates a complete proposal — scope, deliverables, timeline, and pricing. One click to save as a draft. Send it in minutes, not hours.',
  },
  {
    icon: '🎯',
    title: 'Lead Source Tracking',
    desc: 'Track where every client came from — referral, website, Google Ads, social media. Know which channels drive your best clients.',
  },
  {
    icon: '📝',
    title: 'Activity Timeline',
    desc: 'Log calls, emails, meetings, and notes against any client. Full chronological history so your whole team stays in context.',
  },
];

const deliverFeatures = [
  {
    icon: '🏷️',
    title: 'White-Label Client Portal',
    desc: 'Give every client their own branded login. Your logo, your colors, your domain — clients never see "SAAS Surface."',
  },
  {
    icon: '💰',
    title: 'Invoicing & Payments',
    desc: 'Create, send, and collect payments directly to your Stripe account — while Surf automatically follows up on overdue invoices so cash flow never stalls.',
  },
  {
    icon: '📋',
    title: 'Proposals & E-Signatures',
    desc: 'Send professional quotes. Clients sign digitally in-portal. Surf follows up automatically if they haven\'t responded, and accepted proposals auto-convert to invoices.',
  },
  {
    icon: '📁',
    title: 'Project Tracking',
    desc: 'Clients see real-time progress updates on their projects. Reduce "what\'s the status?" emails by 90%.',
  },
  {
    icon: '💵',
    title: 'Expense Tracking',
    desc: 'Log expenses per project or client. See real-time profitability — revenue from invoices minus expenses — with margin percentages. Know which clients make you money.',
  },
  {
    icon: '🔄',
    title: 'Retainer Management',
    desc: 'Track monthly hours against allocated caps. Visual progress bars show utilization. Log usage, see remaining hours, and catch scope creep before it eats your margin.',
  },
];

const automateFeatures = [
  {
    icon: '⚡',
    title: 'Visual Workflow Builder',
    desc: 'Surf reduces repetitive work so your agency runs smoother. 11 trigger types, 10+ action types, if/else branching — set it once and Surf runs it forever.',
  },
  {
    icon: '🎯',
    title: 'Client Onboarding Automation',
    desc: 'Build step-by-step onboarding checklists that trigger automatically when a proposal is accepted. Asset collection, welcome emails, task creation — all on autopilot.',
  },
  {
    icon: '📧',
    title: 'Email Sequences',
    desc: 'Build multi-step automated email flows with custom delays. Enroll leads automatically or manually, track open rates per step, and stop sending the moment someone unsubscribes.',
  },
  {
    icon: '🔁',
    title: 'Recurring Invoices',
    desc: 'Set any invoice to auto-generate on a schedule — weekly, monthly, quarterly, or yearly. Configure the billing day, set an end date, and pause/resume anytime.',
  },
  {
    icon: '📑',
    title: 'Project Templates',
    desc: 'Save your best project structures as reusable templates — tasks, priorities, and due dates included. Create a new client project in one click instead of starting from scratch.',
  },
  {
    icon: '🔔',
    title: 'Slack Integration',
    desc: 'Get instant Slack notifications when leads come in, invoices get paid, deals close, or proposals are accepted. Your team stays in the loop without leaving Slack.',
  },
];

const publishFeatures = [
  {
    icon: '🌐',
    title: 'Website Builder & CMS',
    desc: 'Build, host, and manage client websites without leaving the platform. Pages, blog posts, landing pages, full SEO, custom domains, and managed hosting included.',
  },
  {
    icon: '📲',
    title: 'Social Media Management',
    desc: 'Schedule and publish posts to LinkedIn, Twitter/X, Facebook, and Instagram. Manage both your agency accounts and your clients\' accounts from a single content calendar.',
  },
  {
    icon: '✨',
    title: 'AI Content Generation',
    desc: 'One-click AI writes full page content, blog posts, and social captions. Platform-aware — LinkedIn gets professional copy, Instagram gets engaging hooks with hashtags, Twitter gets punchy brevity.',
  },
  {
    icon: '📅',
    title: 'Content Calendar',
    desc: 'See every scheduled social post across all platforms and all clients in a single monthly calendar view. Click any day to preview and manage posts in a slide-out drawer.',
  },
  {
    icon: '🚀',
    title: 'Funnel Builder',
    desc: 'Build high-converting opt-in pages, sales funnels, and lead capture pages with a drag-free block editor. 9 section types, live preview, publish with one click, and built-in analytics.',
  },
  {
    icon: '⭐',
    title: 'Reputation Management',
    desc: 'Auto-request Google, Facebook, and Yelp reviews after invoice payment or project completion. Track requests, monitor star ratings, and respond to reviews — all in one dashboard.',
  },
  {
    icon: '🖥️',
    title: 'Managed Hosting',
    desc: 'Launch and manage client websites with fast, secure hosting — no separate provider required. NVMe infrastructure, SSL included, easy deployment. Powered by All Elite Hosting.',
  },
];

const surfAiFeatures = [
  {
    icon: '/images/surf-ui.png',
    isImage: true,
    title: 'Surf Autopilot',
    desc: 'Surf doesn\'t just recommend — it acts. Auto follow-up with stale leads, send invoice reminders, move won deals, create onboarding tasks, and nurture leads. Each action has its own toggle. Your agency runs while you sleep.',
  },
  {
    icon: '💬',
    title: 'AI Chat Widget',
    desc: 'Embed an AI-powered chat bot on any website. Trained on your brand context — answers questions, captures leads with name + email, and routes all conversations to your inbox.',
  },
  {
    icon: '💬',
    title: 'Client-Facing Surf Chat',
    desc: 'Every client gets Surf in their portal. They can ask about project status, invoice balances, and upcoming deadlines — and Surf answers with their real data. Zero effort from your team.',
  },
  {
    icon: '📥',
    title: 'Smart Unified Inbox',
    desc: 'One inbox for email, SMS, chat widget, portal messages, and voice call transcripts — AI-prioritized by urgency. Reply to anything from one place. Never miss a message again.',
  },
  {
    icon: '📋',
    title: 'AI Client Reports',
    desc: 'One click generates a full client report with real data: invoices paid, hours logged, projects completed, social reach, and an AI-written executive summary in your brand voice.',
  },
  {
    icon: '🎨',
    title: 'Brand Voice Profiles',
    desc: 'Define tone, target audience, keywords, and writing style once. Every piece of AI-generated content — pages, blog posts, social captions — automatically reflects your brand personality.',
  },
];

const categoryMeta = [
  { label: 'Capture & Close', heading: 'Capture and close more deals.', body: 'Everything you need to turn leads into paying clients — CRM, pipeline, proposals, contracts, and AI-generated proposals.' },
  { label: 'Deliver & Get Paid', heading: 'Deliver a premium client experience.', body: 'Give clients a clean, branded experience — white-label portal, invoices, payments, projects, and retainer tracking.' },
  { label: 'Automate', heading: 'Automate the busywork.', body: 'Let Surf handle the repetitive work — automated follow-ups, workflow automation, email sequences, invoice reminders, and onboarding.' },
  { label: 'Publish & Grow', heading: 'Communicate from one place.', body: 'No more scattered conversations — email sync, SMS, website chat, social media, funnels, and reputation management.' },
  { label: 'Surf AI', heading: 'Manage delivery and operations.', body: 'Keep projects, tasks, and teams organized with Surf AI — autopilot, unified inbox, client reports, and brand voice profiles.' },
];

const agencyBenefits = [
  { stat: '3x faster', title: 'Invoice payment', desc: 'Clients pay through a branded portal with one-click card payments. Surf sends reminders automatically.', icon: '💰' },
  { stat: '< 10 minutes', title: 'To go live', desc: 'Add your logo, colors, and first client. Your branded portal is ready before your next meeting.', icon: '🚀' },
  { stat: '90% fewer', title: '"What\'s the status?" emails', desc: 'Clients log in and see project progress, invoices, and files — no more chasing you for updates.', icon: '📉' },
  { stat: '8+ tools', title: 'Replaced by one', desc: 'CRM, invoicing, proposals, portal, CMS, social, automation, voice, and even hosting — one login, one bill, one AI assistant.', icon: '🔗' },
];

const resellerPoints = [
  'White-label SAAS Surface with your own branding and domain',
  'Set your own pricing and keep the margin',
  'Create sub-accounts for each client with their own portal',
  'Offer hosting to your clients (powered by All Elite Hosting)',
  'Bundle services, software, and hosting into one recurring revenue package',
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
    name: 'Starter',
    monthly: 29,
    annual: 23,
    futureMonthly: 49,
    desc: 'Everything a solo agency needs to look professional.',
    features: [
      'Up to 5 clients',
      '10 active projects',
      '5 GB document storage',
      '2 team members',
      'White-label client portal',
      'Invoicing & card payments',
      'Proposals & e-signatures',
      'Time tracking & billing',
      'Tasks & reminders',
      'Surf AI recommendations',
      'Mobile app (PWA)',
      'Email support',
    ],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Professional',
    monthly: 79,
    annual: 63,
    futureMonthly: 149,
    desc: 'The full Agency OS with Surf Autopilot and AI.',
    spotsLeft: 31,
    features: [
      'Up to 25 clients',
      '50 active projects',
      '25 GB storage',
      '10 team members',
      'Everything in Starter',
      'Surf Autopilot (auto follow-ups, reminders)',
      'AI proposal generator',
      'Smart unified inbox',
      'CRM pipeline & deal scoring',
      'Surf Voice (AI phone agent)',
      'Website builder & CMS',
      'Social media scheduling',
      'Email campaigns & drip sequences',
      'Funnel & landing page builder',
      'Visual workflow automation',
      'Client-facing Surf chat in portal',
      'Expense tracking & profitability',
      'Retainer management',
      'Reputation management',
      'Custom portal domain',
      'Priority support',
    ],
    cta: 'Start Free',
    highlight: true,
  },
  {
    name: 'Agency',
    monthly: 199,
    annual: 159,
    futureMonthly: 349,
    desc: 'Unlimited scale + reseller program.',
    features: [
      'Unlimited clients',
      'Unlimited projects',
      '100 GB storage',
      'Unlimited team members',
      'Everything in Professional',
      'Reseller program (white-label & resell)',
      'Revenue share dashboard',
      'Multiple brands',
      'Unlimited CMS websites',
      'AI content generation (unlimited)',
      'QuickBooks & Xero sync',
      'Slack integration',
      'Knowledge base / help center',
      'Project templates',
      'Client onboarding automation',
      'Team workload dashboard',
      'Dedicated support',
    ],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Enterprise',
    monthly: 499,
    annual: 399,
    futureMonthly: 799,
    desc: 'Custom solutions for large agencies.',
    features: [
      'Everything in Agency',
      'Unlimited everything',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'Priority onboarding',
      'Custom AI training for Surf',
      'Advanced analytics & reporting',
      'SSO / SAML support',
      'Custom data retention',
      'White-glove migration',
      'Phone & video support',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const whyChoose = [
  {
    icon: '🔄',
    title: 'Replace 8+ tools with one',
    desc: 'CRM, invoicing, proposals, email marketing, website builder, booking, voice AI, and automation — one platform, one login, one bill.',
  },
  {
    icon: '/images/surf-avatar.png',
    isImage: true,
    title: 'AI that actually works for you',
    desc: 'Surf Autopilot follows up with leads, reminds clients about invoices, generates proposals, and moves deals forward — while you focus on delivery.',
  },
  {
    icon: '🏷️',
    title: '100% white-labeled',
    desc: 'Your logo, your colors, your domain. Clients never see SAAS Surface. It looks like you built it yourself — because it is yours.',
  },
  {
    icon: '💰',
    title: 'Fraction of the cost',
    desc: 'GoHighLevel charges $97-$497/mo for less. SAAS Surface starts at $29/mo with founding member pricing locked in for life.',
  },
];

const faqs = [
  {
    q: 'Will my clients ever see the SAAS Surface name?',
    a: 'Never. Your clients see only your agency name, your logo, and your colors. SAAS Surface is completely invisible — even the email notifications come from your domain.',
  },
  {
    q: 'How does founding member pricing work?',
    a: 'The first 50 agencies to sign up lock in their subscription rate for life — even when we raise prices later. Your rate never goes up as long as your account stays active.',
  },
  {
    q: 'How long does setup take?',
    a: 'Most agencies are live within 10 minutes. Add your logo and colors, create your first client, and enable their portal access. They get a welcome email automatically.',
  },
  {
    q: 'Do I need to replace all my tools immediately?',
    a: 'Not at all. Start with the features you need most — maybe invoicing and the client portal — and expand over time. There\'s no pressure to migrate everything on day one.',
  },
  {
    q: 'What\'s in Surf Autopilot?',
    a: 'Surf Autopilot can auto follow-up with stale leads, send invoice payment reminders, move won deals through your pipeline, create onboarding tasks when proposals are accepted, and nurture leads with email sequences. Each action has its own toggle so you stay in control.',
  },
  {
    q: 'Can I white-label and resell SAAS Surface?',
    a: 'Yes — on the Agency plan. White-label the entire platform with your branding and domain, set your own pricing, create sub-accounts for clients, and keep the margin. We handle hosting, updates, and support behind the scenes.',
  },
  {
    q: 'Do you take a cut of my invoice payments?',
    a: 'A small 2% platform fee applies on successful payments — this keeps your monthly subscription price low. Stripe\'s standard processing fee (2.9% + 30¢) also applies. There are no hidden fees, monthly payment add-ons, or per-seat charges.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, anytime with no penalty. Cancel from your account settings and you\'ll retain access until the end of your billing period. We also offer a 30-day money-back guarantee.',
  },
];

const comparisonRows = [
  { feature: 'Starting price', us: '$29/mo', ghl: '$97/mo', honeybook: '$19/mo', isText: true },
  { feature: 'AI assistant (Surf Autopilot)', us: true, ghl: false, honeybook: false },
  { feature: 'AI voice agent (phone calls)', us: true, ghl: false, honeybook: false },
  { feature: 'AI proposal generator', us: true, ghl: false, honeybook: false },
  { feature: 'Client-facing AI chat in portal', us: true, ghl: false, honeybook: false },
  { feature: 'White-label client portal', us: true, ghl: true, honeybook: false },
  { feature: 'CRM pipeline & deal tracking', us: true, ghl: true, honeybook: false },
  { feature: 'Invoicing & card payments', us: true, ghl: true, honeybook: true },
  { feature: 'Proposals & e-signatures', us: true, ghl: false, honeybook: true },
  { feature: 'Expense tracking & profitability', us: true, ghl: false, honeybook: false },
  { feature: 'Retainer management', us: true, ghl: false, honeybook: false },
  { feature: 'Project management & templates', us: true, ghl: false, honeybook: true },
  { feature: 'Website builder & CMS', us: true, ghl: true, honeybook: false },
  { feature: 'Email campaigns & drip sequences', us: true, ghl: true, honeybook: false },
  { feature: 'Visual workflow automation', us: true, ghl: true, honeybook: false },
  { feature: 'Smart unified inbox', us: true, ghl: true, honeybook: false },
  { feature: 'Reseller / revenue share program', us: true, ghl: true, honeybook: false },
  { feature: 'Reputation management', us: true, ghl: true, honeybook: false },
  { feature: 'Funnel & landing page builder', us: true, ghl: true, honeybook: false },
  { feature: 'Knowledge base / help center', us: true, ghl: false, honeybook: false },
  { feature: 'Founding member lifetime pricing', us: true, ghl: false, honeybook: false },
  { feature: 'Platform fee', us: '2%', ghl: '2.9%', honeybook: '3%', isText: true },
];

export default function Landing() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [surfOpen, setSurfOpen] = useState(false);
  const [surfStep, setSurfStep] = useState('collect'); // 'collect' | 'chat'
  const [surfLead, setSurfLead] = useState({ name: '', email: '', phone: '', company: '' });
  const [surfMessages, setSurfMessages] = useState([]);
  const [surfInput, setSurfInput] = useState('');
  const [surfTyping, setSurfTyping] = useState(false);
  const isLoggedIn = !!localStorage.getItem('token');

  const allCategories = [winFeatures, deliverFeatures, automateFeatures, publishFeatures, surfAiFeatures];

  // Fetch approved testimonials
  useState(() => {
    fetch('https://api.saassurface.com/api/testimonials/public')
      .then(r => r.json())
      .then(data => { if (data.data?.testimonials) setTestimonials(data.data.testimonials); })
      .catch(() => {});
  }, []);

  const handleSurfLeadSubmit = async (e) => {
    e.preventDefault();
    if (!surfLead.name || !surfLead.email) return;

    // Save lead to backend
    try {
      const api = (await import('../services/api')).default;
      await api.post('/public/surf-lead', {
        name: surfLead.name,
        email: surfLead.email,
        phone: surfLead.phone || '',
        company: surfLead.company || '',
      }).catch(() => {});
    } catch {}

    setSurfStep('chat');
    setSurfMessages([
      { from: 'surf', text: `Hey ${surfLead.name.split(' ')[0]}! I'm Surf, your AI agency assistant. Ask me anything about SAAS Surface — features, pricing, setup, or how it can help your agency.` },
    ]);
  };

  const handleSurfSend = () => {
    const q = surfInput.trim();
    if (!q) return;
    setSurfMessages(prev => [...prev, { from: 'user', text: q }]);
    setSurfInput('');
    setSurfTyping(true);

    // Simple keyword-based responses (no API needed for landing page)
    setTimeout(() => {
      let reply = "Great question! SAAS Surface is an all-in-one Agency OS with CRM, invoicing, proposals, client portal, marketing automation, and more. Want to try it free? Head to the registration page!";

      const lower = q.toLowerCase();
      if (lower.includes('price') || lower.includes('pricing') || lower.includes('cost') || lower.includes('plan')) {
        reply = "We have 5 plans: Free ($0), Starter ($29/mo), Professional ($79/mo), Agency ($199/mo), and Enterprise ($499/mo). All plans include the core features. The free plan gives you 1 brand, 50 clients, and 500 emails/month. Scroll down to see the full comparison!";
      } else if (lower.includes('white label') || lower.includes('whitelabel') || lower.includes('brand')) {
        reply = "Yes! SAAS Surface is fully white-labeled. Your clients see your logo, your colors, and your domain. They never see 'SAAS Surface' anywhere. You can even use a custom domain for the client portal.";
      } else if (lower.includes('crm') || lower.includes('pipeline') || lower.includes('deal')) {
        reply = "The CRM includes a visual kanban pipeline, deal scoring, client health scores, churn prediction, and I help highlight which deals need attention. You can track deals from Lead to Won with weighted pipeline value.";
      } else if (lower.includes('invoice') || lower.includes('payment') || lower.includes('billing')) {
        reply = "You can create invoices with line items, send them to clients, and collect payments via Stripe. I handle overdue reminders automatically. Recurring invoices, public payment links, and Stripe Connect (so payments go to YOUR Stripe) are all built in.";
      } else if (lower.includes('email') || lower.includes('campaign') || lower.includes('drip') || lower.includes('sequence')) {
        reply = "SAAS Surface includes email campaigns with A/B testing, drip sequences with custom delays, IMAP inbox sync, and I automatically follow up on unanswered proposals at day 3 and day 7.";
      } else if (lower.includes('website') || lower.includes('cms') || lower.includes('builder')) {
        reply = "Yes! You can build and host client websites directly. Create pages and blog posts, choose from 8 professional templates, set custom domains, and publish with one click. Full SEO controls included.";
      } else if (lower.includes('portal') || lower.includes('client access')) {
        reply = "The client portal lets your clients log in and see their projects, invoices, proposals, contracts, documents, and messages. They can pay invoices, sign proposals, and submit support tickets — all branded as your agency.";
      } else if (lower.includes('automation') || lower.includes('workflow')) {
        reply = "The visual workflow builder has 11 trigger types and 10+ actions including email, SMS, tasks, tags, pipeline moves, and webhooks. If/else branching is supported. Set it once and I run it forever.";
      } else if (lower.includes('trial') || lower.includes('free') || lower.includes('start') || lower.includes('sign up') || lower.includes('register')) {
        reply = "You can start a free trial right now — no credit card required! The free plan includes 1 brand, 50 clients, and 500 emails. Click 'Start Free' at the top of the page.";
      } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        reply = "Hey there! I'm Surf, your AI agency assistant. I can tell you about features, pricing, setup, integrations, or anything else about SAAS Surface. What would you like to know?";
      } else if (lower.includes('integrat') || lower.includes('zapier') || lower.includes('slack') || lower.includes('quickbooks')) {
        reply = "SAAS Surface integrates with Zapier (triggers + actions), Slack (real-time notifications), QuickBooks/Xero (invoice sync), Google Calendar, Outlook Calendar, Twilio (SMS + voice), and Stripe. Plus a full REST API with 350+ endpoints.";
      } else if (lower.includes('voice') || lower.includes('call') || lower.includes('phone')) {
        reply = "AI Voice Agents let you create phone bots that handle inbound and outbound calls. Configure personality, greeting, and knowledge base. Calls are transcribed with sentiment analysis. Powered by Twilio.";
      }

      setSurfMessages(prev => [...prev, { from: 'surf', text: reply }]);
      setSurfTyping(false);
    }, 800 + Math.random() * 700);
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'What is SAAS Surface?', acceptedAnswer: { '@type': 'Answer', text: 'SAAS Surface is an all-in-one Agency OS for managing clients, invoicing, proposals, contracts, email marketing, and workflow automation with a white-label client portal.' } },
      { '@type': 'Question', name: 'Can I white-label SAAS Surface?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Use your own logo, colors, domain, and branding. Clients never see SAAS Surface.' } },
      { '@type': 'Question', name: 'Is there a free plan?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. The free plan includes 1 brand, 50 clients, and 500 emails per month.' } },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <SEO
        title="Run Your Agency with Surf — Powered by AI"
        description="SAAS Surface is the all-in-one agency operating system powered by Surf, your AI assistant. CRM, invoicing, proposals, client portal, marketing automation, and workflow automation. White-label ready."
        url="https://saassurface.com/"
        structuredData={faqSchema}
      />

      {/* ── ANNOUNCEMENT BAR ── */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-center">
        <p className="text-sm font-semibold text-amber-800">
          <span className="w-2 h-2 bg-amber-500 rounded-full inline-block mr-2 animate-pulse" />
          Founding Member Pricing is live — first 50 agencies lock in lifetime rates.{' '}
          <Link to="/register" className="underline font-bold hover:text-amber-900 transition-colors">Claim your spot →</Link>
        </p>
      </div>

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-bold text-xl text-gray-900">SAAS Surface</span>
            <span className="hidden lg:inline text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Powered by Surf</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Features</a>
            <a href="#benefits" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Benefits</a>
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
                  Start Free
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
            <a href="#benefits" className="text-sm font-medium text-gray-700" onClick={() => setMobileMenuOpen(false)}>Benefits</a>
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
                <Link to="/register" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg text-center">Start Free</Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white pt-20 pb-28 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
            {/* Left: Copy */}
            <div className="text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-sm font-semibold mb-6">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Founding Member Pricing — Limited to 50 agencies
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tight">
                Run your agency<br />
                <span className="text-blue-600">with Surf.</span>
              </h1>

              <p className="text-xl text-gray-600 leading-relaxed mb-3 max-w-xl">
                The AI-powered agency operating system that helps you capture leads, answer calls, automate follow-up, manage clients, send invoices, and grow — all from one platform.
              </p>

              <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-xl">
                No credit card required. Founding Member pricing available for the first 50 agencies.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5 text-center"
                >
                  Start Free
                </Link>
                <a
                  href="https://calendly.com/saassurface/demo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 text-gray-700 font-semibold text-lg rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center"
                >
                  Book a Demo
                </a>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6">
                {[
                  'AI follow-up and workflow automation',
                  'AI voice agent that answers calls and captures leads',
                  'CRM, proposals, invoices, and client portal included',
                  'Built for agencies that want to scale',
                ].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 text-sm text-gray-500">
                    <span className="text-blue-600 font-bold">✓</span> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Surf visual */}
            <div className="relative flex justify-center items-center">
              <div className="absolute inset-[10%] rounded-full" style={{ animation: 'surfGlow 4s ease-in-out infinite' }} />
              <img
                src="/images/surf-main.png"
                alt="Surf AI Assistant"
                className="w-full max-w-[420px] relative z-10 drop-shadow-2xl"
                style={{ animation: 'surfFloat 5.5s ease-in-out infinite', filter: 'drop-shadow(0 20px 50px rgba(37,99,235,0.22))' }}
              />

              {/* Floating Surf cards */}
              <div className="absolute top-[5%] right-0 bg-white/97 border border-gray-200 rounded-2xl shadow-lg px-4 py-3 hidden lg:flex items-center gap-3 backdrop-blur-sm max-w-[250px]">
                <img src="/images/surf-avatar.png" alt="Surf" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-gray-900">Ask Surf</p>
                  <p className="text-xs text-gray-500">Your AI assistant is ready to help.</p>
                </div>
              </div>

              <div className="absolute left-[-10px] bottom-[8%] bg-white/97 border border-gray-200 rounded-2xl shadow-lg px-4 py-3 hidden lg:flex items-center gap-3 backdrop-blur-sm max-w-[250px]">
                <img src="/images/surf-orb.png" alt="Surf orb" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-gray-900">Surf found 3 leads</p>
                  <p className="text-xs text-gray-500">They need follow-up this week.</p>
                </div>
              </div>

              <div className="absolute right-[-10px] bottom-[26%] bg-white/97 border border-gray-200 rounded-2xl shadow-lg px-4 py-3 hidden lg:flex items-center gap-3 backdrop-blur-sm max-w-[260px]">
                <img src="/images/surf-ui.png" alt="Surf UI" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-gray-900">Overdue invoice detected</p>
                  <p className="text-xs text-gray-500">Send a reminder or automate it now.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes surfFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
          @keyframes surfGlow {
            0%, 100% { box-shadow: 0 0 0 rgba(37,99,235,0), 0 0 0 rgba(79,70,229,0); }
            50% { box-shadow: 0 0 36px rgba(37,99,235,0.18), 0 0 70px rgba(79,70,229,0.12); }
          }
          @keyframes surfPulse {
            0%, 100% { transform: scale(1); opacity: 0.96; }
            50% { transform: scale(1.05); opacity: 1; }
          }
        `}</style>
      </section>

      {/* ── SOCIAL PROOF BAR ── */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '50+', label: 'Agencies onboarded' },
              { value: '8+', label: 'Tools replaced' },
              { value: '$0', label: 'To start' },
              { value: '< 10min', label: 'Setup time' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl md:text-4xl font-black text-gray-900 mb-1">{stat.value}</p>
                <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MEET SURF ── */}
      <section id="meet-surf" className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* Surf visual */}
          <div className="relative flex justify-center">
            <div className="absolute inset-[10%] rounded-full" style={{ animation: 'surfGlow 4s ease-in-out infinite' }} />
            <img
              src="/images/surf-main.png"
              alt="Surf AI Assistant"
              className="w-full max-w-[400px] relative z-10"
              style={{ animation: 'surfFloat 5.5s ease-in-out infinite', filter: 'drop-shadow(0 16px 40px rgba(37,99,235,0.18))' }}
            />
          </div>

          {/* Surf copy */}
          <div>
            <p className="text-sm font-extrabold text-blue-600 uppercase tracking-widest mb-3">Meet Surf</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
              Meet Surf — your AI teammate.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              Surf doesn't just assist. It works. Follow-ups, reminders, call handling, and client communication — Surf runs the parts of your agency that slow you down.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { title: 'Surf Autopilot', desc: 'Automatically follows up with leads, sends reminders, updates deals, and keeps your pipeline moving.' },
                { title: 'Surf Voice', desc: 'Answers calls, captures lead details, books appointments, and logs everything into your CRM.' },
                { title: 'Ask Surf', desc: 'Get real answers about your business — revenue, clients, pipeline, and performance.' },
                { title: 'Client Surf Chat', desc: 'Let your clients ask about invoices, projects, and updates directly inside the portal.' },
              ].map((item) => (
                <div key={item.title} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-200 transition-all">
                  <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {[
                'Follow up automatically',
                'Spot stalled deals',
                'Track activity',
                'Surface opportunities',
                'Guide next steps',
              ].map((text) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-blue-600 font-bold">✔</span>
                  <span className="text-gray-700 font-semibold">{text}</span>
                </div>
              ))}
            </div>

            <p className="mt-6 font-extrabold text-gray-800">
              Surf doesn't replace your team — it helps your team move faster.
            </p>
          </div>
        </div>
      </section>

      {/* ── SURF IN ACTION (Dashboard Preview) ── */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm font-extrabold text-blue-600 uppercase tracking-widest mb-3">Surf in Action</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Guidance built right into the experience
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
            Surf gives SAAS Surface a guided, intelligent feel — not just a long list of features. Surface next steps, automate follow-up, and keep every client relationship moving forward.
          </p>

          {/* Surf chips */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { img: '/images/surf-avatar.png', text: 'Ask Surf' },
              { img: '/images/surf-orb.png', text: 'Surf recommends your next step' },
              { img: '/images/surf-avatar.png', text: 'Surf found 3 leads that need follow-up' },
              { img: '/images/surf-ui.png', text: 'Surf can automate this workflow' },
            ].map((chip) => (
              <div key={chip.text} className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-sm font-bold shadow-sm">
                <img src={chip.img} alt="" className="w-6 h-6 rounded-full object-cover" />
                {chip.text}
              </div>
            ))}
          </div>

          {/* Dashboard preview with Surf alerts */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg bg-white text-left">
            <div className="bg-gray-100 px-5 py-3 flex items-center gap-2.5 border-b border-gray-200">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-green-400 inline-block" />
              </div>
              <div className="flex-1 bg-white rounded-lg px-3 py-1.5 text-xs text-gray-400 border border-gray-200 overflow-hidden whitespace-nowrap text-ellipsis">
                clients.youragency.com/portal/dashboard
              </div>
            </div>

            <div className="p-6 bg-gradient-to-b from-white to-gray-50">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
                <h3 className="text-xl font-bold text-gray-900">Agency Dashboard</h3>
                <div className="flex gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-bold">
                    <img src="/images/surf-avatar.png" alt="" className="w-5 h-5 rounded-full object-cover" /> Ask Surf
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-bold">
                    <img src="/images/surf-orb.png" alt="" className="w-5 h-5 rounded-full object-cover" /> Next step
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                  { label: 'Active Deals', value: '17' },
                  { label: 'Pending Invoices', value: '6' },
                  { label: 'Projects In Progress', value: '9' },
                  { label: 'Tasks Due Today', value: '4' },
                ].map((s) => (
                  <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Surf personality moment */}
              <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                <img src="/images/surf-avatar.png" alt="Surf" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                <p className="text-sm text-blue-800 font-semibold">Surf suggests following up with 2 high-value leads today.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { img: '/images/surf-ui.png', title: 'Surf noticed this invoice is overdue', desc: 'Send a reminder now or automate follow-up so cash flow keeps moving.' },
                  { img: '/images/surf-avatar.png', title: 'Surf found 3 leads needing follow-up', desc: 'Reach out today or let Surf trigger the next email sequence automatically.' },
                  { img: '/images/surf-orb.png', title: 'Surf can automate this workflow', desc: 'Proposal sent → follow-up day 3 → reminder day 7 → invoice on acceptance.' },
                  { img: '/images/surf-avatar.png', title: 'Surf recommends your next step', desc: 'Two high-value deals are waiting on proposals. Send them today.' },
                ].map((alert) => (
                  <div key={alert.title} className="flex items-start gap-3.5 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <img src={alert.img} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900 text-sm mb-1">{alert.title}</p>
                      <p className="text-sm text-gray-600">{alert.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-8">
              <p className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4">Most agencies are stuck managing tools</p>
              <ul className="space-y-4">
                {[
                  'Leads slip through the cracks',
                  'Follow-ups don\'t happen consistently',
                  'Calls get missed',
                  'Tools don\'t talk to each other',
                  'Admin work eats your time',
                  'Growth becomes harder, not easier',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-red-400 mt-0.5 font-bold">✗</span>
                    <span className="text-gray-700 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-2xl p-8">
              <p className="text-sm font-bold text-green-600 uppercase tracking-widest mb-4">Replace the chaos with one system</p>
              <ul className="space-y-4">
                {[
                  'Capture leads automatically',
                  'Follow up instantly with AI',
                  'Answer calls with Surf Voice',
                  'Manage clients, projects, and billing in one place',
                  'Deliver a premium client experience',
                  'Scale without hiring more staff',
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

      {/* ── CTA BAND 1 ── */}
      <section className="py-16 bg-blue-600 px-6">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Replace 8+ tools with one AI-powered platform</h2>
          <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">CRM, invoicing, proposals, client portal, website builder, social media, email marketing, and automation — powered by Surf.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-blue-700 font-bold text-lg rounded-xl hover:bg-blue-50 transition-all shadow-lg"
            >
              Start Free
            </Link>
            <a
              href="https://calendly.com/saassurface/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 border border-white/30 text-white font-semibold text-lg rounded-xl hover:bg-white/10 transition-all"
            >
              Book a Demo
            </a>
          </div>
        </div>
      </section>

      {/* ── OUTCOME FEATURES (Tabbed) ── */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Everything You Need</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">One platform. Five outcomes.</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Every feature maps to a result your agency actually cares about.
            </p>
          </div>

          {/* Category pills */}
          <div className="flex overflow-x-auto gap-3 pb-4 mb-8 justify-center scrollbar-hide">
            {categoryMeta.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(i)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  activeCategory === i
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-200 hover:text-blue-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Active category heading */}
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">{categoryMeta[activeCategory].heading}</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">{categoryMeta[activeCategory].body}</p>
          </div>

          {/* Feature cards grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allCategories[activeCategory].map((f) => (
              <div
                key={f.title}
                className="relative bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-100 transition-colors overflow-hidden">
                  {f.isImage ? <img src={f.icon} alt={f.title} className="w-10 h-10 object-contain" /> : f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6">
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

      {/* ── SURF VOICE ── */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 to-indigo-800 text-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-widest text-blue-200 mb-3">Surf Voice Agent</p>
            <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
              Give Surf a voice.
            </h2>
            <p className="text-lg text-blue-100 leading-relaxed mb-8">
              Let AI answer calls, capture leads, confirm details, and book appointments — even when you're unavailable.
            </p>

            <div className="space-y-4 mb-8">
              {[
                'Answers inbound calls automatically',
                'Captures name, email, and intent',
                'Books consultations',
                'Saves call transcripts and summaries',
                'Handles conversations naturally',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="text-blue-200 font-bold text-lg">✓</span>
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="https://calendly.com/saassurface/demo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-4 bg-white text-blue-700 font-bold text-lg rounded-xl hover:bg-blue-50 transition-all shadow-lg"
              >
                Book Demo
              </a>
              <a href="tel:+18554558182" className="text-blue-200 hover:text-white font-semibold text-sm transition-colors">
                Or call us: 1 (855) 455-8182
              </a>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <img
                src="/images/surf-main.png"
                alt="Surf Voice"
                className="w-full max-w-[350px] relative z-10"
                style={{ filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.3))', animation: 'surfFloat 5.5s ease-in-out infinite' }}
              />
              {/* Floating call cards */}
              <div className="absolute -right-4 top-[10%] bg-white/95 text-gray-900 rounded-2xl shadow-lg px-4 py-3 hidden lg:flex items-center gap-3 backdrop-blur-sm max-w-[240px]">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-lg flex-shrink-0">📞</div>
                <div>
                  <p className="text-sm font-bold">Surf is calling this lead</p>
                  <p className="text-xs text-gray-500">Following up automatically</p>
                </div>
              </div>
              <div className="absolute -left-4 bottom-[15%] bg-white/95 text-gray-900 rounded-2xl shadow-lg px-4 py-3 hidden lg:flex items-center gap-3 backdrop-blur-sm max-w-[240px]">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-lg flex-shrink-0">✅</div>
                <div>
                  <p className="text-sm font-bold">Surf confirmed appointment</p>
                  <p className="text-xs text-gray-500">Client confirmed for Thursday</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AGENCY BENEFITS ── */}
      <section id="benefits" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Agency Benefits</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Built for agencies that want more than another CRM.</h2>
            <p className="text-lg text-gray-600">Replace multiple tools, deliver white-label services, automate follow-up, and scale without adding complexity.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {agencyBenefits.map((b) => (
              <div key={b.title} className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all text-center">
                <div className="text-3xl mb-4">{b.icon}</div>
                <p className="text-3xl font-black text-blue-600 mb-1">{b.stat}</p>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{b.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESELLER SECTION ── */}
      <section className="py-24 px-6 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-widest text-blue-400 mb-3">Reseller Program</p>
            <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
              Launch your own SaaS under your brand.
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              Use SAAS Surface internally or resell it to clients for recurring revenue. White-label branding, custom domains, client accounts, and built-in billing — all included.
            </p>

            <div className="space-y-4 mb-10">
              {resellerPoints.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <span className="text-blue-400 font-bold text-lg mt-0.5">✓</span>
                  <span className="text-gray-300 font-semibold">{point}</span>
                </div>
              ))}
            </div>

            <Link
              to="/register"
              className="inline-block px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 transition-all shadow-lg"
            >
              Start Free
            </Link>
            <p className="text-gray-500 text-sm mt-4">Available on the Agency plan.</p>
          </div>

          <div className="flex justify-center">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-sm w-full">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Your Reseller Dashboard</p>
              <div className="space-y-4">
                {[
                  { label: 'Active Sub-Accounts', value: '12' },
                  { label: 'Monthly Recurring', value: '$2,940' },
                  { label: 'Your Margin', value: '68%' },
                  { label: 'Avg. Client LTV', value: '$4,200' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-3 border-b border-gray-700">
                    <span className="text-gray-400 text-sm">{s.label}</span>
                    <span className="text-white font-bold text-lg">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BAND 2 ── */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 px-6">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to stop duct-taping tools together?</h2>
          <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">Join the agencies replacing scattered tools with one AI-powered platform.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-blue-700 font-bold text-lg rounded-xl hover:bg-blue-50 transition-all shadow-lg"
            >
              Start Free
            </Link>
            <a
              href="https://calendly.com/saassurface/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 border border-white/30 text-white font-semibold text-lg rounded-xl hover:bg-white/10 transition-all"
            >
              Book a Demo
            </a>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-amber-800 font-bold text-sm mb-6">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              Founding Member Pricing — First 50 agencies get this rate locked in for life
            </div>
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Founding Member Pricing — lock it in for life.</h2>
            <p className="text-lg text-gray-600 mb-4">Only the first 50 agencies get these rates. After that, pricing increases.</p>
            <p className="text-sm text-amber-700 font-semibold mb-8">Early adopters keep their pricing forever.</p>

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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    BEST VALUE — FOUNDING MEMBER
                  </div>
                )}

                <h3 className={`font-bold text-xl mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-blue-200' : 'text-gray-500'}`}>
                  {plan.desc}
                </p>

                <div className="mb-2">
                  {plan.futureMonthly && (
                    <div className="mb-1">
                      <span className={`text-base line-through ${plan.highlight ? 'text-blue-300' : 'text-gray-400'}`}>
                        ${plan.futureMonthly}/mo
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                      ${annual ? plan.annual : plan.monthly}
                    </span>
                    <span className={`text-sm font-medium ${plan.highlight ? 'text-blue-200' : 'text-gray-500'}`}>
                      /mo{annual ? ' (annual)' : ''}
                    </span>
                  </div>
                </div>
                {plan.futureMonthly && (
                  <p className={`text-xs font-semibold mb-2 ${plan.highlight ? 'text-blue-200' : 'text-amber-600'}`}>
                    Founding price — locks in at ${annual ? plan.annual : plan.monthly}/mo forever
                  </p>
                )}
                {plan.spotsLeft && (
                  <p className={`text-xs font-bold mb-4 ${plan.highlight ? 'text-amber-300' : 'text-amber-600'}`}>
                    Only {plan.spotsLeft} founding spots remaining
                  </p>
                )}

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
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Compare</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Why agencies switch to SAAS Surface.</h2>
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
                  <th className="px-6 py-4 text-center font-semibold text-gray-500">GoHighLevel</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-500">HoneyBook</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 text-gray-700 font-medium">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      {row.isText
                        ? <span className="font-bold text-blue-600">{row.us}</span>
                        : row.us
                          ? <span className="text-green-500 font-bold text-lg">✓</span>
                          : <span className="text-gray-300 font-bold text-lg">✗</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.isText
                        ? <span className="font-semibold text-gray-600">{row.ghl}</span>
                        : row.ghl
                          ? <span className="text-green-500 font-bold text-lg">✓</span>
                          : <span className="text-gray-300 font-bold text-lg">✗</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.isText
                        ? <span className="font-semibold text-gray-600">{row.honeybook}</span>
                        : row.honeybook
                          ? <span className="text-green-500 font-bold text-lg">✓</span>
                          : <span className="text-gray-300 font-bold text-lg">✗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">Pricing and feature data last verified March 2026. Competitor features may change.</p>
        </div>
      </section>

      {/* ── WHY CHOOSE / TESTIMONIALS ── */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">The Switch</p>
            <h2 className="text-4xl font-extrabold text-gray-900">Four reasons agencies make the switch</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChoose.map((item) => (
              <div key={item.title} className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all">
                <div className="text-3xl mb-4">{item.isImage ? <img src={item.icon} alt={item.title} className="w-10 h-10 object-contain" /> : item.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Real testimonials (shown when available) */}
          {testimonials.length > 0 && (
            <div className="mt-16">
              <h3 className="text-center text-2xl font-extrabold text-gray-900 mb-8">What our users are saying</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testimonials.slice(0, 6).map((t) => (
                  <div key={t.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-1 text-amber-400 mb-3">
                      {[...Array(t.rating || 5)].map((_, i) => <span key={i}>★</span>)}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {t.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                        <p className="text-gray-500 text-xs">{t.role}{t.company ? `, ${t.company}` : ''}</p>
                      </div>
                    </div>
                    {t.video_url && (
                      <a href={t.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-blue-600 hover:underline">
                        ▶ Watch video review
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link to="/testimonial" className="text-sm font-semibold text-blue-600 hover:underline">Share your experience →</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Before You Sign Up</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Common questions before signing up</h2>
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
            Stop juggling tools.<br />Start running smarter.
          </h2>
          <p className="text-blue-200 text-lg mb-10 max-w-xl mx-auto">
            Capture leads, automate follow-up, answer calls, manage clients, and grow your agency with Surf. Founding Member pricing available for the first 50 agencies.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-blue-700 font-bold text-lg rounded-xl hover:bg-blue-50 transition-all shadow-lg"
            >
              Start Free
            </Link>
            <a
              href="https://calendly.com/saassurface/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 border border-white/30 text-white font-semibold text-lg rounded-xl hover:bg-white/10 transition-all"
            >
              Book a Demo
            </a>
          </div>
          <p className="text-blue-300 text-sm mt-6">No credit card required · Founding member pricing · 30-day money-back guarantee</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">S</div>
                <span className="font-bold text-white text-lg">SAAS Surface</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                The all-in-one agency operating system powered by Surf. CRM, client portal, invoicing, marketing automation, AI voice, and managed hosting — everything your agency needs.
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
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Log In</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Get Started Free</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-white text-sm mb-4">Legal</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/sms-terms" className="hover:text-white transition-colors">SMS Terms</Link></li>
                <li><Link to="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link></li>
                <li><Link to="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link></li>
                <li><Link to="/security-policy" className="hover:text-white transition-colors">Security</Link></li>
                <li><Link to="/service-level-agreement" className="hover:text-white transition-colors">SLA</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-white text-sm mb-4">Contact</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><a href="tel:+18554558182" className="hover:text-white transition-colors">1 (855) 455-8182</a></li>
                <li><a href="mailto:support@saassurface.com" className="hover:text-white transition-colors">support@saassurface.com</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© {new Date().getFullYear()} SAAS Surface — Powered by Surf · Hosting by All Elite Hosting · All rights reserved.</p>
            <div className="flex flex-wrap gap-4 text-sm justify-center">
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/sms-terms" className="hover:text-white transition-colors">SMS</Link>
              <Link to="/cookie-policy" className="hover:text-white transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── FLOATING SURF CHATBOT ── */}
      <div className="fixed right-6 bottom-6 z-50">
        {/* Chat window */}
        {surfOpen && (
          <div className="mb-3 w-[370px] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
              <img src="/images/surf-avatar.png" alt="Surf" className="w-9 h-9 rounded-full object-cover" />
              <div className="flex-1">
                <p className="font-bold text-sm">Surf</p>
                <p className="text-xs opacity-80">AI Agency Assistant</p>
              </div>
              <button onClick={() => setSurfOpen(false)} className="text-white/80 hover:text-white text-lg font-bold">✕</button>
            </div>

            {surfStep === 'collect' ? (
              /* Lead capture form */
              <div className="p-5 flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <img src="/images/surf-avatar.png" alt="Surf" className="w-10 h-10 rounded-full object-cover" />
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm text-gray-800">
                    Hi! I'm Surf. Before we chat, let me know who I'm talking to so I can help you better.
                  </div>
                </div>

                <form onSubmit={handleSurfLeadSubmit} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your name *"
                    value={surfLead.name}
                    onChange={(e) => setSurfLead(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                  <input
                    type="email"
                    placeholder="Work email *"
                    value={surfLead.email}
                    onChange={(e) => setSurfLead(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                  <input
                    type="tel"
                    placeholder="Phone number *"
                    value={surfLead.phone}
                    onChange={(e) => setSurfLead(prev => ({ ...prev, phone: e.target.value }))}
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                  <input
                    type="text"
                    placeholder="Company (optional)"
                    value={surfLead.company}
                    onChange={(e) => setSurfLead(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                  >
                    Start Chatting with Surf →
                  </button>
                </form>
                <p className="text-xs text-gray-400 mt-3 text-center">We'll never spam you. Just helpful info.</p>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[360px]" style={{ scrollbarWidth: 'thin' }}>
                  {surfMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.from === 'user'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {surfTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-500 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
                        <span className="inline-flex gap-1">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-gray-100 flex-shrink-0">
                  <form onSubmit={(e) => { e.preventDefault(); handleSurfSend(); }} className="flex gap-2">
                    <input
                      type="text"
                      value={surfInput}
                      onChange={(e) => setSurfInput(e.target.value)}
                      placeholder="Ask about features, pricing, setup..."
                      className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex-shrink-0"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}

        {/* Toggle button */}
        <button
          className="flex items-center gap-3 px-4 py-2.5 bg-white/95 border border-gray-200 rounded-full shadow-lg backdrop-blur-sm hover:-translate-y-1 transition-all"
          aria-label="Ask Surf"
          onClick={() => setSurfOpen(!surfOpen)}
        >
          <div className="relative w-11 h-11 flex-shrink-0">
            <div className="absolute inset-0 rounded-full" style={{ animation: 'surfGlow 4s ease-in-out infinite' }} />
            <img
              src="/images/surf-avatar.png"
              alt="Surf"
              className="relative w-11 h-11 rounded-full object-cover"
              style={{ animation: 'surfPulse 3s ease-in-out infinite' }}
            />
          </div>
          <span className="font-extrabold text-gray-800 text-sm hidden sm:inline">
            {surfOpen ? 'Close' : 'Need help? Ask Surf'}
          </span>
        </button>
      </div>
    </div>
  );
}
