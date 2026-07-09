import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';
const API = axios.create({ baseURL: BASE_URL });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      // Ne pas faire de rechargement complet (window.location.href) : ça entrait en
      // conflit avec la navigation React Router déclenchée en parallèle par les pages
      // elles-mêmes, causant des comportements erratiques (double redirection, crash
      // de rendu). On notifie juste AuthContext, qui met à jour l'état proprement ;
      // les pages protégées redirigent ensuite via leur propre effet React existant.
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(err);
  }
);

export const authService = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  me: () => API.get('/auth/me'),
};

export const tenderService = {
  list: (params) => API.get('/tenders', { params }),
  get: (id) => API.get(`/tenders/${id}`),
  downloadPdf: (id, docType) => API.get(`/tenders/${id}/download/${docType}`, { responseType: 'blob' }),
};

export const chatService = {
  ask: (question, conversation_id) => API.post('/chat', { question, conversation_id }),
  history: (limit = 30) => API.get('/chat/history', { params: { limit } }),
  deleteConv: (conv_id) => API.delete(`/chat/history/${conv_id}`),
  feedback: (message_id, score) => API.post(`/chat/feedback/${message_id}`, null, { params: { score } }),
};

export const dashboardService = {
  full: () => API.get('/dashboard'),
  stats: () => API.get('/dashboard/stats'),
};

export const alertService = {
  list: () => API.get('/alerts'),
  create: (data) => API.post('/alerts', data),
  toggle: (id) => API.patch(`/alerts/${id}/toggle`),
  remove: (id) => API.delete(`/alerts/${id}`),
};

export const profileService = {
  update: (data) => API.patch('/auth/me', data),
  changePassword: (data) => API.post('/auth/change-password', data),
};

export const documentService = {
  types: () => API.get('/documents/types'),
  list: () => API.get('/documents'),
  generate: (data) => API.post('/documents', data),
  get: (id) => API.get(`/documents/${id}`),
  update: (id, data) => API.patch(`/documents/${id}`, data),
  remove: (id) => API.delete(`/documents/${id}`),
  download: (id) => API.get(`/documents/${id}/download`, { responseType: 'blob' }),
};

export const reclamationService = {
  types: () => API.get('/reclamations/types'),
  submit: (data) => API.post('/reclamations', data),
  list: () => API.get('/reclamations/mes-reclamations'),
  get: (id) => API.get(`/reclamations/${id}`),
};

export const adminService = {
  reclamations: (params) => API.get('/reclamations/admin/toutes', { params }),
  updateReclamation: (id, data) => API.patch(`/reclamations/${id}`, data),
  users: (params) => API.get('/admin/users', { params }),
  usersCount: () => API.get('/admin/users/count'),
  setUserActive: (id, is_active) => API.patch(`/admin/users/${id}/active`, null, { params: { is_active } }),
};

export default API;
