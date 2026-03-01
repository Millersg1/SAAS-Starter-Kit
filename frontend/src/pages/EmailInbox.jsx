import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { brandAPI, clientAPI, emailAPI, emailConnectionAPI } from '../services/api';

const timeAgo = (date) => {
  const d = new Date(date);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
};

const snippet = (text, len = 80) => {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > len ? clean.slice(0, len) + '…' : clean;
};

export default function EmailInbox() {
  const [brandId, setBrandId]           = useState(null);
  const [threads, setThreads]           = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [emails, setEmails]             = useState([]);
  const [clients, setClients]           = useState([]);
  const [connections, setConnections]   = useState([]);
  const [clientFilter, setClientFilter] = useState('');
  const [loading, setLoading]           = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText]       = useState('');
  const [sending, setSending]           = useState(false);
  const [connectionId, setConnectionId] = useState('');

  useEffect(() => {
    brandAPI.getUserBrands().then(res => {
      const brands = res.data.data?.brands || [];
      if (brands.length > 0) setBrandId(brands[0].id);
    });
  }, []);

  useEffect(() => {
    if (!brandId) return;
    loadThreads();
    clientAPI.getBrandClients(brandId).then(r => setClients(r.data.data?.clients || []));
    emailConnectionAPI.getConnections(brandId).then(r => {
      const conns = r.data.data?.connections || [];
      setConnections(conns);
      if (conns.length > 0) setConnectionId(conns[0].id);
    });
  }, [brandId]);

  const loadThreads = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      const params = {};
      if (clientFilter) params.client_id = clientFilter;
      const res = await emailAPI.getThreads(brandId, params);
      setThreads(res.data.data?.threads || []);
    } finally {
      setLoading(false);
    }
  }, [brandId, clientFilter]);

  useEffect(() => { if (brandId) loadThreads(); }, [brandId, clientFilter]);

  const openThread = async (thread) => {
    setSelectedThread(thread);
    setThreadLoading(true);
    setReplyText('');
    try {
      const res = await emailAPI.getThread(brandId, thread.thread_id);
      setEmails(res.data.data?.emails || []);
      // Update unread count in thread list
      setThreads(prev => prev.map(t =>
        t.thread_id === thread.thread_id ? { ...t, unread_count: 0 } : t
      ));
    } finally {
      setThreadLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedThread || !connectionId) return;
    setSending(true);
    try {
      await emailAPI.sendReply(brandId, selectedThread.thread_id, {
        body_text: replyText,
        connection_id: connectionId,
      });
      setReplyText('');
      // Refresh the thread
      const res = await emailAPI.getThread(brandId, selectedThread.thread_id);
      setEmails(res.data.data?.emails || []);
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Inbox</h1>
            <p className="text-sm text-gray-500 mt-1">Threaded email conversations with your clients</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
            <div className="text-5xl mb-4">📨</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No email threads yet</h3>
            <p className="text-gray-500 text-sm mb-2">Connect an email account and sync to see threaded conversations</p>
            <a href="/email-connections" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Go to Email Connections →
            </a>
          </div>
        ) : (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Thread List */}
            <div className="w-80 flex-shrink-0 overflow-y-auto space-y-1 border-r border-gray-200 pr-4">
              {threads.map(t => (
                <div
                  key={t.thread_id}
                  onClick={() => openThread(t)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    selectedThread?.thread_id === t.thread_id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`text-sm leading-tight ${t.unread_count > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {t.client_name || t.from_name || t.from_address}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(t.last_message_at)}</span>
                  </div>
                  <p className={`text-xs mb-1 ${t.unread_count > 0 ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                    {t.subject || '(no subject)'}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 truncate">{snippet(t.snippet, 60)}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {t.message_count > 1 && (
                        <span className="text-xs text-gray-400">{t.message_count}</span>
                      )}
                      {t.unread_count > 0 && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Thread Detail */}
            {selectedThread ? (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Thread header */}
                <div className="pb-3 mb-3 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedThread.subject || '(no subject)'}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedThread.client_name || selectedThread.from_address} · {emails.length} message{emails.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {threadLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                ) : (
                  <>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                      {emails.map(email => (
                        <div key={email.id} className={`rounded-xl border p-4 ${
                          email.direction === 'outbound'
                            ? 'bg-blue-50 border-blue-200 ml-8'
                            : 'bg-white border-gray-200 mr-8'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                email.direction === 'outbound' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {email.direction === 'outbound' ? '→ Sent' : '← Received'}
                              </span>
                              <span className="text-sm font-medium text-gray-800">
                                {email.from_name || email.from_address}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(email.sent_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mb-2">
                            <span>To: {email.to_addresses}</span>
                            {email.cc_addresses && <span className="ml-2">CC: {email.cc_addresses}</span>}
                          </div>
                          {email.body_html ? (
                            <div
                              className="prose prose-sm max-w-none text-gray-700"
                              dangerouslySetInnerHTML={{ __html: email.body_html }}
                            />
                          ) : (
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                              {email.body_text || '(empty)'}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Reply Box */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {connections.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center">
                          No email connection with SMTP configured.{' '}
                          <a href="/email-connections" className="text-blue-600 hover:underline">Set up SMTP →</a>
                        </p>
                      ) : (
                        <>
                          {connections.length > 1 && (
                            <select
                              value={connectionId}
                              onChange={e => setConnectionId(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {connections.map(c => (
                                <option key={c.id} value={c.id}>{c.email_address} ({c.provider})</option>
                              ))}
                            </select>
                          )}
                          <div className="flex gap-2">
                            <textarea
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              rows={3}
                              placeholder="Type your reply…"
                              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              onKeyDown={e => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendReply();
                              }}
                            />
                            <button
                              onClick={handleSendReply}
                              disabled={!replyText.trim() || sending}
                              className="self-end bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                            >
                              {sending ? 'Sending…' : 'Send'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Ctrl+Enter to send</p>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Select a thread to view the conversation
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
