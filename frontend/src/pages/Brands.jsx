import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { brandAPI, uploadAPI } from '../services/api';

const Brands = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    logo_url: '',
    website: '',
    primary_color: '#007bff',
    secondary_color: '#6c757d',
  });
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await brandAPI.getUserBrands();
      // Backend returns {data: {brands: [...]}}
      setBrands(response.data.data?.brands || []);
      setError('');
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.message || `Server error ${err.response.status}`);
      } else if (err.request) {
        setError('Cannot reach the server. Is the backend running on port 5000?');
      } else {
        setError(err.message || 'Failed to load brands');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-generate slug from name
    if (name === 'name' && !showEditModal) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name || formData.name.length < 2) {
      errors.name = 'Brand name must be at least 2 characters';
    }
    
    if (!formData.slug || formData.slug.length < 2) {
      errors.slug = 'Slug must be at least 2 characters';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }
    
    if (formData.website && !isValidUrl(formData.website)) {
      errors.website = 'Please enter a valid URL';
    }
    
    if (formData.primary_color && !/^#[0-9A-Fa-f]{6}$/.test(formData.primary_color)) {
      errors.primary_color = 'Please enter a valid hex color (e.g., #007bff)';
    }
    
    if (formData.secondary_color && !/^#[0-9A-Fa-f]{6}$/.test(formData.secondary_color)) {
      errors.secondary_color = 'Please enter a valid hex color (e.g., #6c757d)';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleCreateBrand = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await brandAPI.createBrand(formData);
      setSuccessMessage('Brand created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchBrands();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setFormErrors({ submit: err.response?.data?.message || 'Failed to create brand' });
    }
  };

  const handleUpdateBrand = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const { slug, ...updateData } = formData; // Don't send slug in update
      await brandAPI.updateBrand(selectedBrand.id, updateData);
      setSuccessMessage('Brand updated successfully!');
      setShowEditModal(false);
      resetForm();
      fetchBrands();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setFormErrors({ submit: err.response?.data?.message || 'Failed to update brand' });
    }
  };

  const handleDeleteBrand = async (brandId) => {
    if (!window.confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
      return;
    }
    
    try {
      await brandAPI.deleteBrand(brandId);
      setSuccessMessage('Brand deleted successfully!');
      fetchBrands();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete brand');
    }
  };

  const openEditModal = (brand) => {
    setSelectedBrand(brand);
    setFormData({
      name: brand.name,
      slug: brand.slug,
      description: brand.description || '',
      logo_url: brand.logo_url || '',
      website: brand.website || '',
      primary_color: brand.primary_color || '#007bff',
      secondary_color: brand.secondary_color || '#6c757d',
    });
    setShowEditModal(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await uploadAPI.uploadImage(file);
      setFormData(prev => ({ ...prev, logo_url: res.data.data.url }));
    } catch (err) {
      setFormErrors(prev => ({ ...prev, logo_url: err.response?.data?.message || 'Failed to upload logo' }));
    } finally {
      setUploadingLogo(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      logo_url: '',
      website: '',
      primary_color: '#007bff',
      secondary_color: '#6c757d',
    });
    setFormErrors({});
    setSelectedBrand(null);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading brands...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Brands</h1>
            <p className="text-gray-600 mt-1">Manage your brands and agencies</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create Brand
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Brands Grid */}
        {brands.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No brands yet</h3>
            <p className="text-gray-600 mb-6">Create your first brand to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Brand
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* Brand Header with Colors */}
                <div
                  className="h-24 flex items-center justify-center"
                  style={{ backgroundColor: brand.primary_color || '#007bff' }}
                >
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="h-16 w-16 object-contain bg-white rounded-lg p-2"
                    />
                  ) : (
                    <div className="text-white text-4xl font-bold">
                      {brand.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Brand Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{brand.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(brand.role)}`}>
                      {brand.role}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-2">@{brand.slug}</p>

                  {/* Stripe Connect status badge */}
                  {brand.stripe_connect_status === 'active' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Stripe Connected
                    </span>
                  ) : brand.stripe_connect_status === 'onboarding_started' ||
                     brand.stripe_connect_status === 'pending_verification' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      Stripe Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Stripe Not Connected
                    </span>
                  )}

                  {brand.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {brand.description}
                    </p>
                  )}
                  
                  {brand.website && (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm mb-4 block truncate"
                    >
                      {brand.website}
                    </a>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => navigate(`/brands/${brand.id}`)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                    {(brand.role === 'owner' || brand.role === 'admin') && (
                      <>
                        <button
                          onClick={() => openEditModal(brand)}
                          className="bg-gray-50 text-gray-600 px-3 py-2 rounded hover:bg-gray-100 transition-colors text-sm"
                        >
                          Edit
                        </button>
                        {brand.role === 'owner' && (
                          <button
                            onClick={() => handleDeleteBrand(brand.id)}
                            className="bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100 transition-colors text-sm"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Brand Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Brand</h2>
                
                <form onSubmit={handleCreateBrand}>
                  {/* Brand Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      placeholder="My Agency"
                    />
                    {formErrors.name && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Slug */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug * (URL-friendly identifier)
                    </label>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      placeholder="my-agency"
                    />
                    {formErrors.slug && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.slug}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      placeholder="Brief description of your brand..."
                    />
                  </div>

                  {/* Logo Upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logo
                    </label>
                    <div className="flex items-center gap-3">
                      {formData.logo_url ? (
                        <img src={formData.logo_url} alt="Logo" className="h-14 w-14 object-contain rounded border border-gray-200 bg-gray-50 p-1" />
                      ) : (
                        <div className="h-14 w-14 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">No logo</div>
                      )}
                      <label className="cursor-pointer px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                        {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                      </label>
                      {formData.logo_url && (
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))} className="text-xs text-red-600 hover:text-red-700">Remove</button>
                      )}
                    </div>
                    {formErrors.logo_url && <p className="text-red-600 text-sm mt-1">{formErrors.logo_url}</p>}
                  </div>

                  {/* Website */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      placeholder="https://example.com"
                    />
                    {formErrors.website && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.website}</p>
                    )}
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          name="primary_color"
                          value={formData.primary_color}
                          onChange={handleInputChange}
                          className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          name="primary_color"
                          value={formData.primary_color}
                          onChange={handleInputChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                          placeholder="#007bff"
                        />
                      </div>
                      {formErrors.primary_color && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.primary_color}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Secondary Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          name="secondary_color"
                          value={formData.secondary_color}
                          onChange={handleInputChange}
                          className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          name="secondary_color"
                          value={formData.secondary_color}
                          onChange={handleInputChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                          placeholder="#6c757d"
                        />
                      </div>
                      {formErrors.secondary_color && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.secondary_color}</p>
                      )}
                    </div>
                  </div>

                  {/* Form Error */}
                  {formErrors.submit && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                      {formErrors.submit}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Brand
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Brand Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Brand</h2>
                
                <form onSubmit={handleUpdateBrand}>
                  {/* Brand Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                    {formErrors.name && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Slug (Read-only) */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug (cannot be changed)
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logo
                    </label>
                    <div className="flex items-center gap-3">
                      {formData.logo_url ? (
                        <img src={formData.logo_url} alt="Logo" className="h-14 w-14 object-contain rounded border border-gray-200 bg-gray-50 p-1" />
                      ) : (
                        <div className="h-14 w-14 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">No logo</div>
                      )}
                      <label className="cursor-pointer px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                        {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                      </label>
                      {formData.logo_url && (
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))} className="text-xs text-red-600 hover:text-red-700">Remove</button>
                      )}
                    </div>
                    {formErrors.logo_url && <p className="text-red-600 text-sm mt-1">{formErrors.logo_url}</p>}
                  </div>

                  {/* Website */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                    {formErrors.website && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.website}</p>
                    )}
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          name="primary_color"
                          value={formData.primary_color}
                          onChange={handleInputChange}
                          className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          name="primary_color"
                          value={formData.primary_color}
                          onChange={handleInputChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                        />
                      </div>
                      {formErrors.primary_color && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.primary_color}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Secondary Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          name="secondary_color"
                          value={formData.secondary_color}
                          onChange={handleInputChange}
                          className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          name="secondary_color"
                          value={formData.secondary_color}
                          onChange={handleInputChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                        />
                      </div>
                      {formErrors.secondary_color && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.secondary_color}</p>
                      )}
                    </div>
                  </div>

                  {/* Form Error */}
                  {formErrors.submit && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                      {formErrors.submit}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        resetForm();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Update Brand
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Brands;
