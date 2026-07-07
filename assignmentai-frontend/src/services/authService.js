// ── Auth Service ─────────────────────────────────────────────────────────────
import api from './api';

/**
 * Login with email + password.
 * Backend returns: { token: string, user: { id, name, role } }
 */
export async function login(email, password, role) {
  const { data } = await api.post('/auth/login', {
    email,
    password,
    role: role.toLowerCase(),
  });
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
 * Returns: { id, name, role, email }
 */
export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

/**
 * Register a new account.
 * @param {{ name: string, email: string, password: string, role: string }} payload
 * Returns: { message, user, token }
 */
export async function signup({ name, email, password, role }) {
  const { data } = await api.post('/auth/signup', {
    name,
    email,
    password,
    role: role.toLowerCase(),
  });
  return data;
}

/**
 * Send a password-reset link to the given email.
 * @param {string} email
 * Returns: { message }
 */
export async function forgotPassword(email) {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

/**
 * Reset password using the token received via email.
 * @param {string} token  - JWT reset token from the reset link
 * @param {string} newPassword
 * Returns: { message }
 */
export async function resetPassword(token, newPassword) {
  const { data } = await api.post('/auth/reset-password', { token, newPassword });
  return data;
}
