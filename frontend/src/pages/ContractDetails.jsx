import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { contractAPI, brandAPI } from '../services/api';
import { generateContractPDF } from '../utils/pdfUtils';

const STATUS_COLORS = {
  draft:    'bg-gray-100 text-gray-700',
  sent:     'bg-blue-100 text-blue-700',
  signed:   'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  expired:  'bg-amber-100 text-amber-700',
};

export default function ContractDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [form, setForm] = useState({ title: '', content: '', issue_date: '', expiry_date: '', notes: '' });

  useEffect(() => {
    brandAPI.getUserBrands().then(res => setBrands(res.data.data?.brands || []));
  }, []);

  useEffect(() => {
    if (!brands.length) return;
    loadContract();
  }, [brands, id]);

  const loadContract = async () => {
    setLoading(true);
    for (const brand of brands) {
      try {
        const res = await contractAPI.get(brand.id, id);
        const c = res.data.data?.contract;
        if (c) {
          setContract(c);
          setForm({
            title: c.title || '',
            content: c.content || '',
            issue_date: c.issue_date ? c.issue_date.split('T')[0] : '',
            expiry_date: c.expiry_date ? c.expiry_date.split('T')[0] : '',
            notes: c.notes || '',
          });
          setLoading(false);
          return;
        }
      } catch { /* try next brand */ }
    }
    setError('Contract not found');
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await contractAPI.update(contract.brand_id, id, form);
      setContract(res.data.data?.contract);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleSend = async () => {
    if (!window.confirm('Send this contract to the client for signing?')) return;
    setActionLoading('send');
    try {
      const res = await contractAPI.send(contract.brand_id, id);
      setContract(res.data.data?.contract);
    } catch (err) { setError(err.response?.data?.message || 'Failed to send'); }
    finally { setActionLoading(''); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this contract? This cannot be undone.')) return;
    try {
      await contractAPI.remove(contract.brand_id, id);
      navigate('/contracts');
    } catch (err) { setError('Failed to delete contract'); }
  };

  if (loading) return <Layout><div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div></Layout>;
  if (!contract) return <Layout><div className="text-center py-16 text-gray-400">{error || 'Contract not found.'}</div></Layout>;

  const brand = brands.find(b => b.id === contract.brand_id) || brands[0];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/contracts')} className="text-sm text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-1">
          ← Back to Contracts
        </button>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{error}</div>}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Header row */}
          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="text-2xl font-bold text-gray-900 border-b-2 border-blue-400 outline-none w-full"
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
              )}
              <p className="text-gray-500 text-sm mt-1">{contract.contract_number} · {contract.client_name || 'No client'}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[contract.status]}`}>
              {contract.status}
            </span>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Issue Date</p>
              {isEditing ? (
                <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-full" />
              ) : (
                <p className="font-medium">{contract.issue_date ? new Date(contract.issue_date).toLocaleDateString() : '—'}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Expiry Date</p>
              {isEditing ? (
                <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 w-full" />
              ) : (
                <p className="font-medium">{contract.expiry_date ? new Date(contract.expiry_date).toLocaleDateString() : '—'}</p>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Contract Content</p>
            {isEditing ? (
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={16}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
              />
            ) : (
              <div className="whitespace-pre-wrap text-gray-700 text-sm bg-gray-50 rounded-lg p-4 min-h-32 font-mono">
                {contract.content || <span className="text-gray-400 italic">No content</span>}
              </div>
            )}
          </div>

          {/* Signature block */}
          {contract.status === 'signed' && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Signed By</p>
              <p className="font-semibold text-gray-900">{contract.signed_by_name}</p>
              {contract.signed_by_email && <p className="text-sm text-gray-500">{contract.signed_by_email}</p>}
              {contract.signed_at && <p className="text-xs text-gray-400 mt-1">{new Date(contract.signed_at).toLocaleString()}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-100 mt-6">
            {!isEditing && contract.status === 'draft' && (
              <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                Edit
              </button>
            )}
            {isEditing && (
              <>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              </>
            )}
            {contract.status === 'draft' && (
              <button onClick={handleSend} disabled={!!actionLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                {actionLoading === 'send' ? 'Sending...' : 'Send to Client'}
              </button>
            )}
            <button
              onClick={() => generateContractPDF(contract, brand?.name || 'Agency', contract.client_name)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              ⬇ Download PDF
            </button>
            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              Delete
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
