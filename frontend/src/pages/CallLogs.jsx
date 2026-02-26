import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { callLogAPI, clientAPI, brandAPI, voipAPI } from '../services/api';

const OUTCOMES = ['answered', 'voicemail', 'no-answer', 'busy'];
const EMPTY = { client_id: '', direction: 'outbound', phone_number: '', duration_seconds: 0, outcome: 'answered', notes: '', called_at: new Date().toISOString().slice(0, 16) };

export default function CallLogs() {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [logs, setLogs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [calling, setCalling] = useState(false);
  const [callForm, setCallForm] = useState({ to: '', client_id: '' });
  const [showCallModal, setShowCallModal] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    brandAPI.getUserBrands().then(r => {
      const b = r.data.data?.brands || [];
      setBrands(b);
      if (b.length) setSelectedBrand(b[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedBrand) { fetchLogs(); fetchClients(); }
  }, [selectedBrand]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const r = await callLogAPI.list(selectedBrand.id);
      setLogs(r.data.data?.logs || []);
    } catch { setError('Failed to load call logs'); }
    finally { setLoading(false); }
  };

  const fetchClients = async () => {
    try {
      const r = await clientAPI.getBrandClients(selectedBrand.id, {});
      setClients(r.data.data?.clients || []);
    } catch { /* non-critical */ }
  };

  const openNew = () => { setEditingLog(null); setForm({ ...EMPTY, called_at: new Date().toISOString().slice(0, 16) }); setShowModal(true); };
  const openEdit = (log) => { setEditingLog(log); setForm({ client_id: log.client_id || '', direction: log.direction, phone_number: log.phone_number || '', duration_seconds: log.duration_seconds || 0, outcome: log.outcome || 'answered', notes: log.notes || '', called_at: new Date(log.called_at).toISOString().slice(0, 16) }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingLog) {
        await callLogAPI.update(selectedBrand.id, editingLog.id, form);
      } else {
        await callLogAPI.create(selectedBrand.id, form);
      }
      setShowModal(false);
      fetchLogs();
    } catch (err) { setError(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (logId) => {
    if (!confirm('Delete this call log?')) return;
    try { await callLogAPI.remove(selectedBrand.id, logId); fetchLogs(); }
    catch { setError('Delete failed'); }
  };

  const handleVoipCall = async () => {
    if (!callForm.to) { setError('Enter a phone number to call'); return; }
    setCalling(true); setError('');
    try {
      await voipAPI.initiateCall(selectedBrand.id, callForm);
      setShowCallModal(false);
      setCallForm({ to: '', client_id: '' });
      setTimeout(fetchLogs, 2000);
    } catch (err) { setError(err.response?.data?.message || 'Call failed'); }
    finally { setCalling(false); }
  };

  const fmtDuration = (s) => {
    if (!s) return '—';
    const m = Math.floor(s / 60); const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const outcomeColor = { answered: 'bg-green-100 text-green-800', voicemail: 'bg-yellow-100 text-yellow-800', 'no-answer': 'bg-red-100 text-red-800', busy: 'bg-orange-100 text-orange-800' };

  if (!selectedBrand) return <Layout><div className="flex justify-center items-center h-64 text-gray-500">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
            <p className="text-gray-500 text-sm mt-1">Track inbound and outbound calls</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCallModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">📞 Call</button>
            <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">+ Log a Call</button>
          </div>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">{error}</div>}

        {brands.length > 1 && (
          <select value={selectedBrand.id} onChange={e => setSelectedBrand(brands.find(b => b.id === e.target.value))} className="mb-4 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900">
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64 text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-3">📞</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No call logs yet</h3>
            <p className="text-gray-500 mb-4">Start logging your client calls</p>
            <button onClick={openNew} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Log First Call</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${log.direction === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {log.direction === 'inbound' ? '↙' : '↗'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{log.client_name || log.phone_number || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{new Date(log.called_at).toLocaleString()} · {fmtDuration(log.duration_seconds)}</p>
                  {log.notes && <p className="text-xs text-gray-500 truncate mt-0.5">{log.notes}</p>}
                  {log.recording_url && (
                    <div className="mt-1">
                      <audio controls src={`${log.recording_url}.mp3`} className="h-7 w-48" />
                    </div>
                  )}
                  {log.transcription_status === 'processing' && <p className="text-xs text-yellow-600 mt-0.5">⏳ Transcribing…</p>}
                  {log.transcript && (
                    <div className="mt-1">
                      <button onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)} className="text-xs text-blue-600 hover:underline">
                        {expandedLog === log.id ? '▲ Hide transcript' : '▼ Show transcript'}
                      </button>
                      {expandedLog === log.id && (
                        <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded p-2 max-w-md">{log.transcript}</p>
                      )}
                    </div>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${outcomeColor[log.outcome] || 'bg-gray-100 text-gray-700'}`}>{log.outcome || '—'}</span>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(log)} className="text-gray-400 hover:text-blue-600 text-sm">✏️</button>
                  <button onClick={() => handleDelete(log.id)} className="text-gray-400 hover:text-red-600 text-sm">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">{editingLog ? 'Edit Call Log' : 'Log a Call'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                  <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900">
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                  <select value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900">
                    {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900">
                  <option value="">— None —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900" placeholder="+1 555 000 0000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (seconds)</label>
                  <input type="number" min="0" value={form.duration_seconds} onChange={e => setForm(f => ({ ...f, duration_seconds: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                  <input type="datetime-local" value={form.called_at} onChange={e => setForm(f => ({ ...f, called_at: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 resize-none" placeholder="What was discussed?" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">{saving ? 'Saving...' : editingLog ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* VoIP Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">Make a Call via Twilio</h2>
            {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input type="tel" value={callForm.to} onChange={e => setCallForm(f => ({ ...f, to: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="+1 555 000 0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to Client (optional)</label>
                <select value={callForm.client_id} onChange={e => setCallForm(f => ({ ...f, client_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">— None —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Requires Twilio to be connected. The call will be recorded automatically.</p>
            <div className="flex gap-3 justify-end pt-4">
              <button type="button" onClick={() => setShowCallModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleVoipCall} disabled={calling} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">{calling ? 'Calling…' : '📞 Call Now'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
