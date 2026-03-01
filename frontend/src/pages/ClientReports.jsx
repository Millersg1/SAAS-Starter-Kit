import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Layout from '../components/Layout';
import { clientReportAPI, brandAPI, clientAPI } from '../services/api';

const formatCurrency = (v) => `$${parseFloat(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const formatHours = (v) => `${parseFloat(v || 0).toFixed(1)}h`;

const SECTION_META = {
  revenue:      { label: 'Revenue',      icon: '💰', desc: 'Invoices paid & outstanding' },
  pipeline:     { label: 'Pipeline',     icon: '📈', desc: 'Deal wins, losses & weighted value' },
  projects:     { label: 'Projects',     icon: '✅', desc: 'Total, completed & active projects' },
  time:         { label: 'Time',         icon: '⏱️', desc: 'Hours tracked & billable amount' },
  tickets:      { label: 'Tickets',      icon: '🎫', desc: 'Support tickets resolved & open' },
  surveys:      { label: 'Surveys',      icon: '📋', desc: 'NPS score & CSAT average' },
  health_score: { label: 'Health Score', icon: '❤️', desc: 'AI-powered client health' },
};
const ALL_SECTIONS = Object.keys(SECTION_META);

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

function MiniBar({ data, colors }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 10 }} width={40} />
        <Tooltip formatter={(v) => typeof v === 'number' && v > 100 ? formatCurrency(v) : v} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors?.[i] || '#3B82F6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function HealthBar({ label, value, max = 100 }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 text-gray-500 text-xs">{label}</span>
      <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{Math.round(value)}</span>
    </div>
  );
}

export default function ClientReports() {
  const [brand, setBrand] = useState(null);
  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [showSaveTpl, setShowSaveTpl] = useState(false);
  const [viewReport, setViewReport] = useState(null);
  const [tplName, setTplName] = useState('');

  // Builder form
  const [genForm, setGenForm] = useState({
    client_id: '',
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    title: '',
    template_id: '',
    sections: [...ALL_SECTIONS],
  });

  useEffect(() => {
    brandAPI.getBrands().then(res => {
      const b = (res.data.data || [])[0];
      setBrand(b);
      if (b) {
        Promise.all([
          clientReportAPI.listReports(b.id),
          clientAPI.getBrandClients(b.id),
          clientReportAPI.listTemplates(b.id),
        ]).then(([rRes, cRes, tRes]) => {
          setReports(rRes.data.data || []);
          setClients(cRes.data.data || []);
          setTemplates(tRes.data.data || []);
        }).finally(() => setLoading(false));
      }
    });
  }, []);

  const fetchReports = () => {
    if (!brand) return;
    clientReportAPI.listReports(brand.id).then(r => setReports(r.data.data || []));
  };

  const fetchTemplates = () => {
    if (!brand) return;
    clientReportAPI.listTemplates(brand.id).then(r => setTemplates(r.data.data || []));
  };

  const toggleSection = (s) => {
    setGenForm(f => ({
      ...f,
      template_id: '', // clear template when manually toggling
      sections: f.sections.includes(s) ? f.sections.filter(x => x !== s) : [...f.sections, s],
    }));
  };

  const pickTemplate = (tplId) => {
    if (!tplId) {
      setGenForm(f => ({ ...f, template_id: '', sections: [...ALL_SECTIONS] }));
      return;
    }
    const tpl = templates.find(t => t.id === tplId);
    if (tpl) {
      setGenForm(f => ({ ...f, template_id: tplId, sections: tpl.sections || [...ALL_SECTIONS] }));
    }
  };

  const handleGenerate = async () => {
    if (!brand || !genForm.period_start || !genForm.period_end || genForm.sections.length === 0) return;
    setGenerating(true);
    try {
      const res = await clientReportAPI.generateReport(brand.id, genForm);
      setReports(prev => [res.data.data, ...prev]);
      setViewReport(res.data.data);
      setShowGenModal(false);
    } catch (e) { alert(e.response?.data?.message || 'Generation failed.'); }
    setGenerating(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this report?')) return;
    await clientReportAPI.deleteReport(brand.id, id).catch(() => {});
    fetchReports();
    if (viewReport?.id === id) setViewReport(null);
  };

  const handleSaveTemplate = async () => {
    if (!tplName.trim() || !viewReport?.sections?.length) return;
    try {
      await clientReportAPI.createTemplate(brand.id, { name: tplName.trim(), sections: viewReport.sections });
      fetchTemplates();
      setShowSaveTpl(false);
      setTplName('');
    } catch { alert('Failed to save template.'); }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return;
    await clientReportAPI.deleteTemplate(brand.id, id).catch(() => {});
    fetchTemplates();
  };

  const handleExportPDF = async (report) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF('p', 'mm', 'a4');
      const w = doc.internal.pageSize.getWidth();
      let y = 18;

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
      const sects = report.sections || ALL_SECTIONS;

      if (sects.includes('revenue') && m.invoices) {
        autoTable(doc, {
          startY: y,
          head: [['Revenue', '']],
          body: [
            ['Amount Collected', formatCurrency(m.invoices.amount_collected)],
            ['Outstanding', formatCurrency(m.invoices.amount_outstanding)],
            ['Invoices Paid', m.invoices.paid_invoices || 0],
          ],
          styles: { fontSize: 9 }, headStyles: { fillColor: [59, 130, 246] },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      if (sects.includes('pipeline') && m.pipeline) {
        autoTable(doc, {
          startY: y,
          head: [['Pipeline', '']],
          body: [
            ['Deals Won', `${m.pipeline.won_deals || 0} (${formatCurrency(m.pipeline.won_value)})`],
            ['Deals Lost', `${m.pipeline.lost_deals || 0} (${formatCurrency(m.pipeline.lost_value)})`],
            ['Weighted Pipeline', formatCurrency(m.pipeline.weighted_pipeline)],
          ],
          styles: { fontSize: 9 }, headStyles: { fillColor: [139, 92, 246] },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      if ((sects.includes('projects') || sects.includes('time')) && (m.projects || m.timeEntries)) {
        const body = [];
        if (m.projects) {
          body.push(['Projects Completed', m.projects.completed_projects || 0]);
          body.push(['Active Projects', m.projects.active_projects || 0]);
        }
        if (m.timeEntries) {
          body.push(['Hours Tracked', formatHours(m.timeEntries.hours_tracked)]);
          body.push(['Billable Amount', formatCurrency(m.timeEntries.billable_amount)]);
        }
        autoTable(doc, {
          startY: y,
          head: [['Projects & Time', '']],
          body,
          styles: { fontSize: 9 }, headStyles: { fillColor: [16, 185, 129] },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      if (sects.includes('tickets') && m.tickets) {
        autoTable(doc, {
          startY: y,
          head: [['Support Tickets', '']],
          body: [
            ['Total', m.tickets.total_tickets || 0],
            ['Resolved', m.tickets.resolved_tickets || 0],
            ['Open', m.tickets.open_tickets || 0],
          ],
          styles: { fontSize: 9 }, headStyles: { fillColor: [245, 158, 11] },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      if (sects.includes('surveys') && m.surveys) {
        const body = [];
        if (m.surveys.nps_score != null) body.push(['NPS Score', m.surveys.nps_score]);
        if (m.surveys.avg_csat) body.push(['Avg CSAT', m.surveys.avg_csat]);
        body.push(['Total Responses', m.surveys.total_responses || 0]);
        autoTable(doc, {
          startY: y,
          head: [['Surveys', '']],
          body,
          styles: { fontSize: 9 }, headStyles: { fillColor: [236, 72, 153] },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      if (sects.includes('health_score') && m.healthScore) {
        autoTable(doc, {
          startY: y,
          head: [['Health Score', '']],
          body: [['Overall Score', `${m.healthScore.score} / 100`]],
          styles: { fontSize: 9 }, headStyles: { fillColor: [239, 68, 68] },
        });
      }

      doc.save(`${(report.title || 'report').replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (e) { alert('PDF export failed: ' + e.message); }
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-64 text-gray-400">Loading...</div></Layout>;
  }

  const rSections = viewReport?.sections || ALL_SECTIONS;
  const m = viewReport?.metrics || {};

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
                <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
                  {reports.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setViewReport(r)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${viewReport?.id === r.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    >
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{r.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.client_name || 'All clients'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">
                          {r.period_start ? new Date(r.period_start).toLocaleDateString() : ''} – {r.period_end ? new Date(r.period_end).toLocaleDateString() : ''}
                        </p>
                        {r.sections && (
                          <span className="text-xs text-blue-500">{r.sections.length} sections</span>
                        )}
                      </div>
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
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
                {/* Report header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{viewReport.title}</h2>
                    <p className="text-sm text-gray-500">
                      {viewReport.client_name && <span>{viewReport.client_name} · </span>}
                      {viewReport.period_start && new Date(viewReport.period_start).toLocaleDateString()} – {viewReport.period_end && new Date(viewReport.period_end).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setShowSaveTpl(true); setTplName(''); }}
                      className="px-3 py-1.5 text-sm border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      Save Template
                    </button>
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

                {/* Revenue Section */}
                {rSections.includes('revenue') && m.invoices && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">💰 Revenue</h3>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <MetricCard icon="💵" label="Collected" value={formatCurrency(m.invoices.amount_collected)} sub={`${m.invoices.paid_invoices || 0} paid`} />
                      <MetricCard icon="📤" label="Outstanding" value={formatCurrency(m.invoices.amount_outstanding)} />
                      <MetricCard icon="📄" label="Total Invoices" value={m.invoices.total_invoices || 0} />
                    </div>
                    <MiniBar
                      data={[
                        { name: 'Collected', value: parseFloat(m.invoices.amount_collected || 0) },
                        { name: 'Outstanding', value: parseFloat(m.invoices.amount_outstanding || 0) },
                      ]}
                      colors={['#10B981', '#F59E0B']}
                    />
                  </div>
                )}

                {/* Pipeline Section */}
                {rSections.includes('pipeline') && m.pipeline && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">📈 Pipeline</h3>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <MetricCard icon="🏆" label="Won" value={`${m.pipeline.won_deals || 0}`} sub={formatCurrency(m.pipeline.won_value)} />
                      <MetricCard icon="❌" label="Lost" value={`${m.pipeline.lost_deals || 0}`} sub={formatCurrency(m.pipeline.lost_value)} />
                      <MetricCard icon="⚖️" label="Weighted" value={formatCurrency(m.pipeline.weighted_pipeline)} />
                    </div>
                    <MiniBar
                      data={[
                        { name: 'Won', value: parseFloat(m.pipeline.won_value || 0) },
                        { name: 'Lost', value: parseFloat(m.pipeline.lost_value || 0) },
                        { name: 'Weighted', value: parseFloat(m.pipeline.weighted_pipeline || 0) },
                      ]}
                      colors={['#10B981', '#EF4444', '#8B5CF6']}
                    />
                  </div>
                )}

                {/* Projects Section */}
                {rSections.includes('projects') && m.projects && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">✅ Projects</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <MetricCard icon="📁" label="Total" value={m.projects.total_projects || 0} />
                      <MetricCard icon="✅" label="Completed" value={m.projects.completed_projects || 0} />
                      <MetricCard icon="🔄" label="Active" value={m.projects.active_projects || 0} />
                    </div>
                  </div>
                )}

                {/* Time Section */}
                {rSections.includes('time') && m.timeEntries && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">⏱️ Time Tracking</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <MetricCard icon="🕐" label="Hours Tracked" value={formatHours(m.timeEntries.hours_tracked)} />
                      <MetricCard icon="💰" label="Billable Amount" value={formatCurrency(m.timeEntries.billable_amount)} />
                      <MetricCard icon="📊" label="Billable Entries" value={m.timeEntries.billable_entries || 0} />
                    </div>
                  </div>
                )}

                {/* Tickets Section */}
                {rSections.includes('tickets') && m.tickets && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">🎫 Support Tickets</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <MetricCard icon="📋" label="Total" value={m.tickets.total_tickets || 0} />
                      <MetricCard icon="✅" label="Resolved" value={m.tickets.resolved_tickets || 0} />
                      <MetricCard icon="🔴" label="Open" value={m.tickets.open_tickets || 0} />
                    </div>
                  </div>
                )}

                {/* Surveys Section */}
                {rSections.includes('surveys') && m.surveys && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">📋 Surveys</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {m.surveys.nps_score != null && (
                        <MetricCard icon="📊" label="NPS Score"
                          value={m.surveys.nps_score}
                          sub={`${m.surveys.promoters || 0} promoters / ${m.surveys.detractors || 0} detractors`}
                        />
                      )}
                      {m.surveys.avg_csat && (
                        <MetricCard icon="⭐" label="Avg CSAT" value={m.surveys.avg_csat} />
                      )}
                      <MetricCard icon="💬" label="Responses" value={m.surveys.total_responses || 0} />
                    </div>
                  </div>
                )}

                {/* Health Score Section */}
                {rSections.includes('health_score') && m.healthScore && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">❤️ Health Score</h3>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`text-3xl font-bold ${
                          m.healthScore.score >= 70 ? 'text-green-600' : m.healthScore.score >= 40 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {m.healthScore.score}
                        </div>
                        <span className="text-sm text-gray-500">/ 100</span>
                      </div>
                      {m.healthScore.score_breakdown && (
                        <div className="space-y-2">
                          {Object.entries(m.healthScore.score_breakdown).map(([k, v]) => (
                            <HealthBar key={k} label={k.replace(/_/g, ' ')} value={typeof v === 'number' ? v : v?.score || 0} />
                          ))}
                        </div>
                      )}
                    </div>
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
                  <p className="text-sm text-gray-400 text-center py-4">AI summary was not generated (ANTHROPIC_API_KEY not set)</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate Modal — Report Builder */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">✨ Report Builder</h2>
            <p className="text-sm text-gray-500 mb-5">
              Choose a template or pick sections, then generate a report with real data and AI summary.
            </p>

            <div className="space-y-4">
              {/* Template picker */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Template</label>
                <select
                  value={genForm.template_id}
                  onChange={e => pickTemplate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="">Custom (pick sections below)</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}{t.is_system ? ' (Built-in)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Section toggles */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Sections</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_SECTIONS.map(s => {
                    const meta = SECTION_META[s];
                    const active = genForm.sections.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSection(s)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition ${
                          active
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <span>{meta.icon}</span>
                        <div>
                          <div className="font-medium">{meta.label}</div>
                          <div className="text-xs opacity-70">{meta.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {genForm.sections.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Select at least one section</p>
                )}
              </div>

              {/* Client picker */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Client</label>
                <select value={genForm.client_id} onChange={e => setGenForm(p => ({ ...p, client_id: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200">
                  <option value="">All clients (agency overview)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
                </select>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start *</label>
                  <input type="date" value={genForm.period_start} onChange={e => setGenForm(p => ({ ...p, period_start: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End *</label>
                  <input type="date" value={genForm.period_end} onChange={e => setGenForm(p => ({ ...p, period_end: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200" />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title <span className="text-gray-400 font-normal">(auto-generated if blank)</span>
                </label>
                <input value={genForm.title} onChange={e => setGenForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Acme Corp — February 2026 Report"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200" />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowGenModal(false)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleGenerate}
                disabled={generating || !genForm.period_start || !genForm.period_end || genForm.sections.length === 0}
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

      {/* Save as Template Modal */}
      {showSaveTpl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Save as Template</h3>
            <p className="text-sm text-gray-500 mb-3">
              Saves the section configuration from this report as a reusable template.
            </p>
            <input
              value={tplName}
              onChange={e => setTplName(e.target.value)}
              placeholder="Template name"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 mb-2"
            />
            <div className="flex flex-wrap gap-1 mb-4">
              {(viewReport?.sections || ALL_SECTIONS).map(s => (
                <span key={s} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-2 py-0.5 rounded">
                  {SECTION_META[s]?.label || s}
                </span>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveTpl(false)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleSaveTemplate} disabled={!tplName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
