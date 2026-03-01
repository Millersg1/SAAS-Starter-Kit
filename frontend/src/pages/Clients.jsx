import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ImportClientsModal from '../components/ImportClientsModal';
import { clientAPI, brandAPI, subscriptionAPI, revenueAnalyticsAPI, churnAPI } from '../services/api';
import { downloadCSV } from '../utils/csvUtils';

const Clients = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [clients, setClients] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [planLimit, setPlanLimit] = useState(null);

  // Tag filter + bulk selection
  const [activeTag, setActiveTag] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkTagAction, setBulkTagAction] = useState('add');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [healthMap, setHealthMap] = useState({});
  const [churnMap, setChurnMap] = useState({});

  useEffect(() => { fetchBrands(); }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchClients();
      fetchStats();
      fetchPlanLimit();
      fetchTags();
      fetchHealthScores();
      fetchChurnPredictions();
    }
  }, [selectedBrand]);

  const fetchHealthScores = async () => {
    try {
      const res = await revenueAnalyticsAPI.healthScores(selectedBrand.id);
      const scores = res.data.data?.scores || [];
      const map = {};
      scores.forEach(s => { map[s.id] = s.health_score; });
      setHealthMap(map);
    } catch { /* non-critical */ }
  };

  const fetchChurnPredictions = async () => {
    try {
      const res = await churnAPI.getPredictions(selectedBrand.id);
      const predictions = res.data.data?.predictions || [];
      const map = {};
      predictions.forEach(p => { map[p.client_id] = p.churn_probability; });
      setChurnMap(map);
    } catch { /* non-critical */ }
  };

  const fetchPlanLimit = async () => {
    try {
      const res = await subscriptionAPI.getSubscription(selectedBrand.id);
      const sub = res.data.data?.subscription;
      if (sub && sub.max_clients !== undefined) setPlanLimit({ max: sub.max_clients, planName: sub.plan_name });
    } catch { /* no limit */ }
  };

  const fetchBrands = async () => {
    try {
      const response = await brandAPI.getUserBrands();
      const brandsData = response.data.data?.brands || [];
      setBrands(brandsData);
      if (brandsData.length > 0) setSelectedBrand(brandsData[0]);
    } catch { setError('Failed to load brands'); }
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await clientAPI.getBrandClients(selectedBrand.id, {});
      setClients(response.data.data?.clients || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clients');
    } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const response = await clientAPI.getClientStats(selectedBrand.id);
      const rawStats = response.data.data?.stats || {};
      setStats({
        total_clients: parseInt(rawStats.total_clients || 0),
        active_clients: parseInt(rawStats.active_clients || 0),
        portal_enabled: parseInt(rawStats.portal_enabled || 0),
        vip_clients: parseInt(rawStats.vip_clients || 0),
      });
    } catch { /* non-critical */ }
  };

  const fetchTags = async () => {
    try {
      const res = await clientAPI.getBrandTags(selectedBrand.id);
      setAllTags(res.data.data?.tags || []);
    } catch { /* non-critical */ }
  };

  const handleBulkTag = async () => {
    const tags = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean);
    if (!tags.length) return;
    setBulkSaving(true);
    try {
      await clientAPI.bulkTagClients(selectedBrand.id, { client_ids: selectedIds, tags, action: bulkTagAction });
      setSuccessMessage(`Tags ${bulkTagAction}ed on ${selectedIds.length} client(s)`);
      setShowBulkTagModal(false);
      setBulkTagInput('');
      setSelectedIds([]);
      await fetchClients();
      await fetchTags();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update tags');
    } finally { setBulkSaving(false); }
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setSelectedIds(filtered.map(c => c.id));
  const clearSelect = () => setSelectedIds([]);

  const filtered = activeTag ? clients.filter(c => c.tags?.includes(activeTag)) : clients;

  const getStatusColor = (s) => ({ active: 'bg-green-100 text-green-800', inactive: 'bg-gray-100 text-gray-800', pending: 'bg-yellow-100 text-yellow-800' }[s] || 'bg-gray-100 text-gray-800');
  const getTypeColor = (t) => ({ vip: 'bg-purple-100 text-purple-800', enterprise: 'bg-blue-100 text-blue-800', trial: 'bg-yellow-100 text-yellow-800', regular: 'bg-gray-100 text-gray-800' }[t] || 'bg-gray-100 text-gray-800');
  const healthBadgeClass = (score) => {
    if (score === null || score === undefined) return 'bg-gray-100 text-gray-500';
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    if (score >= 40) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  if (!selectedBrand) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-gray-600 mb-4">No brands available</p>
            <button onClick={() => navigate('/brands')} className="text-blue-600 hover:text-blue-700 font-medium">Create a brand first →</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Layout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
                <p className="text-gray-600 mt-1">Manage your clients and contacts</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { const rows = clients.map(c => ({ Name: c.name, Company: c.company || '', Email: c.email, Phone: c.phone || '', Status: c.status, Type: c.client_type, Tags: (c.tags || []).join('; '), City: c.city || '', State: c.state || '' })); downloadCSV(rows, 'clients.csv'); }}
                  className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm"
                  disabled={clients.length === 0}
                >Export CSV</button>
                <button onClick={() => setShowImport(true)} className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">Import CSV</button>
                <button
                  onClick={() => navigate('/clients/new')}
                  disabled={planLimit?.max != null && clients.length >= planLimit.max}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >+ Add Client</button>
              </div>
            </div>

            {brands.length > 1 && (
              <div className="mb-4">
                <select value={selectedBrand?.id || ''} onChange={e => setSelectedBrand(brands.find(b => b.id === e.target.value))} className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg text-gray-900">
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {successMessage && <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">{successMessage}</div>}
          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{error}</div>}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4"><p className="text-sm text-gray-600">Total</p><p className="text-2xl font-bold text-gray-900">{stats.total_clients}</p></div>
              <div className="bg-white rounded-lg shadow p-4"><p className="text-sm text-gray-600">Active</p><p className="text-2xl font-bold text-green-600">{stats.active_clients}</p></div>
              <div className="bg-white rounded-lg shadow p-4"><p className="text-sm text-gray-600">Portal</p><p className="text-2xl font-bold text-blue-600">{stats.portal_enabled}</p></div>
              <div className="bg-white rounded-lg shadow p-4"><p className="text-sm text-gray-600">VIP</p><p className="text-2xl font-bold text-purple-600">{stats.vip_clients}</p></div>
            </div>
          )}

          {/* Tag filter pills */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <span className="text-sm text-gray-500 font-medium">Filter by tag:</span>
              <button onClick={() => setActiveTag('')} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!activeTag ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>All</button>
              {allTags.map(tag => (
                <button key={tag} onClick={() => setActiveTag(activeTag === tag ? '' : tag)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeTag === tag ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>{tag}</button>
              ))}
            </div>
          )}

          {/* Bulk action bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-blue-800">{selectedIds.length} selected</span>
              <button onClick={() => { setBulkTagAction('add'); setShowBulkTagModal(true); }} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">+ Add Tags</button>
              <button onClick={() => { setBulkTagAction('remove'); setShowBulkTagModal(true); }} className="text-sm bg-white text-gray-700 border border-gray-300 px-3 py-1 rounded hover:bg-gray-50">– Remove Tags</button>
              <button onClick={clearSelect} className="text-sm text-blue-600 hover:underline ml-auto">Clear selection</button>
            </div>
          )}

          {/* Select all row */}
          {filtered.length > 0 && !loading && (
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
              <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={selectedIds.length === filtered.length ? clearSelect : selectAll} className="rounded" />
              <span>{selectedIds.length === filtered.length ? 'Deselect all' : 'Select all'}</span>
              {activeTag && <span className="text-gray-400">({filtered.length} matching "{activeTag}")</span>}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64"><div className="text-gray-600">Loading clients...</div></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{activeTag ? `No clients tagged "${activeTag}"` : 'No clients yet'}</h3>
              {!activeTag && <button onClick={() => navigate('/clients/new')} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Add Your First Client</button>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((client) => (
                <div key={client.id} className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden ${selectedIds.includes(client.id) ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-2 flex-1">
                        <input type="checkbox" checked={selectedIds.includes(client.id)} onChange={() => toggleSelect(client.id)} onClick={e => e.stopPropagation()} className="rounded mt-1 flex-shrink-0" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{client.name}</h3>
                          {client.company && <p className="text-sm text-gray-600">{client.company}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(client.status)}`}>{client.status}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(client.client_type)}`}>{client.client_type}</span>
                        {healthMap[client.id] !== undefined && (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${healthBadgeClass(healthMap[client.id])}`}>
                            ❤ {healthMap[client.id]}
                          </span>
                        )}
                        {churnMap[client.id] >= 70 && (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">
                            Churn {churnMap[client.id]}%
                          </span>
                        )}
                        {churnMap[client.id] >= 40 && churnMap[client.id] < 70 && (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-700">
                            Churn {churnMap[client.id]}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600">📧 {client.email}</p>
                      {client.phone && <p className="text-sm text-gray-600">📞 {client.phone}</p>}
                      {client.city && <p className="text-sm text-gray-600">📍 {client.city}{client.state && `, ${client.state}`}</p>}
                    </div>

                    {client.tags && client.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {client.tags.slice(0, 4).map((tag, i) => (
                          <button key={i} onClick={() => setActiveTag(tag)} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full hover:bg-blue-100 transition-colors">{tag}</button>
                        ))}
                        {client.tags.length > 4 && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">+{client.tags.length - 4}</span>}
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200">
                      <button onClick={() => navigate(`/clients/${client.id}`)} className="w-full bg-blue-50 text-blue-600 px-3 py-2 rounded hover:bg-blue-100 text-sm font-medium">View Details</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>

      {showImport && selectedBrand && (
        <ImportClientsModal brandId={selectedBrand.id} onClose={() => setShowImport(false)} onImported={() => { fetchClients(); fetchStats(); fetchTags(); }} />
      )}

      {/* Bulk Tag Modal */}
      {showBulkTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-1">{bulkTagAction === 'add' ? 'Add Tags' : 'Remove Tags'}</h2>
            <p className="text-sm text-gray-500 mb-4">Applies to {selectedIds.length} selected client(s)</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={bulkTagInput}
                onChange={e => setBulkTagInput(e.target.value)}
                placeholder="e.g. vip, newsletter, referral"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                onKeyDown={e => e.key === 'Enter' && handleBulkTag()}
              />
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {allTags.map(t => (
                    <button key={t} onClick={() => setBulkTagInput(prev => prev ? `${prev}, ${t}` : t)} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-blue-50 hover:text-blue-700">{t}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowBulkTagModal(false); setBulkTagInput(''); }} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleBulkTag} disabled={bulkSaving || !bulkTagInput.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {bulkSaving ? 'Saving...' : bulkTagAction === 'add' ? 'Add Tags' : 'Remove Tags'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Clients;
