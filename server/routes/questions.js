import { Router } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import db from '../database.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
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

router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const content = req.file.buffer.toString('utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true });
    const cols = ['question', 'option1', 'option2', 'option3', 'option4', 'correct_answer', 'category', 'difficulty'];
    const insert = db.prepare(`
      INSERT INTO questions (question, option1, option2, option3, option4, correct_answer, category, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    let count = 0;
    for (const row of records) {
      const vals = cols.map(c => row[c]?.trim() ?? '');
      if (!vals[0]) continue;
      insert.run(...vals);
      count++;
    }
    res.json({ message: `Imported ${count} questions` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', (req, res) => {
  const { category, difficulty, limit = 50 } = req.query;
  let sql = 'SELECT * FROM questions WHERE 1=1';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty); }
  sql += ' ORDER BY RANDOM() LIMIT ?';
  params.push(parseInt(limit, 10) || 50);
  const questions = db.prepare(sql).all(...params);
  res.json(questions);
});

router.post('/assign-to-room', (req, res) => {
  const { roomId, questionIds } = req.body;
  if (!roomId || !Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ error: 'roomId and questionIds required' });
  }
  const room = db.prepare('SELECT * FROM rooms WHERE id = ? AND host_id = ?').get(roomId, req.user.id);
  if (!room) return res.status(404).json({ error: 'Room not found or not host' });
  if (room.status !== 'lobby') return res.status(400).json({ error: 'Quiz already started' });
  db.prepare('DELETE FROM room_questions WHERE room_id = ?').run(roomId);
  const insert = db.prepare('INSERT INTO room_questions (room_id, question_id, order_index) VALUES (?, ?, ?)');
  questionIds.forEach((qid, i) => insert.run(roomId, qid, i));
  db.prepare('UPDATE rooms SET total_questions = ? WHERE id = ?').run(questionIds.length, roomId);
  res.json({ message: 'Questions assigned' });
});

export default router;
