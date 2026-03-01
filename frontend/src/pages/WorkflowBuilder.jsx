import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { workflowAPI, dripAPI } from '../services/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const NODE_W = 240;
const NODE_H = 80;
const V_GAP  = 160;
const H_OFF  = 280;
const CX     = 420;

const TRIGGER_LABELS = {
  lead_submitted:        'Lead form submitted',
  client_created:        'New client added',
  booking_made:          'Booking confirmed',
  manual:                'Manual trigger',
  pipeline_stage_changed:'Pipeline stage changed',
  deal_won:              'Deal won',
  deal_lost:             'Deal lost',
  invoice_paid:          'Invoice paid',
  proposal_accepted:     'Proposal accepted',
  tag_added:             'Tag added to client',
  churn_risk:            'Client churn risk detected',
};

const ACTION_TYPES = [
  { value: 'send_email',          label: 'Send Email',           icon: '✉️' },
  { value: 'send_sms',            label: 'Send SMS',             icon: '💬' },
  { value: 'create_task',         label: 'Create Task',          icon: '✅' },
  { value: 'add_tag',             label: 'Add Tag',              icon: '🏷️' },
  { value: 'remove_tag',          label: 'Remove Tag',           icon: '🗑️' },
  { value: 'move_pipeline_stage', label: 'Move Pipeline Stage',  icon: '📊' },
  { value: 'enroll_in_drip',      label: 'Enroll in Email Sequence', icon: '📧' },
  { value: 'create_note',         label: 'Create Note',          icon: '📝' },
  { value: 'send_webhook',        label: 'Send Webhook',         icon: '🔗' },
  { value: 'wait',                label: 'Wait / Delay',         icon: '⏳' },
];

const LOGIC_TYPES = [
  { value: 'condition', label: 'If / Else Condition', icon: '🔀' },
];

const CONDITION_FIELDS = [
  { value: 'email',          label: 'Email' },
  { value: 'phone',          label: 'Phone' },
  { value: 'status',         label: 'Status' },
  { value: 'client_type',    label: 'Client Type' },
  { value: 'company',        label: 'Company' },
  { value: 'tags',           label: 'Tags' },
  { value: 'pipeline_stage', label: 'Pipeline Stage' },
];

