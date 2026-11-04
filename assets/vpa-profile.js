/* Shared player-profile logic: linked ratings, confidence, integrity flags, entry eligibility status.
   Rules: level = strongest mapped rating (VPA.combine); "Ratings don't match" is INFORMATIONAL for organisers only and never
   lowers a level or counts against a player. Never auto-accuse: every review reason is a prompt for a human check. */
window.VPAProfile = (function () {
  const DAY = 864e5;
  /* verified = linked to a public profile/ID on the source system; otherwise self-reported (incl. SELF and typed-in values) */
  const verified = r => r.status ? r.status === 'verified' : (r.system !== 'SELF' && !!(r.profile_url || r.external_id));
  function linked(ratings, pid) {
    return ratings.filter(r => r.player_id === pid && r.system !== 'VPA').sort((a, b) => (b.observed_at || '').localeCompare(a.observed_at || ''))
      .map(r => ({ system: r.system, rating: +r.rating, date: (r.observed_at || '').slice(0, 10), verified: verified(r), lk: r.status === 'linked_unverified', url: /^https?:/.test(r.profile_url || '') ? r.profile_url : null }));
  }
  /* High / Medium / Low from: verified VPA matches, number + recency of linked external ratings, model uncertainty (sigma) */
  function confidence({ matches = 0, sigma = 0.8, links = [] }, today = Date.now()) {
    const ver = links.filter(l => l.verified), fresh = links.some(l => l.date && today - Date.parse(l.date) < 180 * DAY);
    let s = (matches >= 10 ? 2 : matches >= 3 ? 1 : 0) + (ver.length >= 2 ? 2 : ver.length === 1 ? 1 : 0) + (fresh ? 1 : 0) + (sigma <= 0.15 ? 2 : sigma <= 0.30 ? 1 : 0);
    if (!links.length && !matches) s = 0;
    const label = s >= 5 ? 'high' : s >= 3 ? 'medium' : 'low';
    return { score: s, label, selfOnly: links.length > 0 && !ver.length };
  }
  /* port of vpa_rating.py VPARating.flags (anti-sandbagging prompts) over history [day, type, dm, ...] */
  function sandbag(history = [], window = 10) {
    const h = history.slice(-window), F = [], sum = a => a.reduce((s, x) => s + x[2], 0);
    const rec = h.filter(x => x[1] === 'rec'), tour = h.filter(x => String(x[1]).startsWith('tournament'));
    if (rec.length && tour.length && sum(rec) < -0.15 && sum(tour) > 0.15) F.push('rec_losses_vs_tournament_gains');
    if (h.length >= 5 && sum(h) < -0.3) F.push('sharp_decline_before_event');
    return F;
  }
  /* entry status: 'eligible' | 'provisional' | 'review'. reasons: [{code, text-params}] */
  function entryStatus({ flags = [], players = [] }) {
    const R = [], P = [];
    if (flags.includes('pair_over_cap')) R.push({ code: 'over_cap' });
    if (flags.includes('rise_cap')) R.push({ code: 'rise_cap' });
    players.forEach((p, i) => (p.sandbag || []).forEach(f => R.push({ code: 'sandbag', p: i + 1, f })));
    players.forEach((p, i) => { if (p.level == null) P.push({ code: 'unrated', p: i + 1 }); else if (p.conf === 'low') P.push({ code: 'low_conf', p: i + 1 }); if (p.selfOnly) P.push({ code: 'self_only', p: i + 1 }); });
    const info = []; if (flags.includes('pair_tolerance')) info.push({ code: 'tolerance' });
    players.forEach((p, i) => p.mismatch && info.push({ code: 'mismatch', p: i + 1, m: p.mismatch }));
    return { status: R.length ? 'review' : P.length ? 'provisional' : 'eligible', reasons: R.concat(P), info };
  }
  const T = {
    en: { eligible: 'Eligible', provisional: 'Provisional', review: 'Review required', over_cap: 'Team level above the division cap (beyond tolerance)', rise_cap: 'Level rose more than the allowed amount since registering',
      sandbag: 'Rating pattern to check', unrated: 'No rating yet', low_conf: 'Low confidence level', self_only: 'Only self-reported ratings', tolerance: 'Within the pair tolerance over the cap',
      mismatch: "Ratings don't match: using the higher", p: 'Player',
      own_eligible: 'Your entry looks good — you are eligible for this division.', own_provisional: 'Thanks! Your level is provisional for now; organisers will confirm it before the event. Adding a DUPR/PVNA/VDPR profile link helps.',
      own_review: 'Thanks! Organisers will quickly check your entry against the division cap and may contact you. Nothing is wrong with registering.' },
    vi: { eligible: 'Đủ điều kiện', provisional: 'Tạm thời', review: 'Cần BTC xem xét', over_cap: 'Tổng trình đội vượt giới hạn hạng (quá mức dung sai)', rise_cap: 'Trình tăng quá mức cho phép kể từ khi đăng ký',
      sandbag: 'Diễn biến điểm cần kiểm tra', unrated: 'Chưa có điểm', low_conf: 'Độ tin cậy thấp', self_only: 'Chỉ có điểm tự khai', tolerance: 'Trong mức dung sai của cặp',
      mismatch: 'Các điểm chưa khớp: dùng điểm cao hơn', p: 'VĐV',
      own_eligible: 'Đăng ký của bạn hợp lệ — bạn đủ điều kiện cho hạng này.', own_provisional: 'Cảm ơn bạn! Trình của bạn đang tạm thời; BTC sẽ xác nhận trước giải. Thêm link hồ sơ DUPR/PVNA/VDPR sẽ giúp ích.',
      own_review: 'Cảm ơn bạn! BTC sẽ kiểm tra nhanh đăng ký theo giới hạn hạng và có thể liên hệ bạn. Đăng ký của bạn vẫn được ghi nhận.' } };
  const t = k => (T[window.vlang] || T.en)[k] ?? k;
  const reasonText = r => (r.p ? t('p') + ' ' + r.p + ': ' : '') + t(r.code) + (r.m ? ' ' + vpaRt(r.m.high) + ' (' + vpaRt(r.m.low) + ')' : '') + (r.f ? ' (' + r.f.replace(/_/g, ' ') + ')' : '');
  return { linked, confidence, sandbag, entryStatus, verified, t, reasonText };
})();
