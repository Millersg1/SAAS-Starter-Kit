import { Link } from 'react-router-dom';

const steps = [
  { key: 'hasBrand',      label: 'Create your brand',         cta: 'Go to Brands →',     href: '/brands' },
  { key: 'hasClient',     label: 'Add your first client',     cta: 'Add Client →',        href: '/clients/new' },
  { key: 'hasProject',    label: 'Create a project',          cta: 'New Project →',       href: '/projects/new' },
  { key: 'hasSentInvoice',label: 'Send your first invoice',   cta: 'Go to Invoices →',    href: '/invoices' },
  { key: 'hasStripe',     label: 'Connect Stripe payments',   cta: 'Connect Stripe →',    href: '/brands' },
];

export default function OnboardingChecklist({ hasBrand, hasClient, hasProject, hasSentInvoice, hasStripe, onDismiss }) {
  const flags = { hasBrand, hasClient, hasProject, hasSentInvoice, hasStripe };
  const completed = steps.filter(s => flags[s.key]).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Getting Started</h2>
          <p className="text-sm text-gray-500">{completed} of {steps.length} steps complete</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 text-xs underline ml-4"
        >
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-2">
        {steps.map((step) => {
          const done = !!flags[step.key];
          return (
            <li key={step.key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {done ? '✓' : '○'}
                </span>
                <span className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {step.label}
                </span>
              </div>
              {!done && (
                <Link
                  to={step.href}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                >
                  {step.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
