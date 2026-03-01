import { useState, useEffect, useRef } from 'react';
import { cmsAPI } from '../services/api';

export default function MediaLibrary({ brandId, siteId, onSelect, mode = 'manager' }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(0);
  const fileInputRef = useRef();
  const PAGE_SIZE = 24;

  useEffect(() => { fetchMedia(); }, [brandId, siteId]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await cmsAPI.listMedia(brandId, siteId);
      setMedia(res.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleUpload = async (files) => {
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      if (siteId) formData.append('site_id', siteId);
      formData.append('alt_text', file.name.replace(/\.[^.]+$/, ''));
      try {
        const res = await cmsAPI.uploadMedia(brandId, formData);
        setMedia(prev => [res.data.data, ...prev]);
      } catch(e) { console.error('Upload failed:', e); }
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    handleUpload(files);
  };

  const handleDelete = async (id) => {
    try {
      await cmsAPI.deleteMedia(brandId, id);
      setMedia(prev => prev.filter(m => m.id !== id));
      setDeleteId(null);
    } catch(e) { alert('Delete failed: ' + e.message); }
  };

  const filtered = media.filter(m =>
    !search || (m.original_name || m.filename).toLowerCase().includes(search.toLowerCase())
  );
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Upload zone */}
      <div
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => handleUpload(Array.from(e.target.files))} />
        {uploading ? (
          <span className="text-sm text-blue-600">Uploading...</span>
        ) : (
          <span className="text-sm text-gray-500">📁 Drag & drop images here or click to upload</span>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search media..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(0); }}
        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />

      {/* Grid */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No media found. Upload some images above.</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {paged.map(item => (
            <div
              key={item.id}
              className={`relative group rounded-lg overflow-hidden border-2 bg-gray-100 dark:bg-gray-700 aspect-square ${
                mode === 'picker' ? 'cursor-pointer hover:border-blue-500 border-transparent' : 'border-transparent'
              }`}
              onClick={() => mode === 'picker' && onSelect?.(item)}
            >
              <img
                src={item.file_url.startsWith('/') ? `${import.meta.env.VITE_API_URL || ''}${item.file_url}` : item.file_url}
                alt={item.alt_text || item.filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                <div className="w-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs truncate">{item.original_name || item.filename}</p>
                  {item.file_size && <p className="text-white/70 text-xs">{formatSize(item.file_size)}</p>}
                </div>
              </div>
              {mode === 'manager' && (
                <button
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  onClick={e => { e.stopPropagation(); setDeleteId(item.id); }}
                >×</button>
              )}
              {mode === 'picker' && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">Select</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40">←</button>
          <span className="text-sm text-gray-600">{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40">→</button>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete media?</h3>
            <p className="text-sm text-gray-500 mb-4">This cannot be undone. The file will be permanently deleted.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
