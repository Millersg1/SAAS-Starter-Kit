import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { publicInvoiceAPI } from '../services/api';

const PublicInvoice = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('payment'));

  useEffect(() => {
    publicInvoiceAPI.getInvoice(token)
      .then(res => setData(res.data.data))
      .catch(err => setError(err.response?.data?.message || 'Invoice not found or link is invalid.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await publicInvoiceAPI.pay(token);
      window.location.href = res.data.data.url;
    } catch (err) {
      setError(err.response?.data?.message || 'Payment unavailable. Please contact your account manager.');
      setPaying(false);
    }
  };

  const fmt = (n, currency = 'USD') =>
    parseFloat(n || 0).toLocaleString('en-US', { style: 'currency', currency });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invoice Unavailable</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const { invoice, brand } = data;
  const primaryColor = brand.primary_color || '#2563eb';

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Brand header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4 flex items-center gap-4"
          style={{ borderTop: `4px solid ${primaryColor}` }}>
          {brand.logo_url && <img src={brand.logo_url} alt={brand.name} className="h-12 object-contain" />}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{brand.name}</h1>
            <p className="text-sm text-gray-500">Invoice {invoice.invoice_number}</p>
          </div>
        </div>

        {/* Payment status banners */}
        {paymentStatus === 'success' && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-medium">
            Payment received! Thank you. You may receive a receipt by email shortly.
          </div>
        )}
        {paymentStatus === 'cancel' && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
            Payment was cancelled. You can try again below.
          </div>
        )}

        {/* Invoice details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">Issue Date</p>
              <p className="text-sm font-medium text-gray-800">{invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Due Date</p>
              <p className="text-sm font-medium text-gray-800">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-2 text-gray-500 font-medium">Description</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Qty</th>
                <th className="text-right px-6 py-2 text-gray-500 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-6 py-3 text-gray-800">{item.description}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                  <td className="px-6 py-3 text-right text-gray-800 font-medium">
                    {fmt(parseFloat(item.quantity) * parseFloat(item.unit_price), invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-6 py-4 border-t border-gray-200 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Total</span><span>{fmt(invoice.total_amount, invoice.currency)}</span></div>
            {parseFloat(invoice.amount_paid) > 0 && (
              <div className="flex justify-between text-green-600"><span>Paid</span><span>-{fmt(invoice.amount_paid, invoice.currency)}</span></div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2 mt-2">
              <span>Amount Due</span>
              <span style={{ color: primaryColor }}>{fmt(invoice.amount_due, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 text-sm text-gray-600">
            {invoice.notes}
          </div>
        )}

        {/* Pay button */}
        {paymentStatus !== 'success' && parseFloat(invoice.amount_due) > 0 && brand.payment_enabled && (
          <button onClick={handlePay} disabled={paying}
            className="w-full py-3 text-white font-semibold rounded-xl shadow-sm transition-opacity disabled:opacity-50 text-base"
            style={{ backgroundColor: primaryColor }}>
            {paying ? 'Redirecting to Stripe...' : `Pay ${fmt(invoice.amount_due, invoice.currency)}`}
          </button>
        )}
        {!brand.payment_enabled && (
          <p className="text-center text-sm text-gray-400 mt-2">Online payment is not available for this invoice. Please contact {brand.name} directly.</p>
        )}
      </div>
    </div>
  );
};

export default PublicInvoice;
