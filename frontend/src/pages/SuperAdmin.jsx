import { useState, useEffect } from 'react';
import { superadminAPI } from '../services/api';

const TABS = ['overview', 'users', 'brands', 'subscriptions', 'audit', 'fix'];
const TAB_LABELS = {
  overview: 'Overview',
  users: 'Users',
  brands: 'Brands',
  subscriptions: 'Subscriptions',
  audit: 'Audit Log',
  fix: 'Fix Tools',
};

export default function SuperAdmin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }
  const [fixLoading, setFixLoading] = useState('');

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // ── Load data per tab ──────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'overview' && !stats) loadStats();
    if (activeTab === 'users' && users.length === 0) loadUsers();
    if (activeTab === 'brands' && brands.length === 0) loadBrands();
    if (activeTab === 'subscriptions' && subscriptions.length === 0) loadSubscriptions();
    if (activeTab === 'audit' && auditLogs.length === 0) loadAudit();
  }, [activeTab]);

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
  const fmt = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '—';
  const fmtDt = (dateStr) => dateStr ? new Date(dateStr).toLocaleString() : '—';
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-wide">Superadmin Control Panel</h1>
          <p className="text-gray-400 text-sm">Internal use only — not linked from any navigation</p>
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
        <nav className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
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
                      <td className="px-4 py-3 text-gray-600">{s.plan_name || '—'}</td>
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
                        {s.amount ? `$${parseFloat(s.amount).toFixed(2)} ${(s.currency || 'usd').toUpperCase()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.billing_interval || '—'}</td>
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
                        <div className="font-medium">{log.user_name || '—'}</div>
                        <div className="text-xs text-gray-400">{log.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{log.brand_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        <div>{log.entity_type}</div>
                        <div className="text-gray-400 font-mono">{log.entity_id?.slice(0, 8)}…</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.description || '—'}</td>
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
              These operations are safe, targeted fixes. Each runs a scoped SQL update — no raw query input.
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
                  {fixLoading === tool.operation ? 'Running…' : 'Run'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
