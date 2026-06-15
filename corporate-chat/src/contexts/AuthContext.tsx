import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authAPI, userAPI } from '../services/api';
import socketService from '../services/socket';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const user = await userAPI.getMe();
          setCurrentUser({
            ...user,
            createdAt: new Date(user.createdAt)
          });

          // Подключаемся к WebSocket
          socketService.connect(user.id);
        } catch (error: any) {
          console.error('Auth init error:', error);
          localStorage.removeItem('token');
          
          // Если токен истёк или невалиден - не удаляем пользователя сразу,
          // просто оставляем currentUser = null и показываем login
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { user, token } = await authAPI.login(email, password);
      
      localStorage.setItem('token', token);
      setCurrentUser({
        ...user,
        createdAt: new Date(user.createdAt)
      });
      
      // Подключаемся к WebSocket
      socketService.connect(user.id);
      
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const { user, token } = await authAPI.register(email, password, name);
      
      localStorage.setItem('token', token);
      setCurrentUser({
        ...user,
        createdAt: new Date(user.createdAt)
      });
      
      // Подключаемся к WebSocket
      socketService.connect(user.id);
      
      return true;
    } catch (error: any) {
      console.error('Register error:', error);
      return false;
    }
  };

  const logout = () => {
    socketService.disconnect();
    setCurrentUser(null);
    localStorage.removeItem('token');
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;

    try {
      const updatedUser = await userAPI.updateProfile(updates);
      setCurrentUser({
        ...updatedUser,
        createdAt: new Date(updatedUser.createdAt)
      });
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    updateProfile,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
