import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { proposalAPI, brandAPI, clientAPI, aiAPI } from '../services/api';

const STATUS_COLORS = {
  draft:    'bg-gray-100 text-gray-700',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired:  'bg-orange-100 text-orange-700',
};

const emptyForm = () => ({
  title: '',
  client_id: '',
  expiry_date: '',
  currency: 'USD',
  tax_rate: 0,
  discount_amount: 0,
  notes: '',
  terms: '',
  items: [{ description: '', quantity: 1, unit_price: 0 }],
});

const Proposals = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [aiDraftDesc, setAiDraftDesc] = useState('');
  const [aiDrafting, setAiDrafting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBrands(); }, []);
  useEffect(() => { if (selectedBrand) { fetchProposals(); fetchClients(); } }, [selectedBrand]);

  const fetchBrands = async () => {
    try {
      const res = await brandAPI.getUserBrands();
      const list = res.data.data?.brands || [];
      setBrands(list);
      if (list.length > 0) setSelectedBrand(list[0]);
    } catch { setError('Failed to load brands'); }
    finally { setLoading(false); }
  };

  const fetchProposals = async () => {
    try {
      const res = await proposalAPI.getBrandProposals(selectedBrand.id);
      setProposals(res.data.data?.proposals || []);
    } catch (err) { console.error(err); }
  };

  const fetchClients = async () => {
    try {
      const res = await clientAPI.getBrandClients(selectedBrand.id);
      setClients(res.data.data?.clients || []);
    } catch { /* ignore */ }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await proposalAPI.createProposal({
        ...form,
        brand_id: selectedBrand.id,
        tax_rate: parseFloat(form.tax_rate) || 0,
        discount_amount: parseFloat(form.discount_amount) || 0,
        items: form.items.map(i => ({
          description: i.description,
          quantity: parseFloat(i.quantity) || 1,
          unit_price: parseFloat(i.unit_price) || 0,
        })),
      });
      setShowModal(false);
      setForm(emptyForm());
      navigate(`/proposals/${res.data.data.proposal.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create proposal');
    } finally { setSaving(false); }
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0 }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx, field, value) => setForm(f => {
    const items = [...f.items];
    items[idx] = { ...items[idx], [field]: value };
    return { ...f, items };
  });

  if (loading) return <Layout><div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div></Layout>;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage client proposals</p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            + New Proposal
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {/* Brand selector */}
        {brands.length > 1 && (
          <div className="mb-4">
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              value={selectedBrand?.id || ''} onChange={e => setSelectedBrand(brands.find(b => b.id === e.target.value))}>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {/* Proposals table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {proposals.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-medium">No proposals yet</p>
              <p className="text-sm mt-1">Create your first proposal to get started</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">#</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Title</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Client</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Expires</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/proposals/${p.id}`)}>
                    <td className="px-4 py-3 text-gray-500">{p.proposal_number || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                    <td className="px-4 py-3 text-gray-600">{p.client_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {parseFloat(p.total_amount || 0).toLocaleString('en-US', { style: 'currency', currency: p.currency || 'USD' })}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Proposal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">New Proposal</h2>
              <button onClick={() => { setShowModal(false); setForm(emptyForm()); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {/* AI Draft */}
            <div className="px-6 pt-4 pb-0">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-2">
                <p className="text-xs font-semibold text-indigo-700 mb-2">✨ AI Draft — describe the project and we'll fill in the line items</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiDraftDesc}
                    onChange={e => setAiDraftDesc(e.target.value)}
                    placeholder="e.g. 'Branding package: logo, style guide, and social media templates'"
                    className="flex-1 px-3 py-1.5 border border-indigo-300 rounded-lg text-sm bg-white"
                  />
                  <button
                    type="button"
                    disabled={aiDrafting || !aiDraftDesc.trim()}
                    onClick={async () => {
                      setAiDrafting(true);
                      try {
                        const res = await aiAPI.draftProposal(selectedBrand.id, {
                          description: aiDraftDesc,
                          client_id: form.client_id || undefined,
                        });
                        const { items, notes, terms } = res.data.data;
                        setForm(f => ({
                          ...f,
                          items: items.length ? items : f.items,
                          notes: notes || f.notes,
                          terms: terms || f.terms,
                        }));
                      } catch (err) {
                        alert(err.response?.data?.message || 'AI draft failed');
                      } finally { setAiDrafting(false); }
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {aiDrafting ? 'Drafting...' : 'Draft'}
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Website Redesign Proposal" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                  <select required value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input type="number" min="0" max="100" step="0.1" value={form.tax_rate}
                    onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount ($)</label>
                  <input type="number" min="0" step="0.01" value={form.discount_amount}
                    onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Line Items</label>
                  <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-700">+ Add item</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                        placeholder="Description" className="col-span-6 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900" />
                      <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)}
                        placeholder="Qty" className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900" />
                      <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                        placeholder="Price" className="col-span-3 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900" />
                      <button type="button" onClick={() => removeItem(idx)} className="col-span-1 text-red-400 hover:text-red-600 text-center">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Terms</label>
                <textarea rows={2} value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(emptyForm()); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Proposals;
