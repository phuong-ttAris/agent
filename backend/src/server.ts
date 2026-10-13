import app from './app.js';

// Nap backend/.env khi chay local (tren Render dung bien moi truong cua dashboard).
try {
  process.loadEnvFile('.env');
} catch {
  /* khong co .env -> bo qua */
}

const PORT = Number(process.env.PORT ?? 30001);
app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
});
