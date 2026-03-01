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
  // Brand Voice Profile
  getBrandVoice: (brandId) => api.get(`/brands/${brandId}/voice`),
  updateBrandVoice: (brandId, data) => api.patch(`/brands/${brandId}/voice`, data),
  getBrands: () => api.get('/brands'),
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
  getBrandTags: (brandId) => api.get(`/clients/${brandId}/tags`),
  bulkTagClients: (brandId, data) => api.post(`/clients/${brandId}/bulk-tag`, data),
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
  // Pipeline management
  getPipelines:   (brandId)         => api.get(`/pipeline/${brandId}/pipelines`),
  createPipeline: (brandId, data)   => api.post(`/pipeline/${brandId}/pipelines`, data),
  updatePipeline: (brandId, id, d)  => api.patch(`/pipeline/${brandId}/pipelines/${id}`, d),
  deletePipeline: (brandId, id)     => api.delete(`/pipeline/${brandId}/pipelines/${id}`),
  // Deals
  getDeals:   (brandId, params) => api.get(`/pipeline/${brandId}`, { params }),
  getSummary: (brandId, params) => api.get(`/pipeline/${brandId}/summary`, { params }),
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
  getWorkload:   (brandId)         => api.get(`/tasks/${brandId}/workload/team`),
};

export const revenueAnalyticsAPI = {
  getRevenue:        (brandId)           => api.get(`/analytics/${brandId}/revenue`),
  getConversion:     (brandId)           => api.get(`/analytics/${brandId}/conversion`),
  getPipeline:       (brandId)           => api.get(`/analytics/${brandId}/pipeline`),
  getForecast:       (brandId)           => api.get(`/analytics/${brandId}/forecast`),
  healthScores:      (brandId)           => api.get(`/analytics/${brandId}/health-scores`),
  clientHealthScore: (brandId, clientId) => api.get(`/analytics/${brandId}/health-scores/${clientId}`),
};

export const webhookAPI = {
  list:           (brandId)               => api.get(`/webhooks/endpoints/${brandId}`),
  create:         (brandId, data)         => api.post(`/webhooks/endpoints/${brandId}`, data),
  update:         (brandId, id, data)     => api.patch(`/webhooks/endpoints/${brandId}/${id}`, data),
  remove:         (brandId, id)           => api.delete(`/webhooks/endpoints/${brandId}/${id}`),
  getDeliveries:  (brandId, id)           => api.get(`/webhooks/endpoints/${brandId}/${id}/deliveries`),
};

export const aiAPI = {
  draftInvoice:   (brandId, data)         => api.post(`/ai/${brandId}/draft-invoice`, data),
  draftProposal:  (brandId, data)         => api.post(`/ai/${brandId}/draft-proposal`, data),
  clientInsights: (brandId, clientId)     => api.get(`/ai/${brandId}/client-insights/${clientId}`),
};

export const contractAPI = {
  list:     (brandId, p)    => api.get(`/contracts/${brandId}`, { params: p }),
  get:      (brandId, id)   => api.get(`/contracts/${brandId}/${id}`),
  create:   (brandId, data) => api.post(`/contracts/${brandId}`, data),
  update:   (brandId, id, d)=> api.patch(`/contracts/${brandId}/${id}`, d),
  send:     (brandId, id)   => api.post(`/contracts/${brandId}/${id}/send`),
  remove:   (brandId, id)   => api.delete(`/contracts/${brandId}/${id}`),
};

export const callLogAPI = {
  list:       (brandId, p)       => api.get(`/call-logs/${brandId}`, { params: p }),
  getLogs:    (brandId, p)       => api.get(`/call-logs/${brandId}`, { params: p }),
  create:     (brandId, data)    => api.post(`/call-logs/${brandId}`, data),
  createLog:  (brandId, data)    => api.post(`/call-logs/${brandId}`, data),
  update:     (brandId, id, d)   => api.patch(`/call-logs/${brandId}/${id}`, d),
  updateLog:  (brandId, id, d)   => api.patch(`/call-logs/${brandId}/${id}`, d),
  remove:     (brandId, id)      => api.delete(`/call-logs/${brandId}/${id}`),
  deleteLog:  (brandId, id)      => api.delete(`/call-logs/${brandId}/${id}`),
};

