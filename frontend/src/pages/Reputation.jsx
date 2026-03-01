import { useState, useEffect, useCallback } from 'react';
import { reputationAPI, clientAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const PLATFORMS = ['google', 'facebook', 'yelp', 'custom'];
const PLATFORM_LABELS = { google: 'Google', facebook: 'Facebook', yelp: 'Yelp', custom: 'Custom' };
const PLATFORM_COLORS = { google: 'bg-red-100 text-red-700', facebook: 'bg-blue-100 text-blue-700', yelp: 'bg-orange-100 text-orange-700', custom: 'bg-gray-100 text-gray-700' };

function StarDisplay({ rating, size = 'md' }) {
  const sz = size === 'sm' ? 'text-sm' : 'text-lg';
  return (
    <span className={sz}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={n <= rating ? 'text-yellow-400' : 'text-gray-200'}>★</span>
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="text-2xl focus:outline-none"
        >
          <span className={(hover || value) >= n ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        </button>
      ))}
    </div>
  );
}

function PlatformBadge({ platform }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PLATFORM_COLORS[platform] || PLATFORM_COLORS.custom}`}>
      {PLATFORM_LABELS[platform] || platform}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    sent:      'bg-blue-100 text-blue-700',
    clicked:   'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function Reputation() {
  const { currentBrand } = useAuth();
  const brandId = currentBrand?.id;

  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [requests, setRequests] = useState([]);
  const [settings, setSettings] = useState({});
  const [platforms, setPlatforms] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Add review modal
  const [showAddReview, setShowAddReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ platform: 'google', reviewer_name: '', rating: 5, review_text: '', review_date: '', source_url: '' });

  // Send request form
  const [selectedClients, setSelectedClients] = useState([]);
  const [sendChannel, setSendChannel] = useState('email');
  const [sendPlatform, setSendPlatform] = useState('google');
  const [sendMessage, setSendMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Review response
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');

  // Settings form
  const [settingsForm, setSettingsForm] = useState({});
  const [platformForms, setPlatformForms] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);

  // Platform filter for reviews
  const [reviewPlatformFilter, setReviewPlatformFilter] = useState('');
  const [reviewRatingFilter, setReviewRatingFilter] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      const [statsRes, reviewsRes, requestsRes, settingsRes, clientsRes] = await Promise.all([
        reputationAPI.getStats(brandId),
        reputationAPI.listReviews(brandId, {}),
        reputationAPI.listRequests(brandId, {}),
        reputationAPI.getSettings(brandId),
        clientAPI.getBrandClients(brandId, {}),
      ]);
      setStats(statsRes.data.data?.stats || {});
      setReviews(reviewsRes.data.data?.reviews || []);
      setRequests(requestsRes.data.data?.requests || []);
      const s = settingsRes.data.data?.settings || {};
      const p = settingsRes.data.data?.platforms || [];
      setSettings(s);
      setPlatforms(p);
      setClients(clientsRes.data.data?.clients || []);

      // Init settings form
      setSettingsForm({
        auto_after_invoice: s.auto_after_invoice || false,
        auto_after_project: s.auto_after_project || false,
        default_platform: s.default_platform || 'google',
        default_email_message: s.default_email_message || '',
        default_sms_message: s.default_sms_message || '',
      });

      // Init platform forms
      const pf = {};
      PLATFORMS.forEach(platform => {
        const found = p.find(x => x.platform === platform);
        pf[platform] = { label: found?.label || PLATFORM_LABELS[platform], review_url: found?.review_url || '', is_active: found?.is_active !== false };
      });
      setPlatformForms(pf);

      // Pre-fill send message from settings
      setSendMessage(s.default_email_message || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { load(); }, [load]);

  const handleSendRequests = async () => {
    if (!selectedClients.length) return showToast('Select at least one client');
    setSending(true);
    try {
      const res = await reputationAPI.sendRequest(brandId, {
        clientIds: selectedClients,
        channel: sendChannel,
        platform: sendPlatform,
        message: sendMessage,
      });
      const { sent } = res.data.data;
      showToast(`${sent} review request${sent !== 1 ? 's' : ''} sent`);
      setSelectedClients([]);
      await load();
    } catch (e) {
      showToast('Failed to send requests');
    } finally {
      setSending(false);
    }
  };

  const handleAddReview = async () => {
    try {
      await reputationAPI.addReview(brandId, reviewForm);
      setShowAddReview(false);
      setReviewForm({ platform: 'google', reviewer_name: '', rating: 5, review_text: '', review_date: '', source_url: '' });
      showToast('Review added');
      await load();
    } catch (e) {
      showToast('Failed to add review');
    }
  };

  const handleSaveResponse = async (reviewId) => {
    try {
      await reputationAPI.updateReview(brandId, reviewId, { response_text: responseText });
      setRespondingTo(null);
      setResponseText('');
      showToast('Response saved');
      await load();
    } catch (e) {
      showToast('Failed to save response');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await reputationAPI.deleteReview(brandId, reviewId);
      showToast('Review deleted');
      await load();
    } catch (e) {
      showToast('Failed to delete review');
    }
  };

  const handleMarkCompleted = async (requestId) => {
    try {
      await reputationAPI.markCompleted(brandId, requestId);
      showToast('Marked as completed');
      await load();
    } catch (e) {
      showToast('Failed to update');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const platformsArr = PLATFORMS.map(p => ({
        platform: p,
        ...platformForms[p],
      }));
      await reputationAPI.saveSettings(brandId, { settings: settingsForm, platforms: platformsArr });
      showToast('Settings saved');
      await load();
    } catch (e) {
      showToast('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (reviewPlatformFilter && r.platform !== reviewPlatformFilter) return false;
    if (reviewRatingFilter && r.rating < parseInt(reviewRatingFilter)) return false;
    return true;
  });

  const recentReviews = reviews.slice(0, 5);

  if (!brandId) return <div className="p-8 text-gray-500">Select a brand to view reputation.</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reputation</h1>
          {stats?.avg_rating > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <StarDisplay rating={Math.round(stats.avg_rating)} />
              <span className="text-gray-500 text-sm">{stats.avg_rating} average rating</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setTab('request')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Request Reviews
        </button>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Average Rating', value: stats.avg_rating ? `${stats.avg_rating} ⭐` : '—', sub: `${stats.total_reviews} reviews` },
            { label: 'Total Reviews', value: stats.total_reviews ?? 0, sub: `${stats.positive_count ?? 0} positive` },
            { label: 'Requests This Month', value: stats.sent_this_month ?? 0, sub: `${stats.total_sent ?? 0} all time` },
            { label: 'Click Rate', value: `${stats.click_rate ?? 0}%`, sub: `${stats.total_clicked ?? 0} clicked` },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[['dashboard', 'Dashboard'], ['request', 'Request Reviews'], ['reviews', 'Reviews'], ['settings', 'Settings']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Dashboard Tab ── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* Request Funnel */}
          {stats && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Review Request Funnel</h3>
              <div className="flex items-center gap-2">
                {[
                  { label: 'Sent', count: stats.total_sent ?? 0, color: 'bg-blue-100 text-blue-700' },
                  { label: 'Clicked', count: stats.total_clicked ?? 0, color: 'bg-yellow-100 text-yellow-700' },
                  { label: 'Completed', count: stats.total_completed ?? 0, color: 'bg-green-100 text-green-700' },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex items-center gap-2 flex-1">
                    <div className={`flex-1 rounded-xl p-4 text-center ${step.color}`}>
                      <p className="text-2xl font-bold">{step.count}</p>
                      <p className="text-xs font-medium mt-0.5">{step.label}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <span className="text-gray-400 text-lg flex-shrink-0">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Reviews */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Recent Reviews</h3>
              <button onClick={() => setTab('reviews')} className="text-xs text-blue-600 hover:underline">View all</button>
            </div>
            {recentReviews.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No reviews yet. Add reviews manually or collect them via review requests.</p>
            ) : (
              <div className="space-y-3">
                {recentReviews.map(r => (
                  <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StarDisplay rating={r.rating} size="sm" />
                        <PlatformBadge platform={r.platform} />
                        {r.response_text && <span className="text-xs text-green-600 font-medium">Responded</span>}
                      </div>
                      <p className="text-sm font-medium text-gray-800 mt-1">{r.reviewer_name || 'Anonymous'}</p>
                      {r.review_text && <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{r.review_text}</p>}
                      {r.review_date && <p className="text-xs text-gray-400 mt-1">{new Date(r.review_date).toLocaleDateString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Request Reviews Tab ── */}
      {tab === 'request' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Send form */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Send Review Requests</h3>

            {/* Client selector */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Select Clients</label>
              <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto p-2 space-y-1">
                {clients.map(c => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(c.id)}
                      onChange={e => setSelectedClients(prev =>
                        e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                      )}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{c.name}</span>
                    {c.email && <span className="text-xs text-gray-400">{c.email}</span>}
                  </label>
                ))}
                {clients.length === 0 && <p className="text-xs text-gray-400 p-2">No clients found</p>}
              </div>
              {selectedClients.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">{selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>

            {/* Channel */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Channel</label>
              <div className="flex gap-2">
                {['email', 'sms', 'both'].map(ch => (
                  <button
                    key={ch}
                    onClick={() => setSendChannel(ch)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      sendChannel === ch ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {ch.charAt(0).toUpperCase() + ch.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
              <select
                value={sendPlatform}
                onChange={e => setSendPlatform(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Message <span className="text-gray-400">(use {'{client_name}'}, {'{brand_name}'}, {'{review_url}'})</span>
              </label>
              <textarea
                value={sendMessage}
                onChange={e => setSendMessage(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                placeholder="Hi {client_name}, thank you for working with {brand_name}!"
              />
            </div>

            <button
              onClick={handleSendRequests}
              disabled={sending || selectedClients.length === 0}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? 'Sending...' : `Send to ${selectedClients.length || 0} Client${selectedClients.length !== 1 ? 's' : ''}`}
            </button>
          </div>

          {/* Request history */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Request History</h3>
            {requests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No requests sent yet</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {requests.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800 truncate">{r.client_name || 'Unknown'}</span>
                        <PlatformBadge platform={r.platform} />
                        <StatusBadge status={r.status} />
                        <span className="text-xs text-gray-400">{r.channel === 'email' ? '✉' : '💬'}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(r.sent_at).toLocaleDateString()}</p>
                    </div>
                    {r.status !== 'completed' && (
                      <button
                        onClick={() => handleMarkCompleted(r.id)}
                        className="text-xs text-green-600 hover:underline whitespace-nowrap flex-shrink-0"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reviews Tab ── */}
      {tab === 'reviews' && (
        <div>
          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex gap-1">
              <button
                onClick={() => setReviewPlatformFilter('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!reviewPlatformFilter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                All
              </button>
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => setReviewPlatformFilter(p === reviewPlatformFilter ? '' : p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${reviewPlatformFilter === p ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
            <select
              value={reviewRatingFilter}
              onChange={e => setReviewRatingFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs"
            >
              <option value="">All Ratings</option>
              <option value="5">5★ only</option>
              <option value="4">4★ and above</option>
              <option value="3">3★ and above</option>
            </select>
            <button
              onClick={() => setShowAddReview(true)}
              className="ml-auto px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
            >
              + Add Review
            </button>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">⭐</p>
              <p className="font-medium">No reviews yet</p>
              <p className="text-sm mt-1">Add reviews manually or send review requests to clients</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map(r => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <StarDisplay rating={r.rating} />
                        <PlatformBadge platform={r.platform} />
                        {r.response_text && <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">Responded</span>}
                      </div>
                      <p className="font-semibold text-gray-800">{r.reviewer_name || 'Anonymous'}</p>
                      {r.review_date && <p className="text-xs text-gray-400">{new Date(r.review_date).toLocaleDateString()}</p>}
                      {r.review_text && <p className="text-sm text-gray-600 mt-2">{r.review_text}</p>}

                      {/* Response */}
                      {r.response_text && (
                        <div className="mt-3 pl-4 border-l-2 border-blue-200">
                          <p className="text-xs font-medium text-blue-600 mb-1">Your Response</p>
                          <p className="text-sm text-gray-600">{r.response_text}</p>
                        </div>
                      )}

                      {/* Add response inline */}
                      {respondingTo === r.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={responseText}
                            onChange={e => setResponseText(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                            placeholder="Write your response..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveResponse(r.id)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                            >
                              Save Response
                            </button>
                            <button
                              onClick={() => { setRespondingTo(null); setResponseText(''); }}
                              className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        !r.response_text && (
                          <button
                            onClick={() => { setRespondingTo(r.id); setResponseText(''); }}
                            className="mt-2 text-xs text-blue-600 hover:underline"
                          >
                            Add Response
                          </button>
                        )
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteReview(r.id)}
                      className="text-gray-400 hover:text-red-500 text-sm flex-shrink-0"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Settings Tab ── */}
      {tab === 'settings' && (
        <div className="space-y-6 max-w-2xl">
          {/* Review platforms */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Review Platforms</h3>
            <div className="space-y-4">
              {PLATFORMS.map(p => (
                <div key={p} className="flex items-center gap-3">
                  <div className="w-20 flex-shrink-0">
                    <PlatformBadge platform={p} />
                  </div>
                  <input
                    type="url"
                    value={platformForms[p]?.review_url || ''}
                    onChange={e => setPlatformForms(prev => ({ ...prev, [p]: { ...prev[p], review_url: e.target.value } }))}
                    placeholder="Paste your review URL"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={platformForms[p]?.is_active !== false}
                      onChange={e => setPlatformForms(prev => ({ ...prev, [p]: { ...prev[p], is_active: e.target.checked } }))}
                      className="rounded"
                    />
                    <span className="text-xs text-gray-600">Active</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-triggers */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Automatic Triggers</h3>
            <div className="space-y-3">
              {[
                { key: 'auto_after_invoice', label: 'Auto-send after invoice is paid' },
                { key: 'auto_after_project', label: 'Auto-send after project is completed' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setSettingsForm(prev => ({ ...prev, [key]: !prev[key] }))}
                    className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${settingsForm[key] ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settingsForm[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Default Platform for Auto-requests</label>
                <select
                  value={settingsForm.default_platform || 'google'}
                  onChange={e => setSettingsForm(prev => ({ ...prev, default_platform: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Message templates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Message Templates</h3>
            <p className="text-xs text-gray-500">Use {'{client_name}'}, {'{brand_name}'}, {'{review_url}'} as merge tags.</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email Message</label>
              <textarea
                value={settingsForm.default_email_message || ''}
                onChange={e => setSettingsForm(prev => ({ ...prev, default_email_message: e.target.value }))}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                SMS Message <span className="text-gray-400">({(settingsForm.default_sms_message || '').length}/160)</span>
              </label>
              <textarea
                value={settingsForm.default_sms_message || ''}
                onChange={e => setSettingsForm(prev => ({ ...prev, default_sms_message: e.target.value }))}
                rows={2}
                maxLength={160}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* ── Add Review Modal ── */}
      {showAddReview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add Review</h2>
              <button onClick={() => setShowAddReview(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
              <select
                value={reviewForm.platform}
                onChange={e => setReviewForm(prev => ({ ...prev, platform: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reviewer Name</label>
              <input
                type="text"
                value={reviewForm.reviewer_name}
                onChange={e => setReviewForm(prev => ({ ...prev, reviewer_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. John Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rating</label>
              <StarPicker value={reviewForm.rating} onChange={n => setReviewForm(prev => ({ ...prev, rating: n }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Review Date</label>
              <input
                type="date"
                value={reviewForm.review_date}
                onChange={e => setReviewForm(prev => ({ ...prev, review_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Review Text</label>
              <textarea
                value={reviewForm.review_text}
                onChange={e => setReviewForm(prev => ({ ...prev, review_text: e.target.value }))}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                placeholder="Paste the review content..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Source URL (optional)</label>
              <input
                type="url"
                value={reviewForm.source_url}
                onChange={e => setReviewForm(prev => ({ ...prev, source_url: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddReview}
                disabled={!reviewForm.reviewer_name && !reviewForm.review_text}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Add Review
              </button>
              <button
                onClick={() => setShowAddReview(false)}
                className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
