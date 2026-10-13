import { useState } from 'react';
import Modal from './Modal.js';
import Avatar from './Avatar.js';
import { fmtFull, fmtNum, fmtSigned } from '../utils/format.js';
import type { Player, Round } from '../types/index.js';

interface Props {
  round: Round;
  members: Player[];
  nameOf: (pid: string) => string;
  onSpeak: (roundId: string) => void;
  onCommitRow: (roundId: string, scores: { playerId: string; amount: number; hang?: number }[]) => Promise<void>;
  onDelete: (roundId: string, label: string) => void;
}

const HANG_LABEL: Record<number, string> = { 1: 'Nhất', 2: 'Nhì', 3: 'Ba', 4: 'Bét' };

/** The 1 van: tieu de + luoi diem + menu (xem/sua/xoa) + sua hang loat (validate tong=0) */
export default function RoundCard(props: Props) {
  const { round, members } = props;
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [info, setInfo] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const label = fmtFull(round.createdAt);
  const valOf = (pid: string) => round.ketQua.find((k) => k.playerId === pid)?.tong ?? 0;
  const order = [...members].sort((a, b) => valOf(b.id) - valOf(a.id));
  const hangOf = (pid: string) => round.ketQua.find((k) => k.playerId === pid)?.hang;
  const total = round.ketQua.reduce((a, k) => a + k.tong, 0);
  const draftSum = members.reduce((a, p) => a + (Number(draft[p.id] ?? valOf(p.id)) || 0), 0);

  function startEdit() {
    setMenu(false);
    setErr(null);
    setDraft(Object.fromEntries(members.map((p) => [p.id, String(valOf(p.id))])));
    setEditing(true);
  }

  async function saveDraft() {
    setErr(null);
    try {
      await props.onCommitRow(
        round.id,
        members.map((p) => ({
          playerId: p.id,
          amount: Number(draft[p.id]) || 0,
          hang: hangOf(p.id),
        })),
      );
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lưu thất bại');
    }
  }

  function badge(pid: string) {
    const h = hangOf(pid);
    const useH = h ?? (order.findIndex((p) => p.id === pid) + 1 || undefined);
    if (!useH) return null;
    if (useH === 1) return <span className="rb nhat">Nhất</span>;
    if (useH === 2) return <span className="rb nhi">Nhì</span>;
    return <span className="rb other">{HANG_LABEL[useH] ?? useH}</span>;
  }

  return (
    <div className="bcard">
      <div className="bcard-head">
        <span className="hm-tag">#{round.vanSo}</span>
        <span className="hm-time">{label}</span>
        <span className="done">✔ Đã hoàn thành</span>
        <span className="bcard-acts">
        <button className="hm-icobtn" title="Đọc điểm ván này" onClick={() => props.onSpeak(round.id)}>🔊</button>
        <span className="menuwrap">
          <button className="hm-icobtn" title="Tùy chọn" onClick={() => setMenu(!menu)}>⋮</button>
          {menu && (
            <div className="ctx">
              <button onClick={() => { setMenu(false); setInfo(true); }}>👁 Xem chi tiết</button>
              <button onClick={startEdit}>✎ Chỉnh sửa</button>
              <button className="danger" onClick={() => { setMenu(false); props.onDelete(round.id, label); }}>🗑 Xóa ván</button>
            </div>
          )}
        </span>
        </span>
      </div>
      {err && <p className="error">{err}</p>}
      <div className="bcard-grid" style={{ gridTemplateColumns: `repeat(${members.length}, minmax(0, 1fr))` }}>
        {members.map((p) => {
          const v = valOf(p.id);
          return (
            <div className="bcell" key={p.id} title={p.name}>
              <Avatar id={p.id} name={p.name} size={32} src={p.avatar} />
              <span className="bcell-name">{p.name}</span>
              {badge(p.id)}
              {editing ? (
                <input
                  className="score-input"
                  type="number"
                  value={draft[p.id] ?? ''}
                  onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value })}
                />
              ) : (
                <b className={v < 0 ? 'neg' : 'pos'}>{fmtSigned(v)}</b>
              )}
            </div>
          );
        })}
      </div>
      {editing && (
        <div className="row between">
          <span className="muted">Tổng: {draftSum}</span>
          <span className="row">
            <button onClick={() => setEditing(false)}>Hủy</button>
            <button className="primary" onClick={saveDraft}>Lưu</button>
          </span>
        </div>
      )}
      {info && (
        <Modal title={`Chi tiết ván lúc ${label}`} onClose={() => setInfo(false)}>
          <table>
            <tbody>
              {members.map((p) => (
                <tr key={p.id}>
                  <td>{props.nameOf(p.id)}{hangOf(p.id) ? ` (${HANG_LABEL[hangOf(p.id)!]})` : ''}</td>
                  <td><b>{fmtNum(valOf(p.id))}</b></td>
                </tr>
              ))}
              <tr><td><b>Tổng ván</b></td><td><b>{fmtNum(total)}</b></td></tr>
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}
