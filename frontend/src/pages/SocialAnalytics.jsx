import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { socialAPI, brandAPI } from '../services/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const PLATFORM_COLORS = {
  linkedin:  '#0077B5',
  twitter:   '#1DA1F2',
  facebook:  '#1877F2',
  instagram: '#E1306C',
};

const PLATFORM_LABELS = {
  linkedin: 'LinkedIn', twitter: 'Twitter/X', facebook: 'Facebook', instagram: 'Instagram'
};

const METRIC_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

export default function SocialAnalytics() {
  const [brand, setBrand] = useState(null);
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    brandAPI.getBrands().then(res => {
      const b = (res.data.data || [])[0];
      setBrand(b);
    });
  }, []);

  useEffect(() => {
    if (brand) fetchAnalytics();
  }, [brand, days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await socialAPI.getAnalytics(brand.id, { days });
      setData(res.data.data);
    } catch { /* non-critical */ }
    setLoading(false);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      let y = 18;

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Social Media Analytics Report', 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`${brand?.name || 'Brand'} · Last ${days} days · Generated ${new Date().toLocaleDateString()}`, 14, y);
      y += 12;

      doc.setTextColor(0);

      // Platform summary table
      if (data?.byPlatform?.length) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Performance by Platform', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Platform', 'Total Posts', 'Published', 'Scheduled', 'Likes', 'Comments', 'Shares', 'Impressions']],
          body: data.byPlatform.map(p => [
            PLATFORM_LABELS[p.platform] || p.platform,
            p.total || 0, p.published || 0, p.scheduled || 0,
            p.total_likes || 0, p.total_comments || 0, p.total_shares || 0, p.total_impressions || 0,
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [59, 130, 246] },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // Top posts table
      if (data?.topPosts?.length) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Performing Posts', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Platform', 'Content Preview', 'Likes', 'Comments', 'Shares']],
          body: data.topPosts.slice(0, 10).map(p => [
            PLATFORM_LABELS[p.platform] || p.platform,
            (p.content || '').slice(0, 60) + ((p.content?.length || 0) > 60 ? '...' : ''),
            p.like_count || 0, p.comment_count || 0, p.share_count || 0,
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [16, 185, 129] },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      doc.save(`social-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch(e) {
      alert('PDF export failed: ' + e.message);
    }
    setExporting(false);
  };

  // Aggregate engagement over time for the line chart (sum all platforms per day)
  const engagementByDay = (() => {
    if (!data?.overTime?.length) return [];
    const byDay = {};
    for (const row of data.overTime) {
      const day = row.day;
      if (!byDay[day]) byDay[day] = { day, likes: 0, comments: 0, shares: 0, impressions: 0, posts: 0 };
      byDay[day].likes      += parseInt(row.likes)       || 0;
      byDay[day].comments   += parseInt(row.comments)    || 0;
      byDay[day].shares     += parseInt(row.shares)      || 0;
      byDay[day].impressions+= parseInt(row.impressions) || 0;
      byDay[day].posts      += parseInt(row.posts_count) || 0;
    }
    return Object.values(byDay).sort((a, b) => new Date(a.day) - new Date(b.day))
      .map(r => ({ ...r, day: new Date(r.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }));
  })();

  const platformPieData = (data?.byPlatform || []).map(p => ({
    name: PLATFORM_LABELS[p.platform] || p.platform,
    value: parseInt(p.published) || 0,
    color: PLATFORM_COLORS[p.platform] || '#9CA3AF',
  })).filter(p => p.value > 0);

  const totalEngagement = (data?.byPlatform || []).reduce((s, p) =>
    s + (parseInt(p.total_likes) || 0) + (parseInt(p.total_comments) || 0) + (parseInt(p.total_shares) || 0), 0);

  const totalPosts = (data?.byPlatform || []).reduce((s, p) => s + (parseInt(p.total) || 0), 0);
  const totalPublished = (data?.byPlatform || []).reduce((s, p) => s + (parseInt(p.published) || 0), 0);
  const totalImpressions = (data?.byPlatform || []).reduce((s, p) => s + (parseInt(p.total_impressions) || 0), 0);

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Social Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Performance overview across all connected accounts</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={handleExportPDF}
              disabled={exporting || !data}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
              {exporting ? 'Exporting...' : '📄 Export PDF'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : !data ? (
          <div className="text-center text-gray-500 py-20">Failed to load analytics data.</div>
        ) : (
          <div ref={chartRef} className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Posts', value: totalPosts, icon: '📝', color: 'blue' },
                { label: 'Published', value: totalPublished, icon: '✅', color: 'green' },
                { label: 'Total Engagement', value: totalEngagement.toLocaleString(), icon: '❤️', color: 'pink' },
                { label: 'Impressions', value: totalImpressions.toLocaleString(), icon: '👁️', color: 'purple' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">{kpi.label}</span>
                    <span className="text-xl">{kpi.icon}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Engagement over time — 2/3 width */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Engagement Over Time</h2>
                {engagementByDay.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No published posts in this period</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={engagementByDay} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="likes" stroke="#EC4899" strokeWidth={2} dot={false} name="Likes" />
                      <Line type="monotone" dataKey="comments" stroke="#3B82F6" strokeWidth={2} dot={false} name="Comments" />
                      <Line type="monotone" dataKey="shares" stroke="#10B981" strokeWidth={2} dot={false} name="Shares" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Posts by platform — 1/3 width */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Posts by Platform</h2>
                {platformPieData.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No posts yet</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={platformPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                          {platformPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-2">
                      {platformPieData.map(p => (
                        <div key={p.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-gray-600 dark:text-gray-400">{p.name}</span>
                          </div>
                          <span className="font-medium text-gray-800 dark:text-gray-200">{p.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Platform breakdown bar chart */}
            {data.byPlatform.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Engagement by Platform</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.byPlatform.map(p => ({
                    name: PLATFORM_LABELS[p.platform] || p.platform,
                    Likes: parseInt(p.total_likes) || 0,
                    Comments: parseInt(p.total_comments) || 0,
                    Shares: parseInt(p.total_shares) || 0,
                  }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Likes"    fill="#EC4899" radius={[4,4,0,0]} />
                    <Bar dataKey="Comments" fill="#3B82F6" radius={[4,4,0,0]} />
                    <Bar dataKey="Shares"   fill="#10B981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top posts table */}
            {data.topPosts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Performing Posts</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-100 dark:border-gray-700">
                        <th className="pb-2 text-xs text-gray-500 font-medium">Platform</th>
                        <th className="pb-2 text-xs text-gray-500 font-medium">Content</th>
                        <th className="pb-2 text-xs text-gray-500 font-medium text-right">❤️ Likes</th>
                        <th className="pb-2 text-xs text-gray-500 font-medium text-right">💬 Comments</th>
                        <th className="pb-2 text-xs text-gray-500 font-medium text-right">🔁 Shares</th>
                        <th className="pb-2 text-xs text-gray-500 font-medium text-right">👁️ Impressions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                      {data.topPosts.map(post => (
                        <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-2.5 pr-4">
                            <span className="text-xs font-medium" style={{ color: PLATFORM_COLORS[post.platform] || '#6B7280' }}>
                              {PLATFORM_LABELS[post.platform] || post.platform}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 max-w-xs">
                            <p className="text-gray-700 dark:text-gray-300 truncate text-xs">{post.content}</p>
                            {post.published_at && (
                              <p className="text-gray-400 text-xs">{new Date(post.published_at).toLocaleDateString()}</p>
                            )}
                          </td>
                          <td className="py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">{post.like_count || 0}</td>
                          <td className="py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">{post.comment_count || 0}</td>
                          <td className="py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">{post.share_count || 0}</td>
                          <td className="py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">{post.impression_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty state if no posts at all */}
            {totalPosts === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-4">📊</div>
                <p className="text-lg font-medium text-gray-500">No post data yet</p>
                <p className="text-sm mt-1">Start publishing social posts to see analytics here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
