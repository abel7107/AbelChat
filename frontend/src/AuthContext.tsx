import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api, setToken } from './api';

interface AuthState {
  userId: string | null;
  token: string | null;
  login: (token: string, userId: string) => void;
  logout: () => void;
}

const Ctx = createContext<AuthState>({ userId: null, token: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setT] = useState<string | null>(localStorage.getItem('token'));
  const [userId, setU] = useState<string | null>(localStorage.getItem('userId'));

  useEffect(() => {
    if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
    if (userId) {
      api.get(`/users/${userId}`).then((r) => {
        const theme = r.data.profile?.theme;
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }).catch(() => {});
    }
  }, [token, userId]);

  function login(t: string, u: string) {
    setToken(t);
    setT(t);
    setU(u);
    localStorage.setItem('userId', u);
  }
  function logout() {
    setToken(null);
    setT(null);
    setU(null);
    localStorage.removeItem('userId');
  }
  return <Ctx.Provider value={{ userId, token, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
