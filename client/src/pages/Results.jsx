import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function Results() {
  const { roomId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    fetch(`/api/rooms/${roomId}/results`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [roomId]);

  if (loading) return <div className="text-center py-12">Loading results...</div>;
  if (!data) return <div className="text-center py-12 text-red-600">Could not load results.</div>;

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="font-display font-bold text-2xl mb-8">Quiz Results</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow border border-slate-100 dark:border-slate-700 text-center">
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{data.rank}</div>
          <div className="text-slate-600 dark:text-slate-400 text-sm mt-1">Rank</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow border border-slate-100 dark:border-slate-700 text-center">
          <div className="text-3xl font-bold">{data.score}</div>
          <div className="text-slate-600 dark:text-slate-400 text-sm mt-1">Score</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow border border-slate-100 dark:border-slate-700 text-center">
          <div className="text-3xl font-bold text-emerald-600">{data.correctCount}</div>
          <div className="text-slate-600 dark:text-slate-400 text-sm mt-1">Correct</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow border border-slate-100 dark:border-slate-700 text-center">
          <div className="text-3xl font-bold text-red-600">{data.incorrectCount}</div>
          <div className="text-slate-600 dark:text-slate-400 text-sm mt-1">Incorrect</div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow border border-slate-100 dark:border-slate-700 mb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-600 dark:text-slate-400">Accuracy</span>
          <span className="text-2xl font-bold">{data.accuracy}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-400">Total Time</span>
          <span className="font-semibold">{formatTime(data.totalTimeMs)}</span>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-100 dark:border-slate-700 overflow-hidden mb-8">
        <h3 className="font-display font-semibold p-6 border-b border-slate-200 dark:border-slate-600">Final Leaderboard</h3>
        <div className="divide-y divide-slate-200 dark:divide-slate-600">
          {data.leaderboard?.map((e, i) => (
            <div key={i} className="flex justify-between items-center p-4">
              <span className="font-medium">{e.rank}. {e.username}</span>
              <span className="font-semibold text-indigo-600">{e.score}</span>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => setShowReview(!showReview)}
        className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-700 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition mb-6"
      >
        {showReview ? 'Hide' : 'Review Answers'}
      </button>
      {showReview && data.review?.length > 0 && (
        <div className="space-y-6">
          {data.review.map((r, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow border border-slate-100 dark:border-slate-700">
              <p className="font-medium mb-4">{i + 1}. {r.question}</p>
              <p className={`text-sm ${r.is_correct ? 'text-emerald-600' : 'text-red-600'}`}>
                Your answer: {r.selected_answer} {r.is_correct ? '✓' : `✗ (Correct: ${r.correct_answer})`}
              </p>
              {r.response_time_ms != null && (
                <p className="text-slate-500 text-sm mt-2">Response time: {r.response_time_ms}ms</p>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="mt-8 flex gap-4">
        <Link to="/" className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-center hover:bg-indigo-700 transition">
          Back to Home
        </Link>
        <Link to="/create" className="flex-1 py-3 rounded-xl border-2 border-indigo-600 text-indigo-600 font-semibold text-center hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
          Create New Room
        </Link>
      </div>
    </div>
  );
}
