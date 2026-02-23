import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { brandAPI, notificationAPI, searchAPI } from '../services/api';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [brandId, setBrandId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const searchTimerRef = useRef(null);

  // Fetch first brand on mount
  useEffect(() => {
    brandAPI.getUserBrands()
      .then((res) => {
        const brands = res.data.data?.brands || [];
        if (brands.length > 0) setBrandId(brands[0].id);
      })
      .catch(() => {});
  }, []);

  // Poll unread count every 60s
  useEffect(() => {
    if (!brandId) return;
    const fetchCount = () => {
      notificationAPI.getUnreadCount(brandId)
        .then((res) => setUnreadCount(res.data.data?.count || 0))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [brandId]);

  // Fetch full notifications when bell opens
  useEffect(() => {
    if (!bellOpen || !brandId) return;
    notificationAPI.getNotifications(brandId)
      .then((res) => setNotifications(res.data.data?.notifications || []))
      .catch(() => {});
  }, [bellOpen, brandId]);

  // Close bell on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close search on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchTimerRef.current);
    if (q.trim().length < 2) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      if (!brandId) return;
      setSearchLoading(true);
      try {
        const res = await searchAPI.globalSearch(brandId, q);
        setSearchResults(res.data.data?.results || null);
        setSearchOpen(true);
      } catch {
        setSearchResults(null);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
  };

  const handleSearchSelect = (type, id) => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults(null);
    const routes = { client: `/clients/${id}`, project: `/projects/${id}`, invoice: `/invoices/${id}`, document: `/documents/${id}`, message: `/messages` };
    navigate(routes[type] || '/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Brands', href: '/brands', icon: '🏢' },
    { name: 'Clients', href: '/clients', icon: '👥' },
    { name: 'Projects', href: '/projects', icon: '📁' },
    { name: 'Documents', href: '/documents', icon: '📄' },
    { name: 'Messages', href: '/messages', icon: '💬' },
    { name: 'Invoices', href: '/invoices', icon: '💰' },
    { name: 'Proposals', href: '/proposals', icon: '📋' },
    { name: 'Contracts', href: '/contracts', icon: '📝' },
    { name: 'Pipeline',  href: '/pipeline',  icon: '📈' },
    { name: 'Analytics', href: '/analytics', icon: '📉' },
    { name: 'Tasks',     href: '/tasks',     icon: '✅' },
    { name: 'Time', href: '/time', icon: '⏱' },
    { name: 'Subscriptions', href: '/subscriptions', icon: '💳' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 bg-blue-600">
          <h1 className="text-xl font-bold text-white">ClientHub</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3 pb-24 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-xl mr-3">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Superadmin link — only visible to superadmins */}
        {user?.is_superadmin && (
          <div className="absolute bottom-20 left-0 right-0 px-4">
            <Link
              to="/superadmin"
              className="flex items-center px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <span className="mr-2">🔑</span>
              Superadmin Panel
            </Link>
          </div>
        )}

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Global Search */}
            <div className="relative flex-1 max-w-md mx-4" ref={searchRef}>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchResults && setSearchOpen(true)}
                  placeholder="Search clients, projects, invoices..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 placeholder-gray-400"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {searchOpen && searchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  {(() => {
                    const sections = [
                      { key: 'clients',   label: 'Clients',   icon: '👥' },
                      { key: 'projects',  label: 'Projects',  icon: '📁' },
                      { key: 'invoices',  label: 'Invoices',  icon: '💰' },
                      { key: 'documents', label: 'Documents', icon: '📄' },
                      { key: 'messages',  label: 'Messages',  icon: '💬' },
                    ];
                    const hasAny = sections.some(s => searchResults[s.key]?.length > 0);
                    if (!hasAny) return (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">No results found</div>
                    );
                    return sections.map(({ key, label, icon }) => {
                      const items = searchResults[key] || [];
                      if (!items.length) return null;
                      return (
                        <div key={key}>
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                            {icon} {label}
                          </div>
                          {items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleSearchSelect(key.slice(0, -1), item.id)}
                              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between group"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                                  {item.name || item.subject || item.invoice_number}
                                </p>
                                {(item.client_name || item.email || item.company) && (
                                  <p className="text-xs text-gray-400">{item.client_name || item.email || item.company}</p>
                                )}
                              </div>
                              {item.status && (
                                <span className="text-xs text-gray-400 capitalize">{item.status}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-lg"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              {/* Notification Bell */}
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => setBellOpen((o) => !o)}
                  className="relative text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown */}
                {bellOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Notifications</p>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-gray-400 text-sm">
                          All caught up! No new notifications.
                        </div>
                      ) : (
                        notifications.map((n, i) => (
                          <button
                            key={i}
                            onClick={() => { setBellOpen(false); navigate(n.link); }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors flex items-start gap-3"
                          >
                            {n.icon && <span className="text-lg mt-0.5 flex-shrink-0">{n.icon}</span>}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="px-4 py-2 border-t border-gray-100">
                        <button
                          onClick={() => { setBellOpen(false); navigate('/messages'); }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View all messages →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 dark:text-gray-100">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Layout;
