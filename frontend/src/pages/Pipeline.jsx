import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { pipelineAPI, brandAPI, clientAPI } from '../services/api';

const STAGES = [
  { key: 'lead',          label: 'Lead',          color: 'bg-gray-100 border-gray-300',   badge: 'bg-gray-200 text-gray-700',    dot: 'bg-gray-400' },
  { key: 'qualified',     label: 'Qualified',     color: 'bg-blue-50 border-blue-200',    badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: 'bg-yellow-50 border-yellow-200',badge: 'bg-yellow-100 text-yellow-700',dot: 'bg-yellow-400' },
  { key: 'negotiation',   label: 'Negotiation',   color: 'bg-orange-50 border-orange-200',badge: 'bg-orange-100 text-orange-700',dot: 'bg-orange-400' },
  { key: 'won',           label: 'Won',           color: 'bg-green-50 border-green-200',  badge: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  { key: 'lost',          label: 'Lost',          color: 'bg-red-50 border-red-200',      badge: 'bg-red-100 text-red-700',      dot: 'bg-red-400' },
];

const formatCurrency = (v) => `$${parseFloat(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

const EMPTY_FORM = { title: '', client_id: '', value: '', currency: 'USD', stage: 'lead', probability: 20, expected_close_date: '', notes: '' };

export default function Pipeline() {
  const [brandId, setBrandId] = useState(null);
  const [deals, setDeals] = useState([]);
  const [summary, setSummary] = useState({ byStage: {}, totalWeighted: 0 });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [stageMenuOpen, setStageMenuOpen] = useState(null);

  useEffect(() => {
    brandAPI.getUserBrands().then(res => {
      const brands = res.data.data?.brands || [];
      if (brands.length > 0) setBrandId(brands[0].id);
    });
  }, []);

  useEffect(() => {
    if (!brandId) return;
    fetchAll();
    clientAPI.getBrandClients(brandId).then(res => setClients(res.data.data?.clients || []));
  }, [brandId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dealsRes, summaryRes] = await Promise.all([
        pipelineAPI.getDeals(brandId),
        pipelineAPI.getSummary(brandId),
      ]);
      setDeals(dealsRes.data.data?.deals || []);
      setSummary(summaryRes.data.data?.summary || { byStage: {}, totalWeighted: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => { setEditingDeal(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (deal) => {
    setEditingDeal(deal);
    setForm({
      title: deal.title || '',
      client_id: deal.client_id || '',
      value: deal.value || '',
      currency: deal.currency || 'USD',
      stage: deal.stage || 'lead',
      probability: deal.probability ?? 20,
      expected_close_date: deal.expected_close_date ? deal.expected_close_date.split('T')[0] : '',
      notes: deal.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingDeal) {
        await pipelineAPI.updateDeal(brandId, editingDeal.id, form);
      } else {
        await pipelineAPI.createDeal(brandId, form);
      }
      setModalOpen(false);
      await fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deal) => {
    if (!window.confirm(`Delete deal "${deal.title}"?`)) return;
    await pipelineAPI.deleteDeal(brandId, deal.id);
    await fetchAll();
  };

  const handleMoveStage = async (deal, newStage) => {
    setStageMenuOpen(null);
    await pipelineAPI.updateDeal(brandId, deal.id, { stage: newStage });
    await fetchAll();
  };

  const dealsByStage = (stage) => deals.filter(d => d.stage === stage);

  return (
    <Layout>
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
            <p className="text-sm text-gray-500 mt-1">
              Weighted pipeline value: <span className="font-semibold text-blue-600">{formatCurrency(summary.totalWeighted)}</span>
            </p>
          </div>
          <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            + New Deal
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading pipeline...</div>
        ) : (
          /* Kanban Board */
          <div className="flex gap-4 overflow-x-auto pb-6">
            {STAGES.map(stage => {
              const stageDeals = dealsByStage(stage.key);
              const stageData = summary.byStage?.[stage.key] || {};
              return (
                <div key={stage.key} className="flex-shrink-0 w-72">
                  {/* Column Header */}
                  <div className={`rounded-t-lg border px-3 py-2 ${stage.color}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                        <span className="font-semibold text-sm text-gray-700">{stage.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${stage.badge}`}>{stageDeals.length}</span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{formatCurrency(stageData.total_value || 0)}</span>
                    </div>
                  </div>

                  {/* Deal Cards */}
                  <div className={`min-h-24 rounded-b-lg border border-t-0 ${stage.color} p-2 space-y-2`}>
                    {stageDeals.map(deal => (
                      <div key={deal.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="text-sm font-medium text-gray-900 leading-tight">{deal.title}</p>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => openEdit(deal)} className="text-gray-400 hover:text-blue-600 text-xs">✏️</button>
                            <button onClick={() => handleDelete(deal)} className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                          </div>
                        </div>
                        {deal.client_name && (
                          <p className="text-xs text-gray-500 mb-2">{deal.client_company || deal.client_name}</p>
                        )}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-800">{formatCurrency(deal.value)}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${stage.badge}`}>{deal.probability}%</span>
                        </div>
                        {deal.expected_close_date && (
                          <p className="text-xs text-gray-400 mb-2">Close: {new Date(deal.expected_close_date).toLocaleDateString()}</p>
                        )}
                        {/* Move Stage */}
                        <div className="relative">
                          <button
                            onClick={() => setStageMenuOpen(stageMenuOpen === deal.id ? null : deal.id)}
                            className="w-full text-xs text-center py-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
                          >
                            Move Stage ▾
                          </button>
                          {stageMenuOpen === deal.id && (
                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                              {STAGES.filter(s => s.key !== deal.stage).map(s => (
                                <button
                                  key={s.key}
                                  onClick={() => handleMoveStage(deal, s.key)}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {stageDeals.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">No deals</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New/Edit Deal Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingDeal ? 'Edit Deal' : 'New Deal'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">None</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <select value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
                  <input type="number" min="0" step="0.01" value={form.value} onChange={e => setForm({...form, value: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Probability (%)</label>
                  <input type="number" min="0" max="100" value={form.probability} onChange={e => setForm({...form, probability: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
                <input type="date" value={form.expected_close_date} onChange={e => setForm({...form, expected_close_date: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : (editingDeal ? 'Save Changes' : 'Create Deal')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
