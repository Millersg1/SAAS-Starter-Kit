import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { leadFormAPI } from '../services/api';

const FIELD_TYPES = ['text', 'email', 'phone', 'textarea', 'select'];

const DEFAULT_FIELD = { label: '', type: 'text', required: false, options: '' };

export default function LeadForms() {
  const { activeBrandId } = useAuth();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [form, setForm] = useState({ name: '', thank_you_message: 'Thank you! We will be in touch shortly.', is_active: true, fields: [] });
  const [newField, setNewField] = useState({ ...DEFAULT_FIELD });

  const publicBase = window.location.origin;

  const fetchForms = useCallback(async () => {
    if (!activeBrandId) return;
    setLoading(true);
    try {
      const res = await leadFormAPI.getForms(activeBrandId);
      setForms(res.data.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [activeBrandId]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', thank_you_message: 'Thank you! We will be in touch shortly.', is_active: true, fields: [] });
    setError('');
    setShowModal(true);
  };

  const openEdit = (f) => {
    setEditing(f);
    setForm({ name: f.name, thank_you_message: f.thank_you_message, is_active: f.is_active, fields: f.fields || [] });
    setError('');
    setShowModal(true);
  };

  const addField = () => {
    if (!newField.label) return;
    const field = { ...newField, id: Date.now().toString() };
    if (field.type === 'select' && field.options) {
      field.options = field.options.split(',').map(o => o.trim()).filter(Boolean);
    } else {
      field.options = [];
    }
    setForm(f => ({ ...f, fields: [...f.fields, field] }));
    setNewField({ ...DEFAULT_FIELD });
  };

  const removeField = (id) => {
    setForm(f => ({ ...f, fields: f.fields.filter(field => field.id !== id) }));
  };

  const moveField = (idx, dir) => {
    setForm(f => {
      const fields = [...f.fields];
      const target = idx + dir;
      if (target < 0 || target >= fields.length) return f;
      [fields[idx], fields[target]] = [fields[target], fields[idx]];
      return { ...f, fields };
    });
  };

  const handleSave = async () => {
    if (!form.name) { setError('Form name is required.'); return; }
    if (form.fields.length === 0) { setError('Add at least one field.'); return; }
    setSaving(true); setError('');
    try {
      if (editing) {
        await leadFormAPI.updateForm(activeBrandId, editing.id, form);
      } else {
        await leadFormAPI.createForm(activeBrandId, form);
      }
      setShowModal(false);
      fetchForms();
    } catch (e) { setError(e.response?.data?.message || 'Failed to save form.'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this form? This cannot be undone.')) return;
    try {
      await leadFormAPI.deleteForm(activeBrandId, id);
      fetchForms();
    } catch { /* silent */ }
  };

  const copyLink = (slug) => {
    navigator.clipboard.writeText(`${publicBase}/f/${slug}`).then(() => {
      setCopied(slug);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Forms</h1>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">+ New Form</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : forms.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📥</div>
          <p className="text-gray-500 dark:text-gray-400">No lead forms yet. Create one to embed on your website.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map(f => (
            <div key={f.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{f.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{(f.fields || []).length} field{(f.fields || []).length !== 1 ? 's' : ''}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${f.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{f.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex gap-2 mb-3">
                <button onClick={() => copyLink(f.slug)} className={`flex-1 text-xs py-1.5 rounded border ${copied === f.slug ? 'border-green-500 text-green-600' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'} hover:bg-gray-50 dark:hover:bg-gray-700`}>
                  {copied === f.slug ? '✓ Copied!' : '🔗 Copy Link'}
                </button>
                <button onClick={() => openEdit(f)} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Edit</button>
                <button onClick={() => handleDelete(f.id)} className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50">Del</button>
              </div>
              <Link to={`/lead-forms/${f.id}/submissions`} className="text-xs text-blue-600 hover:underline">View Submissions →</Link>
            </div>
          ))}
        </div>
      )}

      {/* Form Builder Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">{editing ? 'Edit Form' : 'New Lead Form'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded p-2">{error}</div>}
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Form name *" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              <input value={form.thank_you_message} onChange={e => setForm(f => ({ ...f, thank_you_message: e.target.value }))} placeholder="Thank you message" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                Active (publicly accessible)
              </label>

              {/* Existing fields */}
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2 text-sm">Form Fields</h4>
                {form.fields.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No fields yet. Add one below.</p>
                ) : (
                  <div className="space-y-2">
                    {form.fields.map((field, idx) => (
                      <div key={field.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2.5">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{field.label}</span>
                          <span className="text-xs text-gray-400 ml-2">{field.type}{field.required ? ' *' : ''}</span>
                        </div>
                        <button onClick={() => moveField(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">↑</button>
                        <button onClick={() => moveField(idx, 1)} disabled={idx === form.fields.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">↓</button>
                        <button onClick={() => removeField(field.id)} className="text-red-400 hover:text-red-600">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add field */}
              <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Add Field</h5>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input value={newField.label} onChange={e => setNewField(f => ({ ...f, label: e.target.value }))} placeholder="Field label" className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-700 dark:text-white" />
                  <select value={newField.type} onChange={e => setNewField(f => ({ ...f, type: e.target.value }))} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-700 dark:text-white">
                    {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {newField.type === 'select' && (
                  <input value={newField.options} onChange={e => setNewField(f => ({ ...f, options: e.target.value }))} placeholder="Options (comma-separated)" className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-700 dark:text-white mb-2" />
                )}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={newField.required} onChange={e => setNewField(f => ({ ...f, required: e.target.checked }))} className="rounded" />
                    Required
                  </label>
                  <button onClick={addField} disabled={!newField.label} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">+ Add</button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:text-gray-300">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Form'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
