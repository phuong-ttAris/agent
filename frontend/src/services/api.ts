const BASE = '';

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Loi ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  players: () => req<import('../types/index.js').Player[]>('/api/players'),
  createPlayer: (name: string, avatar?: string) =>
    req<import('../types/index.js').Player>('/api/players', { method: 'POST', body: JSON.stringify({ name, avatar }) }),
  deletePlayer: (id: string) => req<{ ok: boolean }>(`/api/players/${id}`, { method: 'DELETE' }),
  updatePlayer: (id: string, body: Record<string, unknown>) =>
    req<import('../types/index.js').Player>(`/api/players/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  totals: () =>
    req<{ playerId: string; name: string; tongThuChi: number; soVan: number }[]>('/api/players/totals'),

  games: () => req<import('../types/index.js').Game[]>('/api/games'),
  createGame: (body: Record<string, unknown>) =>
    req<import('../types/index.js').Game>('/api/games', { method: 'POST', body: JSON.stringify(body) }),
  game: (id: string) => req<import('../types/index.js').Game>(`/api/games/${id}`),
  deleteGame: (id: string) => req<{ ok: boolean }>(`/api/games/${id}`, { method: 'DELETE' }),
  duplicateGame: (id: string) =>
    req<import('../types/index.js').Game>(`/api/games/${id}/duplicate`, { method: 'POST' }),
  resetRounds: (id: string) =>
    req<{ ok: boolean }>(`/api/games/${id}/rounds`, { method: 'DELETE' }),
  updateGame: (id: string, body: Record<string, unknown>) =>
    req<import('../types/index.js').Game>(`/api/games/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  addRound: (id: string, body: Record<string, unknown>) =>
    req<import('../types/index.js').Round>(`/api/games/${id}/rounds`, { method: 'POST', body: JSON.stringify(body) }),
  deleteRound: (id: string, roundId: string) =>
    req<{ ok: boolean }>(`/api/games/${id}/rounds/${roundId}`, { method: 'DELETE' }),
  updateRound: (id: string, roundId: string, body: Record<string, unknown>) =>
    req<import('../types/index.js').Round>(`/api/games/${id}/rounds/${roundId}`, { method: 'PUT', body: JSON.stringify(body) }),
  settlement: (id: string) => req<import('../types/index.js').Settlement>(`/api/games/${id}/settlement`),
};

export function fmt(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}