export const calendarAPI = {
  getEvents:   (brandId, p)      => api.get(`/calendar/${brandId}`, { params: p }),
  createEvent: (brandId, data)   => api.post(`/calendar/${brandId}`, data),
  updateEvent: (brandId, id, d)  => api.patch(`/calendar/${brandId}/${id}`, d),
  deleteEvent: (brandId, id)     => api.delete(`/calendar/${brandId}/${id}`),
};

export const bookingAPI = {
  getPages:      (brandId)       => api.get(`/bookings/${brandId}/pages`),
  createPage:    (brandId, data) => api.post(`/bookings/${brandId}/pages`, data),
  updatePage:    (brandId, id, d)=> api.patch(`/bookings/${brandId}/pages/${id}`, d),
  deletePage:    (brandId, id)   => api.delete(`/bookings/${brandId}/pages/${id}`),
  getBookings:   (brandId)       => api.get(`/bookings/${brandId}`),
  getPublicPage: (slug)          => api.get(`/bookings/public/${slug}`),
  getSlots:      (slug, date)    => api.get(`/bookings/public/${slug}/slots`, { params: { date } }),
  createBooking: (slug, data)    => api.post(`/bookings/public/${slug}/book`, data),
  cancelBooking: (token)         => api.post(`/bookings/public/cancel/${token}`),
};

export const ticketAPI = {
  getTickets:   (brandId, p)       => api.get(`/tickets/${brandId}`, { params: p }),
  getTicket:    (brandId, id)      => api.get(`/tickets/${brandId}/${id}`),
  createTicket: (brandId, data)    => api.post(`/tickets/${brandId}`, data),
  updateTicket: (brandId, id, d)   => api.patch(`/tickets/${brandId}/${id}`, d),
  replyTicket:  (brandId, id, d)   => api.post(`/tickets/${brandId}/${id}/reply`, d),
  deleteTicket: (brandId, id)      => api.delete(`/tickets/${brandId}/${id}`),
};

export const leadFormAPI = {
  getForms:        (brandId)          => api.get(`/lead-forms/${brandId}`),
  createForm:      (brandId, data)    => api.post(`/lead-forms/${brandId}`, data),
  updateForm:      (brandId, id, d)   => api.patch(`/lead-forms/${brandId}/${id}`, d),
  deleteForm:      (brandId, id)      => api.delete(`/lead-forms/${brandId}/${id}`),
  getSubmissions:  (brandId, id, p)   => api.get(`/lead-forms/${brandId}/${id}/submissions`, { params: p }),
  getAllSubmissions:(brandId, p)       => api.get(`/lead-forms/${brandId}/submissions/all`, { params: p }),
  convertToClient: (brandId, subId)   => api.post(`/lead-forms/${brandId}/submissions/${subId}/convert`),
  getPublicForm:   (slug)             => api.get(`/lead-forms/view/${slug}`),
  submitForm:      (slug, data)       => api.post(`/lead-forms/submit/${slug}`, data),
};

export const campaignAPI = {
  getCampaigns:    (brandId)              => api.get(`/campaigns/${brandId}`),
  getCampaign:     (brandId, id)          => api.get(`/campaigns/${brandId}/${id}`),
  createCampaign:  (brandId, data)        => api.post(`/campaigns/${brandId}`, data),
  updateCampaign:  (brandId, id, d)       => api.patch(`/campaigns/${brandId}/${id}`, d),
  deleteCampaign:  (brandId, id)          => api.delete(`/campaigns/${brandId}/${id}`),
  addRecipients:   (brandId, id, d)       => api.post(`/campaigns/${brandId}/${id}/recipients`, d),
  sendCampaign:    (brandId, id)          => api.post(`/campaigns/${brandId}/${id}/send`),
  getVariants:     (brandId, id)          => api.get(`/campaigns/${brandId}/${id}/variants`),
  upsertVariant:   (brandId, id, name, d) => api.put(`/campaigns/${brandId}/${id}/variants/${name}`, d),
  deleteVariant:   (brandId, id, vid)     => api.delete(`/campaigns/${brandId}/${id}/variants/${vid}`),
  declareWinner:   (brandId, id, vid)     => api.post(`/campaigns/${brandId}/${id}/variants/${vid}/winner`),
};

export const emailConnectionAPI = {
  getConnections:    (brandId)        => api.get(`/email-connections/${brandId}`),
  createConnection:  (brandId, data)  => api.post(`/email-connections/${brandId}`, data),
  deleteConnection:  (brandId, id)    => api.delete(`/email-connections/${brandId}/${id}`),
  testConnection:    (brandId, id)    => api.post(`/email-connections/${brandId}/${id}/test`),
  syncNow:           (brandId, id)    => api.post(`/email-connections/${brandId}/${id}/sync`),
};

