import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getCurrentUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('isl_auth_token'));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('isl_auth_user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Validate stored token on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('isl_auth_token');
      if (storedToken) {
        try {
          const data = await getCurrentUser();
          if (data && data.user) {
            setUser(data.user);
            localStorage.setItem('isl_auth_user', JSON.stringify(data.user));
          }
        } catch {
          // Token is invalid/expired
          localStorage.removeItem('isl_auth_token');
          localStorage.removeItem('isl_auth_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await loginUser({ email, password });
    if (data.token) {
      localStorage.setItem('isl_auth_token', data.token);
      localStorage.setItem('isl_auth_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const register = async (name, email, password) => {
    const data = await registerUser({ name, email, password });
    if (data.token) {
      localStorage.setItem('isl_auth_token', data.token);
      localStorage.setItem('isl_auth_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('isl_auth_token');
    localStorage.removeItem('isl_auth_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
