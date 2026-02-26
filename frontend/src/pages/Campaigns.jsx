import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { campaignAPI } from '../services/api';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  scheduled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  sending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  sent: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function Campaigns() {
  const { activeBrandId } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', subject: '', preview_text: '', from_name: '', from_email: '', html_content: '', text_content: '' });

  const fetchCampaigns = useCallback(async () => {
    if (!activeBrandId) return;
    setLoading(true);
    try {
      const res = await campaignAPI.getCampaigns(activeBrandId);
      setCampaigns(res.data.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [activeBrandId]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!form.name || !form.subject) { setError('Name and subject are required.'); return; }
    setSaving(true); setError('');
    try {
      await campaignAPI.createCampaign(activeBrandId, form);
      setShowModal(false);
      setForm({ name: '', subject: '', preview_text: '', from_name: '', from_email: '', html_content: '', text_content: '' });
      fetchCampaigns();
    } catch (e) { setError(e.response?.data?.message || 'Failed to create.'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await campaignAPI.deleteCampaign(activeBrandId, id);
      fetchCampaigns();
    } catch { /* silent */ }
  };

  const sentRate = (c) => {
    if (!c.total_recipients) return '—';
    return `${c.sent_count}/${c.total_recipients}`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Campaigns</h1>
        <button onClick={() => { setShowModal(true); setError(''); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">+ New Campaign</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📣</div>
          <p className="text-gray-500 dark:text-gray-400">No campaigns yet. Create one to send email blasts to clients.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>{['Name', 'Subject', 'Status', 'Sent', 'Created', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <Link to={`/campaigns/${c.id}`} className="hover:text-blue-600">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">{c.subject}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status]}`}>{c.status}</span></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{sentRate(c)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link to={`/campaigns/${c.id}`} className="text-xs text-blue-600 hover:underline">Edit</Link>
                      {c.status === 'draft' && (
                        <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">New Campaign</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded p-2">{error}</div>}
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Campaign name *" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Email subject line *" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              <input value={form.preview_text} onChange={e => setForm(f => ({ ...f, preview_text: e.target.value }))} placeholder="Preview text (optional)" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              <div className="grid grid-cols-2 gap-2">
                <input value={form.from_name} onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))} placeholder="From name" className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
                <input type="email" value={form.from_email} onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))} placeholder="From email" className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:text-gray-300">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating…' : 'Create Draft'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
