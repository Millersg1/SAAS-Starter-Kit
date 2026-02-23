import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { timeAPI, brandAPI, clientAPI, projectAPI, invoiceAPI } from '../services/api';

const fmt = (mins) => {
  if (!mins) return '0h 0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const fmtMoney = (n) => parseFloat(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const TimeTracking = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeTimer, setActiveTimer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerDesc, setTimerDesc] = useState('');
  const [timerProject, setTimerProject] = useState('');
  const [timerClient, setTimerClient] = useState('');
  const timerInterval = useRef(null);

  // Manual entry form
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ description: '', project_id: '', client_id: '', start_time: '', end_time: '', hourly_rate: '', is_billable: true });
  const [saving, setSaving] = useState(false);

  // Add-to-invoice modal
  const [invoiceModal, setInvoiceModal] = useState(null); // { entryId }
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState('');

  useEffect(() => { fetchBrands(); }, []);
  useEffect(() => {
    if (selectedBrand) {
      fetchEntries();
      fetchClients();
      fetchProjects();
      fetchActiveTimer();
    }
  }, [selectedBrand]);

  // Start/stop interval
  useEffect(() => {
    if (activeTimer) {
      const elapsed = Math.floor((Date.now() - new Date(activeTimer.start_time).getTime()) / 1000);
      setTimerSeconds(elapsed);
      timerInterval.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerInterval.current);
      setTimerSeconds(0);
    }
    return () => clearInterval(timerInterval.current);
  }, [activeTimer]);

  const fetchBrands = async () => {
    try {
      const res = await brandAPI.getUserBrands();
      const list = res.data.data?.brands || [];
      setBrands(list);
      if (list.length > 0) setSelectedBrand(list[0]);
    } catch { setError('Failed to load brands'); }
    finally { setLoading(false); }
  };

  const fetchEntries = async () => {
    try {
      const res = await timeAPI.getEntries(selectedBrand.id);
      setEntries(res.data.data?.entries || []);
      setSummary(res.data.data?.summary || null);
    } catch (err) { console.error(err); }
  };

  const fetchClients = async () => {
    try {
      const res = await clientAPI.getBrandClients(selectedBrand.id);
      setClients(res.data.data?.clients || []);
    } catch { /* ignore */ }
  };

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.getBrandProjects(selectedBrand.id);
      setProjects(res.data.data?.projects || []);
    } catch { /* ignore */ }
  };

  const fetchActiveTimer = async () => {
    try {
      const res = await timeAPI.getActiveTimer(selectedBrand.id);
      setActiveTimer(res.data.data?.entry || null);
    } catch { /* ignore */ }
  };

  const handleStartTimer = async () => {
    try {
      const res = await timeAPI.createEntry({
        brand_id: selectedBrand.id,
        description: timerDesc || null,
        project_id: timerProject || null,
        client_id: timerClient || null,
        start_time: new Date().toISOString(),
      });
      setActiveTimer(res.data.data.entry);
    } catch (err) { setError(err.response?.data?.message || 'Failed to start timer'); }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    try {
      await timeAPI.updateEntry(activeTimer.id, { end_time: new Date().toISOString() });
      setActiveTimer(null);
      setTimerDesc('');
      setTimerProject('');
      setTimerClient('');
      await fetchEntries();
    } catch (err) { setError(err.response?.data?.message || 'Failed to stop timer'); }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await timeAPI.createEntry({
        brand_id: selectedBrand.id,
        ...manualForm,
        project_id: manualForm.project_id || null,
        client_id: manualForm.client_id || null,
        hourly_rate: manualForm.hourly_rate ? parseFloat(manualForm.hourly_rate) : null,
      });
      setShowManual(false);
      setManualForm({ description: '', project_id: '', client_id: '', start_time: '', end_time: '', hourly_rate: '', is_billable: true });
      await fetchEntries();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save entry'); }
    finally { setSaving(false); }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Delete this time entry?')) return;
    try {
      await timeAPI.deleteEntry(entryId);
      await fetchEntries();
    } catch (err) { setError(err.response?.data?.message || 'Failed to delete entry'); }
  };

  const openInvoiceModal = async (entryId) => {
    setInvoiceModal(entryId);
    try {
      const res = await invoiceAPI.getBrandInvoices(selectedBrand.id);
      setInvoices((res.data.data?.invoices || []).filter(i => ['draft', 'pending'].includes(i.status)));
    } catch { /* ignore */ }
  };

  const handleAddToInvoice = async () => {
    if (!selectedInvoice) return;
    try {
      await timeAPI.addToInvoice(invoiceModal, { invoice_id: selectedInvoice });
      setInvoiceModal(null);
      setSelectedInvoice('');
      await fetchEntries();
    } catch (err) { setError(err.response?.data?.message || 'Failed to add to invoice'); }
  };

  const timerDisplay = () => {
    const h = Math.floor(timerSeconds / 3600);
    const m = Math.floor((timerSeconds % 3600) / 60);
    const s = timerSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) return <Layout><div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div></Layout>;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Time Tracking</h1>
            <p className="text-sm text-gray-500 mt-1">Track billable hours and add to invoices</p>
          </div>
          <button onClick={() => setShowManual(true)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
            + Manual Entry
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {/* Brand selector */}
        {brands.length > 1 && (
          <div className="mb-4">
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={selectedBrand?.id || ''} onChange={e => setSelectedBrand(brands.find(b => b.id === e.target.value))}>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {/* Timer widget */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Timer</h2>
          {activeTimer ? (
            <div className="flex items-center gap-4">
              <div className="text-3xl font-mono font-bold text-blue-600">{timerDisplay()}</div>
              <div className="flex-1 text-sm text-gray-600">{activeTimer.description || 'No description'}</div>
              <button onClick={handleStopTimer} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                Stop
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <input value={timerDesc} onChange={e => setTimerDesc(e.target.value)} placeholder="What are you working on?"
                className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={timerProject} onChange={e => setTimerProject(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={timerClient} onChange={e => setTimerClient(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={handleStartTimer} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                Start
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total Time', value: fmt(parseInt(summary.total_minutes)) },
              { label: 'Billable Time', value: fmt(parseInt(summary.billable_minutes)) },
              { label: 'Billable Amount', value: fmtMoney(summary.total_billable_amount) },
              { label: 'Uninvoiced Entries', value: summary.uninvoiced_entries },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Entries table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {entries.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <div className="text-5xl mb-3">⏱</div>
              <p className="font-medium">No time entries yet</p>
              <p className="text-sm mt-1">Start a timer or add a manual entry</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Description</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Project</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Duration</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Amount</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium">Billable</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{e.description || <span className="text-gray-400 italic">No description</span>}</td>
                    <td className="px-4 py-3 text-gray-500">{e.project_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{e.start_time ? new Date(e.start_time).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {e.end_time ? fmt(e.duration_minutes) : <span className="text-green-600 font-medium">Running</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{e.billable_amount ? fmtMoney(e.billable_amount) : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {e.is_billable ? <span className="text-green-600">✓</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {e.is_billable && !e.is_invoiced && e.end_time && (
                          <button onClick={() => openInvoiceModal(e.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium">Add to Invoice</button>
                        )}
                        {e.is_invoiced && <span className="text-xs text-gray-400">Invoiced</span>}
                        <button onClick={() => handleDeleteEntry(e.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Manual entry modal */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Manual Time Entry</h2>
              <button onClick={() => setShowManual(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleManualSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={manualForm.description} onChange={e => setManualForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input required type="datetime-local" value={manualForm.start_time}
                    onChange={e => setManualForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="datetime-local" value={manualForm.end_time}
                    onChange={e => setManualForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                  <select value={manualForm.project_id} onChange={e => setManualForm(f => ({ ...f, project_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">None</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                  <input type="number" min="0" step="0.01" value={manualForm.hourly_rate}
                    onChange={e => setManualForm(f => ({ ...f, hourly_rate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="billable" checked={manualForm.is_billable}
                  onChange={e => setManualForm(f => ({ ...f, is_billable: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600" />
                <label htmlFor="billable" className="text-sm text-gray-700">Billable</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowManual(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to invoice modal */}
      {invoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add to Invoice</h2>
            <p className="text-sm text-gray-600 mb-3">Select a draft or pending invoice to add this time entry to:</p>
            <select value={selectedInvoice} onChange={e => setSelectedInvoice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select invoice...</option>
              {invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} — {i.client_name || 'No client'}</option>)}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setInvoiceModal(null); setSelectedInvoice(''); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddToInvoice} disabled={!selectedInvoice}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                Add to Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TimeTracking;
