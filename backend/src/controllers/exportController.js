import { getBrandClients } from '../models/clientModel.js';
import { getBrandProjects } from '../models/projectModel.js';
import { getBrandInvoices } from '../models/invoiceModel.js';
import { getBrandTasks } from '../models/taskModel.js';
import { getThreadMessages, getBrandThreads } from '../models/messageModel.js';
import { getBrandMember } from '../models/brandModel.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects
 * @param {Array} fields - Array of field names to include
 */
const toCSV = (data, fields) => {
  if (!data || data.length === 0) return '';
  
  const header = fields.join(',');
  const rows = data.map(item => {
    return fields.map(field => {
      let value = item[field];
      
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      
      // Handle dates
      if (value instanceof Date) {
        value = value.toISOString();
      }
      
      // Handle objects/arrays - convert to JSON string
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });
  
  return [header, ...rows].join('\n');
};

/**
 * GET /api/export/clients/:brandId
 * Export clients to CSV
 */
export const exportClients = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const clients = await getBrandClients(brandId);
  
  const fields = [
    'id', 'name', 'email', 'phone', 'company', 'status', 
    'address', 'city', 'state', 'zip', 'country',
    'lead_source', 'assigned_to', 'tags', 'notes',
    'created_at', 'updated_at'
  ];
  
  const csv = toCSV(clients, fields);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="clients-${brandId}-${Date.now()}.csv"`);
  res.send(csv);
});

/**
 * GET /api/export/projects/:brandId
 * Export projects to CSV
 */
export const exportProjects = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const projects = await getBrandProjects(brandId);
  
  const fields = [
    'id', 'name', 'description', 'status', 'client_id', 
    'budget', 'start_date', 'due_date', 'completed_at',
    'created_by', 'created_at', 'updated_at'
  ];
  
  const csv = toCSV(projects, fields);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="projects-${brandId}-${Date.now()}.csv"`);
  res.send(csv);
});

/**
 * GET /api/export/invoices/:brandId
 * Export invoices to CSV
 */
export const exportInvoices = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const invoices = await getBrandInvoices(brandId);
  
  const fields = [
    'id', 'invoice_number', 'client_id', 'status', 'subtotal',
    'tax', 'total', 'due_date', 'paid_at', 'payment_method',
    'notes', 'created_at', 'updated_at'
  ];
  
  const csv = toCSV(invoices, fields);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="invoices-${brandId}-${Date.now()}.csv"`);
  res.send(csv);
});

/**
 * GET /api/export/tasks/:brandId
 * Export tasks to CSV
 */
export const exportTasks = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const tasks = await getBrandTasks(brandId);
  
  const fields = [
    'id', 'title', 'description', 'status', 'priority',
    'client_id', 'project_id', 'assigned_to', 'due_date',
    'completed_at', 'created_by', 'created_at', 'updated_at'
  ];
  
  const csv = toCSV(tasks, fields);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="tasks-${brandId}-${Date.now()}.csv"`);
  res.send(csv);
});

/**
 * GET /api/export/messages/:brandId
 * Export messages to CSV
 */
export const exportMessages = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  const threads = await getBrandThreads(brandId);
  
  // Get all messages for each thread
  const messagesData = [];
  for (const thread of threads) {
    const messages = await getThreadMessages(thread.id);
    messages.forEach(msg => {
      messagesData.push({
        thread_id: thread.id,
        thread_subject: thread.subject,
        ...msg
      });
    });
  }
  
  const fields = [
    'id', 'thread_id', 'thread_subject', 'sender_type', 
    'sender_id', 'body', 'is_read', 'created_at'
  ];
  
  const csv = toCSV(messagesData, fields);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="messages-${brandId}-${Date.now()}.csv"`);
  res.send(csv);
});

/**
 * POST /api/export/:brandId/custom
 * Export custom data to CSV
 */
export const exportCustom = catchAsync(async (req, res, next) => {
  const { brandId } = req.params;
  const { entity, fields, filters } = req.body;
  
  const member = await getBrandMember(brandId, req.user.id);
  if (!member) return next(new AppError('Access denied', 403));

  if (!entity || !fields || !Array.isArray(fields)) {
    return next(new AppError('Entity and fields are required', 400));
  }

  let data = [];
  
  switch (entity) {
    case 'clients':
      data = await getBrandClients(brandId);
      break;
    case 'projects':
      data = await getBrandProjects(brandId);
      break;
    case 'invoices':
      data = await getBrandInvoices(brandId);
      break;
    case 'tasks':
      data = await getBrandTasks(brandId);
      break;
    default:
      return next(new AppError('Invalid entity type', 400));
  }

  // Filter data based on filters object
  if (filters && typeof filters === 'object') {
    data = data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        return item[key] === value;
      });
    });
  }

  // Select only requested fields
  data = data.map(item => {
    const filtered = {};
    fields.forEach(field => {
      filtered[field] = item[field];
    });
    return filtered;
  });
  
  const csv = toCSV(data, fields);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${entity}-${brandId}-${Date.now()}.csv"`);
  res.send(csv);
});
