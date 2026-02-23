import { useState, useEffect, useRef } from 'react';
import { portalAPI } from '../../services/portalApi';
import PortalLayout from '../../components/PortalLayout';
import SignaturePad from '../../components/SignaturePad';

const STATUS_BADGE = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired:  'bg-orange-100 text-orange-700',
};

const fmt = (n, currency = 'USD') =>
  parseFloat(n || 0).toLocaleString('en-US', { style: 'currency', currency });

const PortalProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  // Accept modal
  const [showAccept, setShowAccept] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [acceptLoading, setAcceptLoading] = useState(false);
  const sigPadRef = useRef(null);

  // Reject modal
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  useEffect(() => {
    portalAPI.getProposals()
      .then(res => setProposals(res.data.data?.proposals || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load proposals'))
      .finally(() => setLoading(false));
  }, []);

  const openAccept = (proposal) => {
    setSelected(proposal);
    setShowAccept(true);
    setSignerName('');
  };

  const openReject = (proposal) => {
    setSelected(proposal);
    setShowReject(true);
    setRejectReason('');
  };

  const handleAccept = async (e) => {
    e.preventDefault();
    if (!signerName.trim()) return;
    const signature = sigPadRef.current?.toDataURL?.();
    if (!signature || sigPadRef.current?.isEmpty?.()) {
      setError('Please draw your signature before accepting.');
      return;
    }
    setAcceptLoading(true);
    setError('');
    try {
      await portalAPI.acceptProposal(selected.id, { signature, signer_name: signerName });
      setProposals(prev => prev.map(p => p.id === selected.id ? { ...p, status: 'accepted' } : p));
      setShowAccept(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept proposal');
    } finally { setAcceptLoading(false); }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    setRejectLoading(true);
    setError('');
    try {
      await portalAPI.rejectProposal(selected.id, { reason: rejectReason });
      setProposals(prev => prev.map(p => p.id === selected.id ? { ...p, status: 'rejected' } : p));
      setShowReject(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject proposal');
    } finally { setRejectLoading(false); }
  };

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Proposals</h1>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : proposals.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-medium">No proposals yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="font-semibold text-gray-900">{p.title}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status] || 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {p.proposal_number}
                      {p.expiry_date && ` · Expires ${new Date(p.expiry_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">{fmt(p.total_amount, p.currency)}</p>
                  </div>
                </div>

                {p.notes && (
                  <p className="mt-3 text-sm text-gray-600 border-t border-gray-100 pt-3">{p.notes}</p>
                )}

                {/* Action buttons for sent proposals */}
                {p.status === 'sent' && (
                  <div className="mt-4 flex gap-3">
                    <button onClick={() => openAccept(p)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                      Accept Proposal
                    </button>
                    <button onClick={() => openReject(p)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
                      Decline
                    </button>
                  </div>
                )}

                {p.status === 'accepted' && p.signed_by_name && (
                  <p className="mt-3 text-xs text-green-700 border-t border-gray-100 pt-3">
                    Accepted by <strong>{p.signed_by_name}</strong>
                    {p.accepted_at && ` on ${new Date(p.accepted_at).toLocaleDateString()}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accept modal */}
      {showAccept && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Accept Proposal</h2>
              <button onClick={() => setShowAccept(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleAccept} className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                By signing below, you agree to the terms of <strong>{selected.title}</strong> for{' '}
                <strong>{fmt(selected.total_amount, selected.currency)}</strong>.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input required value={signerName} onChange={e => setSignerName(e.target.value)}
                  placeholder="Your full legal name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Signature *</label>
                <SignaturePad ref={sigPadRef} width={464} height={140} />
                <button type="button" onClick={() => sigPadRef.current?.clear()}
                  className="mt-1 text-xs text-gray-500 hover:text-gray-700 underline">
                  Clear signature
                </button>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAccept(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={acceptLoading || !signerName.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {acceptLoading ? 'Accepting...' : 'Accept & Sign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showReject && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Decline Proposal</h2>
              <button onClick={() => setShowReject(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleReject} className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">Optionally, let us know why you're declining:</p>
              <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowReject(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={rejectLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {rejectLoading ? 'Declining...' : 'Decline Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
};

export default PortalProposals;
