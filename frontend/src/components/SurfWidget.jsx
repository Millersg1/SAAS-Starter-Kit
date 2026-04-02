import { useState, useEffect, useRef } from 'react';
import api, { brandAPI } from '../services/api';

export default function SurfWidget() {
  const [brandId, setBrandId] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'surf', text: "Hey! I'm Surf. Ask me anything about your business — revenue, clients, pipeline, tasks, or what to focus on today." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    brandAPI.getUserBrands().then(res => {
      const brands = res.data.data?.brands || [];
      if (brands.length > 0) setBrandId(brands[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!brandId) return;
    // Fetch recommendations and summary
    api.get(`/surf/${brandId}/recommendations`).then(res => {
      setRecommendations(res.data.data?.recommendations || []);
    }).catch(() => {});

    api.get(`/surf/${brandId}/summary`).then(res => {
      setSummary(res.data.data);
    }).catch(() => {});
  }, [brandId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || !brandId) return;
    setMessages(prev => [...prev, { from: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post(`/surf/${brandId}/ask`, { question: q });
      setMessages(prev => [...prev, { from: 'surf', text: res.data.data?.answer || "I couldn't process that. Try rephrasing." }]);
    } catch {
      setMessages(prev => [...prev, { from: 'surf', text: "Sorry, I'm having trouble right now. Try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = { high: 'border-red-200 bg-red-50', medium: 'border-amber-200 bg-amber-50', low: 'border-blue-200 bg-blue-50' };

  return (
    <>
      {/* Surf Recommendations Bar (top of dashboard) */}
      {recommendations.length > 0 && !minimized && (
        <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center gap-3">
              <img src="/images/surf-avatar.png" alt="Surf" className="w-8 h-8 rounded-full object-cover" />
              <span className="font-bold text-sm">Surf's Recommendations</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{recommendations.length} items</span>
            </div>
            <button onClick={() => setMinimized(true)} className="text-white/70 hover:text-white text-sm">Dismiss</button>
          </div>
          <div className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recommendations.slice(0, 6).map((rec, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${priorityColors[rec.priority]} dark:bg-gray-700 dark:border-gray-600`}>
                <span className="text-2xl flex-shrink-0">{rec.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{rec.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">{rec.description}</p>
                  {rec.action && (
                    <a href={rec.action.link} className="inline-block mt-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                      {rec.action.label} →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Surf Chat Button + Panel */}
      <div className="fixed right-6 bottom-6 z-50">
        {chatOpen && (
          <div className="mb-3 w-[380px] max-h-[520px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
              <img src="/images/surf-avatar.png" alt="Surf" className="w-9 h-9 rounded-full object-cover" />
              <div className="flex-1">
                <p className="font-bold text-sm">Surf</p>
                <p className="text-xs opacity-80">AI Agency Assistant</p>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-white/80 hover:text-white text-lg font-bold">✕</button>
            </div>

            {/* Quick summary */}
            {summary && (
              <div className="grid grid-cols-4 gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-center">
                <div><p className="text-xs text-gray-500">Revenue</p><p className="text-sm font-bold text-gray-900 dark:text-white">${summary.revenue_this_month?.toLocaleString() || '0'}</p></div>
                <div><p className="text-xs text-gray-500">Clients</p><p className="text-sm font-bold text-gray-900 dark:text-white">{summary.active_clients || 0}</p></div>
                <div><p className="text-xs text-gray-500">Tasks Due</p><p className="text-sm font-bold text-gray-900 dark:text-white">{summary.tasks_due || 0}</p></div>
                <div><p className="text-xs text-gray-500">Pipeline</p><p className="text-sm font-bold text-gray-900 dark:text-white">${summary.pipeline_value?.toLocaleString() || '0'}</p></div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[320px]" style={{ scrollbarWidth: 'thin' }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.from === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-md'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 text-gray-500 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick prompts */}
            <div className="px-3 pt-1 pb-1 flex gap-1.5 flex-wrap">
              {['How\'s my revenue?', 'What should I focus on?', 'Pipeline status'].map(q => (
                <button key={q} onClick={() => { setInput(q); }} className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-gray-700 text-blue-700 dark:text-blue-300 rounded-full font-semibold hover:bg-blue-100 transition-colors">
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Surf about your business..."
                  className="flex-1 px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
                <button type="submit" disabled={loading} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Toggle button */}
        <button
          className="flex items-center gap-3 px-4 py-2.5 bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-600 rounded-full shadow-lg backdrop-blur-sm hover:-translate-y-1 transition-all"
          onClick={() => setChatOpen(!chatOpen)}
        >
          <div className="relative w-11 h-11 flex-shrink-0">
            <img src="/images/surf-avatar.png" alt="Surf" className="relative w-11 h-11 rounded-full object-cover" />
            {recommendations.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {recommendations.length}
              </span>
            )}
          </div>
          <span className="font-extrabold text-gray-800 dark:text-gray-100 text-sm hidden sm:inline">
            {chatOpen ? 'Close Surf' : 'Ask Surf'}
          </span>
        </button>
      </div>
    </>
  );
}
