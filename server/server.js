import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import questionRoutes from './routes/questions.js';
import { initSocketHandlers } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/questions', questionRoutes);

// Serve static frontend in production
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  const indexPath = path.join(distPath, 'index.html');
  if (existsSync(indexPath)) res.sendFile(indexPath);
  else next();
});

// Attach io to app for routes
app.set('io', io);

// Initialize Socket.io handlers
initSocketHandlers(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
