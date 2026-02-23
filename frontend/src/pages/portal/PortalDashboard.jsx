import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../../context/PortalAuthContext';
import { portalAPI } from '../../services/portalApi';
import PortalLayout from '../../components/PortalLayout';

const PortalDashboard = () => {
  const { portalClient, portalBrand } = usePortalAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeProjects: 0,
    pendingInvoices: 0,
    documents: 0,
    threads: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [projectsRes, invoicesRes, docsRes, messagesRes] = await Promise.allSettled([
          portalAPI.getProjects(),
          portalAPI.getInvoices(),
          portalAPI.getDocuments(),
          portalAPI.getMessages(),
        ]);

        const projects =
          projectsRes.status === 'fulfilled'
            ? projectsRes.value.data.data.projects
            : [];
        const invoices =
          invoicesRes.status === 'fulfilled'
            ? invoicesRes.value.data.data.invoices
            : [];
        const docs =
          docsRes.status === 'fulfilled'
            ? docsRes.value.data.data.documents
            : [];
        const threads =
          messagesRes.status === 'fulfilled'
            ? messagesRes.value.data.data.threads
            : [];

        setStats({
          activeProjects: projects.filter((p) => p.status === 'in_progress').length,
          pendingInvoices: invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).length,
          documents: docs.length,
          threads: threads.length,
        });
      } catch (err) {
        console.error('Failed to load portal stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const primaryColor = portalBrand?.primary_color || '#2563eb';

  const cards = [
    {
      label: 'Active Projects',
      value: stats.activeProjects,
      icon: '📁',
      path: '/portal/projects',
    },
    {
      label: 'Pending Invoices',
      value: stats.pendingInvoices,
      icon: '💰',
      path: '/portal/invoices',
    },
    {
      label: 'Documents',
      value: stats.documents,
      icon: '📄',
      path: '/portal/documents',
    },
    {
      label: 'Messages',
      value: stats.threads,
      icon: '💬',
      path: '/portal/messages',
    },
  ];

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Welcome banner */}
        <div
          className="rounded-xl p-6 text-white shadow"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
        >
          <h1 className="text-2xl font-bold mb-1">
            Welcome back, {portalClient?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="opacity-90 text-sm">
            Here's a summary of your account with {portalBrand?.name}.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-xl shadow p-5 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : card.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'View Projects', path: '/portal/projects', icon: '📁' },
              { label: 'Pay Invoice', path: '/portal/invoices', icon: '💰' },
              { label: 'Download Files', path: '/portal/documents', icon: '📄' },
              { label: 'Send Message', path: '/portal/messages', icon: '💬' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="text-xs font-medium text-gray-600">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
};

export default PortalDashboard;
