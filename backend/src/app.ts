import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import playersRouter from './routes/players.js';
import gamesRouter from './routes/games.js';
import ttsRouter from './routes/tts.js';

const app = express();

// Render free ngu sau ~15p khong co request (khong chinh duoc). De ngu sau 30p khong dung:
// con nguoi dung trong 30p gan nhat thi tu ping chinh minh moi 10p; het 30p thi ngung ping.
const IDLE_MS = 30 * 60 * 1000;
let lastActivity = Date.now();
app.use((req, _res, next) => {
  if (req.path !== '/api/health') lastActivity = Date.now(); // ping tu giu khong tinh la hoat dong
  next();
});
const selfUrl = process.env.RENDER_EXTERNAL_URL; // Render tu dat; local khong co -> khong ping
if (selfUrl) {
  setInterval(() => {
    if (Date.now() - lastActivity < IDLE_MS) fetch(`${selfUrl}/api/health`).catch(() => {});
  }, 10 * 60 * 1000);
}

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
