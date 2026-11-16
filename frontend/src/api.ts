import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

export function setToken(t: string | null) {
  if (t) {
    api.defaults.headers.common.Authorization = `Bearer ${t}`;
    localStorage.setItem('token', t);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem('token');
  }
}

const saved = localStorage.getItem('token');
if (saved) setToken(saved);
