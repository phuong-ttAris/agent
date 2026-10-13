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
let audioCtx: AudioContext | null = null;
let current: AudioBufferSourceNode | null = null;
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
 * Dien thoai (iOS Safari, Chrome Android) chi cho mo AudioContext ngay trong luc cham.
 * Mo khoa o lan cham dau tien tren trang (phat 1 buffer im lang) de sau do phat duoc o bat ky luc nao.
 */
function unlockAudio(): void {
  try {
    const ctx = (audioCtx ??= new AudioContext());
    void ctx.resume();
    const s = ctx.createBufferSource();
    s.buffer = ctx.createBuffer(1, 1, 22050);
    s.connect(ctx.destination);
    s.start(0);
    if (ctx.state === 'running') ['pointerdown', 'touchend', 'click'].forEach((e) => document.removeEventListener(e, unlockAudio));
  } catch {
    /* khong ho tro Web Audio -> se dung giong trinh duyet */
  }
}
if (typeof document !== 'undefined') {
  ['pointerdown', 'touchend', 'click'].forEach((e) => document.addEventListener(e, unlockAudio));
}

/**
 * Phat bang Web Audio: thiet bi/trinh duyet can ~vai tram ms de "danh thuc" nen doan dau hay bi cat.
 * Cho resume() xong roi bat dau phat lui `lead` giay de khong mat chu dau.
 */
async function playBlob(blob: Blob, lead: number): Promise<boolean> {
  try {
    const ctx = (audioCtx ??= new AudioContext());
    // resume() co the treo mai neu chua duoc mo khoa -> toi da 500ms roi bo (se doc bang giong trinh duyet).
    if (ctx.state !== 'running') await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 500))]);
    if (ctx.state !== 'running') return false;
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    return await new Promise<boolean>((resolve) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => resolve(true);
      current = src;
      src.start(ctx.currentTime + lead);
    });
  } catch (e) {
    console.warn('[audio] loi phat:', e);
    return false;
  }
}

export function speakScores(items: { name: string; amount: number }[]): void {
  void run(items);
}

async function run(items: { name: string; amount: number }[]): Promise<void> {
  const my = ++token;
  try {
    current?.stop(); // lan doc truoc dang phat thi dung lai (onended cua no van resolve)
  } catch {
    /* da dung roi */
  }
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
