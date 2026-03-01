import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { funnelAPI } from '../services/api';
import BlockRenderer from '../components/funnel/BlockRenderer';
import BlockEditorPanel, {
  BLOCK_LABELS,
  BLOCK_ICONS,
  BLOCK_DEFAULTS,
} from '../components/funnel/BlockEditors';
const uuidv4 = () => crypto.randomUUID();

// ── Block library config ────────────────────────────────────────────────────

const LIBRARY_GROUPS = [
  {
    label: 'Layout',
    types: ['hero', 'features', 'text_content', 'video'],
  },
  {
    label: 'Conversion',
    types: ['lead_form', 'cta_banner', 'pricing'],
  },
  {
    label: 'Social Proof',
    types: ['testimonials', 'social_proof'],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeBlock(type) {
  return {
    id: uuidv4(),
    type,
    props: { ...(BLOCK_DEFAULTS[type] || {}) },
  };
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StepTab({ step, active, onClick, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(step.name);
  const inputRef = useRef(null);

  useEffect(() => { setName(step.name); }, [step.name]);

  const commit = () => {
    setEditing(false);
    if (name.trim() && name !== step.name) onRename(name.trim());
    else setName(step.name);
  };

  return (
    <div
      className={`flex items-center gap-1 px-3 py-2 text-sm rounded-t-lg border-b-2 cursor-pointer whitespace-nowrap transition-colors ${
        active
          ? 'border-blue-600 text-blue-700 bg-white font-medium'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
      onClick={onClick}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setName(step.name); } }}
          className="w-24 text-sm border-b border-blue-400 focus:outline-none bg-transparent"
          autoFocus
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}>{step.name}</span>
      )}
      {active && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="ml-1 text-gray-300 hover:text-red-400 text-xs leading-none"
          title="Delete step"
        >✕</button>
      )}
    </div>
  );
}

function BlockLibrary({ onAdd }) {
  return (
    <div className="w-52 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Block Library</h3>
      </div>
      <div className="p-3 space-y-4 flex-1">
        {LIBRARY_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-xs font-medium text-gray-400 mb-1.5 px-1">{group.label}</p>
            <div className="space-y-1">
              {group.types.map(type => (
                <button
                  key={type}
                  onClick={() => onAdd(type)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors group"
                >
                  <span className="text-base">{BLOCK_ICONS[type]}</span>
                  <span className="text-gray-700 group-hover:text-blue-700">{BLOCK_LABELS[type]}</span>
                  <span className="ml-auto text-gray-300 group-hover:text-blue-400">+</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockControlBar({ onMoveUp, onMoveDown, onDuplicate, onDelete, canMoveUp, canMoveDown }) {
  return (
    <div className="absolute top-2 right-2 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-0.5 bg-white rounded-md shadow-md border border-gray-200 overflow-hidden">
        <button
          onClick={e => { e.stopPropagation(); onMoveUp(); }}
          disabled={!canMoveUp}
          className="p-1.5 text-xs hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
          title="Move up"
        >↑</button>
        <button
          onClick={e => { e.stopPropagation(); onMoveDown(); }}
          disabled={!canMoveDown}
          className="p-1.5 text-xs hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
          title="Move down"
        >↓</button>
        <div className="w-px h-4 bg-gray-200" />
        <button
          onClick={e => { e.stopPropagation(); onDuplicate(); }}
          className="p-1.5 text-xs hover:bg-gray-100 text-gray-600"
          title="Duplicate block"
        >⧉</button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 text-xs hover:bg-red-50 text-gray-400 hover:text-red-500"
          title="Delete block"
        >🗑</button>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function FunnelBuilder() {
  const { funnelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [funnel, setFunnel] = useState(null);
  const [steps, setSteps] = useState([]);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [device, setDevice] = useState('desktop');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'unsaved' | 'saving'
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [funnelName, setFunnelName] = useState('');
  const [editingName, setEditingName] = useState(false);

  const saveTimerRef = useRef(null);
  const brandId = user?.brand_id;

  // ── Load funnel data ──

  useEffect(() => {
    if (!brandId || !funnelId) return;
    loadFunnel();
  }, [brandId, funnelId]);

  const loadFunnel = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await funnelAPI.get(brandId, funnelId);
      const f = res.data.funnel || res.data;
      setFunnel(f);
      setFunnelName(f.name);
      const s = f.steps || [];
      setSteps(s);
      if (s.length > 0) {
        setBlocks(s[0].blocks || []);
        setActiveStepIdx(0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load funnel');
    } finally {
      setLoading(false);
    }
  };

  // ── Sync blocks when step changes ──

  const activeStep = steps[activeStepIdx];

  const switchStep = (idx) => {
    // Save current blocks into steps array before switching
    setSteps(prev => prev.map((s, i) => i === activeStepIdx ? { ...s, blocks } : s));
    setActiveStepIdx(idx);
    setBlocks(steps[idx]?.blocks || []);
    setSelectedBlockId(null);
  };

  // ── Auto-save (debounced) ──

  const triggerAutoSave = useCallback(() => {
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveCurrentStep();
    }, 2000);
  }, [activeStep, blocks, brandId, funnelId]);

  const saveCurrentStep = useCallback(async () => {
    if (!activeStep || !brandId) return;
    try {
      setSaving(true);
      setSaveStatus('saving');
      await funnelAPI.updateStep(brandId, funnelId, activeStep.id, { blocks });
      setSaveStatus('saved');
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSaveStatus('unsaved');
    } finally {
      setSaving(false);
    }
  }, [activeStep, blocks, brandId, funnelId]);

  // Trigger save when blocks change
  useEffect(() => {
    if (!loading && activeStep) {
      triggerAutoSave();
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [blocks]);

  // ── Publish / unpublish ──

  const togglePublish = async () => {
    if (!funnel) return;
    // Save first
    await saveCurrentStep();
    try {
      setPublishing(true);
      const newStatus = funnel.status === 'published' ? 'draft' : 'published';
      await funnelAPI.update(brandId, funnelId, { status: newStatus });
      setFunnel(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Publish failed:', err);
    } finally {
      setPublishing(false);
    }
  };

  // ── Rename funnel ──

  const renameFunnel = async () => {
    setEditingName(false);
    if (!funnelName.trim() || funnelName === funnel?.name) return;
    try {
      await funnelAPI.update(brandId, funnelId, { name: funnelName.trim() });
      setFunnel(prev => ({ ...prev, name: funnelName.trim() }));
    } catch (err) {
      setFunnelName(funnel?.name || '');
    }
  };

  // ── Step management ──

  const addStep = async () => {
    if (!brandId || !funnelId) return;
    try {
      const res = await funnelAPI.createStep(brandId, funnelId, { name: `Step ${steps.length + 1}` });
      const newStep = res.data.step || res.data;
      setSteps(prev => [...prev, newStep]);
      setActiveStepIdx(steps.length);
      setBlocks([]);
      setSelectedBlockId(null);
    } catch (err) {
      console.error('Failed to add step:', err);
    }
  };

  const deleteStep = async (idx) => {
    if (steps.length <= 1) {
      alert('A funnel must have at least one step.');
      return;
    }
    if (!confirm(`Delete step "${steps[idx].name}"? This cannot be undone.`)) return;
    try {
      await funnelAPI.deleteStep(brandId, funnelId, steps[idx].id);
      const next = steps.filter((_, i) => i !== idx);
      setSteps(next);
      const newIdx = Math.min(activeStepIdx, next.length - 1);
      setActiveStepIdx(newIdx);
      setBlocks(next[newIdx]?.blocks || []);
      setSelectedBlockId(null);
    } catch (err) {
      console.error('Failed to delete step:', err);
    }
  };

  const renameStep = async (idx, name) => {
    try {
      await funnelAPI.updateStep(brandId, funnelId, steps[idx].id, { name });
      setSteps(prev => prev.map((s, i) => i === idx ? { ...s, name } : s));
    } catch (err) {
      console.error('Failed to rename step:', err);
    }
  };

  // ── Block operations ──

  const addBlock = (type) => {
    const block = makeBlock(type);
    setBlocks(prev => [...prev, block]);
    setSelectedBlockId(block.id);
  };

  const updateBlock = (id, updatedBlock) => {
    setBlocks(prev => prev.map(b => b.id === id ? updatedBlock : b));
  };

  const deleteBlock = (id) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const duplicateBlock = (id) => {
    const original = blocks.find(b => b.id === id);
    if (!original) return;
    const copy = { ...original, id: uuidv4(), props: { ...original.props } };
    const idx = blocks.findIndex(b => b.id === id);
    setBlocks(prev => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
    setSelectedBlockId(copy.id);
  };

  const moveBlock = (id, direction) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (direction === 'up' && idx > 0) {
      const next = [...blocks];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      setBlocks(next);
    } else if (direction === 'down' && idx < blocks.length - 1) {
      const next = [...blocks];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      setBlocks(next);
    }
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  // ── Status indicator ──

  const statusColors = { saved: 'text-green-500', unsaved: 'text-yellow-500', saving: 'text-blue-500' };
  const statusLabels = { saved: 'Saved', unsaved: 'Unsaved changes', saving: 'Saving...' };

  // ── Render ──

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading funnel builder...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate('/funnels')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            Back to Funnels
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 flex items-center px-4 gap-3 h-14 z-30">
        {/* Back */}
        <button
          onClick={() => navigate('/funnels')}
          className="text-gray-400 hover:text-gray-600 mr-1"
          title="Back to Funnels"
        >←</button>

        {/* Funnel name */}
        {editingName ? (
          <input
            value={funnelName}
            onChange={e => setFunnelName(e.target.value)}
            onBlur={renameFunnel}
            onKeyDown={e => { if (e.key === 'Enter') renameFunnel(); if (e.key === 'Escape') { setFunnelName(funnel?.name || ''); setEditingName(false); } }}
            className="text-sm font-semibold text-gray-800 border-b border-blue-400 focus:outline-none bg-transparent min-w-0"
            style={{ maxWidth: 200 }}
            autoFocus
          />
        ) : (
          <span
            className="text-sm font-semibold text-gray-800 cursor-pointer hover:underline truncate max-w-[180px]"
            onDoubleClick={() => setEditingName(true)}
            title="Double-click to rename"
          >
            {funnel?.name || 'Untitled Funnel'}
          </span>
        )}

        <span className={`text-xs ${statusColors[saveStatus]} ml-1`}>{statusLabels[saveStatus]}</span>

        {/* Step tabs */}
        <div className="flex-1 flex items-end gap-0 overflow-x-auto ml-2">
          {steps.map((step, idx) => (
            <StepTab
              key={step.id}
              step={step}
              active={idx === activeStepIdx}
              onClick={() => idx !== activeStepIdx && switchStep(idx)}
              onDelete={() => deleteStep(idx)}
              onRename={name => renameStep(idx, name)}
            />
          ))}
          <button
            onClick={addStep}
            className="flex items-center px-2 py-2 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-t-lg transition-colors"
            title="Add step"
          >+ Step</button>
        </div>

        {/* Device toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setDevice('desktop')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${device === 'desktop' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            title="Desktop view"
          >🖥 Desktop</button>
          <button
            onClick={() => setDevice('mobile')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${device === 'mobile' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            title="Mobile view"
          >📱 Mobile</button>
        </div>

        {/* Manual save */}
        <button
          onClick={saveCurrentStep}
          disabled={saving || saveStatus === 'saved'}
          className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Save
        </button>

        {/* Publish */}
        <button
          onClick={togglePublish}
          disabled={publishing}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
            funnel?.status === 'published'
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {publishing ? 'Working...' : funnel?.status === 'published' ? '✓ Published' : 'Publish'}
        </button>

        {/* View live */}
        {funnel?.status === 'published' && funnel?.slug && (
          <a
            href={`/lp/${funnel.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
          >
            View Live ↗
          </a>
        )}
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Block Library ── */}
        <BlockLibrary onAdd={addBlock} />

        {/* ── Center: Preview ── */}
        <div className="flex-1 overflow-y-auto bg-gray-100 flex flex-col items-center py-6 px-4">
          {device === 'mobile' && (
            <p className="text-xs text-gray-400 mb-3">Mobile Preview (375px)</p>
          )}
          <div
            className={`bg-white shadow-lg rounded-sm overflow-hidden transition-all ${
              device === 'mobile' ? 'w-[375px]' : 'w-full max-w-5xl'
            }`}
            style={{ minHeight: 600 }}
          >
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center text-gray-400">
                <div className="text-5xl mb-4">🧱</div>
                <p className="text-base font-medium mb-1">Empty step</p>
                <p className="text-sm">Click a block type in the left sidebar to add it here.</p>
              </div>
            ) : (
              blocks.map((block, idx) => (
                <div
                  key={block.id}
                  className={`relative group ${selectedBlockId === block.id ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                  onClick={() => setSelectedBlockId(block.id)}
                >
                  <BlockControlBar
                    onMoveUp={() => moveBlock(block.id, 'up')}
                    onMoveDown={() => moveBlock(block.id, 'down')}
                    onDuplicate={() => duplicateBlock(block.id)}
                    onDelete={() => deleteBlock(block.id)}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < blocks.length - 1}
                  />
                  {/* Block type badge */}
                  {selectedBlockId === block.id && (
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-md shadow">
                      <span>{BLOCK_ICONS[block.type]}</span>
                      <span>{BLOCK_LABELS[block.type]}</span>
                    </div>
                  )}
                  <BlockRenderer
                    block={block}
                    isEditing={true}
                    isSelected={selectedBlockId === block.id}
                    onSelect={setSelectedBlockId}
                    onSubmit={null}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right: Block Editor ── */}
        <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
          {selectedBlock ? (
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{BLOCK_ICONS[selectedBlock.type]}</span>
                  <h3 className="text-sm font-semibold text-gray-800">{BLOCK_LABELS[selectedBlock.type]}</h3>
                </div>
                <button
                  onClick={() => setSelectedBlockId(null)}
                  className="text-gray-300 hover:text-gray-500 text-xs"
                >✕</button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                <BlockEditorPanel
                  block={selectedBlock}
                  onChange={updated => updateBlock(selectedBlock.id, updated)}
                />
              </div>
              <div className="p-3 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => duplicateBlock(selectedBlock.id)}
                  className="flex-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ⧉ Duplicate
                </button>
                <button
                  onClick={() => deleteBlock(selectedBlock.id)}
                  className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  🗑 Delete
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-6 text-gray-400">
              <div className="text-4xl mb-3">👆</div>
              <p className="text-sm font-medium">Select a block</p>
              <p className="text-xs mt-1">Click any block in the preview to edit its content and settings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
