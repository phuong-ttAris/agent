/** Gioi han dataURL avatar: ~400KB anh = ~533k ky tu base64, duoi tran 550k cua backend. */
const MAX_DATAURL = 530000;
const MAX_SIDE = 1024;

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh'));
    };
    img.src = url;
  });
}

/**
 * Thu nho anh cho den khi <= ~400KB: ve len canvas (toi da 1024px), xuat JPEG,
 * giam chat luong 0.9 -> 0.5, neu van lon thi giam kich thuoc 20% roi thu lai.
 */
export async function compressImage(file: File): Promise<string> {
  const img = await load(file);
  let scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  for (let round = 0; round < 8; round++) {
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh');
    ctx.fillStyle = '#fff'; // PNG trong suot -> nen trang thay vi den khi sang JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    for (let q = 0.9; q >= 0.5; q -= 0.1) {
      const url = canvas.toDataURL('image/jpeg', q);
      if (url.length <= MAX_DATAURL) return url;
    }
    scale *= 0.8;
  }
  throw new Error('Không thể thu nhỏ ảnh xuống dưới 400KB');
}
