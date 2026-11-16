import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function Profile() {
  const { userId } = useAuth();
  const [profile, setProfile] = useState<any>({});
  const [username, setUsername] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get(`/users/${userId}`).then((r) => {
      setProfile(r.data.profile || {});
      setUsername(r.data.username);
    });
  }, [userId]);

  async function save() {
    try {
      await api.put('/users/me/profile', { displayName: profile.displayName, about: profile.about, language: profile.language, theme: profile.theme });
      if (username) await api.put('/users/me/username', { username });
      setMsg('saved');
    } catch (e: any) { setMsg(e.response?.data?.error || 'error'); }
  }

  async function uploadPic(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const { data: media } = await api.post('/media', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    await api.put('/users/me/profile-picture', { mediaId: media.id });
    setMsg('picture updated');
  }

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto space-y-3">
      <h1 className="text-2xl font-bold">Profile</h1>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="w-full border rounded px-3 py-2" />
      <input value={profile.displayName || ''} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} placeholder="display name" className="w-full border rounded px-3 py-2" />
      <input value={profile.about || ''} onChange={(e) => setProfile({ ...profile, about: e.target.value })} placeholder="about" className="w-full border rounded px-3 py-2" />
      <select value={profile.language || 'en'} onChange={(e) => setProfile({ ...profile, language: e.target.value })} className="w-full border rounded px-3 py-2">
        <option value="en">English</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
      </select>
      <select value={profile.theme || 'light'} onChange={(e) => setProfile({ ...profile, theme: e.target.value })} className="w-full border rounded px-3 py-2">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <label className="block">
        <span className="text-sm">Profile picture</span>
        <input type="file" onChange={uploadPic} className="block mt-1" />
      </label>
      <button onClick={save} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
