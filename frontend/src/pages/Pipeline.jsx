import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { pipelineAPI, brandAPI, clientAPI } from '../services/api';

const DEFAULT_STAGES = ['Lead', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

// Normalize a stage label to a DB key: "Proposal Sent" → "proposal_sent"
const stageKey = (label) => (label || '').toLowerCase().replace(/\s+/g, '_');

const formatCurrency = (v) => `$${parseFloat(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

const STAGE_COLORS = [
  'bg-gray-100 border-gray-300 text-gray-700 bg-gray-200',
  'bg-blue-50 border-blue-200 text-blue-700 bg-blue-100',
  'bg-yellow-50 border-yellow-200 text-yellow-700 bg-yellow-100',
  'bg-orange-50 border-orange-200 text-orange-700 bg-orange-100',
  'bg-green-50 border-green-200 text-green-700 bg-green-100',
  'bg-red-50 border-red-200 text-red-700 bg-red-100',
  'bg-purple-50 border-purple-200 text-purple-700 bg-purple-100',
  'bg-pink-50 border-pink-200 text-pink-700 bg-pink-100',
];
const DOT_COLORS = ['bg-gray-400','bg-blue-400','bg-yellow-400','bg-orange-400','bg-green-500','bg-red-400','bg-purple-400','bg-pink-400'];

const getStageStyle = (index) => {
  const idx = index % STAGE_COLORS.length;
  const [colBg, colBorder, badgeText, badgeBg] = STAGE_COLORS[idx].split(' ');
  return { colBg, colBorder, badgeText, badgeBg, dot: DOT_COLORS[idx] };
};

const EMPTY_FORM = { title: '', client_id: '', value: '', currency: 'USD', stage: '', probability: 20, expected_close_date: '', notes: '', pipeline_id: '' };
const EMPTY_PIPELINE_FORM = { name: '', description: '', stages: [...DEFAULT_STAGES], is_default: false };

export default function Pipeline() {
  const [brandId, setBrandId] = useState(null);
  const [deals, setDeals] = useState([]);
  const [summary, setSummary] = useState({ byStage: {}, totalWeighted: 0, stages: [] });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pipeline state
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState(null); // null = creating new
  const [pipelineForm, setPipelineForm] = useState(EMPTY_PIPELINE_FORM);
  const [savingPipeline, setSavingPipeline] = useState(false);
  const [showPipelineForm, setShowPipelineForm] = useState(false);

  // Deal modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [stageMenuOpen, setStageMenuOpen] = useState(null);

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId) || null;
  const pipelineStages = selectedPipeline?.stages || DEFAULT_STAGES;

  useEffect(() => {
    brandAPI.getUserBrands().then(res => {
      const brands = res.data.data?.brands || [];
      if (brands.length > 0) setBrandId(brands[0].id);
    });
  }, []);

  useEffect(() => {
    if (!brandId) return;
    clientAPI.getBrandClients(brandId).then(res => setClients(res.data.data?.clients || []));
    loadPipelines();
  }, [brandId]);

  const loadPipelines = async () => {
    try {
      const res = await pipelineAPI.getPipelines(brandId);
      let pipes = res.data.data?.pipelines || [];

      // Auto-create default pipeline if none exist
      if (pipes.length === 0) {
        const created = await pipelineAPI.createPipeline(brandId, {
          name: 'Sales Pipeline',
          stages: DEFAULT_STAGES,
          is_default: true,
        });
        pipes = [created.data.data?.pipeline];
      }

      setPipelines(pipes);
      const defaultPipe = pipes.find(p => p.is_default) || pipes[0];
      setSelectedPipelineId(defaultPipe?.id || null);
    } catch (err) {
      console.error('loadPipelines error', err);
    }
  };

  useEffect(() => {
    if (!brandId || !selectedPipelineId) return;
    fetchAll();
  }, [brandId, selectedPipelineId]);

  const fetchAll = useCallback(async () => {
    if (!brandId || !selectedPipelineId) return;
    setLoading(true);
    try {
      const [dealsRes, summaryRes] = await Promise.all([
        pipelineAPI.getDeals(brandId, { pipeline_id: selectedPipelineId }),
        pipelineAPI.getSummary(brandId, { pipeline_id: selectedPipelineId }),
      ]);
      setDeals(dealsRes.data.data?.deals || []);
      setSummary(summaryRes.data.data?.summary || { byStage: {}, totalWeighted: 0, stages: [] });
    } catch (err) {
      console.error('fetchAll error', err);
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedPipelineId]);

  // Deal CRUD
  const openNew = () => {
    setEditingDeal(null);
    setForm({ ...EMPTY_FORM, stage: stageKey(pipelineStages[0] || ''), pipeline_id: selectedPipelineId });
    setModalOpen(true);
  };

  const openEdit = (deal) => {
    setEditingDeal(deal);
    setForm({
      title: deal.title || '',
      client_id: deal.client_id || '',
      value: deal.value || '',
      currency: deal.currency || 'USD',
      stage: deal.stage || stageKey(pipelineStages[0] || ''),
      probability: deal.probability ?? 20,
      expected_close_date: deal.expected_close_date ? deal.expected_close_date.split('T')[0] : '',
      notes: deal.notes || '',
      pipeline_id: selectedPipelineId,
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
        await pipelineAPI.createDeal(brandId, { ...form, pipeline_id: selectedPipelineId });
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

  const handleMoveStage = async (deal, stageLabel) => {
    setStageMenuOpen(null);
    await pipelineAPI.updateDeal(brandId, deal.id, {
      stage: stageKey(stageLabel),
      pipeline_id: selectedPipelineId,
    });
    await fetchAll();
  };

  // Match deals to stage column using normalized keys
  const dealsByStage = (stageLabel) =>
    deals.filter(d => stageKey(d.stage) === stageKey(stageLabel));

  // Pipeline management
  const openNewPipeline = () => {
    setEditingPipeline(null);
    setPipelineForm(EMPTY_PIPELINE_FORM);
    setShowPipelineForm(true);
  };

  const openEditPipeline = (pipeline) => {
    setEditingPipeline(pipeline);
    setPipelineForm({
      name: pipeline.name || '',
      description: pipeline.description || '',
      stages: Array.isArray(pipeline.stages) ? [...pipeline.stages] : [...DEFAULT_STAGES],
      is_default: !!pipeline.is_default,
    });
    setShowPipelineForm(true);
  };

  const handleSavePipeline = async (e) => {
    e.preventDefault();
    const cleanStages = pipelineForm.stages.map(s => s.trim()).filter(Boolean);
    if (!pipelineForm.name.trim()) return;
    if (cleanStages.length === 0) return;
    setSavingPipeline(true);
    try {
      if (editingPipeline) {
        await pipelineAPI.updatePipeline(brandId, editingPipeline.id, { ...pipelineForm, stages: cleanStages });
      } else {
        const res = await pipelineAPI.createPipeline(brandId, { ...pipelineForm, stages: cleanStages });
        const newPipeline = res.data.data?.pipeline;
        if (newPipeline && pipelineForm.is_default) {
          setSelectedPipelineId(newPipeline.id);
        }
      }
      setShowPipelineForm(false);
      setEditingPipeline(null);
      await loadPipelines();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPipeline(false);
    }
  };

  const handleDeletePipeline = async (pipeline) => {
    if (pipelines.length <= 1) {
      alert('You must have at least one pipeline.');
      return;
    }
    if (!window.confirm(`Delete pipeline "${pipeline.name}"? Deals in this pipeline will become unassigned.`)) return;
    await pipelineAPI.deletePipeline(brandId, pipeline.id);
    if (selectedPipelineId === pipeline.id) {
      const remaining = pipelines.filter(p => p.id !== pipeline.id);
      setSelectedPipelineId(remaining[0]?.id || null);
    }
    await loadPipelines();
  };

  const addStage = () => setPipelineForm(f => ({ ...f, stages: [...f.stages, ''] }));
  const removeStage = (i) => setPipelineForm(f => ({ ...f, stages: f.stages.filter((_, idx) => idx !== i) }));
  const updateStage = (i, val) => setPipelineForm(f => ({ ...f, stages: f.stages.map((s, idx) => idx === i ? val : s) }));
  const moveStageUp = (i) => {
    if (i === 0) return;
    setPipelineForm(f => {
      const s = [...f.stages];
      [s[i - 1], s[i]] = [s[i], s[i - 1]];
      return { ...f, stages: s };
    });
  };
  const moveStageDown = (i) => {
    setPipelineForm(f => {
      if (i >= f.stages.length - 1) return f;
      const s = [...f.stages];
      [s[i], s[i + 1]] = [s[i + 1], s[i]];
      return { ...f, stages: s };
    });
  };

  return (
    <Layout>
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
            <p className="text-sm text-gray-500 mt-1">
              Weighted value: <span className="font-semibold text-blue-600">{formatCurrency(summary.totalWeighted)}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowManageModal(true); setShowPipelineForm(false); }}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
            >
              ⚙ Pipelines
            </button>
            <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              + New Deal
            </button>
          </div>
        </div>

        {/* Pipeline Selector */}
        {pipelines.length > 1 && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">Pipeline:</span>
            {pipelines.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPipelineId(p.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedPipelineId === p.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.name}
                {p.is_default && <span className="ml-1 text-xs opacity-70">✓</span>}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading pipeline...</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-6">
            {pipelineStages.map((stageLabel, stageIndex) => {
              const stageDeals = dealsByStage(stageLabel);
              const normalizedKey = stageKey(stageLabel);
              const stageData = summary.byStage?.[stageLabel] || summary.byStage?.[normalizedKey] || {};
              const { colBg, colBorder, badgeBg, badgeText, dot } = getStageStyle(stageIndex);
              return (
                <div key={stageLabel} className="flex-shrink-0 w-72">
                  <div className={`rounded-t-lg border px-3 py-2 ${colBg} ${colBorder}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                        <span className="font-semibold text-sm text-gray-700">{stageLabel}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${badgeBg} ${badgeText}`}>{stageDeals.length}</span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{formatCurrency(stageData.total_value || 0)}</span>
                    </div>
                  </div>
                  <div className={`min-h-24 rounded-b-lg border border-t-0 ${colBg} ${colBorder} p-2 space-y-2`}>
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
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${badgeBg} ${badgeText}`}>{deal.probability}%</span>
                        </div>
                        {deal.expected_close_date && (
                          <p className="text-xs text-gray-400 mb-2">Close: {new Date(deal.expected_close_date).toLocaleDateString()}</p>
                        )}
                        <div className="relative">
                          <button
                            onClick={() => setStageMenuOpen(stageMenuOpen === deal.id ? null : deal.id)}
                            className="w-full text-xs text-center py-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
                          >
                            Move Stage ▾
                          </button>
                          {stageMenuOpen === deal.id && (
                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                              {pipelineStages.filter(s => stageKey(s) !== stageKey(deal.stage)).map((s, si) => {
                                const { dot: d2 } = getStageStyle(pipelineStages.indexOf(s));
                                return (
                                  <button
                                    key={s}
                                    onClick={() => handleMoveStage(deal, s)}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <span className={`w-2 h-2 rounded-full ${d2}`} />
                                    {s}
                                  </button>
                                );
                              })}
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
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">None</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {pipelineStages.map(s => (
                      <option key={s} value={stageKey(s)}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
                  <input type="number" min="0" step="0.01" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Probability (%)</label>
                  <input type="number" min="0" max="100" value={form.probability} onChange={e => setForm({ ...form, probability: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
                <input type="date" value={form.expected_close_date} onChange={e => setForm({ ...form, expected_close_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
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

      {/* Manage Pipelines Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Manage Pipelines</h2>
              <button onClick={() => { setShowManageModal(false); setShowPipelineForm(false); }}
                className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            {/* Pipeline List */}
            {!showPipelineForm && (
              <>
                <div className="space-y-2 mb-4">
                  {pipelines.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">{p.name}</span>
                          {p.is_default && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Default</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {Array.isArray(p.stages) ? p.stages.length : 0} stages
                          {p.description ? ` · ${p.description}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEditPipeline(p)}
                          className="text-xs px-2 py-1 text-blue-600 border border-blue-200 rounded hover:bg-blue-50">Edit</button>
                        <button onClick={() => handleDeletePipeline(p)}
                          className="text-xs px-2 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={openNewPipeline}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                  + Create New Pipeline
                </button>
              </>
            )}

            {/* Create / Edit Pipeline Form */}
            {showPipelineForm && (
              <form onSubmit={handleSavePipeline} className="space-y-4">
                <h3 className="font-medium text-gray-800">{editingPipeline ? 'Edit Pipeline' : 'New Pipeline'}</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={pipelineForm.name} onChange={e => setPipelineForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Renewals Pipeline"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input type="text" value={pipelineForm.description} onChange={e => setPipelineForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* Stages Builder */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stages *</label>
                  <div className="space-y-2">
                    {pipelineForm.stages.map((stage, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                        <input
                          type="text"
                          value={stage}
                          onChange={e => updateStage(i, e.target.value)}
                          placeholder={`Stage ${i + 1}`}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button type="button" onClick={() => moveStageUp(i)} disabled={i === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1">↑</button>
                        <button type="button" onClick={() => moveStageDown(i)} disabled={i === pipelineForm.stages.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1">↓</button>
                        <button type="button" onClick={() => removeStage(i)} disabled={pipelineForm.stages.length <= 1}
                          className="text-red-400 hover:text-red-600 disabled:opacity-30 text-xs px-1">×</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addStage}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    + Add Stage
                  </button>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pipelineForm.is_default}
                    onChange={e => setPipelineForm(f => ({ ...f, is_default: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600" />
                  <span className="text-sm text-gray-700">Set as default pipeline</span>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowPipelineForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Back</button>
                  <button type="submit" disabled={savingPipeline} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {savingPipeline ? 'Saving...' : (editingPipeline ? 'Save Changes' : 'Create Pipeline')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
