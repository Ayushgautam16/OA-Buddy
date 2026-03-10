import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function JoinRoom() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: code.trim().toUpperCase() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join room');
      navigate(`/room/${data.roomId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="font-display font-bold text-2xl mb-6">Join Quiz Room</h2>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
        {error && <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Room Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              maxLength={8}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 uppercase font-mono text-lg tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
            {loading ? 'Joining...' : 'Join Room'}
          </button>
        </form>
      </div>
    </div>
  );
}
