import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import api from '../services/api';
import { brandAPI } from '../services/api';

const emptyCategory = { name: '', slug: '', description: '' };
const emptyArticle = { title: '', slug: '', content: '', category_id: '', status: 'draft', is_public: false };

const KnowledgeBase = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [tab, setTab] = useState('articles');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_articles: 0, total_views: 0, helpful_ratio: 0 });

  // Categories
  const [categories, setCategories] = useState([]);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ ...emptyCategory });
  const [catSaving, setCatSaving] = useState(false);

  // Articles
  const [articles, setArticles] = useState([]);
  const [showArtForm, setShowArtForm] = useState(false);
  const [editingArt, setEditingArt] = useState(null);
  const [artForm, setArtForm] = useState({ ...emptyArticle });
  const [artSaving, setArtSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchBrands(); }, []);
  useEffect(() => { if (selectedBrand) { fetchAll(); } }, [selectedBrand]);

  const fetchBrands = async () => {
    try {
      const res = await brandAPI.getUserBrands();
      const list = res.data.data?.brands || [];
      setBrands(list);
      if (list.length > 0) setSelectedBrand(list[0]);
    } catch { toast.error('Failed to load brands'); }
    finally { setLoading(false); }
  };

  const fetchAll = () => { fetchCategories(); fetchArticles(); fetchStats(); };

  const fetchCategories = async () => {
    try {
      const res = await api.get(`/kb/${selectedBrand.id}/categories`);
      setCategories(res.data.data?.categories || res.data.categories || res.data.data || []);
    } catch { /* silent */ }
  };

  const fetchArticles = async () => {
    try {
      const res = await api.get(`/kb/${selectedBrand.id}/articles`);
      setArticles(res.data.data?.articles || res.data.articles || res.data.data || []);
    } catch { /* silent */ }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get(`/kb/${selectedBrand.id}/stats`);
      setStats(res.data.data || res.data || { total_articles: 0, total_views: 0, helpful_ratio: 0 });
    } catch { /* silent */ }
  };

  // Category CRUD
  const openNewCat = () => { setEditingCat(null); setCatForm({ ...emptyCategory }); setShowCatForm(true); };
  const openEditCat = (c) => { setEditingCat(c.id); setCatForm({ name: c.name, slug: c.slug || '', description: c.description || '' }); setShowCatForm(true); };

  const saveCat = async () => {
    if (!catForm.name.trim()) return toast.error('Name is required');
    setCatSaving(true);
    try {
      if (editingCat) {
        await api.put(`/kb/${selectedBrand.id}/categories/${editingCat}`, catForm);
        toast.success('Category updated');
      } else {
        await api.post(`/kb/${selectedBrand.id}/categories`, catForm);
        toast.success('Category created');
      }
      setShowCatForm(false);
      fetchCategories();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setCatSaving(false); }
  };

  const deleteCat = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/kb/${selectedBrand.id}/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch { toast.error('Delete failed'); }
  };

  // Article CRUD
  const openNewArt = () => { setEditingArt(null); setArtForm({ ...emptyArticle }); setShowArtForm(true); };
  const openEditArt = (a) => {
    setEditingArt(a.id);
    setArtForm({ title: a.title, slug: a.slug || '', content: a.content || '', category_id: a.category_id || '', status: a.status || 'draft', is_public: !!a.is_public });
    setShowArtForm(true);
  };

  const saveArt = async () => {
    if (!artForm.title.trim()) return toast.error('Title is required');
    setArtSaving(true);
    try {
      const payload = { ...artForm, category_id: artForm.category_id || null };
      if (editingArt) {
        await api.put(`/kb/${selectedBrand.id}/articles/${editingArt}`, payload);
        toast.success('Article updated');
      } else {
        await api.post(`/kb/${selectedBrand.id}/articles`, payload);
        toast.success('Article created');
      }
      setShowArtForm(false);
      fetchArticles();
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setArtSaving(false); }
  };

  const deleteArt = async (id) => {
    if (!confirm('Delete this article?')) return;
    try {
      await api.delete(`/kb/${selectedBrand.id}/articles/${id}`);
      toast.success('Article deleted');
      fetchArticles();
      fetchStats();
    } catch { toast.error('Delete failed'); }
  };

  const filteredArticles = articles.filter(a =>
    !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.content?.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (s) => {
    const cls = s === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{s}</span>;
  };

  if (loading) return <Layout><div className="p-6 text-gray-400">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
          {brands.length > 1 && (
            <select value={selectedBrand?.id || ''} onChange={e => setSelectedBrand(brands.find(b => b.id === e.target.value))}
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm">
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.total_articles ?? 0}</div>
            <div className="text-xs text-gray-400 mt-1">Total Articles</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{(stats.total_views ?? 0).toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">Total Views</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.helpful_ratio ?? 0}%</div>
            <div className="text-xs text-gray-400 mt-1">Helpful Ratio</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-gray-700">
          {['articles', 'categories'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
              {t === 'articles' ? 'Articles' : 'Categories'}
            </button>
          ))}
        </div>

        {/* Articles Tab */}
        {tab === 'articles' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <button onClick={openNewArt} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap">
                + New Article
              </button>
            </div>
            {filteredArticles.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No articles found.</div>
            ) : (
              <div className="space-y-2">
                {filteredArticles.map(a => (
                  <div key={a.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium truncate">{a.title}</span>
                        {statusBadge(a.status || 'draft')}
                        {a.is_public && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">Public</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        {categories.find(c => c.id === a.category_id)?.name || 'Uncategorized'}
                        {a.views_count ? ` · ${a.views_count} views` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button onClick={() => openEditArt(a)} className="px-3 py-1 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition">Edit</button>
                      <button onClick={() => deleteArt(a.id)} className="px-3 py-1 text-sm text-red-400 hover:text-red-300 border border-gray-600 rounded-lg transition">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {tab === 'categories' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={openNewCat} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                + New Category
              </button>
            </div>
            {categories.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No categories yet.</div>
            ) : (
              <div className="space-y-2">
                {categories.map(c => (
                  <div key={c.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.slug ? `/${c.slug}` : ''} {c.description ? `- ${c.description}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditCat(c)} className="px-3 py-1 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition">Edit</button>
                      <button onClick={() => deleteCat(c.id)} className="px-3 py-1 text-sm text-red-400 hover:text-red-300 border border-gray-600 rounded-lg transition">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category Form Modal */}
        {showCatForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-white mb-4">{editingCat ? 'Edit Category' : 'New Category'}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name *</label>
                  <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Slug</label>
                  <input value={catForm.slug} onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="auto-generated-if-empty" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} rows={2}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button onClick={() => setShowCatForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition">Cancel</button>
                <button onClick={saveCat} disabled={catSaving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                  {catSaving ? 'Saving...' : editingCat ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Article Form Modal */}
        {showArtForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
              <h2 className="text-lg font-bold text-white mb-4">{editingArt ? 'Edit Article' : 'New Article'}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title *</label>
                  <input value={artForm.title} onChange={e => setArtForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Slug</label>
                  <input value={artForm.slug} onChange={e => setArtForm(f => ({ ...f, slug: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="auto-generated-if-empty" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Category</label>
                    <select value={artForm.category_id} onChange={e => setArtForm(f => ({ ...f, category_id: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                      <option value="">Uncategorized</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Status</label>
                    <select value={artForm.status} onChange={e => setArtForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Content</label>
                  <textarea value={artForm.content} onChange={e => setArtForm(f => ({ ...f, content: e.target.value }))} rows={8}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={artForm.is_public} onChange={e => setArtForm(f => ({ ...f, is_public: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-900 text-blue-600" />
                  <span className="text-sm text-gray-400">Publicly visible (no login required)</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button onClick={() => setShowArtForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition">Cancel</button>
                <button onClick={saveArt} disabled={artSaving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                  {artSaving ? 'Saving...' : editingArt ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default KnowledgeBase;
