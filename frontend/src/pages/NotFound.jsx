import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <SEO title="Page Not Found" description="The page you're looking for doesn't exist." noindex />
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-blue-600 mb-4">404</p>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Go Home
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
