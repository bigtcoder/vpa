/* VPA game generator + tournament engine. Pure functions; win probabilities use VPARating (vpa-rating.js). */
(function (g) {
  const VR = g.VPARating || (typeof require !== 'undefined' ? require('./vpa-rating.js') : null);
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const shuffle = (A, r) => { for (let i = A.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [A[i], A[j]] = [A[j], A[i]]; } return A; };
  const key = (x, y) => x < y ? x + '|' + y : y + '|' + x;
  const mean = (t, L) => t.reduce((s, x) => s + L[x], 0) / t.length;
  /* predicted probability that side A wins a game (VPA model: rally p = sigmoid(meanA-meanB / S)) */
  function winP(A, B, L, to = 11, winBy = 2, bestOf = 1) {
    const pg = VR.gameWinP(VR.sigmoid((mean(A, L) - mean(B, L)) / VR.C.S), to, winBy); return VR.matchP(pg, bestOf); }
  const DEFW = { imbalance: 10, partner: 6, opponent: 2, spread: 1.5, mixed: 20, sitBack: 4 };

  /* ---------- social / round-robin generator ---------- */
  function social(o) {
    const P = o.players, per = o.format === 'singles' ? 2 : 4, r = rng(o.seed ?? 1), W = Object.assign({}, DEFW, o.weights || {});
    if (o.mode === 'grouped') { W.spread = Math.max(W.spread, 25); W.opponent = Math.min(W.opponent, 0.3); }
    const L = {}, G = {}; P.forEach(p => { L[p.id] = +p.level || 2.5; G[p.id] = p.gender; });
    const fixed = {}; (o.fixedPairs || []).forEach(([a, b]) => { fixed[a] = b; fixed[b] = a; });
    const sat = {}, lastSat = {}, pc = {}, oc = {}; P.forEach(p => { sat[p.id] = 0; lastSat[p.id] = -9; });
    const rounds = [], nR = o.rounds || Math.max(1, Math.floor((o.minutes || 90) / (o.gameMinutes || 15)));
    for (let ri = 0; ri < nR; ri++) {
      // 1. fair sit-outs: fewest sit-outs so far sit first; tie -> not last round, then random. Fixed pairs sit together.
      const cap = Math.min(o.courts * per, Math.floor(P.length / per) * per), nOut = P.length - cap;
      const order = shuffle(P.map(p => p.id), r).sort((a, b) => sat[a] - sat[b] || (lastSat[a] - lastSat[b]));
      const out = new Set();
      for (const id of order) { if (out.size >= nOut) break; if (out.has(id)) continue;
        const f = fixed[id]; if (f && !out.has(f)) { if (out.size + 2 <= nOut) { out.add(id); out.add(f); } } else out.add(id); }
      for (const id of order) { if (out.size >= nOut) break; out.add(id); }
      const act = P.map(p => p.id).filter(x => !out.has(x));
      out.forEach(x => { sat[x]++; lastSat[x] = ri; });
      // 2. initial: level snake for grouped, otherwise random
      let A = o.mode === 'grouped' ? [...act].sort((x, y) => L[y] - L[x]) : shuffle([...act], r);
      if (o.mode === 'grouped' && per === 4) A = chunk(A, 4).flatMap(c => [c[0], c[3], c[1], c[2]]);
      const cost = arr => { let c = 0; for (let k = 0; k < arr.length; k += per) c += courtCost(arr.slice(k, k + per)); return c; };
      const courtCost = q => {
        const h = per / 2, a = q.slice(0, h), b = q.slice(h); let c = W.imbalance * Math.abs(a.reduce((s, x) => s + L[x], 0) - b.reduce((s, x) => s + L[x], 0));
        if (h === 2) { c += W.partner * ((pc[key(a[0], a[1])] || 0) + (pc[key(b[0], b[1])] || 0));
          for (const t of [a, b]) { if (fixed[t[0]] && fixed[t[0]] !== t[1]) c += 50; if (fixed[t[1]] && fixed[t[1]] !== t[0]) c += 50;
            if (o.mixed && G[t[0]] && G[t[1]] && G[t[0]] === G[t[1]]) c += W.mixed; } }
        for (const x of a) for (const y of b) c += W.opponent * (oc[key(x, y)] || 0);
        const lv = q.map(x => L[x]); c += W.spread * (Math.max(...lv) - Math.min(...lv)); return c; };
      // 3. simulated annealing over position swaps (seeded)
      let cur = cost(A), best = A.slice(), bc = cur, T = 2; const it = o.iterations || 4000;
      for (let k = 0; k < it && A.length > 1; k++) {
        const i = Math.floor(r() * A.length), j = Math.floor(r() * A.length); if (i === j) continue;
        [A[i], A[j]] = [A[j], A[i]]; const c = cost(A);
        if (c <= cur || r() < Math.exp((cur - c) / T)) { cur = c; if (c < bc) { bc = c; best = A.slice(); } } else[A[i], A[j]] = [A[j], A[i]];
        T = 2 * (1 - k / it) + 0.01; }
      const courts = chunk(best, per).map((q, ci) => { const h = per / 2, a = q.slice(0, h), b = q.slice(h);
        if (h === 2) { pc[key(a[0], a[1])] = (pc[key(a[0], a[1])] || 0) + 1; pc[key(b[0], b[1])] = (pc[key(b[0], b[1])] || 0) + 1; }
        a.forEach(x => b.forEach(y => oc[key(x, y)] = (oc[key(x, y)] || 0) + 1));
        return { court: ci + 1, a, b, pA: winP(a, b, L, o.to || 11, o.winBy || 2),
          imbalance: Math.abs(a.reduce((s, x) => s + L[x], 0) - b.reduce((s, x) => s + L[x], 0)) }; });
      rounds.push({ round: ri + 1, sitouts: [...out], courts });
      if (o.mode === 'king') break; // king of court: later rounds come from results via kingNext()
    }
    return { rounds, stats: stats(rounds, P, per) };
  }
  /* king/queen of court: winners move up one court (court 1 stays), losers move down; winners split up */
  function kingNext(prev, results, players, o = {}) {
    const L = {}; players.forEach(p => L[p.id] = +p.level || 2.5); const C = prev.courts, n = C.length, up = [], dn = [];
    C.forEach((c, i) => { const aw = results[i] === 'a'; const w = aw ? c.a : c.b, l = aw ? c.b : c.a;
      up[i] = w; dn[i] = l; });
    const slot = C.map(() => []);
    C.forEach((c, i) => { slot[Math.max(0, i - 1)].push(...up[i]); slot[Math.min(n - 1, i + 1)].push(...dn[i]); });
    const courts = slot.map((q, i) => { const a = [q[0], q[2]].filter(Boolean), b = [q[1], q[3]].filter(Boolean);
      return { court: i + 1, a, b, pA: winP(a, b, L, o.to || 11, o.winBy || 2) }; });
    return { round: prev.round + 1, sitouts: prev.sitouts || [], courts };
  }
  function stats(rounds, P, per) {
    const pc = {}, oc = {}, sat = {}; P.forEach(p => sat[p.id] = 0); let imb = [];
    rounds.forEach(R => { R.sitouts.forEach(x => sat[x]++); R.courts.forEach(c => { imb.push(c.imbalance ?? 0);
      if (c.a.length === 2) [c.a, c.b].forEach(t => pc[key(t[0], t[1])] = (pc[key(t[0], t[1])] || 0) + 1);
      c.a.forEach(x => c.b.forEach(y => oc[key(x, y)] = (oc[key(x, y)] || 0) + 1)); }); });
    const rep = m => Object.values(m).reduce((s, v) => s + Math.max(0, v - 1), 0), sv = Object.values(sat);
    return { games: imb.length, meanImbalance: imb.reduce((s, x) => s + x, 0) / (imb.length || 1), maxImbalance: Math.max(0, ...imb),
      repeatPartners: rep(pc), distinctPartnerPairs: Object.keys(pc).length, repeatOpponents: rep(oc),
      maxOpponentRepeat: Math.max(0, ...Object.values(oc)), sitoutMin: Math.min(...sv), sitoutMax: Math.max(...sv) };
  }
  const chunk = (A, n) => { const o = []; for (let i = 0; i < A.length; i += n) o.push(A.slice(i, i + n)); return o; };
  function asText(res, names, title) {
    const nm = x => names[x] || x; let t = (title ? title + '\n' : '');
    res.rounds.forEach(R => { t += `\nRound ${R.round}\n`; R.courts.forEach(c => t += `  Court ${c.court}: ${c.a.map(nm).join(' & ')}  vs  ${c.b.map(nm).join(' & ')}  (${Math.round(c.pA * 100)}–${100 - Math.round(c.pA * 100)}%)\n`);
      if (R.sitouts.length) t += `  Sit out: ${R.sitouts.map(nm).join(', ')}\n`; });
    return t;
  }

  /* ---------- tournament ---------- */
  // teams: [{id,name,players:[id,id],level}] level = combined (sum) VPA level
  function seedTeams(teams) { return [...teams].sort((a, b) => b.level - a.level).map((t, i) => Object.assign({}, t, { seed: i + 1 })); }
  function snakePools(teams, nPools) { const S = seedTeams(teams), pools = Array.from({ length: nPools }, (_, i) => ({ id: String.fromCharCode(65 + i), teams: [] }));
    S.forEach((t, i) => { const r = Math.floor(i / nPools), k = i % nPools; pools[r % 2 ? nPools - 1 - k : k].teams.push(t.id); }); return pools; }
  function roundRobin(ids) { const A = [...ids]; if (A.length % 2) A.push(null); const n = A.length, R = [];
    for (let r = 0; r < n - 1; r++) { const m = []; for (let i = 0; i < n / 2; i++) { const x = A[i], y = A[n - 1 - i]; if (x && y) m.push(r % 2 ? [y, x] : [x, y]); }
      R.push(m); A.splice(1, 0, A.pop()); } return R; }
  /* court & time schedule: pool rounds interleaved; no team twice in one slot */
  function schedulePools(pools, o) {
    const ms = []; pools.forEach(p => roundRobin(p.teams).forEach((rd, ri) => rd.forEach(([a, b]) => ms.push({ stage: 'pool', pool: p.id, round_no: ri + 1, a, b }))));
    ms.sort((x, y) => x.round_no - y.round_no || x.pool.localeCompare(y.pool));
    const slots = [], left = [...ms];
    while (left.length) { const busy = new Set(), s = []; for (let i = 0; i < left.length && s.length < o.courts;) {
        const m = left[i]; if (!busy.has(m.a) && !busy.has(m.b)) { busy.add(m.a); busy.add(m.b); s.push(m); left.splice(i, 1); } else i++; }
      slots.push(s); }
    const t0 = o.start ? Date.parse(o.start) : null, step = (o.slotMinutes || 20) * 6e4;
    slots.forEach((s, si) => s.forEach((m, ci) => { m.slot_no = si + 1; m.court = ci + 1; if (t0) m.scheduled_at = new Date(t0 + si * step).toISOString(); }));
    return ms;
  }
  function gamesWon(games) { let a = 0, b = 0, pa = 0, pb = 0; (games || []).forEach(([x, y]) => { x > y ? a++ : y > x && b++; pa += x; pb += y; }); return { a, b, pa, pb }; }
  /* standings: wins, head-to-head (among tied teams), point differential, points for */
  function standings(teamIds, matches) {
    const S = {}; teamIds.forEach(t => S[t] = { id: t, w: 0, l: 0, pf: 0, pa: 0, played: 0 });
    const fin = matches.filter(m => m.games && m.games.length && S[m.a] && S[m.b]);
    fin.forEach(m => { const g = gamesWon(m.games), A = S[m.a], B = S[m.b]; A.played++; B.played++;
      A.pf += g.pa; A.pa += g.pb; B.pf += g.pb; B.pa += g.pa; if (g.a > g.b) { A.w++; B.l++; } else if (g.b > g.a) { B.w++; A.l++; } });
    const L = Object.values(S); L.forEach(x => x.pd = x.pf - x.pa);
    const h2h = (grp) => { const ids = new Set(grp.map(x => x.id)), w = {}; grp.forEach(x => w[x.id] = 0);
      fin.forEach(m => { if (ids.has(m.a) && ids.has(m.b)) { const g = gamesWon(m.games); g.a > g.b ? w[m.a]++ : g.b > g.a && w[m.b]++; } }); return w; };
    L.sort((x, y) => y.w - x.w);
    const out = []; for (let i = 0; i < L.length;) { let j = i; while (j < L.length && L[j].w === L[i].w) j++;
      const grp = L.slice(i, j), hw = grp.length > 1 ? h2h(grp) : {}; grp.forEach(x => x.h2h = hw[x.id] || 0);
      grp.sort((x, y) => y.h2h - x.h2h || y.pd - x.pd || y.pf - x.pf || (String(x.id) < String(y.id) ? -1 : String(x.id) > String(y.id) ? 1 : 0)); out.push(...grp); i = j; }
    out.forEach((x, i) => x.rank = i + 1); return out;
  }
  const pow2 = n => { let p = 1; while (p < n) p *= 2; return p; };
  function seedOrder(n) { let s = [1]; while (s.length < n) { const m = s.length * 2 + 1; s = s.flatMap(x => [x, m - x]); } return s; }
  /* qualifiers: ordered list (seed 1 first). Returns rounds of matches with slots; byes advance automatically */
  function bracket(qual, o = {}) {
    const N = pow2(Math.max(2, qual.length)), ord = seedOrder(N), pre = o.prefix || 'KO', R = [];
    const r1 = []; for (let i = 0; i < N; i += 2) r1.push({ slot: `${pre}-R1-${i / 2 + 1}`, a: qual[ord[i] - 1] || null, b: qual[ord[i + 1] - 1] || null, seedA: ord[i], seedB: ord[i + 1] });
    if (o.poolOf) { const pl = x => x && o.poolOf[x]; // avoid same-pool meetings in round 1 by swapping lower seeds
      for (let i = 0; i < r1.length; i++) if (pl(r1[i].a) && pl(r1[i].a) === pl(r1[i].b))
        for (let j = 0; j < r1.length; j++) { if (j === i || !r1[j].a || !r1[j].b) continue; const A = r1[i], B = r1[j]; // never swap with a bye match: byes stay with the top seeds
          if (pl(A.a) !== pl(B.b) && pl(B.a) !== pl(A.b)) { [A.b, B.b] = [B.b, A.b]; [A.seedB, B.seedB] = [B.seedB, A.seedB]; break; } } }
    R.push(r1); let prev = r1, k = 2;
    while (prev.length > 1) { const nx = []; for (let i = 0; i < prev.length; i += 2) nx.push({ slot: `${pre}-R${k}-${i / 2 + 1}`, srcA: prev[i].slot, srcB: prev[i + 1].slot, a: null, b: null });
      R.push(nx); prev = nx; k++; }
    if (o.third && R.length > 1) R[R.length - 1].push({ slot: `${pre}-3P`, third: true, srcA: 'L:' + R[R.length - 2][0].slot, srcB: 'L:' + R[R.length - 2][1].slot, a: null, b: null });
    return R;
  }
  /* propagate winners (and byes) through a bracket given results {slot: games} */
  function advance(R, results) {
    const W = {}, Lz = {}; R.forEach(rd => rd.forEach(m => {
      if (m.srcA) { m.a = m.srcA.startsWith('L:') ? Lz[m.srcA.slice(2)] ?? null : W[m.srcA] ?? null; m.b = m.srcB.startsWith('L:') ? Lz[m.srcB.slice(2)] ?? null : W[m.srcB] ?? null; }
      const bye = R.indexOf(rd) === 0 && (!m.a || !m.b);
      if (bye) { m.bye = true; W[m.slot] = m.a || m.b; return; }
      const g = results[m.slot]; if (m.a && m.b && g && g.length) { const s = gamesWon(g); if (s.a !== s.b) { W[m.slot] = s.a > s.b ? m.a : m.b; Lz[m.slot] = s.a > s.b ? m.b : m.a; m.winner = W[m.slot]; } }
    })); return R;
  }
  /* qualifiers from pools: top N per pool, cross-seeded (all 1st places ranked by w/pd/pf, then 2nd places...) */
  function qualifiers(poolStandings, from = 1, to = 2) {
    const q = []; for (let r = from; r <= to; r++) { const lvl = poolStandings.map(ps => ps[r - 1]).filter(Boolean)
        .sort((x, y) => y.w - x.w || y.pd - x.pd || y.pf - x.pf); q.push(...lvl.map(x => x.id)); } return q;
  }
  function validGame(x, y, f = {}) { const to = f.to || 11, wb = f.winBy || 2, cap = f.cap || 0, hi = Math.max(x, y), lo = Math.min(x, y);
    if (cap && hi === cap && hi > lo) return true; if (hi < to) return false; if (hi - lo < wb) return false; if (wb === 2 && hi > to && hi - lo !== 2) return false;
    if (wb === 1 && hi !== to) return false; return true; }
  const api = { rng, social, kingNext, stats, asText, winP, seedTeams, snakePools, roundRobin, schedulePools, standings, bracket, advance, qualifiers, gamesWon, validGame, seedOrder };
  g.VPAGen = api; if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
