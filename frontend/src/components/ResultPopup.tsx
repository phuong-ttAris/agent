import { useEffect, useMemo, useRef } from 'react';
import Avatar from './Avatar.js';
import { fmtSigned } from '../utils/format.js';
import type { Player } from '../types/index.js';

const COLORS = ['#ff5252', '#ffc107', '#22b573', '#7c4dff', '#00bcd4', '#e91e63'];
const FLOWERS = ['🌸', '🌼', '🌺'];
const N = 32;
const SIZE = 96;

interface Props {
  player: Player;
  amount: number;
  /** true = nguoi ve bet (icon buon, chia buon, khong tung hoa); mac dinh = nguoi ve nhat (tung hoa) */
  lose?: boolean;
  onDone: () => void;
}

/** Popup giua man hinh: chuc mung nguoi ve nhat (tung hoa quanh avatar) hoac chia buon nguoi ve bet; tu tat sau 3s hoac bam de dong */
export default function ResultPopup({ player, amount, lose, onDone }: Props) {
  // giu onDone moi nhat trong ref de App re-render (loadAll) khong reset hen gio
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), 3000);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && done.current();
    window.addEventListener('keydown', esc);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', esc);
    };
  }, []);

  const parts = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => {
        const a = (i / N) * Math.PI * 2 + Math.random() * 0.4;
        const d = SIZE / 2 + 30 + Math.random() * 60;
        return {
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          rot: Math.random() * 720 - 360,
          delay: Math.random() * 0.2,
          flower: i % 4 === 0,
          ch: FLOWERS[i % FLOWERS.length],
          color: COLORS[i % COLORS.length],
        };
      }),
    [],
  );

  return (
    <div className="overlay" onClick={onDone}>
      <div
        className={lose ? 'popup winner lose' : 'popup winner'}
        role="dialog"
        aria-label={lose ? `Chia buồn ${player.name} về bét` : `Chúc mừng ${player.name} về nhất`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="winner-av">
          <Avatar id={player.id} name={player.name} size={SIZE} src={player.avatar} />
          {lose ? (
            <span className="sad-badge" aria-hidden="true">😢</span>
          ) : (
            <div className="confetti" aria-hidden="true">
              {parts.map((p, i) => (
                <span
                  key={i}
                  className={p.flower ? 'cf flower' : 'cf'}
                  style={{
                    background: p.flower ? undefined : p.color,
                    animationDelay: `${p.delay}s`,
                    ['--dx' as string]: `${p.dx}px`,
                    ['--dy' as string]: `${p.dy}px`,
                    ['--rot' as string]: `${p.rot}deg`,
                  }}
                >
                  {p.flower ? p.ch : null}
                </span>
              ))}
            </div>
          )}
        </div>
        {lose ? (
          <>
            <h3>😢 Chia buồn cùng {player.name}!</h3>
            <p className="muted">Đang về bét, ván sau gỡ lại nhé</p>
            <b className={`${amount < 0 ? 'neg' : 'pos'} winner-amt`}>{fmtSigned(amount)}</b>
          </>
        ) : (
          <>
            <h3>🎉 Chúc mừng {player.name}!</h3>
            <p className="muted">Về nhất ván này</p>
            <b className="pos winner-amt">{fmtSigned(amount)}</b>
          </>
        )}
      </div>
    </div>
  );
}
