// BE: nhap diem truc tiep (+/-) cho moi nguoi choi
export interface Player {
  id: string;
  name: string;
  /** anh dai dien dataURL (tuy chon) */
  avatar?: string;
  createdAt: string;
}

export interface ScoreItem {
  playerId: string;
  /** + la duoc tien, - la mat tien */
  amount: number;
  /** hang 1..4 (tuy chon, de hien huy chuong) */
  hang?: number;
}

export interface RoundInput {
  scores: ScoreItem[];
  ghiChu?: string;
}

export interface KetQuaItem {
  playerId: string;
  amount: number;
  tong: number;
  hang?: number;
  chiTiet: string;
}

export interface Round extends RoundInput {
  id: string;
  gameId: string;
  vanSo: number;
  createdAt: string;
  ketQua: KetQuaItem[];
}

export interface Game {
  id: string;
  name: string;
  playerIds: string[];
  /** id dang nghi (khong tham gia van moi) */
  nghiIds?: string[];
  /** ngay choi YYYY-MM-DD (mac dinh = ngay tao) */
  ngayChoi?: string;
  /** so van toi da cua ban */
  maxVan: number;
  /** tien cuoc moi van */
  cuoc: number;
  createdAt: string;
  rounds: Round[];
}

export interface Debt {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}
