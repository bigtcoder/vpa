(async function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), f2 = x => x == null ? '–' : (+x).toFixed(2);
  const id = new URLSearchParams(location.search).get('id'); if (!id) { msg.innerHTML = '<div class="warn">' + vt('noId') + '</div>'; return; }
  const P = await VPA.load('../'); const { D, L, rank, lvl } = await VPALevels(P);
  const pl = D.players.find(p => p.id === id); if (!pl) { msg.innerHTML = '<div class="warn">' + vt('nf') + '</div>'; return; }
  const r = rank.find(x => x.id === id), nm = Object.fromEntries(D.players.map(p => [p.id, p.display_name]));
  function draw() { document.title = pl.display_name + ' · VPA'; nm_.innerHTML = esc(pl.display_name);
    const lv = L[id] || {}, rel = r ? r.reliability : Math.round(100 * Math.max(0, (0.8 - (lv.sd ?? 0.8)) / 0.74)), prov = r ? r.provisional : (lv.sd ?? 0.8) > 0.30;
    sum.innerHTML = '<div class="row"><div><label>' + vt('lvl') + '</label><b style="font-size:2em">' + f2(lv.level) + '</b> <small>± ' + f2(lv.sd) + '</small></div><div><label>' + vt('rel') + '</label><b>' + rel + '%</b><div class="bar"><i style="width:' + rel + '%"></i></div></div><div><label>&nbsp;</label><span class="pill ' + (prov ? 'needs_check' : 'eligible') + '">' + vt(prov ? 'prov' : 'est') + '</span></div><div><label>' + vt('mt') + '</label><b>' + (r?.matches || 0) + '</b> <small>(' + vt('wl') + ' ' + (r?.wins || 0) + '–' + (r?.losses || 0) + ')</small></div><div><label>' + vt('start') + '</label>' + f2(r?.start ?? lvl[id]?.level) + '</div></div>' + (prov ? '<p class="note">' + vt('provN') + '</p>' : '');
    const h = r?.history || []; if (!h.length) graph.innerHTML = '<p class="note">' + vt('none') + '</p>'; else {
      const pts = [{ mu: r.start ?? h[0].mu - h[0].dm, s: 0.5 }].concat(h.map(e => ({ mu: e[3], s: e[4] }))), W = 640, H = 220, n = pts.length;
      const lo = Math.min(...pts.map(p => p.mu - p.s)) - 0.05, hi = Math.max(...pts.map(p => p.mu + p.s)) + 0.05, X = i => 40 + i * (W - 50) / Math.max(1, n - 1), Y = v => H - 20 - (v - lo) / (hi - lo) * (H - 30);
      const band = pts.map((p, i) => X(i) + ',' + Y(p.mu + p.s)).join(' ') + ' ' + pts.map((p, i) => X(i) + ',' + Y(p.mu - p.s)).reverse().join(' ');
      const ticks = [lo, (lo + hi) / 2, hi].map(v => '<text x="2" y="' + (Y(v) + 4) + '" font-size="11" fill="#888">' + v.toFixed(2) + '</text>').join('');
      graph.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="rating history"><polygon points="' + band + '" fill="rgba(255,255,255,.12)"/><polyline points="' + pts.map((p, i) => X(i) + ',' + Y(p.mu)).join(' ') + '" fill="none" stroke="#ffffff" stroke-width="2.5"/>' + pts.map((p, i) => '<circle cx="' + X(i) + '" cy="' + Y(p.mu) + '" r="3" fill="#ffffff"><title>' + p.mu.toFixed(3) + '</title></circle>').join('') + ticks + '</svg>'; }
    const dm = Object.fromEntries(h.map(e => [e[5], e[2]]));
    const ms = (D.results || []).filter(m => [m.team_a1, m.team_a2, m.team_b1, m.team_b2].includes(id)).slice(0, 15);
    const link = x => x ? (x === id ? '<b>' + esc(nm[x] || '?') + '</b>' : '<a href="?id=' + x + '">' + esc(nm[x] || '?') + '</a>') : '';
    rec.innerHTML = ms.length ? '<table><tr><th>' + vt('d') + '</th><th>' + vt('ev') + '</th><th>' + vt('tm') + '</th><th>' + vt('op') + '</th><th>' + vt('sc') + '</th><th>' + vt('ch') + '</th></tr>' + ms.map(m => { const A = [m.team_a1, m.team_a2].includes(id), me = A ? [m.team_a1, m.team_a2] : [m.team_b1, m.team_b2], op = A ? [m.team_b1, m.team_b2] : [m.team_a1, m.team_a2], gw = (m.games || []).reduce((t, g) => t + (g.a > g.b ? 1 : -1), 0), won = (gw > 0) === A, d = dm[m.id], sc = (m.games || []).map(g => A ? g.a + '–' + g.b : g.b + '–' + g.a).join(', ');
      return '<tr><td>' + esc(m.played_on) + '</td><td>' + esc(m.event || '') + '</td><td>' + me.filter(Boolean).map(link).join(' / ') + '</td><td>' + op.filter(Boolean).map(link).join(' / ') + '</td><td>' + (won ? vt('w') : vt('l')) + ' ' + esc(sc) + '</td><td>' + (d == null ? '' : (d >= 0 ? '+' : '') + d.toFixed(3)) + '</td></tr>'; }).join('') + '</table>' : '<p class="note">' + vt('none') + '</p>';
    const ex = D.ratings.filter(x => x.player_id === id && x.system !== 'VPA');
    ext.innerHTML = ex.length ? '<table><tr><th>' + vt('sys') + '</th><th>' + vt('r') + '</th><th>' + vt('obs') + '</th></tr>' + ex.map(x => '<tr><td>' + esc(P.systems[x.system]?.label || x.system) + '</td><td>' + f2(x.rating) + '</td><td>' + esc((x.observed_at || '').slice(0, 10)) + '</td></tr>').join('') + '</table>' : '<p class="note">–</p>'; }
  const nm_ = document.getElementById('nm'); draw(); document.addEventListener('vpa-lang', draw);
})();
