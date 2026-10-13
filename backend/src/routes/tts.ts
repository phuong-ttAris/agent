import { Router } from 'express';

// Zalo AI Text-to-Audio: https://ai.zalo.solutions/docs/api/text-to-audio-converter
// Key chi nam o server (bien moi truong ZALO_TTS_KEY), khong gui xuong trinh duyet.
const ZALO_URL = 'https://api.zalo.ai/v1/tts/synthesize';
const MAX_CHARS = 200;
const CACHE_MAX = 200;
const cache = new Map<string, Buffer>(); // cung 1 cau doc lai thi khong ton quota

const r = Router();

r.post('/', async (req, res) => {
  const key = process.env.ZALO_TTS_KEY;
  if (!key) return res.status(503).json({ message: 'Chưa cấu hình ZALO_TTS_KEY' });
  const text = String(req.body?.text ?? '').trim();
  if (!text) return res.status(400).json({ message: 'Thiếu nội dung cần đọc' });
  if (text.length > MAX_CHARS) return res.status(400).json({ message: `Nội dung tối đa ${MAX_CHARS} ký tự` });

  let audio = cache.get(text);
  if (!audio) {
    try {
      const body = new URLSearchParams({ input: text, speaker_id: '1', speed: '1.0', encode_type: '1' });
      const z = (await (await fetch(ZALO_URL, { method: 'POST', headers: { apikey: key }, body })).json()) as {
        error_code?: number;
        error_message?: string;
        data?: { url?: string };
      };
      if (z.error_code !== 0 || !z.data?.url) return res.status(502).json({ message: z.error_message ?? 'Zalo TTS lỗi' });
      // File mp3 duoc tao bat dong bo: moi goi dau co the 404, thu lai toi ~3s.
      for (let i = 0; i < 10 && !audio; i++) {
        const f = await fetch(z.data.url);
        if (f.ok) audio = Buffer.from(await f.arrayBuffer());
        else await new Promise((ok) => setTimeout(ok, 300));
      }
      if (!audio) return res.status(502).json({ message: 'Không tải được audio từ Zalo' });
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
      cache.set(text, audio);
    } catch (e) {
      console.error('[tts] loi:', e);
      return res.status(502).json({ message: 'Không kết nối được Zalo TTS' });
    }
  }
  res.set('Content-Type', 'audio/mpeg').set('Cache-Control', 'private, max-age=86400').send(audio);
});

export default r;
