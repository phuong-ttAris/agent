import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import type { Game, Player } from '../types/index.js';

export interface DbShape {
  players: Player[];
  games: Game[];
}

const EMPTY: DbShape = { players: [], games: [] };

// ---- Postgres (Neon/Supabase...): bat buoc de luu lau dai khi deploy ----
let pool: Pool | null = null;
function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    pool.on('error', (e) => console.error('[db] pool error', e));
  }
  return pool;
}

async function pgRead(): Promise<DbShape | null> {
  const db = getPool();
  if (!db) return null;
  await db.query(`CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, data JSONB NOT NULL)`);
  const r = await db.query(`SELECT data FROM app_state WHERE id = 'main'`);
  if (r.rowCount === 0) return { ...EMPTY };
  const data = r.rows[0].data as DbShape;
  return { players: data.players ?? [], games: data.games ?? [] };
}

async function pgWrite(state: DbShape): Promise<void> {
  const db = getPool();
  if (!db) return;
  await db.query(
    `INSERT INTO app_state (id, data) VALUES ('main', $1)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [JSON.stringify(state)],
  );
}

// ---- File JSON fallback (chay local) ----
const DB_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');

function ensureFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(EMPTY, null, 2), 'utf-8');
  }
}

function resolveDbPath(): string {
  if (fs.existsSync(DB_PATH)) return DB_PATH;
  return path.join(process.cwd(), 'dist', 'data', 'db.json');
}

function fileRead(): DbShape {
  ensureFile();
  try {
    const raw = fs.readFileSync(resolveDbPath(), 'utf-8');
    const data = JSON.parse(raw) as DbShape;
    return { players: data.players ?? [], games: data.games ?? [] };
  } catch {
    return { ...EMPTY };
  }
}

function fileWrite(db: DbShape): void {
  ensureFile();
  fs.writeFileSync(resolveDbPath(), JSON.stringify(db, null, 2), 'utf-8');
}

// ---- API chung: co DATABASE_URL thi dung Postgres, khong thi file ----
function sanitize(db: DbShape): DbShape {
  return {
    players: Array.isArray(db.players) ? db.players : [],
    games: Array.isArray(db.games)
      ? db.games.map((g) => ({
          ...g,
          playerIds: Array.isArray(g.playerIds) ? g.playerIds : [],
          nghiIds: Array.isArray(g.nghiIds) ? g.nghiIds : [],
          rounds: Array.isArray(g.rounds)
            ? g.rounds.map((r) => ({
                ...r,
                scores: Array.isArray(r.scores) ? r.scores : [],
                ketQua: Array.isArray(r.ketQua) ? r.ketQua : [],
              }))
            : [],
        }))
      : [],
  };
}

export async function readDb(): Promise<DbShape> {
  try {
    const pg = await pgRead();
    if (pg) return sanitize(pg);
  } catch (e) {
    console.error('[db] postgres read failed, fallback file:', e);
  }
  return sanitize(fileRead());
}

export async function writeDb(db: DbShape): Promise<void> {
  try {
    if (getPool()) {
      await pgWrite(db);
      return;
    }
  } catch (e) {
    console.error('[db] postgres write failed, fallback file:', e);
  }
  fileWrite(db);
}