export const smsAPI = {
  getConnection:    (brandId)           => api.get(`/sms/${brandId}/connection`),
  saveConnection:   (brandId, data)     => api.post(`/sms/${brandId}/connection`, data),
  removeConnection: (brandId)           => api.delete(`/sms/${brandId}/connection`),
  getConversations: (brandId)           => api.get(`/sms/${brandId}/conversations`),
  getMessages:      (brandId, clientId) => api.get(`/sms/${brandId}/messages`, { params: clientId ? { client_id: clientId } : {} }),
  sendMessage:      (brandId, data)     => api.post(`/sms/${brandId}/send`, data),
};

export const smsBroadcastAPI = {
  list:   (brandId)         => api.get(`/sms/${brandId}/broadcasts`),
  create: (brandId, data)   => api.post(`/sms/${brandId}/broadcasts`, data),
  get:    (brandId, id)     => api.get(`/sms/${brandId}/broadcasts/${id}`),
  remove: (brandId, id)     => api.delete(`/sms/${brandId}/broadcasts/${id}`),
  send:   (brandId, id)     => api.post(`/sms/${brandId}/broadcasts/${id}/send`),
};

export const voipAPI = {
  initiateCall: (brandId, data) => api.post(`/voip/${brandId}/call`, data),
};

export const workflowAPI = {
  list:         (brandId)           => api.get(`/workflows/${brandId}`),
  get:          (brandId, id)       => api.get(`/workflows/${brandId}/${id}`),
  create:       (brandId, data)     => api.post(`/workflows/${brandId}`, data),
  update:       (brandId, id, d)    => api.patch(`/workflows/${brandId}/${id}`, d),
  remove:       (brandId, id)       => api.delete(`/workflows/${brandId}/${id}`),
  enrollments:  (brandId, id)       => api.get(`/workflows/${brandId}/${id}/enrollments`),
  manualEnroll: (brandId, id, data) => api.post(`/workflows/${brandId}/${id}/enroll`, data),
};

export const customFieldAPI = {
  list:    (brandId, entityType = 'client') => api.get(`/custom-fields/${brandId}`, { params: { entity_type: entityType } }),
  create:  (brandId, data) => api.post(`/custom-fields/${brandId}`, data),
  update:  (brandId, id, data) => api.patch(`/custom-fields/${brandId}/${id}`, data),
  remove:  (brandId, id) => api.delete(`/custom-fields/${brandId}/${id}`),
  reorder: (brandId, ids) => api.post(`/custom-fields/${brandId}/reorder`, { ids }),
};

export const enrichmentAPI = {
  enrich: (brandId, clientId) => api.post(`/enrichment/${brandId}/enrich/${clientId}`),
};

export const segmentAPI = {
  list:       (brandId)           => api.get(`/segments/${brandId}`),
  create:     (brandId, data)     => api.post(`/segments/${brandId}`, data),
  update:     (brandId, id, data) => api.patch(`/segments/${brandId}/${id}`, data),
  remove:     (brandId, id)       => api.delete(`/segments/${brandId}/${id}`),
  preview:    (brandId, filters)  => api.post(`/segments/${brandId}/preview`, { filter_config: filters }),
  getClients: (brandId, id)       => api.get(`/segments/${brandId}/${id}/clients`),
};

export const googleCalendarAPI = {
  getConnection: (brandId)  => api.get(`/google-calendar/${brandId}/connection`),
  initiateAuth:  (brandId)  => api.post(`/google-calendar/${brandId}/auth`),
  disconnect:    (brandId)  => api.delete(`/google-calendar/${brandId}/connection`),
  syncNow:       (brandId)  => api.post(`/google-calendar/${brandId}/sync`),
};

export const packagesAPI = {
  listPackages:   (brandId, params)              => api.get(`/packages/${brandId}/packages`, { params }),
  createPackage:  (brandId, data)                => api.post(`/packages/${brandId}/packages`, data),
  getPackage:     (brandId, id)                  => api.get(`/packages/${brandId}/packages/${id}`),
  updatePackage:  (brandId, id, data)            => api.patch(`/packages/${brandId}/packages/${id}`, data),
  deletePackage:  (brandId, id)                  => api.delete(`/packages/${brandId}/packages/${id}`),
  logUsage:       (brandId, id, data)            => api.post(`/packages/${brandId}/packages/${id}/usage`, data),
  getUsageHistory:(brandId, id, params)          => api.get(`/packages/${brandId}/packages/${id}/usage`, { params }),
};

