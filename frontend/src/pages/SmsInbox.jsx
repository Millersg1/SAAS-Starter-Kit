import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { smsAPI, clientAPI } from '../services/api';

export default function SmsInbox() {
  const { activeBrandId } = useAuth();
  const [connection, setConnection] = useState(null);
  const [connLoading, setConnLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({ account_sid: '', auth_token: '', phone_number: '' });
  const [savingSetup, setSavingSetup] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchConnection = useCallback(async () => {
    if (!activeBrandId) return;
    setConnLoading(true);
    try {
      const res = await smsAPI.getConnection(activeBrandId);
      setConnection(res.data.data.connection);
    } catch { /* silent */ } finally { setConnLoading(false); }
  }, [activeBrandId]);

  const fetchConversations = useCallback(async () => {
    if (!activeBrandId) return;
    try {
      const res = await smsAPI.getConversations(activeBrandId);
      setConversations(res.data.data.conversations || []);
    } catch { /* silent */ }
  }, [activeBrandId]);

  useEffect(() => {
    fetchConnection();
    fetchConversations();
    clientAPI.getBrandClients(activeBrandId).then(r => setClients(r.data.data?.clients || [])).catch(() => {});
  }, [fetchConnection, fetchConversations, activeBrandId]);

  useEffect(() => {
    if (selectedConvo) {
      setMsgLoading(true);
      smsAPI.getMessages(activeBrandId, selectedConvo.client_id || null)
        .then(r => setMessages(r.data.data.messages || []))
        .catch(() => {})
        .finally(() => setMsgLoading(false));
    }
  }, [selectedConvo, activeBrandId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveSetup = async () => {
    if (!setupForm.account_sid || !setupForm.auth_token || !setupForm.phone_number) {
      setError('All fields required.'); return;
    }
    setSavingSetup(true); setError('');
    try {
      await smsAPI.saveConnection(activeBrandId, setupForm);
      fetchConnection();
      setShowSetup(false);
    } catch (e) { setError(e.response?.data?.message || 'Failed to save.'); }
    finally { setSavingSetup(false); }
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedConvo) return;
    const to = selectedConvo.direction === 'inbound' ? selectedConvo.from_number : selectedConvo.to_number;
    setSending(true); setError('');
    try {
      const res = await smsAPI.sendMessage(activeBrandId, { to, body: text, client_id: selectedConvo.client_id || null });
      setMessages(m => [res.data.data.message, ...m]);
      setText('');
      fetchConversations();
    } catch (e) { setError(e.response?.data?.message || 'Failed to send.'); }
    finally { setSending(false); }
  };

  const handleNewMessage = async (clientId, phone) => {
    if (!text.trim()) return;
    setSending(true); setError('');
    try {
      await smsAPI.sendMessage(activeBrandId, { to: phone, body: text, client_id: clientId });
      setText('');
      fetchConversations();
    } catch (e) { setError(e.response?.data?.message || 'Failed to send.'); }
    finally { setSending(false); }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString();
  };

  if (connLoading) return <div className="p-6 text-gray-500">Loading…</div>;

  if (!connection) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SMS Inbox</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Send and receive SMS with clients via Twilio.</p>
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">📱</div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Connect Twilio to get started</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">You'll need a Twilio account, Account SID, Auth Token, and a phone number.</p>
          <button onClick={() => setShowSetup(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">Connect Twilio</button>
        </div>

        {showSetup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Twilio Configuration</h3>
              {error && <div className="text-red-600 text-sm bg-red-50 rounded p-2 mb-3">{error}</div>}
              <div className="space-y-3">
                <input value={setupForm.account_sid} onChange={e => setSetupForm(f => ({ ...f, account_sid: e.target.value }))} placeholder="Account SID (ACxxxxxxxx...)" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
                <input value={setupForm.auth_token} onChange={e => setSetupForm(f => ({ ...f, auth_token: e.target.value }))} placeholder="Auth Token" type="password" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
                <input value={setupForm.phone_number} onChange={e => setSetupForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="Twilio phone number (+1XXXXXXXXXX)" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowSetup(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:text-gray-300">Cancel</button>
                <button onClick={handleSaveSetup} disabled={savingSetup} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{savingSetup ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left panel: conversation list */}
      <div className="w-72 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="font-semibold text-sm text-gray-900 dark:text-white">SMS Inbox</span>
          <button onClick={() => setShowSetup(true)} title="Settings" className="text-gray-400 hover:text-gray-600 text-sm">⚙️</button>
        </div>
        <div className="overflow-y-auto flex-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No conversations yet</div>
          ) : (
            conversations.map((c, i) => {
              const phone = c.direction === 'inbound' ? c.from_number : c.to_number;
              const isSelected = selectedConvo?.id === c.id;
              return (
                <button key={i} onClick={() => setSelectedConvo(c)} className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{c.client_name || phone}</span>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">{formatTime(c.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{c.body}</p>
                </button>
              );
            })
          )}
        </div>

        {/* Quick-send to any client */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <select onChange={e => {
            const client = clients.find(c => c.id === e.target.value);
            if (client) setSelectedConvo({ direction: 'outbound', to_number: client.phone, client_id: client.id, client_name: client.name, body: '', created_at: new Date() });
            e.target.value = '';
          }} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white">
            <option value="">+ Message a client…</option>
            {clients.filter(c => c.phone).map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
          </select>
        </div>
      </div>

      {/* Right panel: message thread */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
        {!selectedConvo ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-gray-500 dark:text-gray-400">Select a conversation or start a new one</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <p className="font-medium text-gray-900 dark:text-white">
                {selectedConvo.client_name || (selectedConvo.direction === 'inbound' ? selectedConvo.from_number : selectedConvo.to_number)}
              </p>
              <p className="text-xs text-gray-400">{selectedConvo.direction === 'inbound' ? selectedConvo.from_number : selectedConvo.to_number}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgLoading ? (
                <div className="text-center text-gray-500 py-8">Loading…</div>
              ) : (
                [...messages].reverse().map(m => (
                  <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-sm px-3 py-2 rounded-2xl text-sm ${m.direction === 'outbound' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'}`}>
                      <p>{m.body}</p>
                      <p className={`text-xs mt-1 ${m.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'}`}>{formatTime(m.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {error && <div className="px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20">{error}</div>}

            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message…"
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              />
              <button onClick={handleSend} disabled={sending || !text.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                {sending ? '…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Setup modal */}
      {showSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Twilio Settings</h3>
            {error && <div className="text-red-600 text-sm bg-red-50 rounded p-2 mb-3">{error}</div>}
            <div className="space-y-3">
              <input value={setupForm.account_sid} onChange={e => setSetupForm(f => ({ ...f, account_sid: e.target.value }))} placeholder="Account SID" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              <input value={setupForm.auth_token} onChange={e => setSetupForm(f => ({ ...f, auth_token: e.target.value }))} placeholder="Auth Token" type="password" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              <input value={setupForm.phone_number} onChange={e => setSetupForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="+1XXXXXXXXXX" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowSetup(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:text-gray-300">Cancel</button>
              <button onClick={handleSaveSetup} disabled={savingSetup} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{savingSetup ? 'Saving…' : 'Update'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
