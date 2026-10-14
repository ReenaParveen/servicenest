import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    api.get('/auth/me')
      .then((response) => setUser(response.data.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(payload) {
      const response = await api.post('/auth/login', payload);
      setUser(response.data.data.user);
      return response.data.data.user;
    },
    async register(payload) {
      const response = await api.post('/auth/register', payload);
      setUser(response.data.data.user);
      return response.data.data.user;
    },
    async logout() {
      await api.post('/auth/logout');
      setUser(null);
    },
    async refresh() {
      const response = await api.get('/auth/me');
      setUser(response.data.data.user);
      return response.data.data.user;
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function homeForRole(role) {
  if (role === 'admin') return '/admin';
  if (role === 'provider') return '/provider';
  return '/dashboard';
}
