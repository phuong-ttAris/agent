import { useEffect } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Popup chung: overlay + hop thoai giua man hinh */
export default function Modal({ title, onClose, children }: Props) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h3>{title}</h3>
          <button className="iconbtn" onClick={onClose} aria-label="Dong">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
