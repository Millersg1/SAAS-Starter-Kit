import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ImportClientsModal from '../components/ImportClientsModal';
import { clientAPI, brandAPI, subscriptionAPI } from '../services/api';
import { downloadCSV } from '../utils/csvUtils';

const Clients = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [planLimit, setPlanLimit] = useState(null); // { max, current, planName }

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchClients();
      fetchStats();
      fetchPlanLimit();
    }
  }, [selectedBrand]);

  const fetchPlanLimit = async () => {
    try {
      const res = await subscriptionAPI.getSubscription(selectedBrand.id);
      const sub = res.data.data?.subscription;
      if (sub && sub.max_clients !== undefined) {
        setPlanLimit({ max: sub.max_clients, planName: sub.plan_name });
      }
    } catch {
      // No subscription found — no limit to enforce in UI
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await brandAPI.getUserBrands();
      const brandsData = response.data.data?.brands || [];
      setBrands(brandsData);
      if (brandsData.length > 0) {
        setSelectedBrand(brandsData[0]);
      }
    } catch (err) {
      setError('Failed to load brands');
    }
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await clientAPI.getBrandClients(selectedBrand.id, {});
      setClients(response.data.data?.clients || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await clientAPI.getClientStats(selectedBrand.id);
      const rawStats = response.data.data?.stats || {};
      // PostgreSQL COUNT() returns strings, convert to numbers
      setStats({
        total_clients: parseInt(rawStats.total_clients || 0),
        active_clients: parseInt(rawStats.active_clients || 0),
        inactive_clients: parseInt(rawStats.inactive_clients || 0),
        pending_clients: parseInt(rawStats.pending_clients || 0),
        portal_enabled: parseInt(rawStats.portal_enabled || 0),
        vip_clients: parseInt(rawStats.vip_clients || 0),
        enterprise_clients: parseInt(rawStats.enterprise_clients || 0),
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClientTypeColor = (type) => {
    switch (type) {
      case 'vip': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-blue-100 text-blue-800';
      case 'trial': return 'bg-yellow-100 text-yellow-800';
      case 'regular': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!selectedBrand) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-gray-600 mb-4">No brands available</p>
            <button
              onClick={() => navigate('/brands')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create a brand first →
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
              <p className="text-gray-600 mt-1">Manage your clients and contacts</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const rows = clients.map(c => ({
                    Name: c.name,
                    Company: c.company || '',
                    Email: c.email,
                    Phone: c.phone || '',
                    Status: c.status,
                    Type: c.client_type,
                    City: c.city || '',
                    State: c.state || '',
                  }));
                  downloadCSV(rows, 'clients.csv');
                }}
                className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                disabled={clients.length === 0}
              >
                Export CSV
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Import CSV
              </button>
              <button
                onClick={() => navigate('/clients/new')}
                disabled={planLimit?.max !== null && planLimit?.max !== undefined && clients.length >= planLimit.max}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={planLimit?.max !== null && planLimit?.max !== undefined && clients.length >= planLimit.max ? `Plan limit reached (${planLimit.max} clients)` : undefined}
              >
                + Add Client
              </button>
            </div>
          </div>

          {brands.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Brand
              </label>
              <select
                value={selectedBrand?.id || ''}
                onChange={(e) => {
                  const brand = brands.find(b => b.id === e.target.value);
                  setSelectedBrand(brand);
                }}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {planLimit?.max !== null && planLimit?.max !== undefined && (() => {
          const pct = Math.round((clients.length / planLimit.max) * 100);
          if (pct < 80) return null;
          const atLimit = clients.length >= planLimit.max;
          return (
            <div className={`mb-4 px-4 py-3 rounded-lg flex items-center justify-between ${atLimit ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
              <span className="text-sm font-medium">
                {atLimit
                  ? `Client limit reached — you're on the ${planLimit.planName} plan (${planLimit.max} clients max).`
                  : `Approaching client limit — ${clients.length} of ${planLimit.max} clients used (${pct}%).`}
              </span>
              <a href="/subscriptions" className={`ml-4 text-sm font-semibold underline whitespace-nowrap ${atLimit ? 'text-red-700' : 'text-amber-700'}`}>
                Upgrade Plan →
              </a>
            </div>
          );
        })()}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_clients || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active_clients || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Portal Enabled</p>
              <p className="text-2xl font-bold text-blue-600">{stats.portal_enabled || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">VIP Clients</p>
              <p className="text-2xl font-bold text-purple-600">{stats.vip_clients || 0}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600">Loading clients...</div>
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No clients yet</h3>
            <p className="text-gray-600 mb-6">Add your first client to get started</p>
            <button
              onClick={() => navigate('/clients/new')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Client
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{client.name}</h3>
                      {client.company && (
                        <p className="text-sm text-gray-600">{client.company}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(client.status)}`}>
                        {client.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getClientTypeColor(client.client_type)}`}>
                        {client.client_type}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600 flex items-center">
                      <span className="mr-2">📧</span>
                      {client.email}
                    </p>
                    {client.phone && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <span className="mr-2">📞</span>
                        {client.phone}
                      </p>
                    )}
                    {client.city && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <span className="mr-2">📍</span>
                        {client.city}{client.state && `, ${client.state}`}
                      </p>
                    )}
                  </div>

                  {client.tags && client.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {client.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {client.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          +{client.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>

    {showImport && selectedBrand && (
      <ImportClientsModal
        brandId={selectedBrand.id}
        onClose={() => setShowImport(false)}
        onImported={() => { fetchClients(); fetchStats(); }}
      />
    )}
    </>
  );
};

export default Clients;
