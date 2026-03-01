import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { packagesAPI, brandAPI, clientAPI } from '../services/api';

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  ended:  'bg-gray-100 text-gray-500',
};

const BILLING_LABELS = {
  monthly:   'Monthly',
  quarterly: 'Quarterly',
  annual:    'Annual',
  'one-time': 'One-Time',
};

function UsageBar({ label, used, limit, color = 'blue' }) {
  if (!limit || limit === 0) return null;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const isOver = pct >= 90;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className={isOver ? 'text-red-600 font-semibold' : ''}>{used} / {limit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : `bg-${color}-500`}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  name: '', description: '', client_id: '', monthly_hours: '', monthly_posts: '',
  monthly_pages: '', price: '', billing_cycle: 'monthly',
  start_date: '', end_date: '', status: 'active', services: []
};

const EMPTY_USAGE = {
  period_start: new Date().toISOString().split('T')[0],
  period_end: new Date().toISOString().split('T')[0],
  hours_used: '', posts_published: '', pages_published: '', notes: ''
};

export default function ServicePackages() {
  const [brand, setBrand] = useState(null);
  const [packages, setPackages] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  // Usage logging
  const [logPkg, setLogPkg] = useState(null);
  const [usageForm, setUsageForm] = useState(EMPTY_USAGE);
  const [loggingUsage, setLoggingUsage] = useState(false);
  // Detail view
  const [detailPkg, setDetailPkg] = useState(null);

  useEffect(() => {
    brandAPI.getBrands().then(res => {
      const b = (res.data.data || [])[0];
      setBrand(b);
      if (b) {
        Promise.all([
          packagesAPI.listPackages(b.id),
          clientAPI.getBrandClients(b.id),
        ]).then(([pRes, cRes]) => {
          setPackages(pRes.data.data || []);
          setClients(cRes.data.data || []);
        }).finally(() => setLoading(false));
      }
    });
  }, []);

  const fetchPackages = () => {
    if (!brand) return;
    packagesAPI.listPackages(brand.id).then(r => setPackages(r.data.data || []));
  };

  const openCreate = () => {
    setEditPkg(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (pkg) => {
    setEditPkg(pkg);
    setForm({
      name: pkg.name || '', description: pkg.description || '',
      client_id: pkg.client_id || '', monthly_hours: pkg.monthly_hours || '',
      monthly_posts: pkg.monthly_posts || '', monthly_pages: pkg.monthly_pages || '',
      price: pkg.price || '', billing_cycle: pkg.billing_cycle || 'monthly',
      start_date: pkg.start_date ? pkg.start_date.split('T')[0] : '',
      end_date: pkg.end_date ? pkg.end_date.split('T')[0] : '',
      status: pkg.status || 'active',
      services: pkg.services || []
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!brand || !form.name) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (editPkg) {
        await packagesAPI.updatePackage(brand.id, editPkg.id, payload);
      } else {
        await packagesAPI.createPackage(brand.id, payload);
      }
      fetchPackages();
      setShowModal(false);
    } catch(e) { alert(e.response?.data?.message || 'Save failed'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this package?')) return;
    await packagesAPI.deletePackage(brand.id, id).catch(() => {});
    fetchPackages();
  };

  const handleLogUsage = async () => {
    if (!logPkg || !brand) return;
    setLoggingUsage(true);
    try {
      await packagesAPI.logUsage(brand.id, logPkg.id, usageForm);
      setLogPkg(null);
      fetchPackages();
    } catch(e) { alert(e.response?.data?.message || 'Failed to log usage'); }
    setLoggingUsage(false);
  };

  const openDetail = async (pkg) => {
    try {
      const res = await packagesAPI.getPackage(brand.id, pkg.id);
      setDetailPkg(res.data.data);
    } catch { setDetailPkg(pkg); }
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-64 text-gray-400">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Service Packages</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track retainer deliverables and usage against package limits</p>
          </div>
          <button onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm">
            + New Package
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Packages', value: packages.length, icon: '📦' },
            { label: 'Active', value: packages.filter(p => p.status === 'active').length, icon: '✅' },
            { label: 'Clients on Retainer', value: new Set(packages.filter(p => p.client_id).map(p => p.client_id)).size, icon: '👥' },
            { label: 'MRR', value: `$${packages.filter(p => p.status === 'active' && p.billing_cycle === 'monthly').reduce((s, p) => s + parseFloat(p.price || 0), 0).toLocaleString()}`, icon: '💰' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{s.label}</p>
                <span className="text-lg">{s.icon}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Package grid */}
        {packages.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-lg font-medium text-gray-500">No packages yet</p>
            <p className="text-sm mt-1">Create your first service package to track deliverables</p>
            <button onClick={openCreate} className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium">
              Create Package
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {packages.map(pkg => (
              <div key={pkg.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{pkg.name}</h3>
                    {pkg.client_name && <p className="text-sm text-gray-500">👤 {pkg.client_name}</p>}
                  </div>
                  <span className={`ml-2 shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[pkg.status]}`}>
                    {pkg.status}
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">${parseFloat(pkg.price || 0).toLocaleString()}</span>
                  <span className="text-sm text-gray-400">/ {BILLING_LABELS[pkg.billing_cycle] || pkg.billing_cycle}</span>
                </div>

                {/* Limits summary */}
                <div className="space-y-2 flex-1">
                  {parseFloat(pkg.monthly_hours) > 0 && (
                    <UsageBar label="Hours / month" used={0} limit={parseFloat(pkg.monthly_hours)} color="blue" />
                  )}
                  {parseInt(pkg.monthly_posts) > 0 && (
                    <UsageBar label="Social posts / month" used={0} limit={parseInt(pkg.monthly_posts)} color="purple" />
                  )}
                  {parseInt(pkg.monthly_pages) > 0 && (
                    <UsageBar label="CMS pages / month" used={0} limit={parseInt(pkg.monthly_pages)} color="green" />
                  )}
                  {!pkg.monthly_hours && !pkg.monthly_posts && !pkg.monthly_pages && pkg.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">{pkg.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button onClick={() => openDetail(pkg)}
                    className="flex-1 text-xs py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                    View Detail
                  </button>
                  <button onClick={() => { setLogPkg(pkg); setUsageForm(EMPTY_USAGE); }}
                    className="flex-1 text-xs py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                    Log Usage
                  </button>
                  <button onClick={() => openEdit(pkg)}
                    className="text-xs px-2 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(pkg.id)}
                    className="text-xs px-2 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editPkg ? 'Edit Package' : 'New Service Package'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Package Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                  placeholder="e.g. Social Pro Retainer"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Client</label>
                <select value={form.client_id} onChange={e => setForm(p => ({...p, client_id: e.target.value}))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800">
                  <option value="">No specific client (agency package)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
                  <input type="number" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))}
                    placeholder="0.00" min="0" step="0.01"
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Billing</label>
                  <select value={form.billing_cycle} onChange={e => setForm(p => ({...p, billing_cycle: e.target.value}))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800">
                    {Object.entries(BILLING_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hours/mo</label>
                  <input type="number" value={form.monthly_hours} onChange={e => setForm(p => ({...p, monthly_hours: e.target.value}))}
                    placeholder="0" min="0"
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Posts/mo</label>
                  <input type="number" value={form.monthly_posts} onChange={e => setForm(p => ({...p, monthly_posts: e.target.value}))}
                    placeholder="0" min="0"
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pages/mo</label>
                  <input type="number" value={form.monthly_pages} onChange={e => setForm(p => ({...p, monthly_pages: e.target.value}))}
                    placeholder="0" min="0"
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(p => ({...p, start_date: e.target.value}))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(p => ({...p, end_date: e.target.value}))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800">
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                  rows={2} placeholder="Package summary or internal notes"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 resize-none"/>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : editPkg ? 'Update' : 'Create Package'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Usage Modal */}
      {logPkg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Log Usage</h2>
            <p className="text-sm text-gray-500 mb-4">{logPkg.name}</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period Start</label>
                  <input type="date" value={usageForm.period_start} onChange={e => setUsageForm(p => ({...p, period_start: e.target.value}))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period End</label>
                  <input type="date" value={usageForm.period_end} onChange={e => setUsageForm(p => ({...p, period_end: e.target.value}))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hours</label>
                  <input type="number" value={usageForm.hours_used} onChange={e => setUsageForm(p => ({...p, hours_used: e.target.value}))}
                    placeholder="0" min="0" step="0.5"
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Posts</label>
                  <input type="number" value={usageForm.posts_published} onChange={e => setUsageForm(p => ({...p, posts_published: e.target.value}))}
                    placeholder="0" min="0"
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pages</label>
                  <input type="number" value={usageForm.pages_published} onChange={e => setUsageForm(p => ({...p, pages_published: e.target.value}))}
                    placeholder="0" min="0"
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea value={usageForm.notes} onChange={e => setUsageForm(p => ({...p, notes: e.target.value}))}
                  rows={2} placeholder="Optional summary of work done this period"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 resize-none"/>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setLogPkg(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleLogUsage} disabled={loggingUsage}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loggingUsage ? 'Saving...' : 'Log Usage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailPkg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[85vh] overflow-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{detailPkg.name}</h2>
                {detailPkg.client_name && <p className="text-sm text-gray-500">👤 {detailPkg.client_name}</p>}
              </div>
              <button onClick={() => setDetailPkg(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {detailPkg.currentUsage && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">This Month's Usage</h3>
                <div className="space-y-3">
                  {parseFloat(detailPkg.monthly_hours) > 0 && (
                    <UsageBar label="Hours" used={parseFloat(detailPkg.currentUsage.hours_used || 0)} limit={parseFloat(detailPkg.monthly_hours)} color="blue" />
                  )}
                  {parseInt(detailPkg.monthly_posts) > 0 && (
                    <UsageBar label="Social Posts" used={parseInt(detailPkg.currentUsage.posts_published || 0)} limit={parseInt(detailPkg.monthly_posts)} color="purple" />
                  )}
                  {parseInt(detailPkg.monthly_pages) > 0 && (
                    <UsageBar label="CMS Pages" used={parseInt(detailPkg.currentUsage.pages_published || 0)} limit={parseInt(detailPkg.monthly_pages)} color="green" />
                  )}
                </div>
              </div>
            )}

            {detailPkg.history?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Usage History</h3>
                <div className="space-y-2">
                  {detailPkg.history.map(h => (
                    <div key={h.id} className="flex items-center justify-between text-xs py-2 border-b border-gray-50 dark:border-gray-700">
                      <div>
                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                          {new Date(h.period_start).toLocaleDateString()} – {new Date(h.period_end).toLocaleDateString()}
                        </p>
                        {h.notes && <p className="text-gray-400 mt-0.5">{h.notes}</p>}
                      </div>
                      <div className="text-right text-gray-500 shrink-0 ml-4">
                        {h.hours_used > 0 && <span className="block">{h.hours_used}h</span>}
                        {h.posts_published > 0 && <span className="block">{h.posts_published} posts</span>}
                        {h.pages_published > 0 && <span className="block">{h.pages_published} pages</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
