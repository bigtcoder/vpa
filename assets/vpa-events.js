/* Shared event cards (home + events page). Real DB events only; Papi Point Finals is Tom's real event, linked out. */
window.VPAEv = (function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MO = { en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], vi: ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'] };
  const IM = ['ev1', 'ev4', 'ev2', 'ev6', 'ev3', 'ev5'];
  const today = () => new Date().toISOString().slice(0, 10);
  const mo = m => MO[window.vlang === 'vi' ? 'vi' : 'en'][m - 1];
  const dt = d => { if (!d) return '<div class="dt">?<small>' + vt('evTBA') + '</small></div>'; const [y, m, dd] = d.split('-'); return '<div class="dt">' + (+dd) + '<small>' + mo(+m) + ' ' + y.slice(2) + '</small></div>'; };
  const long = d => { if (!d) return vt('evTBA'); const [y, m, dd] = d.split('-'); return (+dd) + ' ' + mo(+m) + ' ' + y; };
  const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const img = (e, B) => 'img/' + IM[hash(e.id || e.name) % IM.length] + '.webp';
  const PAPI = B => '<a class="ecard" href="https://www.papifinals.com" target="_blank" rel="noopener" style="--img:url(img/ev1.webp)"><div class="lg"><img src="' + B + 'assets/img/papi-point-finals-logo.webp" alt="Papi Point Finals"></div><div class="tag"><span class="ac">' + vt('papiTag') + '</span></div>' +
    '<div class="in"><div class="ser">Đà Nẵng · Vietnam</div><b>Papi Point Finals</b><span class="w">' + vt('papiN') + '</span><div class="act"><span class="b acc">' + vt('evMore') + ' ↗</span></div></div></a>';
  function card(e, B) { const up = !e.starts_on || e.starts_on >= today(), live = e.status === 'live';
    const tags = (live ? '<span class="live">● ' + vt('evLiveNow') + '</span>' : '') + (e.reg_open && up ? '<span class="ac">' + vt('evOpen') + '</span>' : '') + (e.kind ? '<span>' + esc(e.kind === 'tournament' ? vt('evTour') : vt('evSoc')) + '</span>' : '');
    return '<div class="ecard' + (up ? '' : ' past') + '" style="--img:url(' + img(e, B) + ')">' + dt(e.starts_on) + '<div class="tag">' + tags + '</div><div class="in"><div class="ser">VPA Tour' + (e.location ? ' · ' + esc(e.location) : '') + '</div><b>' + esc(e.name) + '</b><span class="w">' + long(e.starts_on) + (e.location ? ' · ' + esc(e.location) : '') + '</span><div class="act">' +
      (e.reg_open && up ? '<a class="b acc" href="' + B + 'register/?event=' + e.id + '">' + vt('eReg') + '</a><a class="b g" href="' + B + 'event/?id=' + e.id + '">' + vt('evView') + '</a>' : '<a class="b ' + (up ? 'acc' : 'g') + '" href="' + B + 'event/?id=' + e.id + '">' + vt(up ? 'evView' : 'evRes') + '</a>') + '</div></div></div>'; }
  async function load() { const sb = await VPAData.client(); if (!sb) return []; const r = await sb.from('events').select('id,name,location,starts_on,reg_open,status,kind').order('starts_on', { ascending: true, nullsFirst: false }).limit(200); return r.data || []; }
  const split = E => { const t = today(); return { up: E.filter(e => !e.starts_on || e.starts_on >= t), past: E.filter(e => e.starts_on && e.starts_on < t).reverse() }; };
  return { esc, card, load, split, PAPI, today, long, img };
})();
