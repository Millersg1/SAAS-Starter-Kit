import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { clientAPI } from '../services/api';

const MAPPABLE_FIELDS = [
  { key: 'name',    label: 'Name *' },
  { key: 'email',   label: 'Email *' },
  { key: 'phone',   label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'address', label: 'Address' },
  { key: 'city',    label: 'City' },
  { key: 'state',   label: 'State' },
  { key: 'country', label: 'Country' },
];

export default function ImportClientsModal({ brandId, onClose, onImported }) {
  const [step, setStep] = useState('upload');   // 'upload' | 'map' | 'result'
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});   // { fieldKey: csvColumn }
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        if (!data.length) { setError('The CSV file is empty.'); return; }
        setHeaders(meta.fields || []);
        setRows(data);
        // Auto-map columns whose header matches a known field key (case-insensitive)
        const autoMap = {};
        MAPPABLE_FIELDS.forEach(({ key }) => {
          const match = (meta.fields || []).find(
            (h) => h.toLowerCase().replace(/[^a-z]/g, '') === key
          );
          if (match) autoMap[key] = match;
        });
        setMapping(autoMap);
        setStep('map');
      },
      error: () => setError('Could not parse the CSV file. Please check the format.'),
    });
  };

  const handleImport = async () => {
    if (!mapping.name || !mapping.email) {
      setError('You must map at least the Name and Email columns.');
      return;
    }
    setImporting(true);
    setError('');
    try {
      const clients = rows.map((row) => {
        const client = {};
        MAPPABLE_FIELDS.forEach(({ key }) => {
          if (mapping[key]) client[key] = row[mapping[key]] || '';
        });
        return client;
      });
      const res = await clientAPI.importClients(brandId, clients);
      setResult(res.data.data);
      setStep('result');
      if (onImported) onImported();
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import Clients from CSV</h2>
            <p className="text-sm text-gray-500">
              {step === 'upload' && 'Upload a .csv file with client data'}
              {step === 'map' && `${rows.length} rows detected — map columns below`}
              {step === 'result' && 'Import complete'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-4xl mb-3">📂</div>
              <p className="text-gray-700 font-medium">Click to choose a CSV file</p>
              <p className="text-gray-400 text-sm mt-1">
                Required columns: name, email — Optional: phone, company, address, city, state, country
              </p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </div>
          )}

          {/* Step 2: Column mapping */}
          {step === 'map' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {MAPPABLE_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <select
                      value={mapping[key] || ''}
                      onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— skip —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Preview (first 3 rows)</p>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="text-xs w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {MAPPABLE_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                          <th key={f.key} className="px-3 py-2 text-left font-medium text-gray-600">{f.label.replace(' *','')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          {MAPPABLE_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                            <td key={f.key} className="px-3 py-2 text-gray-700 truncate max-w-xs">
                              {row[mapping[f.key]] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 'result' && result && (
            <div className="space-y-4 text-center">
              <div className="text-5xl">{result.created > 0 ? '✅' : '⚠️'}</div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">{result.created} clients imported</p>
                {result.skipped > 0 && (
                  <p className="text-gray-500 text-sm">{result.skipped} rows skipped (missing name/email or duplicate)</p>
                )}
                {result.errors?.length > 0 && (
                  <p className="text-red-500 text-sm">{result.errors.length} errors — first: {result.errors[0]?.error}</p>
                )}
              </div>
              <button onClick={onClose} className="px-8 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700">
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'map' && (
          <div className="px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
            <button
              onClick={handleImport}
              disabled={importing || !mapping.name || !mapping.email}
              className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${rows.length} client${rows.length !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => { setStep('upload'); setHeaders([]); setRows([]); setMapping({}); }}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
