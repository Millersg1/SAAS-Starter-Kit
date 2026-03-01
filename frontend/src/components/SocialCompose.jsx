import { useState, useEffect } from 'react';
import MediaLibrary from './MediaLibrary';
import { socialAPI } from '../services/api';

const PLATFORM_INFO = {
  linkedin:  { label: 'LinkedIn',  icon: '💼', color: 'bg-blue-700',  limit: 3000 },
  twitter:   { label: 'Twitter/X', icon: '🐦', color: 'bg-sky-500',   limit: 280  },
  facebook:  { label: 'Facebook',  icon: '📘', color: 'bg-blue-600',  limit: 2200 },
  instagram: { label: 'Instagram', icon: '📸', color: 'bg-pink-500',  limit: 2200 },
};

const TONES = ['Professional', 'Casual', 'Humorous', 'Inspirational', 'Educational'];

export default function SocialCompose({ brandId, accounts, onClose, onCreated, editPost = null }) {
  const [selectedAccounts, setSelectedAccounts] = useState(editPost ? [editPost.social_account_id] : []);
  const [content, setContent] = useState(editPost?.content || '');
  const [linkUrl, setLinkUrl] = useState(editPost?.link_url || '');
  const [mediaItems, setMediaItems] = useState([]);
  const [scheduleMode, setScheduleMode] = useState(editPost?.scheduled_at ? 'schedule' : 'now');
  const [scheduledAt, setScheduledAt] = useState(editPost?.scheduled_at ? new Date(editPost.scheduled_at).toISOString().slice(0,16) : '');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('Professional');
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedPlatforms = selectedAccounts.map(id => accounts.find(a => a.id === id)?.platform).filter(Boolean);
  const minLimit = selectedPlatforms.length ? Math.min(...selectedPlatforms.map(p => PLATFORM_INFO[p]?.limit || 2200)) : 2200;
  const overLimit = content.length > minLimit;

  const toggleAccount = (id) => {
    setSelectedAccounts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAiGenerate = async () => {
    if (!aiTopic) return;
    setAiLoading(true);
    try {
      const platform = selectedPlatforms[0] || 'linkedin';
      const res = await socialAPI.generateCaption(brandId, { topic: aiTopic, platform, tone: aiTone.toLowerCase() });
      const { caption } = res.data.data;
      setContent(caption);
      setShowAiPanel(false);
      setAiTopic('');
    } catch(e) { setError('AI generation failed: ' + (e.response?.data?.message || e.message)); }
    setAiLoading(false);
  };

  const handleSubmit = async () => {
    if (!content.trim()) { setError('Content is required'); return; }
    if (selectedAccounts.length === 0) { setError('Select at least one account'); return; }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        content,
        link_url: linkUrl || null,
        media_urls: mediaItems.map(m => m.file_url),
        status: scheduleMode === 'schedule' ? 'scheduled' : 'draft',
        scheduled_at: scheduleMode === 'schedule' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        account_ids: selectedAccounts
      };
      if (editPost) {
        await socialAPI.updatePost(brandId, editPost.id, { ...payload, social_account_id: selectedAccounts[0] });
      } else {
        await socialAPI.createPost(brandId, payload);
      }
      if (scheduleMode === 'now' && !editPost) {
        // Also trigger publish for each account
        // (posts will auto-publish via the schedule check on the server, or user clicks Publish Now)
      }
      onCreated?.();
      onClose();
    } catch(e) { setError(e.response?.data?.message || 'Failed to save post'); }
    setSubmitting(false);
  };

  // Group accounts by platform
  const groupedAccounts = Object.entries(PLATFORM_INFO).reduce((acc, [platform]) => {
    const platformAccounts = accounts.filter(a => a.platform === platform && a.is_active);
    if (platformAccounts.length) acc[platform] = platformAccounts;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {editPost ? 'Edit Post' : 'Compose Post'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* Account selector */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Post to</label>
            {Object.keys(groupedAccounts).length === 0 ? (
              <p className="text-sm text-gray-500">No social accounts connected. <a href="/social" className="text-blue-600">Connect an account →</a></p>
            ) : (
              <div className="space-y-2">
                {Object.entries(groupedAccounts).map(([platform, accs]) => (
                  <div key={platform}>
                    <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                      {PLATFORM_INFO[platform].icon} {PLATFORM_INFO[platform].label}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {accs.map(account => (
                        <button key={account.id} type="button"
                          onClick={() => toggleAccount(account.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            selectedAccounts.includes(account.id)
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                          }`}>
                          <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs overflow-hidden">
                            {account.profile_image_url ? <img src={account.profile_image_url} alt="" className="w-full h-full object-cover" /> : account.account_handle?.[0]?.toUpperCase() || '?'}
                          </span>
                          @{account.account_handle || account.account_name}
                          {account.client_name && <span className="text-xs opacity-70">({account.client_name})</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Content</label>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${overLimit ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{content.length}/{minLimit}</span>
                <button type="button" onClick={() => setShowAiPanel(p => !p)}
                  className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200">
                  ✨ AI
                </button>
              </div>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              placeholder="What do you want to share?"
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none ${
                overLimit ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'
              }`}
            />
          </div>

          {/* AI panel */}
          {showAiPanel && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
              <div className="flex gap-2 mb-2">
                <input value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                  placeholder="What's your post about?"
                  className="flex-1 px-3 py-1.5 text-sm border border-purple-200 rounded-lg bg-white dark:bg-gray-800"/>
                <select value={aiTone} onChange={e => setAiTone(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-purple-200 rounded-lg bg-white dark:bg-gray-800">
                  {TONES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <button onClick={handleAiGenerate} disabled={aiLoading || !aiTopic}
                className="w-full py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {aiLoading ? 'Generating...' : '✨ Generate Caption'}
              </button>
            </div>
          )}

          {/* Link */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Link URL (optional)</label>
            <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"/>
          </div>

          {/* Media */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Media</label>
              <button type="button" onClick={() => setShowMediaPicker(true)}
                className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                📎 Add Image
              </button>
            </div>
            {mediaItems.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {mediaItems.map((item, i) => (
                  <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={item.file_url.startsWith('/') ? `${import.meta.env.VITE_API_URL || ''}${item.file_url}` : item.file_url}
                      alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setMediaItems(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">When to post</label>
            <div className="flex gap-2">
              {['now', 'schedule'].map(mode => (
                <button key={mode} type="button" onClick={() => setScheduleMode(mode)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    scheduleMode === mode ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                  }`}>
                  {mode === 'now' ? '⚡ Post Now' : '📅 Schedule'}
                </button>
              ))}
            </div>
            {scheduleMode === 'schedule' && (
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0,16)}
                className="w-full mt-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"/>
            )}
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !content.trim() || selectedAccounts.length === 0 || overLimit}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Saving...' : scheduleMode === 'schedule' ? '📅 Schedule Post' : '💾 Save Draft'}
          </button>
        </div>
      </div>

      {/* Media picker modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-xl w-full max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Select Image</h3>
              <button onClick={() => setShowMediaPicker(false)} className="text-gray-400">✕</button>
            </div>
            <MediaLibrary brandId={brandId} mode="picker"
              onSelect={item => { setMediaItems(prev => [...prev, item]); setShowMediaPicker(false); }} />
          </div>
        </div>
      )}
    </div>
  );
}
