import { useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();

  const toggleDark = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark ? '1' : '0');
  };

  useEffect(() => {
    if (localStorage.getItem('darkMode') === '1') document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <nav className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-xl text-indigo-600 dark:text-indigo-400">
            OA Buddy
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition" aria-label="Toggle dark mode">
              <svg className="w-5 h-5 dark:hidden" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
              <svg className="w-5 h-5 hidden dark:block" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg>
            </button>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">{user.username}</span>
                <Link to="/create" className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
                  Create Room
                </Link>
                <Link to="/join" className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-500 transition">
                  Join Room
                </Link>
                <button onClick={logout} className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                  Login
                </Link>
                <Link to="/signup" className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
