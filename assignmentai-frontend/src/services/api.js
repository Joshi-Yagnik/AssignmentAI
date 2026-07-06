// ── Axios Instance + Interceptors ────────────────────────────────────────────
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: attach JWT ───────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aaai_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response: handle 401 globally ────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('aaai_token');
      localStorage.removeItem('aaai_user');
      // Signal app to redirect to login
      window.dispatchEvent(new CustomEvent('aaai:unauthorized'));
    }
    return Promise.reject(error);
  },
);

/** Extract a human-readable error message from an axios error */
export function getErrorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.detail)  return error.response.data.detail;
  if (error.message) return error.message;
  return 'An unexpected error occurred.';
}

export default api;
