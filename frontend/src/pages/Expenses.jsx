import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { expenseAPI, brandAPI, clientAPI, projectAPI } from '../services/api';

const CATEGORIES = ['advertising', 'software', 'travel', 'office', 'contractor', 'other'];

const defaultForm = {
  description: '', amount: '', category: 'other', date: new Date().toISOString().slice(0, 10),
  project_id: '', client_id: '', receipt_url: '', billable: false,
};

const fmt = (v) => `$${parseFloat(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Expenses = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({});
  const [profitability, setProfitability] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBillable, setFilterBillable] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  useEffect(() => { fetchBrands(); }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchExpenses();
      fetchStats();
      fetchProfitability();
      fetchClients();
      fetchProjects();
    }
  }, [selectedBrand, filterCategory, filterBillable, filterFrom, filterTo]);

  const fetchBrands = async () => {
    try {
      const res = await brandAPI.getUserBrands();
      const list = res.data.data?.brands || [];
      setBrands(list);
      if (list.length > 0) setSelectedBrand(list[0]);
    } catch { toast.error('Failed to load brands'); }
    finally { setLoading(false); }
  };

  const buildParams = () => {
    const p = {};
    if (filterCategory) p.category = filterCategory;
    if (filterBillable !== '') p.billable = filterBillable;
    if (filterFrom) p.from = filterFrom;
    if (filterTo) p.to = filterTo;
    return p;
  };

  const fetchExpenses = async () => {
    try {
      const res = await expenseAPI.list(selectedBrand.id, buildParams());
      setExpenses(res.data.data?.expenses || res.data.expenses || []);
    } catch { console.error('Failed to load expenses'); }
  };

  const fetchStats = async () => {
    try {
      const res = await expenseAPI.getStats(selectedBrand.id, buildParams());
      setStats(res.data.data?.stats || res.data.stats || {});
    } catch { console.error('Failed to load stats'); }
  };

  const fetchProfitability = async () => {
    try {
      const res = await expenseAPI.getProfitability(selectedBrand.id);
      setProfitability(res.data.data?.profitability || res.data.profitability || []);
    } catch { /* optional endpoint */ }
  };

  const fetchClients = async () => {
    try {
      const res = await clientAPI.getBrandClients(selectedBrand.id, { limit: 200 });
      setClients(res.data.data?.clients || []);
    } catch {}
  };

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.getBrandProjects(selectedBrand.id, { limit: 200 });
      setProjects(res.data.data?.projects || []);
    } catch {}
  };

  const openCreate = () => { setEditingId(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (exp) => {
    setEditingId(exp.id);
    setForm({
      description: exp.description || '', amount: exp.amount || '', category: exp.category || 'other',
      date: exp.date ? exp.date.slice(0, 10) : '', project_id: exp.project_id || '',
      client_id: exp.client_id || '', receipt_url: exp.receipt_url || '', billable: !!exp.billable,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount) { toast.error('Description and amount are required'); return; }
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editingId) {
        await expenseAPI.update(selectedBrand.id, editingId, payload);
        toast.success('Expense updated');
      } else {
        await expenseAPI.create(selectedBrand.id, payload);
        toast.success('Expense created');
      }
      setShowModal(false);
      fetchExpenses();
      fetchStats();
      fetchProfitability();
    } catch { toast.error('Failed to save expense'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await expenseAPI.remove(selectedBrand.id, id);
      toast.success('Expense deleted');
      fetchExpenses();
      fetchStats();
      fetchProfitability();
    } catch { toast.error('Failed to delete expense'); }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!selectedBrand) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">No brands available. Create a brand first.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
            <p className="text-gray-600 dark:text-gray-400">Track and manage business expenses</p>
          </div>
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
            + Add Expense
          </button>
        </div>

        {/* Brand Selector */}
        {brands.length > 1 && (
          <select value={selectedBrand?.id || ''} onChange={(e) => setSelectedBrand(brands.find(b => b.id === e.target.value))}
            className="mb-4 px-3 py-2 border border-gray-300 rounded-lg text-gray-900">
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(stats.total)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Billable</p>
            <p className="text-2xl font-bold text-green-600">{fmt(stats.billable)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Non-Billable</p>
            <p className="text-2xl font-bold text-red-500">{fmt(stats.non_billable)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">This Month</p>
            <p className="text-2xl font-bold text-blue-600">{fmt(stats.this_month)}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select value={filterBillable} onChange={(e) => setFilterBillable(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            <option value="">All</option>
            <option value="true">Billable</option>
            <option value="false">Non-Billable</option>
          </select>
          <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} placeholder="From"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} placeholder="To"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          {(filterCategory || filterBillable || filterFrom || filterTo) && (
            <button onClick={() => { setFilterCategory(''); setFilterBillable(''); setFilterFrom(''); setFilterTo(''); }}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline">
              Clear Filters
            </button>
          )}
        </div>

        {/* Expenses Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-8">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billable</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {expenses.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">No expenses found</td></tr>
              ) : expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                    {exp.date ? new Date(exp.date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">{exp.description}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{exp.project_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{exp.client_name || '-'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{fmt(exp.amount)}</td>
                  <td className="px-6 py-4 text-sm">
                    {exp.billable
                      ? <span className="text-green-600 font-medium">Yes</span>
                      : <span className="text-gray-400">No</span>}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button onClick={() => openEdit(exp)} className="text-blue-600 hover:text-blue-800">Edit</button>
                    <button onClick={() => handleDelete(exp.id)} className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Profitability by Project */}
        {profitability.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profitability by Project</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expenses</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {profitability.map((p) => {
                    const profit = (p.revenue || 0) - (p.expenses || 0);
                    const margin = p.revenue ? ((profit / p.revenue) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={p.project_id || p.project_name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{p.project_name || 'Unassigned'}</td>
                        <td className="px-4 py-3 text-sm text-green-600 font-medium">{fmt(p.revenue)}</td>
                        <td className="px-4 py-3 text-sm text-red-500 font-medium">{fmt(p.expenses)}</td>
                        <td className={`px-4 py-3 text-sm font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(profit)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{margin}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingId ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project</label>
                  <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">None</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
                  <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">None</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.company_name || c.email}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt URL</label>
                <input type="url" value={form.receipt_url} onChange={(e) => setForm({ ...form, receipt_url: e.target.value })}
                  placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Billable expense</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Expenses;
