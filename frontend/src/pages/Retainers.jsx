import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { brandAPI, clientAPI } from '../services/api';
import api from '../services/api';

const statusColors = { active: 'bg-green-100 text-green-800', paused: 'bg-yellow-100 text-yellow-800', cancelled: 'bg-red-100 text-red-800', completed: 'bg-blue-100 text-blue-800' };

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const Retainers = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [retainers, setRetainers] = useState([]);
  const [dashboard, setDashboard] = useState({ active: 0, totalAllocated: 0, totalUsed: 0, avgUtil: 0 });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [usageItem, setUsageItem] = useState(null);
  const [usageLogs, setUsageLogs] = useState([]);
  const [form, setForm] = useState({ client_id: '', name: '', hours_allocated: '', amount: '', billing_cycle: 'monthly' });
  const [logForm, setLogForm] = useState({ hours: '', description: '', date: new Date().toISOString().slice(0, 10) });

  useEffect(() => { fetchBrands(); }, []);
  useEffect(() => { if (selectedBrand) { fetchRetainers(); fetchDashboard(); fetchClients(); } }, [selectedBrand]);

  const fetchBrands = async () => {
    try {
      const res = await brandAPI.getUserBrands();
      const list = res.data.data?.brands || [];
      setBrands(list);
      if (list.length > 0) setSelectedBrand(list[0]);
    } catch { toast.error('Failed to load brands'); } finally { setLoading(false); }
  };

  const fetchRetainers = async () => {
    try {
      const res = await api.get(`/retainers/${selectedBrand.id}`);
      setRetainers(res.data.data?.retainers || res.data.data || []);
    } catch { toast.error('Failed to load retainers'); }
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get(`/retainers/${selectedBrand.id}/dashboard`);
      const d = res.data.data || {};
      setDashboard({ active: d.active_retainers || 0, totalAllocated: d.total_hours_allocated || 0, totalUsed: d.total_hours_used || 0, avgUtil: d.average_utilization || 0 });
    } catch { /* silent */ }
  };

  const fetchClients = async () => {
    try {
      const res = await clientAPI.getBrandClients(selectedBrand.id);
      setClients(res.data.data?.clients || res.data.data || []);
    } catch { /* silent */ }
  };

  const fetchUsage = async (id) => {
    try {
      const res = await api.get(`/retainers/${selectedBrand.id}/${id}/usage`);
      setUsageLogs(res.data.data?.usage || res.data.data || []);
    } catch { toast.error('Failed to load usage'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/retainers/${selectedBrand.id}`, { ...form, hours_allocated: Number(form.hours_allocated), amount: Number(form.amount) });
      toast.success('Retainer created');
      setShowCreate(false);
      resetForm();
      fetchRetainers();
      fetchDashboard();
    } catch { toast.error('Failed to create retainer'); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/retainers/${selectedBrand.id}/${editItem.id}`, { ...form, hours_allocated: Number(form.hours_allocated), amount: Number(form.amount) });
      toast.success('Retainer updated');
      setEditItem(null);
      resetForm();
      fetchRetainers();
      fetchDashboard();
    } catch { toast.error('Failed to update retainer'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this retainer?')) return;
    try {
      await api.delete(`/retainers/${selectedBrand.id}/${id}`);
      toast.success('Retainer deleted');
      fetchRetainers();
      fetchDashboard();
    } catch { toast.error('Failed to delete retainer'); }
  };

  const handleLogUsage = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/retainers/${selectedBrand.id}/${usageItem.id}/usage`, { ...logForm, hours: Number(logForm.hours) });
      toast.success('Hours logged');
      setLogForm({ hours: '', description: '', date: new Date().toISOString().slice(0, 10) });
      fetchUsage(usageItem.id);
      fetchRetainers();
      fetchDashboard();
    } catch { toast.error('Failed to log hours'); }
  };

  const openEdit = (r) => {
    setForm({ client_id: r.client_id, name: r.name, hours_allocated: r.hours_allocated, amount: r.amount, billing_cycle: r.billing_cycle });
    setEditItem(r);
  };

  const openUsage = (r) => { setUsageItem(r); fetchUsage(r.id); };
  const resetForm = () => setForm({ client_id: '', name: '', hours_allocated: '', amount: '', billing_cycle: 'monthly' });

  const utilPct = (used, alloc) => alloc > 0 ? Math.min(100, Math.round((used / alloc) * 100)) : 0;
  const barColor = (pct) => pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-blue-500';

  if (loading) return <Layout><div className="p-6 text-center text-gray-500">Loading...</div></Layout>;

  const RetainerForm = ({ onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Client</label>
        <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <option value="">Select client...</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.company_name || c.email}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Retainer Name</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Monthly SEO Retainer" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Hours Allocated</label>
          <input type="number" min="0" step="0.5" value={form.hours_allocated} onChange={e => setForm({ ...form, hours_allocated: e.target.value })} required className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Amount ($)</label>
          <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Billing Cycle</label>
        <select value={form.billing_cycle} onChange={e => setForm({ ...form, billing_cycle: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select>
      </div>
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium">{submitLabel}</button>
    </form>
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Retainers</h1>
            <p className="text-sm text-gray-500 mt-1">Track client retainer hours and usage</p>
          </div>
          <div className="flex items-center gap-3">
            {brands.length > 1 && (
              <select value={selectedBrand?.id || ''} onChange={e => setSelectedBrand(brands.find(b => b.id === e.target.value))} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <button onClick={() => { resetForm(); setShowCreate(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">+ New Retainer</button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Retainers', value: dashboard.active, icon: '📋' },
            { label: 'Hours Allocated', value: dashboard.totalAllocated, icon: '⏱️' },
            { label: 'Hours Used', value: dashboard.totalUsed, icon: '✅' },
            { label: 'Avg Utilization', value: `${dashboard.avgUtil}%`, icon: '📊' },
          ].map((c, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
                  <p className="text-2xl font-bold mt-1 dark:text-white">{c.value}</p>
                </div>
                <span className="text-2xl">{c.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Retainer Grid */}
        {retainers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No retainers yet</p>
            <p className="text-sm mt-1">Create your first retainer to start tracking hours</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {retainers.map(r => {
              const pct = utilPct(r.hours_used || 0, r.hours_allocated);
              const clientName = clients.find(c => c.id === r.client_id)?.name || clients.find(c => c.id === r.client_id)?.company_name || 'Unknown Client';
              return (
                <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">{clientName}</p>
                      <h3 className="font-semibold dark:text-white mt-0.5">{r.name}</h3>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[r.status] || 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500 dark:text-gray-400">{r.hours_used || 0} / {r.hours_allocated} hrs</span>
                      <span className="font-medium dark:text-gray-300">{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full transition-all ${barColor(pct)}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span>${Number(r.amount || 0).toLocaleString()}</span>
                    <span className="capitalize">{r.billing_cycle}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openUsage(r)} className="flex-1 text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition font-medium">View Usage</button>
                    <button onClick={() => openEdit(r)} className="flex-1 text-xs bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition font-medium">Edit</button>
                    <button onClick={() => handleDelete(r.id)} className="flex-1 text-xs bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition font-medium">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Retainer">
        <RetainerForm onSubmit={handleCreate} submitLabel="Create Retainer" />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Retainer">
        <RetainerForm onSubmit={handleEdit} submitLabel="Save Changes" />
      </Modal>

      {/* Usage Modal */}
      <Modal open={!!usageItem} onClose={() => setUsageItem(null)} title={`Usage - ${usageItem?.name || ''}`}>
        <form onSubmit={handleLogUsage} className="flex gap-2 mb-4">
          <input type="number" min="0.25" step="0.25" placeholder="Hours" value={logForm.hours} onChange={e => setLogForm({ ...logForm, hours: e.target.value })} required className="w-20 border rounded-lg px-2 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          <input type="text" placeholder="Description" value={logForm.description} onChange={e => setLogForm({ ...logForm, description: e.target.value })} required className="flex-1 border rounded-lg px-2 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          <input type="date" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition">Log</button>
        </form>
        <div className="max-h-64 overflow-y-auto">
          {usageLogs.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">No usage logged yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-2">Date</th><th className="pb-2">Hours</th><th className="pb-2">Description</th>
              </tr></thead>
              <tbody>
                {usageLogs.map((u, i) => (
                  <tr key={i} className="border-b dark:border-gray-700 last:border-0">
                    <td className="py-2 dark:text-gray-300">{new Date(u.date || u.created_at).toLocaleDateString()}</td>
                    <td className="py-2 font-medium dark:text-white">{u.hours}</td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">{u.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </Layout>
  );
};

export default Retainers;
