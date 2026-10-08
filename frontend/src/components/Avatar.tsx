const COLORS = ['#22b573', '#7c4dff', '#00bcd4', '#ff9800', '#e91e63', '#00897b'];

export function avatarColor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return COLORS[h % COLORS.length];
}

interface Props {
  id: string;
  name: string;
  size?: number;
  /** anh dataURL tuy chon */
  src?: string;
  /** trang thai trong ban: true = dang choi, false = nghi, undefined = khong hien cham */
  playing?: boolean;
}

export default function Avatar({ id, name, size = 44, src, playing }: Props) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: avatarColor(id), fontSize: Math.round(size * 0.42) }}>
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        (name.trim().charAt(0) || '?').toUpperCase()
      )}
      {playing !== undefined && <i className={playing ? 'dot on' : 'dot'} />}
    </span>
  );
}
