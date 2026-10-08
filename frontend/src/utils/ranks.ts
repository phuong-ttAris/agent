export interface RankDef {
  hang: number;
  label: string;
  /** he so nhan voi tien cuoc (duong = duoc, am = mat) */
  mult: number;
}

/** Bo hang + he so theo so nguoi (luon zero-sum): 2n [2,-2], 3n [1,0,-1], 4n [2,1,-1,-2] */
export function ranksFor(n: number): RankDef[] {
  if (n <= 2) {
    return [
      { hang: 1, label: 'Nhất', mult: 2 },
      { hang: 2, label: 'Bét', mult: -2 },
    ];
  }
  if (n === 3) {
    return [
      { hang: 1, label: 'Nhất', mult: 1 },
      { hang: 2, label: 'Nhì', mult: 0 },
      { hang: 3, label: 'Bét', mult: -1 },
    ];
  }
  return [
    { hang: 1, label: 'Nhất', mult: 2 },
    { hang: 2, label: 'Nhì', mult: 1 },
    { hang: 3, label: 'Ba', mult: -1 },
    { hang: 4, label: 'Bét', mult: -2 },
  ];
}

/** Tu hang da chon + tien cuoc -> diem tung nguoi */
export function calcRoundScores(
  memberIds: string[],
  assign: Record<number, string>,
  bet: number,
): { playerId: string; amount: number }[] {
  const ranks = ranksFor(memberIds.length);
  return memberIds.map((pid) => {
    const r = ranks.find((x) => assign[x.hang] === pid);
    return { playerId: pid, amount: (r?.mult ?? 0) * bet };
  });
}
