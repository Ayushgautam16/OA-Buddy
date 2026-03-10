import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="text-center py-16">
      <h1 className="font-display font-bold text-4xl md:text-5xl text-slate-800 dark:text-slate-100 mb-4">
        OA Buddy
      </h1>
      <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto">
        Real-Time Quiz & Aptitude Competition Platform. Create rooms, invite friends, compete live, and see the leaderboard update in real-time.
      </p>
      {user ? (
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            to="/create"
            className="px-8 py-4 rounded-xl bg-indigo-600 text-white font-semibold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition hover:scale-105"
          >
            Create Room
          </Link>
          <Link
            to="/join"
            className="px-8 py-4 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition hover:scale-105"
          >
            Join Room
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            to="/signup"
            className="px-8 py-4 rounded-xl bg-indigo-600 text-white font-semibold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition hover:scale-105"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="px-8 py-4 rounded-xl border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold text-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
          >
            Login
          </Link>
        </div>
      )}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h3 className="font-display font-semibold text-lg mb-2">Real-Time</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Live leaderboard, instant feedback, and synchronized questions for everyone.</p>
        </div>
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <h3 className="font-display font-semibold text-lg mb-2">CSV Upload</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Upload your own questions via CSV. Perfect for aptitude tests and custom quizzes.</p>
        </div>
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-4">
            <span className="text-2xl">🏆</span>
          </div>
          <h3 className="font-display font-semibold text-lg mb-2">Competitions</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Designed for exams, classroom competitions, and coding assessments.</p>
        </div>
      </div>
    </div>
  );
}
