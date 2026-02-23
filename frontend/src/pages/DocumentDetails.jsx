import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { documentAPI, brandAPI } from '../services/api';

const getFileIcon = (fileType) => {
  if (!fileType) return '📄';
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('word') || fileType.includes('document')) return '📘';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📗';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📙';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️';
  if (fileType.includes('text') || fileType.includes('csv')) return '📃';
  return '📄';
};

const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DocumentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const versionFileRef = useRef(null);

  const [document, setDocument] = useState(null);
  const [brands, setBrands] = useState([]);
  const [shares, setShares] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [selectedVersionFile, setSelectedVersionFile] = useState(null);
  const [versionDescription, setVersionDescription] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    visibility: 'private',
    is_client_visible: false,
    tags: [],
  });

  const [shareForm, setShareForm] = useState({
    shared_with_user_id: '',
    shared_with_client_id: '',
    share_type: 'user',
    permission: 'view',
    can_reshare: false,
    expires_at: '',
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => { fetchBrands(); }, []);
  useEffect(() => { if (brands.length > 0) fetchDocument(); }, [brands, id]);

  const fetchBrands = async () => {
    try {
      const response = await brandAPI.getUserBrands();
      setBrands(response.data.data?.brands || []);
    } catch (err) {
      setError('Failed to load brands');
    }
  };

  const fetchDocument = async () => {
    try {
      setLoading(true);
      for (const brand of brands) {
        try {
          const response = await documentAPI.getDocument(brand.id, id);
          const doc = response.data.data?.document || response.data.data;
          setDocument(doc);
          setFormData({
            name: doc.name || '',
            description: doc.description || '',
            category: doc.category || 'general',
            visibility: doc.visibility || 'private',
            is_client_visible: doc.is_client_visible || false,
            tags: doc.tags || [],
          });
          fetchShares(brand.id);
          fetchVersions(brand.id);
          setError('');
          break;
        } catch (err) { continue; }
      }
    } catch (err) {
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const fetchShares = async (brandId) => {
    try {
      const response = await documentAPI.getDocumentShares(brandId, id);
      setShares(response.data.data?.shares || []);
    } catch (err) {
      console.error('Failed to load shares:', err);
    }
  };

  const fetchVersions = async (brandId) => {
    try {
      const response = await documentAPI.getDocumentVersions(brandId, id);
      setVersions(response.data.data?.versions || []);
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      await documentAPI.updateDocument(document.brand_id, id, formData);
      setSuccessMessage('Document updated successfully');
      setIsEditing(false);
      fetchDocument();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update document');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      await documentAPI.deleteDocument(document.brand_id, id);
      navigate('/documents');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete document');
      setShowDeleteModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await documentAPI.downloadDocument(document.brand_id, id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.file_name || document.name);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download document');
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const shareData = {
        permission: shareForm.permission,
        can_reshare: shareForm.can_reshare,
      };
      if (shareForm.share_type === 'user' && shareForm.shared_with_user_id) {
        shareData.shared_with_user_id = shareForm.shared_with_user_id;
      } else if (shareForm.share_type === 'client' && shareForm.shared_with_client_id) {
        shareData.shared_with_client_id = shareForm.shared_with_client_id;
      }
      if (shareForm.expires_at) shareData.expires_at = shareForm.expires_at;

      await documentAPI.shareDocument(document.brand_id, id, shareData);
      setSuccessMessage('Document shared successfully');
      setShowShareModal(false);
      setShareForm({ shared_with_user_id: '', shared_with_client_id: '', share_type: 'user', permission: 'view', can_reshare: false, expires_at: '' });
      fetchShares(document.brand_id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to share document');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShare = async (shareId) => {
    if (!window.confirm('Remove this share?')) return;
    try {
      await documentAPI.deleteDocumentShare(document.brand_id, id, shareId);
      fetchShares(document.brand_id);
    } catch (err) {
      setError('Failed to remove share');
    }
  };

  const handleUploadVersion = async (e) => {
    e.preventDefault();
    if (!selectedVersionFile) {
      setError('Please select a file for the new version');
      return;
    }
    setUploadingVersion(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedVersionFile);
      formData.append('file_name', selectedVersionFile.name);
      formData.append('file_path', selectedVersionFile.name);
      formData.append('file_size', selectedVersionFile.size);
      if (versionDescription) formData.append('change_description', versionDescription);

      await documentAPI.createDocumentVersion(document.brand_id, id, formData);
      setSuccessMessage('New version uploaded successfully');
      setSelectedVersionFile(null);
      setVersionDescription('');
      fetchVersions(document.brand_id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload version');
    } finally {
      setUploadingVersion(false);
    }
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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">Loading document...</p>
        </div>
      </Layout>
    );
  }

  if (!document) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Document not found</p>
            <button onClick={() => navigate('/documents')} className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Documents
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
          <button onClick={() => navigate('/documents')} className="text-blue-600 hover:text-blue-700 mb-4 flex items-center">
            ← Back to Documents
          </button>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{getFileIcon(document.file_type)}</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{document.name}</h1>
                <p className="text-gray-500 text-sm">{document.file_name} · {formatFileSize(document.file_size)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleDownload} className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm">
                Download
              </button>
              <button onClick={() => setShowShareModal(true)} className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm">
                Share
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm">
                Delete
              </button>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">{successMessage}</div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{error}</div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6">
            {['details', 'shares', 'versions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab} {tab === 'shares' && `(${shares.length})`} {tab === 'versions' && `(${versions.length})`}
              </button>
            ))}
          </nav>
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Document Details</h2>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleUpdate} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:bg-gray-400">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setIsEditing(false); fetchDocument(); }} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm">
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  disabled={!isEditing}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
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
                    value={formData.visibility}
                    onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
                  >
                    <option value="private">Private</option>
                    <option value="team">Team</option>
                    <option value="client">Client</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_client_visible"
                  checked={formData.is_client_visible}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_client_visible: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded"
                />
                <label htmlFor="is_client_visible" className="text-sm text-gray-700">Visible to clients</label>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                {isEditing && (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag(e)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Add tag"
                    />
                    <button type="button" onClick={handleAddTag} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Add</button>
                  </div>
                )}
                {formData.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1">
                        {tag}
                        {isEditing && <button type="button" onClick={() => handleRemoveTag(tag)} className="text-blue-600 hover:text-blue-800">×</button>}
                      </span>
                    ))}
                  </div>
                ) : <p className="text-gray-500 text-sm">No tags</p>}
              </div>

              {/* Metadata */}
              <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div><span className="font-medium">File Type:</span> {document.file_type}</div>
                <div><span className="font-medium">Version:</span> {document.version || 1}</div>
                <div><span className="font-medium">Downloads:</span> {document.download_count || 0}</div>
                <div><span className="font-medium">Uploaded:</span> {new Date(document.created_at).toLocaleString()}</div>
                {document.uploaded_by_name && <div><span className="font-medium">Uploaded By:</span> {document.uploaded_by_name}</div>}
              </div>
            </form>
          </div>
        )}

        {/* Shares Tab */}
        {activeTab === 'shares' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Document Shares</h2>
              <button onClick={() => setShowShareModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                + Add Share
              </button>
            </div>

            {shares.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No shares yet. Share this document with users or clients.</p>
            ) : (
              <div className="space-y-3">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {share.shared_with_user_name || share.shared_with_client_name || 'Unknown'}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{share.permission}</span>
                        {share.can_reshare && <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">Can Reshare</span>}
                        {share.expires_at && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                            Expires: {new Date(share.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteShare(share.id)} className="text-red-600 hover:text-red-800 text-sm">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Versions Tab */}
        {activeTab === 'versions' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Version History</h2>

            {/* Upload New Version */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Upload New Version</h3>
              <form onSubmit={handleUploadVersion} className="space-y-3">
                <div>
                  <input
                    ref={versionFileRef}
                    type="file"
                    onChange={(e) => setSelectedVersionFile(e.target.files[0])}
                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={versionDescription}
                    onChange={(e) => setVersionDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                    placeholder="Describe what changed in this version..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploadingVersion || !selectedVersionFile}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                >
                  {uploadingVersion ? 'Uploading...' : 'Upload Version'}
                </button>
              </form>
            </div>

            {/* Version List */}
            {versions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No version history available.</p>
            ) : (
              <div className="space-y-3">
                {versions.map((version, index) => (
                  <div key={version.id} className="flex items-center justify-between border border-gray-200 p-4 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">Version {version.version_number}</span>
                        {index === 0 && <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">Latest</span>}
                      </div>
                      <p className="text-sm text-gray-600">{version.file_name}</p>
                      {version.change_description && (
                        <p className="text-sm text-gray-500 mt-1">{version.change_description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatFileSize(version.file_size)} · {new Date(version.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Share Document</h3>
              <form onSubmit={handleShare} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Share With</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" value="user" checked={shareForm.share_type === 'user'} onChange={(e) => setShareForm(prev => ({ ...prev, share_type: e.target.value }))} />
                      User (by ID)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" value="client" checked={shareForm.share_type === 'client'} onChange={(e) => setShareForm(prev => ({ ...prev, share_type: e.target.value }))} />
                      Client (by ID)
                    </label>
                  </div>
                  {shareForm.share_type === 'user' ? (
                    <input
                      type="text"
                      value={shareForm.shared_with_user_id}
                      onChange={(e) => setShareForm(prev => ({ ...prev, shared_with_user_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="User UUID"
                    />
                  ) : (
                    <input
                      type="text"
                      value={shareForm.shared_with_client_id}
                      onChange={(e) => setShareForm(prev => ({ ...prev, shared_with_client_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Client UUID"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permission</label>
                  <select
                    value={shareForm.permission}
                    onChange={(e) => setShareForm(prev => ({ ...prev, permission: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="view">View Only</option>
                    <option value="download">View & Download</option>
                    <option value="edit">Full Access</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expires At (optional)</label>
                  <input
                    type="date"
                    value={shareForm.expires_at}
                    onChange={(e) => setShareForm(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="can_reshare"
                    checked={shareForm.can_reshare}
                    onChange={(e) => setShareForm(prev => ({ ...prev, can_reshare: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="can_reshare" className="text-sm text-gray-700">Allow resharing</label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                    {saving ? 'Sharing...' : 'Share Document'}
                  </button>
                  <button type="button" onClick={() => setShowShareModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
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
              <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Document</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete <strong>{document.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                >
                  {saving ? 'Deleting...' : 'Delete Document'}
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

export default DocumentDetails;
