import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('nfhis_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const data = await authAPI.login(username, password);
    const userData = {
      token: data.token,
      userId: data.user_id,
      username: data.username,
      role: data.role,
      name: data.name,
      hospitalId: data.hospital_id,
    };
    setUser(userData);
    localStorage.setItem('nfhis_user', JSON.stringify(userData));
    localStorage.setItem('nfhis_token', data.token);
    return userData;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nfhis_user');
    localStorage.removeItem('nfhis_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
