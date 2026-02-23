import { useState, useEffect, useRef, useContext } from 'react';
import Layout from '../components/Layout';
import { messageAPI, brandAPI } from '../services/api';
import AuthContext from '../context/AuthContext';

const Messages = () => {
  const { user } = useContext(AuthContext);
  const messagesEndRef = useRef(null);

  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [newThread, setNewThread] = useState({ subject: '', message: '' });

  useEffect(() => { fetchBrands(); }, []);
  useEffect(() => {
    if (selectedBrand) {
      fetchThreads();
      fetchUnreadCount();
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedThread) {
      fetchMessages();
      markThreadRead();
    }
  }, [selectedThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchBrands = async () => {
    try {
      const response = await brandAPI.getUserBrands();
      const brandsData = response.data.data?.brands || [];
      setBrands(brandsData);
      if (brandsData.length > 0) setSelectedBrand(brandsData[0]);
    } catch (err) {
      setError('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const fetchThreads = async () => {
    try {
      const response = await messageAPI.getBrandThreads(selectedBrand.id);
      setThreads(response.data.data?.threads || []);
    } catch (err) {
      console.error('Failed to load threads:', err);
    }
  };

  const fetchMessages = async () => {
    if (!selectedThread) return;
    try {
      setLoadingMessages(true);
      const response = await messageAPI.getThreadMessages(selectedBrand.id, selectedThread.id);
      const msgs = response.data.data?.messages || [];
      setMessages(msgs.reverse()); // Show oldest first
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await messageAPI.getUnreadCount(selectedBrand.id);
      setUnreadCount(response.data.data?.unread_count || 0);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const markThreadRead = async () => {
    if (!selectedThread) return;
    try {
      await messageAPI.markThreadAsRead(selectedBrand.id, selectedThread.id);
      fetchUnreadCount();
      fetchThreads();
    } catch (err) {
      console.error('Failed to mark thread as read:', err);
    }
  };

  const handleSelectThread = (thread) => {
    setSelectedThread(thread);
    setError('');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedThread) return;

    setSending(true);
    setError('');
    try {
      await messageAPI.sendMessage(selectedBrand.id, selectedThread.id, {
        content: messageText.trim(),
        sender_type: 'user',
      });
      setMessageText('');
      fetchMessages();
      fetchThreads();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newThread.subject.trim()) return;

    setSending(true);
    setError('');
    try {
      const response = await messageAPI.createThread(selectedBrand.id, {
        subject: newThread.subject,
      });
      const thread = response.data.data?.thread;

      // Send initial message if provided
      if (newThread.message.trim() && thread) {
        await messageAPI.sendMessage(selectedBrand.id, thread.id, {
          content: newThread.message.trim(),
          sender_type: 'user',
        });
      }

      setShowNewThreadModal(false);
      setNewThread({ subject: '', message: '' });
      fetchThreads();
      if (thread) setSelectedThread(thread);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create thread');
    } finally {
      setSending(false);
    }
  };

  const handleArchiveThread = async (threadId) => {
    if (!window.confirm('Archive this thread?')) return;
    try {
      await messageAPI.archiveThread(selectedBrand.id, threadId);
      if (selectedThread?.id === threadId) setSelectedThread(null);
      fetchThreads();
    } catch (err) {
      setError('Failed to archive thread');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await messageAPI.deleteMessage(selectedBrand.id, messageId);
      fetchMessages();
    } catch (err) {
      setError('Failed to delete message');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) { fetchThreads(); return; }
    try {
      const response = await messageAPI.searchMessages(selectedBrand.id, searchQuery);
      // Show search results as threads
      const results = response.data.data?.results || [];
      setThreads(results);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isMyMessage = (msg) => {
    return msg.sender_id === user?.id || msg.sender_type === 'user';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </Layout>
    );
  }

  if (!selectedBrand) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">No brands available. Create a brand first.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-120px)] bg-white rounded-lg shadow overflow-hidden">
        {/* Left Panel - Thread List */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowNewThreadModal(true)}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                + New
              </button>
            </div>

            {/* Brand Selector */}
            {brands.length > 1 && (
              <select
                value={selectedBrand?.id || ''}
                onChange={(e) => {
                  setSelectedBrand(brands.find(b => b.id === e.target.value));
                  setSelectedThread(null);
                }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 mb-2"
              >
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) fetchThreads();
                }}
                placeholder="Search messages..."
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900"
              />
              <button type="submit" className="px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-sm hover:bg-gray-200">
                🔍
              </button>
            </form>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                <p className="mb-2">No threads yet</p>
                <button
                  onClick={() => setShowNewThreadModal(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Start a conversation
                </button>
              </div>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => handleSelectThread(thread)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedThread?.id === thread.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-sm font-medium truncate flex-1 ${
                      thread.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {thread.subject}
                    </p>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      {thread.unread_count > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                          {thread.unread_count}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{formatTime(thread.last_message_at || thread.created_at)}</span>
                    </div>
                  </div>
                  {thread.last_message_content && (
                    <p className="text-xs text-gray-500 truncate">{thread.last_message_content}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      thread.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {thread.status}
                    </span>
                    <span className="text-xs text-gray-400">{thread.message_count || 0} msgs</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Conversation */}
        <div className="flex-1 flex flex-col">
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-4xl mb-3">💬</p>
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose a thread from the left or start a new one</p>
                <button
                  onClick={() => setShowNewThreadModal(true)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  + New Thread
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedThread.subject}</h3>
                  <p className="text-xs text-gray-500">
                    {selectedThread.message_count || 0} messages
                    {selectedThread.client_name && ` · Client: ${selectedThread.client_name}`}
                    {selectedThread.project_name && ` · Project: ${selectedThread.project_name}`}
                  </p>
                </div>
                <button
                  onClick={() => handleArchiveThread(selectedThread.id)}
                  className="text-gray-400 hover:text-red-600 text-sm px-2 py-1 rounded hover:bg-red-50"
                  title="Archive thread"
                >
                  Archive
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-32">
                    <p className="text-gray-500 text-sm">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex justify-center items-center h-32">
                    <p className="text-gray-500 text-sm">No messages yet. Send the first one!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${isMyMessage(msg) ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md group relative ${isMyMessage(msg) ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isMyMessage(msg) && (
                          <p className="text-xs text-gray-500 mb-1 ml-1">
                            {msg.sender_name || 'Client'}
                          </p>
                        )}
                        <div className={`px-4 py-2 rounded-2xl text-sm ${
                          isMyMessage(msg)
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-400">{formatTime(msg.created_at)}</p>
                          {isMyMessage(msg) && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                {error && (
                  <div className="mb-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageText.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Thread Modal */}
      {showNewThreadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">New Conversation</h3>
            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newThread.subject}
                  onChange={(e) => setNewThread(prev => ({ ...prev, subject: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="What is this conversation about?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Message (optional)
                </label>
                <textarea
                  value={newThread.message}
                  onChange={(e) => setNewThread(prev => ({ ...prev, message: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Start the conversation..."
                />
              </div>
              {error && (
                <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                >
                  {sending ? 'Creating...' : 'Create Thread'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewThreadModal(false);
                    setNewThread({ subject: '', message: '' });
                    setError('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Messages;
