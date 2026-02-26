import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { workflowAPI } from '../services/api';

const TRIGGER_TYPES = [
  { value: 'lead_submitted', label: 'Lead form submitted' },
  { value: 'client_created', label: 'New client added' },
  { value: 'booking_made', label: 'Booking confirmed' },
  { value: 'manual', label: 'Manual (triggered via API)' },
];

const STEP_TYPES = [
  { value: 'send_email', label: 'Send Email' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'send_sms', label: 'Send SMS' },
  { value: 'wait', label: 'Wait (delay only)' },
];

const EMPTY_STEP = { step_type: 'send_email', delay_minutes: 0, step_config: { subject: '', body: '' } };

export default function Automations() {
  const { activeBrandId } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', trigger_type: 'lead_submitted', is_active: true, steps: [] });

  const fetchWorkflows = useCallback(async () => {
    if (!activeBrandId) return;
    setLoading(true);
    try {
      const res = await workflowAPI.list(activeBrandId);
      setWorkflows(res.data.data.workflows || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [activeBrandId]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', trigger_type: 'lead_submitted', is_active: true, steps: [] });
    setError('');
    setShowModal(true);
  };

  const openEdit = async (wf) => {
    setEditingId(wf.id);
    try {
      const res = await workflowAPI.get(activeBrandId, wf.id);
      const w = res.data.data.workflow;
      setForm({ name: w.name, trigger_type: w.trigger_type, is_active: w.is_active, steps: w.steps || [] });
    } catch { setForm({ name: wf.name, trigger_type: wf.trigger_type, is_active: wf.is_active, steps: [] }); }
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.trigger_type) { setError('Name and trigger are required.'); return; }
    setSaving(true); setError('');
    try {
      if (editingId) {
        await workflowAPI.update(activeBrandId, editingId, form);
      } else {
        await workflowAPI.create(activeBrandId, form);
      }
      setShowModal(false);
      fetchWorkflows();
    } catch (e) { setError(e.response?.data?.message || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this workflow?')) return;
    try { await workflowAPI.remove(activeBrandId, id); fetchWorkflows(); }
    catch { /* silent */ }
  };

  const handleToggle = async (wf) => {
    try {
      await workflowAPI.update(activeBrandId, wf.id, { is_active: !wf.is_active });
      fetchWorkflows();
    } catch { /* silent */ }
  };

  const addStep = () => {
    setForm(f => ({ ...f, steps: [...f.steps, { ...EMPTY_STEP, step_config: { subject: '', body: '' } }] }));
  };

  const removeStep = (idx) => {
    setForm(f => ({ ...f, steps: f.steps.filter((_, i) => i !== idx) }));
  };

  const updateStep = (idx, changes) => {
    setForm(f => {
      const steps = [...f.steps];
      steps[idx] = { ...steps[idx], ...changes };
      return { ...f, steps };
    });
  };

  const updateStepConfig = (idx, key, value) => {
    setForm(f => {
      const steps = [...f.steps];
      steps[idx] = { ...steps[idx], step_config: { ...steps[idx].step_config, [key]: value } };
      return { ...f, steps };
    });
  };

  const renderStepConfig = (step, idx) => {
    switch (step.step_type) {
      case 'send_email':
        return (
          <div className="space-y-2 mt-2">
            <input value={step.step_config?.subject || ''} onChange={e => updateStepConfig(idx, 'subject', e.target.value)} placeholder="Email subject" className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white" />
            <textarea value={step.step_config?.body || ''} onChange={e => updateStepConfig(idx, 'body', e.target.value)} placeholder="Email body" rows={3} className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white resize-none" />
          </div>
        );
      case 'create_task':
        return (
          <div className="space-y-2 mt-2">
            <input value={step.step_config?.title || ''} onChange={e => updateStepConfig(idx, 'title', e.target.value)} placeholder="Task title" className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white" />
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">Due in</span>
              <input type="number" min="1" value={step.step_config?.due_days || 1} onChange={e => updateStepConfig(idx, 'due_days', e.target.value)} className="w-16 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white" />
              <span className="text-xs text-gray-500 dark:text-gray-400">days</span>
            </div>
          </div>
        );
      case 'send_sms':
        return (
          <div className="mt-2">
            <textarea value={step.step_config?.message || ''} onChange={e => updateStepConfig(idx, 'message', e.target.value)} placeholder="SMS message" rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white resize-none" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Trigger email, SMS, and task sequences automatically.</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">+ New Workflow</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">⚡</div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">No workflows yet. Create one to automate follow-ups.</p>
          <button onClick={openCreate} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm">Create First Workflow</button>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map(wf => (
            <div key={wf.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">{wf.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${wf.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {wf.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Trigger: {TRIGGER_TYPES.find(t => t.value === wf.trigger_type)?.label || wf.trigger_type}
                  {' · '}
                  {wf.active_enrollments || 0} active enrollments
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(wf)} className={`text-xs px-3 py-1.5 rounded-lg border ${wf.is_active ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-700 dark:text-yellow-300' : 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300'}`}>
                  {wf.is_active ? 'Pause' : 'Activate'}
                </button>
                <button onClick={() => openEdit(wf)} className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Edit</button>
                <button onClick={() => handleDelete(wf.id)} className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">{editingId ? 'Edit Workflow' : 'New Workflow'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded p-2">{error}</div>}

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Workflow Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Lead Follow-up Sequence" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Trigger *</label>
                <select value={form.trigger_type} onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                  {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Steps ({form.steps.length})</label>
                  <button onClick={addStep} className="text-xs text-blue-600 hover:underline">+ Add Step</button>
                </div>
                {form.steps.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center text-sm text-gray-500">
                    No steps yet. Add a step to define what happens.
                  </div>
                )}
                {form.steps.map((step, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-5">{idx + 1}.</span>
                      <select value={step.step_type} onChange={e => updateStep(idx, { step_type: e.target.value, step_config: {} })} className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white">
                        {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">Delay:</span>
                        <input type="number" min="0" value={step.delay_minutes} onChange={e => updateStep(idx, { delay_minutes: parseInt(e.target.value) || 0 })} className="w-14 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white" />
                        <span className="text-xs text-gray-400">min</span>
                      </div>
                      <button onClick={() => removeStep(idx)} className="text-red-400 hover:text-red-600 text-xs ml-1">✕</button>
                    </div>
                    {renderStepConfig(step, idx)}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:text-gray-300">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
