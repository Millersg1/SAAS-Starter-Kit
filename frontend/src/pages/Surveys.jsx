import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { brandAPI, clientAPI, surveyAPI } from '../services/api';

const TRIGGER_LABELS = {
  manual: 'Manual only',
  project_complete: 'After project completed',
  invoice_paid: 'After invoice paid',
};

const npsColor = (score) => {
  if (score >= 50) return 'text-green-600';
  if (score >= 0)  return 'text-blue-600';
  return 'text-red-500';
};

const scoreBadgeClass = (score, type) => {
  if (type === 'csat') {
    if (score >= 4) return 'bg-green-100 text-green-700';
    if (score >= 3) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  }
  if (score >= 9) return 'bg-green-100 text-green-700';
  if (score >= 7) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

const EMPTY_FORM = { name: '', type: 'nps', question: '', send_trigger: 'manual', delay_days: 1 };

export default function Surveys() {
  const [brandId, setBrandId]           = useState(null);
  const [surveys, setSurveys]           = useState([]);
  const [selected, setSelected]         = useState(null);
  const [responses, setResponses]       = useState([]);
  const [stats, setStats]               = useState(null);
  const [clients, setClients]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [showSend, setShowSend]         = useState(false);
  const [sendClientId, setSendClientId] = useState('');
  const [sending, setSending]           = useState(false);

  useEffect(() => {
    brandAPI.getUserBrands().then(res => {
      const brands = res.data.data?.brands || [];
      if (brands.length > 0) setBrandId(brands[0].id);
    });
  }, []);

  useEffect(() => {
    if (!brandId) return;
    loadSurveys();
    clientAPI.getBrandClients(brandId).then(r => setClients(r.data.data?.clients || []));
  }, [brandId]);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const res = await surveyAPI.list(brandId);
      const list = res.data.data?.surveys || [];
      setSurveys(list);
      if (list.length > 0 && !selected) selectSurvey(list[0]);
    } finally {
      setLoading(false);
    }
  };

  const selectSurvey = async (survey) => {
    setSelected(survey);
    setResponses([]);
    setStats(null);
    const [respRes, statsRes] = await Promise.all([
      surveyAPI.responses(brandId, survey.id),
      surveyAPI.stats(brandId, survey.id),
    ]);
    setResponses(respRes.data.data?.responses || []);
    setStats(statsRes.data.data || null);
  };

  const openNew = () => {
    setEditingSurvey(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditingSurvey(s);
    setForm({ name: s.name, type: s.type, question: s.question, send_trigger: s.send_trigger, delay_days: s.delay_days });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.question.trim()) return;
    setSaving(true);
    try {
      if (editingSurvey) {
        await surveyAPI.update(brandId, editingSurvey.id, form);
      } else {
        await surveyAPI.create(brandId, form);
      }
      setShowForm(false);
      await loadSurveys();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (s) => {
    await surveyAPI.update(brandId, s.id, { is_active: !s.is_active });
    await loadSurveys();
  };

  const handleDelete = async (s) => {
    if (!confirm(`Delete "${s.name}"?`)) return;
    await surveyAPI.remove(brandId, s.id);
    if (selected?.id === s.id) setSelected(null);
    await loadSurveys();
  };

  const handleSend = async () => {
    if (!sendClientId || !selected) return;
    setSending(true);
    try {
      await surveyAPI.send(brandId, selected.id, { client_id: sendClientId });
      setShowSend(false);
      setSendClientId('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Surveys</h1>
            <p className="text-sm text-gray-500 mt-1">NPS & CSAT surveys to measure client satisfaction</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + New Survey
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No surveys yet</h3>
            <p className="text-gray-500 text-sm mb-6">Create your first NPS or CSAT survey to start collecting feedback</p>
            <button onClick={openNew} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
              Create Survey
            </button>
          </div>
        ) : (
          <div className="flex gap-6 flex-1 min-h-0">
            {/* Survey List */}
            <div className="w-72 flex-shrink-0 space-y-2 overflow-y-auto">
              {surveys.map(s => (
                <div
                  key={s.id}
                  onClick={() => selectSurvey(s)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selected?.id === s.id
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800 leading-tight">{s.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${s.type === 'nps' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {s.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{s.question}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{s.response_count || 0} responses</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(s); }}
                        className="text-gray-400 hover:text-blue-600 text-xs p-0.5"
                      >✏️</button>
                      <button
                        onClick={e => { e.stopPropagation(); handleToggle(s); }}
                        className={`text-xs px-1.5 py-0.5 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {s.is_active ? 'Active' : 'Off'}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(s); }}
                        className="text-gray-400 hover:text-red-500 text-xs p-0.5"
                      >🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Survey Detail */}
            {selected ? (
              <div className="flex-1 overflow-y-auto space-y-5">
                {/* Stats Row */}
                {stats && (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                      <p className={`text-2xl font-bold ${npsColor(stats.nps_score)}`}>{stats.nps_score}</p>
                      <p className="text-xs text-gray-500 mt-1">NPS Score</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                      <p className="text-2xl font-bold text-gray-800">{stats.avg_score || '—'}</p>
                      <p className="text-xs text-gray-500 mt-1">Avg Score</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                      <p className="text-2xl font-bold text-gray-800">{stats.total_responses}</p>
                      <p className="text-xs text-gray-500 mt-1">Responses</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                      <p className="text-2xl font-bold text-gray-800">{stats.response_rate}%</p>
                      <p className="text-xs text-gray-500 mt-1">Response Rate</p>
                    </div>
                  </div>
                )}

                {/* NPS Distribution */}
                {stats && stats.total_responses > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Score Distribution</h3>
                    <div className="flex rounded-full overflow-hidden h-4 mb-3">
                      {stats.detractors > 0 && (
                        <div
                          className="bg-red-400"
                          style={{ width: `${(stats.detractors / stats.total_responses) * 100}%` }}
                          title={`Detractors: ${stats.detractors}`}
                        />
                      )}
                      {stats.passives > 0 && (
                        <div
                          className="bg-yellow-400"
                          style={{ width: `${(stats.passives / stats.total_responses) * 100}%` }}
                          title={`Passives: ${stats.passives}`}
                        />
                      )}
                      {stats.promoters > 0 && (
                        <div
                          className="bg-green-400"
                          style={{ width: `${(stats.promoters / stats.total_responses) * 100}%` }}
                          title={`Promoters: ${stats.promoters}`}
                        />
                      )}
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Detractors (0–6): {stats.detractors}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Passives (7–8): {stats.passives}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Promoters (9–10): {stats.promoters}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">{selected.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{TRIGGER_LABELS[selected.send_trigger] || selected.send_trigger}</span>
                  </div>
                  <button
                    onClick={() => { setSendClientId(''); setShowSend(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Send to Client
                  </button>
                </div>

                {/* Responses Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700">Responses</h3>
                  </div>
                  {responses.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">No responses yet</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <th className="px-5 py-2 text-left">Client</th>
                          <th className="px-5 py-2 text-center">Score</th>
                          <th className="px-5 py-2 text-left">Comment</th>
                          <th className="px-5 py-2 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {responses.map(r => (
                          <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-5 py-3 font-medium text-gray-800">
                              {r.client_name || 'Anonymous'}
                              {r.client_company && <span className="block text-xs text-gray-400">{r.client_company}</span>}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${scoreBadgeClass(r.score, selected.type)}`}>
                                {r.score}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-gray-500 text-xs">{r.comment || '—'}</td>
                            <td className="px-5 py-3 text-right text-gray-400 text-xs">
                              {new Date(r.responded_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Select a survey to view details
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editingSurvey ? 'Edit Survey' : 'New Survey'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Survey Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Post-project NPS"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="nps">NPS (0–10 scale)</option>
                  <option value="csat">CSAT (1–5 scale)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <textarea
                  value={form.question}
                  onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="How likely are you to recommend us to a friend or colleague?"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auto-send Trigger</label>
                <select
                  value={form.send_trigger}
                  onChange={e => setForm(f => ({ ...f, send_trigger: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manual">Manual only</option>
                  <option value="project_complete">After project completed</option>
                  <option value="invoice_paid">After invoice paid</option>
                </select>
              </div>
              {form.send_trigger !== 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delay (days after trigger)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={form.delay_days}
                    onChange={e => setForm(f => ({ ...f, delay_days: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving…' : editingSurvey ? 'Save Changes' : 'Create Survey'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send to Client Modal */}
      {showSend && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Send Survey</h2>
              <button onClick={() => setShowSend(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">Send <strong>{selected.name}</strong> to a client via email.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Client</label>
                <select
                  value={sendClientId}
                  onChange={e => setSendClientId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Choose a client —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowSend(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={!sendClientId || sending}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Send Survey'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
