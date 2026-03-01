import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { campaignAPI, clientAPI, segmentAPI } from '../services/api';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  sending: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default function CampaignDetails() {
  const { campaignId } = useParams();
  const { activeBrandId } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [clients, setClients] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingVariant, setSavingVariant] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedClients, setSelectedClients] = useState([]);
  const [activeTab, setActiveTab] = useState('content');

  // Segment picker
  const [segmentId, setSegmentId] = useState('');
  const [segments, setSegments] = useState([]);
  const [segmentCount, setSegmentCount] = useState(null);
  const [loadingSegment, setLoadingSegment] = useState(false);

  // A/B variant forms
  const [variantForms, setVariantForms] = useState({
    A: { subject: '', html_content: '', text_content: '', send_percentage: 50 },
    B: { subject: '', html_content: '', text_content: '', send_percentage: 50 },
  });

  const fetchData = useCallback(async () => {
    if (!activeBrandId || !campaignId) return;
    setLoading(true);
    try {
      const [campRes, clientRes] = await Promise.all([
        campaignAPI.getCampaign(activeBrandId, campaignId),
        clientAPI.getBrandClients(activeBrandId),
      ]);
      const campData = campRes.data.data;
      setCampaign(campData.campaign);
      setRecipients(campData.recipients || []);
      setClients(clientRes.data.data || []);
      segmentAPI.list(activeBrandId).then(r => setSegments(r.data.data?.segments || []));

      const fetchedVariants = campData.variants || [];
      setVariants(fetchedVariants);
      // Populate variant forms from existing data
      const newForms = {
        A: { subject: '', html_content: '', text_content: '', send_percentage: 50 },
        B: { subject: '', html_content: '', text_content: '', send_percentage: 50 },
      };
      for (const v of fetchedVariants) {
        if (v.variant_name === 'A' || v.variant_name === 'B') {
          newForms[v.variant_name] = {
            subject: v.subject || '',
            html_content: v.html_content || '',
            text_content: v.text_content || '',
            send_percentage: v.send_percentage ?? 50,
          };
        }
      }
      setVariantForms(newForms);
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

  // A/B variant handlers
  const updateVariantForm = (name, field, value) => {
    setVariantForms(f => ({ ...f, [name]: { ...f[name], [field]: value } }));
  };

  const handleSaveVariant = async (variantName) => {
    setSavingVariant(variantName);
    try {
      await campaignAPI.upsertVariant(activeBrandId, campaignId, variantName, variantForms[variantName]);
      await fetchData();
      setSuccess(`Variant ${variantName} saved!`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (e) {
      setError(e.response?.data?.message || `Failed to save variant ${variantName}.`);
    } finally {
      setSavingVariant(null);
    }
  };

  const handleDeleteVariant = async (variantName) => {
    const v = variants.find(x => x.variant_name === variantName);
    if (!v) return;
    if (!window.confirm(`Delete Variant ${variantName}?`)) return;
    await campaignAPI.deleteVariant(activeBrandId, campaignId, v.id);
    await fetchData();
  };

  const handleDeclareWinner = async (variantId) => {
    try {
      await campaignAPI.declareWinner(activeBrandId, campaignId, variantId);
      await fetchData();
      setSuccess('Winner declared!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (e) { setError(e.response?.data?.message || 'Failed to declare winner.'); }
  };

  const recipientEmails = new Set(recipients.map(r => r.email));
  const availableClients = clients.filter(c => c.email && !recipientEmails.has(c.email));

  if (loading) return <div className="p-6 text-center text-gray-500">Loading…</div>;
  if (!campaign) return <div className="p-6 text-center text-gray-500">Campaign not found.</div>;

  const isDraft = campaign.status === 'draft';
  const isSent = campaign.status === 'sent';

  const variantA = variants.find(v => v.variant_name === 'A');
  const variantB = variants.find(v => v.variant_name === 'B');

  const statPct = (count, total) => total > 0 ? `${Math.round(count / total * 100)}%` : '0%';

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
        {['content', 'a/b test', 'recipients', 'stats'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* CONTENT TAB */}
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

      {/* A/B TEST TAB */}
      {activeTab === 'a/b test' && (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm text-blue-700 dark:text-blue-300">
            Define two variants (A & B) with different subject lines or content. Recipients are randomly split based on the send percentage you set. {isSent && ' Compare results below to declare a winner.'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {['A', 'B'].map(name => {
              const savedVariant = variants.find(v => v.variant_name === name);
              const f = variantForms[name];
              return (
                <div key={name} className={`rounded-xl border p-4 space-y-3 ${savedVariant?.is_winner ? 'border-green-400 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-800 dark:text-gray-200">Variant {name}</span>
                      {savedVariant?.is_winner && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">🏆 Winner</span>}
                    </div>
                    {savedVariant && isDraft && (
                      <button onClick={() => handleDeleteVariant(name)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>

                  {/* Send % */}
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Send to {f.send_percentage}% of recipients</label>
                    <input
                      type="range" min={1} max={99} value={f.send_percentage}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        const other = name === 'A' ? 'B' : 'A';
                        updateVariantForm(name, 'send_percentage', val);
                        updateVariantForm(other, 'send_percentage', 100 - val);
                      }}
                      disabled={!isDraft}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>1%</span><span>100%</span>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Subject Line</label>
                    <input
                      type="text"
                      value={f.subject}
                      onChange={e => updateVariantForm(name, 'subject', e.target.value)}
                      disabled={!isDraft}
                      placeholder="Variant subject line…"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white disabled:opacity-60"
                    />
                  </div>

                  {/* Text content */}
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Plain Text</label>
                    <textarea
                      value={f.text_content}
                      onChange={e => updateVariantForm(name, 'text_content', e.target.value)}
                      disabled={!isDraft}
                      rows={4}
                      placeholder="Plain text content for this variant…"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white disabled:opacity-60 resize-none font-mono"
                    />
                  </div>

                  {/* Stats (after send) */}
                  {savedVariant && isSent && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[
                        { label: 'Sent', value: savedVariant.sent_count || 0 },
                        { label: 'Opens', value: savedVariant.open_count || 0, pct: statPct(savedVariant.open_count, savedVariant.sent_count) },
                        { label: 'Clicks', value: savedVariant.click_count || 0, pct: statPct(savedVariant.click_count, savedVariant.sent_count) },
                      ].map(s => (
                        <div key={s.label} className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-2 text-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</div>
                          {s.pct && <div className="text-xs font-medium text-blue-600">{s.pct}</div>}
                          <div className="text-xs text-gray-400">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {isDraft && (
                      <button
                        onClick={() => handleSaveVariant(name)}
                        disabled={savingVariant === name}
                        className="flex-1 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingVariant === name ? 'Saving…' : `Save Variant ${name}`}
                      </button>
                    )}
                    {savedVariant && isSent && !savedVariant.is_winner && (
                      <button
                        onClick={() => handleDeclareWinner(savedVariant.id)}
                        className="flex-1 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        Declare Winner
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isDraft && variants.length >= 2 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300">
              Both variants are saved. When you send, recipients will be split {variantForms.A.send_percentage}% / {variantForms.B.send_percentage}% between Variant A and Variant B.
            </div>
          )}
        </div>
      )}

      {/* RECIPIENTS TAB */}
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
                  <tr>{['Name', 'Email', 'Variant', 'Status'].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recipients.map(r => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{r.name || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.email}</td>
                      <td className="px-3 py-2">
                        {r.variant_name ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{r.variant_name}</span> : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {isDraft && segments.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add from Segment</p>
              <div className="flex items-center gap-2">
                <select
                  value={segmentId}
                  onChange={async (e) => {
                    setSegmentId(e.target.value);
                    if (!e.target.value) { setSegmentCount(null); return; }
                    setLoadingSegment(true);
                    const r = await segmentAPI.getClients(activeBrandId, e.target.value);
                    setSegmentCount((r.data.data?.clients || []).length);
                    setLoadingSegment(false);
                  }}
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value="">— Select a segment —</option>
                  {segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {segmentCount !== null && (
                  <span className="text-xs text-gray-500 whitespace-nowrap">{segmentCount} clients</span>
                )}
                <button
                  onClick={async () => {
                    if (!segmentId) return;
                    setLoadingSegment(true);
                    try {
                      const r = await segmentAPI.getClients(activeBrandId, segmentId);
                      const segClients = r.data.data?.clients || [];
                      const existing = new Set(recipients.map(rc => rc.email));
                      const toAdd = segClients
                        .filter(c => c.email && !existing.has(c.email))
                        .map(c => ({ client_id: c.id, email: c.email, name: c.name }));
                      if (toAdd.length) {
                        await campaignAPI.addRecipients(activeBrandId, campaignId, { recipients: toAdd });
                        await fetchData();
                      }
                      setSegmentId(''); setSegmentCount(null);
                    } finally { setLoadingSegment(false); }
                  }}
                  disabled={!segmentId || loadingSegment}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {loadingSegment ? '…' : 'Add from Segment'}
                </button>
              </div>
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

      {/* STATS TAB */}
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
                  <tr>{['Email', 'Variant', 'Status', 'Opened', 'Clicked'].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recipients.map(r => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.email}</td>
                      <td className="px-3 py-2">{r.variant_name ? <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{r.variant_name}</span> : '—'}</td>
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
