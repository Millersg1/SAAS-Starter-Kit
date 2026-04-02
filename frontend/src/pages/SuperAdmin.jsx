import { useState, useEffect } from 'react';
import { superadminAPI } from '../services/api';

const TABS = ['platform', 'overview', 'users', 'brands', 'subscriptions', 'founding', 'testimonials', 'voice', 'autopilot', 'audit', 'fix'];
const TAB_LABELS = {
  platform: 'Platform',
  overview: 'Overview',
  users: 'Users',
  brands: 'Brands',
  subscriptions: 'Subscriptions',
  founding: 'Founding Members',
  testimonials: 'Testimonials',
  voice: 'Voice Calls',
  autopilot: 'Autopilot',
  audit: 'Audit Log',
  fix: 'Fix Tools',
};

export default function SuperAdmin() {
  const [activeTab, setActiveTab] = useState('platform');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [fixLoading, setFixLoading] = useState('');
  const [platformData, setPlatformData] = useState(null);
  const [foundingMembers, setFoundingMembers] = useState(null);
  const [testimonials, setTestimonials] = useState(null);
  const [voiceCalls, setVoiceCalls] = useState(null);
  const [autopilotLog, setAutopilotLog] = useState(null);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // ── Load data per tab ──────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'platform' && !platformData) loadPlatform();
    if (activeTab === 'overview' && !stats) loadStats();
    if (activeTab === 'users' && users.length === 0) loadUsers();
    if (activeTab === 'brands' && brands.length === 0) loadBrands();
    if (activeTab === 'subscriptions' && subscriptions.length === 0) loadSubscriptions();
    if (activeTab === 'founding' && !foundingMembers) loadFoundingMembers();
    if (activeTab === 'testimonials' && !testimonials) loadTestimonials();
    if (activeTab === 'voice' && !voiceCalls) loadVoiceCalls();
    if (activeTab === 'autopilot' && !autopilotLog) loadAutopilotLog();
    if (activeTab === 'audit' && auditLogs.length === 0) loadAudit();
  }, [activeTab]);

  const loadPlatform = async () => {
    try {
      setLoading(true);
      const res = await superadminAPI.getPlatformOverview();
      setPlatformData(res.data.data);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Failed to load platform overview.');
    } finally { setLoading(false); }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await superadminAPI.getStats();
      setStats(res.data.data);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Failed to load stats.');
    } finally { setLoading(false); }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await superadminAPI.getUsers();
      setUsers(res.data.data.users);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Failed to load users.');
    } finally { setLoading(false); }
  };

  const loadBrands = async () => {
    try {
      setLoading(true);
      const res = await superadminAPI.getBrands();
      setBrands(res.data.data.brands);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Failed to load brands.');
    } finally { setLoading(false); }
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await superadminAPI.getSubscriptions();
      setSubscriptions(res.data.data.subscriptions);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Failed to load subscriptions.');
    } finally { setLoading(false); }
  };

  const loadAudit = async () => {
    try {
      setLoading(true);
      const res = await superadminAPI.getAuditLogs();
      setAuditLogs(res.data.data.logs);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Failed to load audit logs.');
    } finally { setLoading(false); }
  };

  const loadFoundingMembers = async () => {
    try {
      setLoading(true);
      const res = await superadminAPI.getFoundingMembers();
      setFoundingMembers(res.data.data);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Failed to load founding members.');
    } finally { setLoading(false); }
  };

  const loadTestimonials = async () => {
    try {
      setLoading(true);
      const res = await superadminAPI.getTestimonials();
      setTestimonials(res.data.data);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Failed to load testimonials.');
    } finally { setLoading(false); }
  };

  const loadVoiceCalls = async () => {
    try {
      setLoading(true);
      const res = await superadminAPI.getVoiceCalls();
      setVoiceCalls(res.data.data);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Failed to load voice calls.');
    } finally { setLoading(false); }
  };

  const loadAutopilotLog = async () => {
    try {
      setLoading(true);
      const res = await superadminAPI.getAutopilotLog();
      setAutopilotLog(res.data.data);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Failed to load autopilot log.');
    } finally { setLoading(false); }
  };

  // ── User actions ───────────────────────────────────────────────────────────
  const toggleUserField = async (userId, field, currentValue) => {
    try {
      const res = await superadminAPI.updateUser(userId, { [field]: !currentValue });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...res.data.data.user } : u));
      showMsg('success', 'User updated.');
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Update failed.');
    }
  };

  const deleteUser = async (userId, name) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await superadminAPI.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showMsg('success', 'User deleted.');
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Delete failed.');
    }
  };

  // ── Brand actions ──────────────────────────────────────────────────────────
  const deleteBrand = async (brandId, name) => {
    if (!confirm(`Delete brand "${name}" and all its data? This cannot be undone.`)) return;
    try {
      await superadminAPI.deleteBrand(brandId);
      setBrands(prev => prev.filter(b => b.id !== brandId));
      showMsg('success', 'Brand deleted.');
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Delete failed.');
    }
  };

  // ── Subscription actions ───────────────────────────────────────────────────
  const updateSubscriptionStatus = async (subId, status) => {
    try {
      const res = await superadminAPI.updateSubscription(subId, { status });
      setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, ...res.data.data.subscription } : s));
      showMsg('success', 'Subscription updated.');
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Update failed.');
    }
  };

  // ── Testimonial actions ────────────────────────────────────────────────────
  const updateTestimonial = async (id, updates) => {
    try {
      const res = await superadminAPI.updateTestimonial(id, updates);
      setTestimonials(prev => ({
        ...prev,
        testimonials: prev.testimonials.map(t => t.id === id ? { ...t, ...res.data.data.testimonial } : t),
      }));
      showMsg('success', 'Testimonial updated.');
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Update failed.');
    }
  };

  // ── Fix tools ─────────────────────────────────────────────────────────────
  const runFix = async (operation, label) => {
    if (!confirm(`Run "${label}"?`)) return;
    try {
      setFixLoading(operation);
      const res = await superadminAPI.runFix(operation);
      showMsg('success', res.data.message);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Operation failed.');
    } finally { setFixLoading(''); }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmt = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '--';
  const fmtDt = (dateStr) => dateStr ? new Date(dateStr).toLocaleString() : '--';
  const badge = (active) => (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {active ? 'Yes' : 'No'}
    </span>
  );
  const Toggle = ({ value, onClick }) => (
    <button
      onClick={onClick}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${value ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );

  const starRating = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-300'}>&#9733;</span>
      );
    }
    return <span className="text-sm">{stars}</span>;
  };

  // ── Platform stat card config ──────────────────────────────────────────────
  const platformCards = (data) => [
    { label: 'Users', key: 'users', color: 'bg-blue-50 text-blue-700', icon: '&#128100;' },
    { label: 'Brands', key: 'brands', color: 'bg-indigo-50 text-indigo-700', icon: '&#127981;' },
    { label: 'Clients', key: 'clients', color: 'bg-purple-50 text-purple-700', icon: '&#128101;' },
    { label: 'Projects', key: 'projects', color: 'bg-cyan-50 text-cyan-700', icon: '&#128196;' },
    { label: 'Invoices', key: 'invoices', color: 'bg-emerald-50 text-emerald-700', icon: '&#128176;' },
    { label: 'Proposals', key: 'proposals', color: 'bg-teal-50 text-teal-700', icon: '&#128221;' },
    { label: 'Deals', key: 'deals', color: 'bg-amber-50 text-amber-700', icon: '&#129309;' },
    { label: 'Tasks', key: 'tasks', color: 'bg-orange-50 text-orange-700', icon: '&#9745;' },
    { label: 'Revenue', key: 'revenue', color: 'bg-green-50 text-green-700', icon: '&#128178;', isCurrency: true },
    { label: 'Founding Members', key: 'founding_members', color: 'bg-yellow-50 text-yellow-700', icon: '&#127942;', suffix: ' / 50' },
    { label: 'Testimonials', key: 'testimonials_pending', color: 'bg-pink-50 text-pink-700', icon: '&#128172;', extraKey: 'testimonials_approved', extraLabel: 'approved' },
    { label: 'Voice Calls', key: 'voice_calls', color: 'bg-violet-50 text-violet-700', icon: '&#128222;', extraKey: 'voice_minutes', extraLabel: 'min' },
    { label: 'Autopilot Actions', key: 'autopilot_actions', color: 'bg-sky-50 text-sky-700', icon: '&#9889;' },
    { label: 'Lead Submissions', key: 'lead_submissions', color: 'bg-rose-50 text-rose-700', icon: '&#128203;' },
    { label: 'Active Workflows', key: 'active_workflows', color: 'bg-lime-50 text-lime-700', icon: '&#128260;' },
    { label: 'CMS Sites', key: 'cms_sites', color: 'bg-fuchsia-50 text-fuchsia-700', icon: '&#127760;' },
    { label: 'CMS Pages', key: 'cms_pages', color: 'bg-slate-50 text-slate-700', icon: '&#128195;' },
    { label: 'Resellers', key: 'resellers', color: 'bg-zinc-50 text-zinc-700', icon: '&#128279;' },
    { label: 'Campaigns', key: 'campaigns', color: 'bg-red-50 text-red-700', icon: '&#128227;' },
    { label: 'Total Expenses', key: 'total_expenses', color: 'bg-stone-50 text-stone-700', icon: '&#128184;', isCurrency: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-wide">Superadmin Control Panel</h1>
          <p className="text-gray-400 text-sm">Internal use only -- not linked from any navigation</p>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="text-gray-400 hover:text-white text-sm underline"
        >
          Back to App
        </button>
      </div>

      {/* Flash message */}
      {message && (
        <div className={`mx-6 mt-4 px-4 py-3 rounded text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-6">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* ── PLATFORM ── */}
        {activeTab === 'platform' && !loading && platformData && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {platformCards(platformData).map(card => {
                const val = platformData[card.key];
                let display;
                if (card.isCurrency) {
                  display = `$${parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                } else {
                  display = (val ?? 0).toLocaleString();
                }
                return (
                  <div key={card.key} className={`rounded-lg shadow-sm p-5 border border-gray-100 bg-white`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">{card.label}</p>
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${card.color}`} dangerouslySetInnerHTML={{ __html: card.icon }} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {display}{card.suffix || ''}
                    </p>
                    {card.extraKey && (
                      <p className="text-xs text-gray-400 mt-1">
                        {(platformData[card.extraKey] ?? 0).toLocaleString()} {card.extraLabel}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && !loading && stats && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Users', value: stats.stats.total_users },
                { label: 'Total Brands', value: stats.stats.total_brands },
                { label: 'Active Subscriptions', value: stats.stats.active_subscriptions },
                { label: 'Total Revenue', value: `$${parseFloat(stats.stats.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Recent Sign-ups</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      {['Name', 'Email', 'Role', 'Active', 'Verified', 'Last Login', 'Joined'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.recent_users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-gray-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{u.role}</span>
                        </td>
                        <td className="px-4 py-3">{badge(u.is_active)}</td>
                        <td className="px-4 py-3">{badge(u.email_verified)}</td>
                        <td className="px-4 py-3 text-gray-500">{fmt(u.last_login)}</td>
                        <td className="px-4 py-3 text-gray-500">{fmt(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">All Users ({users.length})</h2>
              <button onClick={loadUsers} className="text-sm text-blue-600 hover:underline">Refresh</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    {['Name', 'Email', 'Role', 'Brands', 'Active', 'Verified', 'Superadmin', 'Last Login', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{u.name}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{u.brand_count}</td>
                      <td className="px-4 py-3">
                        <Toggle value={u.is_active} onClick={() => toggleUserField(u.id, 'is_active', u.is_active)} />
                      </td>
                      <td className="px-4 py-3">
                        <Toggle value={u.email_verified} onClick={() => toggleUserField(u.id, 'email_verified', u.email_verified)} />
                      </td>
                      <td className="px-4 py-3">
                        <Toggle value={u.is_superadmin} onClick={() => toggleUserField(u.id, 'is_superadmin', u.is_superadmin)} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(u.last_login)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteUser(u.id, u.name)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── BRANDS ── */}
        {activeTab === 'brands' && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">All Brands ({brands.length})</h2>
              <button onClick={loadBrands} className="text-sm text-blue-600 hover:underline">Refresh</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    {['Brand Name', 'Slug', 'Owner', 'Members', 'Active', 'Created', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {brands.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{b.slug}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{b.owner_name}</div>
                        <div className="text-xs text-gray-400">{b.owner_email}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{b.member_count}</td>
                      <td className="px-4 py-3">{badge(b.is_active)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(b.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteBrand(b.id, b.name)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SUBSCRIPTIONS ── */}
        {activeTab === 'subscriptions' && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">All Subscriptions ({subscriptions.length})</h2>
              <button onClick={loadSubscriptions} className="text-sm text-blue-600 hover:underline">Refresh</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    {['Brand', 'Plan', 'Status', 'Amount', 'Interval', 'Period End', 'Trial End', 'Change Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscriptions.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.brand_name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.plan_name || '--'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          s.status === 'active' ? 'bg-green-100 text-green-700' :
                          s.status === 'trialing' ? 'bg-blue-100 text-blue-700' :
                          s.status === 'canceled' ? 'bg-gray-100 text-gray-600' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {s.amount ? `$${parseFloat(s.amount).toFixed(2)} ${(s.currency || 'usd').toUpperCase()}` : '--'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.billing_interval || '--'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(s.current_period_end)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(s.trial_end)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={s.status}
                          onChange={e => updateSubscriptionStatus(s.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {['active', 'trialing', 'canceled', 'past_due', 'unpaid', 'incomplete'].map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FOUNDING MEMBERS ── */}
        {activeTab === 'founding' && !loading && foundingMembers && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">
                Founding Members
                <span className="ml-2 px-2.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                  {foundingMembers.members?.length || 0} / 50
                </span>
              </h2>
              <button onClick={() => { setFoundingMembers(null); loadFoundingMembers(); }} className="text-sm text-blue-600 hover:underline">Refresh</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    {['#', 'Name', 'Email', 'Brand', 'Plan', 'Locked Monthly', 'Locked Annual', 'Joined'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(foundingMembers.members || []).map((m, idx) => (
                    <tr key={m.id || idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{m.name}</td>
                      <td className="px-4 py-3 text-gray-600">{m.email}</td>
                      <td className="px-4 py-3 text-gray-600">{m.brand_name || '--'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{m.plan || '--'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {m.locked_monthly != null ? `$${parseFloat(m.locked_monthly).toFixed(2)}` : '--'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {m.locked_annual != null ? `$${parseFloat(m.locked_annual).toFixed(2)}` : '--'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(m.created_at || m.joined)}</td>
                    </tr>
                  ))}
                  {(foundingMembers.members || []).length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No founding members yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TESTIMONIALS ── */}
        {activeTab === 'testimonials' && !loading && testimonials && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">
                Testimonials ({(testimonials.testimonials || []).length})
              </h2>
              <button onClick={() => { setTestimonials(null); loadTestimonials(); }} className="text-sm text-blue-600 hover:underline">Refresh</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    {['Name', 'Company', 'Rating', 'Quote', 'Video URL', 'Status', 'Featured', 'Submitted', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(testimonials.testimonials || []).map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{t.name || t.author_name || '--'}</td>
                      <td className="px-4 py-3 text-gray-600">{t.company || '--'}</td>
                      <td className="px-4 py-3">{starRating(t.rating || 0)}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={t.quote || t.content}>
                        {(t.quote || t.content || '').substring(0, 80)}{(t.quote || t.content || '').length > 80 ? '...' : ''}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">
                        {t.video_url ? <a href={t.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a> : '--'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          t.status === 'approved' ? 'bg-green-100 text-green-700' :
                          t.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {t.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Toggle value={!!t.is_featured} onClick={() => updateTestimonial(t.id, { is_featured: !t.is_featured })} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(t.created_at || t.submitted_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {t.status !== 'approved' && (
                            <button
                              onClick={() => updateTestimonial(t.id, { status: 'approved' })}
                              className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {t.status !== 'rejected' && (
                            <button
                              onClick={() => updateTestimonial(t.id, { status: 'rejected' })}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(testimonials.testimonials || []).length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No testimonials found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── VOICE CALLS ── */}
        {activeTab === 'voice' && !loading && voiceCalls && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Total Calls</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{(voiceCalls.total_calls ?? 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Total Minutes</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{parseFloat(voiceCalls.total_minutes ?? 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Voice Calls</h2>
                <button onClick={() => { setVoiceCalls(null); loadVoiceCalls(); }} className="text-sm text-blue-600 hover:underline">Refresh</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      {['Phone', 'Direction', 'Status', 'Duration', 'Agent', 'Summary', 'Sentiment', 'Started'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(voiceCalls.calls || []).map((c, idx) => (
                      <tr key={c.id || idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700 font-mono text-xs whitespace-nowrap">{c.phone || c.caller_number || '--'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            c.direction === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {c.direction || '--'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            c.status === 'completed' ? 'bg-green-100 text-green-700' :
                            c.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {c.status || '--'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.duration ? `${c.duration}s` : '--'}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.agent_name || c.agent || '--'}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={c.summary}>
                          {(c.summary || '').substring(0, 60)}{(c.summary || '').length > 60 ? '...' : ''}
                        </td>
                        <td className="px-4 py-3">
                          {c.sentiment ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              c.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                              c.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {c.sentiment}
                            </span>
                          ) : '--'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDt(c.started_at || c.created_at)}</td>
                      </tr>
                    ))}
                    {(voiceCalls.calls || []).length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No voice calls found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── AUTOPILOT ── */}
        {activeTab === 'autopilot' && !loading && autopilotLog && (
          <div>
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 inline-block">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Total Autopilot Actions</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{(autopilotLog.total_actions ?? (autopilotLog.actions || []).length).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Autopilot Log</h2>
                <button onClick={() => { setAutopilotLog(null); loadAutopilotLog(); }} className="text-sm text-blue-600 hover:underline">Refresh</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      {['Timestamp', 'Action Type', 'Entity Type', 'Description'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(autopilotLog.actions || []).map((a, idx) => (
                      <tr key={a.id || idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDt(a.created_at || a.timestamp)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{a.action_type || a.type || '--'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{a.entity_type || '--'}</td>
                        <td className="px-4 py-3 text-gray-600">{a.description || '--'}</td>
                      </tr>
                    ))}
                    {(autopilotLog.actions || []).length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No autopilot actions found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── AUDIT LOG ── */}
        {activeTab === 'audit' && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Audit Log (last 100)</h2>
              <button onClick={loadAudit} className="text-sm text-blue-600 hover:underline">Refresh</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    {['Timestamp', 'User', 'Brand', 'Action', 'Entity', 'Description'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDt(log.created_at)}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-medium">{log.user_name || '--'}</div>
                        <div className="text-xs text-gray-400">{log.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{log.brand_name || '--'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        <div>{log.entity_type}</div>
                        <div className="text-gray-400 font-mono">{log.entity_id?.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.description || '--'}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No audit logs found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FIX TOOLS ── */}
        {activeTab === 'fix' && (
          <div className="max-w-xl space-y-4">
            <p className="text-sm text-gray-500 mb-6">
              These operations are safe, targeted fixes. Each runs a scoped SQL update -- no raw query input.
            </p>

            {[
              {
                operation: 'fix_zero_invoices',
                label: 'Fix Zero-Dollar Invoices',
                description: 'Recalculates totals for invoices that have line items but show $0.00. Safe to run anytime.',
                color: 'blue',
              },
              {
                operation: 'fix_overdue_invoices',
                label: 'Mark Overdue Invoices',
                description: 'Sets status to "overdue" for all sent/partial invoices past their due date with an outstanding balance.',
                color: 'yellow',
              },
              {
                operation: 'verify_all_emails',
                label: 'Verify All Emails',
                description: 'Sets email_verified = true for all users. Use when migrating users or for testing.',
                color: 'green',
              },
            ].map(tool => (
              <div key={tool.operation} className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">{tool.label}</h3>
                  <p className="text-sm text-gray-500">{tool.description}</p>
                </div>
                <button
                  onClick={() => runFix(tool.operation, tool.label)}
                  disabled={fixLoading === tool.operation}
                  className={`shrink-0 px-4 py-2 rounded text-sm font-medium text-white transition-colors disabled:opacity-60 ${
                    tool.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                    tool.color === 'yellow' ? 'bg-yellow-500 hover:bg-yellow-600' :
                    'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {fixLoading === tool.operation ? 'Running...' : 'Run'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
