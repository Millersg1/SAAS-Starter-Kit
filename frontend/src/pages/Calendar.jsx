import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { calendarAPI, googleCalendarAPI } from '../services/api';

const EVENT_TYPES = {
  meeting: { label: 'Meeting', color: 'bg-blue-500' },
  call: { label: 'Call', color: 'bg-green-500' },
  deadline: { label: 'Deadline', color: 'bg-red-500' },
  followup: { label: 'Follow-up', color: 'bg-yellow-500' },
  other: { label: 'Other', color: 'bg-purple-500' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function fmt(dt) {
  return dt ? new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
}

function toLocalInput(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function Calendar() {
  const { activeBrandId } = useAuth();
  const location = useLocation();
  const [today] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', location: '', event_type: 'meeting',
    start_time: '', end_time: '', all_day: false, reminder_minutes: 30,
  });
  const [googleConn, setGoogleConn] = useState(null);
  const [gcSyncing, setGcSyncing] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!activeBrandId) return;
    setLoading(true);
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).toISOString();
    const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
    try {
      const res = await calendarAPI.getEvents(activeBrandId, { start, end });
      setEvents(res.data.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [activeBrandId, viewDate]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Load Google Calendar connection
  useEffect(() => {
    if (!activeBrandId) return;
    googleCalendarAPI.getConnection(activeBrandId)
      .then(r => setGoogleConn(r.data.data))
      .catch(() => {});
  }, [activeBrandId]);

  // Handle OAuth return redirect (?google=connected or ?error=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('google') === 'connected') {
      googleCalendarAPI.getConnection(activeBrandId).then(r => setGoogleConn(r.data.data)).catch(() => {});
      window.history.replaceState({}, '', '/calendar');
    }
  }, [location.search, activeBrandId]);

  const handleGoogleConnect = async () => {
    try {
      const res = await googleCalendarAPI.initiateAuth(activeBrandId);
      window.location.href = res.data.data.url;
    } catch (e) { setError(e.response?.data?.message || 'Failed to connect Google Calendar'); }
  };

  const handleGoogleSync = async () => {
    setGcSyncing(true);
    try {
      await googleCalendarAPI.syncNow(activeBrandId);
      fetchEvents();
    } catch (e) { setError(e.response?.data?.message || 'Sync failed'); }
    finally { setGcSyncing(false); }
  };

  const handleGoogleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Calendar?')) return;
    try {
      await googleCalendarAPI.disconnect(activeBrandId);
      setGoogleConn({ connected: false });
    } catch { /* silent */ }
  };

  const openNew = (date) => {
    const d = date || new Date();
    const start = new Date(d.setHours(9, 0, 0, 0));
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setEditing(null);
    setForm({ title: '', description: '', location: '', event_type: 'meeting', start_time: toLocalInput(start), end_time: toLocalInput(end), all_day: false, reminder_minutes: 30 });
    setShowModal(true);
  };

  const openEdit = (ev) => {
    setEditing(ev);
    setForm({ title: ev.title, description: ev.description || '', location: ev.location || '', event_type: ev.event_type || 'meeting', start_time: toLocalInput(ev.start_time), end_time: toLocalInput(ev.end_time), all_day: ev.all_day || false, reminder_minutes: ev.reminder_minutes || 30 });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.start_time || !form.end_time) { setError('Title, start and end time are required.'); return; }
    setSaving(true); setError('');
    try {
      if (editing) {
        await calendarAPI.updateEvent(activeBrandId, editing.id, form);
      } else {
        await calendarAPI.createEvent(activeBrandId, form);
      }
      setShowModal(false);
      fetchEvents();
    } catch (e) { setError(e.response?.data?.message || 'Failed to save event.'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await calendarAPI.deleteEvent(activeBrandId, id);
      fetchEvents();
    } catch { /* silent */ }
    setShowModal(false);
  };

  // Build calendar grid
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsForDay = (d) => {
    if (!d) return [];
    return events.filter(ev => {
      const evDate = new Date(ev.start_time);
      return evDate.getFullYear() === year && evDate.getMonth() === month && evDate.getDate() === d;
    });
  };

  const isToday = (d) => d && today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
        <div className="flex items-center gap-2">
          {/* Google Calendar connect/sync */}
          {googleConn?.connected ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                Google Calendar
                {googleConn.last_synced_at && <span className="text-gray-400"> · {new Date(googleConn.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
              </span>
              <button onClick={handleGoogleSync} disabled={gcSyncing} className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50">
                {gcSyncing ? 'Syncing…' : '↻ Sync'}
              </button>
              <button onClick={handleGoogleDisconnect} className="text-xs text-red-500 hover:underline">Disconnect</button>
            </div>
          ) : (
            <button onClick={handleGoogleConnect} className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 flex items-center gap-1">
              <span>🗓</span> Connect Google Calendar
            </button>
          )}
          <button onClick={() => openNew()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">+ New Event</button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">‹</button>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 min-w-[160px] text-center">{MONTHS[month]} {year}</h2>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">›</button>
        <button onClick={() => setViewDate(new Date())} className="text-sm text-blue-600 dark:text-blue-400 hover:underline ml-2">Today</button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 flex-wrap">
        {Object.entries(EVENT_TYPES).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
            <span className={`w-2.5 h-2.5 rounded-full ${v.color}`} />{v.label}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const dayEvents = eventsForDay(d);
              return (
                <div
                  key={i}
                  onClick={() => d && openNew(new Date(year, month, d))}
                  className={`min-h-[90px] p-1 border-b border-r border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 ${!d ? 'bg-gray-50 dark:bg-gray-850' : ''}`}
                >
                  {d && (
                    <>
                      <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday(d) ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}>{d}</div>
                      {dayEvents.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                          className={`text-xs text-white px-1 py-0.5 rounded mb-0.5 truncate ${EVENT_TYPES[ev.event_type]?.color || 'bg-blue-500'} cursor-pointer hover:opacity-80`}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">+{dayEvents.length - 3} more</div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">{editing ? 'Edit Event' : 'New Event'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded p-2">{error}</div>}
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title *" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Start *</label>
                  <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">End *</label>
                  <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location (optional)" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white resize-none" />
            </div>
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
              {editing ? (
                <button onClick={() => handleDelete(editing.id)} className="text-red-600 text-sm hover:underline">Delete</button>
              ) : <span />}
              <div className="flex gap-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
