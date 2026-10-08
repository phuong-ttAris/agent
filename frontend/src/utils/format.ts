/** Ten van tu dong = gio tao */
export function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Gio + ngay day du: 16:32 07/10/2025 */
export function fmtFull(iso: string): string {
  try {
    const d = new Date(iso);
    const p = (x: number) => String(x).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return '';
  }
}

/** Ngay choi: 07/10/2025 (+ Hom nay neu dung hom nay) */
export function fmtDay(iso: string): string {
  try {
    const d = new Date(iso);
    const p = (x: number) => String(x).padStart(2, '0');
    const s = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
    const t = new Date();
    const today = d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
    return today ? `${s} (Hôm nay)` : s;
  } catch {
    return '';
  }
}

export function fmtNum(v: number): string {
  return v.toLocaleString('vi-VN');
}

/** Tien co dau: +80đ / -40đ */
export function fmtSigned(v: number): string {
  const a = Math.abs(v).toLocaleString('vi-VN');
  return `${v >= 0 ? '+' : '-'}${a}đ`;
}

/** Ma ban ngan tu id */
export function shortCode(id: string): string {
  return id.replace(/-/g, '').slice(-4).toUpperCase();
}
