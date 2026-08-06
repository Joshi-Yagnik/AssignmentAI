// ── Axios Instance + Interceptors ────────────────────────────────────────────
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 s — Supabase can be slow on cold-start
  headers: { 'Content-Type': 'application/json' },
});

/** Lightweight instance for short-lived poll calls (status checks, etc.) */
export const apiQuick = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 s
  headers: { 'Content-Type': 'application/json' },
});

// ── Shared interceptor factories ──────────────────────────────────────────────
function attachAuthInterceptor(instance) {
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('aaai_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error),
  );
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('aaai_token');
        localStorage.removeItem('aaai_user');
        window.dispatchEvent(new CustomEvent('aaai:unauthorized'));
      }
      return Promise.reject(error);
    },
  );
}

attachAuthInterceptor(api);
attachAuthInterceptor(apiQuick);

/** Extract a human-readable error message from an axios error */
export function getErrorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.detail)  return error.response.data.detail;
  if (error.response?.data?.error)   return error.response.data.error;
  if (error.message) return error.message;
  return 'An unexpected error occurred.';
}

export default api;
