import { useState, useEffect } from 'react';
import { portalAPI } from '../../services/portalApi';
import PortalLayout from '../../components/PortalLayout';

const CATEGORY_ICONS = {
  contract: '📜',
  proposal: '📝',
  invoice: '💰',
  report: '📊',
  design: '🎨',
  other: '📄',
};

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const PortalDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    portalAPI
      .getDocuments()
      .then((res) => setDocuments(res.data.data.documents || []))
      .catch((err) => console.error('Failed to load documents:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = documents.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PortalLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>

        {loading ? (
          <div className="text-gray-500 text-sm">Loading documents...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
            {search ? 'No documents match your search.' : 'No documents shared with you yet.'}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 hidden sm:table-cell">
                    Size
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 hidden lg:table-cell">
                    Uploaded
                  </th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {CATEGORY_ICONS[doc.category] || '📄'}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{doc.name}</p>
                          {doc.project_name && (
                            <p className="text-xs text-gray-400">{doc.project_name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 capitalize hidden md:table-cell">
                      {doc.category || 'Other'}
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">
                      {formatBytes(doc.file_size)}
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden lg:table-cell">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {doc.file_url ? (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-medium text-xs px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">No file</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default PortalDocuments;
