import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import api from '../services/api';
import { brandAPI, clientAPI } from '../services/api';

const empty = { name: '', description: '', default_budget: '', task_templates: [] };
const emptyTask = { title: '', description: '', priority: 'medium', due_days: '' };

const ProjectTemplates = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [createModal, setCreateModal] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchBrands(); }, []);
  useEffect(() => { if (selectedBrand) { fetchTemplates(); fetchClients(); } }, [selectedBrand]);

  const fetchBrands = async () => {
    try {
      const res = await brandAPI.getUserBrands();
      const list = res.data.data?.brands || [];
      setBrands(list);
      if (list.length > 0) setSelectedBrand(list[0]);
    } catch { toast.error('Failed to load brands'); }
    finally { setLoading(false); }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get(`/project-templates/${selectedBrand.id}`);
      setTemplates(res.data.data?.templates || res.data.templates || res.data.data || []);
    } catch { toast.error('Failed to load templates'); }
  };

  const fetchClients = async () => {
    try {
      const res = await clientAPI.getBrandClients(selectedBrand.id);
      setClients(res.data.data?.clients || []);
    } catch { /* non-critical */ }
  };

  const openNew = () => { setEditing(null); setForm({ ...empty, task_templates: [] }); setShowForm(true); };
  const openEdit = (t) => {
    setEditing(t.id);
    setForm({ name: t.name, description: t.description || '', default_budget: t.default_budget || '', task_templates: t.task_templates || [] });
    setShowForm(true);
  };

  const addTask = () => setForm(f => ({ ...f, task_templates: [...f.task_templates, { ...emptyTask }] }));
  const removeTask = (i) => setForm(f => ({ ...f, task_templates: f.task_templates.filter((_, idx) => idx !== i) }));
  const updateTask = (i, key, val) => setForm(f => {
    const tasks = [...f.task_templates];
    tasks[i] = { ...tasks[i], [key]: val };
    return { ...f, task_templates: tasks };
  });

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const payload = { ...form, default_budget: form.default_budget ? Number(form.default_budget) : null };
      if (editing) {
        await api.put(`/project-templates/${selectedBrand.id}/${editing}`, payload);
        toast.success('Template updated');
      } else {
        await api.post(`/project-templates/${selectedBrand.id}`, payload);
        toast.success('Template created');
      }
      setShowForm(false);
      fetchTemplates();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await api.delete(`/project-templates/${selectedBrand.id}/${id}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch { toast.error('Delete failed'); }
  };

  const handleCreateProject = async () => {
    if (!selectedClient) return toast.error('Select a client');
    setCreating(true);
    try {
      await api.post(`/project-templates/${selectedBrand.id}/${createModal.id}/create-project`, { client_id: selectedClient });
      toast.success('Project created from template');
      setCreateModal(null);
      setSelectedClient('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create project'); }
    finally { setCreating(false); }
  };

  if (loading) return <Layout><div className="p-6 text-gray-400">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Project Templates</h1>
          <div className="flex items-center gap-3">
            {brands.length > 1 && (
              <select value={selectedBrand?.id || ''} onChange={e => setSelectedBrand(brands.find(b => b.id === e.target.value))}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm">
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              + New Template
            </button>
          </div>
        </div>

        {/* Template Grid */}
        {templates.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No templates yet. Create one to get started.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(t => (
              <div key={t.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-1">{t.name}</h3>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{t.description || 'No description'}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span>{(t.task_templates || []).length} tasks</span>
                  {t.default_budget && <span>Budget: ${Number(t.default_budget).toLocaleString()}</span>}
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <button onClick={() => { setCreateModal(t); setSelectedClient(''); }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-1.5 rounded-lg transition">
                    Create Project
                  </button>
                  <button onClick={() => openEdit(t)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-gray-600 rounded-lg transition">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold text-white mb-4">{editing ? 'Edit Template' : 'New Template'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. Website Redesign" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="What this template is for..." />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Default Budget ($)</label>
                  <input type="number" value={form.default_budget} onChange={e => setForm(f => ({ ...f, default_budget: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="0.00" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-400">Task Templates</label>
                    <button onClick={addTask} className="text-xs text-blue-400 hover:text-blue-300">+ Add Task</button>
                  </div>
                  {form.task_templates.map((task, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-3 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">Task {i + 1}</span>
                        <button onClick={() => removeTask(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={task.title} onChange={e => updateTask(i, 'title', e.target.value)} placeholder="Title"
                          className="col-span-2 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-sm" />
                        <input value={task.description} onChange={e => updateTask(i, 'description', e.target.value)} placeholder="Description"
                          className="col-span-2 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-sm" />
                        <select value={task.priority} onChange={e => updateTask(i, 'priority', e.target.value)}
                          className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-sm">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                        <input type="number" value={task.due_days} onChange={e => updateTask(i, 'due_days', e.target.value)}
                          placeholder="Due in X days" className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Project Modal */}
        {createModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-white mb-1">Create Project</h2>
              <p className="text-sm text-gray-400 mb-4">From template: <span className="text-white">{createModal.name}</span></p>
              <label className="block text-sm text-gray-400 mb-1">Select Client *</label>
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mb-4">
                <option value="">-- Choose a client --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.company_name || c.email}</option>)}
              </select>
              <div className="flex justify-end gap-3">
                <button onClick={() => setCreateModal(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition">Cancel</button>
                <button onClick={handleCreateProject} disabled={creating}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectTemplates;
