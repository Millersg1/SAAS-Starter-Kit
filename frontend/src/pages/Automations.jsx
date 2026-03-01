import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { workflowAPI } from '../services/api';

const TRIGGER_LABELS = {
  lead_submitted:        'Lead form submitted',
  client_created:        'New client added',
  booking_made:          'Booking confirmed',
  manual:                'Manual trigger',
  pipeline_stage_changed:'Pipeline stage changed',
  deal_won:              'Deal won',
  deal_lost:             'Deal lost',
  invoice_paid:          'Invoice paid',
  proposal_accepted:     'Proposal accepted',
  tag_added:             'Tag added to client',
};

const ENR_COLORS = {
  active:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  failed:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Automations() {
  const { activeBrandId } = useAuth();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Enrollment modal state
  const [enrWf, setEnrWf] = useState(null);          // workflow object being inspected
  const [enrollments, setEnrollments] = useState([]); // loaded enrollments
  const [enrLoading, setEnrLoading] = useState(false);

  const fetchWorkflows = useCallback(async () => {
    if (!activeBrandId) return;
    setLoading(true);
    try {
      const res = await workflowAPI.list(activeBrandId);
      setWorkflows(res.data.data.workflows || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [activeBrandId]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const handleNew = async () => {
    setCreating(true);
    try {
      const initialDef = {
        nodes: [{ id: 'trigger-1', type: 'trigger', trigger_type: 'client_created', config: {}, x: 400, y: 0 }],
        connections: []
      };
      const res = await workflowAPI.create(activeBrandId, {
        name: 'Untitled Workflow',
        trigger_type: 'client_created',
        workflow_definition: initialDef,
      });
      const wf = res.data.data.workflow;
      navigate(`/workflows/${wf.id}`);
    } catch { /* silent */ } finally { setCreating(false); }
  };

  const handleEdit = (wf) => navigate(`/workflows/${wf.id}`);

  const handleToggle = async (wf) => {
    try {
      await workflowAPI.update(activeBrandId, wf.id, { is_active: !wf.is_active });
      fetchWorkflows();
    } catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this workflow? This cannot be undone.')) return;
    try { await workflowAPI.remove(activeBrandId, id); fetchWorkflows(); }
    catch { /* silent */ }
  };

  const openEnrollments = async (wf) => {
    setEnrWf(wf);
    setEnrollments([]);
    setEnrLoading(true);
    try {
      const r = await workflowAPI.enrollments(activeBrandId, wf.id);
      setEnrollments(r.data.data?.enrollments || []);
    } catch { /* silent */ } finally { setEnrLoading(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Visual workflow builder — 11 triggers, 10+ actions, if/else branching.
          </p>
        </div>
        <button
          onClick={handleNew}
          disabled={creating}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 flex items-center gap-2"
        >
          {creating ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</>
          ) : '+ New Workflow'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">⚡</div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No workflows yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Build a visual automation to follow up with leads, onboard clients, and more.
          </p>
          <button
            onClick={handleNew}
            disabled={creating}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 text-sm"
          >
            Create First Workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map(wf => (
            <div
              key={wf.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{wf.name}</h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {wf.is_visual && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                      Visual
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    wf.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {wf.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>

              {/* Meta */}
              <div className="space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-600 dark:text-gray-300">Trigger:</span>{' '}
                  {TRIGGER_LABELS[wf.trigger_type] || wf.trigger_type}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {wf.node_count != null ? (
                    <><span className="font-medium text-gray-600 dark:text-gray-300">{wf.node_count}</span> nodes</>
                  ) : null}
                  {wf.node_count != null && ' · '}
                  <button
                    onClick={() => openEnrollments(wf)}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {wf.active_enrollments || 0} active
                  </button>
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-auto pt-1 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => handleEdit(wf)}
                  className="flex-1 text-xs text-center py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium"
                >
                  Open Builder
                </button>
                <button
                  onClick={() => openEnrollments(wf)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                  title="View enrollment history"
                >
                  👥
                </button>
                <button
                  onClick={() => handleToggle(wf)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium ${
                    wf.is_active
                      ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-700 dark:text-yellow-300'
                      : 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300'
                  }`}
                >
                  {wf.is_active ? 'Pause' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(wf.id)}
                  className="text-xs px-2 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enrollment History Modal */}
      {enrWf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Enrollment History</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{enrWf.name}</p>
              </div>
              <button
                onClick={() => setEnrWf(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-light"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5">
              {enrLoading ? (
                <div className="text-center py-8 text-gray-500">Loading…</div>
              ) : enrollments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No enrollments yet</p>
                  <p className="text-xs text-gray-400 mt-1">Clients will appear here when the trigger fires or you enroll them manually.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                      <th className="pb-2 font-medium">Client</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Enrolled</th>
                      <th className="pb-2 font-medium">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {enrollments.map(e => (
                      <tr key={e.id}>
                        <td className="py-2.5 pr-4">
                          <p className="font-medium text-gray-900 dark:text-white">{e.client_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{e.client_email || '—'}</p>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENR_COLORS[e.status] || ENR_COLORS.cancelled}`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-gray-500 dark:text-gray-400">{timeAgo(e.enrolled_at)}</td>
                        <td className="py-2.5 text-xs text-gray-500 dark:text-gray-400">{timeAgo(e.completed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
