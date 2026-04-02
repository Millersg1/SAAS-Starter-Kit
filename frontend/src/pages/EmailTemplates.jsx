import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import Layout from '../components/Layout';

// TODO: Replace localStorage with API calls once backend table (email_templates) is created.
// Suggested endpoints: GET/POST /api/brands/:brandId/email-templates, PATCH/DELETE /api/brands/:brandId/email-templates/:id

const CATEGORIES = ['newsletter', 'promotion', 'follow-up', 'welcome', 'notification'];
const STORAGE_KEY = 'saas_email_templates';

const defaultTemplate = { name: '', subject: '', category: 'newsletter', html: '<h1>Hello {{name}}</h1>\n<p>Your content here...</p>' };

const loadTemplates = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } };
const saveTemplates = (t) => localStorage.setItem(STORAGE_KEY, JSON.stringify(t));

const EmailTemplates = () => {
  const [templates, setTemplates] = useState(loadTemplates);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...defaultTemplate });
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const previewRef = useRef(null);

  useEffect(() => { saveTemplates(templates); }, [templates]);

  const openNew = () => { setEditingId(null); setForm({ ...defaultTemplate }); setShowModal(true); };

  const openEdit = (tpl) => { setEditingId(tpl.id); setForm({ name: tpl.name, subject: tpl.subject, category: tpl.category, html: tpl.html }); setShowModal(true); };

  const handleSave = () => {
    if (!form.name.trim() || !form.subject.trim()) { toast.error('Name and subject are required'); return; }
    if (editingId) {
      setTemplates(prev => prev.map(t => t.id === editingId ? { ...t, ...form, updated_at: new Date().toISOString() } : t));
      toast.success('Template updated');
    } else {
      const newTpl = { id: crypto.randomUUID(), ...form, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      setTemplates(prev => [newTpl, ...prev]);
      toast.success('Template created');
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this template?')) return;
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success('Template deleted');
  };

  const handleDuplicate = (tpl) => {
    const dup = { ...tpl, id: crypto.randomUUID(), name: `${tpl.name} (Copy)`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setTemplates(prev => [dup, ...prev]);
    toast.success('Template duplicated');
  };

  const handleUse = (tpl) => {
    navigator.clipboard.writeText(tpl.html).then(() => toast.success('HTML copied to clipboard')).catch(() => toast.error('Failed to copy'));
  };

  const openPreview = (tpl) => { setPreviewHtml(tpl.html); setShowPreview(true); };

  const filtered = templates.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || t.category === filterCat;
    return matchSearch && matchCat;
  });

  const catColor = { newsletter: 'bg-blue-500/20 text-blue-400', promotion: 'bg-purple-500/20 text-purple-400', 'follow-up': 'bg-yellow-500/20 text-yellow-400', welcome: 'bg-green-500/20 text-green-400', notification: 'bg-orange-500/20 text-orange-400' };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Email Templates</h1>
            <p className="text-gray-400 text-sm mt-1">Create and manage reusable email templates</p>
          </div>
          <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Template</button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm flex-1" />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No templates found</p>
            <p className="text-sm mt-1">Create your first email template to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(tpl => (
              <div key={tpl.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3 hover:border-gray-600 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-medium truncate">{tpl.name}</h3>
                    <p className="text-gray-400 text-sm truncate">{tpl.subject}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs capitalize ml-2 shrink-0 ${catColor[tpl.category] || 'bg-gray-500/20 text-gray-400'}`}>{tpl.category}</span>
                </div>
                <div onClick={() => openPreview(tpl)} className="bg-gray-900 border border-gray-700 rounded-lg p-3 h-24 overflow-hidden cursor-pointer hover:border-gray-600 transition-colors">
                  <div className="text-gray-500 text-xs" dangerouslySetInnerHTML={{ __html: tpl.html.slice(0, 200) }} />
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-500 text-xs">{new Date(tpl.updated_at).toLocaleDateString()}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleUse(tpl)} className="text-green-400 hover:text-green-300 text-xs" title="Copy HTML">Use</button>
                    <button onClick={() => handleDuplicate(tpl)} className="text-purple-400 hover:text-purple-300 text-xs">Duplicate</button>
                    <button onClick={() => openEdit(tpl)} className="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
                    <button onClick={() => handleDelete(tpl.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-3xl space-y-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold text-white">{editingId ? 'Edit Template' : 'New Template'}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Template Name</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Welcome Email" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subject Line</label>
                <input type="text" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Welcome to {{brand_name}}!" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">HTML Content</label>
                  <textarea value={form.html} onChange={e => setForm({ ...form, html: e.target.value })} rows={12} className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm font-mono" placeholder="<h1>Hello</h1>" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Live Preview</label>
                  <div className="bg-white rounded-lg p-3 h-[282px] overflow-auto">
                    <div dangerouslySetInnerHTML={{ __html: form.html }} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2">Cancel</button>
                <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Save Template</button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-gray-800 font-semibold">Template Preview</h3>
                <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700 text-sm">Close</button>
              </div>
              <div ref={previewRef} dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EmailTemplates;
