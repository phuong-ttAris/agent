import type { KetQuaItem, RoundInput } from '../types/index.js';

/**
 * Tinh tien don gian: nguoi dung nhap so tien moi van cho tung nguoi.
 * + la duoc (thu), - la mat (chi). BE chi tong hop, khong ap luat la/chat/thoi.
 */
export function calculateRound(input: RoundInput): KetQuaItem[] {
  if (!Array.isArray(input.scores) || input.scores.length === 0) {
    throw new Error('Điểm không được để trống');
  }
  return input.scores.map((s) => {
    if (!s.playerId) throw new Error('Thiếu playerId trong điểm');
    if (typeof s.amount !== 'number' || Number.isNaN(s.amount)) {
      throw new Error('Số điểm phải là số (âm/dương)');
    }
    return {
      playerId: s.playerId,
      amount: s.amount,
      tong: s.amount,
      hang: typeof s.hang === 'number' ? s.hang : undefined,
      chiTiet: s.amount >= 0 ? `+${s.amount}` : `${s.amount}`,
    };
  });
}

export function settleGame(
  game: { playerIds: string[]; rounds: { ketQua: { playerId: string; tong: number }[] }[] },
  playerNames: Map<string, string>,
) {
  const totals = new Map<string, { tong: number; soVanDuong: number }>();
  for (const pid of game.playerIds) totals.set(pid, { tong: 0, soVanDuong: 0 });
  for (const r of game.rounds) {
    for (const k of r.ketQua) {
      const t = totals.get(k.playerId) ?? { tong: 0, soVanDuong: 0 };
      t.tong += k.tong;
      if (k.tong > 0) t.soVanDuong += 1;
      totals.set(k.playerId, t);
    }
  }
  const players = [...totals.entries()].map(([playerId, t]) => ({
    playerId,
    name: playerNames.get(playerId) ?? playerId.slice(0, 6),
    tongThuChi: t.tong,
    soVanDuong: t.soVanDuong,
  }));

  // Toi thieu giao dich: nguoi am tra nguoi duong
  const creditors = players.filter((p) => p.tongThuChi > 0).sort((a, b) => b.tongThuChi - a.tongThuChi).map((p) => ({ ...p }));
  const debtors = players.filter((p) => p.tongThuChi < 0).sort((a, b) => a.tongThuChi - b.tongThuChi).map((p) => ({ ...p }));
  const debts: { from: string; fromName: string; to: string; toName: string; amount: number }[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i], c = creditors[j];
    const amount = Math.min(-d.tongThuChi, c.tongThuChi);
    if (amount <= 0) break;
    debts.push({ from: d.playerId, fromName: d.name, to: c.playerId, toName: c.name, amount });
    d.tongThuChi += amount;
    c.tongThuChi -= amount;
    if (Math.abs(d.tongThuChi) < 1) i++;
    if (Math.abs(c.tongThuChi) < 1) j++;
  }
  return { players, debts };
}
