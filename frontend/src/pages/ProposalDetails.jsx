import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { proposalAPI } from '../services/api';
import { generateProposalPDF } from '../utils/pdfUtils';

const STATUS_COLORS = {
  draft:    'bg-gray-100 text-gray-700',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired:  'bg-orange-100 text-orange-700',
};

const ProposalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => { fetchProposal(); }, [id]);

  const fetchProposal = async () => {
    try {
      const res = await proposalAPI.getProposal(id);
      setProposal(res.data.data.proposal);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load proposal');
    } finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!window.confirm('Send this proposal to the client?')) return;
    setActionLoading('send');
    try {
      await proposalAPI.sendProposal(id);
      await fetchProposal();
    } catch (err) { setError(err.response?.data?.message || 'Failed to send proposal'); }
    finally { setActionLoading(''); }
  };

  const handleConvert = async () => {
    if (!window.confirm('Convert this proposal to an invoice?')) return;
    setActionLoading('convert');
    try {
      const res = await proposalAPI.convertToInvoice(id);
      navigate(`/invoices/${res.data.data.invoice.id}`);
    } catch (err) { setError(err.response?.data?.message || 'Failed to convert proposal'); }
    finally { setActionLoading(''); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this proposal? This cannot be undone.')) return;
    setActionLoading('delete');
    try {
      await proposalAPI.deleteProposal(id);
      navigate('/proposals');
    } catch (err) { setError(err.response?.data?.message || 'Failed to delete proposal'); }
    finally { setActionLoading(''); }
  };

  const handlePrintPDF = () => {
    if (!proposal) return;
    const items = proposal.items || [];
    const sub = parseFloat(proposal.subtotal || 0);
    const tax = parseFloat(proposal.tax_amount || 0);
    const disc = parseFloat(proposal.discount_amount || 0);
    const tot = parseFloat(proposal.total_amount || 0);
    const cur = proposal.currency || 'USD';
    const fmtCur = (n) => parseFloat(n || 0).toLocaleString('en-US', { style: 'currency', currency: cur });
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '-';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Proposal ${proposal.proposal_number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; margin: 0; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .title { font-size: 28px; font-weight: 800; color: #111; text-align: right; }
    .number { font-size: 14px; color: #6b7280; text-align: right; }
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
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize; background: #dbeafe; color: #1e40af; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:20px;font-weight:700;color:#1d4ed8">${proposal.client_name || 'Client'}</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px">${proposal.project_name || ''}</div>
    </div>
    <div>
      <div class="title">PROPOSAL</div>
      <div class="number">${proposal.proposal_number}</div>
      <div style="margin-top:8px"><span class="badge">${proposal.status}</span></div>
    </div>
  </div>
  <div class="meta">
    <div>
      <div class="meta-label">Title</div>
      <div class="meta-value">${proposal.title}</div>
    </div>
    <div>
      <div class="meta-label">Issue Date</div>
      <div class="meta-value">${fmtDate(proposal.issue_date)}</div>
    </div>
    <div>
      <div class="meta-label" style="margin-top:16px">Currency</div>
      <div class="meta-value">${cur}</div>
    </div>
    <div>
      <div class="meta-label" style="margin-top:16px">Expiry Date</div>
      <div class="meta-value">${fmtDate(proposal.expiry_date)}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
    <tbody>${items.map(item => `<tr>
      <td>${item.description || '-'}</td>
      <td>${item.quantity}</td>
      <td>${fmtCur(item.unit_price)}</td>
      <td>${fmtCur(item.amount || item.quantity * item.unit_price)}</td>
    </tr>`).join('')}</tbody>
  </table>
  <div class="totals">
    <table>
      <tr><td style="color:#6b7280">Subtotal</td><td>${fmtCur(sub)}</td></tr>
      ${tax ? `<tr><td style="color:#6b7280">Tax</td><td>${fmtCur(tax)}</td></tr>` : ''}
      ${disc ? `<tr><td style="color:#6b7280">Discount</td><td>-${fmtCur(disc)}</td></tr>` : ''}
      <tr class="total-row"><td>Total</td><td>${fmtCur(tot)}</td></tr>
    </table>
  </div>
  ${proposal.notes ? `<div class="notes"><strong>Notes:</strong> ${proposal.notes}</div>` : ''}
  ${proposal.terms ? `<div class="notes" style="margin-top:12px"><strong>Terms:</strong> ${proposal.terms}</div>` : ''}
</body>
</html>`;
    const win = window.open('', '_blank', 'width=800,height=1000');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  if (loading) return <Layout><div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div></Layout>;
  if (!proposal) return <Layout><div className="text-center py-16 text-gray-400">Proposal not found.</div></Layout>;

  const subtotal = parseFloat(proposal.subtotal || 0);
  const tax = parseFloat(proposal.tax_amount || 0);
  const discount = parseFloat(proposal.discount_amount || 0);
  const total = parseFloat(proposal.total_amount || 0);
  const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: proposal.currency || 'USD' });

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <button onClick={() => navigate('/proposals')} className="text-sm text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-1">
          ← Back to Proposals
        </button>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {/* Header card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{proposal.title}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[proposal.status]}`}>
                  {proposal.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {proposal.proposal_number} &bull; {proposal.client_name || 'No client'}
                {proposal.expiry_date && ` · Expires ${new Date(proposal.expiry_date).toLocaleDateString()}`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {proposal.view_count > 0 ? (
                  <>
                    <span>👁 Viewed {proposal.view_count}x</span>
                    {proposal.last_viewed_at && (
                      <span> · Last {(() => {
                        const diff = Math.floor((Date.now() - new Date(proposal.last_viewed_at)) / 1000);
                        if (diff < 60) return 'just now';
                        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                        return `${Math.floor(diff / 86400)}d ago`;
                      })()}</span>
                    )}
                  </>
                ) : (
                  <span>👁 Not yet viewed</span>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {proposal.status === 'draft' && (
                <button onClick={handleSend} disabled={actionLoading === 'send'}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading === 'send' ? 'Sending...' : 'Send to Client'}
                </button>
              )}
              {['sent', 'accepted'].includes(proposal.status) && (
                <button onClick={handleConvert} disabled={actionLoading === 'convert'}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {actionLoading === 'convert' ? 'Converting...' : 'Convert to Invoice'}
                </button>
              )}
              <button
                onClick={() => generateProposalPDF(proposal, proposal.items || [], proposal.brand_name || 'Agency', proposal.client_name)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1">
                ⬇ Download PDF
              </button>
              <button onClick={handlePrintPDF}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1">
                📄 Export PDF
              </button>
              <button onClick={handleDelete} disabled={!!actionLoading}
                className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50">
                Delete
              </button>
            </div>
          </div>

          {/* Signature info */}
          {proposal.status === 'accepted' && proposal.signed_by_name && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-800">
              Accepted by <strong>{proposal.signed_by_name}</strong>
              {proposal.accepted_at && ` on ${new Date(proposal.accepted_at).toLocaleString()}`}
            </div>
          )}
          {proposal.status === 'rejected' && proposal.rejection_reason && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-800">
              Rejected: {proposal.rejection_reason}
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
          <div className="px-6 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">Line Items</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-2 text-gray-500 font-medium">Description</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Qty</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Unit Price</th>
                <th className="text-right px-6 py-2 text-gray-500 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(proposal.items || []).map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-6 py-3 text-gray-800">{item.description}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(parseFloat(item.unit_price))}</td>
                  <td className="px-6 py-3 text-right font-medium text-gray-800">{fmt(parseFloat(item.amount || item.quantity * item.unit_price))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Totals */}
          <div className="px-6 py-4 border-t border-gray-200 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            {tax > 0 && <div className="flex justify-between text-gray-600"><span>Tax ({proposal.tax_rate}%)</span><span>{fmt(tax)}</span></div>}
            {discount > 0 && <div className="flex justify-between text-gray-600"><span>Discount</span><span>-{fmt(discount)}</span></div>}
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2 mt-2">
              <span>Total</span><span>{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes + Terms */}
        {(proposal.notes || proposal.terms) && (
          <div className="grid grid-cols-2 gap-4">
            {proposal.notes && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">{proposal.notes}</p>
              </div>
            )}
            {proposal.terms && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Terms</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">{proposal.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProposalDetails;
