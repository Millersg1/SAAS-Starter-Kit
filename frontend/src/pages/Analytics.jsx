import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Layout from '../components/Layout';
import { revenueAnalyticsAPI, brandAPI } from '../services/api';
import { downloadCSV } from '../utils/csvUtils';

const formatCurrency = (v) => `$${parseFloat(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

const StatCard = ({ label, value, sub, color = 'text-gray-900' }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

export default function Analytics() {
  const [brandId, setBrandId] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [conversion, setConversion] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    brandAPI.getUserBrands().then(res => {
      const brands = res.data.data?.brands || [];
      if (brands.length > 0) setBrandId(brands[0].id);
    });
  }, []);

  useEffect(() => {
    if (!brandId) return;
    setLoading(true);
    Promise.all([
      revenueAnalyticsAPI.getRevenue(brandId),
      revenueAnalyticsAPI.getConversion(brandId),
      revenueAnalyticsAPI.getPipeline(brandId),
    ]).then(([r, c, p]) => {
      setRevenue(r.data.data);
      setConversion(c.data.data);
      setPipeline(p.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [brandId]);

  const pipelineChartData = pipeline
    ? Object.entries(pipeline.byStage || {})
        .filter(([k]) => k !== 'lost')
        .map(([stage, data]) => ({
          stage: stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          deals: data.deal_count,
          value: parseFloat(data.total_value),
        }))
    : [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          {revenue?.monthly?.length > 0 && (
            <button
              onClick={() => {
                const rows = (revenue.monthly || []).map(m => ({
                  Month: m.month,
                  Revenue: parseFloat(m.revenue || 0).toFixed(2),
                }));
                downloadCSV(rows, 'revenue.csv');
              }}
              className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Export CSV
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading analytics...</div>
        ) : (
          <>
            {/* Revenue Summary */}
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Revenue</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Revenue" value={formatCurrency(revenue?.totalRevenue)} color="text-green-600" />
                <StatCard label="Proposals Sent" value={conversion?.sent ?? '—'} />
                <StatCard label="Proposals Accepted" value={conversion?.accepted ?? '—'} color="text-blue-600" />
                <StatCard label="Conversion Rate" value={`${conversion?.conversionRate ?? 0}%`} color="text-purple-600"
                  sub={`Avg ${conversion?.avgDaysToClose ?? 0} days to close`} />
              </div>

              {/* Monthly Revenue Bar Chart */}
              {revenue?.monthly?.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue (Last 12 Months)</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={revenue.monthly} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                  No payment data yet. Revenue will appear once payments are recorded.
                </div>
              )}
            </section>

            {/* Top Clients */}
            {revenue?.topClients?.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Top Clients by Revenue</h2>
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {revenue.topClients.map((c, i) => (
                    <div key={c.id} className="flex items-center px-5 py-3 gap-4">
                      <span className="text-sm font-bold text-gray-300 w-5">#{i + 1}</span>
                      <span className="flex-1 text-sm font-medium text-gray-800">{c.name}</span>
                      <span className="text-sm text-gray-500">{c.payment_count} payment{c.payment_count !== 1 ? 's' : ''}</span>
                      <span className="text-sm font-semibold text-green-600">{formatCurrency(c.total_revenue)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Pipeline by Stage */}
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Pipeline by Stage</h2>
              {pipelineChartData.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-6 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Weighted Pipeline Value</p>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(pipeline?.totalWeighted)}</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={pipelineChartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, n) => [n === 'value' ? formatCurrency(v) : v, n === 'value' ? 'Value' : 'Deals']} />
                      <Bar yAxisId="left" dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="value" />
                      <Bar yAxisId="right" dataKey="deals" fill="#93c5fd" radius={[4, 4, 0, 0]} name="deals" />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-400 mt-2 text-center">Blue = Total Value · Light Blue = Deal Count</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                  No pipeline deals yet. Add deals in the Pipeline page.
                </div>
              )}
            </section>

            {/* Proposal Trend */}
            {conversion?.trend?.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Proposal Activity (Last 6 Months)</h2>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={conversion.trend} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month_label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="sent" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Sent" />
                      <Bar dataKey="accepted" fill="#10b981" radius={[4, 4, 0, 0]} name="Accepted" />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-400 mt-2 text-center">Yellow = Sent · Green = Accepted</p>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
