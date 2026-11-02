/* "Report a wrong score" form. Stored in score_reports (anon insert, organiser-only read). */
(function () {
  const T = { en: { h: 'Report a wrong score', m: 'Match', any: '— not listed / other —', y: 'Your name', w: 'What is wrong?', c: 'Contact for follow-up (optional, organisers only)', s: 'Send report', need: 'Please describe the problem.', ok: 'Thanks — organisers will review it. Every correction is audit-logged.' },
    vi: { h: 'Báo tỉ số sai', m: 'Trận', any: '— không có trong danh sách / khác —', y: 'Tên của bạn', w: 'Sai ở đâu?', c: 'Liên hệ (không bắt buộc, chỉ BTC xem)', s: 'Gửi báo cáo', need: 'Vui lòng mô tả vấn đề.', ok: 'Cảm ơn — BTC sẽ kiểm tra. Mọi chỉnh sửa đều được ghi nhật ký.' } };
  const t = k => (T[window.vlang] || T.en)[k], esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  window.VPAReport = async function (el, { eventId = null } = {}) {
    const sb = await VPAData.client(); if (!sb || !el) return;
    let q = eventId ? sb.from('event_matches_public').select('*').eq('event_id', eventId).eq('status', 'final') : sb.from('results_public').select('id,event,played_on,a1,a2,b1,b2,games').order('played_on', { ascending: false }).limit(150);
    const r = await q, M = r.data || [];
    const lab = m => [m.event, m.played_on, (m.round_no ? 'R' + m.round_no : ''), [m.a1 || m.team_a_name, m.a2].filter(Boolean).join('/') + ' v ' + [m.b1 || m.team_b_name, m.b2].filter(Boolean).join('/'), (m.games || []).map(g => g.a + '-' + g.b).join(',')].filter(Boolean).join(' · ');
    const draw = () => { const v = el.querySelector('select')?.value; el.innerHTML = '<details><summary><b>' + t('h') + '</b></summary><label>' + t('m') + '</label><select><option value="">' + t('any') + '</option>' + M.map(m => '<option value="' + m.id + '">' + esc(lab(m)) + '</option>').join('') + '</select><div class="row"><div><label>' + t('y') + '</label><input class="rn"></div><div><label>' + t('c') + '</label><input class="rc"></div></div><label>' + t('w') + '</label><textarea class="rw" rows="2"></textarea><p><button class="b o">' + t('s') + '</button> <span class="note rs"></span></p></details>';
      if (v) el.querySelector('select').value = v;
      el.querySelector('button').onclick = async () => { const w = el.querySelector('.rw').value.trim(), st = el.querySelector('.rs'); if (w.length < 3) { st.textContent = t('need'); return; }
        const x = await sb.from('score_reports').insert({ match_id: el.querySelector('select').value || null, event_id: eventId, reporter_name: el.querySelector('.rn').value.trim() || null, message: w, contact: el.querySelector('.rc').value.trim() || null });
        st.textContent = x.error ? x.error.message : t('ok'); if (!x.error) el.querySelector('button').disabled = true; }; };
    draw(); document.addEventListener('vpa-lang', draw);
  };
})();
