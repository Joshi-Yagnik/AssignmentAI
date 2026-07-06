// ── Auth Context ──────────────────────────────────────────────────────────────
import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import { login as apiLogin, logout as apiLogout, getMe } from '../services/authService';

const TOKEN_KEY = 'aaai_token';
const USER_KEY  = 'aaai_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
    catch { return null; }
  });
  const [loading, setLoading] = useState(true); // true while verifying token on mount

  // ── Verify token on mount ────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    getMe()
      .then((u) => { setUser(u); localStorage.setItem(USER_KEY, JSON.stringify(u)); })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Listen for global 401 events ─────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    };
    window.addEventListener('aaai:unauthorized', handler);
    return () => window.removeEventListener('aaai:unauthorized', handler);
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password, role) => {
    const { token, user: u } = await apiLogin(email, password, role);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await apiLogout();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    role: user?.role ?? null,
    login,
    logout,
  }), [user, loading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
