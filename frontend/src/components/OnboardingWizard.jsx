import { useState } from 'react';
import { brandAPI, clientAPI, projectAPI, invoiceAPI } from '../services/api';

const STEPS = [
  { id: 0, title: 'Welcome to SAAS Surface', subtitle: 'Meet Surf — your AI agency assistant', skippable: false },
  { id: 1, title: 'Connect your brand', subtitle: 'Add your logo, colors, and domain', skippable: false },
  { id: 2, title: 'Set up your pipeline', subtitle: 'Define your stages and let Surf track what needs attention', skippable: true },
  { id: 3, title: 'Turn on automations', subtitle: 'Activate follow-ups, reminders, and workflows', skippable: true },
  { id: 4, title: 'Invite your team', subtitle: 'Bring your team into one organized system', skippable: true },
  { id: 5, title: 'Start winning with Surf', subtitle: 'Track deals, tasks, invoices, and projects', skippable: false },
];

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent';

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Context IDs passed between steps
  const [brandId, setBrandId] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [projectId, setProjectId] = useState(null);

  // Step 1 – Brand
  const [brandName, setBrandName] = useState('');
  const [brandIndustry, setBrandIndustry] = useState('');

  // Step 2 – Client
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Step 3 – Project
  const [projectTitle, setProjectTitle] = useState('');

  // Step 4 – Invoice
  const [invoiceDesc, setInvoiceDesc] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');

  const advance = () => {
    setError('');
    setStep((s) => s + 1);
  };

  const skip = () => {
    setError('');
    setStep((s) => s + 1);
  };

  const handleStep1 = async (e) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await brandAPI.createBrand({ name: brandName.trim(), industry: brandIndustry.trim() || undefined });
      setBrandId(res.data.data?.brand?.id || res.data.data?.id);
      advance();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create brand. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleStep2 = async (e) => {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim() || !brandId) { advance(); return; }
    if (!isValidEmail(clientEmail.trim())) { setError('Please enter a valid email address.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await clientAPI.createClient(brandId, { name: clientName.trim(), email: clientEmail.trim(), status: 'active' });
      setClientId(res.data.data?.client?.id);
      advance();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create client.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (e) => {
    e.preventDefault();
    if (!projectTitle.trim() || !brandId) { advance(); return; }
    setLoading(true);
    setError('');
    try {
      const res = await projectAPI.createProject(brandId, {
        name: projectTitle.trim(),
        client_id: clientId || undefined,
        status: 'in_progress',
      });
      setProjectId(res.data.data?.project?.id);
      advance();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep4 = async (e) => {
    e.preventDefault();
    if (!invoiceAmount || !brandId) { advance(); return; }
    setLoading(true);
    setError('');
    try {
      await invoiceAPI.createInvoice(brandId, {
        client_id: clientId || undefined,
        project_id: projectId || undefined,
        status: 'draft',
        items: [{
          description: invoiceDesc.trim() || 'Services',
          quantity: 1,
          unit_price: parseFloat(invoiceAmount),
        }],
      });
      advance();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = STEPS[step - 1];
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Step {step} of {STEPS.length}</span>
            <span className="text-sm text-gray-400">{Math.round(progress)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center pt-12 px-4">
        <div className="w-full max-w-lg">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{currentStep.title}</h1>
          <p className="text-gray-500 mb-8">{currentStep.subtitle}</p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Step 0 — Welcome / Meet Surf */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <img
                src="/images/surf-main.png"
                alt="Surf AI Assistant"
                className="w-48 h-48 mx-auto object-contain"
                style={{ filter: 'drop-shadow(0 12px 30px rgba(37,99,235,0.2))' }}
              />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to SAAS Surface</h2>
                <p className="text-blue-600 font-bold mb-3">Meet Surf — your AI agency assistant</p>
                <p className="text-gray-600 max-w-md mx-auto">
                  Surf helps your agency stay organized, automate follow-ups, and keep everything moving behind the scenes.
                </p>
              </div>
              <div className="text-left max-w-sm mx-auto space-y-3">
                {[
                  'Keep deals moving',
                  'Automate follow-ups',
                  'Stay on top of projects',
                  'Catch missed revenue opportunities',
                ].map((text) => (
                  <div key={text} className="flex items-center gap-3">
                    <span className="text-blue-600 font-bold">✔</span>
                    <span className="text-gray-700 font-semibold">{text}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-2">
                <button
                  onClick={advance}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
                >
                  Get Started with Surf →
                </button>
                <button
                  onClick={onComplete}
                  className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium text-sm"
                >
                  Explore Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Step 1 — Brand */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand / Agency name *</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Faith Harbor Creative"
                  className={inputCls}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry (optional)</label>
                <input
                  type="text"
                  value={brandIndustry}
                  onChange={(e) => setBrandIndustry(e.target.value)}
                  placeholder="e.g. Church, Marketing, Design"
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !brandName.trim()}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Brand & Continue'}
              </button>
            </form>
          )}

          {/* Step 2 — Client */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Grace Community Church"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client email *</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className={inputCls}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !clientName.trim() || !clientEmail.trim()}
                  className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Client & Continue'}
                </button>
                <button type="button" onClick={skip} className="px-5 py-3 text-gray-500 hover:text-gray-700 font-medium">
                  Skip
                </button>
              </div>
            </form>
          )}

          {/* Step 3 — Project */}
          {step === 3 && (
            <form onSubmit={handleStep3} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project name *</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Website Redesign 2026"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !projectTitle.trim()}
                  className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Project & Continue'}
                </button>
                <button type="button" onClick={skip} className="px-5 py-3 text-gray-500 hover:text-gray-700 font-medium">
                  Skip
                </button>
              </div>
            </form>
          )}

          {/* Step 4 — Invoice */}
          {step === 4 && (
            <form onSubmit={handleStep4} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service description</label>
                <input
                  type="text"
                  value={invoiceDesc}
                  onChange={(e) => setInvoiceDesc(e.target.value)}
                  placeholder="e.g. Website design services"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD) *</label>
                <input
                  type="number"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  className={inputCls}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !invoiceAmount}
                  className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Invoice & Continue'}
                </button>
                <button type="button" onClick={skip} className="px-5 py-3 text-gray-500 hover:text-gray-700 font-medium">
                  Skip
                </button>
              </div>
            </form>
          )}

          {/* Step 5 — Done / Start winning with Surf */}
          {step === 5 && (
            <div className="text-center space-y-6">
              <img
                src="/images/surf-main.png"
                alt="Surf"
                className="w-32 h-32 mx-auto object-contain"
                style={{ filter: 'drop-shadow(0 8px 20px rgba(37,99,235,0.18))' }}
              />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">You're ready to win with Surf</h2>
                <p className="text-gray-600">Your workspace is set up. Surf will help you track deals, tasks, invoices, and projects — and surface what needs your attention.</p>
              </div>
              <button
                onClick={onComplete}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
