import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { smsBroadcastAPI, segmentAPI } from '../services/api';

const STATUS_COLORS = {
  draft:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  sending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  sent:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  failed:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function CharCounter({ text }) {
  const len = text.length;
  const parts = Math.ceil(len / 160) || 1;
  const remaining = parts * 160 - len;
  return (
    <span className={`text-xs ${remaining < 20 ? 'text-red-500' : 'text-gray-400'}`}>
      {len} / {parts * 160} chars ({parts} SMS{parts > 1 ? 'es' : ''})
    </span>
  );
}

export default function SmsBroadcast() {
  const { activeBrandId } = useAuth();
  const [broadcasts, setBroadcasts] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', message: '', segment_id: '' });
  const [segmentPreview, setSegmentPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  // Detail modal
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchBroadcasts = useCallback(async () => {
    if (!activeBrandId) return;
    setLoading(true);
    try {
      const r = await smsBroadcastAPI.list(activeBrandId);
      setBroadcasts(r.data.data?.broadcasts || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [activeBrandId]);

  useEffect(() => {
    fetchBroadcasts();
    if (activeBrandId) {
      segmentAPI.list(activeBrandId).then(r => setSegments(r.data.data?.segments || []));
    }
  }, [fetchBroadcasts, activeBrandId]);

  const handleSegmentChange = async (segId) => {
    setForm(f => ({ ...f, segment_id: segId }));
    setSegmentPreview(null);
    if (!segId) return;
    setLoadingPreview(true);
    try {
      const r = await segmentAPI.getClients(activeBrandId, segId);
      const clients = r.data.data?.clients || [];
      const withPhone = clients.filter(c => c.phone);
      setSegmentPreview({ total: clients.length, withPhone: withPhone.length });
    } finally { setLoadingPreview(false); }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.message.trim()) {
      setError('Name and message are required.');
      return;
    }
    setCreating(true); setError('');
    try {
      await smsBroadcastAPI.create(activeBrandId, {
        name: form.name.trim(),
        message: form.message.trim(),
        segment_id: form.segment_id || undefined,
      });
      setShowCreate(false);
      setForm({ name: '', message: '', segment_id: '' });
      setSegmentPreview(null);
      await fetchBroadcasts();
      setSuccess('Broadcast created!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create broadcast.');
    } finally { setCreating(false); }
  };

  const handleSend = async (broadcast) => {
    const msg = broadcast.segment_id
      ? `Send "${broadcast.name}" to all clients in the selected segment with phone numbers?`
      : `Send "${broadcast.name}" to all clients with phone numbers?`;
    if (!window.confirm(msg)) return;
    setError('');
    try {
      const r = await smsBroadcastAPI.send(activeBrandId, broadcast.id);
      setSuccess(`Sending to ${r.data.data?.total || 0} recipients…`);
      setTimeout(() => setSuccess(''), 4000);
      await fetchBroadcasts();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send broadcast.');
    }
  };

  const handleDelete = async (broadcast) => {
    if (!window.confirm(`Delete "${broadcast.name}"? This cannot be undone.`)) return;
    try {
      await smsBroadcastAPI.remove(activeBrandId, broadcast.id);
      await fetchBroadcasts();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete broadcast.');
    }
  };

  const openDetail = async (broadcast) => {
    setDetail({ broadcast, recipients: [] });
    setDetailLoading(true);
    try {
      const r = await smsBroadcastAPI.get(activeBrandId, broadcast.id);
      setDetail(r.data.data);
    } finally { setDetailLoading(false); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleString() : '—';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SMS Broadcasts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Send bulk SMS to segments or all clients with phone numbers</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError(''); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          + New Broadcast
        </button>
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4">{error}</div>}
      {success && <div className="text-green-600 text-sm bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">{success}</div>}

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : broadcasts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📨</div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No broadcasts yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first SMS broadcast to reach all your clients at once.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Name', 'Segment', 'Status', 'Recipients', 'Sent', 'Failed', 'Created', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {broadcasts.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(b)} className="font-medium text-blue-600 hover:underline text-left">
                      {b.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{b.segment_name || <span className="italic">All clients</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] || STATUS_COLORS.draft}`}>
                      {b.status === 'sending' ? '⏳ sending' : b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{b.total_recipients}</td>
                  <td className="px-4 py-3 text-green-600 dark:text-green-400">{b.sent_count}</td>
                  <td className="px-4 py-3 text-red-500">{b.failed_count > 0 ? b.failed_count : <span className="text-gray-300">0</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmt(b.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {b.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleSend(b)}
                            className="text-xs px-2.5 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Send
                          </button>
                          <button
                            onClick={() => handleDelete(b)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {b.status !== 'draft' && (
                        <button onClick={() => openDetail(b)} className="text-xs text-gray-500 hover:text-gray-700">View</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New SMS Broadcast</h2>
              <button onClick={() => { setShowCreate(false); setError(''); setSegmentPreview(null); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded p-2">{error}</div>}

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Broadcast Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. March Promo"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Segment (optional)</label>
                <select
                  value={form.segment_id}
                  onChange={e => handleSegmentChange(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All clients with phone numbers</option>
                  {segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {loadingPreview && <p className="text-xs text-gray-400 mt-1">Loading…</p>}
                {segmentPreview && !loadingPreview && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {segmentPreview.total} clients in segment — <span className="font-medium text-green-600">{segmentPreview.withPhone} have phone numbers</span>
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Message *</label>
                  <CharCounter text={form.message} />
                </div>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={5}
                  placeholder="Type your SMS message here…"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => { setShowCreate(false); setError(''); setSegmentPreview(null); }}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{detail.broadcast?.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {detail.broadcast?.segment_name || 'All clients'} &middot; {fmt(detail.broadcast?.sent_at || detail.broadcast?.created_at)}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            {detailLoading ? (
              <div className="p-8 text-center text-gray-400">Loading…</div>
            ) : (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700">
                  {[
                    { label: 'Total', value: detail.broadcast?.total_recipients || 0 },
                    { label: 'Sent', value: detail.broadcast?.sent_count || 0, cls: 'text-green-600' },
                    { label: 'Failed', value: detail.broadcast?.failed_count || 0, cls: 'text-red-500' },
                    { label: 'Pending', value: (detail.recipients || []).filter(r => r.status === 'pending').length, cls: 'text-yellow-600' },
                  ].map(s => (
                    <div key={s.label} className="p-4 text-center">
                      <div className={`text-xl font-bold ${s.cls || 'text-gray-900 dark:text-white'}`}>{s.value}</div>
                      <div className="text-xs text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Message preview */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Message</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{detail.broadcast?.message}</p>
                </div>

                {/* Recipients table */}
                <div className="overflow-y-auto flex-1">
                  {(detail.recipients || []).length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">No recipient records yet.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          {['Name', 'Phone', 'Status', 'Sent At', 'Error'].map(h => (
                            <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {detail.recipients.map(r => (
                          <tr key={r.id}>
                            <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{r.name || '—'}</td>
                            <td className="px-4 py-2 text-gray-500 font-mono text-xs">{r.phone}</td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || STATUS_COLORS.draft}`}>{r.status}</span>
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-400">{fmt(r.sent_at)}</td>
                            <td className="px-4 py-2 text-xs text-red-500">{r.error_message || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
