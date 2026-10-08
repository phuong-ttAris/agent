export interface Player {
  id: string;
  name: string;
  /** anh dai dien dataURL (tuy chon) */
  avatar?: string;
  createdAt: string;
}

export interface ScoreItem {
  playerId: string;
  amount: number;
  hang?: number;
}

export interface KetQuaItem {
  playerId: string;
  amount: number;
  tong: number;
  hang?: number;
  chiTiet: string;
}

export interface Round {
  id: string;
  gameId: string;
  vanSo: number;
  scores: ScoreItem[];
  ghiChu?: string;
  createdAt: string;
  ketQua: KetQuaItem[];
}

export interface Game {
  id: string;
  name: string;
  playerIds: string[];
  nghiIds?: string[];
  ngayChoi?: string;
  maxVan?: number;
  cuoc?: number;
  createdAt: string;
  rounds: Round[];
  soVan?: number;
}

export interface Settlement {
  players: {
    playerId: string;
    name: string;
    tongThuChi: number;
    soVanDuong: number;
  }[];
  debts: { from: string; fromName: string; to: string; toName: string; amount: number }[];
}
