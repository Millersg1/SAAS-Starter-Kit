import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { leadFormAPI } from '../services/api';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  converted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export default function LeadSubmissions() {
  const { formId } = useParams();
  const { activeBrandId } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [converting, setConverting] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchSubmissions = useCallback(async () => {
    if (!activeBrandId) return;
    setLoading(true);
    try {
      const res = formId
        ? await leadFormAPI.getSubmissions(activeBrandId, formId, statusFilter ? { status: statusFilter } : {})
        : await leadFormAPI.getAllSubmissions(activeBrandId, statusFilter ? { status: statusFilter } : {});
      setSubmissions(res.data.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [activeBrandId, formId, statusFilter]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const handleConvert = async (submissionId) => {
    if (!window.confirm('Convert this lead to a client?')) return;
    setConverting(submissionId);
    try {
      await leadFormAPI.convertToClient(activeBrandId, submissionId);
      fetchSubmissions();
    } catch (e) { alert(e.response?.data?.message || 'Failed to convert.'); } finally { setConverting(''); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/lead-forms" className="text-blue-600 hover:underline text-sm">← Lead Forms</Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {formId ? 'Form Submissions' : 'All Submissions'}
        </h1>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-4">
        {['', 'new', 'contacted', 'converted', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-sm rounded-lg capitalize ${statusFilter === s ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📨</div>
          <p className="text-gray-500 dark:text-gray-400">No submissions yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>{['Name', 'Email', 'Phone', 'Form', 'Status', 'Submitted', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {submissions.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <button onClick={() => setSelected(selected?.id === s.id ? null : s)} className="hover:text-blue-600">{s.name || '—'}</button>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{s.form_name || '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>{s.status}</span></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(s.submitted_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {s.status !== 'converted' && (
                      <button onClick={() => handleConvert(s.id)} disabled={converting === s.id} className="text-xs text-green-600 hover:underline disabled:opacity-50">
                        {converting === s.id ? 'Converting…' : 'Convert to Client'}
                      </button>
                    )}
                    {s.status === 'converted' && s.converted_to_client_id && (
                      <Link to={`/clients/${s.converted_to_client_id}`} className="text-xs text-blue-600 hover:underline">View Client →</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Expandable detail */}
          {selected && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-750">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-800 dark:text-gray-200">Submission Data — {selected.name}</h4>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(selected.data || {}).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{k}</dt>
                    <dd className="text-sm text-gray-800 dark:text-gray-200">{String(v)}</dd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
