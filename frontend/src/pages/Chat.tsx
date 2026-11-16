import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { io } from 'socket.io-client';
import { generateKeyPair, loadPrivateKey, importPublicKey, deriveKey, encryptText, decryptText } from '../crypto';

export default function Chat() {
  const { userId, token, logout } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [newUser, setNewUser] = useState('');
  const [groupName, setGroupName] = useState('');
  const [convKey, setConvKey] = useState<CryptoKey | null>(null);

  useEffect(() => {
    (async () => {
      let priv = await loadPrivateKey();
      if (!priv) {
        const kp = await generateKeyPair();
        priv = kp.privateKey;
        await api.post('/devices', { deviceName: 'web' }).then(async (r) => {
          await api.post(`/devices/${r.data.id}/keys`, { publicKey: kp.publicKey });
        });
      }
      api.get('/conversations').then((r) => setConversations(r.data));
    })();
  }, []);

  useEffect(() => {
    if (!active) return;
    setConvKey(null);
    (async () => {
      const { data: conv } = await api.get(`/conversations/${active}`);
      let key: CryptoKey | null = null;
      const other = conv.members.find((m: any) => m.userId !== userId);
      if (other) {
        const keys = await api.get(`/users/${other.userId}/keys`);
        if (keys.data.length) {
          const pub = await importPublicKey(keys.data[0].publicKey);
          const priv = await loadPrivateKey();
          if (priv) { key = await deriveKey(priv, pub); setConvKey(key); }
        }
      }
      const r = await api.get(`/messages/conversation/${active}`);
      const msgs = await Promise.all(r.data.map(async (m: any) => {
        if (key && m.content && !m.deletedForEveryone) {
          try { return { ...m, content: await decryptText(m.content, key as CryptoKey) }; } catch { return m; }
        }
        return m;
      }));
      setMessages(msgs);
    })();
    const socket = io({ auth: { token } });
    socket.emit('join', active);
    socket.on('message', async (m: any) => {
      if (m.conversationId !== active) return;
      const key = convKey; if (key && m.content && !m.deletedForEveryone) {
        try { m = { ...m, content: await decryptText(m.content, key) }; } catch {}
      }
      setMessages((prev) => [...prev, m]);
    });
  return () => { socket.disconnect(); };
  }, [active, token]);

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !active) return;
    const fd = new FormData();
    fd.append('file', file);
    const { data: media } = await api.post('/media', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    const url = `/uploads/${media.storageKey}`;
    const { data: msg } = await api.post(`/messages/conversation/${active}`, { content: url, type: 'MEDIA' });
    setMessages((prev) => [...prev, msg]);
    const socket = io({ auth: { token } });
    socket.emit('message', { ...msg, conversationId: active });
    socket.disconnect();
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !text.trim()) return;
    let content = text;
    if (convKey) content = await encryptText(text, convKey);
    const { data } = await api.post(`/messages/conversation/${active}`, { content });
    setMessages((prev) => [...prev, { ...data, content: text }]);
    const socket = io({ auth: { token } });
    socket.emit('message', { ...data, conversationId: active });
    socket.disconnect();
    setText('');
  }

  async function startChat() {
    if (!newUser.trim()) return;
    const { data: users } = await api.get('/users/search', { params: { q: newUser } });
    if (!users.length) return;
    const target = users[0].id;
    const { data: conv } = await api.post('/conversations', { type: 'PRIVATE', memberIds: [target] });
    setConversations((prev) => [conv, ...prev]);
    setActive(conv.id);
    setNewUser('');
  }

  async function createGroup() {
    if (!groupName.trim()) return;
    const names = newUser.split(',').map((x) => x.trim()).filter(Boolean);
    const ids: string[] = [];
    for (const n of names) {
      const { data: users } = await api.get('/users/search', { params: { q: n } });
      if (users.length) ids.push(users[0].id);
    }
    const { data: conv } = await api.post('/conversations', { type: 'GROUP', name: groupName, memberIds: ids });
    setConversations((prev) => [conv, ...prev]);
    setActive(conv.id);
    setGroupName('');
    setNewUser('');
  }

  return (
    <div className="h-screen flex">
      <aside className="w-64 border-r p-3 space-y-2 overflow-auto">
        <div className="flex justify-between items-center">
          <h2 className="font-bold">Chats</h2>
          <div className="flex gap-2 text-xs">
            <a href="/status" className="text-blue-600">Status</a>
            <a href="/privacy" className="text-blue-600">Privacy</a>
            <a href="/admin" className="text-blue-600">Admin</a>
            <a href="/call" className="text-blue-600">Call</a>
            <a href="/settings" className="text-blue-600">Settings</a>
            <a href="/notifications" className="text-blue-600">Notifs</a>
            <button onClick={logout} className="text-red-600">Logout</button>
          </div>
        </div>
        <div className="flex gap-1">
          <input value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="username or a,b" aria-label="username search" className="border rounded px-2 py-1 text-sm flex-1" />
          <button onClick={startChat} className="text-sm bg-blue-600 text-white px-2 rounded">+</button>
        </div>
        <div className="flex gap-1">
          <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="group name" aria-label="group name" className="border rounded px-2 py-1 text-sm flex-1" />
          <button onClick={createGroup} className="text-sm bg-green-600 text-white px-2 rounded">G</button>
        </div>
        {conversations.map((c) => (
          <button key={c.id} onClick={() => setActive(c.id)}
            className={`block w-full text-left px-2 py-1 rounded ${active === c.id ? 'bg-blue-100' : ''}`}>
            {c.name || c.id.slice(0, 8)}
          </button>
        ))}
      </aside>
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {messages.map((m) => (
            <div key={m.id} className={`max-w-xs px-3 py-2 rounded ${m.senderId === userId ? 'bg-blue-500 text-white ml-auto' : 'bg-gray-200'}`}>
              {m.deletedForEveryone ? 'deleted' : m.content}
            </div>
          ))}
        </div>
        {active && (
          <form onSubmit={send} className="border-t p-3 flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="message" aria-label="message input" />
            <label className="bg-gray-200 px-3 py-2 rounded cursor-pointer">
              📎
              <input type="file" className="hidden" onChange={uploadFile} />
            </label>
            <button className="bg-blue-600 text-white px-4 rounded">Send</button>
          </form>
        )}
      </main>
    </div>
  );
}
