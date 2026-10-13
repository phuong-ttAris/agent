import type { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { readDb, writeDb } from '../services/store.js';
import { calculateRound, settleGame } from '../services/calculator.js';
import type { Game } from '../types/index.js';

export async function listGames(_req: Request, res: Response) {
  const db = await readDb();
  res.json(db.games.map((g) => ({ ...g, rounds: undefined, soVan: g.rounds.length })));
}

export async function createGame(req: Request, res: Response) {
  const { name, playerIds = [], maxVan = 15, cuoc = 10000, ngayChoi } = req.body ?? {};
  if (!Array.isArray(playerIds) || playerIds.length < 2 || playerIds.length > 4)
    return res.status(400).json({ message: 'Mỗi bàn cần 2–4 người' });
  const db = await readDb();
  for (const pid of playerIds) {
    if (!db.players.find((p) => p.id === pid)) return res.status(400).json({ message: `Người chơi không tồn tại: ${pid}` });
  }
  const today = new Date();
  const p2 = (x: number) => String(x).padStart(2, '0');
  const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(String(ngayChoi ?? ''))
    ? String(ngayChoi)
    : `${today.getFullYear()}-${p2(today.getMonth() + 1)}-${p2(today.getDate())}`;
  // Ten ban tu dong neu khong gui: Ban N + ngay choi
  let autoName = String(name ?? '').trim();
  if (!autoName) {
    const [y, m, d] = dateStr.split('-');
    const sameDay = db.games.filter((g) => (g.ngayChoi ?? g.createdAt.slice(0, 10)) === dateStr).length;
    autoName = `BÃ n ${d}/${m}/${y}` + (sameDay > 0 ? ` (${sameDay + 1})` : '');
  }
  const game: Game = {
    id: uuid(), name: autoName,
    playerIds, nghiIds: [],
    ngayChoi: dateStr,
    maxVan: Math.min(99, Math.max(1, Number(maxVan) || 15)),
    cuoc: Math.max(0, Math.floor(Number(cuoc) || 0)),
    createdAt: new Date().toISOString(), rounds: [],
  };
  db.games.push(game);
  await writeDb(db);
  res.status(201).json(game);
}

export async function getGame(req: Request, res: Response) {
  const g = (await readDb()).games.find((x) => x.id === req.params.id);
  if (!g) return res.status(404).json({ message: 'Không tìm thấy bàn' });
  res.json(g);
}

export async function deleteGame(req: Request, res: Response) {
  const db = await readDb();
  db.games = db.games.filter((x) => x.id !== req.params.id);
  await writeDb(db);
  res.json({ ok: true });
}

export async function updateGame(req: Request, res: Response) {
  const db = await readDb();
  const game = db.games.find((x) => x.id === req.params.id);
  if (!game) return res.status(404).json({ message: 'Không tìm thấy bàn' });
  const { name, playerIds, maxVan, cuoc, ngayChoi, nghiIds } = req.body ?? {};
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ message: 'Tên không được để trống' });
    game.name = String(name).trim();
  }
  if (playerIds !== undefined) {
    if (!Array.isArray(playerIds) || playerIds.length < 2 || playerIds.length > 4)
      return res.status(400).json({ message: 'Mỗi bàn cần 2–4 người' });
    for (const pid of playerIds) {
      if (!db.players.find((p) => p.id === pid)) return res.status(400).json({ message: `Người chơi không tồn tại: ${pid}` });
    }
    game.playerIds = playerIds;
    // Loai bo nghiIds khong con trong ban
    game.nghiIds = (game.nghiIds ?? []).filter((id) => playerIds.includes(id));
  }
  if (nghiIds !== undefined) {
    if (!Array.isArray(nghiIds)) return res.status(400).json({ message: 'nghiIds phải là mảng' });
    for (const pid of nghiIds) {
      if (!game.playerIds.includes(pid)) return res.status(400).json({ message: 'nghiIds có người không thuộc bàn' });
    }
    if (game.playerIds.length - nghiIds.length < 2)
      return res.status(400).json({ message: 'Bàn phải có ít nhất 2 người đang chơi' });
    game.nghiIds = nghiIds;
  }
  if (ngayChoi !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ngayChoi))) return res.status(400).json({ message: 'Ngày chơi phải có dạng YYYY-MM-DD' });
    game.ngayChoi = String(ngayChoi);
  }
  if (maxVan !== undefined) {
    const m = Number(maxVan);
    if (!Number.isFinite(m) || m < 1 || m > 99) return res.status(400).json({ message: 'maxVan 1-99' });
    game.maxVan = Math.floor(m);
  }
  if (cuoc !== undefined) {
    const c = Number(cuoc);
    if (!Number.isFinite(c) || c < 0) return res.status(400).json({ message: 'Cược phải >= 0' });
    game.cuoc = Math.floor(c);
  }
  await writeDb(db);
  res.json(game);
}

/** Id dang choi trong ban (thuoc ban va khong nghi) */
export function playingIds(game: { playerIds: string[]; nghiIds?: string[] }): string[] {
  const nghi = new Set(game.nghiIds ?? []);
  return game.playerIds.filter((id) => !nghi.has(id));
}

