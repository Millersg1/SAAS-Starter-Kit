import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full text-center">
            <h1 className="text-2xl font-semibold mb-4">Something went wrong</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              An unexpected error occurred. Please refresh the page to try again.
            </p>
            <p className="text-sm text-red-500 dark:text-red-400 mb-6 font-mono bg-red-50 dark:bg-red-900/20 p-3 rounded">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
