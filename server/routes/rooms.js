import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import db from '../database.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'oa-buddy-quiz-secret-key-change-in-production';

const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token || req.headers?.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.use(authMiddleware);

router.post('/create', (req, res) => {
  try {
    const { category, difficulty } = req.body;
    const id = nanoid();
    const code = nanoid(6).toUpperCase();
    db.prepare(
      'INSERT INTO rooms (id, code, host_id, category, difficulty) VALUES (?, ?, ?, ?, ?)'
    ).run(id, code, req.user.id, category || 'general', difficulty || 'easy');
    db.prepare(
      'INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)'
    ).run(id, req.user.id);
    res.json({ roomId: id, code });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/join', (req, res) => {
  try {
    const { code } = req.body;
    const room = db.prepare('SELECT * FROM rooms WHERE code = ? AND status = ?').get(code?.toUpperCase(), 'lobby');
    if (!room) return res.status(404).json({ error: 'Room not found or quiz already started' });
    try {
      db.prepare(
        'INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)'
      ).run(room.id, req.user.id);
    } catch (e) {
      if (e.message?.includes('UNIQUE')) {
        return res.json({ roomId: room.id, code: room.code });
      }
      throw e;
    }
    res.json({ roomId: room.id, code: room.code });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:roomId', (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const participants = db.prepare(`
    SELECT rp.*, u.username FROM room_participants rp
    JOIN users u ON u.id = rp.user_id WHERE rp.room_id = ?
  `).all(room.id);
  const host = participants.find(p => p.user_id === room.host_id);
  res.json({ ...room, participants, host: host ? { id: host.user_id, username: host.username } : null });
});

router.get('/:roomId/leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT rp.user_id, u.username, rp.score, rp.correct_count, rp.incorrect_count, rp.response_times
    FROM room_participants rp JOIN users u ON u.id = rp.user_id
    WHERE rp.room_id = ? ORDER BY rp.score DESC, rp.correct_count DESC
  `).all(req.params.roomId);
  const leaderboard = rows.map((r, i) => ({
    rank: i + 1,
    userId: r.user_id,
    username: r.username,
    score: r.score,
    correctCount: r.correct_count,
    incorrectCount: r.incorrect_count,
    responseTimes: JSON.parse(r.response_times || '[]')
  }));
  res.json(leaderboard);
});

router.get('/:roomId/results', (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const rp = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?')
    .get(req.params.roomId, req.user.id);
  if (!rp) return res.status(403).json({ error: 'Not a participant' });
  const leaderboard = db.prepare(`
    SELECT rp.user_id, u.username, rp.score, rp.correct_count, rp.incorrect_count, rp.response_times
    FROM room_participants rp JOIN users u ON u.id = rp.user_id
    WHERE rp.room_id = ? ORDER BY rp.score DESC, rp.correct_count DESC
  `).all(req.params.roomId);
  const rank = leaderboard.findIndex(r => r.user_id === req.user.id) + 1;
  const times = JSON.parse(rp.response_times || '[]');
  const totalTime = times.reduce((a, b) => a + b, 0);
  const total = rp.correct_count + rp.incorrect_count;
  const review = db.prepare(`
    SELECT ua.question_id, ua.selected_answer, ua.is_correct, ua.response_time_ms, q.question, q.option1, q.option2, q.option3, q.option4, q.correct_answer
    FROM user_answers ua JOIN questions q ON q.id = ua.question_id
    WHERE ua.room_id = ? AND ua.user_id = ?
    ORDER BY ua.answered_at
  `).all(req.params.roomId, req.user.id);
  res.json({
    rank,
    score: rp.score,
    correctCount: rp.correct_count,
    incorrectCount: rp.incorrect_count,
    accuracy: total ? Math.round((rp.correct_count / total) * 100) : 0,
    totalTimeMs: totalTime,
    leaderboard: leaderboard.map((r, i) => ({ rank: i + 1, username: r.username, score: r.score, correctCount: r.correct_count })),
    review
  });
});

export default router;
