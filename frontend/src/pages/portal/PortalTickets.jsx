import { useState, useEffect, useCallback } from 'react';
import portalApi from '../../services/portalApi';

const STATUS_COLORS = {
  open: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-gray-100 text-gray-600',
  closed: 'bg-gray-200 text-gray-500',
};

function relTime(dt) {
  const diff = Date.now() - new Date(dt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PortalTickets() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list | detail | new
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ subject: '', body: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await portalApi.get('/portal/tickets');
      setTickets(res.data.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const openTicket = async (ticket) => {
    setSelected(ticket);
    setView('detail');
    try {
      const res = await portalApi.get(`/portal/tickets/${ticket.id}`);
      setSelected(res.data.data.ticket);
      setMessages(res.data.data.messages || []);
    } catch { /* silent */ }
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !selected) return;
    setReplying(true); setError('');
    try {
      await portalApi.post(`/portal/tickets/${selected.id}/reply`, { body: replyBody });
      setReplyBody('');
      // Refresh messages
      const res = await portalApi.get(`/portal/tickets/${selected.id}`);
      setMessages(res.data.data.messages || []);
    } catch (e) { setError(e.response?.data?.message || 'Failed to send.'); } finally { setReplying(false); }
  };

  const handleCreate = async () => {
    if (!newForm.subject || !newForm.body) { setError('Subject and message are required.'); return; }
    setCreating(true); setError('');
    try {
      await portalApi.post('/portal/tickets', newForm);
      setShowNew(false);
      setNewForm({ subject: '', body: '' });
      fetchTickets();
    } catch (e) { setError(e.response?.data?.message || 'Failed to create ticket.'); } finally { setCreating(false); }
  };

  if (view === 'detail' && selected) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => { setView('list'); setSelected(null); setMessages([]); }} className="text-blue-600 text-sm hover:underline mb-4 flex items-center gap-1">← Back to Tickets</button>
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{selected.subject}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">{selected.ticket_number}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {messages.filter(m => !m.is_internal).map(msg => (
            <div key={msg.id} className={`rounded-xl p-4 border ${msg.sender_type === 'client' ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">{msg.sender_type === 'client' ? 'You' : 'Support Team'}</span>
                <span className="text-xs text-gray-400">{relTime(msg.created_at)}</span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}
        </div>

        {selected.status !== 'closed' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Reply</h3>
            {error && <div className="text-red-600 text-sm bg-red-50 rounded p-2 mb-3">{error}</div>}
            <textarea value={replyBody} onChange={e => setReplyBody(e.target.value)} placeholder="Type your message…" rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none mb-3" />
            <button onClick={handleReply} disabled={replying || !replyBody.trim()} className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
              {replying ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <button onClick={() => { setShowNew(true); setError(''); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">+ New Ticket</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🎫</div>
          <p className="text-gray-500">No tickets yet. Create one if you need help.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <button key={t.id} onClick={() => openTicket(t)} className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{t.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.ticket_number}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                  <span className="text-xs text-gray-400">{relTime(t.updated_at || t.created_at)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New Ticket Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">New Support Ticket</h3>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="text-red-600 text-sm bg-red-50 rounded p-2">{error}</div>}
              <input value={newForm.subject} onChange={e => setNewForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject *" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <textarea value={newForm.body} onChange={e => setNewForm(f => ({ ...f, body: e.target.value }))} placeholder="Describe your issue… *" rows={5} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{creating ? 'Submitting…' : 'Submit Ticket'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
