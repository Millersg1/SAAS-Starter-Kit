import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAPI } from '../services/api';

/**
 * Command Palette (Ctrl+K) — fuzzy search + keyboard navigation.
 * Supports: navigation, search, and quick actions.
 */

const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Go to Dashboard', path: '/dashboard', section: 'Navigation', shortcut: 'G D', icon: '📊' },
  { id: 'clients', label: 'Go to Clients', path: '/clients', section: 'Navigation', shortcut: 'G C', icon: '👥' },
  { id: 'projects', label: 'Go to Projects', path: '/projects', section: 'Navigation', shortcut: 'G P', icon: '📁' },
  { id: 'invoices', label: 'Go to Invoices', path: '/invoices', section: 'Navigation', shortcut: 'G I', icon: '💰' },
  { id: 'pipeline', label: 'Go to Pipeline', path: '/pipeline', section: 'Navigation', shortcut: 'G L', icon: '📈' },
  { id: 'messages', label: 'Go to Messages', path: '/messages', section: 'Navigation', icon: '💬' },
  { id: 'tasks', label: 'Go to Tasks', path: '/tasks', section: 'Navigation', shortcut: 'G T', icon: '✅' },
  { id: 'calendar', label: 'Go to Calendar', path: '/calendar', section: 'Navigation', icon: '📅' },
  { id: 'analytics', label: 'Go to Analytics', path: '/analytics', section: 'Navigation', icon: '📉' },
  { id: 'documents', label: 'Go to Documents', path: '/documents', section: 'Navigation', icon: '📄' },
  { id: 'proposals', label: 'Go to Proposals', path: '/proposals', section: 'Navigation', icon: '📋' },
  { id: 'contracts', label: 'Go to Contracts', path: '/contracts', section: 'Navigation', icon: '📝' },
  { id: 'campaigns', label: 'Go to Campaigns', path: '/campaigns', section: 'Navigation', icon: '📣' },
  { id: 'automations', label: 'Go to Automations', path: '/automations', section: 'Navigation', icon: '⚡' },
  { id: 'settings', label: 'Go to Settings', path: '/settings', section: 'Navigation', shortcut: 'G S', icon: '⚙️' },
  { id: 'funnels', label: 'Go to Funnels', path: '/funnels', section: 'Navigation', icon: '🚀' },
  { id: 'cms', label: 'Go to CMS', path: '/cms', section: 'Navigation', icon: '🌐' },
  { id: 'social', label: 'Go to Social Media', path: '/social', section: 'Navigation', icon: '📲' },
  { id: 'tickets', label: 'Go to Tickets', path: '/tickets', section: 'Navigation', icon: '🎫' },
  { id: 'time', label: 'Go to Time Tracking', path: '/time', section: 'Navigation', icon: '⏱' },
];

const QUICK_ACTIONS = [
  { id: 'new-client', label: 'New Client', path: '/clients/new', section: 'Create', shortcut: 'N C', icon: '➕' },
  { id: 'new-project', label: 'New Project', path: '/projects/new', section: 'Create', shortcut: 'N P', icon: '➕' },
  { id: 'new-invoice', label: 'New Invoice', path: '/invoices/new', section: 'Create', icon: '➕' },
  { id: 'new-task', label: 'New Task', path: '/tasks?new=1', section: 'Create', icon: '➕' },
  { id: 'new-proposal', label: 'New Proposal', path: '/proposals?new=1', section: 'Create', icon: '➕' },
];

const CommandPalette = ({ brandId }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const searchTimerRef = useRef(null);
  const navigate = useNavigate();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Cmd+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        return;
      }
      // Escape to close
      if (e.key === 'Escape' && open) {
        setOpen(false);
        return;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
      setSearchResults([]);
    }
  }, [open]);

  // Filter items based on query
  const getFilteredItems = useCallback(() => {
    const q = query.toLowerCase().trim();
    const all = [...QUICK_ACTIONS, ...NAVIGATION_ITEMS];

    if (!q) return all;

    return all.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.section.toLowerCase().includes(q) ||
      (item.shortcut && item.shortcut.toLowerCase().includes(q))
    );
  }, [query]);

  // Server-side search for entities
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    if (query.trim().length < 2 || !brandId) {
      setSearchResults([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchAPI.globalSearch(brandId, query);
        const results = res.data.data?.results || {};
        const mapped = [];

        for (const [type, items] of Object.entries(results)) {
          for (const item of (items || []).slice(0, 3)) {
            mapped.push({
              id: `search-${type}-${item.id}`,
              label: item.name || item.subject || item.invoice_number || item.title,
              path: `/${type}/${item.id}`,
              section: 'Search Results',
              icon: type === 'clients' ? '👤' : type === 'projects' ? '📁' : type === 'invoices' ? '💰' : '📄',
              subtitle: item.email || item.company || item.status,
            });
          }
        }
        setSearchResults(mapped);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query, brandId]);

  const allItems = [...searchResults, ...getFilteredItems()];

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = allItems[selectedIndex];
      if (item) selectItem(item);
    }
  };

  const selectItem = (item) => {
    setOpen(false);
    if (item.path) navigate(item.path);
    if (item.action) item.action();
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  // Group items by section
  const sections = {};
  allItems.forEach((item, idx) => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push({ ...item, _idx: idx });
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 py-4 text-sm bg-transparent border-0 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
          {searching && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
          <kbd className="ml-2 px-2 py-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {allItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No results found. Try a different search.
            </div>
          ) : (
            Object.entries(sections).map(([section, items]) => (
              <div key={section}>
                <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {section}
                </div>
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => selectItem(item)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                      item._idx === selectedIndex
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                    onMouseEnter={() => setSelectedIndex(item._idx)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.subtitle && (
                          <span className="ml-2 text-xs text-gray-400">{item.subtitle}</span>
                        )}
                      </div>
                    </div>
                    {item.shortcut && (
                      <div className="flex gap-1">
                        {item.shortcut.split(' ').map((key, i) => (
                          <kbd key={i} className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">{key}</kbd>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd> Select</span>
            <span><kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">ESC</kbd> Close</span>
          </div>
          <span>{allItems.length} results</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
