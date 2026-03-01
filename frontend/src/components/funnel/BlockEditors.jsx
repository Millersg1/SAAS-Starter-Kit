// BlockEditors.jsx — Sidebar editor panels for all 9 funnel block types
// Each editor takes (props, onChange) and renders form inputs for the right sidebar.

import { useState } from 'react';

// ── Shared UI primitives ────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
    />
  );
}

function ColorInput({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value ?? '#ffffff'}
        onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-gray-200"
      />
      <Input value={value} onChange={onChange} placeholder="#ffffff" />
      {label && <span className="text-xs text-gray-400 whitespace-nowrap">{label}</span>}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
        onClick={() => onChange(!checked)}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

function SectionDivider({ title }) {
  return (
    <div className="flex items-center gap-2 my-4">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// Array item editor wrapper — add/remove items
function ArrayEditor({ items = [], onAdd, onRemove, renderItem, addLabel = 'Add Item' }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50 relative">
          <button
            onClick={() => onRemove(i)}
            className="absolute top-2 right-2 text-gray-300 hover:text-red-400 text-xs"
            title="Remove"
          >✕</button>
          {renderItem(item, i)}
        </div>
      ))}
      <button
        onClick={onAdd}
        className="w-full py-1.5 text-xs text-blue-600 border border-blue-200 border-dashed rounded-md hover:bg-blue-50 transition-colors"
      >
        + {addLabel}
      </button>
    </div>
  );
}

// ── HeroEditor ──────────────────────────────────────────────────────────────

export function HeroEditor({ props, onChange }) {
  const p = props || {};
  const set = (key, val) => onChange({ ...p, [key]: val });

  return (
    <div>
      <Field label="Headline">
        <Input value={p.headline} onChange={v => set('headline', v)} placeholder="Your compelling headline" />
      </Field>
      <Field label="Subheadline">
        <Textarea value={p.subheadline} onChange={v => set('subheadline', v)} placeholder="Supporting text that explains your offer" rows={2} />
      </Field>

      <SectionDivider title="Call to Action" />
      <Field label="Button Text">
        <Input value={p.ctaText} onChange={v => set('ctaText', v)} placeholder="Get Started Free" />
      </Field>
      <Field label="Button URL">
        <Input value={p.ctaUrl} onChange={v => set('ctaUrl', v)} placeholder="https://..." />
      </Field>

      <SectionDivider title="Appearance" />
      <Field label="Alignment">
        <Select
          value={p.alignment || 'center'}
          onChange={v => set('alignment', v)}
          options={[{ value: 'center', label: 'Center' }, { value: 'left', label: 'Left' }]}
        />
      </Field>
      <Field label="Text Color">
        <Select
          value={p.textColor || 'dark'}
          onChange={v => set('textColor', v)}
          options={[{ value: 'dark', label: 'Dark (on light bg)' }, { value: 'light', label: 'Light (on dark bg)' }]}
        />
      </Field>
      <Field label="Background Color">
        <ColorInput value={p.backgroundColor} onChange={v => set('backgroundColor', v)} />
      </Field>
      <Field label="Background Image URL">
        <Input value={p.imageUrl} onChange={v => set('imageUrl', v)} placeholder="https://..." />
      </Field>
    </div>
  );
}

// ── FeaturesEditor ──────────────────────────────────────────────────────────

export function FeaturesEditor({ props, onChange }) {
  const p = props || {};
  const set = (key, val) => onChange({ ...p, [key]: val });
  const items = p.items || [];

  const updateItem = (i, key, val) => {
    const next = items.map((it, idx) => idx === i ? { ...it, [key]: val } : it);
    set('items', next);
  };

  return (
    <div>
      <Field label="Section Title">
        <Input value={p.sectionTitle} onChange={v => set('sectionTitle', v)} placeholder="Why Choose Us" />
      </Field>
      <Field label="Section Subtitle">
        <Textarea value={p.sectionSubtitle} onChange={v => set('sectionSubtitle', v)} placeholder="Optional supporting text" rows={2} />
      </Field>
      <Field label="Columns">
        <Select
          value={String(p.columns || 3)}
          onChange={v => set('columns', Number(v))}
          options={[{ value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }]}
        />
      </Field>
      <Field label="Background Color">
        <ColorInput value={p.backgroundColor} onChange={v => set('backgroundColor', v)} />
      </Field>

      <SectionDivider title="Feature Items" />
      <ArrayEditor
        items={items}
        addLabel="Add Feature"
        onAdd={() => set('items', [...items, { icon: '⚡', title: 'Feature', description: 'Description here' }])}
        onRemove={i => set('items', items.filter((_, idx) => idx !== i))}
        renderItem={(item, i) => (
          <div className="space-y-2 pr-4">
            <Field label="Icon (emoji or text)">
              <Input value={item.icon} onChange={v => updateItem(i, 'icon', v)} placeholder="⚡" />
            </Field>
            <Field label="Title">
              <Input value={item.title} onChange={v => updateItem(i, 'title', v)} placeholder="Feature name" />
            </Field>
            <Field label="Description">
              <Textarea value={item.description} onChange={v => updateItem(i, 'description', v)} rows={2} placeholder="Feature description" />
            </Field>
          </div>
        )}
      />
    </div>
  );
}

