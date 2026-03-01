import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import MediaLibrary from '../components/MediaLibrary';
import { cmsAPI, brandAPI } from '../services/api';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  archived: 'bg-yellow-100 text-yellow-700'
};

export default function CMS() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [pages, setPages] = useState([]);
  const [activeTab, setActiveTab] = useState('pages');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewSiteModal, setShowNewSiteModal] = useState(false);
  const [newSiteForm, setNewSiteForm] = useState({ name: '', domain: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    brandAPI.getBrands().then(res => {
      const b = res.data.data || [];
      setBrands(b);
      if (b.length) setSelectedBrand(b[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedBrand) fetchSites();
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedSite) fetchPages();
  }, [selectedSite, activeTab, statusFilter, search]);

  const fetchSites = async () => {
    try {
      const res = await cmsAPI.listSites(selectedBrand.id);
      const s = res.data.data || [];
      setSites(s);
      if (s.length && !selectedSite) setSelectedSite(s[0]);
      else if (!s.length) setSelectedSite(null);
    } catch { setSites([]); }
  };

  const fetchPages = async () => {
    if (!selectedSite) return;
    setLoading(true);
    try {
      const res = await cmsAPI.listPages(selectedBrand.id, {
        site_id: selectedSite.id,
        type: activeTab === 'posts' ? 'post' : activeTab === 'pages' ? 'page' : undefined,
        status: statusFilter || undefined,
        search: search || undefined
      });
      setPages(res.data.data || []);
    } catch { setPages([]); }
    setLoading(false);
  };

  const handleCreateSite = async () => {
    if (!newSiteForm.name.trim()) return;
    setCreating(true);
    try {
      const res = await cmsAPI.createSite(selectedBrand.id, newSiteForm);
      const site = res.data.data;
      setSites(prev => [...prev, site]);
      setSelectedSite(site);
      setShowNewSiteModal(false);
      setNewSiteForm({ name: '', domain: '', description: '' });
    } catch(e) { alert(e.response?.data?.message || 'Failed to create site'); }
    setCreating(false);
  };

  const handleDeletePage = async (pageId) => {
    if (!confirm('Delete this page? This cannot be undone.')) return;
    try {
      await cmsAPI.deletePage(selectedBrand.id, pageId);
      setPages(prev => prev.filter(p => p.id !== pageId));
    } catch(e) { alert(e.response?.data?.message || 'Failed to delete'); }
  };

  const stats = {
    total: pages.length,
    published: pages.filter(p => p.status === 'published').length,
    draft: pages.filter(p => p.status === 'draft').length,
    scheduled: pages.filter(p => p.status === 'scheduled').length
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">🌐 CMS</h1>
            {/* Brand selector */}
            {brands.length > 1 && (
              <select value={selectedBrand?.id || ''} onChange={e => setSelectedBrand(brands.find(b => b.id === e.target.value))}
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800">
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            {/* Site selector */}
            {sites.length > 0 && (
              <select value={selectedSite?.id || ''} onChange={e => setSelectedSite(sites.find(s => s.id === e.target.value))}
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800">
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <button onClick={() => setShowNewSiteModal(true)}
              className="text-sm px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
              + New Site
            </button>
          </div>
          <div className="flex gap-2">
            {selectedSite && activeTab !== 'media' && (
              <>
                <button onClick={() => navigate(`/cms/editor/${selectedSite.id}/new?type=post`)}
                  className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  + New Post
                </button>
                <button onClick={() => navigate(`/cms/editor/${selectedSite.id}/new?type=page`)}
                  className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  + New Page
                </button>
              </>
            )}
          </div>
        </div>

        {!selectedBrand ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">No brands found. Create a brand first.</div>
        ) : !selectedSite ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
            <p>No sites yet. Create your first site to start managing content.</p>
            <button onClick={() => setShowNewSiteModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Site</button>
          </div>
        ) : (
          <>
            {/* Stats strip */}
            <div className="flex items-center gap-6 px-6 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Site: <strong>{selectedSite.name}</strong>{selectedSite.domain && ` · ${selectedSite.domain}`}</span>
              <span className="text-gray-500">{stats.total} total · <span className="text-green-600">{stats.published} published</span> · <span className="text-gray-500">{stats.draft} drafts</span> · <span className="text-blue-600">{stats.scheduled} scheduled</span></span>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-gray-200 dark:border-gray-700">
              {['pages', 'posts', 'media'].map(tab => (
                <button key={tab} onClick={() => { setActiveTab(tab); setStatusFilter(''); setSearch(''); }}
                  className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg -mb-px border ${
                    activeTab === tab
                      ? 'border-gray-200 dark:border-gray-700 border-b-white dark:border-b-gray-800 bg-white dark:bg-gray-800 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab === 'pages' ? '📄 Pages' : tab === 'posts' ? '✍️ Blog Posts' : '🖼 Media'}
                </button>
              ))}
            </div>

            {activeTab === 'media' ? (
              <div className="flex-1 overflow-auto p-6">
                <MediaLibrary brandId={selectedBrand.id} siteId={selectedSite.id} mode="manager" />
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                {/* Filters */}
                <div className="flex items-center gap-3 px-6 py-3">
                  <input type="text" placeholder={`Search ${activeTab}...`} value={search} onChange={e => setSearch(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"/>
                  <div className="flex gap-1">
                    {['', 'draft', 'published', 'scheduled', 'archived'].map(s => (
                      <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1 text-xs rounded-full capitalize ${
                          statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                        }`}>
                        {s || 'All'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pages table */}
                {loading ? (
                  <div className="text-center py-12 text-gray-500">Loading...</div>
                ) : pages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg mb-2">No {activeTab} yet</p>
                    <button onClick={() => navigate(`/cms/editor/${selectedSite.id}/new?type=${activeTab === 'posts' ? 'post' : 'page'}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                      Create your first {activeTab === 'posts' ? 'post' : 'page'}
                    </button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        {['Title', 'Status', 'Category', 'Author', 'Updated'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {pages.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => navigate(`/cms/editor/${selectedSite.id}/${p.id}`)}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{p.title}</div>
                            <div className="text-xs text-gray-400">/{p.slug}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{p.category || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{p.author_name || '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—'}</td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleDeletePage(p.id)} className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* New Site Modal */}
      {showNewSiteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Create New Site</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Site Name *</label>
                <input value={newSiteForm.name} onChange={e => setNewSiteForm(p => ({...p, name: e.target.value}))}
                  placeholder="My Agency Website" className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Domain (optional)</label>
                <input value={newSiteForm.domain} onChange={e => setNewSiteForm(p => ({...p, domain: e.target.value}))}
                  placeholder="www.example.com" className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description (optional)</label>
                <textarea value={newSiteForm.description} onChange={e => setNewSiteForm(p => ({...p, description: e.target.value}))}
                  rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"/>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowNewSiteModal(false)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreateSite} disabled={creating || !newSiteForm.name.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Site'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
