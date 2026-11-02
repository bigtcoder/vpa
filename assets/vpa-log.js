(async function(){
const SYS=['DUPR','PVNA','VDPR','PICKNA','LOOL','SPORTCONNECT','UTRP','VAIR','IPTPA','WPR','SELF'],$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let sb=null,D={players:[],ratings:[],events:[]};dt.value=new Date().toISOString().slice(0,10);
const demo=new URLSearchParams(location.search).has('demo');
function slot(k){return '<div class="slot" data-k="'+k+'"><label>'+vt('pl')+' '+k+'</label><input class="nm" list="plist" data-i18n-ph="search" placeholder="'+vt('search')+'"><div class="row"><div><label>'+vt('g')+'</label><select class="gd"><option value="male">M</option><option value="female">F</option></select></div></div><div class="rts"></div><button class="b g ar" type="button">'+vt('addR')+'</button></div>'}
function rrow(s='PVNA',r='',u=''){return '<div class="row rr"><div><select class="rs">'+SYS.map(x=>'<option'+(x===s?' selected':'')+'>'+x+'</option>').join('')+'</select></div><div><input class="rv" type="number" step="0.001" placeholder="'+vt('rat')+'" value="'+r+'"></div><div><input class="ru" placeholder="'+vt('pid')+'" value="'+esc(u)+'"></div></div>'}
function teams(){[['teamA','A'],['teamB','B']].forEach(([id,t])=>{$(id).innerHTML='<h3>'+vt(id==='teamA'?'ta':'tb')+'</h3>'+slot(t+'1')+(fm.value==='doubles'?slot(t+'2'):'')});
 document.querySelectorAll('.slot').forEach(s=>{s.querySelector('.ar').onclick=()=>s.querySelector('.rts').insertAdjacentHTML('beforeend',rrow());s.querySelector('.rts').innerHTML=rrow();
  s.querySelector('.nm').onchange=()=>{const p=D.players.find(p=>p.display_name===s.querySelector('.nm').value);if(!p)return;s.dataset.pid=p.id;s.querySelector('.gd').value=p.gender||'male';
   s.querySelector('.rts').innerHTML=D.ratings.filter(r=>r.player_id===p.id).map(r=>rrow(r.system,r.rating,r.profile_url||r.external_id||'')).join('')||rrow()}})}
function game(a='',b=''){$('games').insertAdjacentHTML('beforeend','<div class="row gr"><div><input class="ga" type="number" min="0" value="'+a+'"></div><div><input class="gb" type="number" min="0" value="'+b+'"></div></div>')}
fm.onchange=teams;addG.onclick=()=>game();teams();game();
document.addEventListener('vpa-lang',()=>{});
function validGames(){const T=+to.value,W=+wb.value;const g=[...document.querySelectorAll('.gr')].map(r=>[+r.querySelector('.ga').value,+r.querySelector('.gb').value]).filter(x=>x[0]||x[1]);
 return g.length&&g.every(([a,b])=>Math.max(a,b)>=T&&Math.abs(a-b)>=W)?g:null}
async function refresh(){if(!sb)return;const [p,r,e]=await Promise.all([sb.from('players').select('id,display_name,gender'),sb.from('player_ratings').select('*'),sb.from('events').select('id,name,starts_on').order('starts_on',{ascending:false})]);
 D={players:p.data||[],ratings:r.data||[],events:e.data||[]};plist.innerHTML=D.players.map(p=>'<option value="'+esc(p.display_name)+'">').join('');
 const o=D.events.map(e=>'<option value="'+e.id+'">'+esc(e.name)+'</option>').join('');ev.innerHTML='<option value="">—</option>'+o;exEv.innerHTML=o}
async function save(){const g=validGames();if(!g){sv.textContent=vt('bad');return}
 let evId=ev.value;if(evNew.value.trim()){const r=await sb.from('events').insert({name:evNew.value.trim(),starts_on:dt.value}).select().single();if(r.error)throw r.error;evId=r.data.id}
 const ids={};for(const s of document.querySelectorAll('.slot')){const nm=s.querySelector('.nm').value.trim();if(!nm){ids[s.dataset.k]=null;continue}
  let pid=D.players.find(p=>p.display_name===nm)?.id;if(!pid){const r=await sb.from('players').insert({display_name:nm,gender:s.querySelector('.gd').value}).select().single();if(r.error)throw r.error;pid=r.data.id}
  for(const rr of s.querySelectorAll('.rr')){const v=parseFloat(rr.querySelector('.rv').value);if(!isFinite(v))continue;const sys=rr.querySelector('.rs').value,u=rr.querySelector('.ru').value.trim();
   if(D.ratings.some(x=>x.player_id===pid&&x.system===sys&&+x.rating===v))continue;
   const r=await sb.from('player_ratings').insert({player_id:pid,system:sys,rating:v,observed_at:dt.value,profile_url:/^https?:/.test(u)?u:null,external_id:/^https?:/.test(u)?null:(u||null),source:'organiser'});if(r.error)throw r.error}
  ids[s.dataset.k]=pid}
 if(!evId||!ids.A1||!ids.B1){sv.textContent=vt('need');return}
 const m=await sb.from('matches').insert({event_id:evId,division:dv.value,played_on:dt.value,format:fm.value,team_a1:ids.A1,team_a2:ids.A2||null,team_b1:ids.B1,team_b2:ids.B2||null,referee:rf.value||null}).select().single();if(m.error)throw m.error;
 const r=await sb.from('match_games').insert(g.map((x,i)=>({match_id:m.data.id,game_no:i+1,score_a:x[0],score_b:x[1]})));if(r.error)throw r.error;
 sv.textContent=vt('saved');evNew.value='';await refresh();ev.value=evId}
save.onclick=()=>save().catch(e=>sv.textContent=e.message);
/* exports */
const csv=rows=>rows.map(r=>r.map(v=>{v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(',')).join('\r\n');
function dl(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+text],{type}));a.download=name;a.click()}
function idFor(pid,sys){const r=D.ratings.filter(x=>x.player_id===pid&&x.system===sys).sort((a,b)=>(a.observed_at<b.observed_at?1:-1))[0];return r?(r.external_id||r.profile_url||''):''}
function latest(pid,sys){const r=D.ratings.filter(x=>x.player_id===pid&&x.system===sys).sort((a,b)=>(a.observed_at<b.observed_at?1:-1))[0];return r?r.rating:''}
exSys.onchange=()=>exNote.textContent=vt(exSys.value.startsWith('DUPR')?'n'+exSys.value:'nGEN');exSys.onchange();
exBtn.onclick=async()=>{const e=D.events.find(x=>x.id===exEv.value);if(!e)return;const res=demo?[]:(await sb.from('results_public').select('*').eq('event_id',e.id)).data||[];
 const nm=Object.fromEntries(D.players.map(p=>[p.id,p.display_name])),S=exSys.value,fn=(e.name+'_'+S).replace(/\W+/g,'_');
 const P=['team_a1','team_a2','team_b1','team_b2'],gs=r=>{const g=(r.games||[]);return[0,1,2,3,4].map(i=>g[i])};
 if(S==='DUPR_JSON'){dl(fn+'.json',JSON.stringify(res.map(r=>({identifier:'vpa-'+r.id,location:'',matchDate:r.played_on,
   teamA:Object.assign({player1:idFor(r.team_a1,'DUPR')},r.team_a2?{player2:idFor(r.team_a2,'DUPR')}:{},...(r.games||[]).map(g=>({['game'+g.g]:g.a}))),
   teamB:Object.assign({player1:idFor(r.team_b1,'DUPR')},r.team_b2?{player2:idFor(r.team_b2,'DUPR')}:{},...(r.games||[]).map(g=>({['game'+g.g]:g.b}))),
   format:r.format.toUpperCase(),event:e.name,bracket:r.division||'',matchType:'SIDEOUT'})),null,1),'application/json');return}
 if(S==='DUPR_CSV'){const h=['Match Type','Scoring Type','Event Name','Match Date','Team A Player 1','Team A Player 1 DUPR ID','Team A Player 2','Team A Player 2 DUPR ID','Team B Player 1','Team B Player 1 DUPR ID','Team B Player 2','Team B Player 2 DUPR ID','Team A Game 1','Team B Game 1','Team A Game 2','Team B Game 2','Team A Game 3','Team B Game 3','Team A Game 4','Team B Game 4','Team A Game 5','Team B Game 5'];
  dl(fn+'.csv',csv([h,...res.map(r=>[r.format,'side-out',e.name,r.played_on,...P.flatMap(k=>[nm[r[k]]||'',r[k]?idFor(r[k],'DUPR'):'']),...gs(r).flatMap(g=>g?[g.a,g.b]:['',''])])]),'text/csv');return}
 const sy=S==='ALL'?SYS:[S],h=['event','division','date','format',...P.flatMap(k=>[k+'_name',...sy.flatMap(s=>[k+'_'+s+'_id',k+'_'+s+'_rating'])]),'games','winner','referee'];
 dl(fn+'.csv',csv([h,...res.map(r=>{const g=r.games||[],wa=g.filter(x=>x.a>x.b).length,wb2=g.length-wa;return[e.name,r.division,r.played_on,r.format,...P.flatMap(k=>[nm[r[k]]||'',...sy.flatMap(s=>r[k]?[idFor(r[k],s),latest(r[k],s)]:['',''])]),g.map(x=>x.a+'-'+x.b).join(' '),wa>wb2?'A':'B',r.referee||'']})]),'text/csv')};
/* auth */
if(demo){app.classList.remove('hide');auth.classList.add('hide');msg.innerHTML='<div class="warn">DEMO — not connected, nothing is saved.</div>';return}
if(!VPAData.configured()){msg.innerHTML='<div class="warn" data-i18n="nc">'+vt('nc')+'</div>';auth.classList.add('hide');return}
sb=await VPAData.client();
send.onclick=async()=>{const r=await sb.auth.signInWithOtp({email:email.value.trim(),options:{emailRedirectTo:location.origin+location.pathname}});msg.innerHTML='<div class="warn">'+esc(r.error?r.error.message:vt('sent'))+'</div>'};
async function check(){const {data:{session}}=await sb.auth.getSession();if(!session)return;const r=await sb.from('organisers').select('email').maybeSingle();
 if(!r.data){msg.innerHTML='<div class="warn">'+vt('notOrg')+'</div>';return}auth.classList.add('hide');app.classList.remove('hide');msg.innerHTML='';refresh()}
sb.auth.onAuthStateChange(()=>check());check();
})();
