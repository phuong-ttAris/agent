import { useState } from 'react';
import Avatar from './Avatar.js';
import type { Player } from '../types/index.js';

interface Props {
  players: Player[];
  inGameIds: string[];
  /** false khi chua chon ban: chi xem */
  canToggle: boolean;
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}

/** Dialog chon thanh vien (center): tick chon local, OK moi ap dung, Cancel bo qua. */
export default function MemberPicker(props: Props) {
  const { players, inGameIds } = props;
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string[]>(inGameIds);
  const [err, setErr] = useState<string | null>(null);

  const list = players.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  function toggle(pid: string) {
    if (!props.canToggle) return;
    setErr(null);
    setSel((s) => {
      if (s.includes(pid)) return s.filter((x) => x !== pid);
      if (s.length >= 4) {
        setErr('Ban da du 4 nguoi.');
        return s;
      }
      return [...s, pid];
    });
  }

  return (
    <div className="overlay" onClick={props.onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h3>Them thanh vien</h3>
          <button className="iconbtn" onClick={props.onClose} aria-label="Dong">✕</button>
        </div>
        <div className="search">
          <span>🔍</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tim thanh vien..." />
        </div>
        {!props.canToggle && <p className="muted">Chon ban choi truoc de them nguoi vao ban.</p>}
        <div className="picklist">
          {list.map((p) => {
            const on = sel.includes(p.id);
            return (
              <div
                key={p.id}
                className="pickrow"
                onClick={() => toggle(p.id)}
                style={{ cursor: props.canToggle ? 'pointer' : 'default' }}
              >
                <span className={on ? 'radio on' : 'radio'} />
                <Avatar id={p.id} name={p.name} size={38} src={p.avatar} playing={on} />
                <span className="pickname">{p.name}</span>
                <span className={on ? 'pill on' : 'pill'}>{on ? 'Đang chơi' : 'Nghỉ'}</span>
              </div>
            );
          })}
          {list.length === 0 && <p className="muted">Khong tim thay ai.</p>}
        </div>
        {err && <p className="error">{err}</p>}
        <div className="frow2">
          <button className="ghostbtn" onClick={props.onClose}>Hủy</button>
          <button className="redbtn" disabled={!props.canToggle} onClick={() => props.onConfirm(sel)}>OK</button>
        </div>
      </div>
    </div>
  );
}
