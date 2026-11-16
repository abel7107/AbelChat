import { useState } from 'react';
import { api } from '../api';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', phoneNumber: '', password: '' });
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/register', form);
      setMsg(`Registered. Email token: ${data.emailToken} | Phone OTP: ${data.phoneOtp}`);
      setTimeout(() => navigate('/verify'), 1500);
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-bold">Register</h1>
        {(['username', 'email', 'phoneNumber', 'password'] as const).map((k) => (
          <input key={k} type={k === 'password' ? 'password' : 'text'} placeholder={k}
            value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            className="w-full border rounded px-3 py-2" />
        ))}
        <button className="w-full bg-blue-600 text-white py-2 rounded">Register</button>
        {msg && <p className="text-sm break-all">{msg}</p>}
        <Link to="/login" className="text-sm text-blue-600">Login</Link>
      </form>
    </div>
  );
}
