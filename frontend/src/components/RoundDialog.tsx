import { useState } from 'react';
import Avatar from './Avatar.js';
import Icon from './Icon.js';
import { fmtSigned } from '../utils/format.js';
import type { Player } from '../types/index.js';

interface Props {
  members: Player[];
  onClose: () => void;
  onSave: (scores: { playerId: string; amount: number }[]) => Promise<void>;
}

/** Dialog them van: moi thanh vien 1 o nhap +/- ; o trong = 0, cong don truc tiep vao total */
export default function RoundDialog({ members, onClose, onSave }: Props) {
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = members.reduce((sum, p) => sum + (Number(scores[p.id]) || 0), 0);
  const hasAny = members.some((p) => (scores[p.id] ?? '').trim() !== '');
  const canSave = members.length >= 2 && hasAny && !saving;

  async function save() {
    if (!canSave) return;
    setErr(null);
    setSaving(true);
    try {
      await onSave(members.map((p) => ({ playerId: p.id, amount: Number(scores[p.id]) || 0 })));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lưu thất bại');
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h3>Thêm ván mới ({members.length} người)</h3>
          <button className="iconbtn" onClick={onClose} aria-label="Đóng"><Icon name="x" /></button>
        </div>
        {err && <p className="error">{err}</p>}
        {members.length === 0 && <p className="error">Bàn chưa có ai đang chơi.</p>}
        {members.map((p) => {
          const raw = scores[p.id] ?? '';
          const v = Number(raw);
          const typed = raw.trim() !== '';
          return (
            <div className="mrank" key={p.id}>
              <Avatar id={p.id} name={p.name} size={36} src={p.avatar} playing />
              <span className="mrank-name">{p.name}</span>
              <input
                className={`score-input ${typed ? (v < 0 ? 'neg' : 'pos') : ''}`}
                type="text"
                placeholder="+/-"
                value={raw}
                onChange={(e) => setScores({ ...scores, [p.id]: e.target.value })}
              />
            </div>
          );
        })}
        <div className="round-total">
          <span>Tổng ván</span>
          <b className={total < 0 ? 'neg' : total > 0 ? 'pos' : ''}>{fmtSigned(total)}</b>
        </div>
        <p className="muted hint">Nhập số dương nếu thắng, số âm nếu thua. Ô trống tính là 0.</p>
        <button className="sheet-cta" disabled={!canSave} onClick={save}>
          {saving ? 'Đang lưu…' : 'Lưu ván'}
        </button>
      </div>
    </div>
  );
}
