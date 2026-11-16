import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data.userId);
      navigate('/chat');
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-bold">Login</h1>
        <input placeholder="email" aria-label="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
        <input type="password" placeholder="password" aria-label="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
        <button className="w-full bg-blue-600 text-white py-2 rounded">Login</button>
        {msg && <p className="text-sm">{msg}</p>}
        <div className="flex gap-3 text-sm">
          <Link to="/register" className="text-blue-600">Register</Link>
          <Link to="/verify" className="text-blue-600">Verify</Link>
        </div>
      </form>
    </div>
  );
}
