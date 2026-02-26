import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { campaignAPI, clientAPI } from '../services/api';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  sending: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default function CampaignDetails() {
  const { campaignId } = useParams();
  const { activeBrandId } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [clients, setClients] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedClients, setSelectedClients] = useState([]);
  const [activeTab, setActiveTab] = useState('content');

  const fetchData = useCallback(async () => {
    if (!activeBrandId || !campaignId) return;
    setLoading(true);
    try {
      const [campRes, clientRes] = await Promise.all([
        campaignAPI.getCampaign(activeBrandId, campaignId),
        clientAPI.getBrandClients(activeBrandId),
      ]);
      setCampaign(campRes.data.data.campaign);
      setRecipients(campRes.data.data.recipients || []);
      setClients(clientRes.data.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [activeBrandId, campaignId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await campaignAPI.updateCampaign(activeBrandId, campaignId, campaign);
      setSuccess('Saved!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (e) { setError(e.response?.data?.message || 'Failed to save.'); } finally { setSaving(false); }
  };

  const handleAddRecipients = async () => {
    if (selectedClients.length === 0) return;
    try {
      const toAdd = clients.filter(c => selectedClients.includes(c.id) && c.email).map(c => ({ client_id: c.id, email: c.email, name: c.name }));
      await campaignAPI.addRecipients(activeBrandId, campaignId, { recipients: toAdd });
      setSelectedClients([]);
      fetchData();
    } catch (e) { setError(e.response?.data?.message || 'Failed to add recipients.'); }
  };

  const handleSend = async () => {
    if (!window.confirm(`Send this campaign to ${campaign?.total_recipients || 0} recipients?`)) return;
    setSending(true); setError('');
    try {
      await campaignAPI.sendCampaign(activeBrandId, campaignId);
      setSuccess('Campaign is being sent!');
      fetchData();
    } catch (e) { setError(e.response?.data?.message || 'Failed to send.'); } finally { setSending(false); }
  };

  const toggleClient = (id) => {
    setSelectedClients(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  };

  const recipientEmails = new Set(recipients.map(r => r.email));
  const availableClients = clients.filter(c => c.email && !recipientEmails.has(c.email));

  if (loading) return <div className="p-6 text-center text-gray-500">Loading…</div>;
  if (!campaign) return <div className="p-6 text-center text-gray-500">Campaign not found.</div>;

  const isDraft = campaign.status === 'draft';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/campaigns" className="text-blue-600 hover:underline text-sm">← Campaigns</Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{campaign.name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[campaign.status]}`}>{campaign.status}</span>
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded p-3 mb-4">{error}</div>}
      {success && <div className="text-green-600 text-sm bg-green-50 dark:bg-green-900/20 rounded p-3 mb-4">{success}</div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200 dark:border-gray-700">
        {['content', 'recipients', 'stats'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {activeTab === 'content' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Subject Line *</label>
              <input value={campaign.subject || ''} onChange={e => setCampaign(c => ({ ...c, subject: e.target.value }))} disabled={!isDraft} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white disabled:opacity-60" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Preview Text</label>
              <input value={campaign.preview_text || ''} onChange={e => setCampaign(c => ({ ...c, preview_text: e.target.value }))} disabled={!isDraft} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white disabled:opacity-60" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">From Name</label>
              <input value={campaign.from_name || ''} onChange={e => setCampaign(c => ({ ...c, from_name: e.target.value }))} disabled={!isDraft} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white disabled:opacity-60" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">From Email</label>
              <input value={campaign.from_email || ''} onChange={e => setCampaign(c => ({ ...c, from_email: e.target.value }))} disabled={!isDraft} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white disabled:opacity-60" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Plain Text Content</label>
            <textarea value={campaign.text_content || ''} onChange={e => setCampaign(c => ({ ...c, text_content: e.target.value }))} disabled={!isDraft} rows={6} placeholder="Plain text version of your email…" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white disabled:opacity-60 resize-none font-mono" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">HTML Content (optional)</label>
            <textarea value={campaign.html_content || ''} onChange={e => setCampaign(c => ({ ...c, html_content: e.target.value }))} disabled={!isDraft} rows={8} placeholder="<p>Your HTML email body…</p>" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white disabled:opacity-60 resize-none font-mono" />
          </div>
          {isDraft && (
            <div className="flex gap-3 justify-end">
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:text-gray-300 disabled:opacity-50">{saving ? 'Saving…' : 'Save Draft'}</button>
              <button onClick={handleSend} disabled={sending || campaign.total_recipients === 0} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {sending ? 'Sending…' : `Send to ${campaign.total_recipients || 0} Recipients`}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'recipients' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-800 dark:text-gray-200">Recipients ({recipients.length})</h3>
            {isDraft && selectedClients.length > 0 && (
              <button onClick={handleAddRecipients} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">Add {selectedClients.length} selected</button>
            )}
          </div>
          {recipients.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>{['Name', 'Email', 'Status'].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recipients.map(r => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{r.name || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.email}</td>
                      <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {isDraft && availableClients.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add from clients</p>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                {availableClients.map(c => (
                  <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer">
                    <input type="checkbox" checked={selectedClients.includes(c.id)} onChange={() => toggleClient(c.id)} className="rounded" />
                    <span className="text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
                    <span className="text-xs text-gray-400">{c.email}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Recipients', value: campaign.total_recipients || 0, icon: '👥' },
              { label: 'Sent', value: campaign.sent_count || 0, icon: '📤' },
              { label: 'Opened', value: campaign.open_count || 0, icon: '👁', sub: campaign.sent_count > 0 ? `${Math.round((campaign.open_count || 0) / campaign.sent_count * 100)}%` : null },
              { label: 'Clicked', value: campaign.click_count || 0, icon: '🖱', sub: campaign.sent_count > 0 ? `${Math.round((campaign.click_count || 0) / campaign.sent_count * 100)}%` : null },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
                {s.sub && <div className="text-sm font-medium text-blue-600 dark:text-blue-400">{s.sub}</div>}
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          {campaign.sent_at && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Sent at: {new Date(campaign.sent_at).toLocaleString()}</p>
          )}
          {recipients.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Per-recipient activity</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>{['Email', 'Status', 'Opened', 'Clicked'].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recipients.map(r => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.email}</td>
                      <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{r.status}</span></td>
                      <td className="px-3 py-2 text-xs text-gray-500">{r.opened_at ? <span className="text-green-600 dark:text-green-400">✓ {new Date(r.opened_at).toLocaleDateString()}{r.open_count > 1 ? ` ×${r.open_count}` : ''}</span> : '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{r.clicked_at ? <span className="text-blue-600 dark:text-blue-400">✓ {new Date(r.clicked_at).toLocaleDateString()}{r.click_count > 1 ? ` ×${r.click_count}` : ''}</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
