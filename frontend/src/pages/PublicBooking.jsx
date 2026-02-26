import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { bookingAPI } from '../services/api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmt12(time24) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function PublicBooking() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [step, setStep] = useState('pick-date'); // pick-date | pick-time | form | success
  const [form, setForm] = useState({ client_name: '', client_email: '', client_message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  useEffect(() => {
    bookingAPI.getPublicPage(slug)
      .then(res => setPage(res.data.data))
      .catch(() => setError('Booking page not found.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const fetchSlots = async (date) => {
    setSlotsLoading(true); setSlots([]);
    try {
      const res = await bookingAPI.getSlots(slug, date.toISOString().slice(0, 10));
      setSlots(res.data.data || []);
    } catch { setSlots([]); } finally { setSlotsLoading(false); }
  };

  const selectDate = (d) => {
    setSelectedDate(d);
    setSelectedSlot(null);
    fetchSlots(d);
    setStep('pick-time');
  };

  const selectSlot = (slot) => {
    setSelectedSlot(slot);
    setStep('form');
  };

  const handleBook = async () => {
    if (!form.client_name || !form.client_email) return;
    setSubmitting(true);
    try {
      const res = await bookingAPI.createBooking(slug, { ...form, start_time: selectedSlot });
      setBookingResult(res.data.data);
      setStep('success');
    } catch (e) { setError(e.response?.data?.message || 'Failed to book. Please try again.'); } finally { setSubmitting(false); }
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isAvailable = (d) => {
    if (!page || !d) return false;
    const date = new Date(year, month, d);
    if (date < today) return false;
    const dayOfWeek = date.getDay();
    return (page.available_days || [1, 2, 3, 4, 5]).includes(dayOfWeek);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Loading…</div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="text-4xl mb-3">😕</div><p className="text-gray-600">{error}</p></div></div>;
  if (!page) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 text-center">
          <div className="text-3xl mb-2">🗓️</div>
          <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
          {page.description && <p className="text-gray-600 mt-2">{page.description}</p>}
          <div className="flex items-center justify-center gap-4 mt-3 text-sm text-gray-500">
            <span>⏱ {page.duration_minutes} minutes</span>
            <span>🌐 {page.timezone}</span>
          </div>
        </div>

        {/* Step: Pick Date */}
        {step === 'pick-date' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-2 rounded hover:bg-gray-100">‹</button>
              <h2 className="font-semibold text-gray-800">{MONTHS[month]} {year}</h2>
              <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-2 rounded hover:bg-gray-100">›</button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => (
                <button key={i} onClick={() => d && isAvailable(d) && selectDate(new Date(year, month, d))}
                  disabled={!d || !isAvailable(d)}
                  className={`h-10 rounded-lg text-sm font-medium transition-colors ${!d ? '' : isAvailable(d) ? 'hover:bg-blue-600 hover:text-white text-gray-800 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Pick Time */}
        {step === 'pick-time' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep('pick-date')} className="text-blue-600 text-sm hover:underline">← Back</button>
              <h2 className="font-semibold text-gray-800">{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
            </div>
            {slotsLoading ? (
              <div className="text-center py-6 text-gray-500">Loading slots…</div>
            ) : slots.length === 0 ? (
              <div className="text-center py-6 text-gray-500">No available slots on this date.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot, i) => (
                  <button key={i} onClick={() => selectSlot(slot)}
                    className="py-2 px-3 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 text-sm font-medium transition-colors">
                    {fmt12(slot.slice(11, 16))}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Form */}
        {step === 'form' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep('pick-time')} className="text-blue-600 text-sm hover:underline">← Back</button>
              <div>
                <h2 className="font-semibold text-gray-800">Your Details</h2>
                <p className="text-sm text-gray-500">{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedSlot ? fmt12(selectedSlot.slice(11, 16)) : ''}</p>
              </div>
            </div>
            <div className="space-y-3">
              {error && <div className="text-red-600 text-sm bg-red-50 rounded p-2">{error}</div>}
              <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Your name *" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <input type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} placeholder="Your email *" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <textarea value={form.client_message} onChange={e => setForm(f => ({ ...f, client_message: e.target.value }))} placeholder="Additional notes (optional)" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
              <button onClick={handleBook} disabled={submitting || !form.client_name || !form.client_email} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                {submitting ? 'Booking…' : `Confirm Booking — ${page.duration_minutes} min`}
              </button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-4">A confirmation has been sent to your email.</p>
            {bookingResult && (
              <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-700 mb-6">
                <div className="font-medium mb-1">{page.title}</div>
                <div>{new Date(bookingResult.start_time).toLocaleString()}</div>
                <div>{bookingResult.client_name} · {bookingResult.client_email}</div>
              </div>
            )}
            <button onClick={() => { setStep('pick-date'); setSelectedDate(null); setSelectedSlot(null); setForm({ client_name: '', client_email: '', client_message: '' }); setBookingResult(null); }} className="text-blue-600 text-sm hover:underline">Book another time</button>
          </div>
        )}
      </div>
    </div>
  );
}
