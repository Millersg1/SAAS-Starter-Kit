import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import RichTextEditor from '../components/RichTextEditor';
import MediaLibrary from '../components/MediaLibrary';
import { cmsAPI, brandAPI } from '../services/api';

const generateSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const REVIEW_STATUS_STYLES = {
  none:              null,
  pending_review:    'bg-yellow-100 text-yellow-700',
  approved:          'bg-green-100 text-green-700',
  changes_requested: 'bg-orange-100 text-orange-700',
};
const REVIEW_STATUS_LABELS = {
  pending_review:    '⏳ Awaiting Review',
  approved:          '✓ Approved',
  changes_requested: '✏️ Changes Requested',
};

export default function CMSEditor() {
  const { siteId, pageId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = pageId === 'new';
  const pageType = searchParams.get('type') || 'page';

  const [brand, setBrand] = useState(null);
  const [form, setForm] = useState({
    title: '', slug: '', content: '', excerpt: '',
    featured_image_url: '', page_type: pageType,
    status: 'draft', scheduled_at: '',
    seo_title: '', seo_description: '', seo_keywords: '', og_image_url: '',
    category: '', tags: []
  });
  const [pageData, setPageData] = useState(null); // raw page from API
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [seoOpen, setSeoOpen] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerCallback, setMediaPickerCallback] = useState(null);
  const [showFeaturedPicker, setShowFeaturedPicker] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiForm, setAiForm] = useState({ topic: '', keywords: '', tone: 'professional' });
  const [aiLoading, setAiLoading] = useState(false);
  // Version history
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  // Content review
  const [reviewUrl, setReviewUrl] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const autoSaveRef = useRef(null);

  useEffect(() => {
    brandAPI.getBrands().then(res => {
      const b = (res.data.data || [])[0];
      setBrand(b);
      if (!isNew && b) fetchPage(b.id);
    });
  }, []);

  const fetchPage = async (brandId) => {
    setLoading(true);
    try {
      const res = await cmsAPI.getPage(brandId, pageId);
      const p = res.data.data;
      setPageData(p);
      setForm({
        title: p.title || '', slug: p.slug || '', content: p.content || '',
        excerpt: p.excerpt || '', featured_image_url: p.featured_image_url || '',
        page_type: p.page_type || 'page', status: p.status || 'draft',
        scheduled_at: p.scheduled_at ? new Date(p.scheduled_at).toISOString().slice(0, 16) : '',
        seo_title: p.seo_title || '', seo_description: p.seo_description || '',
        seo_keywords: p.seo_keywords || '', og_image_url: p.og_image_url || '',
        category: p.category || '', tags: Array.isArray(p.tags) ? p.tags : []
      });
    } catch { navigate(-1); }
    setLoading(false);
  };

  const loadVersions = async () => {
    if (!brand || isNew) return;
    setVersionsLoading(true);
    try {
      const res = await cmsAPI.listVersions(brand.id, pageId);
      setVersions(res.data.data || []);
    } catch { /* non-critical */ }
    setVersionsLoading(false);
  };

  const handleVersionsOpen = () => {
    const next = !versionsOpen;
    setVersionsOpen(next);
    if (next && versions.length === 0) loadVersions();
  };

  const handleRestore = async (versionId) => {
    if (!confirm('Restore this version? The current content will be snapshotted as a new version first.')) return;
    setRestoring(true);
    try {
      const res = await cmsAPI.restoreVersion(brand.id, pageId, versionId);
      const p = res.data.data;
      setForm(prev => ({
        ...prev,
        title: p.title || prev.title,
        content: p.content || prev.content,
        excerpt: p.excerpt || prev.excerpt,
        seo_title: p.seo_title || prev.seo_title,
        seo_description: p.seo_description || prev.seo_description,
        seo_keywords: p.seo_keywords || prev.seo_keywords,
      }));
      setVersionsOpen(false);
      setVersions([]);
      setSaved(false);
    } catch { alert('Restore failed. Please try again.'); }
    setRestoring(false);
  };

  const handleSendForReview = async () => {
    if (!brand) return;
    setReviewLoading(true);
    try {
      // Save first
      await savePage(form.status, true);
      const res = await cmsAPI.sendForReview(brand.id, pageId);
      setReviewUrl(res.data.data.review_url);
      setPageData(prev => ({ ...prev, review_status: 'pending_review' }));
      setShowReviewModal(true);
    } catch(e) { alert(e.response?.data?.message || 'Failed to generate review link'); }
    setReviewLoading(false);
  };

  const setField = (key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'title' && (prev.slug === '' || prev.slug === generateSlug(prev.title))) {
        next.slug = generateSlug(value);
      }
      return next;
    });
    setSaved(false);
    scheduleAutoSave();
  };

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => { if (!isNew) savePage('draft', true); }, 30_000);
  }, [isNew]);

  const buildPayload = (status) => ({
    ...form,
    status,
    scheduled_at: status === 'scheduled' && form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
    site_id: siteId
  });

  const savePage = async (statusOverride, silent = false) => {
    if (!brand) return;
    if (!silent) setSaving(true);
    const payload = buildPayload(statusOverride || form.status);
    try {
      if (isNew) {
        const res = await cmsAPI.createPage(brand.id, payload);
        navigate(`/cms/editor/${siteId}/${res.data.data.id}`, { replace: true });
      } else {
        const res = await cmsAPI.updatePage(brand.id, pageId, payload);
        if (res.data.data) setPageData(res.data.data);
      }
      if (!silent) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch(e) { if (!silent) alert(e.response?.data?.message || 'Save failed'); }
    if (!silent) setSaving(false);
  };

  const handleAiGenerate = async () => {
    if (!brand || !aiForm.topic) return;
    setAiLoading(true);
    try {
      const res = await cmsAPI.generateContent(brand.id, {
        title: aiForm.topic, keywords: aiForm.keywords, pageType: form.page_type, tone: aiForm.tone
      });
      const { content, seoTitle, seoDescription } = res.data.data;
      setForm(prev => ({
        ...prev, content,
        seo_title: seoTitle || prev.seo_title,
        seo_description: seoDescription || prev.seo_description,
        title: prev.title || aiForm.topic
      }));
      setShowAiModal(false);
    } catch(e) { alert(e.response?.data?.message || 'AI generation failed'); }
    setAiLoading(false);
  };

  const handleEditorImageInsert = (callback) => {
    setMediaPickerCallback(() => callback);
    setShowMediaPicker(true);
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !form.tags.includes(t)) {
      setField('tags', [...form.tags, t]);
    }
    setTagInput('');
  };

  const reviewStatus = pageData?.review_status;

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-full text-gray-500">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/cms')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">← Back</button>
            <span className="text-sm text-gray-400 capitalize">{form.page_type}</span>
            {saved && <span className="text-xs text-green-600">✓ Saved</span>}
            {reviewStatus && reviewStatus !== 'none' && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REVIEW_STATUS_STYLES[reviewStatus]}`}>
                {REVIEW_STATUS_LABELS[reviewStatus]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAiModal(true)}
              className="px-3 py-1.5 text-sm border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 flex items-center gap-1">
              ✨ AI Assist
            </button>
            {!isNew && (
              <button onClick={handleSendForReview} disabled={reviewLoading}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1 disabled:opacity-50">
                {reviewLoading ? '...' : '📤 Send for Review'}
              </button>
            )}
            <button onClick={() => savePage('draft')} disabled={saving}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button onClick={() => savePage('published')} disabled={saving}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Publish
            </button>
          </div>
        </div>

        {/* Editor layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Editor */}
          <div className="flex-1 overflow-auto p-6">
            <input
              type="text"
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="Page Title"
              className="w-full text-3xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none mb-4 placeholder-gray-300"
            />
            <RichTextEditor
              value={form.content}
              onChange={v => setField('content', v)}
              placeholder="Start writing your content..."
              className="min-h-[500px]"
              onInsertImageUrl={handleEditorImageInsert}
            />
          </div>

          {/* Right: Settings sidebar */}
          <div className="w-72 shrink-0 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-auto">
            <div className="p-4 space-y-5">
              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                <select value={form.status} onChange={e => setField('status', e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="archived">Archived</option>
                </select>
                {form.status === 'scheduled' && (
                  <input type="datetime-local" value={form.scheduled_at} onChange={e => setField('scheduled_at', e.target.value)}
                    className="w-full mt-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"/>
                )}
              </div>

              {/* Slug */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">URL Slug</label>
                <input value={form.slug} onChange={e => setField('slug', e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono"/>
                <p className="text-xs text-gray-400 mt-1">/{form.slug || 'your-page-url'}</p>
              </div>

              {/* Featured Image */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Featured Image</label>
                {form.featured_image_url ? (
                  <div className="mt-1 relative group">
                    <img src={form.featured_image_url.startsWith('/') ? `${import.meta.env.VITE_API_URL || ''}${form.featured_image_url}` : form.featured_image_url}
                      alt="Featured" className="w-full h-32 object-cover rounded-lg" />
                    <button onClick={() => setField('featured_image_url', '')}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center">×</button>
                  </div>
                ) : (
                  <button onClick={() => setShowFeaturedPicker(true)}
                    className="w-full mt-1 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-400 hover:border-blue-400 transition-colors">
                    + Choose Image
                  </button>
                )}
              </div>

              {/* Excerpt */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Excerpt</label>
                <textarea value={form.excerpt} onChange={e => setField('excerpt', e.target.value)}
                  rows={3} placeholder="Short summary (auto-filled if left blank)"
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 resize-none"/>
              </div>

              {/* Category & Tags */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
                <input value={form.category} onChange={e => setField('category', e.target.value)}
                  placeholder="e.g. Marketing, News"
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tags</label>
                <div className="flex gap-1 mt-1">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag, press Enter"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"/>
                  <button onClick={addTag} className="px-2 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg">+</button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.tags.map(t => (
                      <span key={t} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        #{t}
                        <button onClick={() => setField('tags', form.tags.filter(x => x !== t))} className="text-blue-400 hover:text-blue-600">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* SEO */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button onClick={() => setSeoOpen(o => !o)}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-100 dark:bg-gray-800 flex items-center justify-between">
                  SEO Settings
                  <span>{seoOpen ? '▲' : '▼'}</span>
                </button>
                {seoOpen && (
                  <div className="p-3 space-y-3">
                    <div>
                      <label className="text-xs text-gray-500">SEO Title <span className="text-gray-400">({(form.seo_title || form.title).length}/60)</span></label>
                      <input value={form.seo_title} onChange={e => setField('seo_title', e.target.value)}
                        placeholder={form.title || 'SEO title'}
                        className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"/>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Meta Description <span className="text-gray-400">({form.seo_description.length}/155)</span></label>
                      <textarea value={form.seo_description} onChange={e => setField('seo_description', e.target.value)}
                        rows={3} placeholder="Meta description for search engines"
                        className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 resize-none"/>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Keywords</label>
                      <input value={form.seo_keywords} onChange={e => setField('seo_keywords', e.target.value)}
                        placeholder="keyword1, keyword2"
                        className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"/>
                    </div>
                  </div>
                )}
              </div>

              {/* Version History */}
              {!isNew && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button onClick={handleVersionsOpen}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-100 dark:bg-gray-800 flex items-center justify-between">
                    Version History
                    <span>{versionsOpen ? '▲' : '▼'}</span>
                  </button>
                  {versionsOpen && (
                    <div className="p-2">
                      {versionsLoading ? (
                        <p className="text-xs text-gray-400 text-center py-3">Loading...</p>
                      ) : versions.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">No saved versions yet.<br/>Versions are saved when you publish.</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-auto">
                          {versions.map(v => (
                            <div key={v.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 group">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">v{v.version_number} — {v.title || '(no title)'}</p>
                                <p className="text-xs text-gray-400">
                                  {v.saved_by_name || 'Auto'} · {new Date(v.snapshot_at).toLocaleDateString()}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRestore(v.id)}
                                disabled={restoring}
                                className="ml-2 text-xs text-blue-600 hover:underline opacity-0 group-hover:opacity-100 shrink-0 disabled:opacity-30"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Review status display */}
              {!isNew && reviewStatus && reviewStatus !== 'none' && (
                <div className={`rounded-lg p-3 text-sm ${REVIEW_STATUS_STYLES[reviewStatus]}`}>
                  <p className="font-semibold">{REVIEW_STATUS_LABELS[reviewStatus]}</p>
                  {pageData?.review_notes && (
                    <p className="mt-1 text-xs opacity-80">{pageData.review_notes}</p>
                  )}
                  {pageData?.reviewer_name && (
                    <p className="mt-0.5 text-xs opacity-70">— {pageData.reviewer_name}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">✨ AI Content Generator</h2>
            <p className="text-sm text-gray-500 mb-4">Describe what you want to write and AI will generate the content.</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Topic / Title *</label>
                <input value={aiForm.topic} onChange={e => setAiForm(p => ({...p, topic: e.target.value}))}
                  placeholder="e.g. 5 tips for better client communication"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Keywords (optional)</label>
                <input value={aiForm.keywords} onChange={e => setAiForm(p => ({...p, keywords: e.target.value}))}
                  placeholder="CRM, agency, productivity"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tone</label>
                <select value={aiForm.tone} onChange={e => setAiForm(p => ({...p, tone: e.target.value}))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800">
                  {['professional', 'conversational', 'authoritative', 'friendly', 'persuasive'].map(t => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowAiModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleAiGenerate} disabled={aiLoading || !aiForm.topic}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {aiLoading ? 'Generating...' : '✨ Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send for Review success modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">📤 Review Link Ready</h2>
            <p className="text-sm text-gray-500 mb-4">Share this link with your client. No login required.</p>
            <div className="flex gap-2">
              <input readOnly value={reviewUrl}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 font-mono truncate"/>
              <button
                onClick={() => { navigator.clipboard.writeText(reviewUrl); }}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 shrink-0">
                Copy
              </button>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowReviewModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Featured image picker */}
      {showFeaturedPicker && brand && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Choose Featured Image</h2>
              <button onClick={() => setShowFeaturedPicker(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <MediaLibrary brandId={brand.id} siteId={siteId} mode="picker"
              onSelect={item => { setField('featured_image_url', item.file_url); setShowFeaturedPicker(false); }} />
          </div>
        </div>
      )}

      {/* Editor image picker */}
      {showMediaPicker && brand && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Insert Image</h2>
              <button onClick={() => setShowMediaPicker(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <MediaLibrary brandId={brand.id} siteId={siteId} mode="picker"
              onSelect={item => {
                const url = item.file_url.startsWith('/') ? `${import.meta.env.VITE_API_URL || ''}${item.file_url}` : item.file_url;
                mediaPickerCallback?.(url, item.alt_text || item.filename);
                setShowMediaPicker(false);
                setMediaPickerCallback(null);
              }} />
          </div>
        </div>
      )}
    </Layout>
  );
}
