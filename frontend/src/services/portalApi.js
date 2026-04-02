import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const portalApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach portal token on every request
portalApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('portal_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Redirect to portal login on 401
portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('portal_token');
      localStorage.removeItem('portal_client');
      localStorage.removeItem('portal_brand');
      window.location.href = '/portal/login';
    }
    return Promise.reject(error);
  }
);

export const portalAuthAPI = {
  login: (data) => portalApi.post('/portal/login', data),
};

export const portalAPI = {
  getMe: () => portalApi.get('/portal/me'),
  getProjects: () => portalApi.get('/portal/projects'),
  getDocuments: () => portalApi.get('/portal/documents'),
  getInvoices: () => portalApi.get('/portal/invoices'),
  getMessages: () => portalApi.get('/portal/messages'),
  getThread: (threadId) => portalApi.get(`/portal/messages/${threadId}`),
  sendMessage: (threadId, content) =>
    portalApi.post(`/portal/messages/${threadId}`, { content }),
  createPaymentCheckout: (invoiceId) =>
    portalApi.post(`/portal/invoices/${invoiceId}/pay`),
  signInvoice: (invoiceId, data) =>
    portalApi.post(`/portal/invoices/${invoiceId}/sign`, data),
  getProposals: () => portalApi.get('/portal/proposals'),
  acceptProposal: (proposalId, data) =>
    portalApi.post(`/portal/proposals/${proposalId}/accept`, data),
  rejectProposal: (proposalId, data) =>
    portalApi.post(`/portal/proposals/${proposalId}/reject`, data),
  getContracts: () => portalApi.get('/portal/contracts'),
  getContract: (contractId) => portalApi.get(`/portal/contracts/${contractId}`),
  signContract: (contractId, data) => portalApi.post(`/portal/contracts/${contractId}/sign`, data),
  getVoiceAgents: () => portalApi.get('/portal/voice-agents'),
  requestVoiceAgentCall: (agentId, data) => portalApi.post(`/portal/voice-agents/${agentId}/request-call`, data),
  getVoiceAgentCalls: () => portalApi.get('/portal/voice-agent-calls'),
};

export default portalApi;