// ── TestimonialsEditor ──────────────────────────────────────────────────────

export function TestimonialsEditor({ props, onChange }) {
  const p = props || {};
  const set = (key, val) => onChange({ ...p, [key]: val });
  const items = p.items || [];

  const updateItem = (i, key, val) => {
    const next = items.map((it, idx) => idx === i ? { ...it, [key]: val } : it);
    set('items', next);
  };

  return (
    <div>
      <Field label="Section Title">
        <Input value={p.sectionTitle} onChange={v => set('sectionTitle', v)} placeholder="What Our Clients Say" />
      </Field>
      <Field label="Background Color">
        <ColorInput value={p.backgroundColor} onChange={v => set('backgroundColor', v)} />
      </Field>

      <SectionDivider title="Testimonials" />
      <ArrayEditor
        items={items}
        addLabel="Add Testimonial"
        onAdd={() => set('items', [...items, { name: 'Jane Doe', role: 'CEO, Company', text: 'This product is amazing!', rating: 5 }])}
        onRemove={i => set('items', items.filter((_, idx) => idx !== i))}
        renderItem={(item, i) => (
          <div className="space-y-2 pr-4">
            <Field label="Name">
              <Input value={item.name} onChange={v => updateItem(i, 'name', v)} placeholder="Jane Doe" />
            </Field>
            <Field label="Role / Company">
              <Input value={item.role} onChange={v => updateItem(i, 'role', v)} placeholder="CEO, Acme Corp" />
            </Field>
            <Field label="Testimonial Text">
              <Textarea value={item.text} onChange={v => updateItem(i, 'text', v)} rows={3} placeholder="Their review..." />
            </Field>
            <Field label="Star Rating (1–5)">
              <Select
                value={String(item.rating || 5)}
                onChange={v => updateItem(i, 'rating', Number(v))}
                options={[5, 4, 3, 2, 1].map(n => ({ value: String(n), label: '★'.repeat(n) + '☆'.repeat(5 - n) }))}
              />
            </Field>
          </div>
        )}
      />
    </div>
  );
}

// ── CtaBannerEditor ─────────────────────────────────────────────────────────

export function CtaBannerEditor({ props, onChange }) {
  const p = props || {};
  const set = (key, val) => onChange({ ...p, [key]: val });

  return (
    <div>
      <Field label="Headline">
        <Input value={p.headline} onChange={v => set('headline', v)} placeholder="Ready to get started?" />
      </Field>
      <Field label="Subheadline">
        <Textarea value={p.subheadline} onChange={v => set('subheadline', v)} placeholder="Supporting text" rows={2} />
      </Field>
      <Field label="Button Text">
        <Input value={p.ctaText} onChange={v => set('ctaText', v)} placeholder="Start Free Trial" />
      </Field>
      <Field label="Button URL">
        <Input value={p.ctaUrl} onChange={v => set('ctaUrl', v)} placeholder="https://..." />
      </Field>

      <SectionDivider title="Appearance" />
      <Field label="Text Color">
        <Select
          value={p.textColor || 'light'}
          onChange={v => set('textColor', v)}
          options={[{ value: 'light', label: 'Light (white text)' }, { value: 'dark', label: 'Dark (dark text)' }]}
        />
      </Field>
      <Field label="Background Color">
        <ColorInput value={p.backgroundColor} onChange={v => set('backgroundColor', v)} />
      </Field>
    </div>
  );
}

// ── LeadFormEditor ──────────────────────────────────────────────────────────

