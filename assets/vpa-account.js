/* VPA account: header Log in button / name menu, shared auth helpers. Needs vpa-config.js + vpa-data.js. */
window.VPAAccount = (function () {
  const ROOT = (document.currentScript && document.currentScript.src.split('/assets/')[0] + '/') || '/vpa/';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let me = null, sess = null, subs = [];
  async function sb() { return window.VPAData ? VPAData.client() : null; }
  async function refresh() {
    const c = await sb(); if (!c) return null;
    const { data } = await c.auth.getSession(); sess = data.session;
    if (!sess) { me = null; } else { const r = await c.rpc('my_account', { p_name: sess.user.user_metadata?.name || null }); me = r.error ? null : r.data; }
    paint(); subs.forEach(f => f(me, sess)); return me;
  }
  function paint() {
    const h = document.querySelector('header.vh'); if (!h) return;
    let w = h.querySelector('.acct'); if (!w) { w = document.createElement('div'); w.className = 'acct'; h.insertBefore(w, h.querySelector('#langBtn')); }
    if (!sess) { w.innerHTML = '<a class="hlog" id="hLogin" href="' + ROOT + 'login/" data-i18n="aLogin">' + vt('aLogin') + '</a>'; return; }
    const n = (me && me.name) || sess.user.email.split('@')[0], ini = n.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
    w.innerHTML = '<button class="hme" id="hMe" aria-haspopup="true" aria-expanded="false"><span class="av">' + esc(ini) + '</span><span class="nm">' + esc(n) + '</span></button><div class="hmenu" id="hMenu" hidden>' +
      (me && me.player_id ? '<a href="' + ROOT + 'player/?id=' + me.player_id + '" data-i18n="aProfile">' + vt('aProfile') + '</a>' : '<a href="' + ROOT + 'account/" data-i18n="aProfile">' + vt('aProfile') + '</a>') +
      '<a href="' + ROOT + 'account/#ratings" data-i18n="aConnect">' + vt('aConnect') + '</a><a href="' + ROOT + 'account/#events" data-i18n="aEvents">' + vt('aEvents') + '</a>' +
      (me && me.organiser ? '<a href="' + ROOT + 'generate/" data-i18n="aOrg">' + vt('aOrg') + '</a>' : '') +
      '<button id="hOut" data-i18n="aLogout">' + vt('aLogout') + '</button></div>';
    const b = w.querySelector('#hMe'), m = w.querySelector('#hMenu');
    b.onclick = e => { e.stopPropagation(); m.hidden = !m.hidden; b.setAttribute('aria-expanded', !m.hidden); };
    document.addEventListener('click', () => { m.hidden = true; b.setAttribute('aria-expanded', 'false'); });
    w.querySelector('#hOut').onclick = async () => { const c = await sb(); await c.auth.signOut(); location.href = ROOT; };
  }
  function on(f) { subs.push(f); if (sess !== null || me) f(me, sess); }
  document.addEventListener('DOMContentLoaded', async () => {
    paint(); const c = await sb(); if (!c) return;
    c.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT' || ev === 'USER_UPDATED') refresh(); });
    refresh();
  });
  document.addEventListener('vpa-lang', paint);
  return { ROOT, esc, sb, refresh, on, get me() { return me; }, get session() { return sess; } };
})();
