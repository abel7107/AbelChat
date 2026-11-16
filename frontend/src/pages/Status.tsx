import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Status() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => { api.get('/status/feed').then((r) => setStatuses(r.data)); }, []);

  async function publish() {
    await api.post('/status', { type: 'TEXT', content: text, audience: 'EVERYONE' });
    setText('');
    const r = await api.get('/status/feed');
    setStatuses(r.data);
  }

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto space-y-3">
      <h1 className="text-2xl font-bold">Status</h1>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="status text" />
        <button onClick={publish} className="bg-blue-600 text-white px-4 rounded">Publish</button>
      </div>
      {statuses.map((s) => (
        <div key={s.id} className="border rounded p-3">
          <div className="text-sm text-gray-500">{s.userId}</div>
          <div>{s.content}</div>
        </div>
      ))}
    </div>
  );
}
