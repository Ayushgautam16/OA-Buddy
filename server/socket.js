import jwt from 'jsonwebtoken';
import db from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'oa-buddy-quiz-secret-key-change-in-production';
const QUESTION_TIME_MS = 15000; // 15 seconds per question
const roomTimers = new Map();

function getLeaderboard(roomId) {
  const rows = db.prepare(`
    SELECT rp.user_id, u.username, rp.score, rp.correct_count, rp.incorrect_count, rp.response_times
    FROM room_participants rp JOIN users u ON u.id = rp.user_id
    WHERE rp.room_id = ? ORDER BY rp.score DESC, rp.correct_count DESC
  `).all(roomId);
  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.user_id,
    username: r.username,
    score: r.score,
    correctCount: r.correct_count,
    incorrectCount: r.incorrect_count,
    responseTimes: JSON.parse(r.response_times || '[]')
  }));
}

export function initSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie?.match(/token=([^;]+)/)?.[1];
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_room', (roomId) => {
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
      if (!room) return socket.emit('error', { message: 'Room not found' });
      const participant = db.prepare(
        'SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?'
      ).get(roomId, socket.user.id);
      if (!participant) return socket.emit('error', { message: 'Not a participant' });
      socket.join(roomId);
      socket.roomId = roomId;
      const participants = db.prepare(`
        SELECT rp.*, u.username FROM room_participants rp
        JOIN users u ON u.id = rp.user_id WHERE rp.room_id = ?
      `).all(roomId);
      io.to(roomId).emit('participants_updated', participants.map(p => ({ id: p.user_id, username: p.username })));
    });

    socket.on('leave_room', () => {
      if (socket.roomId) {
        socket.leave(socket.roomId);
        const participants = db.prepare(`
          SELECT rp.*, u.username FROM room_participants rp
          JOIN users u ON u.id = rp.user_id WHERE rp.room_id = ?
        `).all(socket.roomId);
        io.to(socket.roomId).emit('participants_updated', participants.map(p => ({ id: p.user_id, username: p.username })));
        socket.roomId = null;
      }
    });

    function advanceQuestion(roomId) {
      if (roomTimers.has(roomId)) {
        clearTimeout(roomTimers.get(roomId));
        roomTimers.delete(roomId);
      }
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
      if (!room || room.status !== 'playing') return;
      const rqs = db.prepare(
        'SELECT q.* FROM room_questions rq JOIN questions q ON q.id = rq.question_id WHERE rq.room_id = ? ORDER BY rq.order_index'
      ).all(roomId);
      const nextIdx = room.current_question + 1;
      if (nextIdx >= rqs.length) {
        db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run('finished', roomId);
        io.to(roomId).emit('quiz_finished', { leaderboard: getLeaderboard(roomId) });
        return;
      }
      db.prepare('UPDATE rooms SET current_question = ?, question_start_time = ? WHERE id = ?')
        .run(nextIdx, new Date().toISOString(), roomId);
      const q = rqs[nextIdx];
      const question = { id: q.id, question: q.question, option1: q.option1, option2: q.option2, option3: q.option3, option4: q.option4 };
      io.to(roomId).emit('next_question', { question, totalQuestions: rqs.length, questionIndex: nextIdx });
      const t = setTimeout(() => advanceQuestion(roomId), QUESTION_TIME_MS);
      roomTimers.set(roomId, t);
    }

    socket.on('start_quiz', (roomId) => {
      const room = db.prepare('SELECT * FROM rooms WHERE id = ? AND host_id = ?').get(roomId, socket.user.id);
      if (!room) return socket.emit('error', { message: 'Not host or room not found' });
      const rqs = db.prepare(
        'SELECT q.* FROM room_questions rq JOIN questions q ON q.id = rq.question_id WHERE rq.room_id = ? ORDER BY rq.order_index'
      ).all(roomId);
      if (rqs.length === 0) return socket.emit('error', { message: 'No questions assigned. Upload and assign questions first.' });
      db.prepare('UPDATE rooms SET status = ?, current_question = 0, question_start_time = ? WHERE id = ?')
        .run('playing', new Date().toISOString(), roomId);
      const q = rqs[0];
      const question = { id: q.id, question: q.question, option1: q.option1, option2: q.option2, option3: q.option3, option4: q.option4 };
      io.to(roomId).emit('quiz_started', { question, totalQuestions: rqs.length, questionIndex: 0 });
      const t = setTimeout(() => advanceQuestion(roomId), QUESTION_TIME_MS);
      roomTimers.set(roomId, t);
    });

    socket.on('submit_answer', ({ roomId, questionId, selectedAnswer }) => {
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
      if (!room || room.status !== 'playing') return;
      const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
      if (!q) return;
      const startTime = room.question_start_time ? new Date(room.question_start_time).getTime() : Date.now();
      const responseTimeMs = Date.now() - startTime;
      const isCorrect = String(selectedAnswer).trim() === String(q.correct_answer).trim();
      const pts = isCorrect ? 10 : 0;
      const existing = db.prepare(
        'SELECT * FROM user_answers WHERE room_id = ? AND user_id = ? AND question_id = ?'
      ).get(roomId, socket.user.id, questionId);
      if (existing) return;
      db.prepare(
        'INSERT INTO user_answers (room_id, user_id, question_id, selected_answer, is_correct, response_time_ms) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(roomId, socket.user.id, questionId, selectedAnswer, isCorrect ? 1 : 0, responseTimeMs);
      const rp = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?').get(roomId, socket.user.id);
      if (!rp) return;
      const times = JSON.parse(rp.response_times || '[]');
      times.push(responseTimeMs);
      db.prepare(
        'UPDATE room_participants SET score = score + ?, correct_count = correct_count + ?, incorrect_count = incorrect_count + ?, response_times = ? WHERE room_id = ? AND user_id = ?'
      ).run(pts, isCorrect ? 1 : 0, isCorrect ? 0 : 1, JSON.stringify(times), roomId, socket.user.id);
      socket.emit('answer_result', { isCorrect, selectedAnswer, correctAnswer: q.correct_answer });
      io.to(roomId).emit('leaderboard_updated', getLeaderboard(roomId));
    });

    socket.on('next_question', (roomId) => {
      const room = db.prepare('SELECT * FROM rooms WHERE id = ? AND host_id = ?').get(roomId, socket.user.id);
      if (!room) return;
      advanceQuestion(roomId);
    });

    socket.on('get_leaderboard', (roomId) => {
      socket.emit('leaderboard_updated', getLeaderboard(roomId));
    });

    socket.on('disconnect', () => {
      if (socket.roomId) {
        const participants = db.prepare(`
          SELECT rp.*, u.username FROM room_participants rp
          JOIN users u ON u.id = rp.user_id WHERE rp.room_id = ?
        `).all(socket.roomId);
        socket.to(socket.roomId).emit('participants_updated', participants.map(p => ({ id: p.user_id, username: p.username })));
      }
    });
  });
}
