import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

const OPTIONS = ['option1', 'option2', 'option3', 'option4'];
const QUESTION_TIME = 15;

export default function QuizRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, getToken } = useAuth();
  const [question, setQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const token = getToken();
    if (!token || !roomId) return;
    const s = io(window.location.origin, { auth: { token }, path: '/socket.io' });
    socketRef.current = s;
    s.emit('join_room', roomId);
    s.emit('get_leaderboard', roomId);
    s.on('quiz_started', ({ question: q, totalQuestions: t, questionIndex: i }) => {
      setQuestion(q);
      setTotalQuestions(t);
      setQuestionIndex(i);
      setTimeLeft(QUESTION_TIME);
      setAnswered(false);
      setResult(null);
    });
    s.on('next_question', ({ question: q, totalQuestions: t, questionIndex: i }) => {
      setQuestion(q);
      setTotalQuestions(t);
      setQuestionIndex(i);
      setTimeLeft(QUESTION_TIME);
      setAnswered(false);
      setResult(null);
    });
    s.on('quiz_finished', ({ leaderboard: lb }) => {
      setLeaderboard(lb);
      navigate(`/results/${roomId}`);
    });
    s.on('leaderboard_updated', setLeaderboard);
    s.on('answer_result', (r) => {
      setResult(r);
      setAnswered(true);
    });
    s.on('error', (err) => setError(err?.message || 'Error'));
    return () => { s.disconnect(); };
  }, [roomId, getToken, navigate]);

  useEffect(() => {
    if (!question || answered) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [question, questionIndex, answered]);

  const handleSelect = (opt) => {
    if (answered || !question) return;
    const val = question[opt];
    socketRef.current?.emit('submit_answer', { roomId, questionId: question.id, selectedAnswer: val });
  };

  if (error) return <div className="text-center py-12 text-red-600">{error}</div>;
  if (!question && !error) return <div className="text-center py-12">Waiting for quiz to start...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">
              Question {questionIndex + 1} of {totalQuestions}
            </span>
            {!answered && (
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-1000"
                    style={{ width: `${(timeLeft / QUESTION_TIME) * 100}%` }}
                  />
                </div>
                <span className={`font-mono font-semibold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : ''}`}>
                  {timeLeft}s
                </span>
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
            <h3 className="font-display font-semibold text-xl mb-6">{question?.question}</h3>
            <div className="space-y-3">
              {OPTIONS.map(opt => {
                const val = question?.[opt];
                if (!val) return null;
                const isSelected = result?.selectedAnswer === val;
                const isCorrect = val === question?.correct_answer;
                let style = 'border-slate-200 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20';
                if (answered) {
                  if (isCorrect) style = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30';
                  else if (isSelected && !isCorrect) style = 'border-red-500 bg-red-50 dark:bg-red-900/30';
                }
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    disabled={answered}
                    className={`w-full p-4 rounded-xl border-2 text-left transition ${style} disabled:cursor-default`}
                  >
                    <span className="font-medium mr-2">{opt.replace('option', '')})</span>
                    {val}
                    {answered && isCorrect && <span className="ml-2 text-emerald-600">✓</span>}
                    {answered && isSelected && !isCorrect && <span className="ml-2 text-red-600">✗</span>}
                  </button>
                );
              })}
            </div>
            {result && (
              <div className={`mt-6 p-4 rounded-xl ${result.isCorrect ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'}`}>
                {result.isCorrect ? '✅ Correct!' : `❌ Incorrect. Correct answer: ${question?.correct_answer}`}
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-6 sticky top-24">
            <h3 className="font-display font-semibold mb-4">Leaderboard</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    entry.userId === user?.id ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-slate-50 dark:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 dark:text-slate-400 w-6">{entry.rank}</span>
                    <span className="font-medium truncate max-w-[120px]">{entry.username}</span>
                  </div>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{entry.score}</span>
                </div>
              ))}
              {leaderboard.length === 0 && <p className="text-slate-500 text-sm">No scores yet</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
