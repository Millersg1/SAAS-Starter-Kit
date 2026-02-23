import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { contractAPI, brandAPI, clientAPI } from '../services/api';

const STATUS_COLORS = {
  draft:    'bg-gray-100 text-gray-700',
  sent:     'bg-blue-100 text-blue-700',
  signed:   'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  expired:  'bg-amber-100 text-amber-700',
};

export default function Contracts() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', client_id: '', issue_date: '', expiry_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    brandAPI.getUserBrands().then(res => {
      const bs = res.data.data?.brands || [];
      setBrands(bs);
      if (bs.length > 0) setSelectedBrand(bs[0]);
    }).catch(err => setError('Failed to load brands'));
  }, []);

  useEffect(() => {
    if (!selectedBrand) return;
    setLoading(true);
    Promise.all([
      contractAPI.list(selectedBrand.id),
      clientAPI.getClients(selectedBrand.id),
    ]).then(([cr, cl]) => {
      setContracts(cr.data.data?.contracts || []);
      setClients(cl.data.data?.clients || []);
    }).catch(() => setError('Failed to load contracts'))
      .finally(() => setLoading(false));
  }, [selectedBrand]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await contractAPI.create(selectedBrand.id, form);
      const newContract = res.data.data?.contract;
      setContracts(c => [newContract, ...c]);
      setShowCreate(false);
      setForm({ title: '', content: '', client_id: '', issue_date: '', expiry_date: '' });
      navigate(`/contracts/${newContract.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create contract');
    } finally { setSaving(false); }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
            <p className="text-gray-600">Create and send contracts for client signing</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Contract
          </button>
        </div>

        {brands.length > 1 && (
          <select
            value={selectedBrand?.id || ''}
            onChange={e => setSelectedBrand(brands.find(b => b.id === e.target.value))}
            className="mb-4 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
          >
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{error}</div>}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading contracts...</div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">📄</p>
            <p className="text-lg font-medium">No contracts yet</p>
            <p className="text-sm mt-1">Create your first contract to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {contracts.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/contracts/${c.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{c.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {c.contract_number} · {c.client_name || 'No client'}
                    {c.issue_date && ` · ${new Date(c.issue_date).toLocaleDateString()}`}
                  </p>
                </div>
                <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">New Contract</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g. Web Design Services Agreement"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select
                    value={form.client_id}
                    onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">— Select client —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                    <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Content</label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="Enter contract terms and conditions..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {saving ? 'Creating...' : 'Create Contract'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
