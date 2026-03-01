import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { funnelAPI } from '../services/api';

const GOAL_LABELS = {
  leads: 'Lead Generation',
  sales: 'Sales',
  booking: 'Booking',
  awareness: 'Awareness',
};

const GOAL_COLORS = {
  leads: 'bg-blue-100 text-blue-700',
  sales: 'bg-green-100 text-green-700',
  booking: 'bg-purple-100 text-purple-700',
  awareness: 'bg-orange-100 text-orange-700',
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-yellow-100 text-yellow-700',
};

// ── New Funnel Modal ────────────────────────────────────────────────────────

function NewFunnelModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('leads');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    try {
      setSaving(true);
      await onCreate({ name: name.trim(), goal });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create funnel');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">New Funnel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Funnel Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Free Consultation Funnel"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
            <select
              value={goal}
              onChange={e => setGoal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {Object.entries(GOAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Create Funnel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Funnel Card ─────────────────────────────────────────────────────────────

function FunnelCard({ funnel, onDelete, onEdit }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${funnel.name}"? This will permanently remove all steps and analytics.`)) return;
    try {
      setDeleting(true);
      await onDelete(funnel.id);
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleting(false);
    }
  };

  const views = funnel.total_views || 0;
  const conversions = funnel.total_conversions || 0;
  const conversionRate = views > 0 ? ((conversions / views) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-sm font-semibold text-gray-800 truncate">{funnel.name}</h3>
          {funnel.slug && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">/lp/{funnel.slug}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[funnel.status] || STATUS_COLORS.draft}`}>
            {funnel.status || 'draft'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GOAL_COLORS[funnel.goal] || GOAL_COLORS.leads}`}>
            {GOAL_LABELS[funnel.goal] || funnel.goal}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">{funnel.step_count || 0}</p>
          <p className="text-xs text-gray-400">Steps</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">{views.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Views</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">{conversions.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Conversions</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-blue-600">{conversionRate}%</p>
          <p className="text-xs text-gray-400">Conv. Rate</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(funnel.id)}
          className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          ✏️ Edit Builder
        </button>
        {funnel.status === 'published' && funnel.slug && (
          <a
            href={`/lp/${funnel.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200 transition-colors"
          >
            View Live ↗
          </a>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1.5 bg-red-50 text-red-500 text-xs rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
          title="Delete funnel"
        >
          {deleting ? '...' : '🗑'}
        </button>
      </div>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onNew }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-6xl mb-5">🚀</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">No funnels yet</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md">
        Create your first landing page or sales funnel to start capturing leads and driving conversions.
      </p>
      <button
        onClick={onNew}
        className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
      >
        + Create Your First Funnel
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function Funnels() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [funnels, setFunnels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const brandId = user?.brand_id;

  useEffect(() => {
    if (!brandId) return;
    loadFunnels();
  }, [brandId]);

  const loadFunnels = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await funnelAPI.list(brandId);
      setFunnels(res.data.funnels || res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load funnels');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    const res = await funnelAPI.create(brandId, data);
    const newFunnel = res.data.funnel || res.data;
    navigate(`/funnels/${newFunnel.id}`);
  };

  const handleDelete = async (id) => {
    await funnelAPI.delete(brandId, id);
    setFunnels(prev => prev.filter(f => f.id !== id));
  };

  // ── Aggregate stats ──
  const totalFunnels = funnels.length;
  const published = funnels.filter(f => f.status === 'published').length;
  const totalViews = funnels.reduce((sum, f) => sum + (f.total_views || 0), 0);
  const totalConversions = funnels.reduce((sum, f) => sum + (f.total_conversions || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funnels</h1>
          <p className="text-sm text-gray-500 mt-0.5">Build landing pages and sales funnels that convert.</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
        >
          + New Funnel
        </button>
      </div>

      {/* Stats Strip */}
      {!loading && funnels.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Funnels', value: totalFunnels, icon: '🚀' },
            { label: 'Published', value: published, icon: '✅' },
            { label: 'Total Views', value: totalViews.toLocaleString(), icon: '👁' },
            { label: 'Total Conversions', value: totalConversions.toLocaleString(), icon: '🎯' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{stat.icon}</span>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={loadFunnels} className="mt-3 text-sm text-blue-600 hover:underline">
            Try again
          </button>
        </div>
      ) : funnels.length === 0 ? (
        <EmptyState onNew={() => setShowNewModal(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {funnels.map(funnel => (
            <FunnelCard
              key={funnel.id}
              funnel={funnel}
              onEdit={id => navigate(`/funnels/${id}`)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* New Funnel Modal */}
      {showNewModal && (
        <NewFunnelModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
