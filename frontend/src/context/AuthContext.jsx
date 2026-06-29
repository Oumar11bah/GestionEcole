import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import jwtDecode from 'jwt-decode';
import axios from 'axios';
import { authService, userService } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const USER_STORAGE_KEY = 'edumanager_user';
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const inactivityRef = useRef(null);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  }, []);

  const performLogout = useCallback(async () => {
    try {
      await axios.post('/api/accounts/logout/', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
    } catch { /* ignore */ }
    clearAuth();
    window.location.href = '/login';
  }, [clearAuth]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => {
      performLogout();
    }, INACTIVITY_TIMEOUT);
  }, [performLogout]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handler = () => resetInactivityTimer();
    events.forEach(e => window.addEventListener(e, handler));
    resetInactivityTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
    };
  }, [resetInactivityTimer]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp < Date.now() / 1000) {
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const resp = await axios.post('/api/accounts/token/refresh/', { refresh: refreshToken }, { timeout: 10000 });
              localStorage.setItem('access_token', resp.data.access);
            } catch {
              throw new Error('Token expiré');
            }
          } else {
            throw new Error('Token expiré');
          }
        }
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          const u = JSON.parse(stored);
          try {
            const res = await userService.getMyProfile();
            if (res.data?.profile?.permissions) {
              u.profile.permissions = res.data.profile.permissions;
              u.teacher_profile = res.data.teacher_profile;
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
              setUser({ ...u });
            }
          } catch {}
        }
        setLoading(false);
      } catch {
        clearAuth();
        setLoading(false);
      }
    };
    checkAuth();
  }, [clearAuth]);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      const { access, refresh, user, profile, teacher_profile } = response.data;
      const userData = { ...user, profile, teacher_profile };

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));

      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail ||
               error.response?.data?.error ||
               'Connexion impossible',
        responseData: error.response?.data || {},
      };
    }
  };

  const logout = useCallback(() => {
    performLogout();
  }, [performLogout]);

  const updateUser = useCallback((userData) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  }, []);

  const canAccess = useCallback((module) => {
    if (!user?.profile?.role) return false;
    const perms = user.profile.permissions;
    if (!perms) return false;
    return perms.includes('*') || perms.includes(module);
  }, [user]);

  const value = {
    user,
    login,
    logout,
    updateUser,
    canAccess,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
