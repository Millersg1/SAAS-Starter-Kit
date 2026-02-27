import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { clientAPI, brandAPI, uploadAPI, activityAPI, taskAPI, enrichmentAPI, customFieldAPI } from '../services/api';

const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [portalPassword, setPortalPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [activities, setActivities] = useState([]);
  const [activityForm, setActivityForm] = useState({ activity_type: 'note', title: '', body: '' });
  const [savingActivity, setSavingActivity] = useState(false);
  const [clientTasks, setClientTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    status: 'active',
    client_type: 'regular',
    industry: '',
    website: '',
    tax_id: '',
    notes: '',
    tags: [],
    custom_fields: {},
    lead_source: '',
    lead_source_detail: '',
    linkedin_url: '',
    twitter_url: '',
    facebook_url: '',
    instagram_url: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [fieldDefs, setFieldDefs] = useState([]);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (brands.length > 0) {
      fetchClient();
    }
  }, [brands, id]);

  const fetchBrands = async () => {
    try {
      const response = await brandAPI.getUserBrands();
      setBrands(response.data.data?.brands || []);
    } catch (err) {
      setError('Failed to load brands');
    }
  };

  const fetchClient = async () => {
    try {
      setLoading(true);
      // Try each brand until we find the client
      for (const brand of brands) {
        try {
          const response = await clientAPI.getClient(brand.id, id);
          const clientData = response.data.data.client;
          setClient(clientData);
          // Load typed field definitions for this brand
          customFieldAPI.list(brand.id).then(r => setFieldDefs(r.data.data?.fields || [])).catch(() => {});
          setFormData({
            name: clientData.name || '',
            email: clientData.email || '',
            phone: clientData.phone || '',
            company: clientData.company || '',
            address: clientData.address || '',
            city: clientData.city || '',
            state: clientData.state || '',
            country: clientData.country || '',
            postal_code: clientData.postal_code || '',
            status: clientData.status || 'active',
            client_type: clientData.client_type || 'standard',
            industry: clientData.industry || '',
            website: clientData.website || '',
            tax_id: clientData.tax_id || '',
            notes: clientData.notes || '',
            tags: clientData.tags || [],
            custom_fields: clientData.custom_fields || {},
            lead_source: clientData.lead_source || '',
            lead_source_detail: clientData.lead_source_detail || '',
            linkedin_url: clientData.linkedin_url || '',
            twitter_url: clientData.twitter_url || '',
            facebook_url: clientData.facebook_url || '',
            instagram_url: clientData.instagram_url || '',
          });
          setError('');
          break;
        } catch (err) {
          // Continue to next brand
          continue;
        }
      }
    } catch (err) {
      setError('Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError('');
    try {
      const res = await uploadAPI.uploadImage(file);
      const url = res.data.data.url;
      await clientAPI.updateClient(client.brand_id, id, { photo_url: url });
      setClient((prev) => ({ ...prev, photo_url: url }));
      setSuccessMessage('Photo updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddCustomField = (e) => {
    e.preventDefault();
    if (customFieldKey.trim() && customFieldValue.trim()) {
      setFormData(prev => ({
        ...prev,
        custom_fields: {
          ...prev.custom_fields,
          [customFieldKey.trim()]: customFieldValue.trim()
        }
      }));
      setCustomFieldKey('');
      setCustomFieldValue('');
    }
  };

  const handleRemoveCustomField = (keyToRemove) => {
    setFormData(prev => {
      const newCustomFields = { ...prev.custom_fields };
      delete newCustomFields[keyToRemove];
      return {
        ...prev,
        custom_fields: newCustomFields
      };
    });
  };

  useEffect(() => {
    if (!client) return;
    if (activeTab === 'activity') fetchActivities();
    if (activeTab === 'tasks') fetchClientTasks();
  }, [activeTab, client]);

  const fetchActivities = async () => {
    try {
      const res = await activityAPI.getClientActivities(id);
      setActivities(res.data.data?.activities || []);
    } catch { /* non-critical */ }
  };

  const fetchClientTasks = async () => {
    if (!client) return;
    try {
      const res = await taskAPI.getBrandTasks(client.brand_id, {});
      setClientTasks((res.data.data?.tasks || []).filter(t => t.client_id === id));
    } catch { /* non-critical */ }
  };

  const handleLogActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.title.trim()) return;
    setSavingActivity(true);
    try {
      await activityAPI.createActivity(id, activityForm);
      setActivityForm({ activity_type: 'note', title: '', body: '' });
      await fetchActivities();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log activity');
    } finally { setSavingActivity(false); }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      await taskAPI.createTask(client.brand_id, {
        title: newTaskTitle, client_id: id,
        due_date: newTaskDueDate || undefined, priority: 'normal',
      });
      setNewTaskTitle('');
      setNewTaskDueDate('');
      await fetchClientTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task');
    } finally { setSavingTask(false); }
  };

  const handleCompleteTask = async (task) => {
    try {
      await taskAPI.completeTask(client.brand_id, task.id);
      await fetchClientTasks();
    } catch { /* non-critical */ }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      // Remove empty fields
      const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          if (key === 'tags' && Array.isArray(value) && value.length === 0) {
            return acc;
          }
          if (key === 'custom_fields' && Object.keys(value).length === 0) {
            return acc;
          }
          acc[key] = value;
        }
        return acc;
      }, {});

      await clientAPI.updateClient(client.brand_id, id, cleanedData);
      setSuccessMessage('Client updated successfully');
      setIsEditing(false);
      fetchClient();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  const handleEnablePortal = async () => {
    if (!portalPassword || portalPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await clientAPI.enablePortalAccess(client.brand_id, id, portalPassword);
      setSuccessMessage('Portal access enabled successfully');
      setShowPortalModal(false);
      setPortalPassword('');
      fetchClient();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enable portal access');
    } finally {
      setSaving(false);
    }
  };

  const handleDisablePortal = async () => {
    try {
      setSaving(true);
      setError('');
      await clientAPI.disablePortalAccess(client.brand_id, id);
      setSuccessMessage('Portal access disabled successfully');
      fetchClient();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disable portal access');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      setError('');
      await clientAPI.deleteClient(client.brand_id, id);
      navigate('/clients');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete client');
      setShowDeleteModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setError('');
    try {
      const res = await enrichmentAPI.enrich(client.brand_id, id);
      const updated = res.data.data.client;
      setClient((prev) => ({ ...prev, ...updated }));
      setFormData((prev) => ({
        ...prev,
        linkedin_url: updated.linkedin_url || prev.linkedin_url,
        twitter_url: updated.twitter_url || prev.twitter_url,
        facebook_url: updated.facebook_url || prev.facebook_url,
        instagram_url: updated.instagram_url || prev.instagram_url,
      }));
      setSuccessMessage('Contact enriched successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Enrichment failed');
    } finally {
      setEnriching(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClientTypeColor = (type) => {
    switch (type) {
      case 'vip': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-blue-100 text-blue-800';
      case 'standard': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading client details...</div>
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Client not found</p>
            <button
              onClick={() => navigate('/clients')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Clients
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/clients')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            ← Back to Clients
          </button>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-5">
              {/* Client photo */}
              <div className="relative group flex-shrink-0">
                {client.photo_url ? (
                  <img
                    src={client.photo_url}
                    alt={client.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold border-2 border-gray-200">
                    {client.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-40 cursor-pointer transition-all">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 text-center leading-tight">
                    {uploadingPhoto ? 'Uploading…' : 'Change\nPhoto'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
                  {client.company_logo_url && (
                    <img src={client.company_logo_url} alt="logo" className="w-8 h-8 rounded object-contain border border-gray-200" />
                  )}
                </div>
                <p className="text-gray-600 mt-1">{client.company}</p>
                {client.enriched_at && (
                  <p className="text-xs text-gray-400 mt-1">Enriched {new Date(client.enriched_at).toLocaleDateString()}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(client.status)}`}>
                {client.status}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getClientTypeColor(client.client_type)}`}>
                {client.client_type}
              </span>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Edit Client
              </button>
              {client.portal_access ? (
                <button
                  onClick={handleDisablePortal}
                  disabled={saving}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
                >
                  Disable Portal Access
                </button>
              ) : (
                <button
                  onClick={() => setShowPortalModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Enable Portal Access
                </button>
              )}
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
              >
                {enriching ? 'Enriching…' : '🔍 Enrich'}
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Delete Client
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  fetchClient();
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          {[
            { key: 'details',  label: 'Details' },
            { key: 'activity', label: 'Activity' },
            { key: 'tasks',    label: 'Tasks' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === t.key ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:bg-white/60'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Client Details Form */}
        {activeTab === 'details' && <form onSubmit={handleUpdate} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Type
                </label>
                <select
                  name="client_type"
                  value={formData.client_type}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                >
                  <option value="regular">Regular</option>
                  <option value="vip">VIP</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="trial">Trial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID
                </label>
                <input
                  type="text"
                  name="tax_id"
                  value={formData.tax_id}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lead Source</label>
                <select name="lead_source" value={formData.lead_source} onChange={handleChange} disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100">
                  <option value="">Unknown</option>
                  <option value="referral">Referral</option>
                  <option value="website">Website</option>
                  <option value="social_media">Social Media</option>
                  <option value="google_ads">Google Ads</option>
                  <option value="cold_outreach">Cold Outreach</option>
                  <option value="event">Event / Conference</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lead Source Detail</label>
                <input type="text" name="lead_source_detail" value={formData.lead_source_detail}
                  onChange={handleChange} disabled={!isEditing}
                  placeholder="e.g. John Smith referred, Facebook ad campaign"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
            {isEditing && (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag(e)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            )}
            {formData.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No tags</p>
            )}
          </div>

          {/* Custom Fields */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom Fields</h2>
            {fieldDefs.length > 0 ? (
              /* Typed inputs based on field definitions */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fieldDefs.map((f) => {
                  const val = formData.custom_fields[f.field_key] ?? '';
                  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100';
                  const onChange = (v) => setFormData(prev => ({
                    ...prev,
                    custom_fields: { ...prev.custom_fields, [f.field_key]: v }
                  }));
                  return (
                    <div key={f.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {f.field_label}{f.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {f.field_type === 'dropdown' ? (
                        <select value={val} disabled={!isEditing} onChange={e => onChange(e.target.value)} className={inputCls}>
                          <option value="">Select…</option>
                          {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.field_type === 'checkbox' ? (
                        <input type="checkbox" checked={!!val} disabled={!isEditing}
                          onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-blue-600" />
                      ) : (
                        <input
                          type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : f.field_type === 'email' ? 'email' : f.field_type === 'phone' ? 'tel' : f.field_type === 'url' ? 'url' : 'text'}
                          value={val} disabled={!isEditing} onChange={e => onChange(e.target.value)}
                          className={inputCls} />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Fallback: free-form key-value pairs */
              <>
                {isEditing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    <input type="text" value={customFieldKey} onChange={(e) => setCustomFieldKey(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Field name" />
                    <div className="flex gap-2">
                      <input type="text" value={customFieldValue} onChange={(e) => setCustomFieldValue(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Field value" />
                      <button type="button" onClick={handleAddCustomField}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
                    </div>
                  </div>
                )}
                {Object.keys(formData.custom_fields).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(formData.custom_fields).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div><span className="font-medium text-gray-700">{key}:</span>{' '}<span className="text-gray-900">{String(value)}</span></div>
                        {isEditing && (
                          <button type="button" onClick={() => handleRemoveCustomField(key)} className="text-red-600 hover:text-red-800">Remove</button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No custom fields. Define fields in Brand Settings → Custom Fields.</p>
                )}
              </>
            )}
          </div>

          {/* Social Profiles */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Social Profiles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'linkedin_url',  label: '🔗 LinkedIn',  placeholder: 'https://linkedin.com/in/...' },
                { name: 'twitter_url',   label: '🐦 Twitter/X', placeholder: 'https://twitter.com/...' },
                { name: 'facebook_url',  label: '📘 Facebook',  placeholder: 'https://facebook.com/...' },
                { name: 'instagram_url', label: '📸 Instagram', placeholder: 'https://instagram.com/...' },
              ].map(({ name, label, placeholder }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                  {isEditing ? (
                    <input type="url" name={name} value={formData[name]} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder={placeholder} />
                  ) : formData[name] ? (
                    <a href={formData[name]} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm truncate block">{formData[name]}</a>
                  ) : (
                    <span className="text-gray-400 text-sm">Not set</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              disabled={!isEditing}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
              placeholder="No notes"
            />
          </div>

          {/* Portal Access Status */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Portal Access</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Status:</span>{' '}
                <span className={client.portal_access ? 'text-green-600' : 'text-gray-600'}>
                  {client.portal_access ? 'Enabled' : 'Disabled'}
                </span>
              </p>
              {client.last_portal_login && (
                <p className="text-sm text-gray-700 mt-2">
                  <span className="font-medium">Last Login:</span>{' '}
                  {new Date(client.last_portal_login).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(client.created_at).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Updated:</span>{' '}
                {new Date(client.updated_at).toLocaleString()}
              </div>
              {client.created_by_name && (
                <div>
                  <span className="font-medium">Created By:</span>{' '}
                  {client.created_by_name}
                </div>
              )}
              {client.assigned_to_name && (
                <div>
                  <span className="font-medium">Assigned To:</span>{' '}
                  {client.assigned_to_name}
                </div>
              )}
            </div>
          </div>
        </form>}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {/* Log form */}
            <div className="bg-white rounded-lg shadow-md p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Log Activity</h3>
              <form onSubmit={handleLogActivity} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select value={activityForm.activity_type}
                    onChange={e => setActivityForm(p => ({...p, activity_type: e.target.value}))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="note">Note</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                  </select>
                  <input type="text" placeholder="Title *" value={activityForm.title}
                    onChange={e => setActivityForm(p => ({...p, title: e.target.value}))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <textarea rows={2} placeholder="Notes (optional)" value={activityForm.body}
                  onChange={e => setActivityForm(p => ({...p, body: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" disabled={savingActivity}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {savingActivity ? 'Logging...' : 'Log Activity'}
                </button>
              </form>
            </div>
            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-md divide-y divide-gray-100">
              {activities.length === 0 ? (
                <p className="px-6 py-10 text-center text-gray-400 text-sm">No activities yet.</p>
              ) : activities.map(a => {
                const diff = Math.floor((Date.now() - new Date(a.created_at)) / 1000);
                const ago = diff < 60 ? 'Just now' : diff < 3600 ? `${Math.floor(diff/60)}m ago` :
                  diff < 86400 ? `${Math.floor(diff/3600)}h ago` : `${Math.floor(diff/86400)}d ago`;
                const icons = { note:'📝', call:'📞', email:'✉️', meeting:'🤝', proposal:'📋', invoice:'💰', task_completed:'✅', system:'⚙️' };
                return (
                  <div key={a.id} className="px-6 py-4 flex gap-3">
                    <span className="text-lg flex-shrink-0">{icons[a.activity_type] || '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{a.title}</p>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{ago}</span>
                      </div>
                      {a.body && <p className="text-xs text-gray-500 mt-0.5">{a.body}</p>}
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">{a.activity_type}{a.user_name ? ` · ${a.user_name}` : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Quick add */}
            <div className="bg-white rounded-lg shadow-md p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Task</h3>
              <form onSubmit={handleAddTask} className="flex gap-2">
                <input type="text" placeholder="Task title *" value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                <input type="date" value={newTaskDueDate}
                  onChange={e => setNewTaskDueDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" disabled={savingTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {savingTask ? '...' : 'Add'}
                </button>
              </form>
            </div>
            {/* Task list */}
            <div className="bg-white rounded-lg shadow-md divide-y divide-gray-100">
              {clientTasks.length === 0 ? (
                <p className="px-6 py-10 text-center text-gray-400 text-sm">No tasks for this client.</p>
              ) : clientTasks.map(task => {
                const today = new Date().toISOString().split('T')[0];
                const overdue = task.due_date && task.due_date < today && task.status !== 'completed';
                const priorityColors = { urgent:'bg-red-100 text-red-700', high:'bg-orange-100 text-orange-700', normal:'bg-blue-100 text-blue-700', low:'bg-gray-100 text-gray-600' };
                return (
                  <div key={task.id} className={`flex items-center gap-3 px-5 py-3 ${task.status === 'completed' ? 'opacity-60' : ''}`}>
                    <button onClick={() => task.status !== 'completed' && handleCompleteTask(task)}
                      className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${
                        task.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-500'}`}>
                      {task.status === 'completed' && <span className="text-xs">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.due_date && (
                        <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                          {overdue ? 'Overdue' : new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${priorityColors[task.priority] || priorityColors.normal}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Portal Access Modal */}
        {showPortalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Enable Portal Access</h3>
              <p className="text-gray-600 mb-4">
                Set a password for the client to access their portal.
              </p>
              <input
                type="password"
                value={portalPassword}
                onChange={(e) => setPortalPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 mb-4"
                placeholder="Enter password (min 8 characters)"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleEnablePortal}
                  disabled={saving}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {saving ? 'Enabling...' : 'Enable Portal'}
                </button>
                <button
                  onClick={() => {
                    setShowPortalModal(false);
                    setPortalPassword('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Client</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this client? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                >
                  {saving ? 'Deleting...' : 'Delete Client'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
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

export default ClientDetails;
