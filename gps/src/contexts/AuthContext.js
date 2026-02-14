import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getMe } from '../services/authApi';

const AuthContext = createContext(null);

const AUTH_STORAGE_KEY = '@safeparking_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, username, role, nickname, email }
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 세션 확인
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const me = await getMe();
      setUser(me);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(me));
    } catch {
      setUser(null);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const userData = await apiLogin(username, password);
    setUser(userData);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    return userData;
  };

  const register = async ({ username, password, nickname, email }) => {
    const userData = await apiRegister({ username, password, nickname, email });
    // 회원가입 후 자동 로그인
    const loggedIn = await apiLogin(username, password);
    setUser(loggedIn);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedIn));
    return loggedIn;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch { /* ignore */ }
    setUser(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, isLoggedIn, isAdmin, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
