(async function () {
  const $ = id => document.getElementById(id), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const id = new URLSearchParams(location.search).get('id'); if (!id) { msg.innerHTML = '<div class="warn">' + vt('noId') + '</div>'; return; }
  let org = { isOrg: false }, E = null, M = [], sb = await VPAData.client(); if (!sb) return;
  const G = m => (m.games || []).map(g => [g.a, g.b]);
  async function load() { const [e, m] = await Promise.all([sb.from('events').select('*').eq('id', id).maybeSingle(), sb.from('event_matches_public').select('*').eq('event_id', id).order('round_no').order('court')]);
    if (e.error || !e.data) { msg.innerHTML = '<div class="warn">' + vt('notFound') + '</div>'; return false; } E = e.data; M = m.data || []; return true; }
  const rules = () => E.kind === 'tournament' ? (E.config.rules || { to: 11, winBy: 2 }) : { to: E.config?.to || 11, winBy: E.config?.winBy || 2 };
  const pn = m => side => [m[side + '1'], m[side + '2']].filter(Boolean).map(esc).join(' &amp; ');
  const tn = t => esc(E.config.teams?.[t]?.name || t || '—');
  function scoreCell(m, nGames) { const g = G(m), fin = m.status === 'final';
    const txt = g.map(x => x[0] + '–' + x[1]).join(', ');
    if (!org.isOrg || !m.id) return fin ? '<b>' + txt + '</b>' : '<span class="note">' + (m.predicted_a != null ? Math.round(m.predicted_a * 100) + '–' + (100 - Math.round(m.predicted_a * 100)) + '%' : '') + '</span>';
    let h = '<div class="sc" data-m="' + m.id + '" data-n="' + nGames + '">'; for (let i = 0; i < nGames; i++) h += '<input type="number" min="0" value="' + (g[i]?.[0] ?? '') + '">–<input type="number" min="0" value="' + (g[i]?.[1] ?? '') + '">';
    return h + '<button class="b g">' + vt('save') + '</button><span class="note"></span></div>'; }
  function wire() { document.querySelectorAll('.sc').forEach(d => d.querySelector('button').onclick = () => saveScore(d)); }
  async function saveScore(d) { const ins = [...d.querySelectorAll('input')].map(i => i.value === '' ? null : +i.value), g = [], st = d.querySelector('.note'), R = rules(), m = M.find(x => x.id === d.dataset.m);
    for (let i = 0; i < ins.length; i += 2) if (ins[i] != null && ins[i + 1] != null) g.push([ins[i], ins[i + 1]]);
    const bo = +d.dataset.n, wins = g.reduce((s, [a, b]) => [s[0] + (a > b), s[1] + (b > a)], [0, 0]);
    if (!g.length || !g.every(([a, b]) => VPAGen.validGame(a, b, R)) || (bo === 3 && Math.max(...wins) !== 2) || (bo === 1 && g.length !== 1)) { st.textContent = vt('bad'); return; }
    if (d.dataset.busy) return; d.dataset.busy = 1; let r = await sb.from('match_games').delete().eq('match_id', m.id); if (r.error) { delete d.dataset.busy; return st.textContent = r.error.message; }
    r = await sb.from('match_games').insert(g.map((x, i) => ({ match_id: m.id, game_no: i + 1, score_a: x[0], score_b: x[1] }))); if (r.error) return st.textContent = r.error.message;
    r = await sb.from('matches').update({ status: 'final', played_on: new Date().toISOString().slice(0, 10) }).eq('id', m.id); if (r.error) return st.textContent = r.error.message;
    st.textContent = vt('saved'); await refresh(true); }
  // ---------- social
  function social() { const rounds = [...new Set(M.map(m => m.round_no))].sort((a, b) => a - b), P = {};
    M.filter(m => m.status === 'final').forEach(m => { const g = VPAGen.gamesWon(G(m)), A = [m.a1, m.a2].filter(Boolean), B = [m.b1, m.b2].filter(Boolean);
      A.concat(B).forEach(x => P[x] ??= { w: 0, l: 0, pd: 0 }); A.forEach(x => { P[x].pd += g.pa - g.pb; g.a > g.b ? P[x].w++ : P[x].l++; }); B.forEach(x => { P[x].pd += g.pb - g.pa; g.b > g.a ? P[x].w++ : P[x].l++; }); });
    const st = Object.entries(P).sort((a, b) => b[1].w - a[1].w || b[1].pd - a[1].pd);
    let h = '<div class="card"><h3>' + vt('standings') + '</h3><table><tr><th>#</th><th>' + vt('pl') + '</th><th>' + vt('w') + '</th><th>' + vt('l') + '</th><th>' + vt('pd') + '</th></tr>' + st.map(([n, s], i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(n) + '</td><td>' + s.w + '</td><td>' + s.l + '</td><td>' + s.pd + '</td></tr>').join('') + '</table></div>';
    h += rounds.map(r => '<div class="card"><h3>' + vt('round') + ' ' + r + '</h3><div class="courts">' + M.filter(m => m.round_no === r).map(m => { const g = VPAGen.gamesWon(G(m)), f = m.status === 'final';
      return '<div class="court"><h4>' + vt('court') + ' ' + m.court + '</h4><div class="' + (f && g.a > g.b ? 'win' : '') + '">' + pn(m)('a') + '</div><div class="vs">vs</div><div class="' + (f && g.b > g.a ? 'win' : '') + '">' + pn(m)('b') + '</div>' + scoreCell(m, 1) + '</div>'; }).join('') + '</div></div>').join('');
    const lastR = rounds[rounds.length - 1], LR = M.filter(m => m.round_no === lastR);
    if (E.config?.mode === 'king' && org.isOrg && LR.length && LR.every(m => m.status === 'final')) h += '<p><button class="b o" id="nextR">' + vt('next') + '</button></p>';
    body.innerHTML = h; wire(); if ($('nextR')) nextR.onclick = kingNext; }
  async function kingNext() { const lastR = Math.max(...M.map(m => m.round_no)), LR = M.filter(m => m.round_no === lastR).sort((a, b) => a.court - b.court), lv = Object.fromEntries((E.config.players || []).map(p => [p.id, p.level]));
    const prev = { round: lastR, courts: LR.map(m => ({ court: m.court, a: [m.team_a1, m.team_a2].filter(Boolean), b: [m.team_b1, m.team_b2].filter(Boolean) })) };
    const res = LR.map(m => { const g = VPAGen.gamesWon(G(m)); return g.a > g.b ? 'a' : 'b'; });
    const nx = VPAGen.kingNext(prev, res, Object.entries(lv).map(([id, level]) => ({ id, level })), rules());
    const r = await sb.from('matches').insert(nx.courts.map(c => ({ event_id: id, played_on: new Date().toISOString().slice(0, 10), format: E.config.format || 'doubles', status: 'scheduled', stage: 'round', match_type: E.config.match_type || 'club',
      round_no: nx.round, court: c.court, team_a1: c.a[0], team_a2: c.a[1] || null, team_b1: c.b[0], team_b2: c.b[1] || null, predicted_a: +c.pA.toFixed(3) })));
    if (r.error) msg.innerHTML = '<div class="warn">' + esc(r.error.message) + '</div>'; await refresh(true); }
  // ---------- tournament
  function brackets() { const C = E.config, pm = M.filter(m => m.stage === 'pool'), pools = C.pools || [];
    const ST = pools.map(p => VPAGen.standings(p.teams, pm.filter(m => m.pool === p.id).map(m => ({ a: m.team_a_id, b: m.team_b_id, games: m.status === 'final' ? G(m) : [] }))));
    const done = pm.length && pm.every(m => m.status === 'final'), defs = C.adv === 'AB' ? [['A', 1, 2, 'seriesA', 'Series A'], ['B', 3, 4, 'seriesB', 'Series B']] : [['KO', 1, +C.adv, 'ko', vt('ko')]];
    const out = defs.map(([pre, f, t, stage, title]) => { const lab = []; for (let r = f; r <= t; r++) pools.forEach(p => lab.push(p.id + r));
      const q = done ? VPAGen.qualifiers(ST, f, t) : lab; const poolOf = {}; pools.forEach(p => p.teams.forEach(t => poolOf[t] = p.id)); const B = VPAGen.bracket(q, { third: C.third, prefix: pre, poolOf: done ? poolOf : null });
      const res = {}; M.filter(m => m.slot && m.status === 'final').forEach(m => res[m.slot] = G(m)); VPAGen.advance(B, res); return { pre, stage, title, B, done }; });
    return { ST, out, done }; }
  let syncing = null;
  async function syncKO(out) { if (!org.isOrg) return false; if (syncing) return syncing; syncing = syncKO_(out).finally(() => syncing = null); return syncing; }
  async function syncKO_(out) { let added = 0; const fresh = await sb.from('matches').select('id,slot,status,team_a_id,team_b_id').eq('event_id', id).not('slot', 'is', null); const ex = Object.fromEntries((fresh.data || []).map(x => [x.slot, x])); const C = E.config, have = new Set(M.filter(m => m.slot).map(m => m.slot));
    for (const { B, stage } of out) { const lastRd = B.length - 1;
      for (const [ri, rd] of B.entries()) for (const m of rd) { if (m.bye || !m.a || !m.b || !C.teams[m.a] || !C.teams[m.b]) continue; const e0 = ex[m.slot];
        if (e0) { if (e0.status !== 'final' && (e0.team_a_id !== m.a || e0.team_b_id !== m.b)) { const A = C.teams[m.a].players, Bp = C.teams[m.b].players; const u = await sb.from('matches').update({ team_a_id: m.a, team_b_id: m.b, team_a1: A[0], team_a2: A[1], team_b1: Bp[0], team_b2: Bp[1] }).eq('id', e0.id); if (!u.error) added++; } continue; }
        const A = C.teams[m.a].players, Bp = C.teams[m.b].players, st = m.third ? (stage === 'ko' ? 'third' : stage + '_third') : stage;
        const r = await sb.from('matches').insert({ event_id: id, division: M[0]?.division, played_on: new Date().toISOString().slice(0, 10), format: 'doubles', status: 'scheduled', stage: st, match_type: 'tournament_knockout', round_no: 100 + ri, slot: m.slot,
          team_a_id: m.a, team_b_id: m.b, team_a1: A[0], team_a2: A[1], team_b1: Bp[0], team_b2: Bp[1] }); if (!r.error) added++; } }
    return added > 0; }
  function tournament() { const C = E.config, { ST, out, done } = brackets(), TL = C.teams, R = rules();
    let h = '<div class="courts">' + (C.pools || []).map((p, i) => '<div class="court"><h4>' + vt('pool') + ' ' + p.id + '</h4><table><tr><th>#</th><th>' + vt('team') + '</th><th>' + vt('w') + '</th><th>' + vt('l') + '</th><th>' + vt('pd') + '</th><th>' + vt('pf') + '</th></tr>' +
      ST[i].map(s => '<tr><td>' + s.rank + '</td><td>' + tn(s.id) + '</td><td>' + s.w + '</td><td>' + s.l + '</td><td>' + s.pd + '</td><td>' + s.pf + '</td></tr>').join('') + '</table></div>').join('') + '</div>';
    h += out.map(({ B, title, stage }) => { const lastRd = B.length - 1;
      return '<div class="card"><h3>' + title + (done ? '' : ' <small class="note">(' + vt('proj') + ')</small>') + '</h3><div class="bracket">' + B.map((rd, ri) => '<div class="col">' + rd.map(m => {
        const row = M.find(x => x.slot === m.slot), lbl = x => x ? (TL[x] ? tn(x) : esc(x)) : '<i>' + (m.srcA ? '—' : 'bye') + '</i>', fin = ri === lastRd && !m.third;
        return '<div class="court"><small class="note">' + (m.third ? vt('third') : fin ? vt('final') : m.slot) + (row?.court ? ' · ' + vt('court') + ' ' + row.court : '') + '</small><div class="' + (m.winner && m.winner === m.a ? 'win' : '') + '">' + lbl(m.a) + '</div><div class="vs">vs</div><div class="' + (m.winner && m.winner === m.b ? 'win' : '') + '">' + lbl(m.b) + '</div>' +
          (row ? scoreCell(row, fin ? (R.finalsBestOf || 1) : 1) : '') + (fin && m.winner ? '<div class="win">🏆 ' + vt('champ') + ': ' + tn(m.winner) + '</div>' : '') + '</div>'; }).join('') + '</div>').join('') + '</div></div>'; }).join('');
    const pm = M.filter(m => m.stage === 'pool');
    h += '<div class="card"><h3>' + vt('sched') + '</h3><table><tr><th>#</th><th>' + vt('time') + '</th><th>' + vt('court') + '</th><th>' + vt('pool') + '</th><th>A</th><th>B</th><th></th></tr>' + pm.map(m => '<tr><td>' + m.round_no + '</td><td>' + (m.scheduled_at ? new Date(m.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : '') + '</td><td>' + (m.court ?? '') + '</td><td>' + esc(m.pool) + '</td><td>' + tn(m.team_a_id) + '</td><td>' + tn(m.team_b_id) + '</td><td>' + scoreCell(m, 1) + '</td></tr>').join('') + '</table></div>';
    body.innerHTML = h; wire(); return out; }
  async function refresh(force) { if (!force && document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (!(await load())) return; title.innerHTML = esc(E.name) + ' <span>' + vt('live') + '</span>'; sub.textContent = [E.starts_on, E.config?.cap && E.config.cap < 99 ? 'VPA ≤ ' + E.config.cap : '', E.kind].filter(Boolean).join(' · ');
    if (E.kind === 'tournament') { const out = tournament(); if (await syncKO(out.map ? out : [])) { await load(); tournament(); } } else social(); }
  VPAOrg.init(st => { org = st; orgIn.classList.toggle('hide', !!st.isOrg); orgNote.textContent = st.isOrg ? vt('signedIn') + ' ' + st.email : st.email ? vt('notOrg') : vt('pub'); refresh(true); });
  send.onclick = async () => { const r = await VPAOrg.signIn(email.value.trim()); orgNote.textContent = r.error ? r.error.message : vt('sent'); };
  setInterval(() => refresh(false), 20000); document.addEventListener('vpa-lang', () => refresh(true));
})();
