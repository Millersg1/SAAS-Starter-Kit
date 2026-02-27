import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { segmentAPI, brandAPI } from '../services/api';

const FIELDS = [
  { value: 'status',            label: 'Status',            type: 'select',  options: ['active','inactive','prospect','churned'] },
  { value: 'client_type',       label: 'Client Type',       type: 'select',  options: ['individual','business'] },
  { value: 'industry',          label: 'Industry',          type: 'text' },
  { value: 'city',              label: 'City',              type: 'text' },
  { value: 'state',             label: 'State',             type: 'text' },
  { value: 'country',           label: 'Country',           type: 'text' },
  { value: 'lead_source',       label: 'Lead Source',       type: 'select',  options: ['website','referral','social_media','cold_outreach','other'] },
  { value: 'created_at',        label: 'Date Added',        type: 'date' },
  { value: 'last_portal_login', label: 'Last Portal Login', type: 'date' },
  { value: 'tags',              label: 'Tags',              type: 'tags' },
  { value: 'total_revenue',     label: 'Total Revenue ($)', type: 'number' },
];

const OPS_BY_TYPE = {
  select:  [{ value: 'eq', label: 'is' }, { value: 'neq', label: 'is not' }],
  text:    [{ value: 'contains', label: 'contains' }, { value: 'eq', label: 'equals' }],
  date:    [{ value: 'after', label: 'after' }, { value: 'before', label: 'before' }, { value: 'is_null', label: 'is empty' }],
  number:  [{ value: 'gt', label: '>' }, { value: 'lt', label: '<' }],
  tags:    [{ value: 'includes', label: 'includes tag' }],
};

const defaultOp = (fieldDef) => OPS_BY_TYPE[fieldDef?.type || 'text']?.[0]?.value || 'eq';

const EMPTY_CONDITION = { field: 'status', op: 'eq', value: '' };
const EMPTY_FORM = { name: '', description: '', filter_config: [{ ...EMPTY_CONDITION }] };