export function LeadFormEditor({ props, onChange }) {
  const p = props || {};
  const set = (key, val) => onChange({ ...p, [key]: val });
  const fields = p.fields || [];

  const updateField = (i, key, val) => {
    const next = fields.map((f, idx) => idx === i ? { ...f, [key]: val } : f);
    set('fields', next);
  };

  return (
    <div>
      <Field label="Form Title">
        <Input value={p.title} onChange={v => set('title', v)} placeholder="Get Your Free Quote" />
      </Field>
      <Field label="Description">
        <Textarea value={p.description} onChange={v => set('description', v)} placeholder="Fill out the form and we'll get back to you." rows={2} />
      </Field>
      <Field label="Submit Button Text">
        <Input value={p.submitText} onChange={v => set('submitText', v)} placeholder="Submit" />
      </Field>
      <Field label="Background Color">
        <ColorInput value={p.backgroundColor} onChange={v => set('backgroundColor', v)} />
      </Field>

      <SectionDivider title="After Submit" />
      <Field label="Success Message">
        <Textarea value={p.successMessage} onChange={v => set('successMessage', v)} placeholder="Thanks! We'll be in touch soon." rows={2} />
      </Field>
      <Field label="Redirect URL (optional)">
        <Input value={p.redirectUrl} onChange={v => set('redirectUrl', v)} placeholder="https://... (leave blank to show message)" />
      </Field>

      <SectionDivider title="Form Fields" />
      <ArrayEditor
        items={fields}
        addLabel="Add Field"
        onAdd={() => set('fields', [...fields, { label: 'New Field', type: 'text', required: false }])}
        onRemove={i => set('fields', fields.filter((_, idx) => idx !== i))}
        renderItem={(field, i) => (
          <div className="space-y-2 pr-4">
            <Field label="Label">
              <Input value={field.label} onChange={v => updateField(i, 'label', v)} placeholder="Field label" />
            </Field>
            <Field label="Type">
              <Select
                value={field.type || 'text'}
                onChange={v => updateField(i, 'type', v)}
                options={[
                  { value: 'text', label: 'Text' },
                  { value: 'email', label: 'Email' },
                  { value: 'phone', label: 'Phone' },
                  { value: 'textarea', label: 'Text Area' },
                  { value: 'select', label: 'Dropdown' },
                ]}
              />
            </Field>
            <Toggle
              checked={field.required}
              onChange={v => updateField(i, 'required', v)}
              label="Required"
            />
          </div>
        )}
      />
    </div>
  );
}

// ── PricingEditor ───────────────────────────────────────────────────────────

export function PricingEditor({ props, onChange }) {
  const p = props || {};
  const set = (key, val) => onChange({ ...p, [key]: val });
  const plans = p.plans || [];

  const updatePlan = (i, key, val) => {
    const next = plans.map((pl, idx) => idx === i ? { ...pl, [key]: val } : pl);
    set('plans', next);
  };

  return (
    <div>
      <Field label="Section Title">
        <Input value={p.sectionTitle} onChange={v => set('sectionTitle', v)} placeholder="Simple, Transparent Pricing" />
      </Field>
      <Field label="Background Color">
        <ColorInput value={p.backgroundColor} onChange={v => set('backgroundColor', v)} />
      </Field>

      <SectionDivider title="Pricing Plans" />
      <ArrayEditor
        items={plans}
        addLabel="Add Plan"
        onAdd={() => set('plans', [...plans, { name: 'Pro', price: '$99', period: '/month', features: ['Feature 1', 'Feature 2'], ctaText: 'Get Started', ctaUrl: '', highlighted: false }])}
        onRemove={i => set('plans', plans.filter((_, idx) => idx !== i))}
        renderItem={(plan, i) => (
          <div className="space-y-2 pr-4">
            <Field label="Plan Name">
              <Input value={plan.name} onChange={v => updatePlan(i, 'name', v)} placeholder="Pro" />
            </Field>
            <Field label="Price">
              <Input value={plan.price} onChange={v => updatePlan(i, 'price', v)} placeholder="$99" />
            </Field>
            <Field label="Period">
              <Input value={plan.period} onChange={v => updatePlan(i, 'period', v)} placeholder="/month" />
            </Field>
            <Field label="Features (one per line)">
              <Textarea
                value={Array.isArray(plan.features) ? plan.features.join('\n') : plan.features}
                onChange={v => updatePlan(i, 'features', v.split('\n').filter(Boolean))}
                rows={4}
                placeholder={"Feature 1\nFeature 2\nFeature 3"}
              />
            </Field>
            <Field label="Button Text">
              <Input value={plan.ctaText} onChange={v => updatePlan(i, 'ctaText', v)} placeholder="Get Started" />
            </Field>
            <Field label="Button URL">
              <Input value={plan.ctaUrl} onChange={v => updatePlan(i, 'ctaUrl', v)} placeholder="https://..." />
            </Field>
            <Toggle
              checked={plan.highlighted}
              onChange={v => updatePlan(i, 'highlighted', v)}
              label="Highlight this plan"
            />
          </div>
        )}
      />
    </div>
  );
}

