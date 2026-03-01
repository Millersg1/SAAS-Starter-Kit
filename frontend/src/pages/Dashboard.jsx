import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import OnboardingWizard from '../components/OnboardingWizard';
import OnboardingChecklist from '../components/OnboardingChecklist';
import { brandAPI, clientAPI, invoiceAPI, projectAPI, clientActivityAPI, auditAPI, pipelineAPI, taskAPI, revenueAnalyticsAPI } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientStats, setClientStats] = useState({ total: 0, active: 0 });
  const [invoiceStats, setInvoiceStats] = useState({ total_paid: 0, overdue_count: 0, sent_count: 0 });
  const [projectStats, setProjectStats] = useState({ in_progress: 0, overdue: 0, total: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(() => localStorage.getItem('onboarding_dismissed') === '1');
  const [portalActivity, setPortalActivity] = useState([]);
  const [pipelineStats, setPipelineStats] = useState(null);
  const [tasksDueToday, setTasksDueToday] = useState([]);
  const [atRiskClients, setAtRiskClients] = useState([]);

  useEffect(() => { fetchBrands(); }, []);

  useEffect(() => {
    if (brands.length > 0) {
      fetchClientStats();
      fetchInvoiceStats();
      fetchProjectStats();
      fetchRecentActivity();
      fetchPortalActivity();
      fetchPipelineStats();
      fetchTasksDueToday();
      fetchAtRiskClients();
    }
  }, [brands]);

  const fetchAtRiskClients = async () => {
    if (brands.length === 0) return;
    try {
      const res = await revenueAnalyticsAPI.healthScores(brands[0].id);
      const scores = res.data.data?.scores || [];
      const atRisk = scores
        .filter(c => c.health_score !== null && c.health_score < 60)
        .sort((a, b) => a.health_score - b.health_score)
        .slice(0, 5);
      setAtRiskClients(atRisk);
    } catch { /* non-critical */ }
  };

  const fetchPipelineStats = async () => {
    if (brands.length === 0) return;
    try {
      const res = await pipelineAPI.getSummary(brands[0].id);
      setPipelineStats(res.data.data);
    } catch { /* non-critical */ }
  };

  const fetchTasksDueToday = async () => {
    if (brands.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      const res = await taskAPI.getBrandTasks(brands[0].id, { due_date: today });
      const tasks = (res.data.data?.tasks || []).filter(t => t.status !== 'completed');
      setTasksDueToday(tasks);
    } catch { /* non-critical */ }
  };

  const fetchPortalActivity = async () => {
    if (brands.length === 0) return;
    try {
      const res = await clientActivityAPI.getPortalActivity(brands[0].id);
      setPortalActivity(res.data.data?.clients || []);
    } catch { /* non-critical */ }
  };

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await brandAPI.getUserBrands();
      const fetchedBrands = response.data.data?.brands || [];
      setBrands(fetchedBrands);
      if (fetchedBrands.length === 0 && !localStorage.getItem('onboarding_complete')) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Failed to load brands:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientStats = async () => {
    try {
      let total = 0, active = 0;
      for (const brand of brands) {
        try {
          const response = await clientAPI.getClientStats(brand.id);
          const raw = response.data.data?.stats || {};
          total += parseInt(raw.total_clients || 0);
          active += parseInt(raw.active_clients || 0);
        } catch (err) { /* skip */ }
      }
      setClientStats({ total, active });
    } catch (err) { console.error('Failed to load client stats:', err); }
  };

  const fetchInvoiceStats = async () => {
    try {
      let totalPaid = 0, overdueCount = 0, sentCount = 0;
      for (const brand of brands) {
        try {
          const response = await invoiceAPI.getInvoiceStats(brand.id);
          const raw = response.data.data?.stats || {};
          totalPaid += parseFloat(raw.total_paid || 0);
          overdueCount += parseInt(raw.overdue_count || 0);
          sentCount += parseInt(raw.sent_count || 0);
        } catch (err) { /* skip */ }
      }
      setInvoiceStats({ total_paid: totalPaid, overdue_count: overdueCount, sent_count: sentCount });
    } catch (err) { console.error('Failed to load invoice stats:', err); }
  };

  const fetchProjectStats = async () => {
    try {
      let inProgress = 0, overdue = 0, total = 0;
      for (const brand of brands) {
        try {
          const response = await projectAPI.getProjectStats(brand.id);
          const raw = response.data.data?.stats || {};
          total += parseInt(raw.total_projects || 0);
          inProgress += parseInt(raw.in_progress || 0);
          overdue += parseInt(raw.overdue || 0);
        } catch (err) { /* skip */ }
      }
      setProjectStats({ in_progress: inProgress, overdue, total });
    } catch (err) { console.error('Failed to load project stats:', err); }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await auditAPI.getLogs(brands[0].id, { limit: 5 });
      const logs = response.data.data?.logs || [];
      setRecentActivity(logs.map((log) => ({
        action: log.description || `${log.action} ${log.entity_type}`,
        time: formatTimeAgo(log.created_at),
        icon: getActivityIcon(log.action, log.entity_type),
        user: log.user_name || 'System',
      })));
    } catch (err) { console.error('Failed to load recent activity:', err); }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getActivityIcon = (action, entityType) => {
    if (entityType === 'client') return '👥';
    if (entityType === 'project') return '📁';
    if (entityType === 'invoice') return '💰';
    if (entityType === 'document') return '📄';
    if (entityType === 'message') return '💬';
    if (action === 'create') return '✅';
    if (action === 'update') return '✏️';
    if (action === 'delete') return '🗑️';
    return '📋';
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

  const healthZone = (score) => {
    if (score === null || score === undefined) return { label: 'Unknown', color: 'text-gray-400', dot: 'bg-gray-300' };
    if (score >= 80) return { label: 'Healthy',       color: 'text-green-600',  dot: 'bg-green-500' };
    if (score >= 60) return { label: 'At Risk',       color: 'text-yellow-600', dot: 'bg-yellow-400' };
    if (score >= 40) return { label: 'Needs Attention', color: 'text-orange-600', dot: 'bg-orange-500' };
    return               { label: 'Critical',        color: 'text-red-600',    dot: 'bg-red-500' };
  };

  const stats = [
    {
      name: 'Total Revenue',
      value: loading ? '...' : formatCurrency(invoiceStats.total_paid),
      icon: '💰',
      color: 'bg-green-500',
      sub: `${invoiceStats.sent_count} invoice${invoiceStats.sent_count !== 1 ? 's' : ''} outstanding`,
    },
    {
      name: 'Active Projects',
      value: loading ? '...' : projectStats.in_progress.toString(),
      icon: '📁',
      color: 'bg-blue-500',
      sub: `${projectStats.total} total projects`,
    },
    {
      name: 'Active Clients',
      value: loading ? '...' : clientStats.active.toString(),
      icon: '👥',
      color: 'bg-purple-500',
      sub: `${clientStats.total} total clients`,
    },
    {
      name: 'Overdue Invoices',
      value: loading ? '...' : invoiceStats.overdue_count.toString(),
      icon: '⚠️',
      color: invoiceStats.overdue_count > 0 ? 'bg-red-500' : 'bg-gray-400',
      sub: invoiceStats.overdue_count > 0 ? 'Action required' : 'All up to date',
    },
    {
      name: 'Pipeline Value',
      value: pipelineStats ? formatCurrency(pipelineStats.totalWeighted || 0) : '...',
      icon: '📈',
      color: 'bg-indigo-500',
      sub: 'Weighted by probability',
      href: '/pipeline',
    },
    {
      name: 'Tasks Due Today',
      value: tasksDueToday.length.toString(),
      icon: '✅',
      color: tasksDueToday.length > 0 ? 'bg-orange-500' : 'bg-gray-400',
      sub: tasksDueToday.length > 0 ? 'Need attention' : 'All clear',
      href: '/tasks',
    },
  ];

  const quickActions = [
    { label: 'New Client', icon: '👥', path: '/clients/new' },
    { label: 'New Project', icon: '📁', path: '/projects/new' },
    { label: 'New Invoice', icon: '💰', path: '/invoices' },
    { label: 'Messages', icon: '💬', path: '/messages' },
  ];

  return (
    <>
    {showOnboarding && (
      <OnboardingWizard onComplete={() => {
        localStorage.setItem('onboarding_complete', '1');
        setShowOnboarding(false);
        fetchBrands();
      }} />
    )}
    <Layout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-1">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-blue-100">Here's what's happening with your business today.</p>
        </div>

        {/* Onboarding Checklist */}
        {!loading && !checklistDismissed && (() => {
          const hasBrand = brands.length > 0;
          const hasClient = clientStats.total > 0;
          const hasProject = projectStats.total > 0;
          const hasSentInvoice = invoiceStats.total_paid > 0 || invoiceStats.sent_count > 0;
          const hasStripe = brands[0]?.stripe_connect_status === 'active';
          const allDone = hasBrand && hasClient && hasProject && hasSentInvoice && hasStripe;
          if (allDone) return null;
          return (
            <OnboardingChecklist
              hasBrand={hasBrand}
              hasClient={hasClient}
              hasProject={hasProject}
              hasSentInvoice={hasSentInvoice}
              hasStripe={hasStripe}
              onDismiss={() => {
                localStorage.setItem('onboarding_dismissed', '1');
                setChecklistDismissed(true);
              }}
            />
          );
        })()}

        {/* Overdue Alert */}
        {!loading && invoiceStats.overdue_count > 0 && (
          <div
            className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => navigate('/invoices')}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-800">
                  {invoiceStats.overdue_count} overdue invoice{invoiceStats.overdue_count !== 1 ? 's' : ''}
                </p>
                <p className="text-red-600 text-sm">Click to review and follow up with clients</p>
              </div>
            </div>
            <span className="text-red-600 font-medium text-sm">View Invoices →</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {stats.map((stat) => (
            <div key={stat.name}
              onClick={() => stat.href && navigate(stat.href)}
              className={`bg-white rounded-lg shadow p-5 hover:shadow-lg transition-shadow ${stat.href ? 'cursor-pointer' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center text-xl`}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-xs font-medium text-gray-600">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* At-Risk Clients */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">⚠ At-Risk Clients</h2>
            <button onClick={() => navigate('/clients')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All →</button>
          </div>
          {atRiskClients.length === 0 ? (
            <div className="px-6 py-5 text-center text-sm text-green-600 font-medium">All clients are healthy ✓</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {atRiskClients.map(c => {
                const zone = healthZone(c.health_score);
                return (
                  <div key={c.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${zone.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.company || c.name}</p>
                    </div>
                    <span className={`text-xs font-semibold ${zone.color} flex-shrink-0`}>{c.health_score} · {zone.label}</span>
                    <button
                      onClick={() => navigate(`/clients/${c.id}`)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
                    >
                      Details →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{action.icon}</span>
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              {loading ? (
                <p className="text-gray-500 text-sm">Loading activity...</p>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm">No activity yet. Start by adding a client or creating a project.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <span className="text-2xl flex-shrink-0">{activity.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.user} · {activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My Brands */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">My Brands</h2>
              <button
                onClick={() => navigate('/brands')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </button>
            </div>
            <div className="p-6">
              {loading ? (
                <p className="text-gray-500 text-sm">Loading brands...</p>
              ) : brands.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No brands yet</p>
                  <button
                    onClick={() => navigate('/brands')}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Create your first brand →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {brands.slice(0, 4).map((brand) => (
                    <div
                      key={brand.id}
                      onClick={() => navigate(`/brands/${brand.id}`)}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ backgroundColor: brand.primary_color || '#2563eb' }}
                      >
                        {brand.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{brand.name}</p>
                        <p className="text-xs text-gray-500">@{brand.slug}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium flex-shrink-0">
                        {brand.role}
                      </span>
                    </div>
                  ))}
                  {brands.length > 4 && (
                    <button
                      onClick={() => navigate('/brands')}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
                    >
                      View {brands.length - 4} more →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tasks Due Today */}
        {tasksDueToday.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Tasks Due Today</h2>
              <button onClick={() => navigate('/tasks?filter=today')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All →</button>
            </div>
            <div className="divide-y divide-gray-100">
              {tasksDueToday.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === 'urgent' ? 'bg-red-500' :
                    task.priority === 'high' ? 'bg-orange-500' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    {task.client_name && <p className="text-xs text-gray-400">{task.client_name}</p>}
                  </div>
                  <span className="text-xs text-orange-600 font-medium flex-shrink-0">Due today</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client Portal Activity */}
        {portalActivity.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Client Portal Activity</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-600 font-medium">Client</th>
                    <th className="text-left px-6 py-3 text-gray-600 font-medium">Last Login</th>
                    <th className="text-right px-6 py-3 text-gray-600 font-medium">Invoices Paid</th>
                    <th className="text-right px-6 py-3 text-gray-600 font-medium">Total Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {portalActivity.map((c) => {
                    const lastLogin = c.last_portal_login ? new Date(c.last_portal_login) : null;
                    const relativeTime = lastLogin
                      ? (() => {
                          const diff = Math.floor((Date.now() - lastLogin) / 1000);
                          if (diff < 60) return 'Just now';
                          if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                          if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                          return `${Math.floor(diff / 86400)}d ago`;
                        })()
                      : null;
                    return (
                      <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/clients/${c.id}`)}>
                        <td className="px-6 py-3">
                          <p className="font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.email}</p>
                        </td>
                        <td className="px-6 py-3">
                          {relativeTime ? (
                            <span className="text-gray-600">{relativeTime}</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Never logged in</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-700">{c.invoices_paid}</td>
                        <td className="px-6 py-3 text-right font-medium text-gray-900">
                          {parseFloat(c.total_paid || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
    </>
  );
};

export default Dashboard;
