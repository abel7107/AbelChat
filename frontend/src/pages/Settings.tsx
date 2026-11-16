import { useState } from 'react';
import { api } from '../api';

export default function Settings() {
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  async function enable() {
    const { data } = await api.post('/auth/2fa/enable');
    setSecret(data.secret);
    setMsg('Scan secret in authenticator, then verify.');
  }
  async function verify() {
    try { await api.post('/auth/2fa/verify', { code }); setMsg('2FA enabled'); }
    catch (e: any) { setMsg(e.response?.data?.error || 'error'); }
  }
  async function disable() {
    try { await api.post('/auth/2fa/disable', { code }); setMsg('2FA disabled'); setSecret(''); }
    catch (e: any) { setMsg(e.response?.data?.error || 'error'); }
  }

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto space-y-3">
      <h1 className="text-2xl font-bold">Settings</h1>
      <button onClick={enable} className="bg-blue-600 text-white px-4 py-2 rounded">Enable 2FA</button>
      {secret && <p className="break-all text-sm">Secret: {secret}</p>}
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" className="border rounded px-3 py-2 w-full" />
      <div className="flex gap-2">
        <button onClick={verify} className="bg-green-600 text-white px-4 py-2 rounded">Verify</button>
        <button onClick={disable} className="bg-red-600 text-white px-4 py-2 rounded">Disable</button>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
