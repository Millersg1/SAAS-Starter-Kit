import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Area, Line, ReferenceLine,
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
  const [forecast, setForecast] = useState(null);
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
      revenueAnalyticsAPI.getForecast(brandId),
    ]).then(([r, c, p, f]) => {
      setRevenue(r.data.data);
      setConversion(c.data.data);
      setPipeline(p.data.data);
      setForecast(f.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [brandId]);

  const pipelineChartData = pipeline
    ? Object.entries(pipeline.byStage || {})
        .filter(([k]) => !k.toLowerCase().includes('lost'))
        .map(([stage, data]) => ({
          stage: stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          deals: data.deal_count,
          value: parseFloat(data.total_value),
        }))
    : [];

  // Build combined forecast chart data: 12 historical + 6 projected
  const forecastChartData = forecast ? [
    ...(forecast.historical || []).map((h, i) => ({
      month: h.month,
      actual: h.revenue || null,
      projected: null,
      pipeline: null,
      isLast: i === (forecast.historical.length - 1),
    })),
    ...(forecast.projected || []).map(p => ({
      month: p.month,
      actual: null,
      projected: p.revenue || null,
      pipeline: p.pipeline || null,
      isLast: false,
    })),
  ] : [];

  const todayLabel = forecastChartData.find(d => d.isLast)?.month;

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

            {/* Revenue Forecast */}
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Revenue Forecast</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Current MRR" value={formatCurrency(forecast?.currentMRR)} color="text-blue-600" />
                <StatCard label="Projected MRR (6mo avg)" value={formatCurrency(forecast?.projectedMRR)} color="text-emerald-600" />
                <StatCard label="Projected ARR" value={formatCurrency((forecast?.projectedMRR || 0) * 12)} color="text-purple-600" />
                <StatCard
                  label="Growth Rate"
                  value={`${forecast?.growthRate ?? 0}%`}
                  sub="3-month moving avg"
                  color={(forecast?.growthRate || 0) >= 0 ? 'text-green-600' : 'text-red-500'}
                />
              </div>
              {forecastChartData.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">12-Month History + 6-Month Projection</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={forecastChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={1} />
                      <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v, name) => [
                          formatCurrency(v),
                          name === 'actual' ? 'Actual Revenue' : name === 'projected' ? 'Projected Revenue' : 'Pipeline Contribution',
                        ]}
                      />
                      {todayLabel && (
                        <ReferenceLine
                          x={todayLabel}
                          stroke="#9ca3af"
                          strokeDasharray="4 4"
                          label={{ value: 'Today', fontSize: 11, fill: '#6b7280', position: 'top' }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="actual"
                        fill="#dbeafe"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="actual"
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="projected"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="projected"
                        connectNulls={false}
                      />
                      <Bar dataKey="pipeline" fill="#fbbf24" opacity={0.7} name="pipeline" barSize={8} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Blue area = Actual · Green dashed = Projected · Yellow bars = Pipeline contribution
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                  Forecast will appear once payment history is available.
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
