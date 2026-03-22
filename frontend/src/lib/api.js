import axios from 'axios';
import { supabase } from './supabase';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// API methods
export const authApi = {
  getMe: () => api.get('/auth/me'),
};

export const streamsApi = {
  getAll: () => api.get('/streams'),
  getOne: (id) => api.get(`/streams/${id}`),
  create: (data) => api.post('/streams', data),
  update: (id, data) => api.put(`/streams/${id}`, data),
  delete: (id) => api.delete(`/streams/${id}`),
  toggle: (id) => api.post(`/streams/${id}/toggle`),
};

export const sentryApi = {
  getAll: () => api.get('/sentry'),
  create: (data) => api.post('/sentry', data),
  delete: (id) => api.delete(`/sentry/${id}`),
  check: (id) => api.post(`/sentry/${id}/check`),
};

export const pulseApi = {
  getLists: () => api.get('/pulse/lists'),
  createList: (data) => api.post('/pulse/lists', data),
  getContacts: (listId) => api.get(`/pulse/lists/${listId}/contacts`),
  addContact: (listId, data) => api.post(`/pulse/lists/${listId}/contacts`, data),
  getCampaigns: () => api.get('/pulse/campaigns'),
  createCampaign: (data) => api.post('/pulse/campaigns', data),
  sendCampaign: (id) => api.post(`/pulse/campaigns/${id}/send`),
};

export const hiveApi = {
  getAll: () => api.get('/hive'),
  getOne: (id) => api.get(`/hive/${id}`),
  create: (data) => api.post('/hive', data),
  delete: (id) => api.delete(`/hive/${id}`),
  activate: (id) => api.post(`/hive/${id}/activate`),
  deactivate: (id) => api.post(`/hive/${id}/deactivate`),
};

export const aiApi = {
  process: (data) => api.post('/ai/process', data),
  analyzeWebpage: (url) => api.post(`/ai/analyze-webpage?url=${encodeURIComponent(url)}`),
};

export const statsApi = {
  getDashboard: () => api.get('/stats'),
};

export default api;
