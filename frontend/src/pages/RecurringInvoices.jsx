import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { invoiceAPI, brandAPI } from '../services/api';

const FREQ_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const RecurringInvoices = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ invoice_id: '', recurrence_type: 'monthly', recurrence_day: 1, recurrence_end_date: '' });

  useEffect(() => { fetchBrands(); }, []);
  useEffect(() => { if (selectedBrand) { fetchRecurring(); fetchAllInvoices(); } }, [selectedBrand]);

  const fetchBrands = async () => {
    try {
      const res = await brandAPI.getUserBrands();
      const list = res.data.data?.brands || [];
      setBrands(list);
      if (list.length > 0) setSelectedBrand(list[0]);
    } catch { toast.error('Failed to load brands'); }
    finally { setLoading(false); }
  };

  const fetchRecurring = async () => {
    try {
      const res = await invoiceAPI.getBrandInvoices(selectedBrand.id, { limit: 200 });
      const all = res.data.data?.invoices || [];
      setInvoices(all.filter(i => i.is_recurring));
    } catch { console.error('Failed to load recurring invoices'); }
  };

  const fetchAllInvoices = async () => {
    try {
      const res = await invoiceAPI.getBrandInvoices(selectedBrand.id, { limit: 200 });
      setAllInvoices(res.data.data?.invoices || []);
    } catch { console.error('Failed to load invoices'); }
  };

  const openSetup = () => { setEditingId(null); setForm({ invoice_id: '', recurrence_type: 'monthly', recurrence_day: 1, recurrence_end_date: '' }); setShowModal(true); };

  const openEdit = (inv) => {
    setEditingId(inv.id);
    setForm({ invoice_id: inv.id, recurrence_type: inv.recurrence_type || 'monthly', recurrence_day: inv.recurrence_day || 1, recurrence_end_date: inv.recurrence_end_date?.slice(0, 10) || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    const id = editingId || form.invoice_id;
    if (!id) { toast.error('Select an invoice'); return; }
    try {
      await invoiceAPI.updateInvoice(selectedBrand.id, id, {
        is_recurring: true,
        recurrence_type: form.recurrence_type,
        recurrence_day: Number(form.recurrence_day),
        recurrence_end_date: form.recurrence_end_date || null,
        next_recurrence_date: form.recurrence_end_date || null,
      });
      toast.success(editingId ? 'Recurrence updated' : 'Recurring invoice set up');
      setShowModal(false);
      fetchRecurring();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
  };

  const togglePause = async (inv) => {
    try {
      await invoiceAPI.updateInvoice(selectedBrand.id, inv.id, { is_recurring: !inv.is_recurring });
      toast.success(inv.is_recurring ? 'Paused' : 'Resumed');
      fetchRecurring();
      fetchAllInvoices();
    } catch { toast.error('Failed to update'); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString() : '-';
  const fmtMoney = (n) => `$${(Number(n) || 0).toFixed(2)}`;

  if (loading) return <Layout><div className="p-6 text-gray-400">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Recurring Invoices</h1>
            <p className="text-gray-400 text-sm mt-1">Automate billing with recurring schedules</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedBrand?.id || ''} onChange={(e) => setSelectedBrand(brands.find(b => b.id === e.target.value))} className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm">
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={openSetup} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Set Up Recurring</button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Invoice #</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Frequency</th>
                <th className="text-left p-3">Next Date</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-500">No recurring invoices yet</td></tr>}
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="p-3 text-white">{inv.client_name || inv.client_id}</td>
                  <td className="p-3 text-gray-300">{inv.invoice_number}</td>
                  <td className="p-3 text-right text-white font-medium">{fmtMoney(inv.total_amount)}</td>
                  <td className="p-3"><span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs capitalize">{inv.recurrence_type}</span></td>
                  <td className="p-3 text-gray-300">{fmt(inv.next_recurrence_date)}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${inv.status === 'paid' ? 'bg-green-500/20 text-green-400' : inv.status === 'overdue' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{inv.status}</span></td>
                  <td className="p-3 text-right space-x-2">
                    <button onClick={() => openEdit(inv)} className="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
                    <button onClick={() => togglePause(inv)} className="text-yellow-400 hover:text-yellow-300 text-xs">{inv.is_recurring ? 'Pause' : 'Resume'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-white">{editingId ? 'Edit Recurrence' : 'Set Up Recurring Invoice'}</h2>
              {!editingId && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Select Invoice</label>
                  <select value={form.invoice_id} onChange={e => setForm({ ...form, invoice_id: e.target.value })} className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm">
                    <option value="">-- Choose --</option>
                    {allInvoices.filter(i => !i.is_recurring).map(i => <option key={i.id} value={i.id}>{i.invoice_number} - {i.client_name || 'Unknown'} ({fmtMoney(i.total_amount)})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Frequency</label>
                <select value={form.recurrence_type} onChange={e => setForm({ ...form, recurrence_type: e.target.value })} className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm">
                  {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Recurrence Day (1-28)</label>
                <input type="number" min={1} max={28} value={form.recurrence_day} onChange={e => setForm({ ...form, recurrence_day: e.target.value })} className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">End Date (optional)</label>
                <input type="date" value={form.recurrence_end_date} onChange={e => setForm({ ...form, recurrence_end_date: e.target.value })} className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2">Cancel</button>
                <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RecurringInvoices;
