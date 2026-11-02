/* Current VPA level per player = VPA rating model over logged results, seeded from external ratings. */
window.VPALevels = async function (P) {
  const D = await VPAData.loadAll(); if (!D) return { D: { players: [], ratings: [], results: [] }, L: {}, rank: [] };
  const { lvl } = VPAData.seeds(P, D.players, D.ratings), seeds = Object.fromEntries(D.players.map(p => [p.id, lvl[p.id]?.level ?? null]));
  const rank = VPARating.rank(VPAData.toMatches(D.results || []), seeds, Object.fromEntries(D.players.map(p => [p.id, p.gender])));
  const L = {}; D.players.forEach(p => { const c = lvl[p.id]; L[p.id] = c ? { level: c.level, sd: c.sd, rated: true } : { level: null, sd: 0.8, rated: false }; });
  rank.forEach(r => { if (r.matches) L[r.id] = { level: r.level, sd: r.sigma, rated: true, provisional: r.provisional }; });
  return { D, L, rank, seeds, lvl };
};
