import { useNavigate, useLocation } from 'react-router-dom';
import { usePortalAuth } from '../context/PortalAuthContext';

const navItems = [
  { label: 'Dashboard', path: '/portal/dashboard', icon: '🏠' },
  { label: 'Projects', path: '/portal/projects', icon: '📁' },
  { label: 'Documents', path: '/portal/documents', icon: '📄' },
  { label: 'Invoices', path: '/portal/invoices', icon: '💰' },
  { label: 'Messages', path: '/portal/messages', icon: '💬' },
  { label: 'Proposals', path: '/portal/proposals', icon: '📋' },
  { label: 'Contracts', path: '/portal/contracts', icon: '📝' },
  { label: 'Support', path: '/portal/tickets', icon: '🎫' },
  { label: 'AI Phone', path: '/portal/voice-agents', icon: '🎙️' },
];

const PortalLayout = ({ children }) => {
  const { portalClient, portalBrand, portalLogout } = usePortalAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const primaryColor = portalBrand?.primary_color || '#2563eb';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand identity */}
            <div className="flex items-center gap-3">
              {portalBrand?.logo_url ? (
                <img
                  src={portalBrand.logo_url}
                  alt={portalBrand.name}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  {portalBrand?.name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
              )}
              <span className="font-semibold text-gray-900 text-lg">
                {portalBrand?.name || 'Client Portal'}
              </span>
            </div>

            {/* Client info + logout */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                {portalClient?.name}
              </span>
              <button
                onClick={portalLogout}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Horizontal nav tabs */}
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    active
                      ? 'border-current text-current'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  style={active ? { color: primaryColor, borderColor: primaryColor } : {}}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default PortalLayout;
