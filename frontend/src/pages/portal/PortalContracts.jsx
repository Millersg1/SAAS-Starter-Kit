import { useState, useEffect, useRef } from 'react';
import { portalAPI } from '../../services/portalApi';
import PortalLayout from '../../components/PortalLayout';
import SignaturePad from '../../components/SignaturePad';

const STATUS_BADGE = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  signed:   'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  expired:  'bg-orange-100 text-orange-700',
};

export default function PortalContracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [showSign, setShowSign] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signing, setSigning] = useState(false);
  const sigPadRef = useRef(null);

  useEffect(() => {
    portalAPI.getContracts()
      .then(res => setContracts(res.data.data?.contracts || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load contracts'))
      .finally(() => setLoading(false));
  }, []);

  const openSign = (contract) => {
    setSelected(contract);
    setSignerName('');
    setShowSign(true);
  };

  const handleSign = async (e) => {
    e.preventDefault();
    if (!signerName.trim()) return;
    const signature = sigPadRef.current?.toDataURL?.();
    if (!signature || sigPadRef.current?.isEmpty?.()) {
      setError('Please draw your signature before signing.');
      return;
    }
    setSigning(true);
    setError('');
    try {
      await portalAPI.signContract(selected.id, { signature, signer_name: signerName });
      setContracts(cs => cs.map(c => c.id === selected.id ? { ...c, status: 'signed', signed_by_name: signerName } : c));
      setShowSign(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to sign contract.');
    } finally { setSigning(false); }
  };

  return (
    <PortalLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Contracts</h1>

        {error && !showSign && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading contracts...</div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No contracts to show.</div>
        ) : (
          <div className="space-y-4">
            {contracts.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{c.contract_number}
                      {c.issue_date && ` · Issued ${new Date(c.issue_date).toLocaleDateString()}`}
                      {c.expiry_date && ` · Expires ${new Date(c.expiry_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[c.status] || ''}`}>
                    {c.status}
                  </span>
                </div>

                {c.content && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                    {c.content}
                  </div>
                )}

                {c.status === 'signed' && (
                  <p className="text-xs text-green-600 font-medium mt-3">
                    ✓ Signed by {c.signed_by_name} on {c.signed_at ? new Date(c.signed_at).toLocaleDateString() : '—'}
                  </p>
                )}

                {c.status === 'sent' && (
                  <button
                    onClick={() => openSign(c)}
                    className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Review &amp; Sign
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sign Modal */}
        {showSign && selected && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Sign Contract</h2>
              <p className="text-gray-500 text-sm mb-4">{selected.title}</p>

              {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

              <form onSubmit={handleSign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={e => setSignerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Your legal name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Signature *</label>
                  <SignaturePad ref={sigPadRef} width={420} height={160} />
                  <button
                    type="button"
                    onClick={() => sigPadRef.current?.clear?.()}
                    className="text-xs text-gray-400 hover:text-gray-600 underline mt-1"
                  >
                    Clear
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  By clicking Sign Contract, you agree that your electronic signature is legally binding.
                </p>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={signing} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
                    {signing ? 'Signing...' : 'Sign Contract'}
                  </button>
                  <button type="button" onClick={() => setShowSign(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
