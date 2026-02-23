/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, createContext, useContext } from 'react';
import { getCurrentUser, logout as logoutApi } from '../services/api';
import { initAnalytics, identifyUser, resetAnalytics } from '../utils/analytics';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 초기 사용자 정보 로드 + 애널리틱스 초기화
  useEffect(() => {
    initAnalytics();

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');

        if (token) {
          const response = await getCurrentUser();
          setUser(response.data);
          setIsAuthenticated(true);
          identifyUser(response.data);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('access_token');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    identifyUser(userData);
  };

  const logout = () => {
    logoutApi();
    resetAnalytics();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
