import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePortalAuth } from '../../context/PortalAuthContext';

const PortalLogin = () => {
  const [searchParams] = useSearchParams();
  const brandId = searchParams.get('brand');
  const navigate = useNavigate();
  const { portalLogin, isPortalAuthenticated } = usePortalAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isPortalAuthenticated) {
      navigate('/portal/dashboard', { replace: true });
    }
  }, [isPortalAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!brandId) {
      setError('Invalid portal link. Please contact your account manager for the correct URL.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await portalLogin(form.email, form.password, brandId);
    if (result.success) {
      navigate('/portal/dashboard', { replace: true });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏢</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Client Portal</h2>
          <p className="mt-2 text-gray-600">Sign in to access your portal</p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-xl sm:px-10">
          {!brandId && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              No brand specified. Please use the full portal link provided by your account manager.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !brandId}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            Need help? Contact your account manager.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortalLogin;
