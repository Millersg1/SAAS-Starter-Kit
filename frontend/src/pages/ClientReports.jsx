import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { clientReportAPI, brandAPI, clientAPI } from '../services/api';

const formatCurrency = (v) => `$${parseFloat(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const formatHours = (v) => `${parseFloat(v || 0).toFixed(1)}h`;

function MetricCard({ label, value, icon, sub }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ClientReports() {
  const [brand, setBrand] = useState(null);
  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [viewReport, setViewReport] = useState(null);
  const [genForm, setGenForm] = useState({
    client_id: '',
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    title: '',
  });

  useEffect(() => {
    brandAPI.getBrands().then(res => {
      const b = (res.data.data || [])[0];
      setBrand(b);
      if (b) {
        Promise.all([
          clientReportAPI.listReports(b.id),
          clientAPI.getBrandClients(b.id),
        ]).then(([rRes, cRes]) => {
          setReports(rRes.data.data || []);
          setClients(cRes.data.data || []);
        }).finally(() => setLoading(false));
      }
    });
  }, []);

  const fetchReports = () => {
    if (!brand) return;
    clientReportAPI.listReports(brand.id).then(r => setReports(r.data.data || []));
  };

  const handleGenerate = async () => {
    if (!brand || !genForm.period_start || !genForm.period_end) return;
    setGenerating(true);
    try {
      const res = await clientReportAPI.generateReport(brand.id, genForm);
      setReports(prev => [res.data.data, ...prev]);
      setViewReport(res.data.data);
      setShowGenModal(false);
    } catch(e) { alert(e.response?.data?.message || 'Generation failed. Please try again.'); }
    setGenerating(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this report?')) return;
    await clientReportAPI.deleteReport(brand.id, id).catch(() => {});
    fetchReports();
    if (viewReport?.id === id) setViewReport(null);
  };

  const handleExportPDF = async (report) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF('p', 'mm', 'a4');
      const w = doc.internal.pageSize.getWidth();
      let y = 18;

      // Brand header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(report.title || 'Client Report', 14, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(`${report.period_start ? new Date(report.period_start).toLocaleDateString() : ''} – ${report.period_end ? new Date(report.period_end).toLocaleDateString() : ''}`, 14, y);
      if (report.client_name) doc.text(`Client: ${report.client_name}`, w - 14, y, { align: 'right' });
      y += 10;
      doc.setTextColor(0);

      // Executive summary
      if (report.summary_text) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Executive Summary', 14, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(report.summary_text, w - 28);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 8;
      }

      const m = report.metrics || {};

      // Invoices
      if (m.invoices) {
        autoTable(doc, {
          startY: y,
          head: [['Financial Summary', '']],
          body: [
            ['Amount Collected', formatCurrency(m.invoices.amount_collected)],
            ['Outstanding', formatCurrency(m.invoices.amount_outstanding)],
            ['Invoices Paid', m.invoices.paid_invoices || 0],
          ],
          styles: { fontSize: 9 }, headStyles: { fillColor: [59, 130, 246] },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      // Projects & Time
      if (m.projects || m.timeEntries) {
        autoTable(doc, {
          startY: y,
          head: [['Project & Time', '']],
          body: [
            ['Projects Completed', m.projects?.completed_projects || 0],
            ['Active Projects', m.projects?.active_projects || 0],
            ['Hours Tracked', formatHours(m.timeEntries?.hours_tracked)],
          ],
          styles: { fontSize: 9 }, headStyles: { fillColor: [16, 185, 129] },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      // Social (if any)
      if (m.socialPosts && parseInt(m.socialPosts.total_posts) > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Social Media', '']],
          body: [
            ['Posts Published', m.socialPosts.published_posts || 0],
            ['Total Likes', m.socialPosts.total_likes || 0],
            ['Total Comments', m.socialPosts.total_comments || 0],
            ['Impressions', m.socialPosts.total_impressions || 0],
          ],
          styles: { fontSize: 9 }, headStyles: { fillColor: [139, 92, 246] },
        });
      }

      doc.save(`${(report.title || 'report').replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch(e) { alert('PDF export failed: ' + e.message); }
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-64 text-gray-400">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Client Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">AI-generated branded reports with real metrics — ready to send to clients</p>
          </div>
          <button onClick={() => setShowGenModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm flex items-center gap-2">
            ✨ Generate Report
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports list */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">All Reports ({reports.length})</h2>
              </div>
              {reports.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-sm">No reports yet</p>
                  <p className="text-xs mt-1">Click "Generate Report" to create your first</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {reports.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setViewReport(r)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${viewReport?.id === r.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    >
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{r.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.client_name || 'All clients'}</p>
                      <p className="text-xs text-gray-400">
                        {r.period_start ? new Date(r.period_start).toLocaleDateString() : ''} – {r.period_end ? new Date(r.period_end).toLocaleDateString() : ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Report detail */}
          <div className="lg:col-span-2">
            {!viewReport ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-sm">Select a report to view</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                {/* Report header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{viewReport.title}</h2>
                    <p className="text-sm text-gray-500">
                      {viewReport.client_name && <span>{viewReport.client_name} · </span>}
                      {viewReport.period_start && new Date(viewReport.period_start).toLocaleDateString()} – {viewReport.period_end && new Date(viewReport.period_end).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleExportPDF(viewReport)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                      📄 PDF
                    </button>
                    <button onClick={() => handleDelete(viewReport.id)}
                      className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </div>

                {/* Metrics grid */}
                {viewReport.metrics && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <MetricCard
                      icon="💰" label="Collected"
                      value={formatCurrency(viewReport.metrics.invoices?.amount_collected)}
                      sub={`${viewReport.metrics.invoices?.paid_invoices || 0} invoices paid`}
                    />
                    <MetricCard
                      icon="⏱️" label="Hours Tracked"
                      value={formatHours(viewReport.metrics.timeEntries?.hours_tracked)}
                    />
                    <MetricCard
                      icon="✅" label="Projects Done"
                      value={viewReport.metrics.projects?.completed_projects || 0}
                      sub={`${viewReport.metrics.projects?.active_projects || 0} active`}
                    />
                    <MetricCard
                      icon="📲" label="Posts Published"
                      value={viewReport.metrics.socialPosts?.published_posts || 0}
                      sub={`${viewReport.metrics.socialPosts?.total_likes || 0} likes`}
                    />
                  </div>
                )}

                {/* Outstanding */}
                {parseFloat(viewReport.metrics?.invoices?.amount_outstanding || 0) > 0 && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 mb-4 text-sm">
                    <span className="font-semibold text-orange-700 dark:text-orange-400">⚠️ Outstanding: </span>
                    <span className="text-orange-600">{formatCurrency(viewReport.metrics.invoices.amount_outstanding)} in unpaid invoices</span>
                  </div>
                )}

                {/* Executive Summary */}
                {viewReport.summary_text && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Executive Summary</h3>
                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      {viewReport.summary_text}
                    </div>
                  </div>
                )}

                {!viewReport.summary_text && (
                  <p className="text-sm text-gray-400 text-center py-6">AI summary was not generated (ANTHROPIC_API_KEY not set)</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate Modal */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">✨ Generate Client Report</h2>
            <p className="text-sm text-gray-500 mb-5">
              AI will aggregate real data from invoices, time tracking, projects, and social media — then write an executive summary.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Client</label>
                <select value={genForm.client_id} onChange={e => setGenForm(p => ({...p, client_id: e.target.value}))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900">
                  <option value="">All clients (agency overview)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period Start *</label>
                  <input type="date" value={genForm.period_start} onChange={e => setGenForm(p => ({...p, period_start: e.target.value}))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period End *</label>
                  <input type="date" value={genForm.period_end} onChange={e => setGenForm(p => ({...p, period_end: e.target.value}))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Report Title <span className="text-gray-400 font-normal">(auto-generated if blank)</span>
                </label>
                <input value={genForm.title} onChange={e => setGenForm(p => ({...p, title: e.target.value}))}
                  placeholder="e.g. Acme Corp — February 2026 Report"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"/>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400">
                📊 Will pull: invoices paid/outstanding · hours tracked · projects completed · social posts & engagement · support tickets
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowGenModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleGenerate} disabled={generating || !genForm.period_start || !genForm.period_end}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {generating ? (
                  <>
                    <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    Generating...
                  </>
                ) : '✨ Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