const CONDITION_OPS = [
  { value: 'exists',       label: 'Exists',       noValue: true },
  { value: 'not_exists',   label: 'Does not exist', noValue: true },
  { value: 'equals',       label: 'Equals' },
  { value: 'not_equals',   label: 'Does not equal' },
  { value: 'contains',     label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'has_tag',      label: 'Has tag' },
  { value: 'no_tag',       label: 'Does not have tag' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than',    label: 'Less than' },
];

// ── Auto-layout ───────────────────────────────────────────────────────────────

function computeLayout(nodes, connections) {
  if (!nodes.length) return nodes;
  const trigger = nodes.find(n => n.type === 'trigger') || nodes[0];
  const positioned = new Map();
  const queue = [{ id: trigger.id, x: CX, y: 0, branch: null }];

  while (queue.length) {
    const { id, x, y, branch } = queue.shift();
    if (positioned.has(id)) continue;
    positioned.set(id, { x, y });

    const outs = connections.filter(c => c.from === id);
    const node = nodes.find(n => n.id === id);
    if (node?.type === 'condition') {
      const yes = outs.find(c => c.branch === 'yes');
      const no  = outs.find(c => c.branch === 'no');
      if (yes) queue.push({ id: yes.to, x: x - H_OFF, y: y + V_GAP, branch: 'yes' });
      if (no)  queue.push({ id: no.to,  x: x + H_OFF, y: y + V_GAP, branch: 'no' });
    } else {
      outs.forEach(c => queue.push({ id: c.to, x, y: y + V_GAP, branch: null }));
    }
  }

  // Position any orphan nodes that weren't reached
  let orphanY = 0;
  return nodes.map(n => {
    const pos = positioned.get(n.id);
    if (pos) return { ...n, x: pos.x - NODE_W / 2, y: pos.y };
    const ox = CX - NODE_W / 2 + 40;
    orphanY += V_GAP;
    return { ...n, x: ox, y: orphanY };
  });
}

// ── Node helpers ──────────────────────────────────────────────────────────────

function nodeColor(type) {
  if (type === 'trigger')   return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20';
  if (type === 'condition') return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
  return 'border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600';
}

function nodeHeaderColor(type) {
  if (type === 'trigger')   return 'bg-blue-500 text-white';
  if (type === 'condition') return 'bg-yellow-400 text-gray-900';
  return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
}

function nodeLabel(node) {
  if (node.type === 'trigger') {
    return TRIGGER_LABELS[node.config?.trigger_type || node.trigger_type] || 'Trigger';
  }
  if (node.type === 'condition') return 'If / Else';
  return ACTION_TYPES.find(a => a.value === node.type)?.label || node.type;
}

function nodeIcon(node) {
  if (node.type === 'trigger')   return '⚡';
  if (node.type === 'condition') return '🔀';
  return ACTION_TYPES.find(a => a.value === node.type)?.icon || '▶';
}

function nodeSubtitle(node) {
  const c = node.config || {};
  if (node.type === 'trigger')   return TRIGGER_LABELS[c.trigger_type || node.trigger_type] || '';
  if (node.type === 'send_email') return c.subject ? `"${c.subject}"` : 'No subject set';
  if (node.type === 'send_sms')   return c.message ? c.message.slice(0, 40) : 'No message set';
  if (node.type === 'create_task') return c.title || 'Untitled task';
  if (node.type === 'add_tag')    return c.tag ? `Tag: ${c.tag}` : 'No tag set';
  if (node.type === 'remove_tag') return c.tag ? `Tag: ${c.tag}` : 'No tag set';
  if (node.type === 'move_pipeline_stage') return c.stage ? `Stage: ${c.stage}` : 'No stage set';
  if (node.type === 'enroll_in_drip')      return c.sequence_id ? 'Sequence selected' : 'No sequence set';
  if (node.type === 'create_note')         return c.body ? c.body.slice(0, 40) : 'No body set';
  if (node.type === 'send_webhook')        return c.url ? c.url.slice(0, 40) : 'No URL set';
  if (node.type === 'wait')                return c.delay_minutes ? `${c.delay_minutes} min delay` : '0 min delay';
  if (node.type === 'condition') {
    const op = CONDITION_OPS.find(o => o.value === c.operator);
    return `${c.field || '?'} ${op?.label || c.operator || '?'} ${op?.noValue ? '' : (c.value || '')}`.trim();
  }
  return '';
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── SVG Connections ───────────────────────────────────────────────────────────

function Connections({ nodes, connections }) {
  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
        </marker>
      </defs>
      {connections.map((conn, i) => {
        const from = nodes.find(n => n.id === conn.from);
        const to   = nodes.find(n => n.id === conn.to);
        if (!from || !to) return null;
        const x1 = from.x + NODE_W / 2;
        const y1 = from.y + NODE_H;
        const x2 = to.x + NODE_W / 2;
        const y2 = to.y;
        const cp1y = y1 + 60;
        const cp2y = y2 - 60;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        return (
          <g key={i}>
            <path
              d={`M ${x1} ${y1} C ${x1} ${cp1y}, ${x2} ${cp2y}, ${x2} ${y2}`}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={2}
              markerEnd="url(#arrow)"
            />
            {conn.branch && (
              <text x={midX} y={midY} textAnchor="middle" fontSize={11} fill={conn.branch === 'yes' ? '#16a34a' : '#dc2626'} fontWeight="600">
                {conn.branch.toUpperCase()}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Add Node Popover ──────────────────────────────────────────────────────────

function AddNodePopover({ onAdd, onClose }) {
  return (
    <div className="absolute z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 w-64 top-full mt-2 left-1/2 -translate-x-1/2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Actions</p>
      {ACTION_TYPES.map(t => (
        <button
          key={t.value}
          onClick={() => { onAdd(t.value); onClose(); }}
          className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
        >
          <span>{t.icon}</span> {t.label}
        </button>
      ))}
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 mt-3 uppercase tracking-wide">Logic</p>
      {LOGIC_TYPES.map(t => (
        <button
          key={t.value}
          onClick={() => { onAdd(t.value); onClose(); }}
          className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
        >
          <span>{t.icon}</span> {t.label}
        </button>
      ))}
      <button onClick={onClose} className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Cancel</button>
    </div>
  );
}

// ── Config Panel ──────────────────────────────────────────────────────────────

function ConfigPanel({ node, onChange, onClose, sequences }) {
  const c = node.config || {};
  const set = (key, val) => onChange({ ...node, config: { ...c, [key]: val } });
  const setTrigger = (key, val) => onChange({ ...node, [key]: val, config: { ...c, trigger_type: key === 'trigger_type' ? val : c.trigger_type } });

  const selectedOp = CONDITION_OPS.find(o => o.value === c.operator);

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{nodeLabel(node)}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
      </div>

      <div className="p-4 space-y-4 text-sm">
        {/* Delay (for non-trigger, non-condition) */}
        {node.type !== 'trigger' && node.type !== 'condition' && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Delay before this step (minutes)</label>
            <input
              type="number" min="0"
              value={node.delay_minutes || 0}
              onChange={e => onChange({ ...node, delay_minutes: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
        )}

        {/* TRIGGER config */}
        {node.type === 'trigger' && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Trigger event *</label>
            <select
              value={c.trigger_type || node.trigger_type || 'client_created'}
              onChange={e => onChange({ ...node, trigger_type: e.target.value, config: { ...c, trigger_type: e.target.value } })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            >
              {Object.entries(TRIGGER_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        )}

        {/* SEND EMAIL */}
        {node.type === 'send_email' && (<>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Subject</label>
            <input value={c.subject || ''} onChange={e => set('subject', e.target.value)} placeholder="e.g. Welcome, {{client.name}}!" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Body <span className="font-normal text-gray-400">(use {'{{client.name}}'}, {'{{client.email}}'})</span></label>
            <textarea value={c.body || ''} onChange={e => set('body', e.target.value)} rows={6} placeholder="Hi {{client.name}},&#10;&#10;Welcome!" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white resize-none" />
          </div>
        </>)}

        {/* SEND SMS */}
        {node.type === 'send_sms' && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Message</label>
            <textarea value={c.message || ''} onChange={e => set('message', e.target.value)} rows={4} placeholder="Hi! Just checking in..." className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white resize-none" />
          </div>
        )}

        {/* CREATE TASK */}
        {node.type === 'create_task' && (<>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Task title</label>
            <input value={c.title || ''} onChange={e => set('title', e.target.value)} placeholder="Follow up with client" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Due in (days)</label>
              <input type="number" min="1" value={c.due_days || 1} onChange={e => set('due_days', parseInt(e.target.value) || 1)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Priority</label>
              <select value={c.priority || 'normal'} onChange={e => set('priority', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </>)}

        {/* ADD/REMOVE TAG */}
        {(node.type === 'add_tag' || node.type === 'remove_tag') && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tag name</label>
            <input value={c.tag || ''} onChange={e => set('tag', e.target.value)} placeholder="e.g. hot-lead" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
        )}

        {/* MOVE PIPELINE STAGE */}
        {node.type === 'move_pipeline_stage' && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Stage name</label>
            <input value={c.stage || ''} onChange={e => set('stage', e.target.value)} placeholder="e.g. Proposal Sent" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
        )}

        {/* ENROLL IN DRIP */}
        {node.type === 'enroll_in_drip' && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email sequence</label>
            <select value={c.sequence_id || ''} onChange={e => set('sequence_id', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
              <option value="">— Select sequence —</option>
              {(sequences || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {/* CREATE NOTE */}
        {node.type === 'create_note' && (<>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Note title</label>
            <input value={c.title || ''} onChange={e => set('title', e.target.value)} placeholder="Automated note" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Body</label>
            <textarea value={c.body || ''} onChange={e => set('body', e.target.value)} rows={4} placeholder="Note content..." className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white resize-none" />
          </div>
        </>)}

        {/* SEND WEBHOOK */}
        {node.type === 'send_webhook' && (<>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Webhook URL</label>
            <input value={c.url || ''} onChange={e => set('url', e.target.value)} placeholder="https://hooks.example.com/..." className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="text-xs bg-gray-50 dark:bg-gray-700 rounded-lg p-3 font-mono text-gray-500 dark:text-gray-400">
            POST {'{'}event, entity, workflow_id, timestamp{'}'}
          </div>
        </>)}

        {/* CONDITION */}
        {node.type === 'condition' && (<>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Field</label>
            <select value={c.field || ''} onChange={e => set('field', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
              <option value="">— Select field —</option>
              {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Operator</label>
            <select value={c.operator || ''} onChange={e => set('operator', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
              <option value="">— Select operator —</option>
              {CONDITION_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {!selectedOp?.noValue && (
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Value</label>
              <input value={c.value || ''} onChange={e => set('value', e.target.value)} placeholder="Compare value" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
            Connect the <strong>YES</strong> and <strong>NO</strong> outputs from this node using the + buttons.
          </p>
        </>)}

        {/* WAIT */}
        {node.type === 'wait' && (
          <p className="text-xs text-gray-500 dark:text-gray-400">Use the <strong>Delay</strong> field above to set how long to wait before the next step runs.</p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WorkflowBuilder() {
  const { workflowId } = useParams();
  const { activeBrandId } = useAuth();
  const navigate = useNavigate();

  const [workflow, setWorkflow]         = useState(null);
  const [nodes, setNodes]               = useState([]);
  const [connections, setConnections]   = useState([]);
  const [selectedId, setSelectedId]     = useState(null);
  const [saving, setSaving]             = useState(false);
  const [dirty, setDirty]               = useState(false);
  const [addMenuFor, setAddMenuFor]     = useState(null); // { nodeId, branch }
  const [sequences, setSequences]       = useState([]);
  const [nameEdit, setNameEdit]         = useState(false);
  const [name, setName]                 = useState('');
  const nameRef = useRef(null);

  // Load workflow
  useEffect(() => {
    if (!activeBrandId || !workflowId) return;
    workflowAPI.get(activeBrandId, workflowId).then(res => {
      const wf = res.data.data.workflow;
      setWorkflow(wf);
      setName(wf.name);
      const def = wf.workflow_definition || { nodes: [], connections: [] };
      const laid = computeLayout(def.nodes || [], def.connections || []);
      setNodes(laid);
      setConnections(def.connections || []);
    }).catch(() => {});
  }, [activeBrandId, workflowId]);

  // Load drip sequences for the enroll_in_drip config
  useEffect(() => {
    if (!activeBrandId) return;
    dripAPI?.list?.(activeBrandId).then(r => setSequences(r.data?.data?.sequences || [])).catch(() => {});
  }, [activeBrandId]);

  // Dirty warning
  useEffect(() => {
    const handler = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const laidOut = useMemo(() => computeLayout(nodes, connections), [nodes, connections]);

  const canvasSize = useMemo(() => ({
    width:  Math.max(...(laidOut.map(n => n.x + NODE_W + 120)), 900),
    height: Math.max(...(laidOut.map(n => n.y + NODE_H + 120)), 600),
  }), [laidOut]);

  const selectedNode = laidOut.find(n => n.id === selectedId);

  const mark = (fn) => { fn(); setDirty(true); };

  const updateNode = useCallback((updated) => {
    mark(() => setNodes(ns => ns.map(n => n.id === updated.id ? { ...n, ...updated } : n)));
  }, []);

  const deleteNode = useCallback((id) => {
    if (nodes.find(n => n.id === id)?.type === 'trigger') return; // can't delete trigger
    mark(() => {
      setNodes(ns => ns.filter(n => n.id !== id));
      setConnections(cs => cs.filter(c => c.from !== id && c.to !== id));
      setSelectedId(s => s === id ? null : s);
    });
  }, [nodes]);

  const addNode = useCallback((type) => {
    const { nodeId, branch } = addMenuFor || {};
    const parentNode = laidOut.find(n => n.id === nodeId);
    const newId = 'n-' + uid();

    mark(() => {
      const newNode = { id: newId, type, config: {}, delay_minutes: 0, x: (parentNode?.x || CX - NODE_W / 2), y: (parentNode?.y || 0) + V_GAP };
      setNodes(ns => [...ns, newNode]);

      const newConn = { from: nodeId, to: newId };
      if (branch) newConn.branch = branch;
      setConnections(cs => [...cs, newConn]);

      // Condition nodes automatically get YES/NO wait nodes
      if (type === 'condition') {
        const yesId = 'n-' + uid();
        const noId  = 'n-' + uid();
        setNodes(ns => [...ns,
          { id: yesId, type: 'wait', config: {}, delay_minutes: 0, x: 0, y: 0 },
          { id: noId,  type: 'wait', config: {}, delay_minutes: 0, x: 0, y: 0 },
        ]);
        setConnections(cs => [...cs,
          { from: newId, to: yesId, branch: 'yes' },
          { from: newId, to: noId,  branch: 'no'  },
        ]);
      }

      setSelectedId(newId);
    });
  }, [addMenuFor, laidOut]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalNodes = computeLayout(nodes, connections);
      const triggerNode = finalNodes.find(n => n.type === 'trigger');
      const triggerType = triggerNode?.trigger_type || triggerNode?.config?.trigger_type || workflow?.trigger_type || 'client_created';
      await workflowAPI.update(activeBrandId, workflowId, {
        name,
        trigger_type: triggerType,
        workflow_definition: { nodes: finalNodes, connections },
      });
      setWorkflow(w => ({ ...w, name, trigger_type: triggerType }));
      setDirty(false);
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const handleToggleActive = async () => {
    try {
      const updated = await workflowAPI.update(activeBrandId, workflowId, { is_active: !workflow.is_active });
      setWorkflow(updated.data.data.workflow);
    } catch { /* silent */ }
  };

  if (!workflow) {
    return <div className="flex items-center justify-center h-screen text-gray-400">Loading workflow…</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          onClick={() => {
            if (dirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
            navigate('/automations');
          }}
          className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
        >
          ← Back
        </button>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

        {nameEdit ? (
          <input
            ref={nameRef}
            value={name}
            onChange={e => { setName(e.target.value); setDirty(true); }}
            onBlur={() => setNameEdit(false)}
            onKeyDown={e => e.key === 'Enter' && setNameEdit(false)}
            className="font-semibold text-gray-900 dark:text-white bg-transparent border-b border-blue-500 outline-none text-sm px-1"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setNameEdit(true)}
            className="font-semibold text-gray-900 dark:text-white text-sm hover:text-blue-600 dark:hover:text-blue-400"
          >
            {name}
          </button>
        )}

        {dirty && <span className="text-xs text-amber-500 font-medium">Unsaved</span>}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleToggleActive}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
              workflow.is_active
                ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-700 dark:text-yellow-300'
                : 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300'
            }`}
          >
            {workflow.is_active ? 'Pause' : 'Activate'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Body: Canvas + Config Panel */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 relative">
          <div style={{ width: canvasSize.width, height: canvasSize.height, position: 'relative' }}>
            <Connections nodes={laidOut} connections={connections} />

            {laidOut.map(node => (
              <div
                key={node.id}
                style={{ position: 'absolute', left: node.x, top: node.y, width: NODE_W }}
                onClick={() => setSelectedId(node.id === selectedId ? null : node.id)}
              >
                <div className={`border-2 rounded-xl shadow-sm cursor-pointer transition-shadow group ${nodeColor(node.type)} ${selectedId === node.id ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'}`}>
                  {/* Card header */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl ${nodeHeaderColor(node.type)}`}>
                    <span className="text-base leading-none">{nodeIcon(node)}</span>
                    <span className="text-xs font-semibold flex-1 truncate">{nodeLabel(node)}</span>
                    {node.type !== 'trigger' && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteNode(node.id); }}
                        className="opacity-0 group-hover:opacity-100 text-xs w-4 h-4 flex items-center justify-center rounded hover:bg-black/10"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Subtitle */}
                  <div className="px-3 py-2 min-h-[28px]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{nodeSubtitle(node) || '\u00A0'}</p>
                  </div>
                </div>

                {/* Add button(s) */}
                {node.type === 'condition' ? (
                  <div className="flex justify-around mt-2">
                    {['yes', 'no'].map(branch => {
                      const hasChild = connections.some(c => c.from === node.id && c.branch === branch);
                      if (hasChild) return null;
                      return (
                        <div key={branch} className="relative">
                          <button
                            onClick={e => { e.stopPropagation(); setAddMenuFor({ nodeId: node.id, branch }); }}
                            className={`text-xs px-3 py-1 rounded-full border font-semibold ${branch === 'yes' ? 'border-green-400 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                          >
                            + {branch.toUpperCase()}
                          </button>
                          {addMenuFor?.nodeId === node.id && addMenuFor?.branch === branch && (
                            <AddNodePopover onAdd={addNode} onClose={() => setAddMenuFor(null)} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex justify-center mt-2 relative">
                    {!connections.some(c => c.from === node.id) && (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); setAddMenuFor({ nodeId: node.id, branch: null }); }}
                          className="w-7 h-7 rounded-full border-2 border-blue-400 text-blue-600 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold text-lg leading-none"
                        >
                          +
                        </button>
                        {addMenuFor?.nodeId === node.id && addMenuFor?.branch == null && (
                          <AddNodePopover onAdd={addNode} onClose={() => setAddMenuFor(null)} />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Click-away to close menus */}
          {addMenuFor && (
            <div className="fixed inset-0 z-20" onClick={() => setAddMenuFor(null)} />
          )}
        </div>

        {/* Config panel */}
        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onChange={updateNode}
            onClose={() => setSelectedId(null)}
            sequences={sequences}
          />
        )}
      </div>
    </div>
  );
}
