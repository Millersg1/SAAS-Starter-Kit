import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { leadFormAPI } from '../services/api';

export default function PublicLeadForm() {
  const { slug } = useParams();
  const [formDef, setFormDef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    leadFormAPI.getPublicForm(slug)
      .then(res => {
        setFormDef(res.data.data);
        const initial = {};
        (res.data.data.fields || []).forEach(f => { initial[f.label] = ''; });
        setValues(initial);
      })
      .catch(() => setError('Form not found or no longer active.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate required fields
    const missing = (formDef?.fields || []).filter(f => f.required && !values[f.label]?.trim());
    if (missing.length > 0) { setError(`Please fill in: ${missing.map(f => f.label).join(', ')}`); return; }
    setSubmitting(true); setError('');
    try {
      await leadFormAPI.submitForm(slug, { data: values });
      setSubmitted(true);
    } catch (e) { setError(e.response?.data?.message || 'Failed to submit. Please try again.'); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Loading…</div></div>;
  if (error && !formDef) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">😕</div>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );
  if (!formDef) return null;

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Form Submitted!</h2>
        <p className="text-gray-600">{formDef.thank_you_message}</p>
      </div>
    </div>
  );

  const renderField = (field) => {
    const key = field.label;
    const common = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
    switch (field.type) {
      case 'textarea':
        return <textarea key={key} value={values[key] || ''} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} rows={4} className={`${common} resize-none`} />;
      case 'select':
        return (
          <select key={key} value={values[key] || ''} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} className={common}>
            <option value="">Select…</option>
            {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      default:
        return <input key={key} type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'} value={values[key] || ''} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} className={common} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{formDef.name}</h1>
          {error && <div className="text-red-600 text-sm bg-red-50 rounded p-3 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {(formDef.fields || []).map(field => (
              <div key={field.label}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {renderField(field)}
              </div>
            ))}
            <button type="submit" disabled={submitting} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium mt-2 disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
