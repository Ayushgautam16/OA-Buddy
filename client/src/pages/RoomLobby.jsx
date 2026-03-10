import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

export default function RoomLobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, getToken } = useAuth();
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    fetch(`/api/rooms/${roomId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(r => {
        if (!r) { setError('Room not found'); setLoading(false); return; }
        setRoom(r);
        setParticipants(r.participants?.map(p => ({ id: p.user_id, username: p.username })) || []);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load room'); setLoading(false); });
  }, [roomId]);

  useEffect(() => {
    const token = getToken();
    if (!token || !roomId) return;
    const s = io(window.location.origin, { auth: { token }, path: '/socket.io' });
    socketRef.current = s;
    s.emit('join_room', roomId);
    s.on('participants_updated', (p) => setParticipants(p));
    s.on('quiz_started', () => navigate(`/quiz/${roomId}`));
    s.on('error', (err) => setError(err?.message || 'Error'));
    return () => { s.emit('leave_room'); s.disconnect(); };
  }, [roomId, getToken, navigate]);

  useEffect(() => {
    if (!room?.total_questions) return;
    fetch(`/api/questions?category=${room.category || 'general'}&limit=100`, { credentials: 'include' })
      .then(r => r.json())
      .then(setQuestions)
      .catch(() => {});
  }, [room?.id, room?.category, room?.total_questions]);

  const isHost = room?.host_id === user?.id;

  const handleStartQuiz = () => {
    socketRef.current?.emit('start_quiz', roomId);
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/questions/upload', { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setCsvFile(file.name);
      fetch(`/api/questions?limit=200`, { credentials: 'include' }).then(r => r.json()).then(setQuestions);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAssignQuestions = async () => {
    if (questions.length === 0) return;
    setAssigning(true);
    setError('');
    const ids = questions.slice(0, 20).map(q => q.id);
    try {
      const res = await fetch('/api/questions/assign-to-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roomId, questionIds: ids })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assign failed');
      setRoom(r => ({ ...r, total_questions: ids.length }));
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <div className="text-center py-12">Loading room...</div>;
  if (error && !room) return <div className="text-center py-12 text-red-600">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-600">
          <h2 className="font-display font-bold text-xl">Room: {room?.code}</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {room?.category} • {room?.difficulty} • {room?.total_questions || 0} questions
          </p>
        </div>
        {error && <div className="mx-6 mt-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">{error}</div>}
        {isHost && (
          <div className="p-6 border-b border-slate-200 dark:border-slate-600 space-y-4">
            <h3 className="font-semibold">Host Controls</h3>
            <div className="flex flex-wrap gap-4">
              <label className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-600 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-500 transition">
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                {uploading ? 'Uploading...' : (csvFile ? `Uploaded: ${csvFile}` : 'Upload CSV')}
              </label>
              <button
                onClick={handleAssignQuestions}
                disabled={assigning || questions.length === 0}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : `Assign ${Math.min(20, questions.length)} Questions`}
              </button>
            </div>
          </div>
        )}
        <div className="p-6">
          <h3 className="font-semibold mb-4">Participants ({participants.length})</h3>
          <ul className="space-y-2">
            {participants.map(p => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-sm font-medium">
                  {p.username?.[0]?.toUpperCase()}
                </span>
                {p.username}
                {room?.host?.id === p.id && <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">Host</span>}
              </li>
            ))}
          </ul>
          {isHost && (
            <button
              onClick={handleStartQuiz}
              disabled={!room?.total_questions || room.total_questions === 0}
              className="mt-6 w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Start Quiz
            </button>
          )}
          {!isHost && <p className="mt-6 text-slate-500 dark:text-slate-400 text-sm">Waiting for host to start the quiz...</p>}
        </div>
      </div>
    </div>
  );
}
