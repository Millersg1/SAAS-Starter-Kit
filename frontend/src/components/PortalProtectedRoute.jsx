import { Navigate } from 'react-router-dom';
import { usePortalAuth } from '../context/PortalAuthContext';

const PortalProtectedRoute = ({ children }) => {
  const { isPortalAuthenticated, loading } = usePortalAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isPortalAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  return children;
};

export default PortalProtectedRoute;
