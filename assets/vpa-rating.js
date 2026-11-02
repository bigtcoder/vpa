/* VPA doubles rating — JS port of /workspace/vpa-app/rating_algo/vpa_rating.py (identical parameters).
   Gaussian skill N(mu,sigma^2), point-margin (binomial rally) likelihood, one Laplace/Newton step per match. */
(function (g) {
  const C = { S: 1.25, KAPPA: 0.5, SIGMA0: 0.80, SIGMA0_SEEDED: 0.50, SIGMA_MIN: 0.06, SIGMA_MAX: 0.90, TAU_PER_DAY: 0.004,
    PROVISIONAL_SIGMA: 0.30, MAX_STEP: 0.25,
    WEIGHTS: { tournament: 1.0, tournament_knockout: 1.1, league: 0.9, club: 0.8, rec: 0.5 },
    DEFAULT_MU: { M: 2.6, F: 2.15, null: 2.5 } };
  const sig = x => 1 / (1 + Math.exp(-x));
  const gk = gd => gd === 'male' || gd === 'M' ? 'M' : gd === 'female' || gd === 'F' ? 'F' : null;
  const dayOf = d => d == null ? null : (typeof d === 'number' ? d : Math.floor(Date.parse(d) / 864e5));
  class VPARating {
    constructor() { this.players = {}; }
    addPlayer(pid, gender, external) {
      const p = external != null ? { mu: +external, sigma: C.SIGMA0_SEEDED } : { mu: C.DEFAULT_MU[gk(gender)], sigma: C.SIGMA0 };
      return (this.players[pid] = Object.assign(p, { pid, last_day: null, n: 0, w: 0, l: 0, history: [] }));
    }
    _age(p, day) {
      if (day != null && p.last_day != null && day > p.last_day)
        p.sigma = Math.min(C.SIGMA_MAX, Math.sqrt(p.sigma ** 2 + C.TAU_PER_DAY ** 2 * (day - p.last_day)));
      if (day != null) p.last_day = day;
    }
    rallyP(A, B) { const m = t => t.reduce((s, x) => s + this.players[x].mu, 0) / t.length; return sig((m(A) - m(B)) / C.S); }
    winProbability(A, B, to = 11, winBy = 2) { return gameWinP(this.rallyP(A, B), to, winBy); }
    recordMatch(A, B, games, type = 'tournament', day = null, mid = null) {
      const w = C.WEIGHTS[type] ?? 1.0, all = [...A, ...B];
      all.forEach(x => this._age(this.players[x], day));
      let kA = 0, kB = 0, ga = 0, gb = 0; games.forEach(([x, y]) => { kA += x; kB += y; x > y ? ga++ : gb++; });
      const n = kA + kB; if (!n) return {};
      const a = {}; A.forEach(x => a[x] = 1 / A.length); B.forEach(x => a[x] = -1 / B.length);
      let d = 0, V = 0; for (const x in a) { d += a[x] * this.players[x].mu; V += (a[x] * this.players[x].sigma) ** 2; }
      const p = sig(d / C.S), gr = w * C.KAPPA * (kA - n * p) / C.S, h = w * C.KAPPA * n * p * (1 - p) / C.S ** 2, out = {};
      for (const x in a) {
        const pl = this.players[x], s2 = pl.sigma ** 2, ai = a[x];
        let dm = s2 * ai * gr / (1 + V * h); dm = Math.max(-C.MAX_STEP, Math.min(C.MAX_STEP, dm));
        pl.mu += dm; pl.sigma = Math.max(C.SIGMA_MIN, Math.sqrt(Math.max(s2 - (s2 * ai) ** 2 * h / (1 + V * h), C.SIGMA_MIN ** 2)));
        pl.n++; const won = ai > 0 ? ga > gb : gb > ga, lost = ai > 0 ? gb > ga : ga > gb; won && pl.w++; lost && pl.l++;
        pl.history.push([day, type, Math.round(dm * 1e4) / 1e4, pl.mu, pl.sigma, mid]); out[x] = dm;
      }
      return out;
    }
  }
  /* exact probability of winning a rally-scored game to `to`, win by `winBy` (1 or 2), rally prob p */
  function gameWinP(p, to = 11, winBy = 2) {
    const q = 1 - p, f = {}; const F = (a, b) => {
      if (a >= to && a - b >= winBy) return 1; if (b >= to && b - a >= winBy) return 0;
      if (winBy === 2 && a >= to - 1 && a === b) return p * p / (p * p + q * q);
      const k = a + ',' + b; return f[k] ??= p * F(a + 1, b) + q * F(a, b + 1); };
    return F(0, 0);
  }
  const matchP = (pg, bestOf) => bestOf === 3 ? pg * pg * (3 - 2 * pg) : pg;
  /* matches: [{id,date,a:[..],b:[..],games:[[x,y]..],type}], seeds {pid: level|null}, genders {pid:g} */
  function rank(matches, seeds = {}, genders = {}) {
    const R = new VPARating(), get = x => R.players[x] || R.addPlayer(x, genders[x], seeds[x]);
    Object.keys(seeds).forEach(get);
    [...matches].sort((x, y) => (x.date > y.date ? 1 : x.date < y.date ? -1 : 0)).forEach(m => {
      const A = m.a.filter(Boolean), B = m.b.filter(Boolean); if (!A.length || !B.length || !(m.games || []).length) return;
      A.concat(B).forEach(get); R.recordMatch(A, B, m.games, m.type || 'tournament', dayOf(m.date), m.id);
    });
    return Object.values(R.players).map(p => ({ id: p.pid, level: p.mu, sigma: p.sigma, matches: p.n, wins: p.w, losses: p.l,
      provisional: p.sigma > C.PROVISIONAL_SIGMA, history: p.history, start: seeds[p.pid] ?? null, reliability: Math.round(100 * Math.min(1, Math.max(0, (C.SIGMA0 - p.sigma) / (C.SIGMA0 - C.SIGMA_MIN))))
    })).sort((a, b) => b.level - a.level);
  }
  g.VPARating = { C, VPARating, rank, gameWinP, matchP, sigmoid: sig };
  if (typeof module !== 'undefined') module.exports = g.VPARating;
})(typeof window !== 'undefined' ? window : globalThis);
