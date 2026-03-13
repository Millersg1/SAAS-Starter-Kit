import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import Skeleton from '../components/Skeleton';
import { invoiceAPI, brandAPI, clientAPI, aiAPI } from '../services/api';
import { downloadCSV } from '../utils/csvUtils';

const Invoices = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [aiDraftDesc, setAiDraftDesc] = useState('');
  const [aiDrafting, setAiDrafting] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    client_id: '',
    invoice_number: '',
    issue_date: '',
    due_date: '',
    status: 'draft',
    notes: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }]
  });

  useEffect(() => { fetchBrands(); }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchInvoices();
      fetchStats();
      fetchClients();
    }
  }, [selectedBrand]);

  const fetchBrands = async () => {
    try {
      const response = await brandAPI.getUserBrands();
      const brandsData = response.data.data?.brands || [];
      setBrands(brandsData);
      if (brandsData.length > 0) setSelectedBrand(brandsData[0]);
    } catch (err) {
      setError('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await invoiceAPI.getBrandInvoices(selectedBrand.id);
      setInvoices(response.data.data?.invoices || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await invoiceAPI.getInvoiceStats(selectedBrand.id);
      setStats(response.data.data?.stats || {});
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clientAPI.getBrandClients(selectedBrand.id, {});
      setClients(response.data.data?.clients || []);
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const response = await invoiceAPI.createInvoice(selectedBrand.id, newInvoice);
      setShowCreateModal(false);
      setNewInvoice({
        client_id: '',
        invoice_number: '',
        issue_date: '',
        due_date: '',
        status: 'draft',
        notes: '',
        items: [{ description: '', quantity: 1, unit_price: 0 }]
      });
      fetchInvoices();
      fetchStats();
      toast.success('Invoice created');
      // Navigate to the new invoice
      const invoice = response.data.data?.invoice;
      if (invoice) navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
      setError(err.response?.data?.message || 'Failed to create invoice');
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await invoiceAPI.deleteInvoice(selectedBrand.id, invoiceId);
      toast.success('Invoice deleted');
      fetchInvoices();
      fetchStats();
    } catch (err) {
      toast.error('Failed to delete invoice');
      setError('Failed to delete invoice');
    }
  };

  const addItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unit_price: 0 }]
    }));
  };

  const removeItem = (index) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-2">
              <Skeleton.Text w="w-32" h="h-7" />
              <Skeleton.Text w="w-56" h="h-4" />
            </div>
            <Skeleton.Text w="w-28" h="h-10" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton.StatCard key={i} />)}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton.Row key={i} />)}
          </div>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your invoices and track payments</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const rows = invoices.map(inv => ({
                  'Invoice #': inv.invoice_number,
                  Client: inv.client_name || '',
                  'Issue Date': inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '',
                  'Due Date': inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '',
                  Amount: parseFloat(inv.total_amount || 0).toFixed(2),
                  Status: inv.status,
                }));
                downloadCSV(rows, 'invoices.csv');
              }}
              className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm"
              disabled={invoices.length === 0}
            >
              Export CSV
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              + New Invoice
            </button>
          </div>
        </div>

        {/* Brand Selector */}
        {brands.length > 1 && (
          <select
            value={selectedBrand?.id || ''}
            onChange={(e) => setSelectedBrand(brands.find(b => b.id === e.target.value))}
            className="mb-4 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
          >
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_invoices || 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.total_amount)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Paid</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paid_amount)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pending_amount)}</p>
            </div>
          </div>
        )}

        {/* Invoices Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No invoices yet. Create your first invoice!
                  </td>
                </tr>
              ) : invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {invoice.client_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(invoice.issue_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(invoice.due_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                      className="text-blue-600 hover:text-blue-700 mr-3"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteInvoice(invoice.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Create New Invoice</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {/* AI Draft */}
            <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-indigo-700 mb-2">✨ AI Draft — describe the work and we'll fill in the line items</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiDraftDesc}
                  onChange={e => setAiDraftDesc(e.target.value)}
                  placeholder="e.g. 'Built a 5-page website with logo and SEO setup'"
                  className="flex-1 px-3 py-1.5 border border-indigo-300 rounded-lg text-sm bg-white"
                />
                <button
                  type="button"
                  disabled={aiDrafting || !aiDraftDesc.trim()}
                  onClick={async () => {
                    setAiDrafting(true);
                    try {
                      const res = await aiAPI.draftInvoice(selectedBrand.id, {
                        description: aiDraftDesc,
                        client_id: newInvoice.client_id || undefined,
                      });
                      const { items, notes } = res.data.data;
                      setNewInvoice(prev => ({ ...prev, items: items.length ? items : prev.items, notes: notes || prev.notes }));
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

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client <span className="text-red-500">*</span></label>
                <select
                  value={newInvoice.client_id}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, client_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="">Select a client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={newInvoice.status}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                  <input
                    type="date"
                    value={newInvoice.issue_date}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, issue_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
                <div className="flex gap-2 mb-1 text-xs font-medium text-gray-500">
                  <span className="flex-1">Description</span>
                  <span className="w-20 text-center">Qty</span>
                  <span className="w-24 text-center">Unit Price</span>
                </div>
                {newInvoice.items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="e.g. Website design"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                      min="1"
                      placeholder="1"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />
                    <input
                      type="number"
                      value={item.unit_price === 0 ? '' : item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />
                    {newInvoice.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addItem}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Item
                </button>
                <p className="text-right mt-2 font-medium text-gray-900">
                  Total: {formatCurrency(calculateTotal(newInvoice.items))}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Create Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Invoices;