export default function Segments() {
  const [brandId, setBrandId] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Builder state
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewCount, setPreviewCount] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  // Clients panel
  const [viewingSegment, setViewingSegment] = useState(null);
  const [segmentClients, setSegmentClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const previewTimer = useRef(null);

  useEffect(() => {
    brandAPI.getUserBrands().then(res => {
      const brands = res.data.data?.brands || [];
      if (brands.length > 0) setBrandId(brands[0].id);
    });
  }, []);

  useEffect(() => {
    if (!brandId) return;
    fetchSegments();
  }, [brandId]);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const res = await segmentAPI.list(brandId);
      setSegments(res.data.data?.segments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced preview
  const schedulePreview = useCallback((filters) => {
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      if (!brandId) return;
      setPreviewing(true);
      try {
        const res = await segmentAPI.preview(brandId, filters);
        setPreviewCount(res.data.data?.count ?? null);
      } catch {
        setPreviewCount(null);
      } finally {
        setPreviewing(false);
      }
    }, 600);
  }, [brandId]);

  useEffect(() => {
    schedulePreview(form.filter_config);
  }, [form.filter_config, schedulePreview]);

  const getFieldDef = (fieldVal) => FIELDS.find(f => f.value === fieldVal) || FIELDS[0];

  const updateCondition = (i, key, val) => {
    setForm(f => {
      const conditions = f.filter_config.map((c, idx) => {
        if (idx !== i) return c;
        const updated = { ...c, [key]: val };
        // Reset op and value when field changes
        if (key === 'field') {
          const def = getFieldDef(val);
          updated.op = defaultOp(def);
          updated.value = '';
        }
        return updated;
      });
      return { ...f, filter_config: conditions };
    });
  };

  const addCondition = () => setForm(f => ({
    ...f,
    filter_config: [...f.filter_config, { ...EMPTY_CONDITION }]
  }));

  const removeCondition = (i) => setForm(f => ({
    ...f,
    filter_config: f.filter_config.filter((_, idx) => idx !== i)
  }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await segmentAPI.update(brandId, editingId, form);
      } else {
        await segmentAPI.create(brandId, form);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setPreviewCount(null);
      await fetchSegments();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const loadEdit = (seg) => {
    setEditingId(seg.id);
    setForm({
      name: seg.name || '',
      description: seg.description || '',
      filter_config: Array.isArray(seg.filter_config) && seg.filter_config.length > 0
        ? seg.filter_config
        : [{ ...EMPTY_CONDITION }],
    });
    setViewingSegment(null);
    setSegmentClients([]);
  };

  const handleDelete = async (seg) => {
    if (!window.confirm(`Delete segment "${seg.name}"?`)) return;
    await segmentAPI.remove(brandId, seg.id);
    if (viewingSegment?.id === seg.id) setViewingSegment(null);
    if (editingId === seg.id) { setEditingId(null); setForm(EMPTY_FORM); }
    await fetchSegments();
  };

  const viewClients = async (seg) => {
    setViewingSegment(seg);
    setLoadingClients(true);
    setSegmentClients([]);
    try {
      const res = await segmentAPI.getClients(brandId, seg.id);
      setSegmentClients(res.data.data?.clients || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingClients(false);
    }
  };

  const cancelEdit = () => { setEditingId(null); setForm(EMPTY_FORM); setPreviewCount(null); };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Client Segments</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Saved Segments */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Saved Segments</h2>
            {loading ? (
              <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
            ) : segments.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
                No segments yet. Build one on the right.
              </div>
            ) : (
              segments.map(seg => (
                <div
                  key={seg.id}
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                    viewingSegment?.id === seg.id ? 'border-blue-400 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => viewClients(seg)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{seg.name}</p>
                      {seg.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{seg.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {seg.client_count != null ? `${seg.client_count} clients` : `${(seg.filter_config || []).length} condition${(seg.filter_config || []).length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => loadEdit(seg)} className="text-xs px-2 py-1 text-blue-600 border border-blue-200 rounded hover:bg-blue-50">Edit</button>
                      <button onClick={() => handleDelete(seg)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded hover:bg-red-50">Del</button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Clients panel when viewing a segment */}
            {viewingSegment && (
              <div className="bg-white rounded-xl border border-gray-200 mt-4">
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">{viewingSegment.name}</p>
                  <button onClick={() => setViewingSegment(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                </div>
                {loadingClients ? (
                  <p className="text-sm text-gray-400 text-center py-6">Loading clients...</p>
                ) : segmentClients.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No clients match this segment.</p>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                    {segmentClients.map(c => (
                      <div key={c.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                          {c.company && <p className="text-xs text-gray-400 truncate">{c.company}</p>}
                        </div>
                        <Link to={`/clients/${c.id}`} className="text-xs text-blue-600 hover:underline flex-shrink-0 ml-2">View →</Link>
                      </div>
                    ))}
                  </div>
                )}
                <div className="px-4 py-2 bg-gray-50 rounded-b-xl border-t border-gray-100">
                  <p className="text-xs text-gray-500">{segmentClients.length} client{segmentClients.length !== 1 ? 's' : ''} matched</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Segment Builder */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
                {editingId ? 'Edit Segment' : 'Build New Segment'}
              </h2>
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Segment Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. High-Value Clients"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Optional"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Filter Conditions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Conditions</label>
                  <div className="space-y-2">
                    {form.filter_config.map((cond, i) => {
                      const fieldDef = getFieldDef(cond.field);
                      const ops = OPS_BY_TYPE[fieldDef?.type || 'text'] || OPS_BY_TYPE.text;
                      return (
                        <div key={i} className="flex items-center gap-2 flex-wrap">
                          {i > 0 && <span className="text-xs font-semibold text-gray-400 w-8">AND</span>}
                          {i === 0 && <span className="text-xs font-semibold text-gray-400 w-8">IF</span>}

                          {/* Field */}
                          <select
                            value={cond.field}
                            onChange={e => updateCondition(i, 'field', e.target.value)}
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>

                          {/* Operator */}
                          <select
                            value={cond.op}
                            onChange={e => updateCondition(i, 'op', e.target.value)}
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>

                          {/* Value — hide for is_null */}
                          {cond.op !== 'is_null' && (
                            fieldDef?.type === 'select' ? (
                              <select
                                value={cond.value}
                                onChange={e => updateCondition(i, 'value', e.target.value)}
                                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">— select —</option>
                                {fieldDef.options.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : fieldDef?.type === 'date' ? (
                              <input
                                type="date"
                                value={cond.value}
                                onChange={e => updateCondition(i, 'value', e.target.value)}
                                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : fieldDef?.type === 'number' ? (
                              <input
                                type="number"
                                value={cond.value}
                                onChange={e => updateCondition(i, 'value', e.target.value)}
                                placeholder="Amount"
                                className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <input
                                type="text"
                                value={cond.value}
                                onChange={e => updateCondition(i, 'value', e.target.value)}
                                placeholder={fieldDef?.type === 'tags' ? 'tag name' : 'value'}
                                className="flex-1 min-w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            )
                          )}

                          {/* Remove */}
                          {form.filter_config.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCondition(i)}
                              className="text-red-400 hover:text-red-600 text-lg leading-none"
                            >×</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    + Add Condition
                  </button>
                </div>

                {/* Preview Count */}
                <div className="bg-blue-50 rounded-lg px-4 py-2.5 flex items-center gap-2">
                  <span className="text-sm text-gray-600">Matching clients:</span>
                  {previewing ? (
                    <span className="text-sm text-gray-400">Calculating...</span>
                  ) : (
                    <span className="text-lg font-bold text-blue-600">{previewCount ?? '—'}</span>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  {editingId && (
                    <button type="button" onClick={cancelEdit} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Save Segment')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
