import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats').then((r) => setStats(r.data)).catch((e) => setError(e.response?.data?.error || 'error'));
    api.get('/admin/users').then((r) => setUsers(r.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen p-4 space-y-4">
      <h1 className="text-2xl font-bold">Admin</h1>
      {error && <p className="text-red-600">{error}</p>}
      {stats && <pre className="bg-gray-100 p-3 rounded">{JSON.stringify(stats, null, 2)}</pre>}
      <table className="w-full text-sm">
        <thead><tr><th>username</th><th>status</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t"><td>{u.username}</td><td>{u.accountStatus}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
