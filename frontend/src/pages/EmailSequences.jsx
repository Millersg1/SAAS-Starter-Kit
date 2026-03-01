import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dripAPI } from '../services/api';

const STATUS_COLORS = {
  active:   'bg-green-100 text-green-700',
  paused:   'bg-yellow-100 text-yellow-700',
  archived: 'bg-gray-100 text-gray-500',
};

function NewSequenceModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    try {
      setSaving(true);
      await onCreate({ name: name.trim(), description });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create sequence');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">New Email Sequence</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sequence Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., New Lead Nurture (30 Days)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this sequence for?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Creating...' : 'Create Sequence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SequenceRow({ seq, onEdit, onDelete, onTogglePause }) {
  const [deleting, setDeleting] = useState(false);
  const activeEnrollments = seq.active_enrollments || 0;
  const totalSent = seq.total_sent || 0;

  const handleDelete = async () => {
    if (!confirm(`Delete "${seq.name}"? All enrollments will also be removed.`)) return;
    try {
      setDeleting(true);
      await onDelete(seq.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-800 truncate">{seq.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[seq.status] || STATUS_COLORS.active}`}>
              {seq.status}
            </span>
          </div>
          {seq.description && <p className="text-xs text-gray-500 truncate">{seq.description}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Steps', value: seq.step_count || 0 },
          { label: 'Active', value: activeEnrollments },
          { label: 'Total Enrolled', value: seq.total_enrollments || 0 },
          { label: 'Emails Sent', value: totalSent },
        ].map(s => (
          <div key={s.label} className="text-center">
            <p className="text-lg font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(seq.id)}
          className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          ✏️ Edit Sequence
        </button>
        <button
          onClick={() => onTogglePause(seq)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            seq.status === 'active'
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {seq.status === 'active' ? '⏸ Pause' : '▶ Resume'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1.5 bg-red-50 text-red-500 text-xs rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {deleting ? '...' : '🗑'}
        </button>
      </div>
    </div>
  );
}

export default function EmailSequences() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const brandId = user?.brand_id;

  useEffect(() => {
    if (!brandId) return;
    loadSequences();
  }, [brandId]);

  const loadSequences = async () => {
    try {
      setLoading(true);
      const res = await dripAPI.list(brandId);
      setSequences(res.data.sequences || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sequences');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    const res = await dripAPI.create(brandId, data);
    const seq = res.data.sequence;
    navigate(`/sequences/${seq.id}`);
  };

  const handleDelete = async (id) => {
    await dripAPI.delete(brandId, id);
    setSequences(prev => prev.filter(s => s.id !== id));
  };

  const handleTogglePause = async (seq) => {
    const newStatus = seq.status === 'active' ? 'paused' : 'active';
    await dripAPI.update(brandId, seq.id, { status: newStatus });
    setSequences(prev => prev.map(s => s.id === seq.id ? { ...s, status: newStatus } : s));
  };

  // Stats
  const totalActive = sequences.filter(s => s.status === 'active').length;
  const totalEnrolled = sequences.reduce((sum, s) => sum + Number(s.total_enrollments || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Sequences</h1>
          <p className="text-sm text-gray-500 mt-0.5">Automated multi-step email flows that nurture leads on autopilot.</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
        >
          + New Sequence
        </button>
      </div>

      {/* Stats */}
      {!loading && sequences.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Sequences', value: sequences.length, icon: '📧' },
            { label: 'Active', value: totalActive, icon: '▶' },
            { label: 'Total Enrolled', value: totalEnrolled, icon: '👥' },
            { label: 'Emails Sent', value: sequences.reduce((sum, s) => sum + Number(s.total_sent || 0), 0), icon: '✉️' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{stat.icon}</span>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={loadSequences} className="mt-3 text-sm text-blue-600 hover:underline">Try again</button>
        </div>
      ) : sequences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-5">📧</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No sequences yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md">
            Create a drip sequence to automatically follow up with leads over days or weeks — no manual effort needed.
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            + Create Your First Sequence
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sequences.map(seq => (
            <SequenceRow
              key={seq.id}
              seq={seq}
              onEdit={id => navigate(`/sequences/${id}`)}
              onDelete={handleDelete}
              onTogglePause={handleTogglePause}
            />
          ))}
        </div>
      )}

      {showNewModal && (
        <NewSequenceModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
