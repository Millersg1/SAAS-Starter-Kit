import axios from 'axios';

// API base URL - points to your backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
};

// User API calls
export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.patch('/users/me', data),
  updatePassword: (data) => api.patch('/auth/update-password', data),
  deleteAccount: () => api.delete('/users/me'),
};

// Brand API calls
export const brandAPI = {
  // Brand operations
  createBrand: (data) => api.post('/brands', data),
  getUserBrands: () => api.get('/brands'),
  getBrand: (brandId) => api.get(`/brands/${brandId}`),
  updateBrand: (brandId, data) => api.patch(`/brands/${brandId}`, data),
  deleteBrand: (brandId) => api.delete(`/brands/${brandId}`),
  
  // Member operations
  getBrandMembers: (brandId) => api.get(`/brands/${brandId}/members`),
  addBrandMember: (brandId, data) => api.post(`/brands/${brandId}/members`, data),
  updateBrandMember: (brandId, memberId, data) => api.patch(`/brands/${brandId}/members/${memberId}`, data),
  removeBrandMember: (brandId, memberId) => api.delete(`/brands/${brandId}/members/${memberId}`),
};

// Client API calls
export const clientAPI = {
  // Client operations
  createClient: (brandId, data) => api.post(`/clients/${brandId}`, data),
  getBrandClients: (brandId, params) => api.get(`/clients/${brandId}`, { params }),
  getClient: (brandId, clientId) => api.get(`/clients/${brandId}/${clientId}`),
  updateClient: (brandId, clientId, data) => api.patch(`/clients/${brandId}/${clientId}`, data),
  deleteClient: (brandId, clientId) => api.delete(`/clients/${brandId}/${clientId}`),
  
  // Statistics
  getClientStats: (brandId) => api.get(`/clients/${brandId}/stats`),
  
  // Assignment
  getAssignedClients: () => api.get('/clients/assigned'),
  
  // Portal access
  enablePortalAccess: (brandId, clientId, password) => api.post(`/clients/${brandId}/${clientId}/portal/enable`, { password }),
  disablePortalAccess: (brandId, clientId) => api.post(`/clients/${brandId}/${clientId}/portal/disable`),

  // Bulk CSV import
  importClients: (brandId, clients) => api.post(`/clients/${brandId}/import`, { clients }),
};

// Project API calls
export const projectAPI = {
  // Project operations
  createProject: (brandId, data) => api.post(`/projects/${brandId}`, data),
  getBrandProjects: (brandId, params) => api.get(`/projects/${brandId}`, { params }),
  getProject: (brandId, projectId) => api.get(`/projects/${brandId}/${projectId}`),
  updateProject: (brandId, projectId, data) => api.patch(`/projects/${brandId}/${projectId}`, data),
  deleteProject: (brandId, projectId) => api.delete(`/projects/${brandId}/${projectId}`),

  // Statistics
  getProjectStats: (brandId) => api.get(`/projects/${brandId}/stats`),

  // Assigned / client projects
  getUserProjects: () => api.get('/projects/assigned'),
  getClientProjects: (clientId) => api.get(`/projects/client/${clientId}`),

  // Project updates
  createProjectUpdate: (brandId, projectId, data) => api.post(`/projects/${brandId}/${projectId}/updates`, data),
  getProjectUpdates: (brandId, projectId) => api.get(`/projects/${brandId}/${projectId}/updates`),
  getProjectUpdate: (brandId, projectId, updateId) => api.get(`/projects/${brandId}/${projectId}/updates/${updateId}`),
  updateProjectUpdate: (brandId, projectId, updateId, data) => api.patch(`/projects/${brandId}/${projectId}/updates/${updateId}`, data),
  deleteProjectUpdate: (brandId, projectId, updateId) => api.delete(`/projects/${brandId}/${projectId}/updates/${updateId}`),
};

