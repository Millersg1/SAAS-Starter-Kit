import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dripAPI } from '../services/api';
import sanitizeHtml from '../utils/sanitizeHtml';

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDelay = (days, hours) => {
  if (!days && !hours) return 'Immediately';
  const parts = [];
  if (days) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  return `After ${parts.join(' ')}`;
};

const STEP_STATUS_COLORS = {
  active:   'bg-green-100 text-green-700',
  paused:   'bg-yellow-100 text-yellow-700',
  archived: 'bg-gray-100 text-gray-500',
};

// ── Step Form ────────────────────────────────────────────────────────────────

function StepForm({ step, onSave, onCancel }) {
  const [form, setForm] = useState({
    subject: step?.subject || '',
    html_content: step?.html_content || '',
    delay_days: step?.delay_days ?? 0,
    delay_hours: step?.delay_hours ?? 0,
    from_name: step?.from_name || '',
    from_email: step?.from_email || '',
  });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.subject.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Delay (days)</label>
          <input
            type="number"
            min="0"
            value={form.delay_days}
            onChange={e => set('delay_days', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Delay (hours)</label>
          <input
            type="number"
            min="0"
            max="23"
            value={form.delay_hours}
            onChange={e => set('delay_hours', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <p className="text-xs text-blue-600 font-medium">
        ⏱ Send time: {formatDelay(form.delay_days, form.delay_hours)} {form.delay_days === 0 && form.delay_hours === 0 ? '(first email sent immediately upon enrollment)' : 'after previous step'}
      </p>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Subject Line *</label>
        <input
          type="text"
          value={form.subject}
          onChange={e => set('subject', e.target.value)}
          placeholder="e.g., Here's what you requested, {name}"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-500">Email Body (HTML)</label>
          <button
            onClick={() => setPreview(!preview)}
            className="text-xs text-blue-600 hover:underline"
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>
        {preview ? (
          <div
            className="min-h-48 p-3 border border-gray-200 rounded-lg text-sm bg-white prose max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.html_content || '<p class="text-gray-400">Nothing to preview</p>') }}
          />
        ) : (
          <textarea
            value={form.html_content}
            onChange={e => set('html_content', e.target.value)}
            rows={8}
            placeholder={'<h2>Hi {name},</h2>\n<p>Thanks for signing up...</p>\n<p>Best,<br/>{brand_name}</p>'}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-y"
          />
        )}
        <p className="text-xs text-gray-400 mt-1">
          Merge tags: {'{name}'}, {'{email}'}, {'{brand_name}'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From Name (override)</label>
          <input
            type="text"
            value={form.from_name}
            onChange={e => set('from_name', e.target.value)}
            placeholder="Leave blank to use brand default"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From Email (override)</label>
          <input
            type="email"
            value={form.from_email}
            onChange={e => set('from_email', e.target.value)}
            placeholder="Leave blank to use brand default"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.subject.trim()}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : step?.id ? 'Update Step' : 'Add Step'}
        </button>
      </div>
    </div>
  );
}

// ── Condition Form ──────────────────────────────────────────────────────────

function ConditionForm({ step, steps: allSteps, onSave, onCancel }) {
  const [form, setForm] = useState({
    condition_type: step?.condition_config?.type || 'email_opened',
    check_step: step?.condition_config?.check_step ?? '',
    yes_next_step: step?.yes_next_step ?? '',
    no_next_step: step?.no_next_step ?? '',
  });
  const [saving, setSaving] = useState(false);

  // Only email steps can be checked
  const emailSteps = allSteps.filter(s => (s.step_type || 'email') === 'email');

  const handleSave = async () => {
    if (form.check_step === '') return;
    setSaving(true);
    try {
      await onSave({
        step_type: 'condition',
        subject: `Condition: ${form.condition_type === 'email_opened' ? 'Opened' : 'Clicked'} Step ${form.check_step + 1}`,
        html_content: '',
        delay_days: 0,
        delay_hours: 0,
        condition_config: { type: form.condition_type, check_step: Number(form.check_step) },
        yes_next_step: form.yes_next_step !== '' ? Number(form.yes_next_step) : null,
        no_next_step: form.no_next_step !== '' ? Number(form.no_next_step) : null,
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5 space-y-4">
      <p className="text-sm font-semibold text-indigo-700">Condition Step</p>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Condition Type</label>
        <select
          value={form.condition_type}
          onChange={e => setForm(f => ({ ...f, condition_type: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="email_opened">Email was Opened</option>
          <option value="email_clicked">Email Link was Clicked</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Check which step?</label>
        <select
          value={form.check_step}
          onChange={e => setForm(f => ({ ...f, check_step: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">— Select a step —</option>
          {emailSteps.map((s, i) => (
            <option key={s.id || i} value={s.position ?? i}>
              Step {(s.position ?? i) + 1}: {s.subject}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-green-700 mb-1">IF YES → go to step</label>
          <select
            value={form.yes_next_step}
            onChange={e => setForm(f => ({ ...f, yes_next_step: e.target.value }))}
            className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm bg-green-50"
          >
            <option value="">Next step (default)</option>
            {allSteps.map((s, i) => (
              <option key={s.id || i} value={s.position ?? i}>
                Step {(s.position ?? i) + 1}: {s.subject?.substring(0, 30)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-red-700 mb-1">IF NO → go to step</label>
          <select
            value={form.no_next_step}
            onChange={e => setForm(f => ({ ...f, no_next_step: e.target.value }))}
            className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-red-50"
          >
            <option value="">Next step (default)</option>
            {allSteps.map((s, i) => (
              <option key={s.id || i} value={s.position ?? i}>
                Step {(s.position ?? i) + 1}: {s.subject?.substring(0, 30)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving || form.check_step === ''}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : step?.id ? 'Update Condition' : 'Add Condition'}
        </button>
      </div>
    </div>
  );
}

// ── Enroll Modal ─────────────────────────────────────────────────────────────

function EnrollModal({ onClose, onEnroll }) {
  const [raw, setRaw] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const handleEnroll = async () => {
    const lines = raw.split('\n').filter(l => l.trim());
    const contacts = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return { email: parts[0], name: parts[1] || '' };
    }).filter(c => c.email.includes('@'));

    if (!contacts.length) return;
    setSaving(true);
    try {
      const res = await onEnroll(contacts);
      setResult(res);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Enroll Contacts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {result ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-gray-800">Enrollment complete</p>
              <p className="text-sm text-gray-500 mt-1">
                {result.enrolled} enrolled, {result.skipped} skipped (already enrolled)
              </p>
              <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                Done
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email addresses (one per line)
                </label>
                <textarea
                  value={raw}
                  onChange={e => setRaw(e.target.value)}
                  rows={6}
                  placeholder={"john@example.com, John Smith\njane@example.com\nbob@acme.com, Bob Jones"}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">Format: email, name (name is optional)</p>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                <button
                  onClick={handleEnroll}
                  disabled={saving || !raw.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Enrolling...' : 'Enroll Contacts'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function EmailSequenceEditor() {
  const { sequenceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sequence, setSequence] = useState(null);
  const [steps, setSteps] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingStep, setEditingStep] = useState(null); // stepId or 'new' or 'new-condition'
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [seqName, setSeqName] = useState('');

  const brandId = user?.brand_id;

  useEffect(() => {
    if (!brandId || !sequenceId) return;
    loadAll();
  }, [brandId, sequenceId]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [seqRes, enrollRes] = await Promise.all([
        dripAPI.get(brandId, sequenceId),
        dripAPI.getEnrollments(brandId, sequenceId),
      ]);
      const seq = seqRes.data.sequence;
      setSequence(seq);
      setSeqName(seq.name);
      setSteps(seq.steps || []);
      setStats(seqRes.data.stats);
      setEnrollments(enrollRes.data.enrollments || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sequence');
    } finally {
      setLoading(false);
    }
  };

  const renameSave = async () => {
    setEditingName(false);
    if (!seqName.trim() || seqName === sequence?.name) return;
    await dripAPI.update(brandId, sequenceId, { name: seqName.trim() });
    setSequence(prev => ({ ...prev, name: seqName.trim() }));
  };

  const toggleStatus = async () => {
    const newStatus = sequence.status === 'active' ? 'paused' : 'active';
    await dripAPI.update(brandId, sequenceId, { status: newStatus });
    setSequence(prev => ({ ...prev, status: newStatus }));
  };

  const handleAddStep = async (formData) => {
    const res = await dripAPI.createStep(brandId, sequenceId, formData);
    setSteps(prev => [...prev, res.data.step]);
    setEditingStep(null);
  };

  const handleUpdateStep = async (stepId, formData) => {
    const res = await dripAPI.updateStep(brandId, sequenceId, stepId, formData);
    setSteps(prev => prev.map(s => s.id === stepId ? res.data.step : s));
    setEditingStep(null);
  };

  const handleDeleteStep = async (stepId) => {
    if (!confirm('Delete this email step?')) return;
    await dripAPI.deleteStep(brandId, sequenceId, stepId);
    setSteps(prev => prev.filter(s => s.id !== stepId));
  };

  const handleEnroll = async (contacts) => {
    const res = await dripAPI.enroll(brandId, sequenceId, { contacts });
    await loadAll(); // Refresh enrollments
    return res.data;
  };

  const handleUnenroll = async (enrollmentId) => {
    if (!confirm('Remove this contact from the sequence?')) return;
    await dripAPI.unenroll(brandId, sequenceId, enrollmentId);
    setEnrollments(prev => prev.filter(e => e.id !== enrollmentId));
  };

  const getStepStats = (stepId) => {
    if (!stats?.steps) return null;
    return stats.steps.find(s => s.id === stepId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate('/sequences')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Back to Sequences</button>
        </div>
      </div>
    );
  }

  const statusEnrollments = {
    active: enrollments.filter(e => e.status === 'active').length,
    completed: enrollments.filter(e => e.status === 'completed').length,
    unsubscribed: enrollments.filter(e => e.status === 'unsubscribed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/sequences')} className="text-gray-400 hover:text-gray-600 mr-1">←</button>
        {editingName ? (
          <input
            value={seqName}
            onChange={e => setSeqName(e.target.value)}
            onBlur={renameSave}
            onKeyDown={e => { if (e.key === 'Enter') renameSave(); if (e.key === 'Escape') { setSeqName(sequence.name); setEditingName(false); } }}
            className="text-lg font-bold text-gray-900 border-b border-blue-400 focus:outline-none bg-transparent"
            autoFocus
          />
        ) : (
          <h1
            className="text-lg font-bold text-gray-900 cursor-pointer hover:underline"
            onDoubleClick={() => setEditingName(true)}
            title="Double-click to rename"
          >
            {sequence?.name}
          </h1>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STEP_STATUS_COLORS[sequence?.status] || ''}`}>
          {sequence?.status}
        </span>
        <button
          onClick={toggleStatus}
          className={`ml-2 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
            sequence?.status === 'active'
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {sequence?.status === 'active' ? '⏸ Pause' : '▶ Resume'}
        </button>
      </div>

      <div className="flex gap-0 h-[calc(100vh-73px)]">
        {/* ── Left: Step Builder (60%) ── */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Email Steps ({steps.length})</h2>

          {steps.length === 0 && editingStep !== 'new' && (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center mb-4">
              <div className="text-3xl mb-3">✉️</div>
              <p className="text-sm text-gray-500">No email steps yet. Add your first email below.</p>
            </div>
          )}

          <div className="space-y-3">
            {steps.map((step, idx) => {
              const isCondition = step.step_type === 'condition';
              const stepStat = getStepStats(step.id);
              const openRate = stepStat && stepStat.sent_count > 0
                ? Math.round((stepStat.opened_count / stepStat.sent_count) * 100)
                : 0;

              return (
                <div key={step.id}>
                  {/* Timeline connector */}
                  {idx > 0 && (
                    <div className="flex justify-center my-2">
                      <div className={`w-0.5 h-6 ${isCondition ? 'bg-indigo-200' : 'bg-gray-200'}`} />
                    </div>
                  )}

                  {editingStep === step.id ? (
                    isCondition ? (
                      <ConditionForm
                        step={step}
                        steps={steps}
                        onSave={(data) => handleUpdateStep(step.id, data)}
                        onCancel={() => setEditingStep(null)}
                      />
                    ) : (
                      <StepForm
                        step={step}
                        onSave={(data) => handleUpdateStep(step.id, data)}
                        onCancel={() => setEditingStep(null)}
                      />
                    )
                  ) : isCondition ? (
                    /* Condition step card */
                    <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            ?
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-indigo-800">
                              IF Step {(step.condition_config?.check_step ?? 0) + 1} was {step.condition_config?.type === 'email_clicked' ? 'clicked' : 'opened'}
                            </p>
                            <div className="flex gap-4 mt-1 text-xs">
                              <span className="text-green-600">
                                YES → {step.yes_next_step != null ? `Step ${step.yes_next_step + 1}` : 'Next'}
                              </span>
                              <span className="text-red-500">
                                NO → {step.no_next_step != null ? `Step ${step.no_next_step + 1}` : 'Next'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingStep(step.id)}
                            className="p-1.5 text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded"
                            title="Edit"
                          >✏️</button>
                          <button
                            onClick={() => handleDeleteStep(step.id)}
                            className="p-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                            title="Delete"
                          >🗑</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Normal email step card */
                    <div className="bg-white rounded-xl border border-gray-200 p-4 group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{step.subject}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatDelay(step.delay_days, step.delay_hours)}
                              {stepStat && stepStat.sent_count > 0 && (
                                <span className="ml-2 text-green-600">· {stepStat.sent_count} sent · {openRate}% open rate</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingStep(step.id)}
                            className="p-1.5 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >✏️</button>
                          <button
                            onClick={() => handleDeleteStep(step.id)}
                            className="p-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                            title="Delete"
                          >🗑</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Timeline connector before new */}
            {steps.length > 0 && (editingStep === 'new' || editingStep === 'new-condition') && (
              <div className="flex justify-center my-2">
                <div className="w-0.5 h-6 bg-gray-200" />
              </div>
            )}

            {editingStep === 'new' ? (
              <StepForm
                step={null}
                onSave={handleAddStep}
                onCancel={() => setEditingStep(null)}
              />
            ) : editingStep === 'new-condition' ? (
              <ConditionForm
                step={null}
                steps={steps}
                onSave={handleAddStep}
                onCancel={() => setEditingStep(null)}
              />
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingStep('new')}
                  className="flex-1 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  + Add Email Step
                </button>
                <button
                  onClick={() => setEditingStep('new-condition')}
                  className="flex-1 py-3 border-2 border-dashed border-indigo-200 rounded-xl text-sm text-indigo-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  + Add Condition
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Enrollments (40%) ── */}
        <div className="w-80 xl:w-96 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Enrollments ({enrollments.length})</h2>
            <button
              onClick={() => setShowEnrollModal(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
            >
              + Enroll
            </button>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-0 border-b border-gray-100">
            {[
              { label: 'Active', value: statusEnrollments.active, color: 'text-green-600' },
              { label: 'Done', value: statusEnrollments.completed, color: 'text-blue-600' },
              { label: 'Unsub', value: statusEnrollments.unsubscribed, color: 'text-gray-500' },
            ].map(s => (
              <div key={s.label} className="text-center py-3 border-r border-gray-100 last:border-r-0">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Enrollment list */}
          <div className="flex-1 overflow-y-auto">
            {enrollments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                <p className="text-sm text-gray-400">No enrollments yet.</p>
                <button
                  onClick={() => setShowEnrollModal(true)}
                  className="mt-3 text-xs text-blue-600 hover:underline"
                >
                  Enroll contacts →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {enrollments.map(e => (
                  <div key={e.id} className="px-4 py-3 flex items-center justify-between group hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {e.contact_name || e.contact_email}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {e.contact_name ? e.contact_email : ''}
                        {e.status === 'active' && e.next_send_at && (
                          <span> · Next: Step {e.current_step + 1}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        e.status === 'active' ? 'bg-green-100 text-green-600' :
                        e.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {e.status}
                      </span>
                      {e.status === 'active' && (
                        <button
                          onClick={() => handleUnenroll(e.id)}
                          className="opacity-0 group-hover:opacity-100 text-xs text-gray-300 hover:text-red-400"
                          title="Unenroll"
                        >✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEnrollModal && (
        <EnrollModal
          onClose={() => setShowEnrollModal(false)}
          onEnroll={handleEnroll}
        />
      )}
    </div>
  );
}
