import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { portalAPI } from '../../services/portalApi';
import PortalLayout from '../../components/PortalLayout';
import SignaturePad from '../../components/SignaturePad';

const STATUS_BADGE = {
  sent: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  partial: 'bg-blue-100 text-blue-700',
};

const STATUS_LABEL = {
  sent: 'Awaiting Payment',
  paid: 'Paid',
  overdue: 'Overdue',
  partial: 'Partially Paid',
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount || 0);

const PAYABLE = ['sent', 'partial', 'overdue'];

const PortalInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [payingId, setPayingId] = useState(null);
  const [signingInvoice, setSigningInvoice] = useState(null);
  const [signerName, setSignerName] = useState('');
  const [signLoading, setSignLoading] = useState(false);
  const [signError, setSignError] = useState('');
  const [connectError, setConnectError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const sigPadRef = useRef(null);

  const paymentResult = searchParams.get('payment'); // 'success' | 'cancel' | null

  useEffect(() => {
    portalAPI
      .getInvoices()
      .then((res) => setInvoices(res.data.data.invoices || []))
      .catch((err) => console.error('Failed to load invoices:', err))
      .finally(() => setLoading(false));
  }, []);

  const dismissBanner = () => {
    searchParams.delete('payment');
    searchParams.delete('invoice');
    setSearchParams(searchParams);
  };

  const handlePayNow = async (invoiceId) => {
    setPayingId(invoiceId);
    setConnectError('');
    try {
      const res = await portalAPI.createPaymentCheckout(invoiceId);
      window.location.href = res.data.data.url;
    } catch (err) {
      console.error('Failed to create payment session:', err);
      if (err.response?.status === 402) {
        setConnectError(
          err.response?.data?.message ||
          'Online payment is not available yet. Please contact your account manager.'
        );
      } else {
        setConnectError(err.response?.data?.message || 'Could not start payment. Please try again.');
      }
    } finally {
      setPayingId(null);
    }
  };

  const handleSignSubmit = async (e) => {
    e.preventDefault();
    if (!signerName.trim()) {
      setSignError('Please enter your full name.');
      return;
    }
    if (sigPadRef.current?.isEmpty()) {
      setSignError('Please draw your signature above.');
      return;
    }
    setSignLoading(true);
    setSignError('');
    try {
      const signature = sigPadRef.current.getDataURL();
      await portalAPI.signInvoice(signingInvoice.id, { signature, signer_name: signerName.trim() });
      // Update local state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === signingInvoice.id
            ? { ...inv, client_signature: signature, signed_by_name: signerName.trim(), signed_at: new Date().toISOString() }
            : inv
        )
      );
      setSigningInvoice(null);
      setSignerName('');
    } catch (err) {
      setSignError(err.response?.data?.message || 'Failed to sign invoice. Please try again.');
    } finally {
      setSignLoading(false);
    }
  };

  const filtered = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter);

  const totalOutstanding = invoices
    .filter((i) => PAYABLE.includes(i.status))
    .reduce((sum, i) => sum + parseFloat(i.amount_due || i.total_amount || 0), 0);

  return (
    <PortalLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>

        {/* Payment success / cancel banners */}
        {paymentResult === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <p className="font-semibold text-green-800">Payment successful! Thank you.</p>
            </div>
            <button onClick={dismissBanner} className="text-green-600 hover:text-green-800 text-xl font-bold">×</button>
          </div>
        )}
        {paymentResult === 'cancel' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <p className="font-semibold text-yellow-800">Payment cancelled. Your invoice is still outstanding.</p>
            </div>
            <button onClick={dismissBanner} className="text-yellow-600 hover:text-yellow-800 text-xl font-bold">×</button>
          </div>
        )}

        {/* Connect required / payment error banner */}
        {connectError && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <p className="font-semibold text-orange-800">{connectError}</p>
            </div>
            <button
              onClick={() => setConnectError('')}
              className="text-orange-600 hover:text-orange-800 text-xl font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Outstanding balance banner */}
        {!loading && totalOutstanding > 0 && !paymentResult && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-semibold text-yellow-800">
                Outstanding balance: {formatCurrency(totalOutstanding)}
              </p>
              <p className="text-yellow-700 text-sm">Click "Pay Now" on any invoice below to pay online.</p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'sent', 'overdue', 'paid'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
              }`}
            >
              {f === 'all' ? 'All' : STATUS_LABEL[f] || f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-gray-500 text-sm">Loading invoices...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
            No invoices found.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Invoice #</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 hidden sm:table-cell">
                    Due Date
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">
                        {invoice.invoice_number || `#${invoice.id.slice(0, 8)}`}
                      </p>
                      {invoice.signed_by_name && (
                        <p className="text-xs text-green-600 mt-0.5">
                          Signed by {invoice.signed_by_name}
                          {invoice.signed_at && ` on ${new Date(invoice.signed_at).toLocaleDateString()}`}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          STATUS_BADGE[invoice.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {STATUS_LABEL[invoice.status] || invoice.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">
                      {invoice.due_date
                        ? new Date(invoice.due_date).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {PAYABLE.includes(invoice.status) && parseFloat(invoice.amount_due || 0) > 0 && (
                          <button
                            onClick={() => handlePayNow(invoice.id)}
                            disabled={payingId === invoice.id}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {payingId === invoice.id ? 'Redirecting...' : 'Pay Now'}
                          </button>
                        )}
                        {PAYABLE.includes(invoice.status) && !invoice.client_signature && (
                          <button
                            onClick={() => { setSigningInvoice(invoice); setSignerName(''); setSignError(''); }}
                            className="px-3 py-1.5 bg-white text-gray-700 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
                          >
                            Sign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* E-Signature Modal */}
      {signingInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Sign Invoice</h2>
                <p className="text-sm text-gray-500">{signingInvoice.invoice_number}</p>
              </div>
              <button
                onClick={() => setSigningInvoice(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSignSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Draw your signature below
                </label>
                <SignaturePad ref={sigPadRef} width={464} height={140} />
                <button
                  type="button"
                  onClick={() => sigPadRef.current?.clear()}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear signature
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full name *
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Your full legal name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              {signError && (
                <p className="text-sm text-red-600">{signError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={signLoading}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {signLoading ? 'Submitting...' : 'Sign Invoice'}
                </button>
                <button
                  type="button"
                  onClick={() => setSigningInvoice(null)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
};

export default PortalInvoices;
