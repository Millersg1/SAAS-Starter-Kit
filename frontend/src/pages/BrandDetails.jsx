import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { brandAPI, uploadAPI, connectAPI, auditAPI, webhookAPI, customFieldAPI } from '../services/api';

const BrandDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [brand, setBrand] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('members');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [formError, setFormError] = useState('');
  const [brandingForm, setBrandingForm] = useState({ primary_color: '#2563eb', secondary_color: '#1e40af', logo_url: '', custom_domain: '' });
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState({ limit: 50, offset: 0 });
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Stripe Connect state
  const [connectStatus, setConnectStatus] = useState(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  // Custom Fields
  const [fieldDefs, setFieldDefs] = useState([]);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [fieldForm, setFieldForm] = useState({ field_key: '', field_label: '', field_type: 'text', options: '', required: false });
  const [savingField, setSavingField] = useState(false);

  // Integrations (Hunter.io)
  const [hunterKey, setHunterKey] = useState('');
  const [showHunterKey, setShowHunterKey] = useState(false);
  const [savingHunterKey, setSavingHunterKey] = useState(false);

  // Webhooks
  const [webhooks, setWebhooks] = useState([]);
  const [webhookSupported, setWebhookSupported] = useState([]);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ url: '', description: '', events: [] });
  const [webhookSaving, setWebhookSaving] = useState(false);

  useEffect(() => {
    fetchBrandDetails();
    fetchBrandMembers();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'audit' && id) {
      fetchAuditLogs();
    }
  }, [activeTab, id, auditFilters]);

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await auditAPI.getLogs(id, auditFilters);
      setAuditLogs(res.data.data?.logs || []);
    } catch { /* non-critical */ }
    finally { setAuditLoading(false); }
  };

  const fetchBrandDetails = async () => {
    try {
      setLoading(true);
      const response = await brandAPI.getBrand(id);
      const b = response.data.data.brand;
      setBrand(b);
      setBrandingForm({
        primary_color: b.primary_color || '#2563eb',
        secondary_color: b.secondary_color || '#1e40af',
        logo_url: b.logo_url || '',
        custom_domain: b.custom_domain || '',
      });
      setHunterKey(b.hunter_api_key || '');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load brand details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setSavingBranding(true);
    try {
      const response = await brandAPI.updateBrand(id, brandingForm);
      setBrand((prev) => ({ ...prev, ...brandingForm }));
      setSuccessMessage('Branding saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save branding');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError('');
    try {
      const res = await uploadAPI.uploadImage(file);
      setBrandingForm((prev) => ({ ...prev, logo_url: res.data.data.url }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const fetchBrandMembers = async () => {
    try {
      const response = await brandAPI.getBrandMembers(id);
      setMembers(response.data.data?.members || []);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newMemberEmail || !newMemberEmail.includes('@')) {
      setFormError('Please enter a valid email address');
      return;
    }

    try {
      // Note: In a real implementation, you'd need to get the user_id from the email
      // For now, this is a placeholder - the backend would need an endpoint to invite by email
      await brandAPI.addBrandMember(id, {
        user_id: newMemberEmail, // This should be a UUID in production
        role: newMemberRole,
      });
      
      setSuccessMessage('Member added successfully!');
      setShowAddMemberModal(false);
      setNewMemberEmail('');
      setNewMemberRole('member');
      fetchBrandMembers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleUpdateMemberRole = async (memberId, newRole) => {
    try {
      await brandAPI.updateBrandMember(id, memberId, { role: newRole });
      setSuccessMessage('Member role updated successfully!');
      fetchBrandMembers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this brand?`)) {
      return;
    }

    try {
      await brandAPI.removeBrandMember(id, memberId);
      setSuccessMessage('Member removed successfully!');
      fetchBrandMembers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'member':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canManageMembers = brand?.userRole === 'owner' || brand?.userRole === 'admin';
  const isOwner = members.find(m => m.user_id === brand?.owner_id)?.role === 'owner'
    ? brand?.userRole === 'owner'
    : brand?.userRole === 'owner';

  // Load custom field defs when tab opens
  useEffect(() => {
    if (activeTab === 'custom-fields' && id) {
      customFieldAPI.list(id)
        .then(res => setFieldDefs(res.data.data?.fields || []))
        .catch(() => {});
    }
  }, [activeTab, id]);

  // Load Connect status when Payments tab opens
  useEffect(() => {
    if (activeTab === 'payments' && id) {
      setConnectLoading(true);
      connectAPI.getConnectStatus(id)
        .then(res => setConnectStatus(res.data.data))
        .catch(err => console.error('Failed to load Connect status:', err))
        .finally(() => setConnectLoading(false));
    }
  }, [activeTab, id]);

  // Load webhooks when tab opens
  useEffect(() => {
    if (activeTab === 'webhooks' && id) {
      webhookAPI.list(id)
        .then(res => {
          setWebhooks(res.data.data?.endpoints || []);
          setWebhookSupported(res.data.data?.supportedEvents || []);
        })
        .catch(err => console.error('Failed to load webhooks:', err));
    }
  }, [activeTab, id]);

  // Handle ?connect=return after Stripe onboarding redirect
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('connect');
    if (p === 'return' && id) {
      connectAPI.handleReturn(id)
        .then(res => {
          setConnectStatus(prev => ({ ...prev, ...res.data.data }));
          setActiveTab('payments');
          window.history.replaceState({}, '', `/brands/${id}`);
        })
        .catch(console.error);
    }
  }, [id]);

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const res = await connectAPI.createOnboardingLink(id);
      window.location.href = res.data.data.url;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start Stripe onboarding');
      setConnectingStripe(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading brand details...</div>
        </div>
      </Layout>
    );
  }

  if (error && !brand) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
          <button
            onClick={() => navigate('/brands')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            ← Back to Brands
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/brands')}
          className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          ← Back to Brands
        </button>

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

        {/* Brand Header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div
            className="h-32 flex items-center justify-center"
            style={{ backgroundColor: brand?.primary_color || '#007bff' }}
          >
            {brand?.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-20 w-20 object-contain bg-white rounded-lg p-2"
              />
            ) : (
              <div className="text-white text-5xl font-bold">
                {brand?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{brand?.name}</h1>
                <p className="text-gray-500 mt-1">@{brand?.slug}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(brand?.userRole)}`}>
                Your Role: {brand?.userRole}
              </span>
            </div>

            {brand?.description && (
              <p className="text-gray-700 mb-4">{brand.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brand?.website && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Website:</span>
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-700"
                  >
                    {brand.website}
                  </a>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-600">Brand Colors:</span>
                <div className="flex gap-2 ml-2 inline-flex">
                  <div
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: brand?.primary_color }}
                    title={`Primary: ${brand?.primary_color}`}
                  />
                  <div
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: brand?.secondary_color }}
                    title={`Secondary: ${brand?.secondary_color}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {['members', 'branding', 'payments', 'webhooks', 'custom-fields', 'integrations', 'audit'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-white border border-gray-200 border-b-white -mb-px text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'members' ? 'Team Members' : tab === 'branding' ? 'Branding' : tab === 'payments' ? 'Payments' : tab === 'webhooks' ? 'Webhooks' : tab === 'custom-fields' ? 'Custom Fields' : tab === 'integrations' ? 'Integrations' : 'Audit Log'}
            </button>
          ))}
        </div>

        {/* Team Members Section */}
        {activeTab === 'members' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
              <p className="text-gray-600 mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
            {canManageMembers && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Add Member
              </button>
            )}
          </div>

          {/* Members List */}
          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No team members yet
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {member.user_name?.charAt(0).toUpperCase() || '?'}
                    </div>

                    {/* Member Info */}
                    <div>
                      <h3 className="font-semibold text-gray-900">{member.user_name || 'Unknown'}</h3>
                      <p className="text-sm text-gray-600">{member.user_email}</p>
                      {member.joined_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Role Badge/Selector */}
                    {canManageMembers && member.role !== 'owner' ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(member.role)} cursor-pointer`}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(member.role)}`}>
                        {member.role}
                      </span>
                    )}

                    {/* Remove Button */}
                    {canManageMembers && member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.user_name)}
                        className="text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50 transition-colors text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">White-Label Branding</h2>
            <p className="text-gray-500 text-sm mb-6">
              These settings control how your brand appears in the client portal.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form */}
              <form onSubmit={handleSaveBranding} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandingForm.primary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                      className="h-10 w-16 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={brandingForm.primary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="#2563eb"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Used for nav tabs, buttons, and accents in the portal</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandingForm.secondary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, secondary_color: e.target.value })}
                      className="h-10 w-16 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={brandingForm.secondary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, secondary_color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="#1e40af"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand Logo
                  </label>
                  <div className="flex items-center gap-4">
                    {brandingForm.logo_url ? (
                      <img
                        src={brandingForm.logo_url}
                        alt="Logo preview"
                        className="h-14 w-14 object-contain rounded border border-gray-200 bg-gray-50 p-1"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                        No logo
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/heic,image/heif,.heic,.heif"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                        />
                      </label>
                      {brandingForm.logo_url && (
                        <button
                          type="button"
                          onClick={() => setBrandingForm((prev) => ({ ...prev, logo_url: '' }))}
                          className="ml-2 text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, SVG up to 5 MB. Shown in portal header.</p>
                    </div>
                  </div>
                </div>

                {/* Custom Portal Domain */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Portal Domain</label>
                  <input
                    type="text"
                    value={brandingForm.custom_domain}
                    onChange={(e) => setBrandingForm({ ...brandingForm, custom_domain: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="portal.youragency.com"
                  />
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
                    <p className="font-medium text-gray-700">DNS Setup Instructions</p>
                    <p>1. Add a CNAME record in your DNS provider:</p>
                    <p className="font-mono bg-white px-2 py-1 rounded border border-gray-200">
                      portal.youragency.com → {window.location.hostname}
                    </p>
                    <p>2. Save branding to activate this domain.</p>
                    <p>3. SSL is handled automatically by your server (Caddy/nginx).</p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-gray-500 mb-3">
                    Share this portal login link with your clients:{' '}
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-blue-700">
                      {window.location.origin}/portal/login?brand={id}
                    </span>
                  </p>
                  <button
                    type="submit"
                    disabled={savingBranding}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    {savingBranding ? 'Saving...' : 'Save Branding'}
                  </button>
                </div>
              </form>

              {/* Live Preview */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Portal Preview</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Simulated portal header */}
                  <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {brandingForm.logo_url ? (
                        <img src={brandingForm.logo_url} alt="Logo" className="h-7 w-auto object-contain" />
                      ) : (
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: brandingForm.primary_color }}
                        >
                          {brand?.name?.charAt(0)?.toUpperCase() || 'B'}
                        </div>
                      )}
                      <span className="font-semibold text-gray-900 text-sm">{brand?.name || 'Your Brand'}</span>
                    </div>
                    <span className="text-xs text-gray-400">Client Name</span>
                  </div>
                  {/* Simulated nav tabs */}
                  <div className="bg-white px-4 flex gap-3 border-b border-gray-200">
                    {['Dashboard', 'Projects', 'Invoices'].map((tab, i) => (
                      <div
                        key={tab}
                        className="py-2 text-xs font-medium border-b-2 flex items-center gap-1"
                        style={i === 0 ? { color: brandingForm.primary_color, borderColor: brandingForm.primary_color } : { color: '#9ca3af', borderColor: 'transparent' }}
                      >
                        {tab}
                      </div>
                    ))}
                  </div>
                  {/* Simulated content */}
                  <div className="bg-gray-50 p-4">
                    <div
                      className="rounded-lg p-3 text-white text-xs font-medium mb-3"
                      style={{ background: `linear-gradient(135deg, ${brandingForm.primary_color}, ${brandingForm.secondary_color})` }}
                    >
                      Welcome back, Client!
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {['Projects', 'Invoices'].map((c) => (
                        <div key={c} className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-lg font-bold text-gray-800">3</p>
                          <p className="text-xs text-gray-400">{c}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Stripe Payments</h2>
            <p className="text-gray-500 text-sm mb-6">
              Connect your Stripe account so your clients can pay invoices directly to you.
              A 2% platform fee applies to each transaction.
            </p>

            {connectLoading ? (
              <div className="text-gray-400 text-sm">Checking connection status...</div>
            ) : connectStatus?.stripe_connect_status === 'active' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">Stripe Connected</p>
                    <p className="text-sm text-green-700">
                      Payouts: {connectStatus.stripe_payouts_enabled ? 'Enabled' : 'Pending'}
                      &nbsp;·&nbsp;
                      Charges: {connectStatus.stripe_charges_enabled ? 'Enabled' : 'Pending'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Account ID: {connectStatus.stripe_account_id}</p>
                {isOwner && (
                  <button
                    onClick={handleConnectStripe}
                    disabled={connectingStripe}
                    className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                  >
                    {connectingStripe ? 'Redirecting...' : 'Update Stripe Account'}
                  </button>
                )}
              </div>
            ) : connectStatus?.stripe_connect_status === 'pending_verification' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
                  <p className="font-medium text-yellow-800">
                    Verification Pending — Stripe is reviewing your information.
                  </p>
                </div>
                {isOwner && (
                  <button
                    onClick={handleConnectStripe}
                    disabled={connectingStripe}
                    className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    {connectingStripe ? 'Redirecting...' : 'Resume Onboarding'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0" />
                  <p className="font-medium text-orange-800">
                    Not connected — clients cannot pay invoices online until you connect Stripe.
                  </p>
                </div>
                {isOwner ? (
                  <button
                    onClick={handleConnectStripe}
                    disabled={connectingStripe}
                    className="px-5 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium disabled:opacity-50"
                  >
                    {connectingStripe ? 'Redirecting to Stripe...' : 'Connect Stripe Account'}
                  </button>
                ) : (
                  <p className="text-sm text-gray-500">
                    Ask the brand owner to connect a Stripe account to enable online payments.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Audit Log</h2>
            <p className="text-gray-500 text-sm mb-4">Recent activity across your brand workspace.</p>

            {/* Filters */}
            <div className="flex gap-3 mb-4 flex-wrap">
              <select value={auditFilters.action || ''} onChange={e => setAuditFilters(f => ({ ...f, action: e.target.value || undefined, offset: 0 }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
              </select>
              <select value={auditFilters.entity_type || ''} onChange={e => setAuditFilters(f => ({ ...f, entity_type: e.target.value || undefined, offset: 0 }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Types</option>
                <option value="client">Client</option>
                <option value="invoice">Invoice</option>
                <option value="project">Project</option>
                <option value="document">Document</option>
                <option value="brand">Brand</option>
              </select>
              <input type="date" value={auditFilters.start_date || ''} onChange={e => setAuditFilters(f => ({ ...f, start_date: e.target.value || undefined, offset: 0 }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="date" value={auditFilters.end_date || ''} onChange={e => setAuditFilters(f => ({ ...f, end_date: e.target.value || undefined, offset: 0 }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {auditLoading ? (
              <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
            ) : auditLogs.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No audit log entries found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">Timestamp</th>
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">User</th>
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">Action</th>
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">Type</th>
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-gray-700">{log.user_name || log.user_id?.slice(0, 8) || '—'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            log.action === 'create' ? 'bg-green-100 text-green-700' :
                            log.action === 'delete' ? 'bg-red-100 text-red-700' :
                            log.action === 'update' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>{log.action}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-600 capitalize">{log.entity_type || '—'}</td>
                        <td className="px-4 py-2 text-gray-600">{log.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 text-sm">
              <button disabled={!auditFilters.offset} onClick={() => setAuditFilters(f => ({ ...f, offset: Math.max(0, (f.offset || 0) - 50) }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                ← Previous
              </button>
              <span className="text-gray-500">Showing {(auditFilters.offset || 0) + 1}–{(auditFilters.offset || 0) + auditLogs.length}</span>
              <button disabled={auditLogs.length < (auditFilters.limit || 50)}
                onClick={() => setAuditFilters(f => ({ ...f, offset: (f.offset || 0) + 50 }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Webhooks</h2>
                <p className="text-gray-500 text-sm mt-1">Send real-time events to external URLs (Zapier, Make, custom integrations)</p>
              </div>
              <button
                onClick={() => { setWebhookForm({ url: '', description: '', events: [] }); setShowWebhookForm(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                + Add Endpoint
              </button>
            </div>

            {showWebhookForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!webhookForm.url || webhookForm.events.length === 0) return;
                  setWebhookSaving(true);
                  try {
                    const res = await webhookAPI.create(id, webhookForm);
                    setWebhooks(w => [res.data.data.endpoint, ...w]);
                    setShowWebhookForm(false);
                  } catch (err) {
                    alert(err.response?.data?.message || 'Failed to create endpoint');
                  } finally { setWebhookSaving(false); }
                }}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 space-y-3"
              >
                <input
                  type="url"
                  placeholder="https://hooks.zapier.com/..."
                  value={webhookForm.url}
                  onChange={e => setWebhookForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={webhookForm.description}
                  onChange={e => setWebhookForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Events to subscribe to:</p>
                  <div className="flex flex-wrap gap-2">
                    {webhookSupported.map(evt => (
                      <label key={evt} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={webhookForm.events.includes(evt)}
                          onChange={e => setWebhookForm(f => ({
                            ...f,
                            events: e.target.checked ? [...f.events, evt] : f.events.filter(x => x !== evt)
                          }))}
                        />
                        <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">{evt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={webhookSaving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                    {webhookSaving ? 'Saving...' : 'Save Endpoint'}
                  </button>
                  <button type="button" onClick={() => setShowWebhookForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                </div>
              </form>
            )}

            {webhooks.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">No webhook endpoints configured yet.</p>
            ) : (
              <div className="space-y-3">
                {webhooks.map(wh => (
                  <div key={wh.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{wh.url}</p>
                        {wh.description && <p className="text-gray-500 text-xs mt-0.5">{wh.description}</p>}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(wh.events || []).map(evt => (
                            <span key={evt} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded font-mono">{evt}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wh.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {wh.is_active ? 'Active' : 'Paused'}
                        </span>
                        <button
                          onClick={async () => {
                            try {
                              await webhookAPI.update(id, wh.id, { is_active: !wh.is_active });
                              setWebhooks(ws => ws.map(w => w.id === wh.id ? { ...w, is_active: !w.is_active } : w));
                            } catch { /* ignore */ }
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          {wh.is_active ? 'Pause' : 'Enable'}
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm('Delete this webhook endpoint?')) return;
                            await webhookAPI.remove(id, wh.id);
                            setWebhooks(ws => ws.filter(w => w.id !== wh.id));
                          }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom Fields Tab */}
        {activeTab === 'custom-fields' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Custom Fields</h2>
                <p className="text-gray-500 text-sm mt-1">Define typed fields that appear on every client record.</p>
              </div>
              <button
                onClick={() => { setFieldForm({ field_key: '', field_label: '', field_type: 'text', options: '', required: false }); setShowFieldModal(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                + Add Field
              </button>
            </div>

            {fieldDefs.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No custom fields yet. Add one to get started.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium">Label</th>
                    <th className="pb-2 font-medium">Key</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Required</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fieldDefs.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{f.field_label}</td>
                      <td className="py-3 font-mono text-gray-500 text-xs">{f.field_key}</td>
                      <td className="py-3">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium capitalize">{f.field_type}</span>
                      </td>
                      <td className="py-3">{f.required ? '✓' : '—'}</td>
                      <td className="py-3 flex gap-3 justify-end">
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Delete field "${f.field_label}"?`)) return;
                            await customFieldAPI.remove(id, f.id);
                            setFieldDefs(prev => prev.filter(x => x.id !== f.id));
                          }}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Add Field Modal */}
            {showFieldModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-md w-full p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Add Custom Field</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setSavingField(true);
                    try {
                      const payload = {
                        field_key: fieldForm.field_key.trim().toLowerCase().replace(/\s+/g, '_'),
                        field_label: fieldForm.field_label.trim(),
                        field_type: fieldForm.field_type,
                        options: fieldForm.field_type === 'dropdown'
                          ? fieldForm.options.split(',').map(s => s.trim()).filter(Boolean)
                          : [],
                        required: fieldForm.required,
                        position: fieldDefs.length,
                      };
                      const res = await customFieldAPI.create(id, payload);
                      setFieldDefs(prev => [...prev, res.data.data.field]);
                      setShowFieldModal(false);
                    } catch (err) {
                      alert(err.response?.data?.message || 'Failed to create field');
                    } finally { setSavingField(false); }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                      <input required type="text" value={fieldForm.field_label}
                        onChange={e => setFieldForm(f => ({ ...f, field_label: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. Budget" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Key *</label>
                      <input required type="text" value={fieldForm.field_key}
                        onChange={e => setFieldForm(f => ({ ...f, field_key: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" placeholder="e.g. budget (auto-formatted)" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select value={fieldForm.field_type} onChange={e => setFieldForm(f => ({ ...f, field_type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        {['text','number','date','dropdown','checkbox','url','email','phone'].map(t => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    {fieldForm.field_type === 'dropdown' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Options (comma-separated)</label>
                        <input type="text" value={fieldForm.options}
                          onChange={e => setFieldForm(f => ({ ...f, options: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Option A, Option B, Option C" />
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={fieldForm.required}
                        onChange={e => setFieldForm(f => ({ ...f, required: e.target.checked }))} />
                      Required field
                    </label>
                    <div className="flex gap-3 justify-end pt-2">
                      <button type="button" onClick={() => setShowFieldModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                      <button type="submit" disabled={savingField}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:bg-gray-400">
                        {savingField ? 'Adding…' : 'Add Field'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Integrations</h2>
            <p className="text-gray-500 text-sm mb-6">Connect third-party services to enhance your CRM data.</p>

            <div className="border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-lg">🎯</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Hunter.io</h3>
                  <p className="text-xs text-gray-500">Automatically find social profiles and emails during contact enrichment</p>
                </div>
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <div className="relative">
                    <input
                      type={showHunterKey ? 'text' : 'password'}
                      value={hunterKey}
                      onChange={(e) => setHunterKey(e.target.value)}
                      placeholder="Enter Hunter.io API key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowHunterKey(!showHunterKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      {showHunterKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setSavingHunterKey(true);
                    try {
                      await brandAPI.updateBrand(id, { hunter_api_key: hunterKey });
                      setSuccessMessage('Hunter.io API key saved!');
                      setTimeout(() => setSuccessMessage(''), 3000);
                    } catch (err) {
                      setError(err.response?.data?.message || 'Failed to save key');
                    } finally { setSavingHunterKey(false); }
                  }}
                  disabled={savingHunterKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm whitespace-nowrap"
                >
                  {savingHunterKey ? 'Saving…' : 'Save Key'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Get your API key at <a href="https://hunter.io" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">hunter.io</a> — free plan includes 25 searches/month.</p>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Team Member</h2>
              
              <form onSubmit={handleAddMember}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="member@example.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Note: User must already have an account
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="admin">Admin - Can manage brand and members</option>
                    <option value="member">Member - Can view and edit content</option>
                    <option value="viewer">Viewer - Can only view content</option>
                  </select>
                </div>

                {formError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                    {formError}
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMemberModal(false);
                      setNewMemberEmail('');
                      setNewMemberRole('member');
                      setFormError('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Member
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

export default BrandDetails;
