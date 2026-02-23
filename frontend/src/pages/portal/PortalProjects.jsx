import { useState, useEffect } from 'react';
import { portalAPI } from '../../services/portalApi';
import PortalLayout from '../../components/PortalLayout';

const STATUS_BADGE = {
  planning: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  on_hold: 'bg-orange-100 text-orange-700',
};

const STATUS_LABEL = {
  planning: 'Planning',
  in_progress: 'In Progress',
  review: 'In Review',
  completed: 'Completed',
  on_hold: 'On Hold',
};

const PortalProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    portalAPI
      .getProjects()
      .then((res) => setProjects(res.data.data.projects || []))
      .catch((err) => console.error('Failed to load projects:', err))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : 'No date');

  return (
    <PortalLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Your Projects</h1>

        {loading ? (
          <div className="text-gray-500 text-sm">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
            No projects yet. Your account manager will create projects for you.
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl shadow overflow-hidden">
              {/* Project header */}
              <div
                className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === project.id ? null : project.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-base font-semibold text-gray-900 truncate">
                        {project.name}
                      </h2>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          STATUS_BADGE[project.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {STATUS_LABEL[project.status] || project.status}
                      </span>
                    </div>
                    {project.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  <span className="text-gray-400 text-lg flex-shrink-0">
                    {expanded === project.id ? '▲' : '▼'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{project.progress_percentage || 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${project.progress_percentage || 0}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2 flex gap-4 text-xs text-gray-400">
                  {project.start_date && <span>Started: {formatDate(project.start_date)}</span>}
                  {project.due_date && <span>Due: {formatDate(project.due_date)}</span>}
                  {project.project_manager_name && (
                    <span>Manager: {project.project_manager_name}</span>
                  )}
                </div>
              </div>

              {/* Updates panel */}
              {expanded === project.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Updates</h3>
                  {!project.recent_updates || project.recent_updates.length === 0 ? (
                    <p className="text-sm text-gray-400">No updates yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {project.recent_updates.map((update) => (
                        <div key={update.id} className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-sm font-medium text-gray-900">{update.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{update.content}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {update.created_by_name} ·{' '}
                            {new Date(update.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </PortalLayout>
  );
};

export default PortalProjects;