// ── TextContentEditor ───────────────────────────────────────────────────────

export function TextContentEditor({ props, onChange }) {
  const p = props || {};
  const set = (key, val) => onChange({ ...p, [key]: val });

  return (
    <div>
      <Field label="HTML Content">
        <Textarea
          value={p.content}
          onChange={v => set('content', v)}
          placeholder="<h2>Your Heading</h2><p>Your paragraph text here...</p>"
          rows={8}
        />
      </Field>
      <p className="text-xs text-gray-400 mb-3">HTML tags are rendered. Use &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;strong&gt;, etc.</p>

      <Field label="Background Color">
        <ColorInput value={p.backgroundColor} onChange={v => set('backgroundColor', v)} />
      </Field>
      <Field label="Max Width">
        <Select
          value={p.maxWidth || 'normal'}
          onChange={v => set('maxWidth', v)}
          options={[{ value: 'normal', label: 'Normal (720px)' }, { value: 'wide', label: 'Wide (1100px)' }]}
        />
      </Field>
      <Field label="Alignment">
        <Select
          value={p.alignment || 'left'}
          onChange={v => set('alignment', v)}
          options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }]}
        />
      </Field>
    </div>
  );
}

// ── VideoEditor ─────────────────────────────────────────────────────────────

export function VideoEditor({ props, onChange }) {
  const p = props || {};
  const set = (key, val) => onChange({ ...p, [key]: val });

  return (
    <div>
      <Field label="Video URL">
        <Input value={p.url} onChange={v => set('url', v)} placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..." />
      </Field>
      <p className="text-xs text-gray-400 mb-3">Supports YouTube and Vimeo URLs.</p>

      <Field label="Title (optional)">
        <Input value={p.title} onChange={v => set('title', v)} placeholder="Watch our overview video" />
      </Field>
      <Field label="Description (optional)">
        <Textarea value={p.description} onChange={v => set('description', v)} placeholder="Short description below the video" rows={2} />
      </Field>
      <Field label="Background Color">
        <ColorInput value={p.backgroundColor} onChange={v => set('backgroundColor', v)} />
      </Field>
    </div>
  );
}

// ── SocialProofEditor ───────────────────────────────────────────────────────

export function SocialProofEditor({ props, onChange }) {
  const p = props || {};
  const set = (key, val) => onChange({ ...p, [key]: val });
  const logoUrls = p.logoUrls || [];

  return (
    <div>
      <Field label="Title">
        <Input value={p.title} onChange={v => set('title', v)} placeholder="Trusted by leading companies" />
      </Field>
      <Field label="Subtitle (optional)">
        <Input value={p.subtitle} onChange={v => set('subtitle', v)} placeholder="Join 500+ businesses" />
      </Field>
      <Field label="Background Color">
        <ColorInput value={p.backgroundColor} onChange={v => set('backgroundColor', v)} />
      </Field>

      <SectionDivider title="Company Logos" />
      <ArrayEditor
        items={logoUrls}
        addLabel="Add Logo URL"
        onAdd={() => set('logoUrls', [...logoUrls, ''])}
        onRemove={i => set('logoUrls', logoUrls.filter((_, idx) => idx !== i))}
        renderItem={(url, i) => (
          <div className="pr-4">
            <Field label={`Logo ${i + 1} URL`}>
              <Input
                value={url}
                onChange={v => {
                  const next = [...logoUrls];
                  next[i] = v;
                  set('logoUrls', next);
                }}
                placeholder="https://example.com/logo.png"
              />
            </Field>
            {url && (
              <img src={url} alt="" className="h-8 object-contain mt-1 opacity-60" onError={e => { e.target.style.display = 'none'; }} />
            )}
          </div>
        )}
      />
    </div>
  );
}

// ── Block editor registry ───────────────────────────────────────────────────

const EDITORS = {
  hero:          HeroEditor,
  features:      FeaturesEditor,
  testimonials:  TestimonialsEditor,
  cta_banner:    CtaBannerEditor,
  lead_form:     LeadFormEditor,
  pricing:       PricingEditor,
  text_content:  TextContentEditor,
  video:         VideoEditor,
  social_proof:  SocialProofEditor,
};

export const BLOCK_LABELS = {
  hero:          'Hero',
  features:      'Features',
  testimonials:  'Testimonials',
  cta_banner:    'CTA Banner',
  lead_form:     'Lead Form',
  pricing:       'Pricing',
  text_content:  'Text / HTML',
  video:         'Video',
  social_proof:  'Social Proof',
};

