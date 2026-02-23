import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { documentAPI, brandAPI } from '../services/api';

const getFileIcon = (fileType) => {
  if (!fileType) return '📄';
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('word') || fileType.includes('document')) return '📘';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📗';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📙';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return '🗜️';
  if (fileType.includes('text') || fileType.includes('csv')) return '📃';
  return '📄';
};

const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getCategoryColor = (category) => {
  switch (category) {
    case 'contract': return 'bg-red-100 text-red-800';
    case 'invoice': return 'bg-green-100 text-green-800';
    case 'proposal': return 'bg-blue-100 text-blue-800';
    case 'report': return 'bg-purple-100 text-purple-800';
    case 'design': return 'bg-pink-100 text-pink-800';
    case 'general': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getVisibilityColor = (visibility) => {
  switch (visibility) {
    case 'public': return 'bg-green-100 text-green-800';
    case 'client': return 'bg-blue-100 text-blue-800';
    case 'team': return 'bg-yellow-100 text-yellow-800';
    case 'private': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const Documents = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filters, setFilters] = useState({ category: '', visibility: '', search: '' });

  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    category: 'general',
    visibility: 'private',
    is_client_visible: false,
    tags: [],
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => { fetchBrands(); }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchDocuments();
      fetchStats();
    }
  }, [selectedBrand, filters]);

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

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.visibility) params.visibility = filters.visibility;
      if (filters.search) params.search = filters.search;
      const response = await documentAPI.getBrandDocuments(selectedBrand.id, params);
      setDocuments(response.data.data?.documents || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await documentAPI.getDocumentStats(selectedBrand.id);
      setStats(response.data.data?.stats || {});
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadForm.name) {
        setUploadForm(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !uploadForm.tags.includes(tagInput.trim())) {
      setUploadForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setUploadForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', uploadForm.name || selectedFile.name);
      if (uploadForm.description) formData.append('description', uploadForm.description);
      formData.append('category', uploadForm.category);
      formData.append('visibility', uploadForm.visibility);
      formData.append('is_client_visible', uploadForm.is_client_visible);
      if (uploadForm.tags.length > 0) formData.append('tags', JSON.stringify(uploadForm.tags));

      await documentAPI.uploadDocument(selectedBrand.id, formData);
      setSuccessMessage('Document uploaded successfully');
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadForm({ name: '', description: '', category: 'general', visibility: 'private', is_client_visible: false, tags: [] });
      fetchDocuments();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await documentAPI.downloadDocument(selectedBrand.id, doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.file_name || doc.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download document');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    try {
      await documentAPI.deleteDocument(selectedBrand.id, doc.id);
      setSuccessMessage('Document deleted');
      fetchDocuments();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete document');
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600 mt-1">Upload, organize, and share documents</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            + Upload Document
          </button>
        </div>

        {/* Brand Selector */}
        {brands.length > 1 && (
          <div className="mb-6">
            <select
              value={selectedBrand?.id || ''}
              onChange={(e) => setSelectedBrand(brands.find(b => b.id === e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_documents || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Storage</p>
              <p className="text-2xl font-bold text-blue-600">{formatFileSize(stats.total_storage_bytes)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Downloads</p>
              <p className="text-2xl font-bold text-green-600">{stats.total_downloads || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Client Visible</p>
              <p className="text-2xl font-bold text-purple-600">{stats.client_visible_documents || 0}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search documents..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Categories</option>
              <option value="general">General</option>
              <option value="contract">Contract</option>
              <option value="invoice">Invoice</option>
              <option value="proposal">Proposal</option>
              <option value="report">Report</option>
              <option value="design">Design</option>
              <option value="other">Other</option>
            </select>
            <select
              value={filters.visibility}
              onChange={(e) => setFilters(prev => ({ ...prev, visibility: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Visibility</option>
              <option value="private">Private</option>
              <option value="team">Team</option>
              <option value="client">Client</option>
              <option value="public">Public</option>
            </select>
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

        {/* Documents List */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <p className="text-gray-600">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">No documents found</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Upload Your First Document
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visibility</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downloads</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getFileIcon(doc.file_type)}</span>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{doc.name}</p>
                          <p className="text-xs text-gray-500">{doc.file_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(doc.category)}`}>
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getVisibilityColor(doc.visibility)}`}>
                        {doc.visibility}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatFileSize(doc.file_size)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{doc.download_count || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/documents/${doc.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-screen overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Document</h3>
              <form onSubmit={handleUpload} className="space-y-4">
                {/* File Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File <span className="text-red-500">*</span>
                  </label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {selectedFile ? (
                      <div>
                        <p className="text-2xl mb-1">{getFileIcon(selectedFile.type)}</p>
                        <p className="font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-500">Click to select a file</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Images, ZIP (max 50MB)</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip,.rar,.7z,.json,.xml"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Name</label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Document name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Optional description"
                  />
                </div>

                {/* Category & Visibility */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="general">General</option>
                      <option value="contract">Contract</option>
                      <option value="invoice">Invoice</option>
                      <option value="proposal">Proposal</option>
                      <option value="report">Report</option>
                      <option value="design">Design</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                    <select
                      value={uploadForm.visibility}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, visibility: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="private">Private</option>
                      <option value="team">Team</option>
                      <option value="client">Client</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                </div>

                {/* Client Visible Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_client_visible"
                    checked={uploadForm.is_client_visible}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, is_client_visible: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="is_client_visible" className="text-sm text-gray-700">Visible to clients</label>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag(e)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Add tag"
                    />
                    <button type="button" onClick={handleAddTag} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                      Add
                    </button>
                  </div>
                  {uploadForm.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {uploadForm.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1">
                          {tag}
                          <button type="button" onClick={() => handleRemoveTag(tag)} className="text-blue-600 hover:text-blue-800">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">{error}</div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                  >
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFile(null);
                      setError('');
                      setUploadForm({ name: '', description: '', category: 'general', visibility: 'private', is_client_visible: false, tags: [] });
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Documents;
