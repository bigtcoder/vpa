(async function () {
  const $ = id => document.getElementById(id), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), f2 = x => x == null ? '–' : (+x).toFixed(2);
  const RISE = { male: 0.25, female: 0.20 }, SYS = ['DUPR', 'PVNA', 'VDPR', 'PICKNA', 'LOOL', 'SPORTCONNECT', 'UTRP', 'VAIR', 'IPTPA', 'WPR', 'SELF'];
  /* integrity rules (PVNA-style): snapshot at registration, rise cap before event, pair tolerance over the team cap */
  function flags(snap, cur, cap, tol) { const F = [];
    ['p1', 'p2'].forEach(k => { const s = snap[k], c = cur && cur[k]; if (!s) return; if (s.level == null) F.push('unrated');
      if (s.level != null && c && c.level != null && c.level - s.level > (RISE[s.gender] ?? 0.25) + 1e-9) F.push('rise_cap'); });
    const team = ['p1', 'p2'].reduce((t, k) => t + (snap[k]?.level ?? 0), 0);
    if (cap && cap < 99) { const over = team - cap; if (over > tol + 1e-9) F.push('pair_over_cap'); else if (over > 1e-9) F.push('pair_tolerance'); }
    return [...new Set(F)]; }
  window.VPARegRules = { flags, RISE };
  const evId = new URLSearchParams(location.search).get('event');
  const P = await VPA.load('../'), sb = await VPAData.client(); if (!sb) return;
  if (!evId) { form.remove(); info.innerHTML = '<p class="note">…</p>';
    const ls = async () => { const r = await sb.from('events').select('id,name,starts_on').eq('reg_open', true).order('starts_on'); list.innerHTML = (r.data || []).map(e => '<p><a href="?event=' + e.id + '">' + esc(e.name) + '</a> · ' + esc(e.starts_on || '') + '</p>').join('') || '<p class="note">–</p>'; info.innerHTML = ''; };
    VPAOrg.init(st => { orgIn.classList.toggle('hide', !!st.isOrg); orgNote.textContent = st.isOrg ? vt('signedIn') + ' ' + st.email : '';
      if (st.isOrg) { adm.classList.remove('hide'); adm.innerHTML = '<div class="row"><div><label>' + vt('nev') + '</label><input id="nev"></div><div><label>Date</label><input id="ned" type="date"></div><div><button class="b o" id="nec">' + vt('save') + '</button></div></div>';
        nec.onclick = async () => { if (!nev.value.trim()) { nev.focus(); return; } nec.disabled = true; const r = await sb.from('events').insert({ name: nev.value.trim(), starts_on: ned.value || null, kind: 'tournament', reg_open: false }).select('id').single(); if (!r.error) location.search = '?event=' + r.data.id; else alert(r.error.message); }; } ls(); });
    send.onclick = async () => { const r = await VPAOrg.signIn(email.value.trim()); orgNote.textContent = r.error ? r.error.message : vt('sent'); };
    return; }
  let E = null, LV = await VPALevels(P), org = { isOrg: false }, REG = [];
  plist.innerHTML = LV.D.players.map(p => '<option value="' + esc(p.display_name) + '">').join('');
  const sysOpt = SYS.map(s => '<option value="' + s + '">' + (P.systems[s]?.label || s) + '</option>').join('');
  pp.innerHTML = [1, 2].map(i => '<div class="card"><h3>' + vt('p') + ' ' + i + '</h3><label for="n' + i + '">' + vt('nm') + '</label><input id="n' + i + '" list="plist" autocomplete="name"><div class="row"><div><label>' + vt('g') + '</label><select id="g' + i + '"><option value="male">' + vt('m') + '</option><option value="female">' + vt('f') + '</option></select></div><div><label>' + vt('sys') + '</label><select id="s' + i + '">' + sysOpt + '</select></div><div><label>' + vt('rat') + '</label><input id="r' + i + '" type="number" inputmode="decimal" step="0.001" placeholder="3.50"></div></div><details class="more"><summary>' + vt('more2') + '</summary><div class="row"><div><label>' + vt('sys') + ' 2</label><select id="s' + i + 'b"><option value="">—</option>' + sysOpt + '</select></div><div><label>' + vt('rat') + ' 2</label><input id="r' + i + 'b" type="number" inputmode="decimal" step="0.001"></div></div><label>' + vt('url') + '</label><input id="u' + i + '" placeholder="https://…"></details><p class="note" id="lv' + i + '"></p></div>').join('');
  try { const m = JSON.parse(localStorage.getItem('vpa-me') || 'null'); if (m) { n1.value = m.n || ''; g1.value = m.g || 'male'; if (m.s) s1.value = m.s; r1.value = m.r || ''; ct.value = m.c || ''; } } catch (e) {}
  const dbP = n => LV.D.players.find(p => p.display_name.toLowerCase() === String(n).trim().toLowerCase());
  function player(i) { const n = $('n' + i).value.trim(); if (!n) return null; const d = dbP(n);
    if (d && LV.L[d.id]?.rated) { const links = VPAProfile.linked(LV.D.ratings, d.id), rk = LV.rank.find(x => x.id === d.id), C = VPAProfile.confidence({ matches: rk?.matches || 0, sigma: LV.L[d.id].sd, links }), sd0 = LV.lvl[d.id], top = sd0 && sd0.per.find(x => x.system === sd0.source);
      return { id: d.id, name: d.display_name, gender: d.gender || $('g' + i).value, system: top?.system ?? null, rating: top?.rating ?? null, level: LV.L[d.id].level, sd: LV.L[d.id].sd, src: 'VPA', conf: C.label, selfOnly: C.selfOnly, mismatch: sd0?.mismatch || null, sandbag: VPAProfile.sandbag(rk?.history || []) }; }
    const g = $('g' + i).value, u = $('u' + i).value.trim(), rs = [[$('s' + i).value, parseFloat($('r' + i).value)], [$('s' + i + 'b').value, parseFloat($('r' + i + 'b').value)]].filter(([s, r]) => s && isFinite(r)).map(([system, rating], k) => ({ system, rating, url: k === 0 && u ? u : null }));
    const c = rs.length ? VPA.combine(P, rs.map(x => ({ system: x.system, rating: x.rating, reliable: x.system !== 'SELF' })), g) : null, top = c && rs.find(x => x.system === c.source);
    const links = rs.map(x => ({ system: x.system, rating: x.rating, verified: x.system !== 'SELF' && !!x.url, date: new Date().toISOString().slice(0, 10) })), C = VPAProfile.confidence({ matches: 0, sigma: c?.sd ?? 0.8, links });
    return { id: d?.id || null, name: n, gender: g, system: top?.system ?? null, rating: top?.rating ?? null, ratings: rs, level: c?.level ?? null, sd: c?.sd ?? null, src: top?.system || null, conf: C.label, selfOnly: C.selfOnly, mismatch: c?.mismatch || null }; }
  [1, 2].forEach(i => ['n' + i, 's' + i, 'r' + i, 'g' + i, 's' + i + 'b', 'r' + i + 'b', 'u' + i].forEach(k => $(k).oninput = () => { const p = player(i); $('lv' + i).textContent = p && p.level != null ? (p.rating != null ? vpaRt(p) + ' · ' : '') + vt('vpaBeta') + ' ' + f2(p.level) : ''; }));
  async function load() { const [e, r] = await Promise.all([sb.from('events').select('*').eq('id', evId).maybeSingle(),
      sb.from('registrations').select(org.isOrg ? '*' : 'id,team_name,p1_name,p2_name,status,waitlist_pos,paid,created_at').eq('event_id', evId).order('created_at')]);
    if (!e.data) { msg.innerHTML = '<div class="warn">' + vt('nf') + '</div>'; return false; } E = e.data; REG = r.data || []; return true; }
  function draw() { title.innerHTML = esc(E.name) + ' <span>' + vt('h') + '</span>'; sub.textContent = [E.starts_on, E.location].filter(Boolean).join(' · ');
    const n = REG.filter(r => r.status === 'registered').length;
    info.innerHTML = '<div class="row"><div><label>' + vt('fee') + '</label><b>' + (E.fee_vnd ? E.fee_vnd.toLocaleString('vi-VN') + ' ₫' : '–') + '</b></div><div><label>' + vt('cap') + '</label><b>' + (E.division_cap ? 'VPA ≤ ' + E.division_cap + ' (±' + E.pair_tolerance + ')' : 'Open') + '</b></div><div><label>' + vt('spots') + '</label><b>' + n + (E.reg_capacity ? ' / ' + E.reg_capacity : '') + '</b></div></div>' + (E.reg_open ? '' : '<p class="warn">' + vt('closed') + '</p>');
    form.classList.toggle('hide', !E.reg_open);
    const pub = REG.filter(r => ['registered', 'waitlist'].includes(r.status));
    list.innerHTML = '<table><tr><th>#</th><th>' + vt('team') + '</th><th>' + vt('p') + '</th><th>' + vt('status') + '</th></tr>' + pub.map((r, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(r.team_name) + '</td><td>' + esc([r.p1_name, r.p2_name].filter(Boolean).join(' / ')) + '</td><td>' + vt('st_' + r.status) + (r.waitlist_pos ? ' #' + r.waitlist_pos : '') + ' · ' + (r.paid ? '<span class="pill eligible">' + vt('paid') + '</span>' : vt('unpaid')) + '</td></tr>').join('') + '</table>';
    adm.classList.toggle('hide', !org.isOrg); if (org.isOrg) admin(); }
  sub1.onclick = async () => { const p1 = player(1), p2 = player(2);
    if (!p1 || !p2 || !cons.checked || ct.value.trim().length < 3) { fs.textContent = vt('need'); fs.className = 'warn'; return; }
    if (!tn.value.trim()) tn.value = p1.name + ' / ' + p2.name;
    try { localStorage.setItem('vpa-me', JSON.stringify({ n: n1.value.trim(), g: g1.value, s: s1.value, r: r1.value, c: ct.value.trim() })); } catch (e) {}
    sub1.disabled = true;
    const sp = p => ({ id: p.id, level: p.level, sd: p.sd, gender: p.gender, src: p.src, system: p.system, rating: p.rating, conf: p.conf, selfOnly: p.selfOnly, mismatch: p.mismatch, sandbag: p.sandbag || [] }), snap = { p1: sp(p1), p2: sp(p2), team: (p1.level ?? 0) + (p2.level ?? 0), params: P.version };
    const id = crypto.randomUUID();
    const r = await sb.from('registrations').insert({ id, event_id: evId, team_name: tn.value.trim(), p1_id: p1.id, p1_name: p1.name, p1_gender: p1.gender, p1_system: p1.system, p1_rating: p1.rating,
      p2_id: p2.id, p2_name: p2.name, p2_gender: p2.gender, p2_system: p2.system, p2_rating: p2.rating, p1_ratings: p1.ratings || null, p2_ratings: p2.ratings || null, snapshot: snap, flags: flags(snap, null, E.division_cap, +E.pair_tolerance), consent_version: 'privacy-2026-11-03' });
    if (r.error) { sub1.disabled = false; fs.textContent = r.error.message; return; }
    await sb.from('registration_contacts').insert({ registration_id: id, contact: ct.value.trim() });
    await load(); const me = { ...REG.find(x => x.id === id), snapshot: snap, flags: flags(snap, null, E.division_cap, +E.pair_tolerance) }; fs.textContent = vt('done'); draw(); form.classList.add('hide'); showPay(me); pay.scrollIntoView({ behavior: 'smooth' });
  };
  async function showPay(me) { if (!me) return; pay.classList.remove('hide');
    const es = entry(me); const hasPay = E.fee_vnd && E.bank_bin && E.bank_account && me.status === 'registered';
    let h = '<div class="okmsg"><h2>' + vt('youIn') + '</h2><p>' + esc(me.team_name) + '</p><ol>' + (hasPay ? '<li>' + vt('ns1') + '</li>' : '') + '<li>' + vt('ns2') + '</li><li>' + vt('ns3') + ' <a href="../event/?id=' + evId + '">' + vt('ns3l') + '</a></li></ol></div><p class="' + (es.status === 'eligible' ? 'note' : 'warn') + '" id="own">' + VPAProfile.t('own_' + es.status) + '</p><h3>' + vt('payH') + '</h3>' + (me.status === 'waitlist' ? '<p class="warn">' + vt('wl') + ' ' + me.waitlist_pos + '</p>' : '');
    const ref = 'VPA' + me.id.replace(/-/g, '').slice(0, 8).toUpperCase();
    if (E.fee_vnd && E.bank_bin && E.bank_account && me.status === 'registered') { h += '<div class="row"><div id="qr"></div><div><p>' + vt('ref') + ': <b>' + ref + '</b></p><p>' + vt('amt') + ': <b>' + E.fee_vnd.toLocaleString('vi-VN') + ' ₫</b></p><p>' + vt('acct') + ': ' + esc((VietQR.BANKS.find(b => b[0] === E.bank_bin) || [, E.bank_bin])[1]) + ' · ' + esc(E.bank_account) + ' · ' + esc(E.bank_account_name || '') + '</p><p class="note">' + vt('payN') + '</p></div></div>'; }
    pay.innerHTML = h; if ($('qr')) VietQR.render($('qr'), { bin: E.bank_bin, account: E.bank_account, amount: E.fee_vnd, info: ref }); }
  const curOf = r => { const a = r.p1_id || r.snapshot?.p1?.id, b = r.p2_id || r.snapshot?.p2?.id; return { p1: a ? LV.L[a] : null, p2: b ? LV.L[b] : null }; };
  function entry(r) { const s = r.snapshot || {}; return VPAProfile.entryStatus({ flags: [...new Set([...(r.flags || []), ...flags(s, curOf(r), E.division_cap, +E.pair_tolerance)])], players: [s.p1 || {}, s.p2 || {}] }); }
  // ---------- organiser
  async function admin() { const c = await sb.from('registration_contacts').select('*').in('registration_id', REG.map(r => r.id)); const CT = Object.fromEntries((c.data || []).map(x => [x.registration_id, x.contact]));
    const cur = r => ({ p1: r.snapshot?.p1?.id ? LV.L[r.snapshot.p1.id] : null, p2: r.snapshot?.p2?.id ? LV.L[r.snapshot.p2.id] : null });
    adm.innerHTML = '<h3>' + vt('set') + '</h3><div class="row"><div><label><input type="checkbox" id="eo"' + (E.reg_open ? ' checked' : '') + '> ' + vt('open') + '</label></div><div><label>' + vt('capN') + '</label><input id="ec" type="number" value="' + (E.reg_capacity ?? '') + '"></div><div><label>' + vt('feeN') + '</label><input id="ef" type="number" value="' + (E.fee_vnd ?? '') + '"></div><div><label>' + vt('dcap') + '</label><input id="ed" type="number" step="0.05" value="' + (E.division_cap ?? '') + '"></div><div><label>' + vt('tol') + '</label><input id="et" type="number" step="0.01" min="0" max="0.15" value="' + E.pair_tolerance + '"></div></div>' +
      '<div class="row"><div><label>' + vt('bank') + '</label><select id="eb"><option value="">—</option>' + VietQR.BANKS.map(b => '<option value="' + b[0] + '"' + (E.bank_bin === b[0] ? ' selected' : '') + '>' + b[1] + ' (' + b[0] + ')</option>').join('') + '</select></div><div><label>' + vt('acc') + '</label><input id="ea" value="' + esc(E.bank_account || '') + '"></div><div><label>' + vt('accN') + '</label><input id="en" value="' + esc(E.bank_account_name || '') + '"></div><div><button class="b o" id="es">' + vt('save') + '</button> <span id="ess" class="note"></span></div></div>' +
      '<table><tr><th>' + vt('team') + '</th><th>' + vt('lvl') + '</th><th>' + vt('elig') + '</th><th>' + vt('status') + '</th><th>' + vt('act') + '</th></tr>' + REG.map(r => { const s = r.snapshot || {}, cu = cur(r), fl = [...new Set([...(r.flags || []), ...flags(s, cu, E.division_cap, +E.pair_tolerance)])];
        return '<tr><td>' + esc(r.team_name) + '<br><small>' + esc(r.p1_name) + ' / ' + esc(r.p2_name || '') + '</small><br><small class="note">' + esc(CT[r.id] || '') + ' · ' + esc(r.pay_ref) + '</small></td><td>' + f2(s.p1?.level) + ' + ' + f2(s.p2?.level) + ' = <b>' + f2(s.team) + '</b><br><small>' + vt('now') + ': ' + f2(cu.p1?.level) + ' / ' + f2(cu.p2?.level) + '</small></td><td>' +
          (() => { const es = entry(r), cls = { eligible: 'eligible', provisional: 'needs_check', review: 'not_eligible' }[es.status]; return '<span class="pill ' + cls + '" data-es="' + es.status + '">' + VPAProfile.t(es.status) + '</span>' + (r.review_status ? ' <b data-rv="' + r.review_status + '">' + vt('rv_' + r.review_status) + '</b>' + (r.review_note ? ': ' + esc(r.review_note) : '') + ' <small>(' + esc(r.reviewed_by) + ')</small>' : '') + es.reasons.concat(es.info).map(x => '<br><small>• ' + esc(VPAProfile.reasonText(x)) + '</small>').join(''); })() + (r.override_reason ? '<br><small>✔ ' + esc(r.override_reason) + ' (' + esc(r.override_by) + ')</small>' : '') + '</td><td>' + vt('st_' + r.status) + (r.waitlist_pos ? ' #' + r.waitlist_pos : '') + '<br>' + (r.paid ? '<b>' + vt('paid') + '</b>' : vt('unpaid')) + '</td><td>' +
          '<button class="b g" data-a="paid" data-id="' + r.id + '">' + vt(r.paid ? 'unpay' : 'markPaid') + '</button> <button class="b g" data-a="ovr" data-id="' + r.id + '">' + vt('ovr') + '</button> <button class="b g" data-a="ok" data-id="' + r.id + '">' + vt('approve') + '</button> <button class="b g" data-a="rej" data-id="' + r.id + '">' + vt('reject') + '</button> <button class="b g" data-a="link" data-id="' + r.id + '">' + vt('linkP') + '</button> ' + (r.status !== 'withdrawn' ? '<button class="b g" data-a="wd" data-id="' + r.id + '">' + vt('wd') + '</button>' : '') + '</td></tr>'; }).join('') + '</table>';
    es.onclick = async () => { const u = { reg_open: eo.checked, reg_capacity: ec.value ? +ec.value : null, fee_vnd: ef.value ? +ef.value : null, division_cap: ed.value ? +ed.value : null, pair_tolerance: Math.min(0.15, Math.max(0, +et.value || 0)), bank_bin: eb.value || null, bank_account: ea.value.trim() || null, bank_account_name: en.value.trim() || null };
      const r = await sb.from('events').update(u).eq('id', evId); ess.textContent = r.error ? r.error.message : vt('saved'); await refresh(); };
    adm.querySelectorAll('button[data-a]').forEach(b => b.onclick = async () => { const r = REG.find(x => x.id === b.dataset.id); let u;
      if (b.dataset.a === 'paid') u = r.paid ? { paid: false, paid_at: null, paid_by: null } : { paid: true, paid_at: new Date().toISOString(), paid_by: org.email };
      if (b.dataset.a === 'wd') u = { status: 'withdrawn' };
      if (b.dataset.a === 'ok' || b.dataset.a === 'rej') { u = { review_status: b.dataset.a === 'ok' ? 'approved' : 'rejected', review_note: null, reviewed_by: org.email, reviewed_at: new Date().toISOString() }; if (b.dataset.a === 'rej') u.status = 'rejected'; }
      if (b.dataset.a === 'link') { await linkProfiles(r); await refresh(); return; }
      if (b.dataset.a === 'ovr') { const why = prompt(vt('ovrQ')); if (!why) return; u = { override_reason: why, override_by: org.email }; }
      const q = await sb.from('registrations').update(u).eq('id', r.id); if (q.error) alert(q.error.message); await refresh(); }); }
  /* register once: create/reuse the player profile and link every rating given at registration (organiser only, RLS) */
  async function linkProfiles(r) { const up = {};
    for (const k of ['p1', 'p2']) { const nm = r[k + '_name']; if (!nm) continue; let pid = r[k + '_id'] || dbP(nm)?.id;
      if (!pid) { const q = await sb.from('players').insert({ display_name: nm, gender: r[k + '_gender'] }).select('id').single(); if (q.error) { alert(q.error.message); return; } pid = q.data.id; up[k + '_id'] = pid; }
      for (const x of (r[k + '_ratings'] || [])) { if (LV.D.ratings.some(y => y.player_id === pid && y.system === x.system && +y.rating === +x.rating)) continue;
        const url = x.url || null, q = await sb.from('player_ratings').insert({ player_id: pid, system: x.system, rating: x.rating, rating_type: 'doubles', source: 'registration', observed_at: (r.created_at || new Date().toISOString()).slice(0, 10), profile_url: /^https?:/.test(url || '') ? url : null, external_id: url && !/^https?:/.test(url) ? url : null });
        if (q.error) { alert(q.error.message); return; } } }
    if (Object.keys(up).length) await sb.from('registrations').update(up).eq('id', r.id);
    LV = await VPALevels(P); }
  async function refresh() { if (await load()) draw(); }
  VPAOrg.init(st => { org = st; orgIn.classList.toggle('hide', !!st.isOrg); orgNote.textContent = st.isOrg ? vt('signedIn') + ' ' + st.email : st.email ? vt('notOrg') : ''; refresh(); });
  send.onclick = async () => { const r = await VPAOrg.signIn(email.value.trim()); orgNote.textContent = r.error ? r.error.message : vt('sent'); };
  document.addEventListener('vpa-lang', () => E && draw());
})();
