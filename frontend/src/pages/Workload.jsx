import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { taskAPI, brandAPI } from '../services/api';

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high:   'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low:    'bg-gray-100 text-gray-600 border-gray-200',
};

const PRIORITY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 };

function CapacityRing({ total, overdue }) {
  const isOverloaded = total >= 15;
  const isBusy = total >= 8;
  const color = isOverloaded ? '#EF4444' : isBusy ? '#F59E0B' : '#10B981';
  const label = isOverloaded ? 'Overloaded' : isBusy ? 'Busy' : 'Available';
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-500">{label}</span>
      {overdue > 0 && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{overdue} overdue</span>}
    </div>
  );
}

export default function Workload() {
  const [brand, setBrand] = useState(null);
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [filter, setFilter] = useState('all'); // all | overloaded | overdue

  useEffect(() => {
    brandAPI.getBrands().then(res => {
      const b = (res.data.data || [])[0];
      setBrand(b);
      if (b) {
        taskAPI.getWorkload(b.id).then(r => {
          setWorkload(r.data.data || []);
        }).finally(() => setLoading(false));
      }
    });
  }, []);

  const filtered = workload.filter(u => {
    if (filter === 'overloaded') return parseInt(u.total_tasks) >= 8;
    if (filter === 'overdue') return parseInt(u.overdue_count) > 0;
    return true;
  });

  const totalTasks = workload.reduce((s, u) => s + parseInt(u.total_tasks || 0), 0);
  const totalOverdue = workload.reduce((s, u) => s + parseInt(u.overdue_count || 0), 0);
  const totalInProgress = workload.reduce((s, u) => s + parseInt(u.in_progress_count || 0), 0);

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-64 text-gray-400">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Team Workload</h1>
          <p className="text-sm text-gray-500 mt-0.5">See who's working on what and identify capacity issues</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Team Members', value: workload.length, icon: '👥' },
            { label: 'Active Tasks', value: totalTasks, icon: '📋' },
            { label: 'In Progress', value: totalInProgress, icon: '⚡' },
            { label: 'Overdue', value: totalOverdue, icon: '⚠️', alert: totalOverdue > 0 },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.alert ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{s.label}</p>
                <span className="text-lg">{s.icon}</span>
              </div>
              <p className={`text-2xl font-bold mt-1 ${s.alert ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-5">
          {[['all', 'All Members'], ['overloaded', '🔴 Overloaded (8+ tasks)'], ['overdue', '⚠️ Has Overdue']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${filter === v ? 'bg-blue-600 text-white' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Team member cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">👥</div>
            <p className="text-lg font-medium text-gray-500">{workload.length === 0 ? 'No team members found' : 'No members match this filter'}</p>
            {workload.length === 0 && <p className="text-sm mt-1">Add team members from Brand Settings to see workload here.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(member => {
              const activeTasks = Array.isArray(member.active_tasks) ? member.active_tasks.filter(Boolean) : [];
              const isExpanded = expandedUser === member.user_id;
              const totalActive = parseInt(member.pending_count || 0) + parseInt(member.in_progress_count || 0);
              const isOverloaded = totalActive >= 15;
              const isBusy = totalActive >= 8;

              return (
                <div key={member.user_id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden transition ${
                    isOverloaded ? 'border-red-200 dark:border-red-800' :
                    isBusy ? 'border-orange-200 dark:border-orange-800' :
                    'border-gray-100 dark:border-gray-700'
                  }`}>
                  {/* Member row */}
                  <button
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    onClick={() => setExpandedUser(isExpanded ? null : member.user_id)}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      isOverloaded ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {(member.user_name || 'U').charAt(0).toUpperCase()}
                    </div>

                    {/* Name + status */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{member.user_name || 'Unknown'}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <CapacityRing total={totalActive} overdue={parseInt(member.overdue_count || 0)} />
                      </div>
                    </div>

                    {/* Task counts */}
                    <div className="flex items-center gap-4 shrink-0 text-center">
                      <div>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{totalActive}</p>
                        <p className="text-xs text-gray-400">Active</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-600">{member.in_progress_count || 0}</p>
                        <p className="text-xs text-gray-400">In Progress</p>
                      </div>
                      <div>
                        <p className={`text-lg font-bold ${parseInt(member.due_today_count) > 0 ? 'text-orange-600' : 'text-gray-900 dark:text-gray-100'}`}>
                          {member.due_today_count || 0}
                        </p>
                        <p className="text-xs text-gray-400">Due Today</p>
                      </div>
                      <div>
                        <p className={`text-lg font-bold ${parseInt(member.overdue_count) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {member.overdue_count || 0}
                        </p>
                        <p className="text-xs text-gray-400">Overdue</p>
                      </div>
                      <span className="text-gray-400 ml-2">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Expanded task list */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700">
                      {activeTasks.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No active tasks</p>
                      ) : (
                        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                          {activeTasks
                            .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2))
                            .map((task, i) => {
                              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                              return (
                                <div key={task.id || i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                  <span className={`text-xs px-2 py-0.5 rounded border font-medium shrink-0 ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal}`}>
                                    {task.priority || 'normal'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{task.title}</p>
                                    <p className="text-xs text-gray-400">
                                      {task.client_name && <span>{task.client_name}</span>}
                                      {task.project_name && <span> · {task.project_name}</span>}
                                    </p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <span className={`text-xs ${task.status === 'in_progress' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                                      {task.status?.replace('_', ' ')}
                                    </span>
                                    {task.due_date && (
                                      <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                                        {isOverdue ? '⚠️ ' : ''}
                                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
