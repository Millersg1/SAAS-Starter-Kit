import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import SocialCompose from '../components/SocialCompose';
import { socialAPI, brandAPI } from '../services/api';

const PLATFORM_INFO = {
  linkedin:  { label: 'LinkedIn',  icon: '💼', color: 'text-blue-700',  bg: 'bg-blue-100'  },
  twitter:   { label: 'Twitter/X', icon: '🐦', color: 'text-sky-600',   bg: 'bg-sky-100'   },
  facebook:  { label: 'Facebook',  icon: '📘', color: 'text-blue-600',  bg: 'bg-blue-50'   },
  instagram: { label: 'Instagram', icon: '📸', color: 'text-pink-600',  bg: 'bg-pink-100'  },
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700'
};

// ── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ brandId, selectedBrand, onRefresh }) {
  const [calData, setCalData] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedBrand) fetchCalendar();
  }, [selectedBrand, currentDate]);

  const fetchCalendar = async () => {
    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    try {
      const res = await socialAPI.getCalendar(selectedBrand.id, from, to);
      setCalData(res.data.data || {});
    } catch { setCalData({}); }
    setLoading(false);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toDateString();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">←</button>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{monthName}</h3>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">→</button>
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="bg-gray-50 dark:bg-gray-800 text-center text-xs font-medium text-gray-500 py-2">{d}</div>
          ))}
          {Array(firstDay).fill(null).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white dark:bg-gray-800 min-h-[80px]" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const posts = calData[dateKey] || [];
            const isToday = new Date(year, month, day).toDateString() === today;
            const isSelected = selectedDay === dateKey;
            return (
              <div key={day} onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                className={`bg-white dark:bg-gray-800 min-h-[80px] p-1 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}>{day}</div>
                <div className="flex flex-wrap gap-0.5">
                  {posts.slice(0, 4).map((p, j) => (
                    <span key={j} className={`text-xs px-1 rounded ${PLATFORM_INFO[p.platform]?.bg || 'bg-gray-100'} ${PLATFORM_INFO[p.platform]?.color || 'text-gray-600'}`} title={p.content.slice(0, 50)}>
                      {PLATFORM_INFO[p.platform]?.icon || '📝'}
                    </span>
                  ))}
                  {posts.length > 4 && <span className="text-xs text-gray-400">+{posts.length - 4}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedDay && calData[selectedDay] && (
        <div className="w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3">{new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
          <div className="space-y-2">
            {calData[selectedDay].map(p => (
              <div key={p.id} className={`p-2 rounded-lg border ${STATUS_COLORS[p.status]}`}>
                <div className="flex items-center gap-1 mb-1">
                  <span>{PLATFORM_INFO[p.platform]?.icon}</span>
                  <span className="text-xs font-medium">@{p.account_handle || 'unknown'}</span>
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{p.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Social() {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [activeStatus, setActiveStatus] = useState('scheduled');
  const [platformFilter, setPlatformFilter] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectForm, setConnectForm] = useState({ platform: 'linkedin', account_handle: '', account_name: '', access_token: '', client_id: '' });
  const [connecting, setConnecting] = useState(false);
  const [publishingId, setPublishingId] = useState(null);

  useEffect(() => {
    brandAPI.getBrands().then(res => {
      const b = res.data.data || [];
      setBrands(b);
      if (b.length) setSelectedBrand(b[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedBrand) { fetchAccounts(); fetchPosts(); }
  }, [selectedBrand, activeStatus, platformFilter]);

  const fetchAccounts = async () => {
    try {
      const res = await socialAPI.listAccounts(selectedBrand.id);
      setAccounts(res.data.data || []);
    } catch { setAccounts([]); }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await socialAPI.listPosts(selectedBrand.id, {
        status: activeStatus || undefined,
        platform: platformFilter || undefined
      });
      setPosts(res.data.data || []);
      setStats(res.data.stats || {});
    } catch { setPosts([]); }
    setLoading(false);
  };

  const handleConnectAccount = async () => {
    setConnecting(true);
    try {
      await socialAPI.connectAccount(selectedBrand.id, { ...connectForm, brand_id: selectedBrand.id });
      fetchAccounts();
      setShowConnectModal(false);
      setConnectForm({ platform: 'linkedin', account_handle: '', account_name: '', access_token: '', client_id: '' });
    } catch(e) { alert(e.response?.data?.message || 'Failed to connect account'); }
    setConnecting(false);
  };

  const handleDisconnect = async (id) => {
    if (!confirm('Disconnect this account?')) return;
    try { await socialAPI.disconnectAccount(selectedBrand.id, id); fetchAccounts(); }
    catch(e) { alert(e.response?.data?.message || 'Failed to disconnect'); }
  };

  const handlePublishNow = async (postId) => {
    setPublishingId(postId);
    try {
      const res = await socialAPI.publishNow(selectedBrand.id, postId);
      if (res.data.manual) {
        const post = posts.find(p => p.id === postId);
        if (post) {
          await navigator.clipboard.writeText(post.content).catch(() => {});
          alert('No API token connected. Post content copied to clipboard for manual posting.');
        }
      } else {
        alert('Published successfully!');
      }
      fetchPosts();
    } catch(e) { alert(e.response?.data?.message || 'Publish failed'); }
    setPublishingId(null);
  };

  const handleDeletePost = async (id) => {
    if (!confirm('Delete this post?')) return;
    try { await socialAPI.deletePost(selectedBrand.id, id); fetchPosts(); }
    catch(e) { alert(e.response?.data?.message || 'Delete failed'); }
  };

  const handleSendForReview = async (postId) => {
    try {
      const res = await socialAPI.sendForReview(selectedBrand.id, postId);
      const url = res.data.data.review_url;
      await navigator.clipboard.writeText(url).catch(() => {});
      alert(`Review link copied to clipboard!\n\n${url}`);
      fetchPosts();
    } catch(e) { alert(e.response?.data?.message || 'Failed to generate review link'); }
  };

  const groupedAccounts = Object.entries(PLATFORM_INFO).reduce((acc, [platform]) => {
    const accs = accounts.filter(a => a.platform === platform);
    if (accs.length) acc[platform] = accs;
    return acc;
  }, {});

  return (
    <Layout>
      <div className="flex h-full overflow-hidden">
        {/* Accounts sidebar */}
        <div className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Accounts</h3>
              <button onClick={() => setShowConnectModal(true)}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add</button>
            </div>
            {accounts.length === 0 ? (
              <p className="text-xs text-gray-500">No accounts connected yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedAccounts).map(([platform, accs]) => (
                  <div key={platform}>
                    <div className={`text-xs font-medium mb-1 flex items-center gap-1 ${PLATFORM_INFO[platform].color}`}>
                      {PLATFORM_INFO[platform].icon} {PLATFORM_INFO[platform].label}
                    </div>
                    {accs.map(account => (
                      <div key={account.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 group">
                        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs overflow-hidden shrink-0">
                          {account.profile_image_url ? <img src={account.profile_image_url} alt="" className="w-full h-full object-cover" /> : (account.account_handle?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">@{account.account_handle || account.account_name}</div>
                          {account.client_name && <div className="text-xs text-gray-400 truncate">for {account.client_name}</div>}
                          <div className={`text-xs ${account.has_token ? 'text-green-600' : 'text-yellow-600'}`}>{account.has_token ? '● Connected' : '○ No token'}</div>
                        </div>
                        <button onClick={() => handleDisconnect(account.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">📲 Social Media</h1>
              {brands.length > 1 && (
                <select value={selectedBrand?.id || ''} onChange={e => setSelectedBrand(brands.find(b => b.id === e.target.value))}
                  className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1">
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
              {/* Stats */}
              <div className="flex gap-3 text-sm">
                <span className="text-blue-600"><strong>{stats.scheduled_count || 0}</strong> scheduled</span>
                <span className="text-green-600"><strong>{stats.published_last_30 || 0}</strong> published (30d)</span>
                <span className="text-gray-500"><strong>{stats.draft_count || 0}</strong> drafts</span>
              </div>
            </div>
            <div className="flex gap-2">
              {/* View toggle */}
              <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>List</button>
                <button onClick={() => setView('calendar')} className={`px-3 py-1.5 text-sm ${view === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Calendar</button>
              </div>
              <button onClick={() => { setEditPost(null); setShowCompose(true); }}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                ✏️ Compose
              </button>
            </div>
          </div>

          {view === 'calendar' ? (
            <div className="flex-1 overflow-auto p-6">
              {selectedBrand && <CalendarView brandId={selectedBrand.id} selectedBrand={selectedBrand} onRefresh={fetchPosts} />}
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
                <div className="flex gap-1">
                  {['scheduled', 'published', 'draft', 'failed', ''].map(s => (
                    <button key={s} onClick={() => setActiveStatus(s)}
                      className={`px-3 py-1 text-xs rounded-full capitalize ${activeStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                      {s || 'All'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 ml-2">
                  {['', ...Object.keys(PLATFORM_INFO)].map(p => (
                    <button key={p} onClick={() => setPlatformFilter(p)}
                      className={`px-2 py-1 text-xs rounded-full ${platformFilter === p ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                      {p ? PLATFORM_INFO[p].icon + ' ' + PLATFORM_INFO[p].label : 'All Platforms'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Posts list */}
              <div className="flex-1 overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32 text-gray-500">Loading...</div>
                ) : posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-3">
                    <p>No {activeStatus} posts found</p>
                    <button onClick={() => { setEditPost(null); setShowCompose(true); }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Compose your first post</button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {posts.map(post => (
                      <div key={post.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        {/* Platform + Account */}
                        <div className="shrink-0 flex flex-col items-center gap-1">
                          <span className="text-2xl">{PLATFORM_INFO[post.platform]?.icon || '📝'}</span>
                          <span className="text-xs text-gray-400 max-w-[60px] truncate">@{post.account_handle || '—'}</span>
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[post.status]}`}>{post.status}</span>
                            {post.review_status && post.review_status !== 'none' && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                post.review_status === 'approved' ? 'bg-green-100 text-green-700' :
                                post.review_status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {post.review_status === 'approved' ? '✓ Approved' :
                                 post.review_status === 'pending_review' ? '⏳ In Review' :
                                 '✏️ Changes Requested'}
                              </span>
                            )}
                            {post.scheduled_at && <span className="text-xs text-gray-400">📅 {new Date(post.scheduled_at).toLocaleString()}</span>}
                            {post.published_at && post.status === 'published' && (
                              <span className="text-xs text-gray-400">
                                ❤️ {post.like_count} · 💬 {post.comment_count} · 🔁 {post.share_count}
                              </span>
                            )}
                            {post.status === 'failed' && <span className="text-xs text-red-500" title={post.error_message}>⚠️ Failed</span>}
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {(post.status === 'draft' || post.status === 'scheduled' || post.status === 'failed') && (
                            <button onClick={() => handlePublishNow(post.id)} disabled={publishingId === post.id}
                              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50">
                              {publishingId === post.id ? '...' : '▶ Publish'}
                            </button>
                          )}
                          <button onClick={() => handleSendForReview(post.id)}
                            className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                            📤 Review
                          </button>
                          <button onClick={() => { setEditPost(post); setShowCompose(true); }}
                            className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Edit</button>
                          <button onClick={() => handleDeletePost(post.id)}
                            className="text-xs px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compose slide-over */}
      {showCompose && selectedBrand && (
        <SocialCompose
          brandId={selectedBrand.id}
          accounts={accounts}
          editPost={editPost}
          onClose={() => { setShowCompose(false); setEditPost(null); }}
          onCreated={fetchPosts}
        />
      )}

      {/* Connect Account Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Connect Social Account</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Platform</label>
                <select value={connectForm.platform} onChange={e => setConnectForm(p => ({...p, platform: e.target.value}))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800">
                  {Object.entries(PLATFORM_INFO).map(([key, val]) => (
                    <option key={key} value={key}>{val.icon} {val.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Handle / Username</label>
                <input value={connectForm.account_handle} onChange={e => setConnectForm(p => ({...p, account_handle: e.target.value}))}
                  placeholder="@yourhandle" className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
                <input value={connectForm.account_name} onChange={e => setConnectForm(p => ({...p, account_name: e.target.value}))}
                  placeholder="Your Name or Page Name" className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Access Token <span className="text-gray-400 font-normal">(optional — needed for auto-publish)</span></label>
                <input type="password" value={connectForm.access_token} onChange={e => setConnectForm(p => ({...p, access_token: e.target.value}))}
                  placeholder="Bearer token from developer portal"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 font-mono"/>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                💡 Without an access token, you can still plan and schedule posts. When publishing, content will be copied to your clipboard for manual posting.
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowConnectModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleConnectAccount} disabled={connecting || !connectForm.account_handle}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {connecting ? 'Connecting...' : 'Connect Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
