/* Shared EN/VI toggle for VPA pages (same localStorage key as main site). Page supplies window.VPA_I18N = {en:{},vi:{}} */
(function(){
  const SH = {en:{navRk:"Ranking",navLv:"Check your level",navEv:"Events",navTt:"Tournament tools",navPv:"Privacy",navRes:"Results",navLog:"Organiser log",navHome:"Home",ftTag:"VPA — Vietnam Pickleball Asia"},
    vi:{navRk:"Xếp hạng",navLv:"Kiểm tra trình độ",navEv:"Giải đấu",navTt:"Công cụ tổ chức giải",navPv:"Quyền riêng tư",navRes:"Kết quả",navLog:"Nhật ký BTC",navHome:"Trang chủ",ftTag:"VPA — Vietnam Pickleball Asia"}};
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
