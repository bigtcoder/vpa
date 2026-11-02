/* ONE switch for how prominent the VPA score is site-wide. 'secondary' (default, launch): players' own
   DUPR/PVNA/VDPR... ratings are the headline and the VPA level is a small "VPA level (beta)" line.
   'primary': VPA level is the headline and rankings open on the VPA-score tab. */
window.VPA_SCORE_PROMINENCE = window.VPA_SCORE_PROMINENCE || 'secondary';
window.vpaPrimary = () => window.VPA_SCORE_PROMINENCE === 'primary';
const _SYSL = { UTRP: 'UTR-P', SPORTCONNECT: 'Sport Connect', SELF: 'Self-rated' };
/* headline rating text, e.g. "DUPR 4.20"; r: {system, rating} */
window.vpaRt = r => r && r.system ? (_SYSL[r.system] || r.system) + ' ' + (+r.rating).toFixed(r.system === 'UTRP' ? 1 : 2) : '';
/* Shared EN/VI toggle for VPA pages (same localStorage key as main site). Page supplies window.VPA_I18N = {en:{},vi:{}} */
(function(){
  const SH = {en:{navRk:"Rankings",navLv:"Find my level",navEv:"Events",navTt:"Run an event",navPv:"Privacy",navRes:"Results",navLog:"Organiser sign-in & log",navHome:"Home",navAb:"About",navOrg:"For organisers",ftTag:"VPA — Vietnam Pickleball Asia · a pickleball tournament series from Đà Nẵng",vpaBeta:"VPA level (beta)",tabAll:"All systems",tabVpa:"VPA score (beta)",rating:"Rating"},
    vi:{vpaBeta:"Trình VPA (beta)",tabAll:"Mọi hệ thống",tabVpa:"Điểm VPA (beta)",rating:"Điểm",navRk:"Xếp hạng",navLv:"Xem trình của tôi",navEv:"Giải đấu",navTt:"Tổ chức giải",navPv:"Quyền riêng tư",navRes:"Kết quả",navLog:"Đăng nhập & nhật ký BTC",navHome:"Trang chủ",navAb:"Giới thiệu",navOrg:"Dành cho BTC",ftTag:"VPA — Vietnam Pickleball Asia · chuỗi giải pickleball từ Đà Nẵng"}};
  const D = () => window.VPA_I18N || {en:{},vi:{}};
  const G = (l, k) => (D()[l] || {})[k] ?? SH[l]?.[k];
  window.vt = k => G(window.vlang, k) ?? G('en', k) ?? k;
  function render(l){ window.vlang = l; document.documentElement.lang = l;
    document.querySelectorAll('[data-i18n]').forEach(e => { const v = G(l, e.dataset.i18n); if (v != null) e.innerHTML = v; });
    document.querySelectorAll('[data-i18n-ph]').forEach(e => { const v = G(l, e.dataset.i18nPh); if (v != null) e.placeholder = v; });
    const b = document.getElementById('langBtn'); if (b) b.textContent = l === 'en' ? 'VI' : 'EN';
    try { localStorage.setItem('fc-lang', l); } catch (e) {}
    document.dispatchEvent(new CustomEvent('vpa-lang', {detail:l})); }
  const q = new URLSearchParams(location.search).get('lang');
  let l = q === 'vi' || q === 'en' ? q : ((() => { try { return localStorage.getItem('fc-lang'); } catch (e) {} })() || 'en');
  window.vlang = l; window.vpaRender = render;
  document.addEventListener('DOMContentLoaded', () => { render(l);
    const b = document.getElementById('langBtn'); if (b) b.onclick = () => render(window.vlang === 'en' ? 'vi' : 'en'); });
})();
