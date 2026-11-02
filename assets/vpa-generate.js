(async function () {
  const $ = id => document.getElementById(id), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), f2 = x => (+x).toFixed(2);
  const SYS = ['DUPR', 'PVNA', 'VDPR', 'PICKNA', 'LOOL', 'SPORTCONNECT', 'UTRP', 'VAIR', 'IPTPA', 'WPR', 'SELF'];
  const teams_ = $('teams');
  let P = await VPA.load('../'), DB = { players: [], ratings: [] }, lv = {}, players = [], teams = [], last = null, lastT = null, tab = 'S', nid = 0;
  ns.innerHTML = SYS.map(s => '<option value="' + s + '">' + (P.systems[s]?.label || s) + '</option>').join('');
  // ---- data
  try { const d = await VPAData.loadAll(); if (d) { DB = d; lv = VPAData.seeds(P, d.players, d.ratings).lvl; plist.innerHTML = d.players.map(p => '<option value="' + esc(p.display_name) + '">').join(''); } } catch (e) { msg.innerHTML = '<div class="warn">' + esc(e.message) + '</div>'; }
  const R = new VPARating.VPARating(); // current VPA rating from logged results (if any) overrides seeds
  try { const rk = VPARating.rank(VPAData.toMatches(DB.results || []), Object.fromEntries(DB.players.map(p => [p.id, lv[p.id]?.level ?? null])), Object.fromEntries(DB.players.map(p => [p.id, p.gender])));
    rk.forEach(r => { if (r.matches) lv[r.id] = { level: r.level, sd: r.sigma, hi: r.level + P.interval_z * r.sigma }; }); } catch (e) {}
  const tp = c => { const x = c && c.per && c.per.find(y => y.system === c.source); return x ? { system: x.system, rating: x.rating } : null; };
  /* headline = player's own strongest rating; VPA level (beta) secondary unless VPA_SCORE_PROMINENCE='primary' */
  const lab = p => p.rt && !vpaPrimary() ? esc(vpaRt(p.rt)) + (p.rt.system === 'DUPR' ? '' : ' <span class="vpab">· VPA ' + f2(p.level) + '</span>') : f2(p.level);
  function addP(p) { if (players.some(x => x.name.toLowerCase() === p.name.toLowerCase())) return; players.push(p); draw(); }
  pickAdd.onclick = () => { const p = DB.players.find(x => x.display_name === pick.value.trim()); if (!p) return; const c = lv[p.id];
    addP({ id: p.id, db: true, name: p.display_name, gender: p.gender, level: c?.level ?? 2.5, sd: c?.sd ?? 0.8, rated: !!c, rt: tp(c) }); pick.value = ''; };
  function fromRating(name, gender, sys, r) { const c = isFinite(r) ? VPA.combine(P, [{ system: sys, rating: r, reliable: sys !== 'SELF' }], gender) : null;
    return { id: 'n' + (++nid), name, gender, sys, rating: r, level: c?.level ?? 2.5, sd: c?.sd ?? 0.8, rated: !!c, rt: c ? { system: sys, rating: r } : null }; }
  newAdd.onclick = () => { if (!nn.value.trim()) return; addP(fromRating(nn.value.trim(), ng.value, ns.value, parseFloat(nr.value))); nn.value = nr.value = ''; };
  bulkT.onclick = e => { e.preventDefault(); bulkBox.classList.toggle('hide'); };
  bulkAdd.onclick = () => { bulk.value.split('\n').map(l => l.split(',').map(s => s.trim())).filter(a => a[0]).forEach(([n, g, s, r]) => {
    const db = DB.players.find(x => x.display_name.toLowerCase() === n.toLowerCase()), gd = /^f|nữ|nu/i.test(g || '') ? 'female' : 'male';
    if (db && !s) { const c = lv[db.id]; addP({ id: db.id, db: true, name: db.display_name, gender: db.gender, level: c?.level ?? 2.5, sd: c?.sd ?? 0.8, rated: !!c, rt: tp(c) }); }
    else addP(fromRating(n, gd, (s || 'SELF').toUpperCase(), parseFloat(r))); }); bulk.value = ''; };
  function draw() { chips.innerHTML = players.map((p, i) => '<span class="chip">' + esc(p.name) + ' <b>' + lab(p) + '</b>' + (p.rated ? '' : ' <span class="note" title="' + vt('noRating') + '">?</span>') + ' <button data-i="' + i + '" title="' + vt('remove') + '">×</button></span>').join('');
    chips.querySelectorAll('button').forEach(b => b.onclick = () => { const id = players[+b.dataset.i].id; players.splice(+b.dataset.i, 1); teams = teams.filter(t => !t.players.includes(id)); draw(); });
    pcount.textContent = players.length + ' ' + vt('plH').toLowerCase();
    const free = players.filter(p => !teams.some(t => t.players.includes(p.id))), o = free.map(p => '<option value="' + p.id + '">' + esc(p.name) + ' (' + f2(p.level) + ')</option>').join('');
    tp1.innerHTML = o; tp2.innerHTML = o; if (free[1]) tp2.value = free[1].id; drawTeams(); }
  // ---- tabs
  const setTab = t => { tab = t; S.classList.toggle('hide', t !== 'S'); T.classList.toggle('hide', t !== 'T'); tabS.classList.toggle('on', t === 'S'); tabT.classList.toggle('on', t === 'T'); };
  tabS.onclick = () => setTab('S'); tabT.onclick = () => setTab('T');
  budget.onchange = () => { rW.classList.toggle('hide', budget.value !== 'rounds'); tW.classList.toggle('hide', budget.value === 'rounds'); };
  const byId = () => Object.fromEntries(players.map(p => [p.id, p])), L = () => Object.fromEntries(players.map(p => [p.id, p.level]));
  const nm = id => byId()[id]?.name || id;
  // ---- social
  function opts() { const nmap = Object.fromEntries(players.map(p => [p.name.toLowerCase(), p.id]));
    const fx = fixed.value.split('\n').map(l => l.split('+').map(s => nmap[s.trim().toLowerCase()])).filter(a => a.length === 2 && a[0] && a[1]);
    return { players: players.map(p => ({ id: p.id, level: p.level, gender: p.gender })), courts: +courts.value, rounds: budget.value === 'rounds' ? +rounds.value : 0,
      minutes: +mins.value, gameMinutes: +gmin.value, format: fmt.value, mode: mode.value, mixed: mixed.checked, fixedPairs: fx, seed: +seed.value, to: +to.value, winBy: +wb.value }; }
  function doGen() { const o = opts(); if (players.length < (o.format === 'singles' ? 2 : 4)) { out.innerHTML = '<div class="warn">' + vt('need') + '</div>'; return; }
    last = { o, res: VPAGen.social(o) }; renderS(); }
  function renderS() { if (!last) return; const { res, o } = last, s = res.stats;
    out.innerHTML = '<div class="card"><p class="noprint"><button class="b g" id="pr">' + vt('print') + '</button> <button class="b g" id="cp">' + vt('copy') + '</button> <button class="b g" id="sh">' + vt('share') + '</button> <span id="cpd" class="note"></span></p>' +
      (o.mode === 'king' ? '<p class="note">' + vt('king1') + '</p>' : '') +
      '<details class="note"><summary>' + vt('stats') + '</summary> ' + vt('imb') + ' ' + f2(s.meanImbalance) + ' · ' + vt('maxi') + ' ' + f2(s.maxImbalance) + ' · ' + vt('rp') + ' ' + s.repeatPartners + ' · ' + vt('ro') + ' ' + s.repeatOpponents + ' · ' + vt('so') + ' ' + s.sitoutMin + '–' + s.sitoutMax + '</details>' +
      res.rounds.map(r => '<h3>' + vt('round') + ' ' + r.round + '</h3><div class="courts">' + r.courts.map(c => '<div class="court"><h4>' + vt('court') + ' ' + c.court + '<span class="pct">' + Math.round(c.pA * 100) + '–' + (100 - Math.round(c.pA * 100)) + '%</span></h4>' +
        '<div>' + c.a.map(x => esc(nm(x)) + ' <small>' + lab(byId()[x]) + '</small>').join(' &amp; ') + '</div><div class="vs">vs</div><div>' + c.b.map(x => esc(nm(x)) + ' <small>' + lab(byId()[x]) + '</small>').join(' &amp; ') + '</div></div>').join('') + '</div>' +
        (r.sitouts.length ? '<p class="note">' + vt('sit') + ': ' + r.sitouts.map(x => esc(nm(x))).join(', ') + '</p>' : '')).join('') + '</div>';
    pr.onclick = () => print(); cp.onclick = () => copy(textS()); sh.onclick = () => copy(location.origin + location.pathname + '#' + share());
  }
  function textS() { const n = Object.fromEntries(players.map(p => [p.id, p.name])); let t = VPAGen.asText(last.res, n, (ename.value || 'VPA') + ' — ' + new Date().toLocaleDateString('vi-VN'));
    if (vlang === 'vi') t = t.replace(/Round /g, 'Lượt ').replace(/Court /g, 'Sân ').replace(/Sit out/g, 'Nghỉ'); return t; }
  function copy(t) { navigator.clipboard.writeText(t).then(() => { const e = $('cpd') || $('tcpd'); if (e) e.textContent = vt('copied'); }); }
  function share() { return btoa(unescape(encodeURIComponent(JSON.stringify({ t: tab, p: players.map(p => [p.name, p.gender?.[0], +p.level.toFixed(3), +p.sd.toFixed(3)]),
    o: last && last.o && { c: last.o.courts, r: +rounds.value, f: last.o.format, m: last.o.mode, x: last.o.mixed, s: last.o.seed, fx: fixed.value } })))); }
  $('gen').onclick = doGen; reseed.onclick = () => { seed.value = 1 + Math.floor(Math.random() * 99999); doGen(); };
  if (location.hash.length > 2) try { const st = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1)))));
    st.p.forEach(([n, g, l, sd]) => players.push({ id: 'n' + (++nid), name: n, gender: g === 'f' ? 'female' : 'male', level: l, sd, rated: true }));
    if (st.o) { courts.value = st.o.c; rounds.value = st.o.r; fmt.value = st.o.f; mode.value = st.o.m; mixed.checked = st.o.x; seed.value = st.o.s; fixed.value = st.o.fx || ''; }
    draw(); if (st.o) doGen(); } catch (e) {}
  // ---- tournament
  const teamOf = (a, b) => { const A = byId()[a], B = byId()[b], lvl = A.level + B.level, sd = Math.hypot(A.sd, B.sd);
    return { id: 't' + a + '_' + b, name: A.name + ' / ' + B.name, players: [a, b], level: lvl, sd, hi: lvl + P.interval_z * sd }; };
  tadd.onclick = () => { if (!tp1.value || !tp2.value || tp1.value === tp2.value) return; teams.push(teamOf(tp1.value, tp2.value)); draw(); };
  tauto.onclick = () => { const free = players.filter(p => !teams.some(t => t.players.includes(p.id))).sort((a, b) => b.level - a.level);
    while (free.length >= 2) { const a = free.shift(), b = free.pop(); teams.push(teamOf(a.id, b.id)); } draw(); };
  function drawTeams() { const cap = +tdiv.value;
    teams_.innerHTML = teams.length ? '<table><tr><th>#</th><th>' + vt('team') + '</th><th>' + vt('lvl') + '</th><th>' + vt('elig') + '</th><th></th></tr>' + VPAGen.seedTeams(teams).map(t => {
      const e = cap >= 99 ? 'eligible' : VPA.eligibility({ level: t.level, sd: t.sd, hi: t.hi }, cap);
      return '<tr><td>' + t.seed + '</td><td>' + esc(t.name) + '</td><td>' + f2(t.level) + ' <small>±' + f2(t.sd) + '</small></td><td><span class="pill ' + e + '">' + vt(e) + '</span></td><td><button class="b g" data-t="' + t.id + '">×</button></td></tr>'; }).join('') + '</table>' : '';
    teams_.querySelectorAll('button').forEach(b => b.onclick = () => { teams = teams.filter(t => t.id !== b.dataset.t); draw(); }); }
  tdiv.onchange = drawTeams;
  function tconf() { return { name: tname.value || 'VPA', start: tstart.value ? new Date(tstart.value).toISOString() : null, cap: +tdiv.value, courts: +tcourts.value, slotMinutes: +tslot.value,
    pools: Math.max(1, Math.min(+npools.value, Math.floor(teams.length / 2))), adv: adv.value, third: third.checked, rules: { to: +tto.value, winBy: +twb.value, cap: +tcap.value, finalsBestOf: +bo.value } }; }
  function tgen_() { if (teams.length < 3) { tout.innerHTML = '<div class="warn">' + vt('need') + '</div>'; return; }
    const c = tconf(), pools = VPAGen.snakePools(teams, c.pools), ms = VPAGen.schedulePools(pools, c), TL = Object.fromEntries(teams.map(t => [t.id, t]));
    ms.forEach(m => m.pA = VPAGen.winP(TL[m.a].players, TL[m.b].players, L(), c.rules.to, c.rules.winBy));
    lastT = { c, pools, ms, teams: VPAGen.seedTeams(teams) }; const tn = id => esc(TL[id].name);
    const per = c.adv === 'AB' ? 2 : +c.adv, proj = pools.flatMap((p, i) => []), lab = [];
    for (let r = 1; r <= per; r++) pools.forEach(p => lab.push(p.id + r));
    const B = VPAGen.bracket(lab, { third: c.third }); const tm = x => x && x.slice ? x : null;
    const bhtml = (B, title) => '<h3>' + title + '</h3><div class="bracket">' + B.map(rd => '<div class="col">' + rd.map(m => '<div class="court"><small class="note">' + m.slot + '</small><div>' + (m.a || (m.srcA ? 'W ' + m.srcA.replace('L:', 'L ') : '<i>bye</i>')) + '</div><div class="vs">vs</div><div>' + (m.b || (m.srcB ? 'W ' + m.srcB.replace('L:', 'L ') : '<i>bye</i>')) + '</div></div>').join('') + '</div>').join('') + '</div>';
    let kb = c.adv === 'AB' ? bhtml(VPAGen.bracket(lab, { third: c.third, prefix: 'A' }), 'Series A (1–2)') + bhtml(VPAGen.bracket(pools.flatMap(p => [p.id + 3]).concat(pools.flatMap(p => [p.id + 4])), { third: c.third, prefix: 'B' }), 'Series B (3–4)') : bhtml(B, vt('kos'));
    tout.innerHTML = '<div class="card"><p class="noprint"><button class="b g" id="tpr">' + vt('print') + '</button> <button class="b g" id="tcp">' + vt('copy') + '</button> <span id="tcpd" class="note"></span></p>' +
      '<div class="courts">' + pools.map(p => '<div class="court"><h4>' + vt('pool') + ' ' + p.id + '</h4>' + p.teams.map(t => '<div>' + tn(t) + ' <small>' + f2(TL[t].level) + '</small></div>').join('') + '</div>').join('') + '</div>' +
      '<table><tr><th>' + vt('slot') + '</th><th>' + vt('time') + '</th><th>' + vt('court') + '</th><th>' + vt('pool') + '</th><th>A</th><th>B</th><th>' + vt('winA') + '</th></tr>' +
      ms.map(m => '<tr><td>' + m.slot_no + '</td><td>' + (m.scheduled_at ? new Date(m.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : '') + '</td><td>' + m.court + '</td><td>' + m.pool + '</td><td>' + tn(m.a) + '</td><td>' + tn(m.b) + '</td><td>' + Math.round(m.pA * 100) + '%</td></tr>').join('') + '</table>' + kb + '</div>';
    tpr.onclick = () => print(); tcp.onclick = () => copy(lastT.ms.map(m => `${vt('slot')} ${m.slot_no} · ${vt('court')} ${m.court} · ${vt('pool')} ${m.pool}: ${TL[m.a].name} vs ${TL[m.b].name}`).join('\n'));
  }
  tgen.onclick = tgen_;
  // ---- organiser save
  let org = { isOrg: false };
  VPAOrg.init(st => { org = st; start.disabled = !st.isOrg; orgIn.classList.toggle('hide', !!st.isOrg);
    orgNote.textContent = st.isOrg ? vt('signedIn') + ' ' + st.email : st.email ? vt('notOrg') : vt('offline'); });
  send.onclick = async () => { const r = await VPAOrg.signIn(email.value.trim()); orgNote.textContent = r.error ? r.error.message : vt('sent'); };
  async function ensurePlayers(sb, ids) { const map = {};
    for (const id of ids) { const p = byId()[id]; if (p.db) { map[id] = p.id; continue; }
      const ex = DB.players.find(x => x.display_name.toLowerCase() === p.name.toLowerCase()); if (ex) { map[id] = ex.id; continue; }
      const r = await sb.from('players').insert({ display_name: p.name, gender: p.gender }).select().single(); if (r.error) throw r.error; map[id] = r.data.id;
      if (isFinite(p.rating)) { const q = await sb.from('player_ratings').insert({ player_id: r.data.id, system: p.sys, rating: p.rating, rating_type: 'doubles', observed_at: new Date().toISOString().slice(0, 10), source: 'organiser' }); if (q.error) throw q.error; } }
    return map; }
  start.onclick = async () => { const sb = org.sb; if (!org.isOrg) return; try { start.disabled = true; const today = new Date().toISOString().slice(0, 10);
    if (tab === 'S') { if (!last) doGen(); const { o, res } = last, ids = players.map(p => p.id), map = await ensurePlayers(sb, ids);
      const e = await sb.from('events').insert({ name: ename.value || 'VPA social ' + today, starts_on: today, kind: 'social', config: { mode: o.mode, format: o.format, to: o.to, winBy: o.winBy, match_type: mt.value, courts: o.courts, seed: o.seed,
        players: ids.map(i => ({ id: map[i], name: nm(i), level: byId()[i].level })) } }).select().single(); if (e.error) throw e.error;
      const rows = res.rounds.flatMap(r => r.courts.map(c => ({ event_id: e.data.id, played_on: today, format: o.format, status: 'scheduled', stage: 'round', match_type: mt.value, round_no: r.round, court: c.court,
        team_a1: map[c.a[0]], team_a2: map[c.a[1]] || null, team_b1: map[c.b[0]], team_b2: map[c.b[1]] || null, predicted_a: +c.pA.toFixed(3) })));
      const m = await sb.from('matches').insert(rows); if (m.error) throw m.error; done(e.data.id);
    } else { if (!lastT) tgen_(); const { c, pools, ms } = lastT, map = await ensurePlayers(sb, teams.flatMap(t => t.players));
      const tcfg = Object.fromEntries(teams.map(t => [t.id, { name: t.name, players: t.players.map(x => map[x]), level: +t.level.toFixed(3), sd: +t.sd.toFixed(3) }]));
      const e = await sb.from('events').insert({ name: (c.name || '').trim() || 'VPA tournament ' + today, starts_on: (c.start || today).slice(0, 10), kind: 'tournament', config: { cap: c.cap, adv: c.adv, third: c.third, rules: c.rules, courts: c.courts, slotMinutes: c.slotMinutes, pools, teams: tcfg } }).select().single(); if (e.error) throw e.error;
      const rows = ms.map(m => ({ event_id: e.data.id, division: c.cap >= 99 ? 'Open' : 'VPA ≤ ' + c.cap, played_on: (c.start || today).slice(0, 10), format: 'doubles', status: 'scheduled', stage: 'pool', match_type: 'tournament', round_no: m.slot_no, court: m.court, pool: m.pool,
        team_a_id: m.a, team_b_id: m.b, team_a1: tcfg[m.a].players[0], team_a2: tcfg[m.a].players[1], team_b1: tcfg[m.b].players[0], team_b2: tcfg[m.b].players[1], scheduled_at: m.scheduled_at || null, predicted_a: +m.pA.toFixed(3) }));
      const m = await sb.from('matches').insert(rows); if (m.error) throw m.error; done(e.data.id); }
  } catch (e) { orgNote.textContent = e.message; start.disabled = false; } };
  function done(id) { const u = new URL('../event/?id=' + id, location.href).href; orgNote.innerHTML = vt('saved') + ' <a href="' + u + '">' + u + '</a>'; }
  document.addEventListener('vpa-lang', () => { draw(); renderS(); if (lastT) tgen_(); });
  draw();
})();
