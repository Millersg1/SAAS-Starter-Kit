import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Skeleton from '../components/Skeleton';
import { projectAPI, brandAPI, subscriptionAPI } from '../services/api';

const Projects = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '', priority: '', project_type: '', search: '' });
  const [planLimit, setPlanLimit] = useState(null); // { max, planName }

  useEffect(() => { fetchBrands(); }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchProjects();
      fetchStats();
      fetchPlanLimit();
    }
  }, [selectedBrand, filters]);

  const fetchPlanLimit = async () => {
    try {
      const res = await subscriptionAPI.getSubscription(selectedBrand.id);
      const sub = res.data.data?.subscription;
      if (sub && sub.max_projects !== undefined) {
        setPlanLimit({ max: sub.max_projects, planName: sub.plan_name });
      }
    } catch {
      // No subscription — no limit to show
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await brandAPI.getUserBrands();
      const brandsData = response.data.data?.brands || [];
      setBrands(brandsData);
      if (brandsData.length > 0) setSelectedBrand(brandsData[0]);
    } catch (err) {
      setError('Failed to load brands');
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.project_type) params.project_type = filters.project_type;
      if (filters.search) params.search = filters.search;
      const response = await projectAPI.getBrandProjects(selectedBrand.id, params);
      setProjects(response.data.data?.projects || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await projectAPI.getProjectStats(selectedBrand.id);
      const raw = response.data.data?.stats || {};
      setStats({
        total: parseInt(raw.total_projects) || 0,
        planning: parseInt(raw.planning) || 0,
        in_progress: parseInt(raw.in_progress) || 0,
        on_hold: parseInt(raw.on_hold) || 0,
        completed: parseInt(raw.completed) || 0,
        cancelled: parseInt(raw.cancelled) || 0,
        overdue: parseInt(raw.overdue) || 0,
        avg_progress: parseFloat(raw.avg_progress) || 0,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'on_hold': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  const isOverdue = (project) => {
    if (!project.due_date || project.status === 'completed' || project.status === 'cancelled') return false;
    return new Date(project.due_date) < new Date();
  };

  if (!selectedBrand) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-gray-600 mb-4">No brands available</p>
            <button onClick={() => navigate('/brands')} className="text-blue-600 hover:text-blue-700 font-medium">
              Create a brand first →
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your projects and track progress</p>
          </div>
          <button
            onClick={() => navigate('/projects/new')}
            disabled={planLimit?.max !== null && planLimit?.max !== undefined && projects.length >= planLimit.max}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title={planLimit?.max !== null && planLimit?.max !== undefined && projects.length >= planLimit.max ? `Plan limit reached (${planLimit.max} projects)` : undefined}
          >
            + New Project
          </button>
        </div>

        {planLimit?.max !== null && planLimit?.max !== undefined && (() => {
          const pct = Math.round((projects.length / planLimit.max) * 100);
          if (pct < 80) return null;
          const atLimit = projects.length >= planLimit.max;
          return (
            <div className={`mb-4 px-4 py-3 rounded-lg flex items-center justify-between ${atLimit ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
              <span className="text-sm font-medium">
                {atLimit
                  ? `Project limit reached — you're on the ${planLimit.planName} plan (${planLimit.max} projects max).`
                  : `Approaching project limit — ${projects.length} of ${planLimit.max} projects used (${pct}%).`}
              </span>
              <a href="/subscriptions" className={`ml-4 text-sm font-semibold underline whitespace-nowrap ${atLimit ? 'text-red-700' : 'text-amber-700'}`}>
                Upgrade Plan →
              </a>
            </div>
          );
        })()}

        {/* Brand Selector */}
        {brands.length > 1 && (
          <div className="mb-6">
            <select
              value={selectedBrand?.id || ''}
              onChange={(e) => {
                const brand = brands.find(b => b.id === e.target.value);
                setSelectedBrand(brand);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.in_progress}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search projects..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filters.project_type}
              onChange={(e) => setFilters(prev => ({ ...prev, project_type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Types</option>
              <option value="general">General</option>
              <option value="website">Website</option>
              <option value="app">App</option>
              <option value="marketing">Marketing</option>
              <option value="consulting">Consulting</option>
              <option value="design">Design</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{error}</div>
        )}

        {/* Projects List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-3">
                    <Skeleton.Text w="w-48" h="h-5" />
                    <div className="flex gap-2">
                      <Skeleton.Text w="w-20" h="h-6" />
                      <Skeleton.Text w="w-16" h="h-6" />
                      <Skeleton.Text w="w-16" h="h-6" />
                    </div>
                    <div className="flex gap-6">
                      <Skeleton.Text w="w-28" h="h-4" />
                      <Skeleton.Text w="w-24" h="h-4" />
                    </div>
                  </div>
                  <div className="ml-4 space-y-2">
                    <Skeleton.Text w="w-32" h="h-4" />
                    <Skeleton.Text w="w-32" h="h-2" />
                    <Skeleton.Text w="w-24" h="h-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">No projects found</p>
            <button
              onClick={() => navigate('/projects/new')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 ${
                  isOverdue(project) ? 'border-red-500' : 'border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                      {isOverdue(project) && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                        {project.status?.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(project.priority)}`}>
                        {project.priority}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {project.project_type?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      {project.client_name && (
                        <div>
                          <span className="font-medium">Client:</span> {project.client_name}
                        </div>
                      )}
                      {project.due_date && (
                        <div>
                          <span className="font-medium">Due:</span> {formatDate(project.due_date)}
                        </div>
                      )}
                      {project.budget && (
                        <div>
                          <span className="font-medium">Budget:</span> ${parseFloat(project.budget).toLocaleString()}
                        </div>
                      )}
                      {project.project_manager_name && (
                        <div>
                          <span className="font-medium">PM:</span> {project.project_manager_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-3">
                    {/* Progress Bar */}
                    <div className="w-32">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{project.progress_percentage || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${project.progress_percentage || 0}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Projects;