export const BLOCK_ICONS = {
  hero:          '🦸',
  features:      '⚡',
  testimonials:  '💬',
  cta_banner:    '📢',
  lead_form:     '📋',
  pricing:       '💳',
  text_content:  '📝',
  video:         '▶️',
  social_proof:  '🏢',
};

export const BLOCK_DEFAULTS = {
  hero: {
    headline: 'Your Compelling Headline Here',
    subheadline: 'Supporting text that explains your unique value proposition and why visitors should take action today.',
    ctaText: 'Get Started Free',
    ctaUrl: '',
    backgroundColor: '#1e293b',
    textColor: 'light',
    alignment: 'center',
    imageUrl: '',
  },
  features: {
    sectionTitle: 'Everything You Need',
    sectionSubtitle: 'Powerful features to help you grow your business.',
    columns: 3,
    backgroundColor: '#ffffff',
    items: [
      { icon: '⚡', title: 'Fast Setup', description: 'Get started in minutes with our easy onboarding.' },
      { icon: '🔒', title: 'Secure', description: 'Enterprise-grade security to protect your data.' },
      { icon: '📈', title: 'Analytics', description: 'Track everything and make data-driven decisions.' },
    ],
  },
  testimonials: {
    sectionTitle: 'What Our Clients Say',
    backgroundColor: '#f8fafc',
    items: [
      { name: 'Sarah Johnson', role: 'CEO, TechCorp', text: 'This platform completely transformed how we manage our clients. Absolutely incredible!', rating: 5 },
      { name: 'Mark Davis', role: 'Founder, AgencyPro', text: 'The best investment we\'ve made. Our team is 10x more productive.', rating: 5 },
    ],
  },
  cta_banner: {
    headline: 'Ready to Get Started?',
    subheadline: 'Join thousands of businesses already using our platform.',
    ctaText: 'Start Your Free Trial',
    ctaUrl: '',
    backgroundColor: '#2563eb',
    textColor: 'light',
  },
  lead_form: {
    title: 'Get Your Free Consultation',
    description: 'Fill out the form below and we\'ll reach out within 24 hours.',
    fields: [
      { label: 'Full Name', type: 'text', required: true },
      { label: 'Email Address', type: 'email', required: true },
      { label: 'Phone Number', type: 'phone', required: false },
    ],
    submitText: 'Submit',
    successMessage: 'Thank you! We\'ll be in touch soon.',
    redirectUrl: '',
    backgroundColor: '#ffffff',
  },
  pricing: {
    sectionTitle: 'Simple, Transparent Pricing',
    backgroundColor: '#ffffff',
    plans: [
      { name: 'Starter', price: '$29', period: '/month', features: ['Up to 5 clients', 'Basic reports', 'Email support'], ctaText: 'Get Started', ctaUrl: '', highlighted: false },
      { name: 'Pro', price: '$79', period: '/month', features: ['Unlimited clients', 'Advanced analytics', 'Priority support', 'Custom branding'], ctaText: 'Start Free Trial', ctaUrl: '', highlighted: true },
      { name: 'Agency', price: '$199', period: '/month', features: ['Multiple brands', 'White-label', 'Dedicated account manager', 'API access'], ctaText: 'Contact Sales', ctaUrl: '', highlighted: false },
    ],
  },
  text_content: {
    content: '<h2>Your Heading</h2><p>Replace this with your own content. You can use <strong>bold text</strong>, <em>italic text</em>, and other HTML formatting.</p>',
    backgroundColor: '#ffffff',
    maxWidth: 'normal',
    alignment: 'left',
  },
  video: {
    url: '',
    title: 'See How It Works',
    description: 'Watch our 2-minute overview to see how our platform can help your business.',
    backgroundColor: '#f8fafc',
  },
  social_proof: {
    title: 'Trusted by Leading Companies',
    subtitle: 'Join 500+ businesses worldwide',
    logoUrls: [],
    backgroundColor: '#ffffff',
  },
};

// Default export — renders the correct editor for a given block type
export default function BlockEditorPanel({ block, onChange }) {
  if (!block) return null;
  const Editor = EDITORS[block.type];
  if (!Editor) {
    return <p className="text-sm text-gray-400 italic">No editor for block type: {block.type}</p>;
  }
  return (
    <Editor
      props={block.props || {}}
      onChange={newProps => onChange({ ...block, props: newProps })}
    />
  );
}
