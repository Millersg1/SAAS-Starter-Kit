import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatWidgetAPI } from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_BASE = API_BASE.replace('/api', '');

const SESSION_STATUS_COLORS = {
  open:      'bg-green-100 text-green-700',
  closed:    'bg-gray-100 text-gray-500',
  converted: 'bg-blue-100 text-blue-700',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ brandId }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await chatWidgetAPI.getSettings(brandId);
      setSettings(res.data.settings);
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await chatWidgetAPI.saveSettings(brandId, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const embedCode = `<script src="${BACKEND_BASE}/api/chat-widget/widget.js" data-brand-id="${brandId}" async></script>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;
  if (!settings) return null;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Widget Config */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-800">Widget Settings</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Enable Chat Widget</p>
            <p className="text-xs text-gray-400">Show/hide the widget on all websites using your embed code</p>
          </div>
          <div
            className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors ${settings.is_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
            onClick={() => set('is_enabled', !settings.is_enabled)}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.is_enabled ? 'translate-x-5' : ''}`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Widget Name</label>
            <input
              type="text"
              value={settings.widget_name || ''}
              onChange={e => set('widget_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <div className="flex gap-2">
              {['right', 'left'].map(pos => (
                <button
                  key={pos}
                  onClick={() => set('position', pos)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors capitalize ${
                    settings.position === pos
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {pos === 'right' ? '⬇ Right' : 'Left ⬇'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Greeting Message</label>
          <input
            type="text"
            value={settings.greeting_message || ''}
            onChange={e => set('greeting_message', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Offline Message</label>
          <input
            type="text"
            value={settings.offline_message || ''}
            onChange={e => set('offline_message', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.primary_color || '#2563eb'}
              onChange={e => set('primary_color', e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
            />
            <input
              type="text"
              value={settings.primary_color || ''}
              onChange={e => set('primary_color', e.target.value)}
              className="w-36 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="#2563eb"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Collect Visitor Info</p>
            <p className="text-xs text-gray-400">Ask for name + email before the first message</p>
          </div>
          <div
            className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors ${settings.collect_email ? 'bg-blue-600' : 'bg-gray-300'}`}
            onClick={() => set('collect_email', !settings.collect_email)}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.collect_email ? 'translate-x-5' : ''}`} />
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">AI Responses</h3>
          <div
            className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors ${settings.ai_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
            onClick={() => set('ai_enabled', !settings.ai_enabled)}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.ai_enabled ? 'translate-x-5' : ''}`} />
          </div>
        </div>
        {settings.ai_enabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Knowledge Context
            </label>
            <textarea
              value={settings.ai_context || ''}
              onChange={e => set('ai_context', e.target.value)}
              rows={5}
              placeholder={"Tell the AI about your business so it can answer visitor questions.\n\nExample:\n- We offer landscaping services in Austin, TX\n- Monthly packages start at $199\n- To book, visit our website or call (512) 555-0100\n- We do not service outside the Austin metro area"}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">
              This context is injected into every AI reply. Include your services, pricing, hours, FAQs, and any constraints.
            </p>
          </div>
        )}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm"
      >
        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
      </button>

      {/* Embed Code */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Embed Code</h3>
        <p className="text-xs text-gray-500 mb-3">
          Paste this snippet before the closing <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> tag of your website (or your client's website).
        </p>
        <div className="bg-gray-900 rounded-lg p-4 flex items-start justify-between gap-3">
          <code className="text-green-400 text-xs font-mono break-all leading-relaxed">
            {embedCode}
          </code>
          <button
            onClick={copyEmbed}
            className="flex-shrink-0 px-3 py-1.5 bg-gray-700 text-gray-200 text-xs rounded-md hover:bg-gray-600 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 font-medium">🚀 That's it!</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Once the snippet is on the page, a chat bubble will appear. Visitors can start chatting immediately — all conversations appear in the Chat Inbox tab.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Inbox Tab ────────────────────────────────────────────────────────────────

function InboxTab({ brandId }) {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedSession?.messages]);

  const loadSessions = async () => {
    try {
      const res = await chatWidgetAPI.getSessions(brandId, {});
      setSessions(res.data.sessions || []);
    } finally {
      setLoading(false);
    }
  };

  const selectSession = async (session) => {
    setSelected(session.id);
    try {
      const res = await chatWidgetAPI.getSession(brandId, session.id);
      setSelectedSession(res.data.session);
    } catch {}
  };

  const handleClose = async () => {
    if (!selectedSession) return;
    await chatWidgetAPI.closeSession(brandId, selectedSession.id);
    setSelectedSession(s => ({ ...s, status: 'closed' }));
    setSessions(prev => prev.map(s => s.id === selectedSession.id ? { ...s, status: 'closed' } : s));
  };

  const handleConvert = async () => {
    if (!selectedSession || converting) return;
    try {
      setConverting(true);
      const res = await chatWidgetAPI.convertSession(brandId, selectedSession.id);
      setSelectedSession(s => ({ ...s, status: 'converted' }));
      setSessions(prev => prev.map(s => s.id === selectedSession.id ? { ...s, status: 'converted' } : s));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to convert');
    } finally {
      setConverting(false);
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || !selectedSession) return;
    setSending(true);
    try {
      const res = await chatWidgetAPI.replyAsAgent(brandId, selectedSession.id, { content: reply.trim() });
      setSelectedSession(s => ({ ...s, messages: [...(s.messages || []), res.data.message] }));
      setReply('');
    } finally {
      setSending(false);
    }
  };

  const filteredSessions = filter === 'all' ? sessions : sessions.filter(s => s.status === filter);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="flex h-[calc(100vh-160px)] bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Session list */}
      <div className="w-72 border-r border-gray-100 flex flex-col">
        {/* Filter tabs */}
        <div className="flex border-b border-gray-100 px-2 pt-2">
          {['all', 'open', 'converted'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-xs font-medium capitalize rounded-t transition-colors ${
                filter === f ? 'text-blue-700 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-gray-400">No conversations yet</p>
            </div>
          ) : (
            filteredSessions.map(session => (
              <div
                key={session.id}
                onClick={() => selectSession(session)}
                className={`px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 transition-colors ${
                  selected === session.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {session.visitor_name || session.visitor_email || 'Anonymous'}
                  </p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0 ${SESSION_STATUS_COLORS[session.status] || SESSION_STATUS_COLORS.open}`}>
                    {session.status}
                  </span>
                </div>
                {session.visitor_email && session.visitor_name && (
                  <p className="text-xs text-gray-400 truncate">{session.visitor_email}</p>
                )}
                {session.last_message && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{session.last_message}</p>
                )}
                <p className="text-xs text-gray-300 mt-1">{timeAgo(session.last_message_at)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conversation panel */}
      <div className="flex-1 flex flex-col">
        {!selectedSession ? (
          <div className="flex items-center justify-center flex-1 text-center p-6">
            <div>
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm text-gray-400">Select a conversation to view it</p>
            </div>
          </div>
        ) : (
          <>
            {/* Session header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {selectedSession.visitor_name || selectedSession.visitor_email || 'Anonymous Visitor'}
                </p>
                {selectedSession.visitor_email && selectedSession.visitor_name && (
                  <p className="text-xs text-gray-400">{selectedSession.visitor_email}</p>
                )}
                {selectedSession.page_url && (
                  <p className="text-xs text-gray-400 truncate max-w-xs">{selectedSession.page_url}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedSession.status !== 'converted' && selectedSession.visitor_email && (
                  <button
                    onClick={handleConvert}
                    disabled={converting}
                    className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200 disabled:opacity-50"
                  >
                    {converting ? '...' : '→ Convert to Client'}
                  </button>
                )}
                {selectedSession.status === 'open' && (
                  <button
                    onClick={handleClose}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200"
                  >
                    Close
                  </button>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${SESSION_STATUS_COLORS[selectedSession.status]}`}>
                  {selectedSession.status}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {(selectedSession.messages || []).map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'visitor' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${
                    msg.role === 'visitor'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : msg.role === 'agent'
                        ? 'bg-green-600 text-white rounded-bl-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                  }`}>
                    {msg.role === 'agent' && <p className="text-xs text-green-200 mb-0.5 font-medium">You (agent)</p>}
                    {msg.role === 'assistant' && <p className="text-xs text-gray-400 mb-0.5">AI</p>}
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleReply(); }}
                placeholder="Reply as agent..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleReply}
                disabled={sending || !reply.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const { user } = useAuth();
  const [tab, setTab] = useState('settings');
  const brandId = user?.brand_id;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Chat Widget</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Embed an AI-powered chat widget on any website. Capture leads, answer questions, and convert visitors — automatically.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {[
          { id: 'settings', label: '⚙️ Settings & Embed Code' },
          { id: 'inbox', label: '💬 Chat Inbox' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'settings' ? (
        <SettingsTab brandId={brandId} />
      ) : (
        <InboxTab brandId={brandId} />
      )}
    </div>
  );
}
