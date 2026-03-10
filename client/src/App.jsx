import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import RoomLobby from './pages/RoomLobby';
import QuizRoom from './pages/QuizRoom';
import Results from './pages/Results';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-lg">Loading...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="create" element={<ProtectedRoute><CreateRoom /></ProtectedRoute>} />
        <Route path="join" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
        <Route path="room/:roomId" element={<ProtectedRoute><RoomLobby /></ProtectedRoute>} />
        <Route path="quiz/:roomId" element={<ProtectedRoute><QuizRoom /></ProtectedRoute>} />
        <Route path="results/:roomId" element={<ProtectedRoute><Results /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
