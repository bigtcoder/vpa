/* Organiser session helper for /generate/ and /event/ (magic link, organisers table check). */
window.VPAOrg = (function () {
  let st = { sb: null, email: null, isOrg: false };
  async function init(cb) {
    const sb = await VPAData.client(); st.sb = sb; if (!sb) { cb && cb(st); return st; }
    const check = async () => { const { data } = await sb.auth.getSession(); st.email = data.session?.user?.email || null; st.isOrg = false;
      if (st.email) { const r = await sb.from('organisers').select('email').maybeSingle(); st.isOrg = !!(r.data && r.data.email); } cb && cb(st); };
    sb.auth.onAuthStateChange(() => check()); await check(); return st;
  }
  const signIn = email => st.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split('#')[0] } });
  const signOut = () => st.sb.auth.signOut();
  return { init, signIn, signOut, get state() { return st; } };
})();
