import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import playersRouter from './routes/players.js';
import gamesRouter from './routes/games.js';
import ttsRouter from './routes/tts.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'tien-len-backend' }));
app.use('/api/players', playersRouter);
app.use('/api/games', gamesRouter);
app.use('/api/tts', ttsRouter);

// Phuong an B: 1 service vua API vua FE build (frontend/dist)
const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, '..', '..', 'frontend', 'dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  console.log('[app] serving frontend from', distDir);
} else {
  console.log('[app] frontend/dist not found, API only');
}

export default app;
