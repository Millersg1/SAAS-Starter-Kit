import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { brandAPI, revenueAnalyticsAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export default function TeamPerformance() {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [members, setMembers] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('revenue_won');
  const [sortDir, setSortDir] = useState('desc');
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    brandAPI.getUserBrands().then(res => {
      const b = res.data.data?.brands || [];
      setBrands(b);
      if (b.length > 0) setSelectedBrand(b[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedBrand) fetchData();
  }, [selectedBrand, periodStart, periodEnd]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await revenueAnalyticsAPI.teamPerformance(selectedBrand.id, {
        period_start: periodStart,
        period_end: periodEnd,
      });
      const data = res.data.data || {};
      setMembers(data.members || []);
      setTotals(data.totals || {});
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...members].sort((a, b) => {
    const av = a[sortKey] || 0;
    const bv = b[sortKey] || 0;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const chartData = sorted.slice(0, 10).map(m => ({
    name: (m.name || m.email || '').split(' ')[0],
    value: m[sortKey] || 0,
  }));

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-600 ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Performance</h1>
            <p className="text-gray-600 mt-1">Track team member productivity and revenue attribution</p>
          </div>
          <div className="flex items-center gap-3">
            {brands.length > 1 && (
              <select
                value={selectedBrand?.id || ''}
                onChange={e => setSelectedBrand(brands.find(b => b.id === e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              >
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <input
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Revenue Won</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.revenue_won)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Hours</p>
            <p className="text-2xl font-bold text-blue-600">{(totals.hours_tracked || 0).toFixed(1)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Tasks Completed</p>
            <p className="text-2xl font-bold text-purple-600">{totals.tasks_completed || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Activities Logged</p>
            <p className="text-2xl font-bold text-indigo-600">{totals.activities_logged || 0}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600">Loading team data...</div>
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No team members found</h3>
            <p className="text-gray-500">Add team members to your brand to see performance data.</p>
          </div>
        ) : (
          <>
            {/* Bar chart */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Top Performers — {sortKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => sortKey === 'revenue_won' ? formatCurrency(v) : v} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-gray-600 font-medium">Team Member</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium cursor-pointer select-none" onClick={() => handleSort('revenue_won')}>
                        Revenue Won <SortIcon col="revenue_won" />
                      </th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium cursor-pointer select-none" onClick={() => handleSort('hours_tracked')}>
                        Hours <SortIcon col="hours_tracked" />
                      </th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium cursor-pointer select-none" onClick={() => handleSort('tasks_completed')}>
                        Tasks Done <SortIcon col="tasks_completed" />
                      </th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium cursor-pointer select-none" onClick={() => handleSort('tasks_overdue')}>
                        Overdue <SortIcon col="tasks_overdue" />
                      </th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium cursor-pointer select-none" onClick={() => handleSort('activities_logged')}>
                        Activities <SortIcon col="activities_logged" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map((m, i) => (
                      <tr key={m.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                              {(m.name || m.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{m.name || 'Unnamed'}</p>
                              <p className="text-xs text-gray-400">{m.role || 'member'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-right px-4 py-3 font-medium text-green-700">{formatCurrency(m.revenue_won)}</td>
                        <td className="text-right px-4 py-3 text-gray-700">{(m.hours_tracked || 0).toFixed(1)}</td>
                        <td className="text-right px-4 py-3 text-gray-700">{m.tasks_completed || 0}</td>
                        <td className={`text-right px-4 py-3 font-medium ${(m.tasks_overdue || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>{m.tasks_overdue || 0}</td>
                        <td className="text-right px-4 py-3 text-gray-700">{m.activities_logged || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
