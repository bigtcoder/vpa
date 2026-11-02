/* Shared event cards (home + events page). Real DB events only; Papi Point Finals is Tom's real event, linked out. */
window.VPAEv = (function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MO = { en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], vi: ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'] };
  const today = () => new Date().toISOString().slice(0, 10);
  const dt = d => { if (!d) return '<div class="dt">?<small>' + vt('evTBA') + '</small></div>'; const [y, m, dd] = d.split('-'); return '<div class="dt">' + (+dd) + '<small>' + MO[window.vlang === 'vi' ? 'vi' : 'en'][+m - 1] + ' ' + y.slice(2) + '</small></div>'; };
  const PAPI = B => '<a class="ecard" href="https://www.papifinals.com" target="_blank" rel="noopener"><div class="dt">🏆<small>Đà Nẵng</small></div><div class="in"><b>Papi Point Finals</b><span>Đà Nẵng · ' + vt('papiN') + '</span></div><span class="b g">' + vt('evMore') + ' ↗</span></a>';
  function card(e, B) { const up = !e.starts_on || e.starts_on >= today();
    return '<div class="ecard">' + dt(e.starts_on) + '<div class="in"><b>' + esc(e.name) + '</b><span>' + esc(e.location || '') + (e.status === 'live' ? ' · 🔴 ' + vt('evLiveNow') : '') + '</span></div>' +
      (e.reg_open && up ? '<a class="b" href="' + B + 'register/?event=' + e.id + '">' + vt('eReg') + '</a>' : '<a class="b g" href="' + B + 'event/?id=' + e.id + '">' + vt(up ? 'evView' : 'evRes') + '</a>') + '</div>'; }
  async function load() { const sb = await VPAData.client(); if (!sb) return []; const r = await sb.from('events').select('id,name,location,starts_on,reg_open,status,kind').order('starts_on', { ascending: true, nullsFirst: false }).limit(200); return r.data || []; }
  const split = E => { const t = today(); return { up: E.filter(e => !e.starts_on || e.starts_on >= t), past: E.filter(e => e.starts_on && e.starts_on < t).reverse() }; };
  return { esc, card, load, split, PAPI, today };
})();
