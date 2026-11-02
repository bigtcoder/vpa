/* Run-an-event wizard: presentation only. Drives the existing generator controls (IDs unchanged). */
(function () {
  const $ = id => document.getElementById(id);
  const SYSA = { DUPR: 'DUPR', PVNA: 'PVNA', VDPR: 'VDPR', PICKNA: 'PICKNA', LOOL: 'LOOL', SPORTCONNECT: 'SPORTCONNECT', 'SPORT CONNECT': 'SPORTCONNECT', UTRP: 'UTRP', 'UTR-P': 'UTRP', UTR: 'UTRP', VAIR: 'VAIR', IPTPA: 'IPTPA', WPR: 'WPR', SELF: 'SELF' };
  /* lenient line → canonical "Name, M/F, SYSTEM, rating" */
  function parseLine(l) { l = l.replace(/^\s*\d+[.)]\s+/, '').trim(); if (!l) return null;
    let g = '', sys = '', r = ''; const keep = [];
    l.split(/[,;\t]+|\s+/).filter(Boolean).forEach(t => { const u = t.toUpperCase();
      if (!g && /^(M|F|MALE|FEMALE|NAM|NỮ|NU|NỮ)$/i.test(t)) g = /^(F|FEMALE|NỮ|NU)$/i.test(t) ? 'F' : 'M';
      else if (!sys && SYSA[u]) sys = SYSA[u];
      else if (!r && /^\d+([.,]\d+)?$/.test(t)) r = t.replace(',', '.');
      else keep.push(t); });
    const n = keep.join(' ').trim(); if (!n) return null; if (r && !sys) sys = 'SELF';
    return [n, g, sys, r].join(', '); }
  window.VPAWizParse = parseLine;
  document.addEventListener('DOMContentLoaded', () => {
    const steps = [...document.querySelectorAll('.wstep')], all = (() => { try { return localStorage.getItem('vpa-wiz-all') === '1'; } catch (e) { return false; } })() || /[?&]all=1/.test(location.search);
    let W = 1; const nP = () => document.querySelectorAll('#chips .chip').length;
    function show(w) { W = Math.max(1, Math.min(5, w)); steps.forEach(s => s.classList.toggle('on', +s.dataset.w === W));
      document.querySelectorAll('#wsteps span').forEach((s, i) => s.classList.toggle('on', i < W));
      $('wBack').style.visibility = W > 1 ? 'visible' : 'hidden'; $('wNext').classList.toggle('hide', W === 5);
      if (W === 3) { const n = nP(); $('rec').textContent = vt(n > 16 ? 'recT' : 'recS').replace('{n}', n); }
      if (W === 4 && !all) { const t = $('tabT').classList.contains('on'); if (t && !document.querySelector('#teams .chip, #teams tr') ) $('tauto').click(); setTimeout(() => (t ? $('tgen') : $('gen')).click(), 50); }
      if (!all) window.scrollTo(0, 0); }
    if (all) { document.body.classList.add('wiz-all'); document.querySelectorAll('details.more').forEach(d => d.open = true); $('wnav').classList.add('hide'); $('wsteps').classList.add('hide'); }
    $('wNext').onclick = () => { if (W === 2 && nP() < 4) { $('pcount').innerHTML = '<span class="warn">' + vt('needP') + '</span>'; return; } show(W + 1); };
    $('wBack').onclick = () => show(W - 1);
    const sync = () => { $('ename').value = $('tname').value = $('wname').value; }; $('wname').oninput = sync;
    $('wcourts').oninput = () => { $('courts').value = $('tcourts').value = $('wcourts').value; };
    $('pasteAdd').onclick = () => { const L = $('paste').value.split('\n').map(parseLine).filter(Boolean); if (!L.length) { $('paste').focus(); return; }
      $('bulk').value = L.join('\n'); $('bulkAdd').click(); $('paste').value = ''; };
    const pick = t => { $('chS').classList.toggle('on', t === 'S'); $('chT').classList.toggle('on', t === 'T'); $('gen').classList.toggle('hide', t !== 'S'); $('tgen').classList.toggle('hide', t !== 'T'); $('reseed').classList.toggle('hide', t !== 'S'); };
    $('chS').onclick = () => { $('tabS').click(); pick('S'); }; $('chT').onclick = () => { $('tabT').click(); pick('T'); };
    $('tabS').addEventListener('click', () => pick('S')); $('tabT').addEventListener('click', () => pick('T'));
    new MutationObserver(() => { const a = $('orgNote').querySelector('a'); if (a) { $('w5go').innerHTML = '<a class="b xl" href="' + a.href + '">' + vt('w5go') + '</a>'; if (!all) show(5); } }).observe($('orgNote'), { childList: true, subtree: true });
    show(1); if (all) steps.forEach(s => s.classList.add('on'));
  });
})();
