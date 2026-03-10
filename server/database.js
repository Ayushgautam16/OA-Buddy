import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new DatabaseSync(join(__dirname, 'quiz.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    option1 TEXT NOT NULL,
    option2 TEXT NOT NULL,
    option3 TEXT NOT NULL,
    option4 TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    host_id TEXT NOT NULL,
    category TEXT,
    difficulty TEXT,
    status TEXT DEFAULT 'lobby',
    current_question INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    question_start_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS room_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    order_index INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );

  CREATE TABLE IF NOT EXISTS room_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    response_times TEXT DEFAULT '[]',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    selected_answer TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    response_time_ms INTEGER,
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
  CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
  CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
  CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);
`);

const count = db.prepare('SELECT COUNT(*) as c FROM questions').get();
if (count.c === 0) {
  const questions = [
    ['What is 2+2?', '1', '2', '3', '4', '4', 'aptitude', 'easy'],
    ['What is 5×6?', '20', '25', '30', '35', '30', 'aptitude', 'easy'],
    ['Capital of India?', 'Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Delhi', 'gk', 'easy'],
    ['Which planet is the Red Planet?', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Mars', 'gk', 'easy'],
    ['What does HTML stand for?', 'Hyper Text Markup Language', 'High Tech Markup Language', 'Home Tool Markup Language', 'Hyperlink Text Mark Language', 'Hyper Text Markup Language', 'coding', 'easy'],
    ['What is 15% of 80?', '10', '12', '15', '18', '12', 'aptitude', 'medium'],
    ['Square root of 144?', '10', '11', '12', '13', '12', 'aptitude', 'easy'],
    ['Largest ocean on Earth?', 'Atlantic', 'Pacific', 'Indian', 'Arctic', 'Pacific', 'gk', 'easy']
  ];
  const insert = db.prepare('INSERT INTO questions (question, option1, option2, option3, option4, correct_answer, category, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const q of questions) {
    insert.run(...q);
  }
}

export default db;
