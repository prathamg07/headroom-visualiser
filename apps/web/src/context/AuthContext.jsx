import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('headroom_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await apiRequest('/me');
        setUser(userData);
      } catch (err) {
        localStorage.removeItem('headroom_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email, password) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('headroom_token', data.accessToken);
    setUser(data.user);
    return data;
  };

  const register = async (formData) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    localStorage.setItem('headroom_token', data.accessToken);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    localStorage.removeItem('headroom_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
