/** Doc so diem bang giong noi tieng Viet (Web Speech API). */
export function speakScores(items: { name: string; amount: number }[]): void {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const parts = items.map((it) =>
      it.amount >= 0
        ? `${it.name} được ${Math.abs(it.amount).toLocaleString('vi-VN')} đồng`
        : `${it.name} mất ${Math.abs(it.amount).toLocaleString('vi-VN')} đồng`,
    );
    const u = new SpeechSynthesisUtterance('Kết quả ván: ' + parts.join(', '));
    u.lang = 'vi-VN';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    /* trinh duyet khong ho tro -> bo qua */
  }
}