/** Validate scores: dung nhung nguoi dang choi (van moi) ; o trong = 0, cong don truc tiep vao total */
function validateScores(game: { playerIds: string[]; nghiIds?: string[] }, scores: unknown, strictPlaying: boolean) {
  if (!Array.isArray(scores) || scores.length < 2) throw new Error('Cần điểm của ít nhất 2 người');
  const playing = playingIds(game);
  if (strictPlaying && scores.length !== playing.length)
    throw new Error(`Cần điểm của đủ ${playing.length} người đang chơi`);
  const seen = new Set<string>();
  for (const s of scores as { playerId: string; amount: unknown }[]) {
    if (strictPlaying) {
      if (!playing.includes(s.playerId)) throw new Error('Có người không đang chơi trong bàn');
    } else if (!game.playerIds.includes(s.playerId)) {
      throw new Error('Có người không thuộc bàn');
    }
    if (seen.has(s.playerId)) throw new Error('Điểm bị trùng người');
    seen.add(s.playerId);
    const a = Number(s.amount);
    if (!Number.isFinite(a)) throw new Error('Số điểm phải là số');
  }
}

export async function addRound(req: Request, res: Response) {
  const db = await readDb();
  const game = db.games.find((x) => x.id === req.params.id);
  if (!game) return res.status(404).json({ message: 'Không tìm thấy bàn' });
  try {
    const input = req.body ?? {};
    validateScores(game, input.scores, true);
    const ketQua = calculateRound(input);
    const round = {
      scores: (input.scores as { playerId: string; amount: unknown; hang?: unknown }[]).map((s) => ({
        playerId: s.playerId,
        amount: Number(s.amount),
        hang: typeof s.hang === 'number' ? s.hang : undefined,
      })),
      ghiChu: input.ghiChu ?? '',
      id: uuid(), gameId: game.id, vanSo: game.rounds.length + 1,
      createdAt: new Date().toISOString(), ketQua,
    };
    game.rounds.push(round as Game['rounds'][number]);
    await writeDb(db);
    res.status(201).json(round);
  } catch (e: unknown) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Dữ liệu ván không hợp lệ' });
  }
}

export async function updateRound(req: Request, res: Response) {
  const db = await readDb();
  const game = db.games.find((x) => x.id === req.params.id);
  if (!game) return res.status(404).json({ message: 'Không tìm thấy bàn' });
  const round = game.rounds.find((r) => r.id === req.params.roundId);
  if (!round) return res.status(404).json({ message: 'Không tìm thấy ván' });
  try {
    const input = req.body ?? {};
    validateScores(game, input.scores, false);
    const ketQua = calculateRound(input);
    round.scores = (input.scores as { playerId: string; amount: unknown; hang?: unknown }[]).map((s) => ({
      playerId: s.playerId,
      amount: Number(s.amount),
      hang: typeof s.hang === 'number' ? s.hang : undefined,
    }));
    round.ketQua = ketQua;
    if (typeof input.ghiChu === 'string') round.ghiChu = input.ghiChu;
    await writeDb(db);
    res.json(round);
  } catch (e: unknown) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Dữ liệu ván không hợp lệ' });
  }
}

export async function deleteRound(req: Request, res: Response) {
  const db = await readDb();
  const game = db.games.find((x) => x.id === req.params.id);
  if (!game) return res.status(404).json({ message: 'Không tìm thấy bàn' });
  game.rounds = game.rounds.filter((r) => r.id !== req.params.roundId);
  game.rounds.forEach((r, idx) => { r.vanSo = idx + 1; });
  await writeDb(db);
  res.json({ ok: true });
}

/** Sao chep ban: giu cau hinh + thanh vien, khong copy van */
export async function duplicateGame(req: Request, res: Response) {
  const db = await readDb();
  const src = db.games.find((x) => x.id === req.params.id);
  if (!src) return res.status(404).json({ message: 'Không tìm thấy bàn' });
  const today = new Date();
  const p2 = (x: number) => String(x).padStart(2, '0');
  const game: Game = {
    id: uuid(), name: `${src.name} (moi)`,
    playerIds: [...src.playerIds], nghiIds: [...(src.nghiIds ?? [])],
    ngayChoi: `${today.getFullYear()}-${p2(today.getMonth() + 1)}-${p2(today.getDate())}`,
    maxVan: src.maxVan, cuoc: src.cuoc,
    createdAt: new Date().toISOString(), rounds: [],
  };
  db.games.push(game);
  await writeDb(db);
  res.status(201).json(game);
}

/** Dat lai ban: xoa toan bo van */
export async function resetRounds(req: Request, res: Response) {
  const db = await readDb();
  const game = db.games.find((x) => x.id === req.params.id);
  if (!game) return res.status(404).json({ message: 'Không tìm thấy bàn' });
  game.rounds = [];
  await writeDb(db);
  res.json({ ok: true });
}

export async function getSettlement(req: Request, res: Response) {
  const db = await readDb();
  const game = db.games.find((x) => x.id === req.params.id);
  if (!game) return res.status(404).json({ message: 'Không tìm thấy bàn' });
  const names = new Map(db.players.map((p) => [p.id, p.name] as [string, string]));
  res.json(settleGame(game, names));
}
