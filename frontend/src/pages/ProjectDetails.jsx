                                                                                                                                                                                                                                                                                                                                                  import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectAPI, brandAPI } from '../services/api';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [brands, setBrands] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '', description: '', project_type: 'website', status: 'planning',
    priority: 'medium', start_date: '', due_date: '', budget: '',
    currency: 'USD', estimated_hours: '', actual_hours: '', progress_percentage: 0,
    tags: [], notes: '',
  });

  const [newUpdate, setNewUpdate] = useState({
    update_type: 'comment', title: '', content: '', is_visible_to_client: true,
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => { fetchBrands(); }, []);
  useEffect(() => { if (brands.length > 0) fetchProject(); }, [brands, id]);

  const fetchBrands = async () => {
    try {
      const response = await brandAPI.getUserBrands();
      setBrands(response.data.data?.brands || []);
    } catch (err) {
      setError('Failed to load brands');
    }
  };

  const fetchProject = async () => {
    try {
      setLoading(true);
      for (const brand of brands) {
        try {
          const response = await projectAPI.getProject(brand.id, id);
          const p = response.data.data?.project || response.data.data;
          setProject(p);
          setFormData({
            name: p.name || '',
            description: p.description || '',
    project_type: p.project_type || 'general',
            status: p.status || 'planning',
            priority: p.priority || 'medium',
            start_date: p.start_date ? p.start_date.split('T')[0] : '',
            due_date: p.due_date ? p.due_date.split('T')[0] : '',
            budget: p.budget || '',
            currency: p.currency || 'USD',
            estimated_hours: p.estimated_hours || '',
            actual_hours: p.actual_hours || '',
            progress_percentage: p.progress_percentage || 0,
            tags: p.tags || [],
            notes: p.notes || '',
          });
          fetchUpdates(brand.id);
          setError('');
          break;
        } catch (err) { continue; }
      }
    } catch (err) {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpdates = async (brandId) => {
    try {
      const response = await projectAPI.getProjectUpdates(brandId, id);
      setUpdates(response.data.data?.updates || []);
    } catch (err) {
      console.error('Failed to load updates:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
        if (value === '' || value === null || value === undefined) return acc;
        if (key === 'tags' && Array.isArray(value) && value.length === 0) return acc;
        acc[key] = value;
        return acc;
      }, {});
      if (cleanedData.budget) cleanedData.budget = parseFloat(cleanedData.budget);
      if (cleanedData.estimated_hours) cleanedData.estimated_hours = parseInt(cleanedData.estimated_hours);
      if (cleanedData.actual_hours) cleanedData.actual_hours = parseInt(cleanedData.actual_hours);
      cleanedData.progress_percentage = parseInt(cleanedData.progress_percentage) || 0;

      await projectAPI.updateProject(project.brand_id, id, cleanedData);
      setSuccessMessage('Project updated successfully');
      setIsEditing(false);
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      await projectAPI.deleteProject(project.brand_id, id);
      navigate('/projects');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete project');
      setShowDeleteModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await projectAPI.createProjectUpdate(project.brand_id, id, newUpdate);
      setSuccessMessage('Update added successfully');
      setShowUpdateForm(false);
      setNewUpdate({ update_type: 'comment', title: '', content: '', is_visible_to_client: true });
      fetchUpdates(project.brand_id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add update');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    try {
      await projectAPI.deleteProjectUpdate(project.brand_id, id, updateId);
      fetchUpdates(project.brand_id);
    } catch (err) {
      setError('Failed to delete update');
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

  const getUpdateTypeColor = (type) => {
    switch (type) {
      case 'milestone': return 'bg-purple-100 text-purple-800';
      case 'status_change': return 'bg-blue-100 text-blue-800';
      case 'comment': return 'bg-gray-100 text-gray-800';
      case 'file_upload': return 'bg-green-100 text-green-800';
      case 'team_change': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">Loading project...</p>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Project not found</p>
            <button onClick={() => navigate('/projects')} className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Projects
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate('/projects')} className="text-blue-600 hover:text-blue-700 mb-4 flex items-center">
            ← Back to Projects
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              {project.client_name && <p className="text-gray-600 mt-1">Client: {project.client_name}</p>}
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                {project.status?.replace('_', ' ')}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(project.priority)}`}>
                {project.priority}
              </span>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">{successMessage}</div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{error}</div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3">
          {!isEditing ? (
            <>
              <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Edit Project
              </button>
              <button onClick={() => setShowUpdateForm(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                Add Update
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                Delete Project
              </button>
            </>
          ) : (
            <>
              <button onClick={handleUpdate} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => { setIsEditing(false); fetchProject(); }} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                Cancel
              </button>
            </>
          )}
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span className="font-medium">{project.progress_percentage || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${project.progress_percentage || 0}%` }}
            />
          </div>
        </div>

        {/* Project Details Form */}
        <form onSubmit={handleUpdate} className="bg-white rounded-lg shadow-md p-6 space-y-6 mb-6">
          {/* Basic Info */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={!isEditing}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select name="project_type" value={formData.project_type} onChange={handleChange} disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100">
                    <option value="general">General</option>
                    <option value="website">Website</option>
                    <option value="app">App</option>
                    <option value="marketing">Marketing</option>
                    <option value="consulting">Consulting</option>
                    <option value="design">Design</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100">
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleChange} disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100" />
              </div>
            </div>
          </div>

          {/* Budget & Hours */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget & Hours</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget</label>
                <input type="number" name="budget" value={formData.budget} onChange={handleChange} disabled={!isEditing} min="0" step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select name="currency" value={formData.currency} onChange={handleChange} disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Est. Hours</label>
                <input type="number" name="estimated_hours" value={formData.estimated_hours} onChange={handleChange} disabled={!isEditing} min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Actual Hours</label>
                <input type="number" name="actual_hours" value={formData.actual_hours} onChange={handleChange} disabled={!isEditing} min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100" />
              </div>
            </div>
          </div>

          {/* Progress */}
          {isEditing && (
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Progress</h2>
              <div className="flex items-center gap-4">
                <input type="range" name="progress_percentage" value={formData.progress_percentage} onChange={handleChange} min="0" max="100" step="5" className="flex-1" />
                <span className="text-gray-900 font-medium w-12 text-right">{formData.progress_percentage}%</span>
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
            {isEditing && (
              <div className="flex gap-2 mb-2">
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag(e)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" placeholder="Add a tag" />
                <button type="button" onClick={handleAddTag} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
              </div>
            )}
            {formData.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2">
                    {tag}
                    {isEditing && <button type="button" onClick={() => handleRemoveTag(tag)} className="text-blue-600 hover:text-blue-800">×</button>}
                  </span>
                ))}
              </div>
            ) : <p className="text-gray-500 text-sm">No tags</p>}
          </div>

          {/* Metadata */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div><span className="font-medium">Created:</span> {formatDate(project.created_at)}</div>
              <div><span className="font-medium">Updated:</span> {formatDate(project.updated_at)}</div>
              {project.created_by_name && <div><span className="font-medium">Created By:</span> {project.created_by_name}</div>}
              {project.project_manager_name && <div><span className="font-medium">Project Manager:</span> {project.project_manager_name}</div>}
            </div>
          </div>
        </form>

        {/* Project Updates Timeline */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Project Updates</h2>
            <button onClick={() => setShowUpdateForm(true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm">
              + Add Update
            </button>
          </div>

          {updates.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No updates yet. Add the first update!</p>
          ) : (
            <div className="space-y-4">
              {updates.map((update) => (
                <div key={update.id} className="border-l-4 border-blue-300 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getUpdateTypeColor(update.update_type)}`}>
                          {update.update_type?.replace('_', ' ')}
                        </span>
                        {update.is_visible_to_client && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Visible to Client</span>
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900">{update.title}</h4>
                      <p className="text-gray-600 text-sm mt-1">{update.content}</p>
                      <p className="text-gray-400 text-xs mt-2">
                        {update.author_name && `By ${update.author_name} · `}
                        {new Date(update.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteUpdate(update.id)} className="text-red-400 hover:text-red-600 text-sm ml-4">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Update Modal */}
        {showUpdateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Add Project Update</h3>
              <form onSubmit={handleAddUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Update Type</label>
                  <select value={newUpdate.update_type} onChange={(e) => setNewUpdate(prev => ({ ...prev, update_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900">
                    <option value="comment">Comment</option>
                    <option value="status_change">Status Change</option>
                    <option value="milestone">Milestone</option>
                    <option value="file_upload">File Upload</option>
                    <option value="team_change">Team Change</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
                  <input type="text" value={newUpdate.title} onChange={(e) => setNewUpdate(prev => ({ ...prev, title: e.target.value }))}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Update title" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content <span className="text-red-500">*</span></label>
                  <textarea value={newUpdate.content} onChange={(e) => setNewUpdate(prev => ({ ...prev, content: e.target.value }))}
                    required rows="4" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Describe the update..." />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="visible_to_client" checked={newUpdate.is_visible_to_client}
                    onChange={(e) => setNewUpdate(prev => ({ ...prev, is_visible_to_client: e.target.checked }))}
                    className="rounded" />
                  <label htmlFor="visible_to_client" className="text-sm text-gray-700">Visible to client</label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                    {saving ? 'Adding...' : 'Add Update'}
                  </button>
                  <button type="button" onClick={() => setShowUpdateForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Project</h3>
              <p className="text-gray-600 mb-4">Are you sure you want to delete this project? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={handleDelete} disabled={saving} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400">
                  {saving ? 'Deleting...' : 'Delete Project'}
                </button>
                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectDetails;
