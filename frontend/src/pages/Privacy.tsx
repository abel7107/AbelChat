import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Privacy() {
  const [settings, setSettings] = useState<any>({});
  const [target, setTarget] = useState('');

  useEffect(() => { api.get('/privacy/settings').then((r) => setSettings(r.data || {})); }, []);

  async function save() {
    const r = await api.put('/privacy/settings', settings);
    setSettings(r.data);
  }

  async function block() {
    if (!target) return;
    const { data: users } = await api.get('/users/search', { params: { q: target } });
    if (users.length) await api.post('/privacy/block', { userId: users[0].id });
    setTarget('');
  }

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto space-y-3">
      <h1 className="text-2xl font-bold">Privacy</h1>
      {['profilePictureVisibility', 'onlineStatusVisibility', 'lastSeenVisibility', 'groupInvitationPermission'].map((k) => (
        <div key={k} className="flex items-center gap-2">
          <label className="w-48 text-sm">{k}</label>
          <select value={settings[k] || 'EVERYONE'} onChange={(e) => setSettings({ ...settings, [k]: e.target.value })} className="border rounded px-2 py-1">
            <option>EVERYONE</option>
            <option>CONTACTS</option>
            <option>NOBODY</option>
          </select>
        </div>
      ))}
      <button onClick={save} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
      <div className="flex gap-2">
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="block username" className="border rounded px-3 py-2 flex-1" />
        <button onClick={block} className="bg-red-600 text-white px-4 rounded">Block</button>
      </div>
    </div>
  );
}
