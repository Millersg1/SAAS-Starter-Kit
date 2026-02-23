import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { taskAPI, brandAPI, clientAPI, projectAPI } from '../services/api';

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700',
  high:   'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low:    'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = { title: '', description: '', client_id: '', project_id: '', due_date: '', priority: 'normal', assigned_to: '' };

const relativeDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return { label: 'Today', red: false, bold: true };
  if (diff === 1) return { label: 'Tomorrow', red: false };
  if (diff === -1) return { label: 'Yesterday', red: true };
  if (diff < 0) return { label: `${Math.abs(diff)} days overdue`, red: true };
  return { label: `In ${diff} days`, red: false };
};

export default function Tasks() {
  const [brandId, setBrandId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | today | overdue | completed
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    brandAPI.getUserBrands().then(res => {
      const brands = res.data.data?.brands || [];
      if (brands.length > 0) setBrandId(brands[0].id);
    });
  }, []);

  useEffect(() => {
    if (!brandId) return;
    fetchTasks();
    clientAPI.getBrandClients(brandId).then(r => setClients(r.data.data?.clients || []));
    projectAPI.getBrandProjects(brandId).then(r => setProjects(r.data.data?.projects || []));
  }, [brandId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await taskAPI.getBrandTasks(brandId, {});
      setTasks(res.data.data?.tasks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => { setEditingTask(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title || '',
      description: task.description || '',
      client_id: task.client_id || '',
      project_id: task.project_id || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      priority: task.priority || 'normal',
      assigned_to: task.assigned_to || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingTask) {
        await taskAPI.updateTask(brandId, editingTask.id, form);
      } else {
        await taskAPI.createTask(brandId, form);
      }
      setModalOpen(false);
      await fetchTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (task) => {
    await taskAPI.completeTask(brandId, task.id);
    await fetchTasks();
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    await taskAPI.deleteTask(brandId, task.id);
    await fetchTasks();
  };

  const today = new Date().toISOString().split('T')[0];
  const filteredTasks = tasks.filter(t => {
    if (filter === 'today') return t.due_date?.startsWith(today) && t.status !== 'completed';
    if (filter === 'overdue') return t.due_date && t.due_date < today && t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    return t.status !== 'completed';
  });

  const counts = {
    today: tasks.filter(t => t.due_date?.startsWith(today) && t.status !== 'completed').length,
    overdue: tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'completed').length,
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            + New Task
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {[
            { key: 'all', label: 'All Open' },
            { key: 'today', label: `Due Today${counts.today > 0 ? ` (${counts.today})` : ''}` },
            { key: 'overdue', label: `Overdue${counts.overdue > 0 ? ` (${counts.overdue})` : ''}`, red: counts.overdue > 0 },
            { key: 'completed', label: 'Completed' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === f.key ? 'bg-white shadow text-gray-900 font-medium' :
                f.red ? 'text-red-600 hover:bg-white/60' : 'text-gray-500 hover:bg-white/60'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-sm">No tasks here.</p>
            {filter === 'all' && <button onClick={openNew} className="mt-3 text-blue-600 text-sm hover:underline">Create your first task</button>}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {filteredTasks.map(task => {
              const due = task.due_date ? relativeDate(task.due_date) : null;
              return (
                <div key={task.id} className={`flex items-center gap-4 px-5 py-3 hover:bg-gray-50 ${task.status === 'completed' ? 'opacity-60' : ''}`}>
                  {/* Checkbox */}
                  <button onClick={() => task.status !== 'completed' && handleComplete(task)}
                    className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      task.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-500'
                    }`}>
                    {task.status === 'completed' && <span className="text-xs">✓</span>}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {task.client_name && (
                        <Link to={`/clients/${task.client_id}`} className="text-xs text-blue-600 hover:underline">{task.client_name}</Link>
                      )}
                      {task.project_name && (
                        <Link to={`/projects/${task.project_id}`} className="text-xs text-gray-500 hover:underline">{task.project_name}</Link>
                      )}
                      {task.description && <span className="text-xs text-gray-400 truncate max-w-xs">{task.description}</span>}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {due && (
                      <span className={`text-xs ${due.red ? 'text-red-600 font-medium' : due.bold ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                        {due.label}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal}`}>
                      {task.priority}
                    </span>
                    {task.assigned_to_name && (
                      <span className="text-xs text-gray-400">{task.assigned_to_name}</span>
                    )}
                    <div className="flex gap-1">
                      {task.status !== 'completed' && (
                        <button onClick={() => openEdit(task)} className="text-gray-400 hover:text-blue-600 text-xs p-1">✏️</button>
                      )}
                      <button onClick={() => handleDelete(task)} className="text-gray-400 hover:text-red-500 text-xs p-1">🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New/Edit Task Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingTask ? 'Edit Task' : 'New Task'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">None</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                  <select value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">None</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : (editingTask ? 'Save Changes' : 'Create Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