// Invoice API calls
export const invoiceAPI = {
  // Invoice CRUD
  createInvoice: (brandId, data) => api.post(`/invoices/${brandId}/invoices`, data),
  getBrandInvoices: (brandId, params) => api.get(`/invoices/${brandId}/invoices`, { params }),
  getInvoice: (brandId, invoiceId) => api.get(`/invoices/${brandId}/invoices/${invoiceId}`),
  updateInvoice: (brandId, invoiceId, data) => api.patch(`/invoices/${brandId}/invoices/${invoiceId}`, data),
  deleteInvoice: (brandId, invoiceId) => api.delete(`/invoices/${brandId}/invoices/${invoiceId}`),

  // Invoice items
  addInvoiceItem: (brandId, invoiceId, data) => api.post(`/invoices/${brandId}/invoices/${invoiceId}/items`, data),
  updateInvoiceItem: (brandId, invoiceId, itemId, data) => api.patch(`/invoices/${brandId}/invoices/${invoiceId}/items/${itemId}`, data),
  deleteInvoiceItem: (brandId, invoiceId, itemId) => api.delete(`/invoices/${brandId}/invoices/${invoiceId}/items/${itemId}`),

  // Payments
  recordPayment: (brandId, invoiceId, data) => api.post(`/invoices/${brandId}/invoices/${invoiceId}/payments`, data),
  getInvoicePayments: (brandId, invoiceId) => api.get(`/invoices/${brandId}/invoices/${invoiceId}/payments`),

  // Statistics & Reports
  getInvoiceStats: (brandId) => api.get(`/invoices/${brandId}/stats`),
  getOverdueInvoices: (brandId) => api.get(`/invoices/${brandId}/overdue`),
};

// Message API calls
export const messageAPI = {
  // Thread operations
  createThread: (brandId, data) => api.post(`/messages/${brandId}/threads`, data),
  getBrandThreads: (brandId, params) => api.get(`/messages/${brandId}/threads`, { params }),
  getThread: (brandId, threadId) => api.get(`/messages/${brandId}/threads/${threadId}`),
  updateThread: (brandId, threadId, data) => api.patch(`/messages/${brandId}/threads/${threadId}`, data),
  archiveThread: (brandId, threadId) => api.delete(`/messages/${brandId}/threads/${threadId}`),
  getThreadParticipants: (brandId, threadId) => api.get(`/messages/${brandId}/threads/${threadId}/participants`),

  // Message operations
  sendMessage: (brandId, threadId, data) => api.post(`/messages/${brandId}/threads/${threadId}/messages`, data),
  getThreadMessages: (brandId, threadId, params) => api.get(`/messages/${brandId}/threads/${threadId}/messages`, { params }),
  markMessageAsRead: (brandId, messageId) => api.patch(`/messages/${brandId}/messages/${messageId}/read`),
  markThreadAsRead: (brandId, threadId) => api.patch(`/messages/${brandId}/threads/${threadId}/read`),
  deleteMessage: (brandId, messageId) => api.delete(`/messages/${brandId}/messages/${messageId}`),

  // Search & utilities
  searchMessages: (brandId, query) => api.get(`/messages/${brandId}/search`, { params: { q: query } }),
  getUnreadCount: (brandId) => api.get(`/messages/${brandId}/unread`),
};