export const clientReportAPI = {
  listReports:   (brandId, params)  => api.get(`/client-reports/${brandId}/reports`, { params }),
  generateReport:(brandId, data)    => api.post(`/client-reports/${brandId}/reports/generate`, data),
  getReport:     (brandId, id)      => api.get(`/client-reports/${brandId}/reports/${id}`),
  deleteReport:  (brandId, id)      => api.delete(`/client-reports/${brandId}/reports/${id}`),
};

export const reputationAPI = {
  getSettings:   (brandId)           => api.get(`/reputation/${brandId}/settings`),
  saveSettings:  (brandId, data)     => api.patch(`/reputation/${brandId}/settings`, data),
  getStats:      (brandId)           => api.get(`/reputation/${brandId}/stats`),
  listRequests:  (brandId, params)   => api.get(`/reputation/${brandId}/requests`, { params }),
  sendRequest:   (brandId, data)     => api.post(`/reputation/${brandId}/requests`, data),
  markCompleted: (brandId, id)       => api.patch(`/reputation/${brandId}/requests/${id}`),
  listReviews:   (brandId, params)   => api.get(`/reputation/${brandId}/reviews`, { params }),
  addReview:     (brandId, data)     => api.post(`/reputation/${brandId}/reviews`, data),
  updateReview:  (brandId, id, data) => api.patch(`/reputation/${brandId}/reviews/${id}`, data),
  deleteReview:  (brandId, id)       => api.delete(`/reputation/${brandId}/reviews/${id}`),
};

