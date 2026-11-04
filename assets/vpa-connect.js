/* "Connect your ratings": one big button per system. Needs vpa-account.js. */
window.VPAConnect = (function () {
  const S = [
    { id: 'DUPR', l: 'DUPR', dir: true }, { id: 'PVNA', l: 'PVNA', dir: true }, { id: 'VDPR', l: 'VDPR', dir: true },
    { id: 'UTRP', l: 'UTR-P' }, { id: 'LOOL', l: 'LOOL', dir: true }, { id: 'SPORTCONNECT', l: 'SportConnect' },
    { id: 'PICKNA', l: 'PICKNA', dir: true }, { id: 'VAIR', l: 'VAIR' }, { id: 'IPTPA', l: 'IPTPA' }, { id: 'WPR', l: 'WPR' }];
  const A = () => window.VPAAccount, esc = s => A().esc(s);
  let duprCfg = null;
  async function duprOn() {
    if (duprCfg) return duprCfg;
    try { const c = await A().sb(); const r = await c.functions.invoke('dupr-link', { method: 'GET' }); duprCfg = r.data || { enabled: false }; } catch (e) { duprCfg = { enabled: false }; }
    return duprCfg;
  }
  function mount(el, onChange) {
    const st = { open: null };
    async function draw() {
      const me = A().me || { links: [] }, L = Object.fromEntries((me.links || []).map(x => [x.system, x]));
      el.innerHTML = '<div class="cn-grid">' + S.map(s => { const x = L[s.id];
        return '<button class="cn-b' + (x ? ' on' : '') + (st.open === s.id ? ' open' : '') + '" data-s="' + s.id + '"><b>' + s.l + '</b>' +
          (x ? '<span class="cn-r">' + (+x.rating).toFixed(s.id === 'PICKNA' ? 0 : 2) + '</span><span class="cn-st ' + (x.status || '') + '">' + vt(x.status === 'verified' ? 'cnVer' : x.status === 'self_reported' ? 'cnSelf' : 'cnLinked') + '</span>'
             : '<span class="cn-add">' + vt('cnAdd') + ' +</span>') + '</button>'; }).join('') + '</div><div class="cn-panel" id="cnPanel"></div>';
      el.querySelectorAll('.cn-b').forEach(b => b.onclick = () => { st.open = st.open === b.dataset.s ? null : b.dataset.s; draw(); });
      if (st.open) panel(el.querySelector('#cnPanel'), S.find(s => s.id === st.open), L[st.open]);
    }
    async function done() { await A().refresh(); st.open = null; draw(); onChange && onChange(); }
    async function panel(p, s, cur) {
      const c = await A().sb();
      let h = '<div class="cn-p"><h3>' + s.l + '</h3>';
      if (cur) h += '<p class="cn-cur">' + vt(cur.status === 'verified' ? 'cnVer' : cur.status === 'self_reported' ? 'cnSelf' : 'cnLinked') + ': <b>' + (+cur.rating).toFixed(2) + '</b> <button class="b g sm" id="cnRm">' + vt('cnRm') + '</button></p>';
      if (s.id === 'DUPR') { const d = await duprOn(); h += d.enabled ? '<p><button class="b acc xl" id="cnDupr">' + vt('cnDupr') + '</button></p><div id="cnFrame"></div>' : '<p class="note">' + vt('cnDuprOff') + '</p>'; }
      if (s.dir) h += '<form id="cnF" class="cn-f"><input id="cnQ" autocomplete="off" placeholder="' + esc(vt('cnPaste')) + '" aria-label="' + esc(vt('cnPaste')) + '"><button class="b acc">' + vt('cnFind') + '</button></form><div id="cnRes"></div>';
      h += '<details class="cn-self"' + (s.dir ? '' : ' open') + '><summary>' + vt('cnType') + '</summary><form id="cnS" class="cn-f"><input id="cnR" inputmode="decimal" placeholder="' + vt('cnType') + '" aria-label="' + vt('cnType') + '"><input id="cnU" type="url" placeholder="' + vt('cnUrl') + '" aria-label="' + vt('cnUrl') + '"><button class="b">' + vt('cnSaveT') + '</button></form></details><p class="err" id="cnE"></p></div>';
      p.innerHTML = h;
      const err = m => p.querySelector('#cnE').textContent = m ? vt('lgErr') + m : '';
      if (p.querySelector('#cnRm')) p.querySelector('#cnRm').onclick = async () => { const r = await c.rpc('unlink_rating', { p_id: cur.id }); r.error ? err(r.error.message) : done(); };
      const f = p.querySelector('#cnF');
      if (f) { setTimeout(() => p.querySelector('#cnQ').focus(), 30);
        const go = async () => { const q = p.querySelector('#cnQ').value.trim(); if (q.length < 2) return; const out = p.querySelector('#cnRes'); out.innerHTML = '<p class="note">…</p>';
          const r = await c.rpc('lookup_rating', { p_system: s.id, p_q: q }); if (r.error) { out.innerHTML = ''; return err(r.error.message); }
          out.innerHTML = r.data.length ? '<p class="cn-is">' + vt('clIs') + '</p>' + r.data.map((x, i) => '<div class="cn-m"><div><b>' + esc(x.name) + '</b><span>' + esc([x.city, x.ext_id && s.id + ' #' + x.ext_id].filter(Boolean).join(' · ')) + '</span></div><strong>' + (+x.rating).toFixed(s.id === 'PICKNA' ? 0 : 2) + '</strong><button class="b acc" data-i="' + i + '">' + vt('clYes') + '</button></div>').join('') : '<p class="note">' + vt('cnNone') + '</p>';
          out.querySelectorAll('[data-i]').forEach(b => b.onclick = async () => { const x = r.data[+b.dataset.i]; b.disabled = true; const q2 = await c.rpc('link_rating', { p_system: s.id, p_ext_id: x.ext_id, p_rating_type: x.rating_type }); q2.error ? (err(q2.error.message), b.disabled = false) : done(); });
          if (r.data.length) out.querySelector('[data-i]').focus(); };
        f.onsubmit = e => { e.preventDefault(); go(); };
        p.querySelector('#cnQ').addEventListener('paste', () => setTimeout(go, 30)); }
      p.querySelector('#cnS').onsubmit = async e => { e.preventDefault(); const v = parseFloat(p.querySelector('#cnR').value.replace(',', '.')), u = p.querySelector('#cnU').value.trim() || null;
        const r = await c.rpc('self_rating', { p_system: s.id, p_rating: v, p_url: u }); r.error ? err(r.error.message) : done(); };
      const dB = p.querySelector('#cnDupr');
      if (dB) dB.onclick = () => { const d = duprCfg, host = d.env === 'prod' ? 'https://dashboard.dupr.com' : 'https://uat.dupr.gg';
        p.querySelector('#cnFrame').innerHTML = '<iframe class="cn-if" src="' + host + '/login-external-app/' + encodeURIComponent(d.clientKeyB64) + '" allow="payment" title="DUPR"></iframe>';
        const h2 = async ev => { if (ev.origin !== host) return; const m = typeof ev.data === 'string' ? (() => { try { return JSON.parse(ev.data); } catch (e) { return {}; } })() : (ev.data || {});
          if (!m.userToken) return; window.removeEventListener('message', h2);
          const r = await c.functions.invoke('dupr-link', { body: { userToken: m.userToken, refreshToken: m.refreshToken, duprId: m.duprId } }); r.error ? err(r.error.message) : done(); };
        window.addEventListener('message', h2); };
    }
    draw(); document.addEventListener('vpa-lang', draw); A().on(() => draw());
    return { draw };
  }
  return { mount, SYSTEMS: S };
})();
