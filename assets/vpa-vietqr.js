/* VietQR (NAPAS EMVCo) payload builder. Image only — no funds are held; organiser marks payments by hand. */
window.VietQR = (function () {
  const f = (id, v) => id + String(v.length).padStart(2, '0') + v;
  function crc16(s) { let c = 0xFFFF; for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) c = c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1; c &= 0xFFFF; } return c.toString(16).toUpperCase().padStart(4, '0'); }
  const strip = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z0-9 ]/g, '').slice(0, 25);
  function payload({ bin, account, amount, info }) {
    const mai = f('00', 'A000000727') + f('01', f('00', bin) + f('01', account)) + f('02', 'QRIBFTTA');
    let s = f('00', '01') + f('01', amount ? '12' : '11') + f('38', mai) + f('53', '704') + (amount ? f('54', String(Math.round(amount))) : '') + f('58', 'VN') + (info ? f('62', f('08', strip(info))) : '') + '6304';
    return s + crc16(s);
  }
  const BANKS = [['970436', 'Vietcombank'], ['970415', 'VietinBank'], ['970418', 'BIDV'], ['970405', 'Agribank'], ['970407', 'Techcombank'], ['970422', 'MB Bank'], ['970416', 'ACB'], ['970432', 'VPBank'], ['970423', 'TPBank'], ['970403', 'Sacombank']];
  async function render(el, opts) { if (!window.qrcode) await new Promise((r, j) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'; s.onload = r; s.onerror = j; document.head.appendChild(s); });
    const q = qrcode(0, 'M'); q.addData(payload(opts)); q.make(); el.innerHTML = q.createSvgTag({ cellSize: 5, margin: 3, scalable: true }); el.querySelector('svg').style.cssText = 'background:#fff;max-width:240px;border-radius:8px'; }
  return { payload, crc16, render, BANKS, strip };
})();
