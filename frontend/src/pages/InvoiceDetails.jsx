import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { invoiceAPI, brandAPI, publicInvoiceAPI } from '../services/api';
import { generateInvoicePDF } from '../utils/pdfUtils';

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [payments, setPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: '', payment_date: '', payment_method: 'bank_transfer', notes: '' });
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  const [formData, setFormData] = useState({
    invoice_number: '',
    status: 'pending',
    issue_date: '',
    due_date: '',
    notes: '',
    items: [],
    recurrence_type: 'none',
    next_invoice_date: '',
  });

  useEffect(() => { fetchBrands(); }, []);

  useEffect(() => {
    if (brands.length > 0) fetchInvoice();
  }, [brands, id]);

  const fetchBrands = async () => {
    try {
      const response = await brandAPI.getUserBrands();
      setBrands(response.data.data?.brands || []);
    } catch (err) {
      setError('Failed to load brands');
    }
  };

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      // Try each brand until we find the invoice
      for (const brand of brands) {
        try {
          const response = await invoiceAPI.getInvoice(brand.id, id);
          const inv = response.data.data?.invoice;
          const invItems = response.data.data?.items || [];
          setInvoice(inv);
          setFormData({
            invoice_number: inv.invoice_number || '',
            status: inv.status || 'draft',
            issue_date: inv.issue_date ? inv.issue_date.split('T')[0] : '',
            due_date: inv.due_date ? inv.due_date.split('T')[0] : '',
            notes: inv.notes || '',
            items: invItems,
            recurrence_type: inv.recurrence_type || 'none',
            next_invoice_date: inv.next_invoice_date ? inv.next_invoice_date.split('T')[0] : '',
          });
          // Fetch payments
          try {
            const paymentsRes = await invoiceAPI.getInvoicePayments(brand.id, id);
            setPayments(paymentsRes.data.data?.payments || []);
          } catch (e) { /* ignore */ }
          setError('');
          break;
        } catch (err) { continue; }
      }
    } catch (err) {
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!invoice) return;
    setSaving(true);
    setError('');
    try {
      await invoiceAPI.updateInvoice(invoice.brand_id, id, formData);
      setSuccessMessage('Invoice updated successfully');
      setIsEditing(false);
      fetchInvoice();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleSendToClient = async () => {
    if (!invoice || !window.confirm('Send this invoice to the client? This will notify them by email.')) return;
    setSaving(true);
    setError('');
    try {
      await invoiceAPI.updateInvoice(invoice.brand_id, id, { status: 'sent' });
      setSuccessMessage('Invoice sent to client successfully');
      fetchInvoice();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyShareLink = async () => {
    try {
      const brand = brands.find(b => b.id === invoice.brand_id) || brands[0];
      const res = await publicInvoiceAPI.generateLink(brand.id, invoice.id);
      await navigator.clipboard.writeText(res.data.data.url);
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate share link');
    }
  };

  const handlePrintPDF = () => {
    const items = formData.items || [];
    const total = calculateTotal(items);
    const brand = brands.find(b => b.id === invoice.brand_id) || brands[0];
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; margin: 0; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .brand-name { font-size: 24px; font-weight: 700; color: #1d4ed8; }
    .invoice-label { font-size: 28px; font-weight: 800; color: #111; text-align: right; }
    .invoice-number { font-size: 14px; color: #6b7280; text-align: right; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 4px; }
    .meta-value { font-size: 14px; font-weight: 600; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f3f4f6; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    td:last-child, th:last-child { text-align: right; }
    .totals { display: flex; justify-content: flex-end; }
    .totals table { width: 280px; }
    .totals td { border: none; padding: 6px 12px; }
    .totals .total-row td { font-size: 16px; font-weight: 700; border-top: 2px solid #e5e7eb; padding-top: 12px; }
    .notes { margin-top: 32px; padding: 16px; background: #f9fafb; border-radius: 8px; font-size: 13px; color: #4b5563; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize; background: #fef3c7; color: #92400e; }
    .status-paid { background: #d1fae5; color: #065f46; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-name">${brand?.name || 'Agency'}</div>
    </div>
    <div>
      <div class="invoice-label">INVOICE</div>
      <div class="invoice-number">#${invoice.invoice_number}</div>
      <div style="margin-top:8px"><span class="status-badge ${invoice.status === 'paid' ? 'status-paid' : ''}">${invoice.status}</span></div>
    </div>
  </div>
  <div class="meta">
    <div>
      <div class="meta-label">Billed To</div>
      <div class="meta-value">${invoice.client_name || '-'}</div>
    </div>
    <div>
      <div class="meta-label">Issue Date</div>
      <div class="meta-value">${formatDate(invoice.issue_date)}</div>
    </div>
    <div>
      <div class="meta-label" style="margin-top:16px">Invoice Number</div>
      <div class="meta-value">${invoice.invoice_number}</div>
    </div>
    <div>
      <div class="meta-label" style="margin-top:16px">Due Date</div>
      <div class="meta-value">${formatDate(invoice.due_date)}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
    <tbody>${items.map(item => `<tr>
      <td>${item.description || '-'}</td>
      <td>${item.quantity}</td>
      <td>${formatCurrency(item.unit_price)}</td>
      <td>${formatCurrency(item.quantity * item.unit_price)}</td>
    </tr>`).join('')}</tbody>
  </table>
  <div class="totals">
    <table>
      <tr><td style="color:#6b7280">Subtotal</td><td>${formatCurrency(total)}</td></tr>
      <tr class="total-row"><td>Total Due</td><td>${formatCurrency(total)}</td></tr>
    </table>
  </div>
  ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
</body>
</html>`;
    const win = window.open('', '_blank', 'width=800,height=1000');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const handleDelete = async () => {
    if (!invoice || !window.confirm('Delete this invoice?')) return;
    try {
      await invoiceAPI.deleteInvoice(invoice.brand_id, id);
      navigate('/invoices');
    } catch (err) {
      setError('Failed to delete invoice');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!invoice) return;
    setSaving(true);
    setError('');
    try {
      await invoiceAPI.recordPayment(invoice.brand_id, id, newPayment);
      setShowPaymentModal(false);
      setNewPayment({ amount: '', payment_date: '', payment_method: 'bank_transfer', notes: '' });
      setSuccessMessage('Payment recorded successfully');
      fetchInvoice();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unit_price: 0 }]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateItem = (index, field, value) => {
    setFormData(prev => ({
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
    return (items || []).reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Invoice not found</p>
            <button onClick={() => navigate('/invoices')} className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Invoices
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate('/invoices')} className="text-blue-600 hover:text-blue-700 mb-4 flex items-center">
            ← Back to Invoices
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoice {invoice.invoice_number}</h1>
              <p className="text-gray-600 mt-1">{invoice.client_name}</p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3">
          {!isEditing ? (
            <>
              <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Edit Invoice
              </button>
              {invoice.status === 'draft' && invoice.client_id && (
                <button
                  onClick={handleSendToClient}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  📧 Send to Client
                </button>
              )}
              {invoice.status !== 'paid' && (
                <button onClick={() => setShowPaymentModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                  Record Payment
                </button>
              )}
              <button onClick={handleCopyShareLink}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm font-medium">
                {shareLinkCopied ? '✓ Copied!' : '🔗 Copy Payment Link'}
              </button>
              <button
                onClick={() => {
                  const brand = brands.find(b => b.id === invoice.brand_id) || brands[0];
                  generateInvoicePDF(invoice, formData.items, payments, brand?.name || 'Agency', invoice.client_name);
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm font-medium"
              >
                ⬇ Download PDF
              </button>
              <button
                onClick={handlePrintPDF}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm font-medium"
              >
                📄 Export PDF
              </button>
              <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                Delete
              </button>
            </>
          ) : (
            <>
              <button onClick={handleUpdate} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => { setIsEditing(false); fetchInvoice(); }} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                Cancel
              </button>
            </>
          )}
        </div>

        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:bg-gray-100"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h2>
            <table className="min-w-full divide-y divide-gray-200 mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  {isEditing && <th className="px-3 py-2"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {formData.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        disabled={!isEditing}
                        min="1"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-gray-900 disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        disabled={!isEditing}
                        min="0"
                        step="0.01"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-gray-900 disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-900 font-medium">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </td>
                    {isEditing && (
                      <td className="px-3 py-2">
                        <button onClick={() => handleRemoveItem(index)} className="text-red-600 hover:text-red-700">
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {isEditing && (
              <button onClick={handleAddItem} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                + Add Item
              </button>
            )}
            <p className="text-right mt-4 text-lg font-bold text-gray-900">
              Total: {formatCurrency(calculateTotal(formData.items))}
            </p>
          </div>

          {/* Notes */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              disabled={!isEditing}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:bg-gray-100"
            />
          </div>

          {/* Recurrence */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Recurring Invoice</h2>
            <p className="text-sm text-gray-500 mb-4">
              Automatically clone this invoice as a new draft on a schedule.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recurrence</label>
                <select
                  value={formData.recurrence_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, recurrence_type: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:bg-gray-100"
                >
                  <option value="none">No recurrence</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              {formData.recurrence_type !== 'none' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Next invoice date</label>
                  <input
                    type="date"
                    value={formData.next_invoice_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, next_invoice_date: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:bg-gray-100"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    A new draft invoice will be created automatically on this date.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment History */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
            {payments.length === 0 ? (
              <p className="text-gray-500 text-sm">No payments recorded yet.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-3 py-2 text-sm text-gray-900">{formatDate(payment.payment_date)}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{payment.payment_method}</td>
                      <td className="px-3 py-2 text-sm font-medium text-green-600">{formatCurrency(payment.amount)}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{payment.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Metadata */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>Created: {formatDate(invoice.created_at)}</div>
              <div>Updated: {formatDate(invoice.updated_at)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Record Payment</h3>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={newPayment.payment_date}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, payment_date: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={newPayment.payment_method}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {saving ? 'Recording...' : 'Record Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
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

export default InvoiceDetails;
