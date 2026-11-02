/* VPA conversion engine (client-side). Params: assets/vpa-conversion.json */
(function (g) {
  const lerp = (k, x) => { if (x <= k[0][0]) return k[0][1] + (x - k[0][0]) * slope(k, 0);
    for (let i = 1; i < k.length; i++) if (x <= k[i][0]) { const [x0, y0] = k[i - 1], [x1, y1] = k[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
    const n = k.length - 1; return k[n][1] + (x - k[n][0]) * slope(k, n - 1); };
  const slope = (k, i) => (k[i + 1][1] - k[i][1]) / (k[i + 1][0] - k[i][0]);
  const inv = k => k.map(p => [p[1], p[0]]);
  function toVPA(P, sys, r, gender, opts = {}) {
    const s = P.systems[sys], gk = gender === 'female' ? 'female' : 'male';
    if (!s || !isFinite(r)) return null;
    switch (s.type) {
      case 'identity': return { m: r, sd: opts.reliable === false ? s.sd_unreliable : s.sd_reliable };
      case 'knots': return { m: lerp(s.knots, r), sd: s.sd };
      case 'knots_by_gender': return { m: lerp(s.knots[gk], r), sd: s.sd };
      case 'knots_by_gender_sd': { const k = s.knots[gk]; return { m: lerp(k, r), sd: lerp(k.map(p => [p[0], p[2]]), r) }; }
      case 'offset': return { m: r + s.offset, sd: s.sd };
      case 'via': { const v = toVPA(P, s.via, r, gender); return v && { m: v.m, sd: Math.hypot(v.sd, s.extra_sd) }; }
    }
  }
  function fromVPA(P, sys, m, gender) {
    const s = P.systems[sys], gk = gender === 'female' ? 'female' : 'male';
    switch (s.type) {
      case 'identity': return m;
      case 'knots': return lerp(inv(s.knots), m);
      case 'knots_by_gender': return lerp(inv(s.knots[gk]), m);
      case 'knots_by_gender_sd': return lerp(inv(s.knots[gk]), m);
      case 'offset': return m - s.offset;
      case 'via': return fromVPA(P, s.via, m, gender);
    }
  }
  const clamp = x => Math.min(8, Math.max(1.5, x));
  function combine(P, inputs, gender) {
    const per = inputs.map(i => ({ ...i, ...toVPA(P, i.system, +i.rating, gender, i) })).filter(x => isFinite(x.m));
    if (!per.length) return null;
    /* Rule (Tom, 2026-11-03): the level is the STRONGEST mapped rating, never an average that pulls it down.
       A low rating on one system usually just means few games there. More agreeing ratings only shrink the uncertainty. */
    let w = 0; per.forEach(p => { w += 1 / (p.sd * p.sd); });
    const top = per.reduce((a, b) => (b.m > a.m ? b : a)), low = per.reduce((a, b) => (b.m < a.m ? b : a));
    const m = clamp(top.m), sd = Math.max(0.15, Math.min(top.sd, Math.sqrt(1 / w))), z = P.interval_z;
    const conf = sd <= 0.2 ? 'high' : sd <= 0.33 ? 'medium' : 'low';
    /* informational only: linked ratings disagree beyond the calibration error -> organisers see it; never lowers the level */
    const thr = Math.max(0.4, Math.hypot(top.sd, low.sd)), gap = top.m - low.m;
    const mismatch = per.length > 1 && gap > thr ? { gap, threshold: thr, high: { system: top.system, rating: top.rating, m: top.m }, low: { system: low.system, rating: low.rating, m: low.m } } : null;
    return { level: m, sd, lo: clamp(m - z * sd), hi: clamp(m + z * sd), confidence: conf, per, source: top.system, mismatch };
  }
  function eligibility(res, cap) {
    if (!res) return null;
    if (res.hi <= cap) return 'eligible';
    if (res.level + 0.5 * res.sd <= cap) return 'provisional';
    if (res.level <= cap) return 'needs_check';
    return 'not_eligible';
  }
  function equivalents(P, res, gender) {
    const o = {}; for (const k in P.systems) o[k] = { m: fromVPA(P, k, res.level, gender), lo: fromVPA(P, k, res.lo, gender), hi: fromVPA(P, k, res.hi, gender) };
    return o;
  }
  /* Elo-style doubles ranking. matches: [{id,date,a:[pid,pid],b:[pid,pid],games:[[a,b],..]}], seeds: {pid: level} */
  function rank(P, matches, seeds) {
    const E = P.elo, R = {}, N = {}, W = {}, L = {};
    const get = p => (R[p] ??= (seeds[p] ?? 3.0), N[p] ??= 0, W[p] ??= 0, L[p] ??= 0, R[p]);
    [...matches].sort((x, y) => (x.date > y.date ? 1 : -1)).forEach(mt => {
      const A = mt.a.filter(Boolean), B = mt.b.filter(Boolean); if (!A.length || !B.length || !mt.games.length) return;
      const ra = A.reduce((s, p) => s + get(p), 0) / A.length, rb = B.reduce((s, p) => s + get(p), 0) / B.length;
      let pa = 0, pb = 0, ga = 0, gb = 0; mt.games.forEach(([x, y]) => { pa += x; pb += y; x > y ? ga++ : gb++; });
      const win = ga > gb ? 1 : ga < gb ? 0 : 0.5, S = (1 - E.point_share_weight) * win + E.point_share_weight * pa / (pa + pb || 1);
      const ex = 1 / (1 + Math.pow(10, (rb - ra) / E.scale)), d = S - ex;
      A.forEach(p => { R[p] += (N[p] < E.provisional_matches ? E.k_provisional : E.k) * d; N[p]++; win === 1 ? W[p]++ : win === 0 && L[p]++; });
      B.forEach(p => { R[p] -= (N[p] < E.provisional_matches ? E.k_provisional : E.k) * d; N[p]++; win === 0 ? W[p]++ : win === 1 && L[p]++; });
    });
    return Object.keys(R).map(p => ({ id: p, level: R[p], matches: N[p], wins: W[p], losses: L[p], provisional: N[p] < E.provisional_matches }))
      .sort((a, b) => b.level - a.level);
  }
  g.VPA = { toVPA, fromVPA, combine, eligibility, equivalents, rank, load: (base = '') => fetch(base + 'assets/vpa-conversion.json?v=202611030130').then(r => r.json()) };
  if (typeof module !== 'undefined') module.exports = g.VPA;
})(typeof window !== 'undefined' ? window : globalThis);
