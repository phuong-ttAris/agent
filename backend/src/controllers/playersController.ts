import type { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { readDb, writeDb } from '../services/store.js';

/** Anh dai dien dataURL tuy chon, gioi han ~400KB */
function avatarOf(body: Record<string, unknown> | undefined): string | undefined {
  const a = body?.avatar;
  if (typeof a !== 'string' || !a.startsWith('data:image/')) return undefined;
  if (a.length > 550000) throw new Error('Anh qua lon (toi da ~400KB)');
  return a;
}

export async function listPlayers(_req: Request, res: Response) {
  res.json((await readDb()).players);
}

export async function createPlayer(req: Request, res: Response) {
  const { name } = req.body ?? {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'name la bat buoc' });
  const db = await readDb();
  const player = { id: uuid(), name: String(name).trim(), avatar: avatarOf(req.body), createdAt: new Date().toISOString() };
  db.players.push(player);
  await writeDb(db);
  res.status(201).json(player);
}

export async function updatePlayer(req: Request, res: Response) {
  const db = await readDb();
  const p = db.players.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ message: 'Khong tim thay player' });
  if (req.body?.name) p.name = String(req.body.name).trim();
  if (req.body?.avatar !== undefined) p.avatar = avatarOf(req.body);
  await writeDb(db);
  res.json(p);
}

export async function deletePlayer(req: Request, res: Response) {
  const db = await readDb();
  const used = db.games.some((g) => g.playerIds.includes(req.params.id));
  if (used) return res.status(400).json({ message: 'Player da choi game, khong xoa duoc' });
  db.players = db.players.filter((x) => x.id !== req.params.id);
  await writeDb(db);
  res.json({ ok: true });
}

/** Tong diem moi thanh vien cong don tu TAT CA cac ban (cho bang thanh vien) */
export async function totalsAll(_req: Request, res: Response) {
  const db = await readDb();
  const map = new Map<string, { tong: number; van: number }>();
  for (const p of db.players) map.set(p.id, { tong: 0, van: 0 });
  for (const g of db.games) {
    for (const r of g.rounds) {
      for (const k of r.ketQua) {
        const t = map.get(k.playerId) ?? { tong: 0, van: 0 };
        t.tong += k.tong;
        t.van += 1;
        map.set(k.playerId, t);
      }
    }
  }
  res.json(
    db.players.map((p) => ({
      playerId: p.id,
      name: p.name,
      tongThuChi: map.get(p.id)?.tong ?? 0,
      soVan: map.get(p.id)?.van ?? 0,
    })),
  );
}
