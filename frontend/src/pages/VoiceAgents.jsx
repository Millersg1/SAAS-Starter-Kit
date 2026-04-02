import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { voiceAgentAPI, brandAPI } from '../services/api';
import api from '../services/api';
import { toast } from 'sonner';

const VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'];

const EMPTY_AGENT = {
  name: '', personality: 'You are a friendly and professional AI phone assistant for our business.',
  greeting: 'Hello! Thanks for calling. How can I help you today?',
  voice: 'alloy', language: 'en', transfer_phone: '', phone_number: '',
  max_duration_seconds: 600, knowledge_base: [], tools_config: [],
};

const EMPTY_KB = { question: '', answer: '' };

const SURF_VOICE_DEFAULTS = {
  enabled: false,
  voice_style: 'friendly',
  inbound_calls: false,
  lead_followup_calls: false,
  invoice_reminder_calls: false,
  appointment_confirmation_calls: false,
  business_hours_open: '09:00',
  business_hours_close: '17:00',
  after_hours_behavior: 'voicemail',
  transfer_phone: '',
};

/* ─── Surf Voice Section ─── */
function SurfVoiceSection({ selectedBrand }) {
  const [settings, setSettings] = useState(SURF_VOICE_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!selectedBrand) return;
    setLoading(true);
    api.get(`/api/surf/${selectedBrand.id}/voice/settings`)
      .then(r => {
        const data = r.data.data || r.data;
        setSettings(prev => ({ ...prev, ...data }));
      })
      .catch(() => { /* use defaults */ })
      .finally(() => setLoading(false));
  }, [selectedBrand]);

  const patchSettings = async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    try {
      await api.patch(`/api/surf/${selectedBrand.id}/voice/settings`, next);
      toast.success('Surf Voice settings saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save settings');
    }
    setSaving(false);
  };

  const handleTestCall = async () => {
    if (!settings.transfer_phone) {
      toast.error('Enter a fallback phone number first');
      return;
    }
    setTesting(true);
    try {
      await api.post(`/api/surf/${selectedBrand.id}/voice/test-call`);
      toast.success('Test call initiated! Your phone should ring shortly.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to start test call');
    }
    setTesting(false);
  };

  if (loading) {
    return (
      <div className="mb-8 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 p-6">
        <div className="text-center py-6 text-gray-400">Loading Surf Voice settings...</div>
      </div>
    );
  }

  return (
    <div className="mb-8 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer select-none"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            SV
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Surf Voice
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                settings.enabled
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                Voice: {settings.enabled ? 'ON' : 'OFF'}
              </span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Automated call handling powered by Surf</p>
          </div>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-5">
          {/* ── Voice Settings ── */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Voice Settings</h3>
            <div className="flex flex-wrap items-center gap-6">
              {/* Enable toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-sm text-gray-600 dark:text-gray-400">Enable Surf Voice</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.enabled}
                  onClick={() => patchSettings({ enabled: !settings.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </label>

              {/* Voice style */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Voice Style</label>
                <select
                  value={settings.voice_style}
                  onChange={e => patchSettings({ voice_style: e.target.value })}
                  className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                >
                  <option value="calm">Calm</option>
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Call Flows ── */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Call Flows</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'inbound_calls', label: 'Inbound calls' },
                { key: 'lead_followup_calls', label: 'Lead follow-up calls' },
                { key: 'invoice_reminder_calls', label: 'Invoice reminder calls' },
                { key: 'appointment_confirmation_calls', label: 'Appointment confirmation calls' },
              ].map(flow => (
                <label key={flow.key} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/40 rounded-lg px-4 py-3 cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{flow.label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings[flow.key]}
                    onClick={() => patchSettings({ [flow.key]: !settings[flow.key] })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings[flow.key] ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      settings[flow.key] ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </label>
              ))}
            </div>
          </div>

          {/* ── Business Hours & Transfer ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Business Hours */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Business Hours</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Open</label>
                  <input
                    type="text"
                    value={settings.business_hours_open}
                    onChange={e => setSettings(s => ({ ...s, business_hours_open: e.target.value }))}
                    onBlur={() => patchSettings({ business_hours_open: settings.business_hours_open })}
                    placeholder="09:00"
                    className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <span className="text-gray-400 pt-5">to</span>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Close</label>
                  <input
                    type="text"
                    value={settings.business_hours_close}
                    onChange={e => setSettings(s => ({ ...s, business_hours_close: e.target.value }))}
                    onBlur={() => patchSettings({ business_hours_close: settings.business_hours_close })}
                    placeholder="17:00"
                    className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">After-hours behavior</label>
                <select
                  value={settings.after_hours_behavior}
                  onChange={e => patchSettings({ after_hours_behavior: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                >
                  <option value="voicemail">Voicemail</option>
                  <option value="text_followup">Text follow-up</option>
                  <option value="schedule_callback">Schedule callback</option>
                </select>
              </div>
            </div>

            {/* Transfer Rules */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Transfer Rules</h3>
              <div className="mb-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Human fallback phone number</label>
                <input
                  type="text"
                  value={settings.transfer_phone}
                  onChange={e => setSettings(s => ({ ...s, transfer_phone: e.target.value }))}
                  onBlur={() => patchSettings({ transfer_phone: settings.transfer_phone })}
                  placeholder="+1 (555) 123-4567"
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                />
              </div>

              {/* Test Call Button */}
              <button
                onClick={handleTestCall}
                disabled={testing || !settings.enabled}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {testing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Calling...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call my phone with Surf
                  </>
                )}
              </button>
              {!settings.enabled && (
                <p className="text-xs text-gray-400 mt-2 text-center">Enable Surf Voice above to test</p>
              )}
            </div>
          </div>

          {saving && (
            <div className="text-xs text-indigo-500 dark:text-indigo-400 text-right">Saving...</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function VoiceAgents() {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [agents, setAgents] = useState([]);
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeCalls, setActiveCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('agents'); // agents | calls | live
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [form, setForm] = useState(EMPTY_AGENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedCall, setExpandedCall] = useState(null);
  const [callPage, setCallPage] = useState(1);
  const [callTotal, setCallTotal] = useState(0);

  useEffect(() => {
    brandAPI.getUserBrands().then(r => {
      const b = r.data.data?.brands || [];
      setBrands(b);
      if (b.length) setSelectedBrand(b[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedBrand) { fetchAgents(); fetchStats(); }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedBrand && tab === 'calls') fetchCalls();
    if (selectedBrand && tab === 'live') fetchActiveCalls();
  }, [selectedBrand, tab, callPage]);

  // Poll active calls every 5s when on live tab
  useEffect(() => {
    if (tab !== 'live' || !selectedBrand) return;
    const id = setInterval(fetchActiveCalls, 5000);
    return () => clearInterval(id);
  }, [tab, selectedBrand]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const r = await voiceAgentAPI.listAgents(selectedBrand.id);
      setAgents(r.data.data?.agents || []);
    } catch { setAgents([]); }
    setLoading(false);
  };

  const fetchCalls = async () => {
    try {
      const r = await voiceAgentAPI.listCalls(selectedBrand.id, { page: callPage, limit: 20 });
      setCalls(r.data.data?.calls || []);
      setCallTotal(r.data.data?.total || 0);
    } catch { setCalls([]); }
  };

  const fetchActiveCalls = useCallback(async () => {
    try {
      const r = await voiceAgentAPI.getActiveCalls(selectedBrand.id);
      setActiveCalls(r.data.data?.activeCalls || []);
    } catch { setActiveCalls([]); }
  }, [selectedBrand]);

  const fetchStats = async () => {
    try {
      const r = await voiceAgentAPI.getStats(selectedBrand.id);
      setStats(r.data.data?.stats || null);
    } catch { setStats(null); }
  };

  const openCreate = () => { setEditingAgent(null); setForm(EMPTY_AGENT); setError(''); setShowModal(true); };
  const openEdit = (agent) => {
    setEditingAgent(agent);
    setForm({
      name: agent.name, personality: agent.personality, greeting: agent.greeting,
      voice: agent.voice || 'alloy', language: agent.language || 'en',
      transfer_phone: agent.transfer_phone || '', phone_number: agent.phone_number || '',
      max_duration_seconds: agent.max_duration_seconds || 600,
      knowledge_base: agent.knowledge_base || [], tools_config: agent.tools_config || [],
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Agent name is required'); return; }
    setSaving(true); setError('');
    try {
      if (editingAgent) {
        await voiceAgentAPI.updateAgent(selectedBrand.id, editingAgent.id, form);
      } else {
        await voiceAgentAPI.createAgent(selectedBrand.id, form);
      }
      setShowModal(false);
      fetchAgents();
    } catch (e) { setError(e.response?.data?.message || 'Failed to save agent'); }
    setSaving(false);
  };

  const handleDelete = async (agent) => {
    if (!confirm(`Delete voice agent "${agent.name}"? This will also delete all call history.`)) return;
    try {
      await voiceAgentAPI.deleteAgent(selectedBrand.id, agent.id);
      fetchAgents();
    } catch { /* ignore */ }
  };

  const toggleActive = async (agent) => {
    try {
      await voiceAgentAPI.updateAgent(selectedBrand.id, agent.id, { is_active: !agent.is_active });
      fetchAgents();
    } catch { /* ignore */ }
  };

  const addKbItem = () => setForm(f => ({ ...f, knowledge_base: [...f.knowledge_base, { ...EMPTY_KB }] }));
  const removeKbItem = (i) => setForm(f => ({ ...f, knowledge_base: f.knowledge_base.filter((_, j) => j !== i) }));
  const updateKbItem = (i, field, val) => setForm(f => {
    const kb = [...f.knowledge_base];
    kb[i] = { ...kb[i], [field]: val };
    return { ...f, knowledge_base: kb };
  });

  const fmtDuration = (s) => {
    if (!s) return '0s';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—';

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Voice Agents</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">AI-powered phone agents that handle calls autonomously</p>
          </div>
          <div className="flex items-center gap-3">
            {brands.length > 1 && (
              <select value={selectedBrand?.id || ''} onChange={e => setSelectedBrand(brands.find(b => b.id === e.target.value))}
                className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + New Agent
            </button>
          </div>
        </div>

        {/* Surf Voice Section — always shown at top when brand is selected */}
        {selectedBrand && <SurfVoiceSection selectedBrand={selectedBrand} />}

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total Calls', value: stats.total_calls || 0 },
              { label: 'Today', value: stats.calls_today || 0 },
              { label: 'Avg Duration', value: fmtDuration(parseInt(stats.avg_duration) || 0) },
              { label: 'Leads Captured', value: stats.leads_captured || 0 },
              { label: 'Positive', value: `${stats.positive_calls || 0}/${stats.total_calls || 0}` },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {[
            { id: 'agents', label: 'Agents', count: agents.length },
            { id: 'calls', label: 'Call History', count: callTotal },
            { id: 'live', label: 'Live Calls', count: activeCalls.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {t.label} {t.count > 0 && <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded-full">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Agents Tab */}
        {tab === 'agents' && (
          <div>
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading agents...</div>
            ) : agents.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                <div className="text-5xl mb-4">🎙️</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Voice Agents Yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
                  Create an AI voice agent to handle your inbound and outbound phone calls automatically.
                </p>
                <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
                  Create Your First Agent
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {agents.map(agent => (
                  <div key={agent.id} className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${agent.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          🎙️
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${agent.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                            {agent.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{agent.greeting}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                      <span>Voice: {agent.voice || 'alloy'}</span>
                      <span>Calls: {agent.total_calls || 0}</span>
                      {agent.phone_number && <span>{agent.phone_number}</span>}
                    </div>

                    {agent.knowledge_base?.length > 0 && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                        {agent.knowledge_base.length} knowledge base items
                      </div>
                    )}

                    <div className="flex gap-2 border-t dark:border-gray-700 pt-3">
                      <button onClick={() => openEdit(agent)} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">Edit</button>
                      <button onClick={() => toggleActive(agent)} className="text-sm text-yellow-600 hover:text-yellow-700 dark:text-yellow-400">
                        {agent.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => handleDelete(agent)} className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 ml-auto">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Call History Tab */}
        {tab === 'calls' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
            {calls.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No call history yet. Calls handled by voice agents will appear here.</div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Agent</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Caller</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Direction</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Duration</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Sentiment</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {calls.map(call => (
                      <>
                        <tr key={call.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                          onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{call.agent_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{call.caller_phone || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${call.direction === 'inbound' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                              {call.direction}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmtDuration(call.duration_seconds)}</td>
                          <td className="px-4 py-3">
                            {call.sentiment && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                call.sentiment === 'positive' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                call.sentiment === 'negative' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                              }`}>{call.sentiment}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {(call.actions_taken || []).length > 0 ? `${call.actions_taken.length} actions` : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{fmtDate(call.started_at)}</td>
                        </tr>
                        {expandedCall === call.id && (
                          <tr key={`${call.id}-detail`}>
                            <td colSpan={7} className="px-4 py-4 bg-gray-50 dark:bg-gray-900/30">
                              {call.summary && (
                                <div className="mb-3">
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Summary</div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">{call.summary}</p>
                                </div>
                              )}
                              {call.transcript?.length > 0 && (
                                <div className="mb-3">
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Transcript</div>
                                  <div className="space-y-1 max-h-60 overflow-y-auto">
                                    {call.transcript.map((t, i) => (
                                      <div key={i} className={`text-sm px-3 py-1.5 rounded ${
                                        t.role === 'user' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                      }`}>
                                        <span className="font-medium text-xs">{t.role === 'user' ? 'Caller' : 'Agent'}:</span> {t.text}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {call.actions_taken?.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Actions Taken</div>
                                  <div className="flex flex-wrap gap-2">
                                    {call.actions_taken.map((a, i) => (
                                      <span key={i} className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-1 rounded">
                                        {a.tool}: {JSON.stringify(a.args).slice(0, 80)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {call.lead_captured && (
                                <div className="mt-2">
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lead Captured</div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">{JSON.stringify(call.lead_captured)}</p>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
                {callTotal > 20 && (
                  <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
                    <span className="text-sm text-gray-500">{callTotal} total calls</span>
                    <div className="flex gap-2">
                      <button onClick={() => setCallPage(p => Math.max(1, p - 1))} disabled={callPage <= 1}
                        className="px-3 py-1 rounded border text-sm disabled:opacity-50 dark:border-gray-600 dark:text-gray-300">Prev</button>
                      <button onClick={() => setCallPage(p => p + 1)} disabled={calls.length < 20}
                        className="px-3 py-1 rounded border text-sm disabled:opacity-50 dark:border-gray-600 dark:text-gray-300">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Live Calls Tab */}
        {tab === 'live' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
            {activeCalls.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📡</div>
                <p className="text-gray-500 dark:text-gray-400">No active calls right now. This updates automatically every 5 seconds.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeCalls.map((call, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{call.agentName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{call.callerPhone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{fmtDuration(call.duration)}</span>
                      <span className="text-gray-500 dark:text-gray-400">{call.transcriptLength} exchanges</span>
                      {call.actionsTaken > 0 && (
                        <span className="text-purple-600 dark:text-purple-400">{call.actionsTaken} actions</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Agent Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingAgent ? 'Edit Voice Agent' : 'Create Voice Agent'}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{error}</div>}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Sales Agent, Support Bot"
                    className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                </div>

                {/* Voice & Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Voice</label>
                    <select value={form.voice} onChange={e => setForm(f => ({ ...f, voice: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white">
                      {VOICES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                    <input type="text" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                      placeholder="+1234567890 (from Twilio)"
                      className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                  </div>
                </div>

                {/* Transfer & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transfer Number</label>
                    <input type="text" value={form.transfer_phone} onChange={e => setForm(f => ({ ...f, transfer_phone: e.target.value }))}
                      placeholder="Human fallback number"
                      className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Duration (sec)</label>
                    <input type="number" value={form.max_duration_seconds} onChange={e => setForm(f => ({ ...f, max_duration_seconds: parseInt(e.target.value) || 600 }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                  </div>
                </div>

                {/* Greeting */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Greeting Message</label>
                  <textarea value={form.greeting} onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))} rows={2}
                    placeholder="What the agent says when answering..."
                    className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                </div>

                {/* Personality */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent Personality / Instructions</label>
                  <textarea value={form.personality} onChange={e => setForm(f => ({ ...f, personality: e.target.value }))} rows={4}
                    placeholder="Describe how the agent should behave, what it knows, its tone..."
                    className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                </div>

                {/* Knowledge Base */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Knowledge Base (FAQ)</label>
                    <button onClick={addKbItem} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">+ Add Item</button>
                  </div>
                  {form.knowledge_base.length === 0 ? (
                    <p className="text-xs text-gray-400">No knowledge base items. Add Q&A pairs so the agent can answer common questions.</p>
                  ) : (
                    <div className="space-y-3">
                      {form.knowledge_base.map((item, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 relative">
                          <button onClick={() => removeKbItem(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs">remove</button>
                          <input type="text" value={item.question} onChange={e => updateKbItem(i, 'question', e.target.value)}
                            placeholder="Question" className="w-full border rounded px-2 py-1.5 text-sm mb-2 dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                          <textarea value={item.answer} onChange={e => updateKbItem(i, 'answer', e.target.value)}
                            placeholder="Answer" rows={2} className="w-full border rounded px-2 py-1.5 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border text-sm dark:border-gray-600 dark:text-gray-300">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : editingAgent ? 'Update Agent' : 'Create Agent'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
