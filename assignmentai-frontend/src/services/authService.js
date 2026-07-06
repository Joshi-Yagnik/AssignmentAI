// ── Auth Service ─────────────────────────────────────────────────────────────
import api from './api';

/**
 * Login with email + password.
 * Backend should return: { token: string, user: { id, name, role, avatar, dept, rollNo? } }
 */
export async function login(email, password, role) {
  const { data } = await api.post('/auth/login', { email, password, role: role.toLowerCase() });
  return data; // { token, user }
}

/**
 * Logout — invalidates the token server-side.
 */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (_) {
    // Ignore errors on logout
  }
}

/**
 * Fetch the currently authenticated user using the stored token.
 */
export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data; // { id, name, role, avatar, dept, rollNo? }
}
