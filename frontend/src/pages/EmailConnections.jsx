import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { emailConnectionAPI } from '../services/api';

const PROVIDER_PRESETS = {
  gmail: { label: 'Gmail', imap_host: 'imap.gmail.com', imap_port: 993, icon: '📧' },
  outlook: { label: 'Outlook / Hotmail', imap_host: 'outlook.office365.com', imap_port: 993, icon: '📨' },
  yahoo: { label: 'Yahoo Mail', imap_host: 'imap.mail.yahoo.com', imap_port: 993, icon: '📬' },
  icloud: { label: 'iCloud Mail', imap_host: 'imap.mail.me.com', imap_port: 993, icon: '🍎' },
  custom: { label: 'Custom IMAP', imap_host: '', imap_port: 993, icon: '⚙️' },
};

export default function EmailConnections() {
  const { activeBrandId } = useAuth();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState('');
  const [syncing, setSyncing] = useState('');
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState({});
  const [form, setForm] = useState({ provider: 'gmail', email_address: '', imap_host: 'imap.gmail.com', imap_port: 993, imap_user: '', imap_password: '' });

  const fetchConnections = useCallback(async () => {
    if (!activeBrandId) return;
    setLoading(true);
    try {
      const res = await emailConnectionAPI.getConnections(activeBrandId);
      setConnections(res.data.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [activeBrandId]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const selectProvider = (provider) => {
    const preset = PROVIDER_PRESETS[provider];
    setForm(f => ({ ...f, provider, imap_host: preset.imap_host, imap_port: preset.imap_port, imap_user: f.email_address }));
  };

  const handleSave = async () => {
    if (!form.email_address || !form.imap_password) { setError('Email address and password are required.'); return; }
    setSaving(true); setError('');
    try {
      await emailConnectionAPI.createConnection(activeBrandId, form);
      setShowModal(false);
      setForm({ provider: 'gmail', email_address: '', imap_host: 'imap.gmail.com', imap_port: 993, imap_user: '', imap_password: '' });
      fetchConnections();
    } catch (e) { setError(e.response?.data?.message || 'Failed to add connection.'); } finally { setSaving(false); }
  };

  const handleTest = async (connId) => {
    setTesting(connId);
    setTestResult(r => ({ ...r, [connId]: null }));
    try {
      const res = await emailConnectionAPI.testConnection(activeBrandId, connId);
      setTestResult(r => ({ ...r, [connId]: { ok: true, msg: res.data.message || 'Connected successfully!' } }));
    } catch (e) {
      setTestResult(r => ({ ...r, [connId]: { ok: false, msg: e.response?.data?.message || 'Connection failed.' } }));
    } finally { setTesting(''); }
  };

  const handleSync = async (connId) => {
    setSyncing(connId);
    try {
      await emailConnectionAPI.syncNow(activeBrandId, connId);
      fetchConnections();
    } catch { /* silent */ } finally { setSyncing(''); }
  };

  const handleDelete = async (connId) => {
    if (!window.confirm('Remove this email connection?')) return;
    try {
      await emailConnectionAPI.deleteConnection(activeBrandId, connId);
      fetchConnections();
    } catch { /* silent */ }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Sync</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connect your email to automatically track client conversations.</p>
        </div>
        <button onClick={() => { setShowModal(true); setError(''); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">+ Connect Email</button>
      </div>

      {/* Info callout */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 text-sm text-blue-800 dark:text-blue-300">
        <strong>How it works:</strong> We connect to your inbox via IMAP and automatically log emails to/from your clients in their activity timeline. Emails sync every 15 minutes. For Gmail, use an <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noreferrer" className="underline">App Password</a>, not your regular password.
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : connections.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📧</div>
          <p className="text-gray-500 dark:text-gray-400">No email connections yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map(conn => (
            <div key={conn.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{PROVIDER_PRESETS[conn.provider]?.icon || '📧'}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{conn.email_address}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${conn.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500'}`}>{conn.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="text-xs text-gray-400">{conn.imap_host}:{conn.imap_port} · Last synced: {conn.last_synced_at ? new Date(conn.last_synced_at).toLocaleString() : 'Never'}</p>
                  {testResult[conn.id] && (
                    <p className={`text-xs mt-1 ${testResult[conn.id].ok ? 'text-green-600' : 'text-red-600'}`}>{testResult[conn.id].msg}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => handleTest(conn.id)} disabled={testing === conn.id} className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50">
                    {testing === conn.id ? 'Testing…' : 'Test'}
                  </button>
                  <button onClick={() => handleSync(conn.id)} disabled={syncing === conn.id} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {syncing === conn.id ? 'Syncing…' : 'Sync Now'}
                  </button>
                  <button onClick={() => handleDelete(conn.id)} className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Connection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Connect Email Account</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded p-2">{error}</div>}

              {/* Provider picker */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Email Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PROVIDER_PRESETS).map(([key, p]) => (
                    <button key={key} type="button" onClick={() => selectProvider(key)} className={`p-2 rounded-lg border text-xs text-center ${form.provider === key ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                      <div className="text-lg mb-0.5">{p.icon}</div>
                      {p.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <input value={form.email_address} onChange={e => setForm(f => ({ ...f, email_address: e.target.value, imap_user: e.target.value }))} placeholder="Email address *" type="email" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              <input value={form.imap_password} onChange={e => setForm(f => ({ ...f, imap_password: e.target.value }))} placeholder="Password / App Password *" type="password" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />

              {form.provider === 'custom' && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 mb-1 block">IMAP Host</label>
                    <input value={form.imap_host} onChange={e => setForm(f => ({ ...f, imap_host: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Port</label>
                    <input type="number" value={form.imap_port} onChange={e => setForm(f => ({ ...f, imap_port: +e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
                  </div>
                </div>
              )}

              {form.provider === 'gmail' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                  Gmail requires an <strong>App Password</strong>. Enable 2FA in your Google account, then generate an app password at myaccount.google.com/apppasswords.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:text-gray-300">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Connecting…' : 'Connect'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
