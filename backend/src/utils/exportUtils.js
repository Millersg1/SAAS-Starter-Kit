/**
 * CSV Export Utility
 * Provides functions to export data to CSV format
 */

/**
 * Convert an array of objects to CSV format
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Column definitions with keys and labels
 * @returns {string} CSV string
 */
export const toCSV = (data, columns) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from columns or data keys
  const headers = columns 
    ? columns.map(col => col.label)
    : Object.keys(data[0]);

  const keys = columns
    ? columns.map(col => col.key)
    : Object.keys(data[0]);

  // Create header row
  const headerRow = headers.map(escapeCSVValue).join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return keys.map(key => {
      let value = row[key];
      
      // Handle nested objects
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      
      // Handle dates
      if (value instanceof Date) {
        value = value.toISOString();
      }
      
      return escapeCSVValue(value);
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

/**
 * Escape a value for CSV format
 * @param {any} value - Value to escape
 * @returns {string} Escaped value
 */
const escapeCSVValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Check if escaping is needed
  if (stringValue.includes(',') || 
      stringValue.includes('"') || 
      stringValue.includes('\n') ||
      stringValue.includes('\r')) {
    // Escape double quotes by doubling them
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return stringValue;
};

/**
 * Download CSV as a file
 * @param {string} csvContent - CSV content
 * @param {string} filename - Filename to download
 */
export const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Export clients to CSV
 * @param {Array} clients - Array of client objects
 * @returns {string} CSV string
 */
export const exportClientsToCSV = (clients) => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'company', label: 'Company' },
    { key: 'status', label: 'Status' },
    { key: 'client_type', label: 'Client Type' },
    { key: 'industry', label: 'Industry' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'country', label: 'Country' },
    { key: 'created_at', label: 'Created At' }
  ];
  
  return toCSV(clients, columns);
};

/**
 * Export invoices to CSV
 * @param {Array} invoices - Array of invoice objects
 * @returns {string} CSV string
 */
export const exportInvoicesToCSV = (invoices) => {
  const columns = [
    { key: 'invoice_number', label: 'Invoice #' },
    { key: 'client_name', label: 'Client' },
    { key: 'amount', label: 'Amount' },
    { key: 'currency', label: 'Currency' },
    { key: 'status', label: 'Status' },
    { key: 'issue_date', label: 'Issue Date' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'paid_date', label: 'Paid Date' }
  ];
  
  return toCSV(invoices, columns);
};

/**
 * Export projects to CSV
 * @param {Array} projects - Array of project objects
 * @returns {string} CSV string
 */
export const exportProjectsToCSV = (projects) => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
    { key: 'client_name', label: 'Client' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    { key: 'budget', label: 'Budget' },
    { key: 'created_at', label: 'Created At' }
  ];
  
  return toCSV(projects, columns);
};

/**
 * Export users to CSV
 * @param {Array} users - Array of user objects
 * @returns {string} CSV string
 */
export const exportUsersToCSV = (users) => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'email_verified', label: 'Email Verified' },
    { key: 'is_active', label: 'Active' },
    { key: 'last_login', label: 'Last Login' },
    { key: 'created_at', label: 'Created At' }
  ];
  
  return toCSV(users, columns);
};

/**
 * Export audit logs to CSV
 * @param {Array} logs - Array of audit log objects
 * @returns {string} CSV string
 */
export const exportAuditLogsToCSV = (logs) => {
  const columns = [
    { key: 'action', label: 'Action' },
    { key: 'entity_type', label: 'Entity Type' },
    { key: 'entity_id', label: 'Entity ID' },
    { key: 'description', label: 'Description' },
    { key: 'user_name', label: 'User' },
    { key: 'ip_address', label: 'IP Address' },
    { key: 'created_at', label: 'Timestamp' }
  ];
  
  return toCSV(logs, columns);
};

export default {
  toCSV,
  downloadCSV,
  exportClientsToCSV,
  exportInvoicesToCSV,
  exportProjectsToCSV,
  exportUsersToCSV,
  exportAuditLogsToCSV
};
