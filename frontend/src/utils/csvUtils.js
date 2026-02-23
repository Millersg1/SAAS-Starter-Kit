import Papa from 'papaparse';

/**
 * Download an array of objects as a CSV file.
 * @param {Object[]} rows - Array of flat objects
 * @param {string} filename - Output filename (should end in .csv)
 */
export function downloadCSV(rows, filename = 'export.csv') {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