// Document API calls
export const documentAPI = {
  // Document operations
  uploadDocument: (brandId, formData) => api.post(`/documents/${brandId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getBrandDocuments: (brandId, params) => api.get(`/documents/${brandId}`, { params }),
  getDocument: (brandId, documentId) => api.get(`/documents/${brandId}/${documentId}`),
  updateDocument: (brandId, documentId, data) => api.patch(`/documents/${brandId}/${documentId}`, data),
  deleteDocument: (brandId, documentId) => api.delete(`/documents/${brandId}/${documentId}`),
  downloadDocument: (brandId, documentId) => api.get(`/documents/${brandId}/${documentId}/download`, { responseType: 'blob' }),
  getDocumentStats: (brandId) => api.get(`/documents/${brandId}/stats`),

  // Project & Client documents
  getProjectDocuments: (projectId) => api.get(`/documents/project/${projectId}`),
  getClientDocuments: (clientId) => api.get(`/documents/client/${clientId}`),

  // Sharing
  shareDocument: (brandId, documentId, data) => api.post(`/documents/${brandId}/${documentId}/share`, data),
  getDocumentShares: (brandId, documentId) => api.get(`/documents/${brandId}/${documentId}/shares`),
  updateDocumentShare: (brandId, documentId, shareId, data) => api.patch(`/documents/${brandId}/${documentId}/shares/${shareId}`, data),
  deleteDocumentShare: (brandId, documentId, shareId) => api.delete(`/documents/${brandId}/${documentId}/shares/${shareId}`),

  // Versions
  createDocumentVersion: (brandId, documentId, formData) => api.post(`/documents/${brandId}/${documentId}/versions`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getDocumentVersions: (brandId, documentId) => api.get(`/documents/${brandId}/${documentId}/versions`),
  getDocumentVersion: (brandId, documentId, versionId) => api.get(`/documents/${brandId}/${documentId}/versions/${versionId}`),
};

// Subscription API calls
export const subscriptionAPI = {
  // Plans (global, no brandId needed)
  getPlans: () => api.get('/subscriptions/plans'),
  getPlan: (planId) => api.get(`/subscriptions/plans/${planId}`),

  // Subscriptions
  createSubscription: (brandId, data) => api.post(`/subscriptions/${brandId}`, data),
  getSubscription: (brandId) => api.get(`/subscriptions/${brandId}`),
  updateSubscription: (brandId, data) => api.patch(`/subscriptions/${brandId}`, data),
  cancelSubscription: (brandId) => api.delete(`/subscriptions/${brandId}`),
  resumeSubscription: (brandId) => api.post(`/subscriptions/${brandId}/resume`),

  // Payment methods
  addPaymentMethod: (brandId, data) => api.post(`/subscriptions/${brandId}/payment-methods`, data),
  getPaymentMethods: (brandId) => api.get(`/subscriptions/${brandId}/payment-methods`),
  setDefaultPaymentMethod: (brandId, methodId) => api.patch(`/subscriptions/${brandId}/payment-methods/${methodId}/default`),
  deletePaymentMethod: (brandId, methodId) => api.delete(`/subscriptions/${brandId}/payment-methods/${methodId}`),

  // Billing
  getBillingHistory: (brandId) => api.get(`/subscriptions/${brandId}/billing-history`),
  getUpcomingInvoice: (brandId) => api.get(`/subscriptions/${brandId}/upcoming-invoice`),
};

export const notificationAPI = {
  getNotifications: (brandId) => api.get(`/notifications/${brandId}`),
  getUnreadCount: (brandId) => api.get(`/notifications/${brandId}/count`),
};

export const uploadAPI = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export const connectAPI = {
  getConnectStatus:     (brandId) => api.get(`/connect/${brandId}/status`),
  createOnboardingLink: (brandId) => api.post(`/connect/${brandId}/onboard`),
  handleReturn:         (brandId) => api.get(`/connect/${brandId}/return`),
};

export const proposalAPI = {
  getBrandProposals:   (brandId, params) => api.get(`/proposals/${brandId}`, { params }),
  createProposal:      (data) => api.post('/proposals', data),
  getProposal:         (proposalId) => api.get(`/proposals/item/${proposalId}`),
  updateProposal:      (proposalId, data) => api.patch(`/proposals/${proposalId}`, data),
  deleteProposal:      (proposalId) => api.delete(`/proposals/${proposalId}`),
  sendProposal:        (proposalId) => api.post(`/proposals/${proposalId}/send`),
  convertToInvoice:    (proposalId) => api.post(`/proposals/${proposalId}/convert`),
  addProposalItem:     (proposalId, data) => api.post(`/proposals/${proposalId}/items`, data),
  updateProposalItem:  (proposalId, itemId, data) => api.patch(`/proposals/${proposalId}/items/${itemId}`, data),
  deleteProposalItem:  (proposalId, itemId) => api.delete(`/proposals/${proposalId}/items/${itemId}`),
};

export const timeAPI = {
  getEntries:     (brandId, params) => api.get(`/time/${brandId}`, { params }),
  getActiveTimer: (brandId) => api.get(`/time/${brandId}/active-timer`),
  getProjectEntries: (projectId) => api.get(`/time/project/${projectId}`),
  createEntry:    (data) => api.post('/time', data),
  updateEntry:    (entryId, data) => api.patch(`/time/${entryId}`, data),
  deleteEntry:    (entryId) => api.delete(`/time/${entryId}`),
  addToInvoice:   (entryId, data) => api.post(`/time/${entryId}/add-to-invoice`, data),
};

export const auditAPI = {
  getLogs:  (brandId, params) => api.get(`/audit/${brandId}`, { params }),
  getStats: (brandId, params) => api.get(`/audit/${brandId}/stats`, { params }),
};

export const twoFactorAPI = {
  setup:   () => api.post('/auth/2fa/setup'),
  enable:  (data) => api.post('/auth/2fa/enable', data),
  disable: (data) => api.post('/auth/2fa/disable', data),
  verify:  (data) => api.post('/auth/2fa/verify', data),
};

export const publicInvoiceAPI = {
  getInvoice:    (token) => axios.get(`${API_BASE_URL}/public/invoice/${token}`),
  generateLink:  (brandId, invoiceId) => api.post(`/invoices/${brandId}/invoices/${invoiceId}/share-link`),
  pay:           (token) => axios.post(`${API_BASE_URL}/public/invoice/${token}/pay`),
};

export const portalProposalAPI = {
  getProposals:    () => api.get('/portal/proposals'),
  acceptProposal:  (proposalId, data) => api.post(`/portal/proposals/${proposalId}/accept`, data),
  rejectProposal:  (proposalId, data) => api.post(`/portal/proposals/${proposalId}/reject`, data),
};

export const clientActivityAPI = {
  getPortalActivity: (brandId) => api.get(`/clients/${brandId}/portal-activity`),
};

export const searchAPI = {
  globalSearch:    (brandId, q, type) => api.get(`/search/${brandId}`, { params: { q, type } }),
  getSuggestions:  (brandId, q) => api.get(`/search/${brandId}/suggestions`, { params: { q } }),
};

export const superadminAPI = {
  getStats:           ()        => api.get('/superadmin/stats'),
  getUsers:           ()        => api.get('/superadmin/users'),
  updateUser:         (id, data) => api.patch(`/superadmin/users/${id}`, data),
  deleteUser:         (id)      => api.delete(`/superadmin/users/${id}`),
  getBrands:          ()        => api.get('/superadmin/brands'),
  deleteBrand:        (id)      => api.delete(`/superadmin/brands/${id}`),
  getSubscriptions:   ()        => api.get('/superadmin/subscriptions'),
  updateSubscription: (id, data) => api.patch(`/superadmin/subscriptions/${id}`, data),
  getAuditLogs:       ()        => api.get('/superadmin/audit'),
  runFix:             (operation) => api.post('/superadmin/fix', { operation }),
};

export const pipelineAPI = {
  getDeals:   (brandId, params) => api.get(`/pipeline/${brandId}`, { params }),
  getSummary: (brandId)         => api.get(`/pipeline/${brandId}/summary`),
  createDeal: (brandId, data)   => api.post(`/pipeline/${brandId}`, data),
  updateDeal: (brandId, id, d)  => api.patch(`/pipeline/${brandId}/deals/${id}`, d),
  deleteDeal: (brandId, id)     => api.delete(`/pipeline/${brandId}/deals/${id}`),
};

export const activityAPI = {
  getClientActivities: (clientId)    => api.get(`/activities/client/${clientId}`),
  createActivity:      (clientId, d) => api.post(`/activities/client/${clientId}`, d),
  deleteActivity:      (id)          => api.delete(`/activities/${id}`),
};

export const taskAPI = {
  getBrandTasks: (brandId, p)      => api.get(`/tasks/${brandId}`, { params: p }),
  createTask:    (brandId, d)      => api.post(`/tasks/${brandId}`, d),
  updateTask:    (brandId, id, d)  => api.patch(`/tasks/${brandId}/${id}`, d),
  completeTask:  (brandId, id)     => api.post(`/tasks/${brandId}/${id}/complete`),
  deleteTask:    (brandId, id)     => api.delete(`/tasks/${brandId}/${id}`),
};

export const revenueAnalyticsAPI = {
  getRevenue:    (brandId) => api.get(`/analytics/${brandId}/revenue`),
  getConversion: (brandId) => api.get(`/analytics/${brandId}/conversion`),
  getPipeline:   (brandId) => api.get(`/analytics/${brandId}/pipeline`),
};

export const webhookAPI = {
  list:           (brandId)               => api.get(`/webhooks/endpoints/${brandId}`),
  create:         (brandId, data)         => api.post(`/webhooks/endpoints/${brandId}`, data),
  update:         (brandId, id, data)     => api.patch(`/webhooks/endpoints/${brandId}/${id}`, data),
  remove:         (brandId, id)           => api.delete(`/webhooks/endpoints/${brandId}/${id}`),
  getDeliveries:  (brandId, id)           => api.get(`/webhooks/endpoints/${brandId}/${id}/deliveries`),
};

export const aiAPI = {
  draftInvoice:  (brandId, data) => api.post(`/ai/${brandId}/draft-invoice`, data),
  draftProposal: (brandId, data) => api.post(`/ai/${brandId}/draft-proposal`, data),
};

export const contractAPI = {
  list:     (brandId, p)    => api.get(`/contracts/${brandId}`, { params: p }),
  get:      (brandId, id)   => api.get(`/contracts/${brandId}/${id}`),
  create:   (brandId, data) => api.post(`/contracts/${brandId}`, data),
  update:   (brandId, id, d)=> api.patch(`/contracts/${brandId}/${id}`, d),
  send:     (brandId, id)   => api.post(`/contracts/${brandId}/${id}/send`),
  remove:   (brandId, id)   => api.delete(`/contracts/${brandId}/${id}`),
};

export default api;
