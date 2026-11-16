import { useState } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';

export default function Verify() {
  const [emailToken, setEmailToken] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  async function verifyEmail() {
    try { await api.post('/auth/verify-email', { token: emailToken }); setMsg('email verified'); }
    catch (e: any) { setMsg(e.response?.data?.error || 'error'); }
  }
  async function verifyPhone() {
    try { await api.post('/auth/verify-phone', { phoneNumber: phone, code }); setMsg('phone verified'); setTimeout(() => navigate('/login'), 1000); }
    catch (e: any) { setMsg(e.response?.data?.error || 'error'); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-bold">Verify</h1>
        <input placeholder="email token" value={emailToken} onChange={(e) => setEmailToken(e.target.value)} className="w-full border rounded px-3 py-2" />
        <button onClick={verifyEmail} className="w-full bg-blue-600 text-white py-2 rounded">Verify Email</button>
        <input placeholder="phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded px-3 py-2" />
        <input placeholder="otp code" value={code} onChange={(e) => setCode(e.target.value)} className="w-full border rounded px-3 py-2" />
        <button onClick={verifyPhone} className="w-full bg-blue-600 text-white py-2 rounded">Verify Phone</button>
        {msg && <p className="text-sm">{msg}</p>}
      </div>
    </div>
  );
}
