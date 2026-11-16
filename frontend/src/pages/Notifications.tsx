import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Notifications() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => { api.get('/notifications').then((r) => setItems(r.data)); }, []);

  async function read(id: string) {
    await api.post(`/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)));
  }

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto space-y-2">
      <h1 className="text-2xl font-bold">Notifications</h1>
      {items.map((n) => (
        <div key={n.id} className={`border rounded p-3 ${n.readAt ? 'opacity-60' : ''}`}>
          <div className="font-medium">{n.title}</div>
          <div className="text-sm">{n.body}</div>
          {!n.readAt && <button onClick={() => read(n.id)} className="text-xs text-blue-600">Mark read</button>}
        </div>
      ))}
    </div>
  );
}
