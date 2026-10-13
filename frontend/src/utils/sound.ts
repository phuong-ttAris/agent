/** Doc so diem: ten tieng Viet doc bang giong Viet, ten tieng Anh doc bang giong Anh (Web Speech API). */
type Lang = 'vi' | 'en';

// Am tiet tieng Viet (khong dau): [phu am dau] + nguyen am + [phu am cuoi]. j, f, w, z, ...r/l/s/d cuoi => khong phai tieng Viet.
const VI_SYLLABLE = /^(?:ngh|ng|nh|ph|th|tr|ch|gh|gi|kh|qu|[bcdghklmnpqrstvx])?[aeiouy]{1,3}(?:ch|ng|nh|c|m|n|p|t)?$/;
const VI_ONLY_LETTERS = /[ăâđêôơư]/i;

// Ten Anh pho bien nhung cau truc trung am tiet Viet => khong the suy ra tu quy tac.
const EN_NAMES = new Set(
  'tom ben sam max tim jim joe bob dan don ron ken kevin mary anna annie amy emma lisa lily kate katie sara sarah linda mike david peter paul mark andy tony jack jake john alex anna nancy tina tony tommy ted tim ron rose sally susan lucy mia ella nick nate leo'.split(' '),
);

export function detectLang(name: string): Lang {
  const lower = name.trim().toLowerCase();
  if (EN_NAMES.has(lower)) return 'en';
  if (VI_ONLY_LETTERS.test(lower)) return 'vi';
  // Bo dau thanh de kiem tra cau truc; ten chi co dau thanh + cau truc hop le => tieng Viet.
  const plain = lower.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const words = plain.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'vi';
  const ok = words.every((w) => /^\d+$/.test(w) || isViWord(w));
  return ok ? 'vi' : 'en';
}

// Cho phep ten viet lien nhieu am tiet (vd "minhanh") bang cach thu tach dan.
function isViWord(w: string): boolean {
  if (VI_SYLLABLE.test(w)) return true;
  for (let i = 2; i < w.length - 1; i++) {
    if (VI_SYLLABLE.test(w.slice(0, i)) && isViWord(w.slice(i))) return true;
  }
  return false;
}

function pickVoice(prefix: string, prefer: RegExp): SpeechSynthesisVoice | undefined {
  const vs = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix));
  // Uu tien giong neural/online vi tu nhien hon giong may.
  return vs.find((v) => prefer.test(v.name)) ?? vs[0];
}

let token = 0; // moi lan bam doc tang 1 -> lan doc cu tu dung
// 1 the <audio> dung chung: iOS (Safari + Chrome iOS deu dung WebKit) chi cho phat sau khi
// chinh the nay da duoc "mo khoa" bang cham, va the <audio> khong bi cong tac im lang chan nhu Web Audio.
let audioEl: HTMLAudioElement | null = null;
let stopCurrent: (() => void) | null = null;
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
const ZALO_MAX = 200; // khop gioi han cua /api/tts

/** Doc bang Web Speech (giong cua trinh duyet). Resolve khi doc xong hoac loi. */
function speakWeb(text: string, lang: Lang): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text);
    const v = lang === 'vi' ? pickVoice('vi', /online|natural|google|hoaimy|namminh/i) : pickVoice('en', /online|natural|google|aria|jenny|guy/i);
    u.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    const done = () => resolve();
    u.onend = done;
    u.onerror = (e) => {
      console.warn('[speech] loi:', e.error);
      done();
    };
    // Chrome co the huy utterance neu bi garbage-collect -> giu tham chieu.
    (window as unknown as { __utt?: SpeechSynthesisUtterance }).__utt = u;
    synth.speak(u);
    if (synth.paused) synth.resume();
    setTimeout(done, 15000); // an toan: khong de hang doi treo
  });
}

/** Lay audio giong Zalo tu backend; null neu chua cau hinh / loi (se dung giong trinh duyet). */
async function fetchZalo(text: string): Promise<Blob | null> {
  if (text.length > ZALO_MAX) return null;
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

/**
 * Mo khoa am thanh o lan cham dau tien (phat 1 file im lang tren chinh the <audio> dung chung).
 * Chi dung touchend/click: iOS khong coi pointerdown/touchstart la thao tac hop le.
 */
function unlockAudio(): void {
  if (stopCurrent) return; // dang doc thi dung dong vao the <audio>
  try {
    const el = (audioEl ??= new Audio());
    el.src = SILENT_WAV;
    void el.play().then(() => ['touchend', 'click'].forEach((e) => document.removeEventListener(e, unlockAudio)), () => {});
  } catch {
    /* khong ho tro -> se dung giong trinh duyet */
  }
}
if (typeof document !== 'undefined') {
  ['touchend', 'click'].forEach((e) => document.addEventListener(e, unlockAudio));
}

/**
 * Phat 1 blob mp3: nap xong (canplaythrough) roi cho `lead` giay truoc khi phat,
 * vi thiet bi can ~vai tram ms de danh thuc dau ra, neu khong se cat mat chu dau.
 */
function playBlob(blob: Blob, lead: number): Promise<boolean> {
  return new Promise((resolve) => {
    const el = (audioEl ??= new Audio());
    const url = URL.createObjectURL(blob);
    let finished = false;
    const end = (ok: boolean) => {
      if (finished) return;
      finished = true;
      stopCurrent = null;
      el.onended = el.onerror = el.oncanplaythrough = null;
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    stopCurrent = () => {
      el.pause();
      end(true); // bi lan doc moi cat ngang: run() tu thoat nho token
    };
    el.onended = () => end(true);
    el.onerror = () => end(false);
    el.oncanplaythrough = () => {
      el.oncanplaythrough = null;
      setTimeout(() => {
        if (!finished) el.play().catch(() => end(false));
      }, lead * 1000);
    };
    el.src = url;
    el.load();
    setTimeout(() => end(false), 15000); // an toan: khong de hang doi treo
  });
}

export function speakScores(items: { name: string; amount: number }[]): void {
  void run(items);
}

async function run(items: { name: string; amount: number }[]): Promise<void> {
  const my = ++token;
  stopCurrent?.(); // lan doc truoc dang phat thi dung lai
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  // Chia thanh cac doan lien tiep cung ngon ngu: ten (vi/en) + "duoc/mat N" (vi). Khong doc "dong".
  const segs: { text: string; lang: Lang }[] = [];
  const push = (text: string, lang: Lang) => {
    const last = segs[segs.length - 1];
    if (last && last.lang === lang) last.text += ' ' + text;
    else segs.push({ text, lang });
  };
  for (const it of items) {
    const name = /^\d+$/.test(it.name.trim()) ? it.name.trim().split('').join(' ') : it.name; // so: doc tung chu so
    push(name, detectLang(it.name));
    push(it.amount === 0 ? 'hòa.' : `${it.amount > 0 ? 'được' : 'mất'} ${Math.abs(it.amount)}.`, 'vi');
  }

  // Tai truoc song song cac doan tieng Viet de phat lien mach, khong bi khoang lang.
  const audios = segs.map((s) => (s.lang === 'vi' ? fetchZalo(s.text) : Promise.resolve(null)));
  for (let i = 0; i < segs.length; i++) {
    const blob = await audios[i];
    if (my !== token) return; // co lan doc moi -> bo
    if (blob && (await playBlob(blob, i === 0 ? 0.25 : 0.05))) continue;
    if (my !== token || !('speechSynthesis' in window)) return;
    await new Promise((r) => setTimeout(r, 80)); // speak() ngay sau cancel() bi Chrome bo qua
    await speakWeb(segs[i].text, segs[i].lang);
  }
}
