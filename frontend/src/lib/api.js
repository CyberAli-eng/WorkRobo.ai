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
  execute: (id, triggerData) => api.post(`/execute/stream/${id}`, { trigger_data: triggerData }),
  getSchedule: (id) => api.get(`/streams/${id}/schedule`),
  setSchedule: (id, cronExpression) => api.post(`/streams/${id}/schedule`, { cron_expression: cronExpression }),
  deleteSchedule: (id) => api.delete(`/streams/${id}/schedule`),
};

export const sentryApi = {
  getAll: () => api.get('/sentry'),
  create: (data) => api.post('/sentry', data),
  delete: (id) => api.delete(`/sentry/${id}`),
  check: (id) => api.post(`/sentry/${id}/check`),
  smartScrape: (data) => api.post('/execute/smart-scrape', data),
};

export const pulseApi = {
  getLists: () => api.get('/pulse/lists'),
  createList: (data) => api.post('/pulse/lists', data),
  getContacts: (listId) => api.get(`/pulse/lists/${listId}/contacts`),
  addContact: (listId, data) => api.post(`/pulse/lists/${listId}/contacts`, data),
  getCampaigns: () => api.get('/pulse/campaigns'),
  createCampaign: (data) => api.post('/pulse/campaigns', data),
  sendCampaign: (id) => api.post(`/pulse/campaigns/${id}/send`),
  sendEmail: (data) => api.post('/execute/send-email', data),
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
  process: (data) => api.post('/execute/ai-process', data),
  analyzeWebpage: (url) => api.post(`/ai/analyze-webpage?url=${encodeURIComponent(url)}`),
};

export const executeApi = {
  executeStream: (streamId, triggerData) => api.post(`/execute/stream/${streamId}`, triggerData),
  smartScrape: (data) => api.post('/execute/smart-scrape', data),
  aiProcess: (data) => api.post('/execute/ai-process', data),
  sendEmail: (data) => api.post('/execute/send-email', data),
  getExecutionLogs: (executionId) => api.get(`/execute/logs/${executionId}`),
  getActivityLogs: (limit = 20) => api.get(`/execute/activity?limit=${limit}`),
};

export const statsApi = {
  getDashboard: () => api.get('/stats'),
};

export const pingApi = {
  ping: () => api.get('/ping'),
};

export default api;
