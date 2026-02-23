import { useState, useEffect, useRef } from 'react';
import { portalAPI } from '../../services/portalApi';
import { usePortalAuth } from '../../context/PortalAuthContext';
import PortalLayout from '../../components/PortalLayout';

const PortalMessages = () => {
  const { portalClient } = usePortalAuth();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    portalAPI
      .getMessages()
      .then((res) => setThreads(res.data.data.threads || []))
      .catch((err) => console.error('Failed to load threads:', err))
      .finally(() => setLoading(false));
  }, []);

  const openThread = async (thread) => {
    setSelectedThread(thread);
    try {
      const res = await portalAPI.getThread(thread.id);
      setMessages(res.data.data.messages || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedThread) return;
    setSending(true);
    try {
      const res = await portalAPI.sendMessage(selectedThread.id, newMessage.trim());
      setMessages((prev) => [...prev, res.data.data.message]);
      setNewMessage('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <PortalLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Messages</h1>

      <div className="bg-white rounded-xl shadow overflow-hidden flex h-[calc(100vh-240px)] min-h-96">
        {/* Thread list */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 flex flex-col">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Conversations
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-gray-400 text-sm">Loading...</div>
            ) : threads.length === 0 ? (
              <div className="p-4 text-gray-400 text-sm">No conversations yet.</div>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => openThread(thread)}
                  className={`px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedThread?.id === thread.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{thread.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatTime(thread.last_message_at || thread.created_at)}
                    {thread.message_count > 0 && ` · ${thread.message_count} msgs`}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message area */}
        <div className="flex-1 flex flex-col">
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-4xl mb-3">💬</p>
                <p className="text-sm">Select a conversation to view messages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                <p className="font-semibold text-gray-900">{selectedThread.subject}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm mt-10">
                    No messages yet. Start the conversation below.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isClient = msg.sender_type === 'client';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-sm rounded-2xl px-4 py-2.5 text-sm ${
                            isClient
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isClient ? 'text-blue-200' : 'text-gray-400'
                            }`}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Send form */}
              <form
                onSubmit={sendMessage}
                className="px-5 py-3 border-t border-gray-200 flex gap-2"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </PortalLayout>
  );
};

export default PortalMessages;
