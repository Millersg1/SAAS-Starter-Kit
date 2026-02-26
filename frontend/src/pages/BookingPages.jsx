import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI } from '../services/api';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BookingPages() {
  const { activeBrandId } = useAuth();
  const [pages, setPages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pages');
  const [copied, setCopied] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', duration_minutes: 30,
    available_days: [1, 2, 3, 4, 5],
    day_start_time: '09:00', day_end_time: '17:00',
    timezone: 'America/New_York', buffer_minutes: 0, is_active: true,
  });

  const publicBase = window.location.origin;

  const fetchPages = useCallback(async () => {
    if (!activeBrandId) return;
    setLoading(true);
    try {
      const res = await bookingAPI.getPages(activeBrandId);
      setPages(res.data.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [activeBrandId]);

  const fetchBookings = useCallback(async () => {
    if (!activeBrandId) return;
    try {
      const res = await bookingAPI.getBookings(activeBrandId);
      setBookings(res.data.data || []);
    } catch { /* silent */ }
  }, [activeBrandId]);

  useEffect(() => {
    fetchPages();
    fetchBookings();
  }, [fetchPages, fetchBookings]);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', duration_minutes: 30, available_days: [1, 2, 3, 4, 5], day_start_time: '09:00', day_end_time: '17:00', timezone: 'America/New_York', buffer_minutes: 0, is_active: true });
    setError('');
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ title: p.title, description: p.description || '', duration_minutes: p.duration_minutes, available_days: p.available_days || [1, 2, 3, 4, 5], day_start_time: p.day_start_time?.slice(0, 5) || '09:00', day_end_time: p.day_end_time?.slice(0, 5) || '17:00', timezone: p.timezone || 'America/New_York', buffer_minutes: p.buffer_minutes || 0, is_active: p.is_active });
    setError('');
    setShowModal(true);
  };

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      available_days: f.available_days.includes(day)
        ? f.available_days.filter(d => d !== day)
        : [...f.available_days, day].sort(),
    }));
  };

  const handleSave = async () => {
    if (!form.title) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      if (editing) {
        await bookingAPI.updatePage(activeBrandId, editing.id, form);
      } else {
        await bookingAPI.createPage(activeBrandId, form);
      }
      setShowModal(false);
      fetchPages();
    } catch (e) { setError(e.response?.data?.message || 'Failed to save.'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this booking page?')) return;
    try {
      await bookingAPI.deletePage(activeBrandId, id);
      fetchPages();
    } catch { /* silent */ }
  };

  const copyLink = (slug) => {
    navigator.clipboard.writeText(`${publicBase}/book/${slug}`).then(() => {
      setCopied(slug);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const statusColor = (s) => ({ confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' }[s] || 'bg-gray-100 text-gray-700');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Pages</h1>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">+ New Booking Page</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {['pages', 'bookings'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{t}</button>
        ))}
      </div>

      {activeTab === 'pages' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading…</div>
          ) : pages.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🗓️</div>
              <p className="text-gray-500 dark:text-gray-400">No booking pages yet. Create one to share a scheduling link with clients.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pages.map(p => (
                <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{p.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.duration_minutes} min · {p.timezone}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500'}`}>{p.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  {p.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{p.description}</p>}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {(p.available_days || []).map(d => DAYS_OF_WEEK[d]).join(', ')} · {p.day_start_time?.slice(0, 5)} – {p.day_end_time?.slice(0, 5)}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => copyLink(p.slug)} className={`flex-1 text-xs py-1.5 rounded border ${copied === p.slug ? 'border-green-500 text-green-600' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'} hover:bg-gray-50 dark:hover:bg-gray-700`}>
                      {copied === p.slug ? '✓ Copied!' : '🔗 Copy Link'}
                    </button>
                    <button onClick={() => openEdit(p)} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="px-3 py-1.5 text-xs border border-red-200 dark:border-red-800 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20">Del</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'bookings' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {bookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">No bookings yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>{['Client', 'Email', 'Page', 'Time', 'Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.client_name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.client_email}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.page_title || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{new Date(b.start_time).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(b.status)}`}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">{editing ? 'Edit Booking Page' : 'New Booking Page'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded p-2">{error}</div>}
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Page title *" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (shown to clients)" rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Duration (minutes)</label>
                  <select value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: +e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                    {[15, 30, 45, 60, 90, 120].map(v => <option key={v} value={v}>{v} min</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Buffer (minutes)</label>
                  <select value={form.buffer_minutes} onChange={e => setForm(f => ({ ...f, buffer_minutes: +e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                    {[0, 5, 10, 15, 30].map(v => <option key={v} value={v}>{v} min</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Available Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map((d, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)} className={`px-3 py-1 rounded text-xs border ${form.available_days.includes(i) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Day Start</label>
                  <input type="time" value={form.day_start_time} onChange={e => setForm(f => ({ ...f, day_start_time: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Day End</label>
                  <input type="time" value={form.day_end_time} onChange={e => setForm(f => ({ ...f, day_end_time: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Timezone</label>
                <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                  {['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'Pacific/Honolulu', 'UTC'].map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                Active (visible to clients)
              </label>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
