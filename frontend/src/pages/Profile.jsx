import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { userAPI, twoFactorAPI, uploadAPI } from '../services/api';
import Layout from '../components/Layout';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(user?.totp_enabled || false);
  const [totpSetup, setTotpSetup] = useState(null); // { secret, qr_code }
  const [totpConfirmCode, setTotpConfirmCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAMessage, setTwoFAMessage] = useState({ type: '', text: '' });
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Change password state
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const handleSetup2FA = async () => {
    setTwoFALoading(true);
    setTwoFAMessage({ type: '', text: '' });
    try {
      const res = await twoFactorAPI.setup();
      setTotpSetup({ qr_code: res.data.data.qr_code, otpauth_url: res.data.data.otpauth_url });
      setTotpSecret(res.data.data.secret);
    } catch (err) {
      setTwoFAMessage({ type: 'error', text: err.response?.data?.message || 'Failed to setup 2FA' });
    } finally { setTwoFALoading(false); }
  };

  const handleEnable2FA = async () => {
    if (!totpConfirmCode) return;
    setTwoFALoading(true);
    setTwoFAMessage({ type: '', text: '' });
    try {
      const res = await twoFactorAPI.enable({ secret: totpSecret, token: totpConfirmCode });
      setBackupCodes(res.data.data.backup_codes || []);
      setTotpEnabled(true);
      setTotpSetup(null);
      setTotpConfirmCode('');
      setTwoFAMessage({ type: 'success', text: 'Two-factor authentication enabled.' });
    } catch (err) {
      setTwoFAMessage({ type: 'error', text: err.response?.data?.message || 'Invalid code. Try again.' });
    } finally { setTwoFALoading(false); }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) return;
    setTwoFALoading(true);
    setTwoFAMessage({ type: '', text: '' });
    try {
      await twoFactorAPI.disable({ password: disablePassword });
      setTotpEnabled(false);
      setDisablePassword('');
      setBackupCodes([]);
      setTwoFAMessage({ type: 'success', text: 'Two-factor authentication disabled.' });
    } catch (err) {
      setTwoFAMessage({ type: 'error', text: err.response?.data?.message || 'Failed to disable 2FA' });
    } finally { setTwoFALoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    setPasswordLoading(true);
    setPasswordMessage({ type: '', text: '' });
    try {
      await userAPI.updatePassword({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated');
      setPasswordMessage({ type: 'success', text: 'Password updated successfully.' });
      setTimeout(() => setPasswordMessage({ type: '', text: '' }), 5000);
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    avatar_url: ''
  });

  // Preferences form state
  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD'
  });

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || ''
      });
      
      if (user.preferences) {
        setPreferences(prev => ({
          ...prev,
          ...user.preferences
        }));
      }
    }
  }, [user]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await userAPI.updateProfile({
        name: profileData.name,
        phone: profileData.phone || null,
        bio: profileData.bio || null,
        avatar_url: profileData.avatar_url || null
      });

      updateUser(response.data.data.user);
      toast.success('Profile updated');
      showMessage('success', 'Profile updated successfully!');
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // The backend expects preferences to be sent directly to /users/me with preferences field
      const response = await userAPI.updateProfile({
        preferences: preferences
      });

      updateUser(response.data.data.user);
      showMessage('success', 'Preferences updated successfully!');
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await userAPI.deleteAccount();
      showMessage('success', 'Account deleted successfully');
      // Logout will be handled by the API interceptor
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to delete account');
      setLoading(false);
    }
  };

  return (
    <Layout>
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium"
        >
          ← Back
        </button>
      </div>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mx-6 mt-4 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px px-6">
            {['profile', 'preferences', 'security'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  disabled
                />
                <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+1234567890"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                />
                <p className="mt-1 text-sm text-gray-500">Format: +1234567890 (E.164)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="Tell us about yourself..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  {profileData.bio.length}/500 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avatar
                </label>
                <div className="flex items-center gap-4">
                  {profileData.avatar_url ? (
                    <img src={profileData.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-2xl">
                      {profileData.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {avatarUploading ? 'Uploading...' : 'Upload Photo'}
                    </button>
                    {profileData.avatar_url && (
                      <button
                        type="button"
                        onClick={() => setProfileData({ ...profileData, avatar_url: '' })}
                        className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md text-sm hover:bg-gray-50"
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-xs text-gray-400">JPG, PNG, WebP up to 25MB</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAvatarUploading(true);
                    try {
                      const res = await uploadAPI.uploadImage(file);
                      setProfileData(prev => ({ ...prev, avatar_url: res.data.data.url }));
                    } catch (err) {
                      showMessage('error', 'Failed to upload image. Please try again.');
                    } finally {
                      setAvatarUploading(false);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <form onSubmit={handlePreferencesSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <select
                  value={preferences.theme}
                  onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="pt">Português</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Notifications
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.notifications.email}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        notifications: { ...preferences.notifications, email: e.target.checked }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Email notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.notifications.push}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        notifications: { ...preferences.notifications, push: e.target.checked }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Push notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.notifications.sms}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        notifications: { ...preferences.notifications, sms: e.target.checked }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">SMS notifications</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Format
                </label>
                <select
                  value={preferences.dateFormat}
                  onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={preferences.currency}
                  onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">

              {/* 2FA Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Add an extra layer of security to your account using a TOTP authenticator app.
                </p>

                {twoFAMessage.text && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${twoFAMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {twoFAMessage.text}
                  </div>
                )}

                {/* Backup codes shown once after enable */}
                {backupCodes.length > 0 && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">Save your backup codes</p>
                    <p className="text-xs text-yellow-700 mb-3">Store these somewhere safe. Each code can only be used once.</p>
                    <div className="grid grid-cols-2 gap-1">
                      {backupCodes.map((c, i) => (
                        <span key={i} className="font-mono text-xs bg-white px-2 py-1 rounded border border-yellow-300">{c}</span>
                      ))}
                    </div>
                    <button onClick={() => setBackupCodes([])} className="mt-3 text-xs text-yellow-700 hover:text-yellow-900">
                      I've saved these codes ✓
                    </button>
                  </div>
                )}

                {totpEnabled ? (
                  /* Disable 2FA */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                      <span className="text-green-600">✓</span> 2FA is currently enabled
                    </div>
                    <p className="text-sm text-gray-600">To disable 2FA, confirm your password:</p>
                    <div className="flex gap-2">
                      <input type="password" value={disablePassword}
                        onChange={e => setDisablePassword(e.target.value)}
                        placeholder="Your password"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button onClick={handleDisable2FA} disabled={twoFALoading || !disablePassword}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                        {twoFALoading ? 'Disabling...' : 'Disable 2FA'}
                      </button>
                    </div>
                  </div>
                ) : totpSetup ? (
                  /* Confirm setup */
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">Scan this QR code with your authenticator app:</p>
                    <img src={totpSetup.qr_code} alt="QR Code" className="w-48 h-48 border border-gray-200 rounded-lg p-2" />
                    <p className="text-xs text-gray-500">Or enter this code manually: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{totpSecret}</span></p>
                    <p className="text-sm text-gray-700">Enter the 6-digit code to confirm:</p>
                    <div className="flex gap-2">
                      <input type="text" inputMode="numeric" maxLength={6} value={totpConfirmCode}
                        onChange={e => setTotpConfirmCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button onClick={handleEnable2FA} disabled={twoFALoading || totpConfirmCode.length < 6}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                        {twoFALoading ? 'Enabling...' : 'Enable 2FA'}
                      </button>
                      <button onClick={() => { setTotpSetup(null); setTotpConfirmCode(''); }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Enable button */
                  <button onClick={handleSetup2FA} disabled={twoFALoading}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {twoFALoading ? 'Loading...' : 'Enable Two-Factor Authentication'}
                  </button>
                )}
              </div>

              {/* Change Password */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Change Password</h3>
                <p className="text-sm text-gray-500 mb-4">Update your password to keep your account secure.</p>
                {passwordMessage.text && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${passwordMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {passwordMessage.text}
                  </div>
                )}
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input type="password" value={passwordData.currentPassword}
                      onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input type="password" value={passwordData.newPassword}
                      onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required minLength={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input type="password" value={passwordData.confirmPassword}
                      onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={passwordLoading}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                      {passwordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete Account
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </Layout>
  );
};

export default Profile;
