import { useState } from 'react';

// Convert YouTube/Vimeo watch URLs to embed URLs
function toEmbedUrl(url) {
  if (!url) return '';
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <span key={n} className={n <= rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
      ))}
    </div>
  );
}

// ── Block renderers ───────────────────────────────────────────────────────────

function HeroBlock({ props }) {
  const {
    headline = 'Your Compelling Headline Here',
    subheadline = 'A short description that explains your offer and why it matters.',
    ctaText = 'Get Started Free',
    ctaUrl = '#form',
    backgroundColor = '#1d4ed8',
    textColor = 'light',
    alignment = 'center',
    imageUrl,
  } = props;

  const textCls = textColor === 'light' ? 'text-white' : 'text-gray-900';
  const alignCls = alignment === 'center' ? 'text-center items-center' : 'text-left items-start';

  return (
    <section
      className={`w-full py-20 px-6 flex flex-col ${alignCls}`}
      style={{ backgroundColor, backgroundImage: imageUrl ? `url(${imageUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className={`max-w-3xl w-full mx-auto flex flex-col ${alignCls} gap-6`}>
        <h1 className={`text-4xl md:text-5xl font-bold leading-tight ${textCls}`}>{headline}</h1>
        {subheadline && <p className={`text-lg md:text-xl opacity-90 max-w-2xl ${textCls}`}>{subheadline}</p>}
        {ctaText && (
          <a
            href={ctaUrl || '#'}
            className="inline-block px-8 py-4 bg-white text-gray-900 font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg text-lg"
            onClick={e => { if (ctaUrl?.startsWith('#') || !ctaUrl) e.preventDefault(); }}
          >
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}

function FeaturesBlock({ props }) {
  const {
    sectionTitle = 'Why Choose Us',
    sectionSubtitle = '',
    columns = 3,
    backgroundColor = '#ffffff',
    items = [
      { icon: '⚡', title: 'Fast Results', description: 'Get results quickly with our proven system.' },
      { icon: '🔒', title: 'Secure & Reliable', description: 'Enterprise-grade security you can trust.' },
      { icon: '💰', title: 'Great Value', description: 'Affordable plans for businesses of all sizes.' },
    ],
  } = props;

  const gridCls = columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3';

  return (
    <section className="w-full py-16 px-6" style={{ backgroundColor }}>
      <div className="max-w-5xl mx-auto">
        {sectionTitle && <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">{sectionTitle}</h2>}
        {sectionSubtitle && <p className="text-gray-500 text-center mb-10">{sectionSubtitle}</p>}
        <div className={`grid ${gridCls} gap-8`}>
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 rounded-xl bg-white shadow-sm border border-gray-100">
              <span className="text-4xl mb-4">{item.icon || '✨'}</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsBlock({ props }) {
  const {
    sectionTitle = 'What Our Clients Say',
    backgroundColor = '#f9fafb',
    items = [
      { name: 'Sarah Johnson', role: 'CEO, Acme Co.', text: 'This is absolutely incredible. It changed how we run our entire business.', rating: 5 },
      { name: 'Mark Davis', role: 'Founder, StartupXYZ', text: 'I was skeptical at first, but the results speak for themselves.', rating: 5 },
      { name: 'Lisa Chen', role: 'Director of Marketing', text: 'Best investment we made this year. Highly recommend to anyone.', rating: 5 },
    ],
  } = props;

  return (
    <section className="w-full py-16 px-6" style={{ backgroundColor }}>
      <div className="max-w-5xl mx-auto">
        {sectionTitle && <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">{sectionTitle}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
              <StarRating rating={item.rating || 5} />
              <p className="text-gray-700 italic leading-relaxed">"{item.text}"</p>
              <div className="mt-auto">
                <p className="font-semibold text-gray-900">{item.name}</p>
                {item.role && <p className="text-sm text-gray-500">{item.role}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBannerBlock({ props }) {
  const {
    headline = 'Ready to Get Started?',
    subheadline = "Don't wait — join thousands of happy customers today.",
    ctaText = 'Start Now',
    ctaUrl = '#form',
    backgroundColor = '#111827',
    textColor = 'light',
  } = props;
  const textCls = textColor === 'light' ? 'text-white' : 'text-gray-900';
  return (
    <section className="w-full py-16 px-6 text-center" style={{ backgroundColor }}>
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
        <h2 className={`text-3xl md:text-4xl font-bold ${textCls}`}>{headline}</h2>
        {subheadline && <p className={`text-lg opacity-80 ${textCls}`}>{subheadline}</p>}
        {ctaText && (
          <a href={ctaUrl || '#'} className="inline-block px-8 py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-400 transition-colors shadow-lg text-lg">
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}

function LeadFormBlock({ props, onSubmit }) {
  const {
    title = 'Get Your Free Consultation',
    description = 'Fill out the form below and we\'ll be in touch within 24 hours.',
    fields = [
      { label: 'Full Name', type: 'text', required: true },
      { label: 'Email', type: 'email', required: true },
    ],
    submitText = 'Submit',
    successMessage = "Thanks! We'll be in touch soon.",
    redirectUrl = '',
    backgroundColor = '#f9fafb',
  } = props;

  const [values, setValues] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate required
    for (const f of fields) {
      if (f.required && !values[f.label]?.trim()) {
        setError(`${f.label} is required`);
        return;
      }
    }
    setError('');
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(values, redirectUrl, successMessage);
      }
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="form" className="w-full py-16 px-6" style={{ backgroundColor }}>
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-lg p-8">
        {title && <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">{title}</h2>}
        {description && <p className="text-gray-500 text-center mb-6 text-sm">{description}</p>}

        {submitted ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-gray-700 font-medium">{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {fields.map((field, i) => (
              <div key={i}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={values[field.label] || ''}
                    onChange={e => setValues(p => ({ ...p, [field.label]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    required={field.required}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={values[field.label] || ''}
                    onChange={e => setValues(p => ({ ...p, [field.label]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    required={field.required}
                  >
                    <option value="">Select...</option>
                    {(field.options || '').split(',').map(o => o.trim()).filter(Boolean).map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={values[field.label] || ''}
                    onChange={e => setValues(p => ({ ...p, [field.label]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={field.required}
                  />
                )}
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-base"
            >
              {loading ? 'Sending...' : submitText}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function PricingBlock({ props }) {
  const {
    sectionTitle = 'Simple, Transparent Pricing',
    backgroundColor = '#ffffff',
    plans = [
      { name: 'Starter', price: '29', period: 'month', features: ['5 clients', 'Basic features', 'Email support'], ctaText: 'Get Started', ctaUrl: '#form', highlighted: false },
      { name: 'Pro', price: '79', period: 'month', features: ['Unlimited clients', 'All features', 'Priority support', 'Custom domain'], ctaText: 'Start Free Trial', ctaUrl: '#form', highlighted: true },
    ],
  } = props;

  return (
    <section className="w-full py-16 px-6" style={{ backgroundColor }}>
      <div className="max-w-4xl mx-auto">
        {sectionTitle && <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">{sectionTitle}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl p-8 flex flex-col gap-4 ${
                plan.highlighted
                  ? 'bg-blue-600 text-white shadow-xl ring-4 ring-blue-300'
                  : 'bg-white border border-gray-200 shadow-sm'
              }`}
            >
              <div>
                <p className={`text-sm font-semibold uppercase tracking-wide ${plan.highlighted ? 'text-blue-200' : 'text-gray-500'}`}>{plan.name}</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={`text-5xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>${plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-blue-200' : 'text-gray-400'}`}>/{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-2 flex-1">
                {(typeof plan.features === 'string' ? plan.features.split('\n') : plan.features || []).filter(Boolean).map((f, fi) => (
                  <li key={fi} className={`flex items-center gap-2 text-sm ${plan.highlighted ? 'text-blue-100' : 'text-gray-600'}`}>
                    <span className="text-green-400 flex-shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.ctaUrl || '#'}
                className={`block text-center py-3 rounded-xl font-bold transition-colors ${
                  plan.highlighted
                    ? 'bg-white text-blue-600 hover:bg-blue-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {plan.ctaText || 'Get Started'}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TextContentBlock({ props }) {
  const { content = '<p>Add your content here...</p>', backgroundColor = '#ffffff', maxWidth = 'normal', alignment = 'left' } = props;
  const maxWCls = maxWidth === 'wide' ? 'max-w-4xl' : 'max-w-2xl';
  const alignCls = alignment === 'center' ? 'mx-auto text-center' : alignment === 'right' ? 'ml-auto text-right' : '';
  return (
    <section className="w-full py-12 px-6" style={{ backgroundColor }}>
      <div
        className={`${maxWCls} ${alignCls} prose prose-gray max-w-none`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </section>
  );
}

function VideoBlock({ props }) {
  const { url = '', title = '', description = '', backgroundColor = '#ffffff' } = props;
  const embedUrl = toEmbedUrl(url);
  return (
    <section className="w-full py-16 px-6" style={{ backgroundColor }}>
      <div className="max-w-3xl mx-auto">
        {title && <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">{title}</h2>}
        {embedUrl ? (
          <div className="relative w-full rounded-xl overflow-hidden shadow-lg" style={{ paddingTop: '56.25%' }}>
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={title || 'Video'}
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
            <span className="text-4xl">▶</span>
          </div>
        )}
        {description && <p className="text-gray-500 text-center mt-4 text-sm">{description}</p>}
      </div>
    </section>
  );
}

function SocialProofBlock({ props }) {
  const {
    title = 'Trusted by 200+ Agencies',
    subtitle = '',
    logoUrls = [],
    backgroundColor = '#f9fafb',
  } = props;
  return (
    <section className="w-full py-12 px-6" style={{ backgroundColor }}>
      <div className="max-w-4xl mx-auto text-center">
        {title && <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-6">{title}</p>}
        {subtitle && <p className="text-gray-400 text-sm mb-6">{subtitle}</p>}
        {logoUrls.length > 0 ? (
          <div className="flex flex-wrap justify-center items-center gap-8">
            {logoUrls.filter(Boolean).map((url, i) => (
              <img key={i} src={url} alt={`Partner ${i + 1}`} className="h-10 object-contain opacity-60 hover:opacity-100 transition-opacity" />
            ))}
          </div>
        ) : (
          <div className="flex justify-center gap-8 opacity-30">
            {['Company A', 'Company B', 'Company C', 'Company D'].map(name => (
              <div key={name} className="h-10 w-24 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-500">{name}</div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Main renderer ─────────────────────────────────────────────────────────────

const BLOCK_MAP = {
  hero:          HeroBlock,
  features:      FeaturesBlock,
  testimonials:  TestimonialsBlock,
  cta_banner:    CtaBannerBlock,
  lead_form:     LeadFormBlock,
  pricing:       PricingBlock,
  text_content:  TextContentBlock,
  video:         VideoBlock,
  social_proof:  SocialProofBlock,
};

export default function BlockRenderer({ block, isEditing = false, isSelected = false, onSelect, onSubmit }) {
  const Component = BLOCK_MAP[block.type];
  if (!Component) return null;

  if (isEditing) {
    return (
      <div
        className={`relative group cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:ring-2 hover:ring-blue-200'}`}
        onClick={() => onSelect?.(block.id)}
      >
        <Component props={block.props || {}} onSubmit={null} />
        {/* Block type label on hover */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${isSelected ? 'opacity-100' : ''}`}>
          {block.type.replace('_', ' ')}
        </div>
      </div>
    );
  }

  return <Component props={block.props || {}} onSubmit={onSubmit} />;
}
