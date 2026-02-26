import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketAPI } from '../services/api';

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const STATUS_COLORS = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  resolved: 'bg-gray-100 text-gray-600',
  closed: 'bg-gray-200 text-gray-500',
};

function fmtDate(dt) {
  return new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function TicketDetails() {
  const { ticketId } = useParams();
  const { activeBrandId, user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [replying, setReplying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState('');

  const fetchTicket = useCallback(async () => {
    if (!activeBrandId || !ticketId) return;
    try {
      const res = await ticketAPI.getTicket(activeBrandId, ticketId);
      setTicket(res.data.data.ticket);
      setMessages(res.data.data.messages || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [activeBrandId, ticketId]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  const handleReply = async () => {
    if (!replyBody.trim()) return;
    setReplying(true); setError('');
    try {
      await ticketAPI.replyTicket(activeBrandId, ticketId, { body: replyBody, is_internal: isInternal });
      setReplyBody('');
      setIsInternal(false);
      fetchTicket();
    } catch (e) { setError(e.response?.data?.message || 'Failed to send reply.'); } finally { setReplying(false); }
  };

  const handleUpdateStatus = async (status) => {
    setUpdatingStatus(true);
    try {
      await ticketAPI.updateTicket(activeBrandId, ticketId, { status });
      setTicket(t => ({ ...t, status }));
    } catch { /* silent */ } finally { setUpdatingStatus(false); }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading…</div>;
  if (!ticket) return <div className="p-6 text-center text-gray-500">Ticket not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <Link to="/tickets" className="hover:text-blue-600">Tickets</Link>
        <span>/</span>
        <span>{ticket.ticket_number}</span>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{ticket.subject}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400">{ticket.ticket_number}</span>
              {ticket.client_name && <span className="text-xs text-gray-500 dark:text-gray-400">· {ticket.client_name}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status]}`}>{ticket.status}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {ticket.status !== 'resolved' && (
              <button onClick={() => handleUpdateStatus('resolved')} disabled={updatingStatus} className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">Mark Resolved</button>
            )}
            {ticket.status !== 'closed' && (
              <button onClick={() => handleUpdateStatus('closed')} disabled={updatingStatus} className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">Close</button>
            )}
            {(ticket.status === 'resolved' || ticket.status === 'closed') && (
              <button onClick={() => handleUpdateStatus('open')} disabled={updatingStatus} className="text-sm px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50">Reopen</button>
            )}
          </div>
        </div>
      </div>

      {/* Message Thread */}
      <div className="space-y-3 mb-5">
        {messages.map(msg => (
          <div key={msg.id} className={`rounded-xl p-4 border ${msg.is_internal ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800' : msg.sender_type === 'agency' ? 'border-blue-100 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800' : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {msg.sender_type === 'agency' ? (msg.sender_name || 'Agency') : (msg.sender_name || 'Client')}
                </span>
                {msg.is_internal && <span className="text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full">Internal Note</span>}
              </div>
              <span className="text-xs text-gray-400">{fmtDate(msg.created_at)}</span>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{msg.body}</p>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">No messages yet. Add a reply below.</div>
        )}
      </div>

      {/* Reply Box */}
      {ticket.status !== 'closed' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">Reply</h3>
          {error && <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded p-2 mb-3">{error}</div>}
          <textarea
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder="Type your reply…"
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white resize-none mb-3"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="rounded" />
              Internal note (not sent to client)
            </label>
            <button onClick={handleReply} disabled={replying || !replyBody.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {replying ? 'Sending…' : 'Send Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