export const cmsAPI = {
  listSites:       (brandId)                    => api.get(`/cms/${brandId}/sites`),
  createSite:      (brandId, data)              => api.post(`/cms/${brandId}/sites`, data),
  updateSite:      (brandId, id, data)          => api.patch(`/cms/${brandId}/sites/${id}`, data),
  deleteSite:      (brandId, id)                => api.delete(`/cms/${brandId}/sites/${id}`),
  listPages:       (brandId, params)            => api.get(`/cms/${brandId}/pages`, { params }),
  createPage:      (brandId, data)              => api.post(`/cms/${brandId}/pages`, data),
  getPage:         (brandId, id)                => api.get(`/cms/${brandId}/pages/${id}`),
  updatePage:      (brandId, id, data)          => api.patch(`/cms/${brandId}/pages/${id}`, data),
  deletePage:      (brandId, id)                => api.delete(`/cms/${brandId}/pages/${id}`),
  listMedia:       (brandId, siteId)            => api.get(`/cms/${brandId}/media`, { params: { site_id: siteId } }),
  uploadMedia:     (brandId, formData)          => api.post(`/cms/${brandId}/media`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteMedia:     (brandId, id)                => api.delete(`/cms/${brandId}/media/${id}`),
  generateContent: (brandId, data)              => api.post(`/cms/${brandId}/ai-content`, data),
  // Version history
  listVersions:    (brandId, pageId)            => api.get(`/cms/${brandId}/pages/${pageId}/versions`),
  restoreVersion:  (brandId, pageId, versionId) => api.post(`/cms/${brandId}/pages/${pageId}/versions/${versionId}/restore`),
  // Content review
  sendForReview:   (brandId, pageId)            => api.post(`/cms/${brandId}/pages/${pageId}/send-for-review`),
};

export const socialAPI = {
  listAccounts:      (brandId)             => api.get(`/social/${brandId}/accounts`),
  connectAccount:    (brandId, data)       => api.post(`/social/${brandId}/accounts`, data),
  updateAccount:     (brandId, id, data)   => api.patch(`/social/${brandId}/accounts/${id}`, data),
  disconnectAccount: (brandId, id)         => api.delete(`/social/${brandId}/accounts/${id}`),
  listPosts:         (brandId, params)     => api.get(`/social/${brandId}/posts`, { params }),
  createPost:        (brandId, data)       => api.post(`/social/${brandId}/posts`, data),
  updatePost:        (brandId, id, data)   => api.patch(`/social/${brandId}/posts/${id}`, data),
  deletePost:        (brandId, id)         => api.delete(`/social/${brandId}/posts/${id}`),
  publishNow:        (brandId, id)         => api.post(`/social/${brandId}/posts/${id}/publish`),
  sendForReview:     (brandId, id)         => api.post(`/social/${brandId}/posts/${id}/send-for-review`),
  getCalendar:       (brandId, from, to)   => api.get(`/social/${brandId}/calendar`, { params: { from, to } }),
  getAnalytics:      (brandId, params)     => api.get(`/social/${brandId}/analytics`, { params }),
  generateCaption:   (brandId, data)       => api.post(`/social/${brandId}/ai-caption`, data),
};

export const funnelAPI = {
  list:          (brandId)                   => api.get(`/funnels/${brandId}`),
  create:        (brandId, data)             => api.post(`/funnels/${brandId}`, data),
  get:           (brandId, id)               => api.get(`/funnels/${brandId}/${id}`),
  update:        (brandId, id, data)         => api.patch(`/funnels/${brandId}/${id}`, data),
  delete:        (brandId, id)               => api.delete(`/funnels/${brandId}/${id}`),
  getStats:      (brandId, id)               => api.get(`/funnels/${brandId}/${id}/stats`),
  reorderSteps:  (brandId, id, ids)          => api.patch(`/funnels/${brandId}/${id}/reorder`, { ids }),
  createStep:    (brandId, fid, data)        => api.post(`/funnels/${brandId}/${fid}/steps`, data),
  updateStep:    (brandId, fid, sid, data)   => api.patch(`/funnels/${brandId}/${fid}/steps/${sid}`, data),
  deleteStep:    (brandId, fid, sid)         => api.delete(`/funnels/${brandId}/${fid}/steps/${sid}`),
  duplicateStep: (brandId, fid, sid)         => api.post(`/funnels/${brandId}/${fid}/steps/${sid}/duplicate`),
  publicView:    (fSlug, sSlug)              => api.get(sSlug ? `/funnels/view/${fSlug}/${sSlug}` : `/funnels/view/${fSlug}`),
  publicSubmit:  (stepId, data)              => api.post(`/funnels/submit/${stepId}`, data),
};

export const dripAPI = {
  list:           (brandId)                    => api.get(`/drip/${brandId}`),
  create:         (brandId, data)              => api.post(`/drip/${brandId}`, data),
  get:            (brandId, id)                => api.get(`/drip/${brandId}/${id}`),
  update:         (brandId, id, data)          => api.patch(`/drip/${brandId}/${id}`, data),
  delete:         (brandId, id)                => api.delete(`/drip/${brandId}/${id}`),
  getStats:       (brandId, id)                => api.get(`/drip/${brandId}/${id}/stats`),
  createStep:     (brandId, id, data)          => api.post(`/drip/${brandId}/${id}/steps`, data),
  updateStep:     (brandId, id, sid, data)     => api.patch(`/drip/${brandId}/${id}/steps/${sid}`, data),
  deleteStep:     (brandId, id, sid)           => api.delete(`/drip/${brandId}/${id}/steps/${sid}`),
  reorderSteps:   (brandId, id, ids)           => api.patch(`/drip/${brandId}/${id}/steps/reorder`, { ids }),
  getEnrollments: (brandId, id, params)        => api.get(`/drip/${brandId}/${id}/enrollments`, { params }),
  enroll:         (brandId, id, data)          => api.post(`/drip/${brandId}/${id}/enrollments`, data),
  unenroll:       (brandId, id, eid)           => api.delete(`/drip/${brandId}/${id}/enrollments/${eid}`),
};

export const chatWidgetAPI = {
  getSettings:    (brandId)           => api.get(`/chat-widget/${brandId}/settings`),
  saveSettings:   (brandId, data)     => api.patch(`/chat-widget/${brandId}/settings`, data),
  getSessions:    (brandId, params)   => api.get(`/chat-widget/${brandId}/sessions`, { params }),
  getSession:     (brandId, id)       => api.get(`/chat-widget/${brandId}/sessions/${id}`),
  closeSession:   (brandId, id)       => api.patch(`/chat-widget/${brandId}/sessions/${id}/close`),
  convertSession: (brandId, id)       => api.post(`/chat-widget/${brandId}/sessions/${id}/convert`),
  deleteSession:  (brandId, id)       => api.delete(`/chat-widget/${brandId}/sessions/${id}`),
  replyAsAgent:   (brandId, id, data) => api.post(`/chat-widget/${brandId}/sessions/${id}/reply`, data),
};

export default api;
