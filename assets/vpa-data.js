/* Supabase access shared by /results/ and /log/. Requires vpa-config.js. */
window.VPAData = (function () {
  let sb = null;
  const configured = () => !!(window.VPA_SUPABASE && VPA_SUPABASE.url && VPA_SUPABASE.anonKey);
  async function client() {
    if (sb || !configured()) return sb;
    const m = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    sb = m.createClient(VPA_SUPABASE.url, VPA_SUPABASE.anonKey); return sb;
  }
  async function loadAll() {
    const c = await client(); if (!c) return null;
    const [p, r, m] = await Promise.all([c.from('players').select('id,display_name,gender,city'),
      c.from('player_ratings').select('player_id,system,rating,rating_type,observed_at,profile_url,external_id,status'),
      c.from('results_public').select('*').order('played_on', { ascending: false })]);
    for (const x of [p, r, m]) if (x.error) throw x.error;
    return { players: p.data, ratings: r.data, results: m.data };
  }
  function seeds(P, players, ratings) {
    const s = {}, lvl = {};
    players.forEach(pl => {
      const ins = ratings.filter(r => r.player_id === pl.id && r.system !== 'VPA' && P.systems[r.system])
        .map(r => ({ system: r.system, rating: +r.rating, reliable: r.rating_type !== 'unspecified' }));
      const c = VPA.combine(P, ins, pl.gender); s[pl.id] = c ? c.level : null; lvl[pl.id] = c;
    });
    return { s, lvl };
  }
  const toMatches = res => res.map(r => ({ id: r.id, date: r.played_on, a: [r.team_a1, r.team_a2], b: [r.team_b1, r.team_b2],
    games: (r.games || []).map(g => [g.a, g.b]), type: r.match_type || (r.stage === 'ko' || r.stage === 'third' || /^series/.test(r.stage || '') ? 'tournament_knockout' : 'tournament') }));
  return { configured, client, loadAll, seeds, toMatches };
})();
