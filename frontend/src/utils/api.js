import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nfhis_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error('API Error:', err.message);
    return Promise.reject(err);
  }
);

// ─── Auth ───────────────────────────────────────────
export const authAPI = {
  login: (username, password) => api.post('/api/auth/login', { username, password }),
  logout: () => api.post('/api/auth/logout'),
  getDemoCredentials: () => api.get('/api/auth/demo-credentials'),
};

// ─── Patients ───────────────────────────────────────
export const patientsAPI = {
  list: (params = {}) => api.get('/api/patients/', { params }),
  get: (id) => api.get(`/api/patients/${id}`),
  highGlucose: (threshold = 140) => api.get('/api/patients/query/high-glucose', { params: { threshold } }),
  stats: () => api.get('/api/patients/stats/summary'),
};

// ─── Predictions ────────────────────────────────────
export const predictionsAPI = {
  predict: (patientData) => api.post('/api/predictions/predict', patientData),
  history: (patientId) => api.get(`/api/predictions/history/${patientId}`),
  shapDemo: (disease) => api.get(`/api/predictions/shap-demo/${disease}`),
};

// ─── Federated Learning ─────────────────────────────
export const federatedAPI = {
  status: () => api.get('/api/federated/status'),
  rounds: (limit = 15) => api.get('/api/federated/rounds', { params: { limit } }),
  trustScores: () => api.get('/api/federated/trust-scores'),
  hospitalPerformance: () => api.get('/api/federated/hospital-performance'),
  triggerRound: () => api.post('/api/federated/run'),
};

// ─── Hospitals ──────────────────────────────────────
export const hospitalsAPI = {
  list: () => api.get('/api/hospitals/'),
  get: (id) => api.get(`/api/hospitals/${id}`),
  trustScore: (id) => api.get(`/api/hospitals/${id}/trust-score`),
  comparison: () => api.get('/api/hospitals/comparison/all'),
};

// ─── Alerts ─────────────────────────────────────────
export const alertsAPI = {
  list: (params = {}) => api.get('/api/alerts/', { params }),
  create: (alert) => api.post('/api/alerts/', alert),
  acknowledge: (id, data) => api.put(`/api/alerts/${id}/acknowledge`, data),
  negligenceReports: () => api.get('/api/alerts/negligence/reports'),
  doctorLogs: (params = {}) => api.get('/api/alerts/doctor-logs/all', { params }),
};

// ─── Doctors ────────────────────────────────────────
export const doctorsAPI = {
  list: (hospitalId) => api.get('/api/doctors/', { params: { hospital_id: hospitalId } }),
  get: (id) => api.get(`/api/doctors/${id}`),
  performance: (id) => api.get(`/api/doctors/${id}/performance`),
};

// ─── Analytics ──────────────────────────────────────
export const analyticsAPI = {
  summary: () => api.get('/api/analytics/summary'),
  diseaseTrends: () => api.get('/api/analytics/disease-trends'),
  stateHeatmap: () => api.get('/api/analytics/state-heatmap'),
  realtimeVitals: () => api.get('/api/analytics/realtime-vitals'),
};

export default api;
