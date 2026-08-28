
const SUPABASE_URL = "https://wjqcnxnwjqmuzrandgea.supabase.co";
const SUPABASE_KEY = "sb_publishable_DQZclfAnv_MYQJLGcOdzdw_g4vMCiSC";
const __RECOVERY_HASH = (typeof location!=='undefined' && location.hash) ? location.hash : '';
const __RECOVERY_SEARCH = (typeof location!=='undefined' && location.search) ? location.search : '';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { detectSessionInUrl: false, flowType: 'implicit', persistSession: true, autoRefreshToken: true } });
/* ---------- Never let a save fail in silence ----------
   Most write calls in this app don't check .error, so a failed save used to vanish with no sign
   (that's how a permissions change could look saved and not be). This wraps every insert/update/
   upsert/delete so ANY failure raises a visible notice, whether or not the caller checks. Callers
   that do handle the error still get the normal result object, so nothing else changes. */
(function(){
  try{
    var WRITE_OPS=['insert','update','upsert','delete'];
    var _from=sb.from.bind(sb);
    sb.from=function(table){
      var qb=_from(table);
      WRITE_OPS.forEach(function(op){
        var orig=qb[op];
        if(typeof orig!=='function') return;
        qb[op]=function(){
          var res=orig.apply(qb,arguments);
          try{
            if(res && typeof res.then==='function'){
              var _then=res.then.bind(res);
              res.then=function(ok,bad){
                return _then(function(r){
                  try{ if(r && r.error) window._writeFailed(table,op,r.error); }catch(e){}
                  return ok?ok(r):r;
                },bad);
              };
            }
          }catch(e){}
          return res;
        };
      });
      return qb;
    };
  }catch(e){}
})();
/* ---------- Never let a LOAD fail in silence ----------
   The guard above covers saves. Reads had no equivalent: 142 places in this file do
   `data || []`, so a query that fails returns nothing and the screen renders as though
   the answer were genuinely empty. "No one scheduled today" and "the schedule failed to
   load" looked identical -- which is exactly the kind of thing a manager acts on wrongly.
   Note this only fires on real failures (network, permissions, bad query). Row-level
   security filtering rows out is NOT an error, so ordinary empty results stay quiet. */
(function(){
  try{
    var _from2=sb.from.bind(sb);
    sb.from=function(table){
      var qb=_from2(table);
      var origSel=qb.select;
      if(typeof origSel==='function'){
        qb.select=function(){
          var fb=origSel.apply(qb,arguments);
          try{
            if(fb && typeof fb.then==='function' && !fb.__readGuarded){
              fb.__readGuarded=true;
              var _then=fb.then.bind(fb);
              fb.then=function(ok,bad){
                return _then(function(r){
                  try{ if(r && r.error) window._readFailed(table,r.error); }catch(e){}
                  return ok?ok(r):r;
                },bad);
              };
            }
          }catch(e){}
          return fb;
        };
      }
      return qb;
    };
  }catch(e){}
})();
window._readFailed=function(table,err){
  var msg=(err&&err.message)||'Unknown error';
  var key='r|'+table+'|'+msg;
  window._rfSeen=window._rfSeen||{};
  var now=Date.now(); if(window._rfSeen[key] && now-window._rfSeen[key]<8000) return;
  window._rfSeen[key]=now;
  try{ console.error('Load failed on '+table+': '+msg); }catch(e){}
  var box=document.getElementById('rfBar');
  if(!box){ box=document.createElement('div'); box.id='rfBar'; document.body.appendChild(box); }
  box.style.cssText='position:fixed;left:14px;right:14px;top:14px;z-index:10040;background:#78350F;color:#fff;border-radius:12px;padding:12px 15px;box-shadow:0 8px 30px rgba(0,0,0,.3);display:flex;gap:11px;align-items:flex-start;max-width:520px;margin:0 auto';
  box.innerHTML='<i class="ti ti-cloud-off" style="font-size:18px;flex:none;margin-top:1px"></i>'
    +'<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:13.5px;margin-bottom:2px">Some of this page didn\'t load</div>'
    +'<div style="font-size:12.5px;line-height:1.5;opacity:.95;word-break:break-word">'+esc(msg)+'</div>'
    +'<div style="font-size:11.5px;opacity:.75;margin-top:4px">'+esc(table)+'. What you see may be incomplete &mdash; reload before acting on it.</div></div>'
    +'<button onclick="var b=document.getElementById(\'rfBar\');if(b)b.remove()" style="border:none;background:transparent;color:#fff;font-size:18px;cursor:pointer;line-height:1;flex:none">&times;</button>';
  clearTimeout(window._rfTmr); window._rfTmr=setTimeout(function(){ var b=document.getElementById('rfBar'); if(b) b.remove(); }, 12000);
};
/* ---------- Replace a whole settings record without risking the old one ----------
   Several settings in this app are stored as a single day_items row holding a JSON blob:
   permissions, channel definitions, coverage rules, CostSmart config, station list.
   Saving one meant "delete every row of this kind, then insert the new one". If the
   insert failed after the delete committed, the entire setting was erased -- all
   permissions gone, all channels gone -- and the user saw only "Could not save".
   This snapshots first and puts the old rows back when the insert fails. */
window._replaceKind = async function(kind, rows){
  const snap = await sb.from('day_items').select('*').eq('kind', kind);
  if(snap.error) return {ok:false, stage:'read', error:snap.error, restored:true};
  const prior = snap.data || [];
  const del = await sb.from('day_items').delete().eq('kind', kind);
  if(del.error) return {ok:false, stage:'clear', error:del.error, restored:true};
  const list = Array.isArray(rows) ? rows : (rows ? [rows] : []);
  if(list.length){
    const ins = await sb.from('day_items').insert(list);
    if(ins.error){
      let restored = !prior.length;
      if(prior.length){ const rb = await sb.from('day_items').insert(prior); restored = !rb.error; }
      return {ok:false, stage:'save', error:ins.error, restored:restored};
    }
  }
  return {ok:true};
};
window._replaceMsg = function(r){
  const why = (r.error && r.error.message) || 'unknown error';
  if(r.stage !== 'save') return 'Could not save: ' + why + ' \u2014 nothing was changed.';
  return 'Could not save: ' + why + (r.restored
    ? ' \u2014 your previous settings were put back.'
    : ' \u2014 IMPORTANT: the previous settings could not be restored either. Check them before relying on this.');
};
window._writeFailed=function(table,op,err){
  var msg=(err&&err.message)||'Unknown error';
  var key=table+'|'+op+'|'+msg;
  window._wfSeen=window._wfSeen||{};
  var now=Date.now(); if(window._wfSeen[key] && now-window._wfSeen[key]<6000) return; // don't stack duplicates
  window._wfSeen[key]=now;
  try{ console.error('Write failed on '+table+'.'+op+': '+msg); }catch(e){}
  var box=document.getElementById('wfBar');
  if(!box){ box=document.createElement('div'); box.id='wfBar'; document.body.appendChild(box); }
  box.style.cssText='position:fixed;left:14px;right:14px;bottom:14px;z-index:10050;background:#7F1D1D;color:#fff;border-radius:12px;padding:13px 15px;box-shadow:0 8px 30px rgba(0,0,0,.3);display:flex;gap:11px;align-items:flex-start;max-width:520px;margin:0 auto';
  box.innerHTML='<i class="ti ti-alert-triangle" style="font-size:19px;flex:none;margin-top:1px"></i>'
    +'<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:13.5px;margin-bottom:2px">That didn\'t save</div>'
    +'<div style="font-size:12.5px;line-height:1.5;opacity:.95;word-break:break-word">'+esc(msg)+'</div>'
    +'<div style="font-size:11.5px;opacity:.75;margin-top:4px">'+esc(table)+' &middot; '+esc(op)+'. Your change was not stored, so try again.</div></div>'
    +'<button onclick="var b=document.getElementById(\'wfBar\');if(b)b.remove()" style="border:none;background:transparent;color:#fff;font-size:18px;cursor:pointer;line-height:1;flex:none">&times;</button>';
  clearTimeout(window._wfTimer); window._wfTimer=setTimeout(function(){ var b=document.getElementById('wfBar'); if(b)b.remove(); },12000);
};

const root = document.getElementById("root");
let state = { user:null, profile:null, tracks:[], lessons:{}, progress:new Set(), responses:{}, settings:{}, glossary:[], assignments:[], page:"home", ctx:{}, authMode:"in", busy:false };
function hexRgb(h){ h=(h||'').replace('#',''); if(h.length===3)h=h.split('').map(c=>c+c).join(''); const n=parseInt(h||'C04A28',16)||12602920; return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
function applyBrand(color){ if(!color) return; const {r,g,b}=hexRgb(color); const s=document.documentElement.style; s.setProperty('--brand',color); s.setProperty('--brand-soft',`rgba(${r},${g},${b},0.10)`); s.setProperty('--brand-line',`rgba(${r},${g},${b},0.30)`); const dk=c=>Math.round(c*0.62), lt=c=>Math.round(c+(255-c)*0.42); s.setProperty('--tealmid',color); s.setProperty('--tealdark',`rgb(${dk(r)},${dk(g)},${dk(b)})`); s.setProperty('--teallite',`rgb(${lt(r)},${lt(g)},${lt(b)})`); }
const STALL_DAYS=5;
const DEFAULT_BRAND='#4A9CAD';
const DEFAULT_NAME='Sidewalk Academy';
const DEFAULT_LOGO="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%234A9CAD'/%3E%3Ctext x='50' y='71' font-family='Georgia,serif' font-style='italic' font-size='60' fill='white' text-anchor='middle'%3ES%3C/text%3E%3C/svg%3E";
async function loadSettings(){ const { data } = await sb.from('settings').select('*').eq('id',1).maybeSingle(); const s=data||{}; let _tn=null,_tjc=null,_tan=null,_tbc=null,_tlg=null,_tlj=null,_tof=null; const _isSW=!!(state.profile && state.profile.tenant_id==='11111111-1111-1111-1111-111111111111'); if(state.profile && state.profile.tenant_id){ try{ const _tr=await sb.from('tenants').select('*').maybeSingle(); if(_tr.data){ state.tenant=_tr.data; _tn=_tr.data.name; _tjc=_tr.data.join_code; _tan=_tr.data.academy_name; _tbc=_tr.data.brand_color; _tlg=_tr.data.logo_url; _tlj=_tr.data.law_jurisdiction; _tof=_tr.data.open_floor; } }catch(e){} try{ const _su=await sb.from('subscriptions').select('*').maybeSingle(); if(_su.data) state.sub=_su.data; }catch(e){} } state.settings = Object.assign({}, s, { academy_name: _tan||_tn||(_isSW?s.academy_name:null)||DEFAULT_NAME, brand_color: _tbc||(_isSW?s.brand_color:null)||DEFAULT_BRAND, logo_url: (_tlg!=null&&_tlg!=='')?_tlg:(_isSW?(s.logo_url||(data?DEFAULT_LOGO:'')):''), join_code: _tjc||s.join_code||'', law_jurisdiction: _tlj||s.law_jurisdiction||'AZ', open_floor: _tof||s.open_floor||'05:30' }); try{ const rs=await sb.from('day_items').select('detail').eq('kind','stations').maybeSingle(); const arr=JSON.parse((rs.data&&rs.data.detail)||'[]'); if(Array.isArray(arr)) state.settings.stations=arr; }catch(e){} try{ const rp=await sb.from('day_items').select('detail').eq('kind','perms').maybeSingle(); state.perms=JSON.parse((rp.data&&rp.data.detail)||'{}'); }catch(e){ state.perms={}; } try{ const rg=await sb.from('day_items').select('title,detail').eq('kind','usergrant'); const gm={}; (rg.data||[]).forEach(x=>{ try{ const d=JSON.parse(x.detail||'{}'); if(x.title&&Array.isArray(d.pages)) gm[x.title]=d.pages; }catch(e){} }); state.grants=gm; }catch(e){ state.grants={}; }
  // explicit login-to-roster links (title = profile id, detail = roster name), for names we can't resolve on our own
  try{ const rl=await sb.from('day_items').select('title,detail').eq('kind','acctlink'); const lm={}; (rl.data||[]).forEach(x=>{ if(x.title&&x.detail) lm[x.title]=x.detail; }); window._acctLink=lm; }catch(e){ window._acctLink={}; } applyBrand(state.settings.brand_color); }

function esc(s){ return (s||"").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function richBody(html){
  try{
    const d=new DOMParser().parseFromString(html,'text/html');
    [...d.body.querySelectorAll('div')].forEach(dv=>{ if(/Up Next/i.test(dv.textContent) && dv.textContent.length<240) dv.remove(); });
    [...d.body.querySelectorAll('*')].forEach(el=>{ if(el.children.length===0){ const t=(el.textContent||'').trim(); if(t.length<130 && /(·|•)\s*(Module\s*\d+|Example)\s*(·|•)/i.test(t)) el.remove(); } });
    const kids=[...d.body.children];
    // A single wrapper <div> (Hazel / new builder lessons): return it as-is.
    // Otherwise the body is a flat sequence of blocks — return ALL of it, not just the first, so nothing gets dropped.
    if(kids.length===1 && kids[0].tagName==='DIV') return kids[0].outerHTML;
    return d.body.innerHTML;
  }catch(e){ return html; }
}

/* ---------- confetti ---------- */
function confetti(big){
  const c=document.getElementById('fx'),x=c.getContext('2d');
  c.width=innerWidth;c.height=innerHeight;
  const colors=['#C04A28','#1D7A5A','#E0A33A','#3D6FB4','#C9577F']; let parts=[];
  function burst(n){ for(let i=0;i<n;i++)parts.push({x:innerWidth/2+(Math.random()-.5)*170,y:innerHeight/2-20,vx:(Math.random()-.5)*11,vy:Math.random()*-11-3,g:.16,r:Math.random()*7+3,col:colors[(Math.random()*colors.length)|0],rot:Math.random()*6,vr:(Math.random()-.5)*.5,born:0}); }
  burst(big?160:70); if(big){ setTimeout(()=>burst(120),450); setTimeout(()=>burst(110),1000); }
  const LIFE=big?280:160; let t=0;
  (function frame(){ x.clearRect(0,0,c.width,c.height); t++;
    parts.forEach(p=>{p.born++;p.vy+=p.g;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;x.save();x.translate(p.x,p.y);x.rotate(p.rot);x.globalAlpha=Math.max(0,1-p.born/LIFE);x.fillStyle=p.col;x.fillRect(-p.r/2,-p.r/2,p.r,p.r*.62);x.restore();});
    parts=parts.filter(p=>p.born<LIFE&&p.y<c.height+50);
    if(t<LIFE+70)requestAnimationFrame(frame); else x.clearRect(0,0,c.width,c.height);
  })();
}
function celebrate(title,sub,big,emoji){
  const o=document.getElementById('celebrate');
  document.getElementById('ceEmoji').textContent=emoji||'🎉';
  document.getElementById('ceTitle').textContent=title;
  document.getElementById('ceSub').textContent=sub||'';
  o.style.display='flex'; confetti(big);
  clearTimeout(window._ce); window._ce=setTimeout(()=>o.style.display='none', big?4200:1900);
}

/* ---------- data ---------- */
async function loadAll(){
  const { data:tracks } = await sb.from("tracks").select("*").order("position");
  const { data:lessons } = await sb.from("lessons").select("*").order("position");
  const { data:prog } = await sb.from("progress").select("lesson_id");
  state.tracks = tracks||[];
  state.lessons = {};
  (lessons||[]).forEach(l=>{ (state.lessons[l.track_id]=state.lessons[l.track_id]||[]).push(l); });
  state.progress = new Set((prog||[]).map(p=>p.lesson_id));
  const { data:resp } = await sb.from("responses").select("lesson_id,text");
  state.responses = {}; (resp||[]).forEach(r=>{ state.responses[r.lesson_id]=r.text; });
  const { data:gl } = await sb.from('glossary').select('*'); state.glossary = gl||[];
  const { data:asg } = await sb.from('assignments').select('*'); state.assignments = asg||[];
  try{ const { data:_ta } = await sb.from('day_items').select('title,detail').eq('kind','trackassign'); state.trackAssign={}; (_ta||[]).forEach(x=>{ let d={};try{d=typeof x.detail==='string'?JSON.parse(x.detail||'{}'):(x.detail||{})}catch(e){} const tid=(d&&d.track_id)||x.title; if(tid&&d&&Array.isArray(d.names)) state.trackAssign[tid]=d.names; }); }catch(e){ state.trackAssign=state.trackAssign||{}; }
  try{ await loadCommunityUnread(); }catch(e){ window._communityUnread=0; }
}
// Count community posts this person hasn't read, across the channels they can see. Feeds the nav badge
// so a new message is visible the moment they open the app, instead of only inside Community.
async function loadCommunityUnread(){
  window._communityUnread=0;
  const isLeader=(state.profile&&state.profile.role==='admin')||(typeof myRank==='function'&&myRank()>=2);
  const chans=(typeof effectiveChannels==='function'?effectiveChannels():[]).filter(c=>!c.hidden && (isLeader||c.memberVisible)).map(c=>c.id);
  if(!chans.length) return;
  const [rp,rd]=await Promise.all([
    sb.from('posts').select('channel,author_id,created_at').in('channel',chans),
    sb.from('channel_reads').select('channel,last_read_at').eq('user_id',state.user.id)
  ]);
  const lastRead={}; (rd.data||[]).forEach(r=>{ lastRead[r.channel]=new Date(r.last_read_at).getTime(); });
  const byCh={}; let n=0;
  (rp.data||[]).forEach(p=>{ if(p.author_id===state.user.id) return; const t=new Date(p.created_at).getTime(); if(t>(lastRead[p.channel]||0)){ n++; byCh[p.channel]=(byCh[p.channel]||0)+1; } });
  window._communityUnread=n;
  const labels={}; (typeof effectiveChannels==='function'?effectiveChannels():[]).forEach(c=>labels[c.id]=c.label);
  window._communityDigest=Object.keys(byCh).map(id=>({id, label:labels[id]||id, count:byCh[id]})).sort((a,b)=>b.count-a.count);
}
// One compact, tappable line for the Today page. Empty when nothing's unread, so a caught-up day stays clean.
function communityDigestCard(){
  const tot=window._communityUnread||0; const by=window._communityDigest||[];
  if(!tot||!by.length) return '';
  const parts=by.slice(0,4).map(c=>esc(c.label)+' ('+c.count+')').join(', ');
  return `<div class="card" style="padding:11px 15px;margin-bottom:14px;display:flex;align-items:center;gap:11px;cursor:pointer" onclick="go('community')"><div style="width:32px;height:32px;border-radius:9px;background:var(--brand-soft);color:var(--brand);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti ti-messages" style="font-size:17px"></i></div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13.5px">${tot} new in Community</div><div class="faint" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${parts}</div></div><i class="ti ti-chevron-right" style="color:var(--muted);flex-shrink:0"></i></div>`;
}
async function saveResponse(lid, text){
  state.responses[lid]=text;
  await sb.from("responses").upsert({ user_id:state.user.id, lesson_id:lid, text, updated_at:new Date().toISOString() });
}
window.saveJournal = async function(lid){
  const ta=document.getElementById('jr'); if(!ta) return;
  await saveResponse(lid, ta.value);
  const m=document.getElementById('jrmsg'); if(m){ m.textContent='Saved ✓'; setTimeout(()=>{ if(m) m.textContent=''; }, 2500); }
};
async function ensureProfile(){
  const { data } = await sb.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
  if(data){ state.profile=data; return; }
  const name = (window._pendingName||'').trim() || state.user.email.split("@")[0];
  await sb.from("profiles").insert({ id:state.user.id, name, role:"team", title:"Team member" });
  state.profile = { id:state.user.id, name, role:"team", title:"Team member" };
}
function trackLessons(tid){ return state.lessons[tid]||[]; }
function visibleTracks(){ const admin=state.profile&&state.profile.role==='admin'; const rn=(typeof myRosterName==='function')?myRosterName():''; const ln=(state.profile&&state.profile.name)||''; const isLeader=admin||(typeof myRank==='function'&&myRank()>=2); const ta=state.trackAssign||{}; return state.tracks.filter(t=>{ if(admin) return true; const names=ta[t.id]; if(names&&names.length) return names.indexOf(rn)>=0 || names.indexOf(ln)>=0; /* assigned by roster name, but people log in with a short name */ const aud=(t.audience||'all'); if(aud==='admin') return isLeader; /* "Leaders only" means leaders, not just the owner */ return true; }); }
function isDone(lid){ return state.progress.has(lid); }
function trackPct(tid){ const ls=trackLessons(tid); const d=ls.filter(l=>isDone(l.id)).length; return ls.length?Math.round(d/ls.length*100):0; }
function trackDone(tid){ const ls=trackLessons(tid); return ls.length>0 && ls.every(l=>isDone(l.id)); }
async function markDone(tid,lid){
  state.progress.add(lid);
  await sb.from("progress").upsert({ user_id:state.user.id, lesson_id:lid, at:new Date().toISOString() });
  const t=state.tracks.find(x=>x.id===tid);
  if(trackDone(tid)) celebrate(`${t.cert} certified!`, `${state.profile.name} finished ${t.name}.`, true, '🏆');
  else celebrate('Lesson complete','',false,'✓');
  vLesson(document.getElementById('view'));
  const nb=document.getElementById('nextbtn'); if(nb) nb.scrollIntoView({behavior:'smooth',block:'center'});
}
async function undo(lid){ state.progress.delete(lid); await sb.from("progress").delete().eq("user_id",state.user.id).eq("lesson_id",lid); render(); }

/* ---------- nav ---------- */
function go(page,ctx){ if(window._dirty){ if(!confirm('You have unsaved changes'+(window._dirty.label?' in '+window._dirty.label:'')+'.\n\nLeave without saving?')) return; window.clearDirty(); } try{const _n=document.querySelector('.side .nav'),_s=document.querySelector('.side'); window._navScroll=(_n&&_n.scrollTop)||0; window._sideScroll=(_s&&_s.scrollTop)||0;}catch(e){} state.page=page; state.ctx=ctx||{}; try{ history.pushState({p:page,c:state.ctx},''); localStorage.setItem('sw_nav',JSON.stringify({p:page,c:state.ctx})); }catch(e){} scrollTo(0,0); render(); }
window.toggleFavPin=function(p){ try{ let pins=JSON.parse(localStorage.getItem('sw_favpin')||'[]'); const i=pins.indexOf(p); if(i>=0) pins.splice(i,1); else pins.push(p); localStorage.setItem('sw_favpin',JSON.stringify(pins)); }catch(e){} renderApp(); };
window.favDragStart=function(p,e){ window._favDrag=p; try{ if(e&&e.dataTransfer){ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',p); } }catch(_){} };
window.favDrop=function(targetP){ const p=window._favDrag; window._favDrag=null; if(!p||p===targetP)return; try{ let pins=JSON.parse(localStorage.getItem('sw_favpin')||'[]'); const from=pins.indexOf(p); if(from<0)return; pins.splice(from,1); let ti=pins.indexOf(targetP); if(ti<0)ti=pins.length; pins.splice(ti,0,p); localStorage.setItem('sw_favpin',JSON.stringify(pins)); }catch(e){} renderApp(); };
window.addEventListener('popstate',function(e){ if(!state.user) return; if(e.state&&e.state.p){ state.page=e.state.p; state.ctx=e.state.c||{}; } else { state.page='home'; state.ctx={}; } scrollTo(0,0); render(); });
async function signOut(){ await sb.auth.signOut(); state.user=null; state.profile=null; render(); }

/* ---------- render ---------- */
function render(){ state.user ? renderApp() : renderAuth(); }

function renderAuth(){
  const m=state.authMode; const s=state.settings||{};
  const logo = s.logo_url?`<img src="${s.logo_url}" style="max-width:230px;max-height:76px;width:auto;height:auto;object-fit:contain;margin:0 auto 16px;display:block"/>`:`<div class="logo">${esc((s.academy_name||'A').charAt(0).toUpperCase())}</div>`;
  const head = m==="in"?"Welcome back":(m==="reset"?"Reset your password":"Create your account");
  const sub = m==="in"?esc(s.academy_name||'Academy'):(m==="reset"?"Enter your email and we'll send you a link to set a new password.":"First set up your login — you'll pick your restaurant next.");
  root.innerHTML = `<div class="auth"><div class="box">
    ${logo}
    <h1>${head}</h1>
    <p class="sub">${sub}</p>
    <div id="amsg"></div>
    ${m==="up"?`<label>Your name</label><input id="nm" type="text" placeholder="First name" autocomplete="given-name"/>`:``}
    <label>Email</label><input id="email" type="email" placeholder="you@email.com" autocomplete="email"/>
    ${m==="reset"?``:`<label>Password</label><input id="pass" type="password" placeholder="••••••••" autocomplete="${m==="in"?"current-password":"new-password"}"/>`}
    ${(m==="up"&&state._joinPrefill)?`<label>Join code</label><input id="jc" type="text" value="${esc(state._joinPrefill||'')}" placeholder="Ask your manager" autocomplete="off"/>`:``}
    <button class="btn pri" id="go">${m==="in"?"Sign in":(m==="reset"?"Send reset link":"Create account")}</button>
    ${m==="in"?`<div style="text-align:center;margin-top:12px"><b id="fp" style="color:var(--brand);cursor:pointer;font-size:13px;font-weight:600">Forgot password?</b></div>`:``}
    <div class="toggle">${m==="in"?"New here? <b id='tg'>Create an account</b>":(m==="reset"?"<b id='tg'>&larr; Back to sign in</b>":"Have an account? <b id='tg'>Sign in</b>")}</div>
  </div></div>`;
  document.getElementById("tg").onclick=()=>{ state.authMode=(m==="in")?"up":"in"; renderAuth(); };
  document.getElementById("go").onclick=(m==="reset")?sendReset:submitAuth;
  const fp=document.getElementById("fp"); if(fp) fp.onclick=()=>{ state.authMode="reset"; renderAuth(); setTimeout(function(){ const e=document.getElementById("email"); if(e)e.focus(); },30); };
  const passEl=document.getElementById("pass"); if(passEl) passEl.onkeydown=e=>{ if(e.key==="Enter") submitAuth(); };
  const emEl=document.getElementById("email"); if(emEl && m==="reset") emEl.onkeydown=e=>{ if(e.key==="Enter") sendReset(); };
}
async function sendReset(){
  const email=((document.getElementById("email")||{}).value||'').trim();
  if(!email){ amsg("Enter your email first.","err"); return; }
  const btn=document.getElementById("go"); if(btn){ btn.textContent="Sending…"; btn.disabled=true; }
  try{ const { error }=await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin+location.pathname }); if(error){ amsg(error.message,"err"); } else { amsg("Check your email — we sent a link to set a new password. Give it a minute, and check spam/junk if you don't see it.","ok"); } }catch(e){ amsg((e&&e.message)||String(e),"err"); }
  if(btn){ btn.textContent="Send reset link"; btn.disabled=false; }
}
function renderSetPassword(){
  const s=state.settings||{}; const logo = s.logo_url?`<img src="${s.logo_url}" style="max-width:230px;max-height:76px;width:auto;height:auto;object-fit:contain;margin:0 auto 16px;display:block"/>`:`<div class="logo">${esc((s.academy_name||'A').charAt(0).toUpperCase())}</div>`;
  root.innerHTML = `<div class="auth"><div class="box">${logo}<h1>Set a new password</h1><p class="sub">Almost there — pick a new password for your account.</p><div id="amsg"></div><label>New password</label><input id="np1" type="password" placeholder="••••••••" autocomplete="new-password"/><label>Confirm new password</label><input id="np2" type="password" placeholder="••••••••" autocomplete="new-password"/><button class="btn pri" id="npgo">Save new password</button></div></div>`;
  document.getElementById("npgo").onclick=doSetPassword;
  document.getElementById("np2").onkeydown=e=>{ if(e.key==="Enter") doSetPassword(); };
}
window.doSetPassword=async function(){
  const p1=((document.getElementById("np1")||{}).value)||''; const p2=((document.getElementById("np2")||{}).value)||'';
  if(p1.length<6){ amsg("Use at least 6 characters.","err"); return; }
  if(p1!==p2){ amsg("The two passwords don't match.","err"); return; }
  const btn=document.getElementById("npgo"); if(btn){ btn.textContent="Saving…"; btn.disabled=true; }
  const restore=function(){ if(btn){ btn.textContent="Save new password"; btn.disabled=false; } };
  try{
    // Make sure we actually have the recovery session before updating — re-establish it from the link's tokens if needed (fixes iOS/Gmail cases where it didn't stick).
    let sess=await sb.auth.getSession();
    if(!(sess&&sess.data&&sess.data.session)){
      const _hp=new URLSearchParams((__RECOVERY_HASH||'').replace(/^#/,''));
      const _at=_hp.get('access_token'), _rt=_hp.get('refresh_token');
      if(_at){ try{ await sb.auth.setSession({ access_token:_at, refresh_token:_rt||'' }); }catch(e){} sess=await sb.auth.getSession(); }
    }
    if(!(sess&&sess.data&&sess.data.session)){ amsg("Your reset link has expired. Go back and request a new one — it only takes a second.","err"); restore(); return; }
    const { error }=await sb.auth.updateUser({ password:p1 });
    if(error){ amsg(error.message,"err"); restore(); return; }
    // Password changed. Clear the recovery session and drop straight to the sign-in screen
    // (don't rely on boot()/session state — on iOS the recovery session doesn't persist and the screen would hang).
    state.recovery=false; state.user=null;
    try{ history.replaceState(null,'',location.pathname); }catch(e){}
    try{ await sb.auth.signOut({ scope:'local' }); }catch(e){}
    state.authMode='in'; render();
    setTimeout(function(){ try{ amsg("Password updated. Sign in with your new password.","ok"); }catch(e){} },60);
  }catch(e){ amsg((e&&e.message)||String(e),"err"); restore(); }
};
function renderNewRestaurant(){
  root.innerHTML = `<div class="auth"><div class="box"><div class="logo">🏪</div><h1>Welcome</h1><p class="sub">Are you setting up a restaurant, or joining one that already exists?</p><div id="nrmsg"></div><div style="border:1px solid var(--line2);border-radius:12px;padding:16px;margin-bottom:14px;text-align:left"><div style="font-weight:800;font-size:15px">Set up my restaurant</div><div class="muted" style="font-size:12.5px;margin:3px 0 12px;line-height:1.5">For the owner or manager. This creates your restaurant and its academy.</div><label>Restaurant name</label><input id="nrName" type="text" placeholder="e.g. Main Street Diner" autocomplete="organization"/><button class="btn pri" id="nrGo" style="margin-top:8px">Create my restaurant</button></div><div style="text-align:center;font-size:12px;color:var(--muted);margin:2px 0 14px;font-weight:800;letter-spacing:.05em">— OR —</div><div style="border:1px solid var(--line2);border-radius:12px;padding:16px;text-align:left"><div style="font-weight:800;font-size:15px">Join my team</div><div class="muted" style="font-size:12.5px;margin:3px 0 12px;line-height:1.5">For team members. Enter the join code your manager gave you.</div><label>Join code</label><input id="nrJoin" type="text" placeholder="Ask your manager for it" autocomplete="off"/><button class="btn" id="nrJoinGo" style="margin-top:8px">Join my team</button></div><div class="toggle" style="margin-top:16px"><b id="nrOut">Sign out</b></div></div></div>`;
  const i=document.getElementById('nrName'); if(i){ i.focus(); i.onkeydown=function(e){ if(e.key==='Enter') createRestaurant(); }; }
  const j=document.getElementById('nrJoin'); if(j){ j.onkeydown=function(e){ if(e.key==='Enter') joinRestaurant(); }; }
  document.getElementById('nrGo').onclick=createRestaurant;
  document.getElementById('nrJoinGo').onclick=joinRestaurant;
  document.getElementById('nrOut').onclick=signOut;
}
window.createRestaurant=async function(){
  const el=document.getElementById('nrName'); const name=(el&&el.value||'').trim(); const msg=document.getElementById('nrmsg');
  if(!name){ if(msg) msg.innerHTML='<div class="msg err">Give your restaurant a name.</div>'; return; }
  const btn=document.getElementById('nrGo'); if(btn){ btn.textContent='Creating…'; btn.disabled=true; }
  try{ const r = await sb.rpc('new_restaurant',{ p_name:name }); if(r&&r.error){ if(msg) msg.innerHTML='<div class="msg err">'+esc(r.error.message)+'</div>'; if(btn){ btn.textContent='Create my academy'; btn.disabled=false; } return; } window._pendingName=null; state.profile=null; try{ localStorage.setItem('sw_nav', JSON.stringify({p:'setup',c:{}})); }catch(_){} await boot(); }catch(e){ if(msg) msg.innerHTML='<div class="msg err">'+esc(e.message)+'</div>'; if(btn){ btn.textContent='Create my academy'; btn.disabled=false; } }
};
window.joinRestaurant=async function(){
  const el=document.getElementById('nrJoin'); const code=(el&&el.value||'').trim(); const msg=document.getElementById('nrmsg');
  if(!code){ if(msg) msg.innerHTML='<div class="msg err">Enter your team’s join code.</div>'; return; }
  const btn=document.getElementById('nrJoinGo'); if(btn){ btn.textContent='Joining…'; btn.disabled=true; }
  try{ const r = await sb.rpc('join_restaurant',{ p_code:code }); if(r&&r.error){ if(msg) msg.innerHTML='<div class="msg err">'+esc(r.error.message)+'</div>'; if(btn){ btn.textContent='Join my team'; btn.disabled=false; } return; } window._pendingJoin=null; state.profile=null; try{ localStorage.setItem('sw_nav', JSON.stringify({p:'home',c:{}})); }catch(_){} await boot(); }catch(e){ if(msg) msg.innerHTML='<div class="msg err">'+esc(e.message)+'</div>'; if(btn){ btn.textContent='Join my team'; btn.disabled=false; } }
};
function amsg(t,cls){ document.getElementById("amsg").innerHTML=`<div class="msg ${cls}">${esc(t)}</div>`; }
async function submitAuth(){
  if(state.busy) return; state.busy=true;
  const email=document.getElementById("email").value.trim();
  const pass=document.getElementById("pass").value;
  if(!email||!pass){ amsg("Enter your email and password.","err"); state.busy=false; return; }
  document.getElementById("go").textContent="Working…";
  try{
    if(state.authMode==="up"){
      const nm=(document.getElementById('nm')?document.getElementById('nm').value.trim().replace(/\s+/g,' '):'');
      const jc=(document.getElementById('jc')?document.getElementById('jc').value.trim():'');
      /* First name only creates a person the roster cannot match. One team member signed
         up as "Jessica" while her 27 shifts sat under "Jessica Scheller", so the app made
         a second roster entry and her own schedule was invisible to her. Names must match
         the roster to be useful, and the roster uses full names. */
      if(nm.split(' ').filter(Boolean).length < 2){
        amsg("Please enter your first and last name, exactly as your manager has it on the schedule.","err");
        document.getElementById("go").textContent="Create account"; state.busy=false; return;
      }
      window._pendingName=nm; window._pendingJoin=jc;
      const { data, error } = await sb.auth.signUp({ email, password:pass });
      if(error){ amsg(error.message,"err"); }
      else if(!data.session){ amsg("Account created. Check your email to confirm, then sign in.","ok"); state.authMode="in"; }
      else { await boot(); return; }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password:pass });
      if(error){ amsg(error.message,"err"); } else { await boot(); return; }
    }
  }catch(e){ amsg(e.message,"err"); }
  state.busy=false; if(document.getElementById("go")) document.getElementById("go").textContent = state.authMode==="in"?"Sign in":"Create account";
}

/* ---------- Access levels (permissions) ---------- */
const ROLE_LABELS={5:'Owner',4:'GM',3:'Manager',2:'Supervisor',1:'Team member'};
/* Defaults follow how workforce apps actually behave: everyone can SEE the schedule and run the
   checklists; only leaders can build or change them. Editing is gated inside each page by rank,
   so opening a page is not the same as being able to change it. */
const PERM_DEFAULT={brain:3,whiteboard:1,home:1,ask:1,journal:1,build:4,setup:4,team:3,ownership:2,onboarding:3,today:1,rm:1,schedule:1,checklists:1,sales:4,saleshist:4,costsmart:4,calendar:3,lists:1,recovery:1,community:1,resources:1,downloads:1,settings:5,pay:5,clock:5};
const PERM_LABELS={build:'Training & SOP builder',logbook:'Log (shift close-out)',setup:'Setup',team:'Team',ownership:'Who owns what (org chart)',onboarding:'Onboarding',schedule:'Schedule',sales:'Sales',saleshist:'Sales history import',costsmart:'Cost-Smart Schedule',pay:'Pay rates',settings:'Settings',today:'Daily Report',rm:'Fix-it list (R&M)',checklists:'Checklists',calendar:'Calendar',lists:'Lists',recovery:'Recovery',community:'Community',resources:'Resources',downloads:'Downloads'};
/* A person exists twice: the login they created (profiles.name, often just a first name) and the roster
   record the owner entered (e.g. "Presley Elizondo"). Matching those by exact string silently demoted
   every leader to rank 1. Resolve the roster name properly: an explicit link wins, then exact, then
   case-insensitive, then a UNIQUE first-name match. Ambiguous names (two Jessicas) resolve to nothing
   and get surfaced for the owner to link by hand rather than guessed at. */
function rosterKeyFor(nm){
  const m=window._posMap||{}; if(!nm) return '';
  if(m[nm]!=null) return nm;
  const low=String(nm).trim().toLowerCase(); const keys=Object.keys(m);
  let hit=keys.filter(k=>String(k).trim().toLowerCase()===low);
  if(hit.length===1) return hit[0];
  hit=keys.filter(k=>String(k).trim().toLowerCase().split(/\s+/)[0]===low);
  if(hit.length===1) return hit[0];
  return '';
}
function myRosterName(){
  const p=state.profile||{};
  const lk=(window._acctLink&&p.id)?window._acctLink[p.id]:null;
  if(lk&&lk!=='__none__') return lk;      // they told us who they are
  if(lk==='__none__') return p.name||'';  // they said they're not on the roster; stop asking
  return rosterKeyFor(p.name||'')||(p.name||'');
}
function myRank(){ if(state.previewLIT) return state.previewRank||1; if(state.profile&&state.profile.role==='admin') return 5; const pos=(window._posMap&&window._posMap[myRosterName()])||''; if(pos==='Owner')return 5; if(pos==='GM'||pos==='General Manager')return 4; if(pos==='Manager')return 3; if(pos==='Supervisor')return 2; return 1; }
function permOf(page){ const o=state.perms&&state.perms[page]; return (o&&+o)||PERM_DEFAULT[page]||1; }
// Per-person "extra access" — lets a specific person (e.g. a scheduler who's still a team member) into an area beyond their role. Ignored while previewing as a Leader in Training.
function hasGrant(page){ if(state.previewLIT)return false; const nm=myRosterName(); const g=nm&&state.grants&&state.grants[nm]; return !!(g&&g.indexOf(page)>=0); }
function canSee(page){ return myRank()>=permOf(page)||hasGrant(page); }
function renderApp(){
  const isAdmin = state.profile && state.profile.role==="admin";
  const realAdmin = state.previewLIT ? (state._realRole==='admin') : isAdmin;
  /* Names a new manager can read without being told what they mean. 'Build', 'Ask' and
   'Recovery' each described how the feature was made rather than what it does -- Build
   creates training, Ask searches your own training, Recovery is for guests who had a bad
   visit. And a group called Lists containing an item called Lists helps nobody.
   Group labels now say when you would use the thing, not what kind of thing it is. */
  const NAV_ALL=[["",[["today","Today","ti-sun"],["logbook","Log","ti-clipboard-check"]]],["Training",[["home","Academy","ti-school"],["build","Create training","ti-tools"],["ask","Find an answer","ti-bulb"],["journal","Journal","ti-notebook"]]],["Running the restaurant",[["schedule","Schedule","ti-calendar-week"],["team","Team","ti-users"],["ownership","Who owns what","ti-sitemap"],["onboarding","New Hires","ti-user-plus"],["calendar","Calendar","ti-calendar-month"]]],["Day to day",[["rm","Fix-it list","ti-tool"],["recovery","Guest recovery","ti-heart-handshake"],["lists","Checklists","ti-list-details"],["sales","Sales","ti-chart-line"]]],["Shared with the team",[["community","Community","ti-messages"],["resources","Resources","ti-files"],["downloads","Downloads","ti-download"]]],["Set up",[["brain","The Brain","ti-bulb"],["setup","Getting started","ti-list-check"],["settings","Settings","ti-settings"]]]];
  window.toggleNavGroup=function(g){
    let shut={}; try{ shut=JSON.parse(localStorage.getItem('sw_navshut')||'null')||{}; }catch(e){}
    shut[g]=shut[g]?0:1;
    try{ localStorage.setItem('sw_navshut', JSON.stringify(shut)); }catch(e){}
    renderApp();
  };
  let nav = NAV_ALL.map(([g,items])=>[g, items.filter(([p])=>canSee(p))]).filter(([g,items])=>items.length);
  let _pins=[]; try{ _pins=JSON.parse(localStorage.getItem('sw_favpin')||'[]'); }catch(e){}
  try{ const meta={}; NAV_ALL.forEach(([g,items])=>items.forEach(it=>meta[it[0]]=it)); const pinnedFavs=_pins.filter(p=>meta[p]&&canSee(p)); if(pinnedFavs.length){ nav = nav.map(([g,items])=>[g, items.filter(([p])=>_pins.indexOf(p)<0)]).filter(([g,items])=>items.length); nav.unshift(['Favorites', pinnedFavs.map(p=>meta[p])]); } }catch(e){}
  root.innerHTML = `<div class="app">
    <aside class="side">
      <div class="brand" onclick="go('whiteboard')" style="cursor:pointer${state.settings&&state.settings.logo_url?';flex-direction:column;align-items:flex-start;gap:9px;padding:20px 18px':''}">${state.settings&&state.settings.logo_url?`<img src="${state.settings.logo_url}" style="max-width:190px;max-height:64px;width:auto;height:auto;object-fit:contain;display:block" alt="logo"/><div><b>${esc((state.settings&&state.settings.academy_name)||'Academy')}</b><span>Training</span></div>`:`<div class="lg">${esc(((state.settings&&state.settings.academy_name)||'A').charAt(0).toUpperCase())}</div><div><b>${esc((state.settings&&state.settings.academy_name)||'Academy')}</b><span>Training</span></div>`}</div>
      <nav class="nav" id="nav"></nav>
      <div class="me"><div style="display:flex;align-items:center;gap:10px;margin-bottom:11px"><div onclick="document.getElementById('avup').click()" title="Change your photo" style="width:42px;height:42px;border-radius:50%;flex-shrink:0;cursor:pointer;overflow:hidden;background:var(--brand-soft);color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;border:2px solid var(--line)">${state.profile&&state.profile.avatar_url?`<img src="${state.profile.avatar_url}" style="width:100%;height:100%;object-fit:cover"/>`:esc(((state.profile&&state.profile.name)||'?').charAt(0).toUpperCase())}</div><div style="min-width:0"><div class="who">${esc(state.profile?state.profile.name:"")}</div><div class="em">${esc(state.user.email)}</div></div></div><input type="file" id="avup" accept="image/*" style="display:none" onchange="uploadAvatar(this)"/>${realAdmin?`<button class="btn" style="margin-bottom:8px;font-size:13px;gap:6px" onclick="togglePreviewLIT()"><i class="ti ti-eye"></i> ${state.previewLIT?'Exit preview':'Preview as Leader in Training'}</button>`:''}<button class="btn" id="out">Sign out</button></div>
    </aside>
    <main class="main">${state.previewLIT?`<div style="background:var(--brand);color:#fff;padding:9px 16px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:9px;flex-wrap:wrap"><i class="ti ti-eye"></i> Previewing as <select onchange="setPreviewRank(this.value)" style="padding:3px 7px;border-radius:7px;border:1px solid rgba(255,255,255,.5);background:transparent;color:#fff;font-family:inherit;font-size:13px;font-weight:700">${[[1,'Team member'],[2,'Supervisor'],[3,'Manager'],[4,'GM']].map(o=>`<option value="${o[0]}"${(state.previewRank||1)===o[0]?' selected':''} style="color:#1A1A1A">${o[1]}</option>`).join('')}</select> — this is what they see. <span onclick="togglePreviewLIT()" style="margin-left:auto;text-decoration:underline;cursor:pointer">Exit preview</span></div>`:''}<div class="mtop"><button class="mburger" onclick="toggleNav(true)" aria-label="Open menu"><i class="ti ti-menu-2"></i></button>${state.settings&&state.settings.logo_url?`<img class="mlogo" onclick="go('whiteboard')" style="cursor:pointer" src="${state.settings.logo_url}" alt="${esc((state.settings&&state.settings.academy_name)||'Academy')}"/>`:`<span class="mnm" onclick="go('whiteboard')" style="cursor:pointer">${esc((state.settings&&state.settings.academy_name)||'Academy')}</span>`}</div><div id="pagehero"></div><div class="wrap" id="view"></div></main>
    <div class="navscrim" id="scrim" onclick="toggleNav(false)"></div>
  </div>`;
  /* Twenty-one items is a wall. Renaming them made each one clearer and the wall exactly
     as tall. Groups now collapse: whatever you are in stays open, Favourites and the
     always-on items stay open, and the rest fold to a single heading you can click. A
     manager who lives in Today and Schedule sees six or seven lines instead of twenty-one,
     and nothing is hidden -- one click brings any group back. Choices are remembered. */
  let _navShut={}; try{ _navShut=JSON.parse(localStorage.getItem('sw_navshut')||'null')||{'Training':1,'Shared with the team':1,'Set up':1}; }catch(e){ _navShut={'Training':1,'Shared with the team':1,'Set up':1}; }
  const _curGroup=(nav.find(([g,items])=>items.some(([p])=>p===state.page))||[])[0];
  document.getElementById("nav").innerHTML = nav.map(([g,items])=>{
    const _shut = g && g!=='Favorites' && _navShut[g] && g!==_curGroup;
    const gl=g?`<div class="navgroup" onclick="toggleNavGroup('${String(g).replace(/'/g,"\\'")}')" style="cursor:pointer;display:flex;align-items:center;gap:6px;user-select:none">${esc(g)}<i class="ti ti-chevron-${_shut?'right':'down'}" style="font-size:13px;opacity:.55"></i>${_shut?`<span style="opacity:.5;font-weight:500">${items.length}</span>`:''}</div>`:'';
    if(_shut) return gl;
    const _fav=g==='Favorites'; return gl+items.map(([p,l,i])=>{ const _pn=_pins.indexOf(p)>=0; const _drag=_fav?` draggable="true" ondragstart="favDragStart('${p}',event)" ondragover="event.preventDefault()" ondrop="event.preventDefault();favDrop('${p}')"`:''; const _grip=_fav?`<span title="Drag to reorder" style="cursor:grab;color:var(--line2);font-size:13px;flex-shrink:0;padding:0 1px">⠿</span>`:''; return `<a${_drag} style="display:flex;align-items:center;gap:3px;${p==='setup'?'margin-top:auto':''}" class="${state.page===p||(state.page==='lesson'||state.page==='track'||state.page==='acat')&&p==='home'?'active':''}" onclick="go('${p}');toggleNav(false)">${_grip}<i class="ti ${i}" aria-hidden="true"></i><span style="flex:1;min-width:0">${l}</span>${(p==='community'&&window._communityUnread>0)?`<span class="commbadge" style="background:#DC2626;color:#fff;font-size:10.5px;font-weight:800;min-width:18px;height:18px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;flex-shrink:0">${window._communityUnread>99?'99+':window._communityUnread}</span>`:''}<span onclick="event.stopPropagation();toggleFavPin('${p}')" title="${_pn?'Unpin from Favorites':'Pin to Favorites'}" style="cursor:pointer;font-size:13px;line-height:1;color:${_pn?'#E5A800':'var(--line2)'};padding:0 2px;flex-shrink:0">${_pn?'★':'☆'}</span></a>`; }).join(''); }).join("");
  try{ const _n=document.querySelector('.side .nav'); if(_n&&window._navScroll)_n.scrollTop=window._navScroll; const _s=document.querySelector('.side'); if(_s&&window._sideScroll)_s.scrollTop=window._sideScroll; }catch(e){}
  document.getElementById("out").onclick=signOut;
  const PI={whiteboard:'ti-layout-dashboard',home:'ti-school',summary:'ti-chart-bar',team:'ti-users',onboarding:'ti-user-plus',ask:'ti-bulb',build:'ti-tools',today:'ti-clipboard-list',schedule:'ti-calendar-week',calendar:'ti-calendar-month',community:'ti-messages',resources:'ti-files',downloads:'ti-download',settings:'ti-settings',journal:'ti-notebook',track:'ti-book-2',lesson:'ti-book-2',feedback:'ti-message-2',ownership:'ti-sitemap'};
  const _ti=document.getElementById('topicon'); if(_ti)_ti.innerHTML='<i class="ti '+(PI[state.page]||'ti-point')+'"></i>';
  const v=document.getElementById("view");
  ({whiteboard:vToday, home:vHome, acat:vAcat, track:vTrack, lesson:vLesson, summary:vSummary, team:vTeam, ownership:vOwnership, journal:vJournal, community:vCommunity, feedback:vFeedback, downloads:vDownloads, settings:vSettings, brain:vBrain, resources:vResources, ask:vAsk, build:vBuild, today:vToday, logbook:schLogbook, rm:vRM, lists:vLists, recovery:vRecovery, schedule:vSchedule, onboarding:vOnboarding, calendar:vCalendar, sales:vSales, checklists:vChecklists, setup:vSetup, pay:vPay, clock:vClock, saleshist:vSalesHist, costsmart:vCostSmart}[state.page]||vHome)(v);
}
const PAGE_HERO={
  acat:'&#10022; The Academy',
  schedule:'&#10022; Plan the week', today:'&#10022; Every shift', whiteboard:'&#10022; Every shift', rm:'&#10022; Keep it running', team:'&#10022; Your people', ownership:'&#10022; Who owns what', onboarding:'&#10022; New hires',
  community:'&#10022; The team', resources:'&#10022; On hand', downloads:'&#10022; Take it with you', checklists:'&#10022; Open &amp; close', onboarding:'&#10022; New team members',
  sales:'&#10022; The numbers', saleshist:'&#10022; The numbers', costsmart:'&#10022; Right-size the labor', setup:'&#10022; Get set up', ask:'&#10022; Ask me anything',
  journal:'&#10022; Your notes', build:'&#10022; Course builder', calendar:'&#10022; The month', settings:'&#10022; Settings', logbook:'&#10022; Close the day',
  pay:'&#10022; Private', clock:'&#10022; Time clock', summary:'&#10022; Your progress', feedback:'&#10022; Feedback'
};
const HEROICON={home:'ti-school',acat:'ti-school',whiteboard:'ti-layout-dashboard',track:'ti-book-2',lesson:'ti-book-2'};
function setTitle(t,s){
  const ph=document.getElementById('pagehero'); if(!ph) return;
  if(PAGE_HERO[state.page]){ ph.innerHTML=heroBanner(PAGE_HERO[state.page], esc(t||''), s?esc(s):'', ''); }
  else { ph.innerHTML=`<div class="top"><span class="topicon"><i class="ti ${HEROICON[state.page]||'ti-point'}"></i></span><div style="min-width:0"><h1 id="ttl">${esc(t||'')}</h1><div class="sub" id="tsub">${esc(s||'')}</div></div></div>`; }
}
window.toggleNav=function(open){ const s=document.querySelector('.side'); const sc=document.getElementById('scrim'); if(!s)return; s.classList.toggle('open',open); if(sc)sc.classList.toggle('open',open); };
window.togglePreviewLIT=function(){ if(state.previewLIT){ if(state._realRole!==undefined && state.profile) state.profile.role=state._realRole; state._realRole=undefined; state.previewLIT=false; } else { if(state.profile){ state._realRole=state.profile.role; state.profile.role='team'; } state.previewLIT=true; } state.page='whiteboard'; state.ctx={}; renderApp(); };
window.uploadAvatar=async function(inp){ const f=inp.files&&inp.files[0]; if(!f){return;} if(!f.type.startsWith('image')){ alert('Please choose an image.'); inp.value=''; return; } if(f.size>10*1024*1024){ alert('Please pick an image under 10 MB.'); inp.value=''; return; } const url=await uploadMedia(f); inp.value=''; if(!url)return; const r=await sb.from('profiles').update({avatar_url:url}).eq('id',state.user.id); if(r&&r.error){ alert('Could not save your photo — a quick database permission is needed. Error: '+r.error.message); return; } if(state.profile) state.profile.avatar_url=url; state.community=null; renderApp(); };
function wkDate(s){ return new Date(String(s)+'T00:00'); }
const BADGE_THEMES=[
{g:'radial-gradient(circle at 34% 26%,#8FE0EC,#4A9CAD 46%,#2A6E7A)',ic:'ti-medal',s:'74,156,173'},
{g:'radial-gradient(circle at 34% 26%,#C9AEFF,#8A5CF6 48%,#5A2FC2)',ic:'ti-crown',s:'138,92,246'},
{g:'radial-gradient(circle at 34% 26%,#FFC98A,#F2820A 48%,#BF5E00)',ic:'ti-trophy',s:'242,130,10'},
{g:'radial-gradient(circle at 34% 26%,#93E6B6,#22A05B 48%,#137A44)',ic:'ti-shield-check',s:'34,160,91'},
{g:'radial-gradient(circle at 34% 26%,#93BBFF,#3B6FE0 48%,#254F9E)',ic:'ti-star-filled',s:'59,111,224'},
{g:'radial-gradient(circle at 34% 26%,#FFA6CC,#E84A8A 48%,#AE2463)',ic:'ti-diamond',s:'232,74,138'},
{g:'radial-gradient(circle at 34% 26%,#FFE58A,#F2B705 48%,#BF8F00)',ic:'ti-award',s:'242,183,5'},
{g:'radial-gradient(circle at 34% 26%,#FFAE8F,#F2542D 48%,#BE3413)',ic:'ti-flame',s:'242,84,45'}];
const TRACK_GRADS=['linear-gradient(135deg,#4A9CAD,#2F7C8C)','linear-gradient(135deg,#57A9B9,#3E8493)','linear-gradient(135deg,#3E8493,#245F69)','linear-gradient(135deg,#5FB0C0,#42909F)','linear-gradient(135deg,#2F7C8C,#1C5A64)'];
function _hash(s){ let h=0; s=String(s||'x'); for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; } return h; }
function trackGrad(t){ return TRACK_GRADS[_hash(t.id||t.name)%TRACK_GRADS.length]; }
function trackIcon(t){ const id=(t.id||'').toLowerCase(); const map={fol:'ti-users-group',positioncert:'ti-clipboard-check',decisiontoolkit:'ti-bulb'}; if(map[id])return map[id]; const n=(t.name||'').toLowerCase(); if(/lead/.test(n))return 'ti-users-group'; if(/cert|position/.test(n))return 'ti-clipboard-check'; if(/decision|toolkit/.test(n))return 'ti-bulb'; if(/safe|clean|sanit/.test(n))return 'ti-shield-check'; if(/coffee|drink|barista|bar\b/.test(n))return 'ti-coffee'; if(/food|prep|kitchen|recipe|bagel|bake/.test(n))return 'ti-chef-hat'; if(/serv|guest|custom|host/.test(n))return 'ti-mood-smile'; if(/cash|money|register|pos/.test(n))return 'ti-cash-register'; return 'ti-book-2'; }
function trackBanner(t,pct,done){ return `<div style="height:96px;background:${trackGrad(t)};position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden"><i class="ti ${trackIcon(t)}" style="font-size:40px;color:#fff;opacity:.97"></i><i class="ti ${trackIcon(t)}" style="position:absolute;right:-14px;bottom:-18px;font-size:96px;color:#fff;opacity:.11"></i>${done?`<span class="pill" style="position:absolute;top:10px;right:10px;background:rgba(255,255,255,.94);color:var(--green);font-size:11px;gap:4px;font-weight:600"><i class="ti ti-rosette-discount-check"></i>Certified</span>`:`<span style="position:absolute;top:10px;right:11px;background:rgba(255,255,255,.92);color:var(--brand);font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px">${pct}%</span>`}</div>`; }

async function vWhiteboard(v){
  const isAdmin=state.profile&&state.profile.role==='admin';
  const ops = isAdmin || myRank()>=3;
  const name=state.profile?state.profile.name:''; const _f=((name||'').split(/\s+/)[0]||name);
  const hr=new Date().getHours(); const greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  const today=new Date(); const iso=isoDate(today);
  setTitle(`${greet}, ${_f?_f.charAt(0).toUpperCase()+_f.slice(1):'team'}`, today.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}));
  v.innerHTML='<div class="muted">Loading…</div>';
  const [rsh,rit,rrot,rmv]=await Promise.all([
    sb.from('shifts').select('*').eq('on_date',iso),
    sb.from('day_items').select('*').eq('on_date',iso).order('created_at'),
    sb.from('rotations').select('*'),
    sb.from('day_items').select('*').in('kind',['mission','vision']),
    loadDates(), loadArchived()
  ]);
  const td=ops?await loadTodoData(iso,today):{todoItems:[],todos:[],allRems:[],dueRems:[],openCount:0};
  const shifts=(rsh.data||[]).sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||''));
  const items=rit.data||[]; const rots=rrot.data||[];
  const ojrItem=items.find(i=>i.kind==='ojr');
  const dueRots=rots.filter(r=>{ if(!r.last_done) return true; const d=new Date(r.last_done); d.setDate(d.getDate()+(r.cadence_days||7)); return isoDate(d)<=iso; });
  const mv={}; (rmv.data||[]).forEach(x=>mv[x.kind]=x);
  const hol=usHolidays(today.getFullYear()).find(x=>x.date===iso);
  const mtext=(mv.mission&&mv.mission.detail)||''; const vtext=(mv.vision&&mv.vision.detail)||'';
  const wnote=(label,text)=>`<div style="flex:1;min-width:210px;background:#FBF9F5;border:1px solid #EBE5DB;border-radius:12px;padding:15px 17px;box-shadow:0 3px 12px rgba(60,50,30,.07);position:relative"><div style="position:absolute;top:-6px;left:20px;width:12px;height:12px;border-radius:50%;background:var(--brand);box-shadow:0 2px 4px rgba(0,0,0,.3)"></div><div style="font-size:10.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--brand);margin-bottom:6px">${label}</div><div style="font-size:16.5px;line-height:1.45;font-weight:600;color:var(--ink)">${esc(text)}</div></div>`;
  let h='';
  if(mtext||vtext||isAdmin){
    if(mtext||vtext){
      h+=`<div class="phero" style="padding:26px 28px;margin-bottom:20px">${heroTile()}<div class="phero-in"><div class="row" style="align-items:center;margin-bottom:18px"><span style="font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--accent)">✦ Our Why</span>${isAdmin?`<button onclick="toggleWhyEdit()" style="margin-left:auto;border:1px solid rgba(255,255,255,.55);background:rgba(255,255,255,.15);color:#fff;border-radius:9px;padding:6px 12px;font-size:12.5px;cursor:pointer;font-family:inherit"><i class="ti ti-pencil"></i> Edit</button>`:''}</div>${mtext?`<div style="margin-bottom:${vtext?'20px':'0'}"><div style="font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:7px">Mission</div><div class="mvtext" style="font-size:23px;font-weight:800;line-height:1.3;color:#fff">${esc(mtext)}</div></div>`:''}${vtext?`<div><div style="font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:7px">Vision</div><div class="mvtext" style="font-size:23px;font-weight:800;line-height:1.3;color:#fff">${esc(vtext)}</div></div>`:''}</div></div>`;
    } else if(isAdmin){
      h+=`<div class="card" style="padding:16px 18px;margin-bottom:18px"><div class="row" style="align-items:center;margin-bottom:8px"><span style="font-size:11.5px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--brand)">✦ Our Why</span><button class="btn" style="width:auto;margin-left:auto;padding:5px 12px;font-size:12.5px" onclick="toggleWhyEdit()"><i class="ti ti-pencil"></i> Edit</button></div><div class="faint" style="font-size:13px">Add your mission and vision — they anchor the whole team, front and center.</div></div>`;
    }
    if(isAdmin) h+=`<div id="whyEdit" style="display:${(mtext||vtext)?'none':'block'};margin:-10px 0 18px"><div class="card" style="padding:14px 16px"><textarea id="wbmission" placeholder="Mission — why we exist" style="width:100%;min-height:50px;padding:10px;border:1px solid var(--line2);border-radius:8px;font-family:inherit;font-size:14px;color:var(--ink);background:var(--card);margin-bottom:8px">${esc(mtext)}</textarea><textarea id="wbvision" placeholder="Vision — where we're going" style="width:100%;min-height:50px;padding:10px;border:1px solid var(--line2);border-radius:8px;font-family:inherit;font-size:14px;color:var(--ink);background:var(--card)">${esc(vtext)}</textarea><div class="row" style="margin-top:8px"><button class="btn pri" style="width:auto;margin-left:auto" onclick="saveMV()">Save</button></div></div></div>`;
  }
  if(hol) h+=`<div class="card" style="padding:13px 16px;margin-bottom:16px;background:var(--amber-soft);border-color:var(--amber)"><b style="color:var(--amber)">🎉 ${esc(hol.name)}</b> <span class="muted" style="font-size:13px">${hol.closed?'— closed today. Any perishables prepped today are waste after close.':'— banks/gov closed, expect it busier. Bump prep and staffing.'}</span></div>`;
  if(ops&&ojrItem&&ojrItem.detail) h+=`<div class="card" style="padding:12px 16px;margin-bottom:16px;background:var(--brand-soft);border-color:var(--brand-line)"><b style="color:var(--brand)"><i class="ti ti-user-star"></i> Today's OJR: ${esc(ojrItem.detail)}</b> <span class="muted" style="font-size:13px">— in charge of the shift today.</span></div>`;
  const celebs=upcomingCelebrations(7);
  if(celebs.length) h+=`<div class="card" style="padding:13px 16px;margin-bottom:16px;background:#FCEBF1;border-color:#F3C6D7"><b style="color:#C43D66"><i class="ti ti-cake"></i> Celebrations coming up</b><div style="margin-top:7px;font-size:13.5px;line-height:1.75">`+celebs.map(c=>`${c.emoji} ${celebLabel(c)}${c.days<=3?' <b style="color:#C43D66">·</b>':''}`).join('<br>')+`</div><div class="faint" style="font-size:12px;margin-top:7px">Plan a little something ahead of time.</div></div>`;
  if(ops) h+=`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(148px,1fr));margin-bottom:18px"><div class="otile" style="cursor:pointer" onclick="go('schedule')"><div class="ol"><i class="ti ti-users"></i>On today</div><div class="ov">${shifts.length}</div></div><div class="otile" style="cursor:pointer" onclick="document.getElementById('todocard').scrollIntoView({behavior:'smooth',block:'center'})"><div class="ol"><i class="ti ti-checkbox"></i>To-dos</div><div class="ov">${td.openCount}</div></div><div class="otile" style="cursor:pointer" onclick="go('checklists')"><div class="ol"><i class="ti ti-spray"></i>Cleanings due</div><div class="ov">${dueRots.length}</div></div></div>`;
  if(ops) h+=buildTodoCard(td);
  if(ops){
    h+=`<div class="sec">On the floor today</div>`;
    if(!shifts.length) h+=`<div class="card" style="padding:20px;text-align:center"><div class="faint">No one scheduled today.</div></div>`;
    else h+=`<div class="card">`+shifts.map(s=>{ const inits=(s.person_name||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); return `<div class="row" style="padding:10px 15px;border-bottom:1px solid var(--line)"><span class="av">${esc(inits)}</span><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(s.person_name||'—')}</div><div class="faint" style="font-size:12px">${esc(s.role||'Team')}</div></div><div style="font-size:13px;font-weight:600;color:var(--brand)">${s.start_time?fmtClock(s.start_time):''}${s.end_time?'–'+fmtClock(s.end_time):''}</div></div>`; }).join('')+`</div>`;
  } else {
    if(state.progress && state.progress.size===0){ h+=`<div class="card" style="padding:18px 20px;margin-bottom:16px;background:var(--brand-soft);border-color:var(--brand-line)"><div style="font-weight:700;font-size:16px;margin-bottom:5px">👋 Welcome to ${esc((state.settings&&state.settings.academy_name)||'the Academy')}</div><div class="muted" style="font-size:13.5px;line-height:1.62">This is your space to grow as a leader. Start with <b>Foundations of Leadership</b> below — read each module, jot a quick reflection at the end, and use <b>Community</b> to talk it through with the team. Take it at your own pace.</div></div>`; }
    let _c=null; for(const t of visibleTracks()){ for(const l of trackLessons(t.id)){ if(!isDone(l.id)){ _c={t,l}; break; } } if(_c) break; }
    if(_c){ h+=`<div class="sec">Continue your training</div><div class="card" style="padding:18px 20px;display:flex;align-items:center;gap:16px;margin-bottom:6px"><div style="width:46px;height:46px;border-radius:12px;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0"><i class="ti ti-player-play"></i></div><div style="flex:1;min-width:0"><div class="faint" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:700">${esc(_c.t.name)}</div><div style="font-weight:600;font-size:16px;margin:3px 0 10px">${esc(_c.l.title)}</div><div class="bar"><i style="width:${trackPct(_c.t.id)}%"></i></div></div><button class="btn pri" style="width:auto;gap:6px" onclick="go('lesson',{tid:'${_c.t.id}',lid:'${_c.l.id}'})">Resume <i class="ti ti-arrow-right"></i></button></div>`; }
    else if(visibleTracks().length){ h+=`<div class="sec">Your training</div><div class="card" style="padding:22px;text-align:center"><div style="font-size:26px;margin-bottom:8px">🎓</div><div style="font-weight:600;margin-bottom:4px">You're all caught up</div><div class="muted" style="font-size:13.5px">Every module you've been assigned is complete. Nice work.</div></div>`; }
  }
  const _jump = ops ? [['home','Academy','ti-school'],['community','Community','ti-messages'],['schedule','Schedule','ti-calendar-week'],['today','Today','ti-sun']] : [['home','Academy','ti-school'],['journal','Journal','ti-notebook'],['community','Community','ti-messages'],['downloads','Downloads','ti-download']];
  h+=`<div class="sec">Jump in</div><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">`+_jump.filter(t=>canSee(t[0])).map((t,i)=>{ const gold=i%2===1; const g=gold?'linear-gradient(135deg,var(--accent),var(--accent-2))':'linear-gradient(135deg,var(--tealmid),var(--tealdark))'; const ic=gold?'#3A2B00':'#fff'; const sh=gold?'rgba(229,168,0,.38)':'rgba(46,125,138,.34)'; return `<div class="entrycard card" style="padding:18px 16px;cursor:pointer;text-align:center" onclick="go('${t[0]}')"><div style="width:50px;height:50px;margin:0 auto 11px;border-radius:14px;background:${g};color:${ic};display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 8px 18px ${sh}"><i class="ti ${t[2]}"></i></div><div style="font-weight:700;font-size:14.5px">${t[1]}</div></div>`; }).join('')+`</div>`;
  v.innerHTML=`<div class="wbframe">`+h+`</div>`;
}
window.toggleWhyEdit=function(){ const e=document.getElementById('whyEdit'); if(e) e.style.display = (e.style.display==='none'?'block':'none'); };
window.refreshView=async function(){ const v=document.getElementById('view'); if(!v)return; const fn=({whiteboard:vToday,today:vToday})[state.page]; if(fn){ await fn(v); } else { render(); } };
window.addTodo=async function(){ const el=document.getElementById('todoinput'); if(!el)return; const v=(el.value||'').trim(); if(!v)return; el.value=''; await sb.from('day_items').insert({kind:'todo',on_date:isoDate(new Date()),detail:v,done:false,created_by:state.user.id}); await refreshView(); const ne=document.getElementById('todoinput'); if(ne)ne.focus(); };
window.toggleTodo=async function(id,done){ await sb.from('day_items').update({done:!!done, on_date:isoDate(new Date())}).eq('id',id); await refreshView(); };
window.delTodo=async function(id){ await sb.from('day_items').delete().eq('id',id); await refreshView(); };
const REM_UNITS={day:'Days',week:'Weeks',month:'Months',year:'Years'};
function remAdvance(iso,n,unit){ const p=String(iso).split('-').map(Number); let dt=new Date(p[0],p[1]-1,p[2]); n=n||1; if(unit==='day')dt.setDate(dt.getDate()+n); else if(unit==='week')dt.setDate(dt.getDate()+7*n); else if(unit==='year')dt.setFullYear(dt.getFullYear()+n); else { const day=dt.getDate(); dt.setDate(1); dt.setMonth(dt.getMonth()+n); const dim=new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate(); dt.setDate(Math.min(day,dim)); } return isoDate(dt); }
function remDue(r,t){ if(r.active===false) return false; if(!r.next_due) return false; return isoDate(t)>=r.next_due; }
function remPrettyDate(iso){ if(!iso) return ''; const p=String(iso).split('-').map(Number); return new Date(p[0],p[1]-1,p[2]).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }
function remCadenceLabel(r){ const n=r.every_n||1; const u=r.unit||'month'; if(n===1) return ({day:'Daily',week:'Weekly',month:'Monthly',year:'Yearly'})[u]||'Recurring'; return 'Every '+n+' '+(REM_UNITS[u]||'Months').toLowerCase(); }
window.toggleRemPanel=function(){ const e=document.getElementById('remPanel'); if(e) e.style.display=(e.style.display==='none'?'block':'none'); };
window.addReminder=async function(){ const ti=document.getElementById('remTitle'); if(!ti)return; const t=(ti.value||'').trim(); if(!t)return; const n=Math.max(1,parseInt((document.getElementById('remEvery')||{}).value)||1); const u=(document.getElementById('remUnit')||{}).value||'month'; const nd=(document.getElementById('remNext')||{}).value||isoDate(new Date()); await sb.from('reminders').insert({title:t,every_n:n,unit:u,next_due:nd,cadence:u,created_by:state.user.id}); await refreshView(); const p=document.getElementById('remPanel'); if(p)p.style.display='block'; };
window.delReminder=async function(id){ await sb.from('reminders').delete().eq('id',id); await refreshView(); const p=document.getElementById('remPanel'); if(p)p.style.display='block'; };
window.doneReminder=async function(id){ const r=(await sb.from('reminders').select('*').eq('id',id)).data[0]; if(!r)return; const todayIso=isoDate(new Date()); let nd=r.next_due||todayIso; let g=0; do{ nd=remAdvance(nd,r.every_n||1,r.unit||'month'); g++; }while(nd<=todayIso&&g<400); await sb.from('reminders').update({next_due:nd,last_done:todayIso}).eq('id',id); await refreshView(); };
async function loadTodoData(iso,today){ const [rtodo,rrem]=await Promise.all([ sb.from('day_items').select('*').eq('kind','todo').order('created_at'), sb.from('reminders').select('*').order('next_due') ]); const allTodos=(rtodo.data||[]); const todoItems=allTodos.filter(t=>!t.done||t.on_date===iso).sort((a,b)=>((a.done?1:0)-(b.done?1:0))||(a.created_at||'').localeCompare(b.created_at||'')); const todos=allTodos.filter(t=>!t.done); const allRems=(rrem.data||[]); const dueRems=allRems.filter(r=>remDue(r,today)); return {todoItems,todos,allRems,dueRems,openCount:todos.length+dueRems.length}; }
function buildTodoCard(d){ const dueRems=d.dueRems,todoItems=d.todoItems,allRems=d.allRems,openCount=d.openCount;
  const remRows=dueRems.map(r=>`<div class="row" style="align-items:center;gap:11px;padding:8px 0;border-bottom:1px solid var(--line)"><span onclick="doneReminder('${r.id}')" title="Mark done for this cycle" style="width:22px;height:22px;border-radius:6px;border:2px solid var(--accent-2);background:transparent;cursor:pointer;flex-shrink:0"></span><span style="flex:1;min-width:0;font-size:14.5px;color:var(--ink)">${esc(r.title||'')}</span><span style="flex-shrink:0;display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:var(--accent-ink);background:var(--accent-soft);border:1px solid var(--accent-line);border-radius:999px;padding:2px 8px"><i class="ti ti-repeat" style="font-size:12px"></i>${remCadenceLabel(r)}</span></div>`).join('');
  const todoRows=todoItems.map(t=>`<div class="row" style="align-items:center;gap:11px;padding:8px 0;border-bottom:1px solid var(--line)"><span onclick="toggleTodo('${t.id}',${t.done?0:1})" style="width:22px;height:22px;border-radius:6px;border:2px solid ${t.done?'var(--brand)':'var(--line2)'};background:${t.done?'var(--brand)':'transparent'};color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-size:13px">${t.done?'<i class="ti ti-check"></i>':''}</span><span style="flex:1;min-width:0;font-size:14.5px;${t.done?'text-decoration:line-through;color:var(--muted)':'color:var(--ink)'}">${esc(t.detail||'')}</span><span onclick="delTodo('${t.id}')" style="cursor:pointer;color:var(--muted);font-size:16px;flex-shrink:0" title="Remove"><i class="ti ti-x"></i></span></div>`).join('');
  const remList=allRems.length?allRems.map(r=>`<div class="row" style="align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--line)"><span style="flex:1;min-width:0;font-size:14px;color:var(--ink)">${esc(r.title||'')}</span><span style="font-size:11.5px;color:var(--muted);flex-shrink:0">${remCadenceLabel(r)}${r.next_due?' · next '+remPrettyDate(r.next_due):''}</span><span onclick="delReminder('${r.id}')" style="cursor:pointer;color:var(--muted);font-size:16px;flex-shrink:0" title="Delete reminder"><i class="ti ti-trash"></i></span></div>`).join(''):`<div class="faint" style="font-size:13px">No reminders yet. Add one below.</div>`;
  const remPanel=`<div id="remPanel" style="display:none;margin-top:14px;padding-top:14px;border-top:1px dashed var(--line2)"><div style="font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent-ink);margin-bottom:10px"><i class="ti ti-repeat"></i> Recurring reminders</div>${remList}<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px"><input id="remTitle" placeholder="Reminder — e.g. Change the water filter" onkeydown="if(event.key==='Enter')addReminder()" style="padding:9px 12px;border:1px solid var(--line2);border-radius:9px;font-family:inherit;font-size:14px;background:var(--card);color:var(--ink)"/><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><span style="font-size:13px;color:var(--muted)">Repeats every</span><input id="remEvery" type="number" min="1" value="1" style="width:60px;padding:9px 10px;border:1px solid var(--line2);border-radius:9px;font-family:inherit;font-size:14px;background:var(--card);color:var(--ink)"/><select id="remUnit" style="padding:9px 10px;border:1px solid var(--line2);border-radius:9px;font-family:inherit;font-size:14px;background:var(--card);color:var(--ink)"><option value="day">Days</option><option value="week">Weeks</option><option value="month" selected>Months</option><option value="year">Years</option></select><span style="font-size:13px;color:var(--muted)">next due</span><input id="remNext" type="date" value="${isoDate(new Date())}" style="padding:9px 10px;border:1px solid var(--line2);border-radius:9px;font-family:inherit;font-size:14px;background:var(--card);color:var(--ink)"/><button class="btn pri" style="width:auto;padding:9px 17px;margin-left:auto" onclick="addReminder()">Add reminder</button></div></div></div>`;
  const empty=(!todoItems.length&&!dueRems.length)?`<div class="faint" style="font-size:13px;padding:2px 0 4px">Nothing on the list. Add a to-do below, or set a recurring reminder.</div>`:'';
  return `<div id="todocard" style="border:1px solid #C0DD97;border-left:5px solid #639922;background:#F3F8EA;border-radius:12px;padding:15px 17px;margin-bottom:18px"><div class="row" style="align-items:center;margin-bottom:${(todoItems.length||dueRems.length)?'11':'6'}px"><span style="display:inline-flex;align-items:center;gap:7px;font-size:14.5px;font-weight:800;color:#27500A"><i class="ti ti-checkbox" style="font-size:17px;color:#3B6D11"></i>To-dos today</span><span style="margin-left:auto;display:inline-flex;gap:10px;align-items:center">${openCount?`<span style="font-size:12px;font-weight:700;color:var(--muted)">${openCount} open</span>`:''}<button onclick="toggleRemPanel()" class="btn" style="width:auto;padding:5px 11px;font-size:12px;gap:5px"><i class="ti ti-repeat"></i> Reminders</button></span></div>${empty}${remRows}${todoRows}<div class="row" style="gap:8px;margin-top:12px"><input id="todoinput" placeholder="Add a to-do for today…" onkeydown="if(event.key==='Enter')addTodo()" style="flex:1;min-width:0;padding:9px 12px;border:1px solid var(--line2);border-radius:9px;font-family:inherit;font-size:14px;background:var(--card);color:var(--ink)"/><button class="btn pri" style="width:auto;padding:9px 17px" onclick="addTodo()">Add</button></div>${remPanel}</div>`;
}
// The why, shown once at the start of each person's day. Seen every open it becomes wallpaper; seen once, at the top of a shift, it lands.
window.showWhyMoment=function(mtext,vtext,force){
  if(!mtext&&!vtext) return;
  var k,today;
  try{ k='sw_why_seen_'+((state.user&&state.user.id)||'anon'); today=isoDate(new Date()); if(!force && localStorage.getItem(k)===today) return; }catch(e){ if(!force) return; }
  if(document.getElementById('whyMoment')) return;
  var dstr=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  var lab='font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin-bottom:10px';
  var stmt='font-size:clamp(24px,5.2vw,34px);font-weight:800;line-height:1.18;letter-spacing:-.01em;color:#fff';
  var m=document.createElement('div'); m.id='whyMoment';
  m.style.cssText='position:fixed;inset:0;z-index:10000;overflow:hidden;background:linear-gradient(135deg,var(--tealdark) 0%,var(--tealmid) 52%,var(--teallite) 100%)';
  // the hero's tile SVG is sized for a short banner; on a full screen it would stretch huge, so scale the viewBox to keep the same tile density
  var _sc=2.1, _vw=Math.max(160,Math.round((window.innerWidth||900)/_sc)), _vh=Math.max(160,Math.round((window.innerHeight||700)/_sc));
  var _tile='<svg class="phero-svg" width="100%" height="100%" viewBox="0 0 '+_vw+' '+_vh+'" preserveAspectRatio="none"><defs><pattern id="swtilewhy" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M20 0 L40 20 L20 40 L0 20 Z" fill="none" stroke="#EAF7FA" stroke-width="1.1"/><circle cx="20" cy="20" r="2.2" fill="#EAF7FA"/><path d="M20 6 L20 34 M6 20 L34 20" stroke="#EAF7FA" stroke-width=".7"/></pattern></defs><rect width="'+_vw+'" height="'+_vh+'" fill="url(#swtilewhy)" opacity=".13"/></svg>'
    +'<svg class="phero-heart" viewBox="0 0 24 24" width="300" height="300"><path d="M12 21s-7-4.5-9.5-8.5C.7 9.6 2 6 5.2 6c2 0 3.2 1.2 3.9 2.2C9.6 7.2 10.8 6 12.8 6 16 6 17.3 9.6 15.5 12.5 13 16.5 12 21 12 21z"/></svg>';
  m.innerHTML=_tile
    +'<div style="position:relative;z-index:2;min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 28px;overflow:auto;box-sizing:border-box">'
    +'<div style="width:100%;max-width:600px">'
    +'<div style="font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin-bottom:7px">&#10022; Every shift</div><div style="color:#DCEEF1;font-size:14.5px;margin-bottom:40px">'+esc(dstr)+'</div>'
    +(mtext?'<div style="'+lab+'">Mission</div><div style="'+stmt+'">'+esc(mtext)+'</div>':'')
    +((mtext&&vtext)?'<div style="height:1px;background:rgba(255,255,255,.3);margin:30px 0"></div>':'')
    +(vtext?'<div style="'+lab+'">Vision</div><div style="'+stmt+'">'+esc(vtext)+'</div>':'')
    +'<button id="whyGo" style="width:100%;margin-top:44px;border:none;background:var(--accent);color:#3A2B00;font-weight:800;border-radius:999px;padding:14px;font-size:14px;font-family:inherit;cursor:pointer;box-shadow:0 6px 16px rgba(244,196,60,.42)">Start my shift</button>'
    +'</div></div>';
  document.body.appendChild(m);
  try{ localStorage.setItem(k,today); }catch(e){}
  m.querySelector('#whyGo').onclick=function(){ var e=document.getElementById('whyMoment'); if(e)e.remove(); };
};
// Drag a shift to another person or another day. Desktop drag-and-drop; the click-to-edit behaviour is untouched.
window.schDragStart=function(e){
  var c=e.target&&e.target.closest?e.target.closest('.scard'):null; if(!c) return;
  var sid=c.getAttribute('data-sid'); if(!sid) return;
  window._schDragSid=sid;
  try{ e.dataTransfer.setData('text/plain',sid); e.dataTransfer.effectAllowed='move'; }catch(_){}
  c.classList.add('dragging');
};
window.schDragEnd=function(e){
  var c=e.target&&e.target.closest?e.target.closest('.scard'):null; if(c) c.classList.remove('dragging');
  window._schDragSid=null;
  try{ document.querySelectorAll('.daycell.dragover').forEach(function(x){ x.classList.remove('dragover'); }); }catch(_){}
};
window.schDragOver=function(e){
  if(!window._schDragSid) return;
  e.preventDefault(); try{ e.dataTransfer.dropEffect='move'; }catch(_){}
  var c=e.currentTarget; if(!c) return;
  // red target if this person can't work that day, so you see it before you let go
  c.classList.add(c.getAttribute('data-bad')?'dragover-bad':'dragover');
};
window.schDragLeave=function(e){ var c=e.currentTarget; if(c){ c.classList.remove('dragover'); c.classList.remove('dragover-bad'); } };
window.schDrop=async function(e){
  e.preventDefault();
  var cell=e.currentTarget; if(cell){ cell.classList.remove('dragover'); cell.classList.remove('dragover-bad'); }
  var sid=window._schDragSid; if(!sid){ try{ sid=e.dataTransfer.getData('text/plain'); }catch(_){} }
  window._schDragSid=null;
  if(!sid||!cell) return;
  var nm=cell.getAttribute('data-nm'), iso=cell.getAttribute('data-iso');
  if(!nm||!iso) return;
  // move it in the UI straight away so it lands where you dropped it, instead of snapping back while the save round-trips
  var chip=document.querySelector('.scard[data-sid="'+sid+'"]'), from=chip&&chip.parentNode;
  if(chip){ chip.classList.remove('dragging'); var hint=cell.querySelector('.addhint'); if(hint) cell.insertBefore(chip,hint); else cell.appendChild(chip);
    // reflect the conflict immediately so it turns red the moment it lands, not after the refresh
    if(cell.getAttribute('data-bad')){ chip.classList.add('conflict'); chip.title=cell.getAttribute('data-badwhy')||''; } else { chip.classList.remove('conflict'); chip.removeAttribute('title'); }
  }
  var r=await sb.from('shifts').update({person_name:nm,on_date:iso}).eq('id',sid);
  if(r&&r.error){ if(chip&&from) from.appendChild(chip); alert('Could not move that shift: '+r.error.message); return; }
  var b=document.getElementById('schbody'); if(b&&typeof schBoard==='function') schBoard(b);
};
window.saveMV=async function(){ const m=(document.getElementById('wbmission')||{}).value||''; const vv=(document.getElementById('wbvision')||{}).value||''; for(const [k,val] of [['mission',m.trim()],['vision',vv.trim()]]){
    const _rk=await window._replaceKind(k, val? {kind:k,detail:val,title:k,created_by:state.user.id} : []);
    if(!_rk.ok){ alert(window._replaceMsg(_rk)); return; }
  } go('today'); };
async function vCostSmart(v){
  const today=new Date();
  setTitle('Cost-Smart Schedule','Staff to your real demand, hour by hour');
  v.innerHTML='<div class="muted">Crunching your history…</div>';
  const [rs,rp,rc,rbet]=await Promise.all([
    sb.from('day_items').select('on_date,detail').eq('kind','hourly'),
    sb.from('day_items').select('on_date,detail').eq('kind','punch'),
    sb.from('day_items').select('*').eq('kind','csconfig').limit(1),
    sb.from('day_items').select('detail').eq('kind','laborbet')
  ]);
  let cfg={}; try{ if(rc.data&&rc.data[0]) cfg=JSON.parse(rc.data[0].detail||'{}'); }catch(e){}
  const _bets=(rbet.data||[]).map(r=>{try{const dd=JSON.parse(r.detail||'{}');const _hh=t=>t?(+t.slice(0,2))+(+t.slice(3,5))/60:0;return {days:dd.days||[],sh:_hh(dd.start),eh:_hh(dd.end)};}catch(e){return null;}}).filter(Boolean);
  const isProt=(dw,H)=>_bets.some(b=>b.days.indexOf(dw)>=0 && b.eh>b.sh && H>=Math.floor(b.sh) && H<Math.ceil(b.eh));
  const protCount=_bets.reduce((a,b)=>a+(b.days.length*Math.max(0,Math.ceil(b.eh)-Math.floor(b.sh))),0);
  const parseHM=s=>{ if(!s||String(s).length<16) return null; const h=+String(s).slice(11,13), m=+String(s).slice(14,16); if(isNaN(h)||isNaN(m))return null; return h*60+m; };
  // punches are stored in UTC; restaurant runs America/Phoenix = UTC-7 year-round (no DST). Convert to local minutes.
  const toLoc=s=>{ const m=parseHM(s); return m==null?null:((((m-420)%1440)+1440)%1440); };
  const sAgg={}, sDays={}, lAgg={}, lDays={}, tAgg={}, tDays={};
  (rs.data||[]).forEach(row=>{ let d; try{d=JSON.parse(row.detail||'{}')}catch(e){return;} const dw=new Date(row.on_date+'T12:00:00').getDay(); (sDays[dw]=sDays[dw]||new Set()).add(row.on_date); const A=(sAgg[dw]=sAgg[dw]||{}); const bh=d.byHour||{}; for(const hh in bh){ A[+hh]=(A[+hh]||0)+(+bh[hh]||0); } if(d.byHourTxns){ (tDays[dw]=tDays[dw]||new Set()).add(row.on_date); const T=(tAgg[dw]=tAgg[dw]||{}); for(const hh in d.byHourTxns){ T[+hh]=(T[+hh]||0)+(+d.byHourTxns[hh]||0); } } });
  (rp.data||[]).forEach(row=>{ let d; try{d=JSON.parse(row.detail||'{}')}catch(e){return;} const dw=new Date(row.on_date+'T12:00:00').getDay(); const A=(lAgg[dw]=lAgg[dw]||{}); let any=false; (d.sessions||[]).forEach(s=>{ const a=toLoc(s.in), b=toLoc(s.out); if(a==null||b==null)return; let bb=b; if(bb<a)bb+=1440; for(let H=0;H<24;H++){ const hs=H*60,he=hs+60; const ov=Math.max(0,Math.min(bb,he)-Math.max(a,hs)); if(ov>0){A[H]=(A[H]||0)+ov/60; any=true;} } }); if(any)(lDays[dw]=lDays[dw]||new Set()).add(row.on_date); });
  const DOWS=[['Mon',1],['Tue',2],['Wed',3],['Thu',4],['Fri',5],['Sat',6],['Sun',0]];
  const dow=(state.ctx.csDow!=null)?+state.ctx.csDow:today.getDay();
  const sd=(sDays[dow]?sDays[dow].size:0), ld=(lDays[dow]?lDays[dow].size:0);
  const avgSalesH={}, avgLaborH={}; let totSales=0, totLabor=0;
  for(let H=0;H<24;H++){ const s=sd?((sAgg[dow]||{})[H]||0)/sd:0; const l=ld?((lAgg[dow]||{})[H]||0)/ld:0; avgSalesH[H]=s; avgLaborH[H]=l; totSales+=s; totLabor+=l; }
  const tdc=(tDays[dow]?tDays[dow].size:0); const avgTxnsH={}; let totTxns=0;
  for(let H=0;H<24;H++){ const t=tdc?((tAgg[dow]||{})[H]||0)/tdc:0; avgTxnsH[H]=t; totTxns+=t; }
  const overallTPLH= totLabor>0? totTxns/totLabor : 0;
  const openHours=[]; for(let H=0;H<24;H++){ if(avgSalesH[H]>2) openHours.push(H); }
  const maxSales=Math.max(1,...openHours.map(H=>avgSalesH[H]));
  const overallSPLH= totLabor>0? totSales/totLabor : 0;
  const target = +cfg.splhTarget || (overallSPLH>0?Math.round(overallSPLH/5)*5:40);
  const fmt$=n=>'$'+Math.round(n).toLocaleString();
  const hourLbl=H=>{ const ap=H<12?'a':'p'; let h12=H%12; if(h12===0)h12=12; return h12+ap; };
  const dowName=DOWS.find(d=>d[1]===dow)[0];
  let helpHidden=false; try{ helpHidden=localStorage.getItem('cs_help_hidden')==='1'; }catch(e){}
  const helpCard=`<div class="card" style="padding:0;margin-bottom:16px;overflow:hidden;border-color:var(--brand-line)"><div onclick="csToggleHelp()" style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:12px 16px;background:var(--brand-soft)"><i class="ti ti-help" style="color:var(--brand);font-size:17px"></i><span style="font-weight:800;font-size:13px;color:var(--brand)">How to read this</span><i id="csHelpChev" class="ti ti-chevron-${helpHidden?'down':'up'}" style="margin-left:auto;color:var(--brand)"></i></div><div id="csHelpBody" style="display:${helpHidden?'none':'block'};padding:15px 18px;font-size:13.5px;line-height:1.62;color:var(--ink)"><p style="margin:0 0 11px">This looks at your real Toast history &mdash; about a year of sales and who was clocked in &mdash; <b>hour by hour</b>, for the day you pick up top.</p><p style="margin:0 0 6px">Every row is one hour. Three numbers to watch:</p><div style="margin:0 0 12px"><div style="padding:6px 0;border-bottom:1px solid var(--line)"><b>Avg sales</b> &mdash; what you rang up that hour, on a typical ${dowName}.</div><div style="padding:6px 0;border-bottom:1px solid var(--line)"><b>Now</b> &mdash; how many people you actually had working.</div><div style="padding:6px 0"><b style="color:var(--tealdark)">Smart</b> &mdash; how many you'd need to hit the target you set.</div></div><p style="margin:0 0 12px"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:linear-gradient(90deg,#E8A33C,#F0C05A);vertical-align:middle;margin-right:6px"></span><b>An amber hour</b> means you had more people on than the sales needed. That&rsquo;s where you can trim a shift or send someone home a little early.</p><div style="background:var(--bg);border-radius:11px;padding:13px 15px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:var(--faint);margin-bottom:8px">Do this</div><div style="margin-bottom:5px"><b>1.</b> Pick a day at the top.</div><div style="margin-bottom:5px"><b>2.</b> Set your target &mdash; how hard you want each hour of labor to work. Not sure? Start with the number it fills in.</div><div><b>3.</b> Look at the amber rows, and the weekly savings at the bottom.</div></div><p style="margin:11px 0 0;color:var(--muted);font-size:12.5px">It&rsquo;s a guide, not a boss &mdash; always protect your rush and your service.</p></div></div>`;
  let h='';
  if(!sd){ h+=`<div class="card" style="padding:22px;text-align:center"><div class="faint">No sales history for ${dowName} yet.</div></div>`; v.innerHTML=h; return; }
  const avgWage=+cfg.avgWage||15; const minCov=+cfg.minCov||2; const minClose=+cfg.minClose||3; const mode=['pct','tplh'].includes(cfg.mode)?cfg.mode:'splh'; const pctTarget=+cfg.pctTarget||25; const tplhTarget=+cfg.tplhTarget||(overallTPLH>0?Math.max(1,Math.round(overallTPLH)):6);
  const needMetric=(s,t)=> mode==='pct'?Math.round((pctTarget/100*s)/avgWage) : mode==='tplh'?Math.round((t||0)/tplhTarget) : Math.round(s/target);
  const floorFor=(H,oh)=> (oh&&oh.length&&H>=oh[oh.length-2])?Math.max(minCov,minClose):minCov;
  const needFor=(s,t,H,oh)=> Math.max(needMetric(s,t), floorFor(H,oh));
  const tgtLabel=mode==='pct'?pctTarget+'% labor target':mode==='tplh'?tplhTarget+' transactions/labor-hr target':'$'+target+'/hr target';
  const _inp='padding:7px 9px;border:1px solid var(--line2);border-radius:8px;font-family:inherit;font-size:14px;background:var(--card);color:var(--ink)';
  const _pill=on=>`padding:6px 13px;border-radius:999px;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;border:1px solid ${on?'transparent':'var(--line2)'};${on?'background:linear-gradient(135deg,var(--tealmid),var(--tealdark));color:#fff':'background:var(--card);color:var(--ink)'}`;
  const idealH={}; let idealPH=0;
  openHours.forEach(H=>{ const need=needFor(avgSalesH[H], avgTxnsH[H], H, openHours); idealH[H]=need; idealPH+=need; });
  const idealCost=idealPH*avgWage, actualCost=totLabor*avgWage, gap=actualCost-idealCost;
  const actPct=totSales>0?actualCost/totSales*100:0, idealPct=totSales>0?idealCost/totSales*100:0;
  let wkCutHrs=0, wkSalesTot=0, wkLaborTot=0; const fixes=[]; const dowShort={0:'Sun',1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat'};
  [0,1,2,3,4,5,6].forEach(dw=>{ const sdw=(sDays[dw]?sDays[dw].size:0), ldw=(lDays[dw]?lDays[dw].size:0), tdw=(tDays[dw]?tDays[dw].size:0); if(!sdw)return; const oh=[]; for(let H=0;H<24;H++){ if(((sAgg[dw]||{})[H]||0)/sdw>2) oh.push(H); } let cur=null; oh.forEach(H=>{ const s=((sAgg[dw]||{})[H]||0)/sdw; const l=ldw?((lAgg[dw]||{})[H]||0)/ldw:0; const t=tdw?((tAgg[dw]||{})[H]||0)/tdw:0; wkSalesTot+=s; wkLaborTot+=l; const need=needFor(s,t,H,oh); const over=l-need; if(ldw&&over>=0.5&&!isProt(dw,H)){ wkCutHrs+=over; if(cur&&cur.endH===H-1){ cur.endH=H; cur.overSum+=over; cur.sales+=s; } else { cur={dw,startH:H,endH:H,overSum:over,sales:s}; fixes.push(cur); } } else { cur=null; } }); });
  fixes.forEach(f=>{ f.saveWk=f.overSum*avgWage; }); fixes.sort((a,b)=>b.saveWk-a.saveWk); const topFixes=fixes.filter(f=>f.overSum>=1).slice(0,5); // only surface real windows (≥1 labor-hour) — don't nag over a half-shift
  const wkGap=wkCutHrs*avgWage; const wkLaborCost=wkLaborTot*avgWage; const wkPct=wkSalesTot>0?wkLaborCost/wkSalesTot*100:0; const wkSPLH=wkLaborTot>0?wkSalesTot/wkLaborTot:0; const hrRange=(a,b)=>hourLbl(a)+'&ndash;'+hourLbl(b+1);
  // ---- default view: one number + one action; everything else behind a toggle ----
  const _M3=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const _ws0=weekStart(new Date()); const _wkOpt=o=>{ const d=new Date(_ws0); d.setDate(d.getDate()+o*7); return isoDate(d); };
  const _wkLab=iso=>{ const d=new Date(iso+'T00:00'), e=new Date(d); e.setDate(e.getDate()+6); return _M3[d.getMonth()]+' '+d.getDate()+' &ndash; '+_M3[e.getMonth()]+' '+e.getDate(); };
  if(!state.ctx.csBuildWk) state.ctx.csBuildWk=_wkOpt(1);
  const _selWk=state.ctx.csBuildWk;
  const _wkOptHtml=[[0,'This week'],[1,'Next week'],[2,'Week after']].map(o=>`<option value="${_wkOpt(o[0])}" ${_selWk===_wkOpt(o[0])?'selected':''}>${o[1]} &mdash; ${_wkLab(_wkOpt(o[0]))}</option>`).join('');
  const _big=(topFixes&&topFixes.length)?topFixes[0]:null;
  h+=`<div class="card" style="padding:0;overflow:hidden;margin-bottom:12px;border-color:var(--brand-line)"><div style="padding:16px 18px 15px;background:linear-gradient(135deg,var(--brand-soft),#FFFDF9)"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--brand);margin-bottom:8px">Your biggest opportunity</div>${!ld?`<div class="faint" style="font-size:14px">Labor history is still loading &mdash; your top move shows up once it's in.</div>`:(_big?`<div style="font-size:19px;font-weight:800;color:var(--ink);line-height:1.3">${dowShort[_big.dw]} ${hrRange(_big.startH,_big.endH)} &mdash; trim about ${_big.overSum.toFixed(1)} labor-hours</div><div style="font-size:15px;color:var(--accent-ink);font-weight:800;margin-top:4px">&asymp; ${fmt$(_big.saveWk)}/week &middot; ~${fmt$(_big.saveWk*52)}/yr</div>`:`<div style="font-size:17px;font-weight:800;color:var(--tealdark)"><i class="ti ti-circle-check"></i> You're dialed in &mdash; nothing worth trimming right now.</div>`)}${ld?`<div class="faint" style="font-size:12.5px;margin-top:10px">This week you're running <b>${wkPct.toFixed(0)}% of sales</b> on labor &middot; <b>$${Math.round(wkSPLH)}</b> per labor hour, against your ${tgtLabel}.</div>`:''}</div></div>`;
  h+=`<div class="card" style="padding:16px 18px;margin-bottom:12px;border-color:var(--brand-line)"><div class="row" style="align-items:center;gap:12px"><div style="width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,var(--tealmid),var(--tealdark));color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0"><i class="ti ti-calendar-plus"></i></div><div style="flex:1;min-width:0"><div style="font-weight:800;font-size:15px;color:var(--ink)">Preview the leaner week</div><div style="font-size:13px;color:var(--muted);margin-top:2px">Builds a proposal to this target with your real team &mdash; <b>without touching your current schedule</b>. See it, then apply it or throw it away.</div></div></div><div class="row" style="align-items:center;gap:9px;margin-top:12px"><span style="font-size:13px;color:var(--muted);font-weight:700;white-space:nowrap">Preview for</span><select id="csBuildWkSel" onchange="state.ctx.csBuildWk=this.value" style="flex:1;padding:9px 11px;border:1px solid var(--line2);border-radius:9px;font-family:inherit;font-size:14px;background:var(--card);color:var(--ink)">${_wkOptHtml}</select></div><button class="btn pri" style="width:100%;margin-top:10px;padding:11px" onclick="csBuildSchedule()"><i class="ti ti-eye"></i> Preview my schedule</button></div>`;
  let _csDetOpen=false; try{ _csDetOpen=localStorage.getItem('cs_detail_open')==='1'; }catch(e){}
  h+=`<div onclick="csToggleDetail()" style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;margin-bottom:10px;border:1px solid var(--line2);border-radius:10px;background:var(--card)"><span style="font-weight:700;font-size:13.5px;color:var(--brand)">Show the full breakdown</span><i id="csDetChev" class="ti ti-chevron-${_csDetOpen?'up':'down'}" style="color:var(--brand)"></i></div>`;
  h+=`<div id="csDetail" style="display:${_csDetOpen?'block':'none'}">`;
  h+=helpCard;
  h+=`<div class="card" style="padding:16px 18px;margin-bottom:14px"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--brand);margin-bottom:8px">Where you are</div><div style="font-size:15px;line-height:1.6;color:var(--ink)">In an average week you do <b>${fmt$(wkSalesTot)}</b> in sales on <b>${wkLaborTot.toFixed(0)} labor hours</b>${ld?` &mdash; about <b>${fmt$(wkLaborCost)}</b>, or <b>${wkPct.toFixed(0)}%</b> of sales, at <b>$${Math.round(wkSPLH)}</b> of sales for every hour of staff.`:`. <span class="faint">(Labor history is still loading.)</span>`}</div></div>`;
  h+=`<div class="card" style="padding:16px 18px;margin-bottom:14px"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--brand);margin-bottom:10px">Your biggest fixes</div>`+(!ld?`<div class="faint" style="font-size:13px">Labor history is still loading &mdash; the ranked fixes show up once it's in.</div>`:(!topFixes.length?`<div style="font-size:14px;color:var(--tealdark)"><i class="ti ti-circle-check"></i> <b>You're dialed in.</b> Nothing worth changing this week. Cutting past this starts to risk your service and your growth &mdash; a schedule run this well is worth protecting.</div>`:topFixes.map((f,i)=>`<div class="row" style="align-items:flex-start;gap:11px;padding:9px 0;border-bottom:1px solid var(--line)"><div style="width:24px;height:24px;border-radius:50%;background:var(--accent-soft);color:var(--accent-ink);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0">${i+1}</div><div style="flex:1;min-width:0"><div style="font-size:14.5px;color:var(--ink);line-height:1.5"><b>${dowShort[f.dw]} ${hrRange(f.startH,f.endH)}</b> &mdash; you carry about <b>${f.overSum.toFixed(1)} more labor-hours</b> than the ${fmt$(f.sales)} of sales needs.</div><div style="font-size:13px;color:var(--accent-ink);font-weight:700;margin-top:2px">Trimming it &asymp; ${fmt$(f.saveWk)}/week (~${fmt$(f.saveWk*52)}/yr).</div></div></div>`).join('')))+`</div>`;
  h+=`<div class="card" style="padding:14px 16px;margin-bottom:14px;border-left:4px solid var(--brand)"><div style="font-size:14px;color:var(--ink);line-height:1.6"><b>Before you trim:</b> not all labor is cost. Some of it is an investment in growth &mdash; a daypart you're building, or service that turns guests into regulars. Cost-Smart sees the cost; it can't see your strategy. Cut the waste, and protect the bets on purpose.${protCount?` <b style="color:var(--tealdark)">Right now it's protecting ${protCount} investment hour${protCount!==1?'s':''} you've declared &mdash; those won't show as waste.</b>`:''}</div><div class="row" style="margin-top:9px;gap:16px;flex-wrap:wrap"><span onclick="csLearnLabor()" style="color:var(--brand);font-weight:700;cursor:pointer;font-size:13.5px">&#9788; Learn how to think about labor &rarr;</span><span onclick="csInvest()" style="color:var(--accent-ink);font-weight:700;cursor:pointer;font-size:13.5px">&#127793; Plan a labor investment &rarr;</span></div></div>`;
  if(ld){ h+=`<div class="row" style="margin-bottom:14px"><button class="btn" style="width:auto;padding:10px 16px;font-size:13px" onclick="csReport()"><i class="ti ti-file-text"></i> Print these as a report for your team</button></div>`; }
  if(ld && wkGap>1){ h+=`<div class="card" style="padding:16px 18px;margin-bottom:14px;background:linear-gradient(135deg,var(--accent-soft),#FFFDF6);border-color:var(--accent-line)"><div class="row" style="align-items:center;gap:12px"><div style="width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#3A2B00;display:flex;align-items:center;justify-content:center;font-size:23px;flex-shrink:0"><i class="ti ti-coin"></i></div><div><div style="font-size:22px;font-weight:800;color:var(--accent-ink)">~${fmt$(wkGap)} a week</div><div style="font-size:13.5px;color:var(--ink)">of labor is above your ${tgtLabel} &mdash; roughly <b>${fmt$(wkGap*52)} a year</b>. Fix the spots above and that's what you get back.</div></div></div></div>`; }
  h+=`<div class="card" style="padding:14px 16px;margin-bottom:14px"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--brand);margin-bottom:10px">What you're aiming for</div><div class="row" style="gap:7px;margin-bottom:11px"><button onclick="csSaveTarget('splh')" style="${_pill(mode==='splh')}">Sales / labor hr</button><button onclick="csSaveTarget('pct')" style="${_pill(mode==='pct')}">Labor % of sales</button><button onclick="csSaveTarget('tplh')" style="${_pill(mode==='tplh')}">Transactions / labor hr</button></div><div class="row" style="align-items:center;gap:8px;flex-wrap:wrap"><span id="csSplhWrap" style="display:${mode==='splh'?'inline-flex':'none'};align-items:center;gap:8px"><span style="font-size:13px;color:var(--muted)">Aim for $</span><input id="csTarget" type="number" min="1" value="${target}" style="width:64px;${_inp}"/><span style="font-size:13px;color:var(--muted)">/ labor hr</span></span><span id="csPctWrap" style="display:${mode==='pct'?'inline-flex':'none'};align-items:center;gap:8px"><span style="font-size:13px;color:var(--muted)">Keep labor at</span><input id="csPct" type="number" min="1" max="60" value="${pctTarget}" style="width:54px;${_inp}"/><span style="font-size:13px;color:var(--muted)">% of sales</span></span><span id="csTplhWrap" style="display:${mode==='tplh'?'inline-flex':'none'};align-items:center;gap:8px"><span style="font-size:13px;color:var(--muted)">Aim for</span><input id="csTplh" type="number" min="1" value="${tplhTarget}" style="width:54px;${_inp}"/><span style="font-size:13px;color:var(--muted)">transactions / labor hr</span></span><span style="font-size:13px;color:var(--muted)">&middot; never below</span><input id="csMin" type="number" min="1" value="${minCov}" style="width:40px;${_inp}"/><span style="font-size:13px;color:var(--muted)">&middot; close with</span><input id="csMinClose" type="number" min="1" value="${minClose}" style="width:40px;${_inp}"/><span style="font-size:13px;color:var(--muted)">&middot; wage $</span><input id="csWage" type="number" min="1" step="0.5" value="${avgWage}" style="width:58px;${_inp}"/><button class="btn pri" style="width:auto;padding:7px 15px;margin-left:auto" onclick="csSaveTarget('${mode}')">Update</button></div><div class="faint" style="font-size:12px;margin-top:8px">Amber hours run heavier than your ${tgtLabel}. &ldquo;Smart&rdquo; is the staffing that hits it.</div></div>`;
  if(mode==='tplh' && !tdc){ h+=`<div class="card" style="padding:13px 16px;margin-bottom:14px;background:var(--accent-soft);border-color:var(--accent-line)"><div style="font-size:13px;color:var(--accent-ink);line-height:1.5"><i class="ti ti-clock"></i> Transaction counts for ${dowName} are still loading from Toast — the backfill runs over the next couple hours. Sales-per-labor-hour and Labor-% work fully right now.</div></div>`; }
  // (model + week scan computed above, before the report sections)
  const rows=openHours.map(H=>{ const s=avgSalesH[H], l=avgLaborH[H]; const splh=l>0?s/l:0; const need=idealH[H]; const w=Math.round(s/maxSales*100); const over=l>0&&(l-need)>=0.5; const good=l>0&&!over; const barc=good?'linear-gradient(90deg,var(--tealmid),var(--teallite))':(l>0?'linear-gradient(90deg,#E8A33C,#F0C05A)':'linear-gradient(90deg,var(--tealmid),var(--teallite))'); const splhTxt=l>0?'$'+Math.round(splh):'—'; const splhColor=l>0?(good?'var(--tealdark)':'#B45309'):'var(--muted)';
    return `<div class="row" style="align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--line)"><div style="width:40px;font-size:13px;font-weight:700;color:var(--ink);flex-shrink:0">${hourLbl(H)}</div><div style="flex:1;min-width:0;background:var(--bg);border-radius:6px;height:26px;position:relative;overflow:hidden"><div style="position:absolute;left:0;top:0;bottom:0;width:${w}%;background:${barc};border-radius:6px"></div><span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:12px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.3)">${fmt$(s)}</span></div><div style="width:44px;text-align:right;font-size:12.5px;flex-shrink:0;color:${over?'#B45309':'var(--muted)'};font-weight:${over?'700':'400'}">${l>0?l.toFixed(1):'—'}</div><div style="width:44px;text-align:right;font-size:13px;font-weight:800;color:var(--tealdark);flex-shrink:0">${need}</div><div style="width:44px;text-align:right;font-size:13px;font-weight:800;color:${splhColor};flex-shrink:0">${splhTxt}</div></div>`;
  }).join('');
  h+=`<div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);margin:22px 0 10px">The hour-by-hour detail</div>`;
  h+=`<div class="row" style="gap:7px;flex-wrap:wrap;margin-bottom:12px">`+DOWS.map(([lbl,dw])=>`<button onclick="csDay(${dw})" style="padding:7px 13px;border-radius:999px;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;border:1px solid ${dow===dw?'transparent':'var(--line2)'};${dow===dw?'background:linear-gradient(135deg,var(--tealmid),var(--tealdark));color:#fff':'background:var(--card);color:var(--ink)'}">${lbl}</button>`).join('')+`</div>`;
  h+=`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));margin-bottom:14px"><div class="otile"><div class="ol"><i class="ti ti-cash"></i>Avg ${dowName} sales</div><div class="ov">${fmt$(totSales)}</div></div><div class="otile"><div class="ol"><i class="ti ti-clock"></i>Avg labor</div><div class="ov">${totLabor?totLabor.toFixed(1)+'h':'—'}</div></div><div class="otile"><div class="ol"><i class="ti ti-trending-up"></i>Sales / labor hr</div><div class="ov">${overallSPLH?'$'+Math.round(overallSPLH):'—'}</div></div><div class="otile"><div class="ol"><i class="ti ti-receipt"></i>Transactions / labor hr</div><div class="ov">${overallTPLH?(Math.round(overallTPLH*10)/10):'—'}</div></div></div>`;
  h+=`<div class="card" style="padding:16px 18px"><div class="row" style="align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid var(--line)"><div style="width:40px;font-size:10px;font-weight:800;color:var(--faint);text-transform:uppercase;letter-spacing:.04em">Hour</div><div style="flex:1;font-size:10px;font-weight:800;color:var(--faint);text-transform:uppercase;letter-spacing:.04em">Avg sales</div><div style="width:44px;text-align:right;font-size:10px;font-weight:800;color:var(--faint);text-transform:uppercase">Now</div><div style="width:44px;text-align:right;font-size:10px;font-weight:800;color:var(--tealdark);text-transform:uppercase">Smart</div><div style="width:44px;text-align:right;font-size:10px;font-weight:800;color:var(--faint);text-transform:uppercase">$/LH</div></div>`+rows+`</div>`;
  if(ld){
    h+=`<div class="card" style="padding:0;margin-top:16px;overflow:hidden"><div style="padding:13px 18px;background:linear-gradient(135deg,var(--tealmid),var(--tealdark));color:#fff"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;opacity:.9">${dowName} — your schedule vs cost-smart</div></div><div class="row" style="align-items:stretch;gap:0;border-bottom:1px solid var(--line)"><div style="flex:1;padding:14px 18px;border-right:1px solid var(--line)"><div class="faint" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:6px">Your schedule now</div><div style="font-size:21px;font-weight:800;color:var(--ink)">${totLabor.toFixed(1)}h · ${fmt$(actualCost)}</div><div class="faint" style="font-size:12.5px;margin-top:2px">${actPct.toFixed(1)}% of sales</div></div><div style="flex:1;padding:14px 18px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:6px;color:var(--tealdark)">Cost-smart to target</div><div style="font-size:21px;font-weight:800;color:var(--tealdark)">${idealPH}h · ${fmt$(idealCost)}</div><div class="faint" style="font-size:12.5px;margin-top:2px">${idealPct.toFixed(1)}% of sales</div></div></div><div style="padding:13px 18px;background:${gap>0?'var(--accent-soft)':'var(--bg)'};display:flex;align-items:center;gap:10px"><i class="ti ${gap>0?'ti-scissors':'ti-circle-check'}" style="font-size:20px;color:${gap>0?'var(--accent-ink)':'var(--tealdark)'};flex-shrink:0"></i><div style="font-size:14px;color:var(--ink);line-height:1.5">${gap>0?`<b>About ${fmt$(gap)} of labor this ${dowName}</b> is above what your ${tgtLabel} needs — mostly the amber hours.`:(gap<0?`This ${dowName} already runs leaner than your ${tgtLabel} — room to add ${Math.abs(gap/avgWage).toFixed(1)}h if service feels stretched.`:`This ${dowName} is right on your target.`)}</div></div></div>`;
  }
  h+=`<div class="faint" style="font-size:12px;margin-top:12px">&ldquo;Now&rdquo; = your real avg staffing (from clock-ins); &ldquo;Smart&rdquo; = people to hit your ${tgtLabel}, but never below ${minCov} on the floor and ${minClose} to close — a recommendation, not a rule. Based on ${sd} ${dowName}${sd>1?'s':''}${ld?' + '+ld+' with labor':''} of Toast history.</div>`;
  h+='</div>';
  v.innerHTML=h;
}
// Turn the Cost-Smart per-hour target into a coverage matrix the scheduler understands.
// Matrix blocks carry an n[] array indexed Mon=0..Sun=6; our aggregates are keyed by JS weekday (Sun=0..Sat=6), so map i -> (i+1)%7.
// Forecast expected hourly sales/txns for a specific upcoming week.
// Blend: last-year same-week SHAPE x this-year-vs-last-year LEVEL x last-week DIRECTION. Falls back to recent same-weekday average when last-year data is thin; drops freak days.
window.csForecast=async function(weekStartISO){
  let rec=window._hourlyRec;
  if(!rec){ const r=await sb.from('day_items').select('on_date,detail').eq('kind','hourly'); rec={}; (r.data||[]).forEach(x=>{ let d; try{ d=typeof x.detail==='string'?JSON.parse(x.detail||'{}'):(x.detail||{}); }catch(e){ return; } const bh=d.byHour||{}; let tot=+d.total||0; if(!tot){ for(const k in bh) tot+=(+bh[k]||0); } rec[x.on_date]={bh, bt:d.byHourTxns||{}, tot}; }); window._hourlyRec=rec; }
  const dates=Object.keys(rec); if(!dates.length) return null;
  const MS=864e5; const D=iso=>new Date(iso+'T12:00:00');
  const sumTot=(aMs,bMs)=>{ let s=0; for(const k in rec){ const t=D(k).getTime(); if(t>=aMs&&t<=bMs) s+=rec[k].tot; } return s; };
  const ws=D(weekStartISO).getTime();
  const recEnd=ws-1*MS, recStart=ws-28*MS;
  const recentLevel=sumTot(recStart,recEnd);
  const lyLevel=sumTot(recStart-364*MS, recEnd-364*MS);
  let yoy=(lyLevel>0&&recentLevel>0)?recentLevel/lyLevel:1; yoy=Math.max(0.6,Math.min(1.4,yoy));
  const haveLY=lyLevel>0;
  const lw=sumTot(ws-7*MS, recEnd); const p3=sumTot(ws-28*MS, ws-8*MS)/3;
  let nudge=(p3>0&&lw>0)?lw/p3:1; nudge=Math.max(0.92,Math.min(1.08,nudge));
  const trimAvg=(dlist)=>{ if(!dlist.length) return null; const tots=dlist.map(k=>rec[k].tot).filter(x=>x>0).sort((a,b)=>a-b); const med=tots.length?tots[Math.floor(tots.length/2)]:0; const keep=dlist.filter(k=> med<=0?true:(rec[k].tot>=med*0.45&&rec[k].tot<=med*1.9)); const use=keep.length?keep:dlist; const s={},t={}; for(let H=0;H<24;H++){ let ss=0,tt=0; use.forEach(k=>{ ss+=(+rec[k].bh[H]||0); tt+=(+rec[k].bt[H]||0); }); s[H]=ss/use.length; t[H]=tt/use.length; } return {s,t,n:use.length}; };
  const perJsw={};
  for(let i=0;i<7;i++){
    const dtMs=ws+i*MS; const jsw=new Date(dtMs).getDay(); const cLY=dtMs-364*MS;
    const shapeDates=dates.filter(k=>{ const kd=D(k); return kd.getDay()===jsw && Math.abs(kd.getTime()-cLY)<=10*MS; });
    const rc=dates.filter(k=>D(k).getDay()===jsw && D(k).getTime()<ws).sort().slice(-10); const recentBase=trimAvg(rc);
    let base=trimAvg(shapeDates), usedLY=true;
    // a thin last-year sample (often the store's earliest, sparsest data) is unreliable, so fall back to the recent same-weekday average
    if(!base || base.n<2){ if(recentBase){ base=recentBase; usedLY=false; } }
    if(!base){ perJsw[jsw]=null; continue; }
    const scale=usedLY?(yoy*nudge):nudge;
    const s={},t={}; for(let H=0;H<24;H++){ s[H]=base.s[H]*scale; t[H]=base.t[H]*scale; }
    // plausibility guard: keep any day within 0.5x to 2x of the recent same-weekday norm, so one freak day cannot throw it
    if(recentBase){ let rt=0,ft=0; for(let H=0;H<24;H++){ rt+=recentBase.s[H]||0; ft+=s[H]||0; } if(rt>0&&ft>0){ const lo=rt*0.5, hi=rt*2; let k=1; if(ft<lo)k=lo/ft; else if(ft>hi)k=hi/ft; if(k!==1){ for(let H=0;H<24;H++){ s[H]*=k; t[H]*=k; } } } }
    perJsw[jsw]={s,t,usedLY,shapeN:base.n};
  }
  return {perJsw, basis:{yoy,nudge,haveLY,recentLevel,lyLevel,weekStart:weekStartISO}};
};
// Rolling forecast accuracy: how close the saved daily forecast has been to actual sales over the last ~9 weeks.
// Reuses the SAME data the Log grades on (day_sales = forecast, day_items 'actual' = actual) so the numbers agree.
window.fcAccuracy=async function(){
  if(window._fcAcc && (Date.now()-window._fcAcc.at<300000)) return window._fcAcc.val;
  let val=null;
  try{
    const today=new Date(); const end=isoDate(today);
    const s=new Date(today); s.setDate(s.getDate()-63); const start=isoDate(s);
    const [rf,ra]=await Promise.all([
      sb.from('day_sales').select('on_date,sales').gte('on_date',start).lte('on_date',end),
      sb.from('day_items').select('on_date,detail').eq('kind','hourly').gte('on_date',start).lte('on_date',end)
    ]);
    const F={}; (rf.data||[]).forEach(d=>{ const v=Number(d.sales)||0; if(v>0) F[d.on_date]=v; });
    // actual = the real POS sales that day (sum of the hourly feed)
    const A={}; (ra.data||[]).forEach(x=>{ try{ const d=typeof x.detail==='string'?JSON.parse(x.detail||'{}'):(x.detail||{}); let tot=+d.total||0; if(!tot){ const bh=d.byHour||{}; for(const k in bh) tot+=(+bh[k]||0); } if(tot>0) A[x.on_date]=tot; }catch(e){} });
    const errs=[]; let within=0;
    Object.keys(A).forEach(iso=>{ if(F[iso]){ const e=Math.abs(A[iso]-F[iso])/F[iso]; errs.push(e); if(e<=0.10) within++; } });
    if(errs.length>=3){ const mape=errs.reduce((a,b)=>a+b,0)/errs.length; val={mape:Math.round(mape*100), n:errs.length, within:Math.round(within/errs.length*100)}; }
  }catch(e){}
  window._fcAcc={at:Date.now(), val}; return val;
};
// Info-dot popover: teaches the method in a few words and sets the goal (close enough for an ~80% first draft, not perfect).
window.fcGoalInfo=async function(){
  let acc=null; try{ acc=await fcAccuracy(); }catch(e){}
  const accLine = acc ? `<div style="margin-top:12px;padding:10px 12px;background:var(--brand-soft);border-radius:9px;font-size:12.5px;color:var(--ink)">Lately your forecast has landed within about <b>${acc.mape}%</b> of actual (last ${acc.n} days with sales)${acc.within>=50?`, inside 10% on <b>${acc.within}%</b> of them`:''}.</div>` : '';
  const html=`<div style="font-size:13.5px;line-height:1.65;color:var(--ink)"><div style="font-weight:800;font-size:15px;margin-bottom:8px">How the forecast works</div>We blend three things: last year's pattern for this same week, how you are running this year versus last (your last 4 weeks), and last week's trend.<div style="margin-top:10px">It will not nail every day. Big surprises happen, like a sudden 40% day, and that is fine. The goal is to get close, close enough that your first draft schedule is about <b>80%</b> right and you adjust from there.</div><div style="margin-top:10px">Type your own number on any day to override. Yours always wins.</div>${accLine}</div>`;
  const wrap=document.createElement('div'); wrap.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  wrap.onclick=function(e){ if(e.target===wrap) wrap.remove(); };
  const box=document.createElement('div'); box.className='card'; box.style.cssText='max-width:420px;width:100%;padding:20px 22px';
  box.innerHTML=html+`<div style="text-align:right;margin-top:16px"><button class="btn" style="width:auto">Got it</button></div>`;
  wrap.appendChild(box); document.body.appendChild(wrap);
  box.querySelector('button').onclick=function(){ wrap.remove(); };
};
window.csTargetMatrix=async function(weekStartISO){
  if(!weekStartISO){ const _d=weekStart(new Date()); _d.setDate(_d.getDate()+7); weekStartISO=isoDate(_d); }
  const [rs,rp,rc]=await Promise.all([
    sb.from('day_items').select('on_date,detail').eq('kind','hourly'),
    sb.from('day_items').select('on_date,detail').eq('kind','punch'),
    sb.from('day_items').select('*').eq('kind','csconfig').limit(1)
  ]);
  let cfg={}; try{ if(rc.data&&rc.data[0]) cfg=JSON.parse(rc.data[0].detail||'{}'); }catch(e){}
  const parseHM=s=>{ if(!s||String(s).length<16) return null; const h=+String(s).slice(11,13), m=+String(s).slice(14,16); if(isNaN(h)||isNaN(m))return null; return h*60+m; };
  const toLoc=s=>{ const m=parseHM(s); return m==null?null:((((m-420)%1440)+1440)%1440); }; // punches are UTC; restaurant runs America/Phoenix = UTC-7
  const fc=await csForecast(weekStartISO); if(!fc) return null;
  const sAgg={}, sDays={}, tAgg={}, tDays={}, lAgg={}, lDays={};
  (rs.data||[]).forEach(row=>{ let d; try{d=JSON.parse(row.detail||'{}')}catch(e){return;} const dw=new Date(row.on_date+'T12:00:00').getDay(); (sDays[dw]=sDays[dw]||new Set()).add(row.on_date); const A=(sAgg[dw]=sAgg[dw]||{}); const bh=d.byHour||{}; for(const hh in bh){ A[+hh]=(A[+hh]||0)+(+bh[hh]||0); } if(d.byHourTxns){ (tDays[dw]=tDays[dw]||new Set()).add(row.on_date); const T=(tAgg[dw]=tAgg[dw]||{}); for(const hh in d.byHourTxns){ T[+hh]=(T[+hh]||0)+(+d.byHourTxns[hh]||0); } } });
  (rp.data||[]).forEach(row=>{ let d; try{d=JSON.parse(row.detail||'{}')}catch(e){return;} const dw=new Date(row.on_date+'T12:00:00').getDay(); const A=(lAgg[dw]=lAgg[dw]||{}); let any2=false; (d.sessions||[]).forEach(s=>{ const a=toLoc(s.in),b=toLoc(s.out); if(a==null||b==null)return; let bb=b; if(bb<a)bb+=1440; for(let H=0;H<24;H++){ const hs=H*60,he=hs+60; const ov=Math.max(0,Math.min(bb,he)-Math.max(a,hs)); if(ov>0){A[H]=(A[H]||0)+ov/60; any2=true;} } }); if(any2)(lDays[dw]=lDays[dw]||new Set()).add(row.on_date); });
  const avgWage=+cfg.avgWage||15, minCov=+cfg.minCov||2, minClose=+cfg.minClose||3;
  const mode=['pct','tplh'].includes(cfg.mode)?cfg.mode:'splh', pctTarget=+cfg.pctTarget||25, splhTarget=+cfg.splhTarget||40, tplhTarget=+cfg.tplhTarget||6;
  const perDow={}; let any=false;
  for(let jsw=0; jsw<7; jsw++){
    const f=fc.perJsw[jsw]; if(!f) continue; const ld=lDays[jsw]?lDays[jsw].size:0;
    const avgS={}, avgT={}, avgL={}, openH=[];
    for(let H=0;H<24;H++){ const s=f.s[H]||0; avgS[H]=s; if(s>2) openH.push(H); avgT[H]=f.t[H]||0; avgL[H]=ld?((lAgg[jsw]||{})[H]||0)/ld:0; }
    if(!openH.length) continue;
    const needMetric=(s,t)=> mode==='pct'?Math.round((pctTarget/100*s)/avgWage) : mode==='tplh'?Math.round((t||0)/tplhTarget) : Math.round(s/splhTarget);
    const floorFor=H=> (H>=openH[openH.length-2])?Math.max(minCov,minClose):minCov;
    const HARDCAP=8; // never build more than you've actually staffed that hour — this tool only trims, it doesn't inflate peaks off raw sales math
    const D={}; openH.forEach(H=>{ const cap= ld? Math.max(1,Math.round(avgL[H])) : HARDCAP; let n=Math.min(needMetric(avgS[H],avgT[H]), cap, HARDCAP); n=Math.max(n, floorFor(H)); D[H]=n; any=true; }); perDow[jsw]=D;
  }
  if(!any) return null;
  const p2=x=>String(x).padStart(2,'0');
  const blocks=[];
  for(let H=0;H<24;H++){ const n=[]; let has=false; for(let i=0;i<7;i++){ const jsw=(i+1)%7; const v=(perDow[jsw]&&perDow[jsw][H])||0; n.push(v); if(v>0)has=true; } if(has){ const eh=H+1; blocks.push({s:p2(H)+':00', e:(eh>=24?'23:59':p2(eh)+':00'), n}); } }
  return blocks.length?{blocks, basis:fc.basis}:null;
};
window.csBuildSchedule=async function(){
  const btn=document.querySelector('[onclick="csBuildSchedule()"]');
  if(btn){ btn._html=btn.innerHTML; btn.innerHTML='<i class="ti ti-loader"></i> Building your preview…'; btn.style.opacity='.7'; btn.style.pointerEvents='none'; }
  const _sel=document.getElementById('csBuildWkSel'); const wk=(_sel&&_sel.value)||state.ctx.csBuildWk||(function(){ const d=weekStart(new Date()); d.setDate(d.getDate()+7); return isoDate(d); })();
  state.ctx.csBuildWk=wk;
  const m=await csTargetMatrix(wk);
  if(!m){ alert('Cost-Smart needs your Toast sales history before it can build a schedule to target.'); if(btn){ btn.innerHTML=btn._html; btn.style.opacity=''; btn.style.pointerEvents=''; } return; }
  window._csFcBasis=m.basis||null;
  // preview:true builds the proposal WITHOUT touching your real schedule, then shows the comparison
  if(typeof autoDraft==='function'){ await autoDraft({matrix:m, week:wk, preview:true, source:'costsmart'}); }
};
window.csRenderPreview=function(){
  const p=window._csPreview; const v=document.getElementById('view'); if(!p||!v){ return; }
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dl=iso=>{ const d=new Date(iso+'T00:00'); return MON[d.getMonth()]+' '+d.getDate(); };
  const wkLab=dl(p.isoDays[0])+' &ndash; '+dl(p.isoDays[6]);
  const M$=n=>'$'+Math.round(n||0).toLocaleString();
  const saveCost=(p.cur.cost||0)-(p.prop.cost||0); const savePts=(p.cur.pct!=null&&p.prop.pct!=null)?(p.cur.pct-p.prop.pct):null;
  const clk=t=>{ if(!t)return''; let hh=+String(t).slice(0,2); const mm=String(t).slice(3,5); const ap=hh<12?'a':'p'; let h12=hh%12; if(h12===0)h12=12; return h12+(mm==='00'?'':':'+mm)+ap; };
  let h=`<div style="background:linear-gradient(135deg,var(--tealmid),var(--tealdark));color:#fff;border-radius:16px;padding:18px 20px;margin-bottom:16px"><div style="font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:6px">&#10022; Cost-Smart proposal</div><div style="font-size:24px;font-weight:800">Week of ${wkLab}</div><div style="font-size:13.5px;opacity:.9;margin-top:4px">Nothing has changed yet. Look it over, then apply it or throw it away.</div></div>`;
  const fb=window._csFcBasis; if(fb){ const yoyPct=Math.round((fb.yoy-1)*100); const ndgPct=Math.round((fb.nudge-1)*100); const parts=[fb.haveLY?"last year's shape for this week":'your recent same-day history']; if(fb.haveLY) parts.push('scaled to this year ('+(yoyPct>=0?'+':'')+yoyPct+'% vs last year)'); parts.push(Math.abs(ndgPct)<1?'last week held steady':('nudged '+(ndgPct>0?'up':'down')+' '+Math.abs(ndgPct)+'% for last week')); h+='<div class="card" style="padding:12px 15px;margin-bottom:14px;border-left:4px solid var(--tealmid)"><div style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--tealdark);margin-bottom:5px">Built to your forecast</div><div style="font-size:13px;color:var(--ink);line-height:1.55">'+parts.join(' &middot; ')+'.</div></div>'; }
  const col=(lbl,o,accent)=>`<div style="flex:1;padding:14px 16px${accent?';background:var(--brand-soft)':''}"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:${accent?'var(--brand)':'var(--faint)'};margin-bottom:8px">${lbl}</div><div style="font-size:22px;font-weight:800;color:var(--ink)">${o.hrs?o.hrs.toFixed(1):'0'}h</div><div style="font-size:13px;color:var(--muted);margin-top:2px">${o.cost?M$(o.cost):'&mdash;'}${o.pct!=null?' &middot; '+o.pct.toFixed(1)+'% of sales':''}</div></div>`;
  h+=`<div class="card" style="padding:0;overflow:hidden;margin-bottom:14px"><div class="row" style="align-items:stretch;gap:0">${col('Your schedule now',p.cur,false)}<div style="width:1px;background:var(--line)"></div>${col('Cost-Smart proposal',p.prop,true)}</div></div>`;
  const dHrs=(p.cur.hrs||0)-(p.prop.hrs||0);
  if(dHrs>0.5){ h+=`<div class="card" style="padding:13px 16px;margin-bottom:14px"><div style="font-size:15px;color:var(--ink)">The proposal runs <b>${dHrs.toFixed(1)} fewer labor-hours</b> this week than your current schedule &mdash; the day-by-day cuts are shown below.</div></div>`; }
  else if(p.cur.n){ h+=`<div class="card" style="padding:13px 16px;margin-bottom:14px"><div style="font-size:14px;color:var(--tealdark)"><i class="ti ti-circle-check"></i> This proposal isn't leaner than your current week &mdash; you're already running tight.</div></div>`; }
  if(p.flags&&p.flags.length){ h+=`<div class="card" style="padding:14px 16px;margin-bottom:14px"><div style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-bottom:8px">A look at the proposal</div>`+p.flags.map(f=>`<div style="font-size:13px;color:var(--ink);white-space:pre-line;line-height:1.6;padding:2px 0">${esc(f)}</div>`).join('')+`</div>`; }
  h+=`<div class="sec" style="margin-bottom:8px">The proposed week <span class="faint" style="font-weight:400;font-size:11.5px">&mdash; same grid as your schedule; "was" shows what changed</span></div>`;
  const todayIso=isoDate(new Date());
  const names=[...new Set(p.draft.filter(d=>d.person_name!=='__OPEN__').map(d=>d.person_name))];
  const roster={}; names.forEach(n=>{ const r=posOf(n); (roster[r]=roster[r]||[]).push(n); });
  const POS_ORDER=['OJR','Owner','GM','Manager','Supervisor','Trainer','Trainee','Team Member','Unassigned']; const POS_COL={OJR:'#DC2626',Owner:'#7C3AED',Manager:'#2563EB',Supervisor:'#0D9488',Trainer:'#0891B2',Trainee:'#D97706','Team Member':'#64748B',Unassigned:'#94A3B8'};
  const byPD={}; p.draft.forEach(s=>{ (byPD[s.person_name+'|'+s.on_date]=byPD[s.person_name+'|'+s.on_date]||[]).push(s); });
  h+=`<div class="board"><div class="board-grid"><div class="bh bh-team">Team</div>`+p.isoDays.map(iso=>{ const dt=new Date(iso+'T00:00'); return `<div class="bh ${iso===todayIso?'bh-today':''}">${DN[dt.getDay()]}<span>${dt.getDate()}</span></div>`; }).join('');
  Object.keys(roster).sort((a,b)=>{const ia=POS_ORDER.indexOf(a),ib=POS_ORDER.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b);}).forEach(role=>{
    const bc=POS_COL[role]||'#94A3B8';
    h+=`<div class="band" style="background:${bc}14;color:${bc};border-left:4px solid ${bc}">${esc(role)}</div>`;
    roster[role].forEach(n=>{ let wHrs=0; const cells=p.isoDays.map(iso=>{ const list=(byPD[n+'|'+iso]||[]).slice().sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||'')); let c=''; list.forEach(s=>{ wHrs+=shiftHours(s); c+=`<div class="scard">${clk(s.start_time)}&ndash;${clk(s.end_time)}</div>`; }); return `<div class="daycell${iso===todayIso?' today':''}">${c}</div>`; }).join(''); const inits=(n||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); h+=`<div class="pcell"><span class="av">${esc(inits)}</span><span style="min-width:0"><span class="nm">${esc(n)}</span><span class="mt">${wHrs.toFixed(1)} h</span></span></div>${cells}`; });
  });
  h+=`<div class="bt bt-team" style="font-weight:600">On the floor</div>`+p.isoDays.map((iso,i)=>{ const pp=new Set(p.draft.filter(s=>s.on_date===iso&&s.person_name!=='__OPEN__').map(s=>s.person_name)).size; const cp=p.curByDay?p.curByDay[i].ppl:null; return `<div class="bt" style="font-weight:600">${pp||'—'}${(cp!=null&&cp!==pp)?`<div style="font-size:10px;font-weight:700;color:${pp<cp?'var(--tealdark)':'var(--muted)'}">was ${cp}</div>`:''}</div>`; }).join('');
  h+=`<div class="bt bt-team">Hours</div>`+p.isoDays.map((iso,i)=>{ const ph=p.draft.filter(s=>s.on_date===iso).reduce((a,s)=>a+shiftHours(s),0); const ch=p.curByDay?p.curByDay[i].hrs:null; return `<div class="bt">${ph?ph.toFixed(1)+'h':'—'}${(ch!=null&&Math.abs(ch-ph)>0.4)?`<div style="font-size:10px;font-weight:700;color:${ph<ch?'var(--tealdark)':'var(--muted)'}">was ${ch.toFixed(1)}h</div>`:''}</div>`; }).join('')+`</div></div>`;
  h+=`<div class="row" style="gap:10px;flex-wrap:wrap;margin-bottom:22px"><button class="btn pri" style="width:auto;padding:12px 22px" onclick="csApplyPreview()"><i class="ti ti-check"></i> Apply to the week of ${dl(p.isoDays[0])}</button><button class="btn" style="width:auto;padding:12px 18px" onclick="csDiscardPreview()">Discard</button></div>`;
  v.innerHTML=h; window.scrollTo(0,0);
};
window.csApplyPreview=async function(){ const p=window._csPreview; if(!p)return; const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const dl=iso=>{ const d=new Date(iso+'T00:00'); return MON[d.getMonth()]+' '+d.getDate(); }; if(!confirm('Apply this schedule to the week of '+dl(p.isoDays[0])+' – '+dl(p.isoDays[6])+'?'+(p.cur.n?'\n\nThis replaces the '+p.cur.n+' shifts you have that week.':''))) return;
  /* Replacing a week means clearing what is there before inserting the new plan. If the
     insert fails after the delete has already landed, the week is wiped and there is no
     way back -- a manager would lose a whole week of shifts. So: snapshot first, and put
     the old shifts back if anything goes wrong. */
  const _snap = await sb.from('shifts').select('*').gte('on_date',p.isoDays[0]).lte('on_date',p.isoDays[6]);
  if(_snap.error){ alert('Could not read the current schedule, so nothing was changed.\n\n'+_snap.error.message); return; }
  const _prior = _snap.data || [];
  const _del = await sb.from('shifts').delete().gte('on_date',p.isoDays[0]).lte('on_date',p.isoDays[6]);
  if(_del.error){ alert('Could not clear that week, so nothing was changed.\n\n'+_del.error.message); return; }
  if(p.draft.length){
    const _ins = await sb.from('shifts').insert(p.draft);
    if(_ins.error){
      let _restored = false;
      if(_prior.length){ const _rb = await sb.from('shifts').insert(_prior); _restored = !_rb.error; }
      alert('The new schedule could not be saved.\n\n'+_ins.error.message+'\n\n'+(
        !_prior.length ? 'That week was already empty, so nothing was lost.'
        : _restored ? 'Your previous schedule for that week has been put back.'
        : 'IMPORTANT: the previous schedule could not be restored either. Check that week before anyone works it.'));
      return;
    }
  }
  state.ctx.wk=p.week; state.ctx.stab='schedule'; window._csPreview=null; go('schedule'); };
window.csDiscardPreview=function(){ window._csPreview=null; go('costsmart'); };
// Opportunities math — SAME target + scan as the Cost-Smart page, so the report always agrees with the screen
window.csOpportunities=async function(){
  const [rs,rp,rc,rbet]=await Promise.all([
    sb.from('day_items').select('on_date,detail').eq('kind','hourly'),
    sb.from('day_items').select('on_date,detail').eq('kind','punch'),
    sb.from('day_items').select('*').eq('kind','csconfig').limit(1),
    sb.from('day_items').select('detail').eq('kind','laborbet')
  ]);
  let cfg={}; try{ if(rc.data&&rc.data[0]) cfg=JSON.parse(rc.data[0].detail||'{}'); }catch(e){}
  const _bets=(rbet.data||[]).map(r=>{try{const d=JSON.parse(r.detail||'{}');const _hh=t=>t?(+t.slice(0,2))+(+t.slice(3,5))/60:0;return {days:d.days||[],sh:_hh(d.start),eh:_hh(d.end)};}catch(e){return null;}}).filter(Boolean);
  const isProt=(dw,H)=>_bets.some(b=>b.days.indexOf(dw)>=0 && b.eh>b.sh && H>=Math.floor(b.sh) && H<Math.ceil(b.eh)); // labor you declared a growth bet — don't flag it as waste
  const parseHM=s=>{ if(!s||String(s).length<16) return null; const h=+String(s).slice(11,13), m=+String(s).slice(14,16); if(isNaN(h)||isNaN(m))return null; return h*60+m; };
  const toLoc=s=>{ const m=parseHM(s); return m==null?null:((((m-420)%1440)+1440)%1440); };
  const sAgg={},sDays={},tAgg={},tDays={},lAgg={},lDays={};
  (rs.data||[]).forEach(row=>{ let d; try{d=JSON.parse(row.detail||'{}')}catch(e){return;} const dw=new Date(row.on_date+'T12:00:00').getDay(); (sDays[dw]=sDays[dw]||new Set()).add(row.on_date); const A=(sAgg[dw]=sAgg[dw]||{}); const bh=d.byHour||{}; for(const hh in bh){A[+hh]=(A[+hh]||0)+(+bh[hh]||0);} if(d.byHourTxns){(tDays[dw]=tDays[dw]||new Set()).add(row.on_date); const T=(tAgg[dw]=tAgg[dw]||{}); for(const hh in d.byHourTxns){T[+hh]=(T[+hh]||0)+(+d.byHourTxns[hh]||0);}} });
  (rp.data||[]).forEach(row=>{ let d; try{d=JSON.parse(row.detail||'{}')}catch(e){return;} const dw=new Date(row.on_date+'T12:00:00').getDay(); const A=(lAgg[dw]=lAgg[dw]||{}); let any=false; (d.sessions||[]).forEach(s=>{ const a=toLoc(s.in),b=toLoc(s.out); if(a==null||b==null)return; let bb=b; if(bb<a)bb+=1440; for(let H=0;H<24;H++){ const hs=H*60,he=hs+60; const ov=Math.max(0,Math.min(bb,he)-Math.max(a,hs)); if(ov>0){A[H]=(A[H]||0)+ov/60; any=true;} } }); if(any)(lDays[dw]=lDays[dw]||new Set()).add(row.on_date); });
  const avgWage=+cfg.avgWage||15, minCov=+cfg.minCov||2, minClose=+cfg.minClose||3;
  const mode=['pct','tplh'].includes(cfg.mode)?cfg.mode:'splh', pctTarget=+cfg.pctTarget||25, splhTarget=+cfg.splhTarget||40, tplhTarget=+cfg.tplhTarget||6;
  const needMetric=(s,t)=> mode==='pct'?Math.round((pctTarget/100*s)/avgWage) : mode==='tplh'?Math.round((t||0)/tplhTarget) : Math.round(s/splhTarget);
  const dowShort={0:'Sun',1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat'};
  const hourLbl=H=>{ const ap=H<12?'a':'p'; let h12=H%12; if(h12===0)h12=12; return h12+ap; };
  const hrRange=(a,b)=>hourLbl(a)+'–'+hourLbl(b+1);
  let wkSales=0, wkLabor=0, wkCutHrs=0; const fixes=[]; let hasLabor=false;
  [0,1,2,3,4,5,6].forEach(dw=>{ const sdw=sDays[dw]?sDays[dw].size:0, ldw=lDays[dw]?lDays[dw].size:0, tdw=tDays[dw]?tDays[dw].size:0; if(!sdw)return; if(ldw)hasLabor=true; const oh=[]; for(let H=0;H<24;H++){ if(((sAgg[dw]||{})[H]||0)/sdw>2) oh.push(H); } const floorFor=H=>(oh.length&&H>=oh[oh.length-2])?Math.max(minCov,minClose):minCov; let cur=null; oh.forEach(H=>{ const s=((sAgg[dw]||{})[H]||0)/sdw; const l=ldw?((lAgg[dw]||{})[H]||0)/ldw:0; const t=tdw?((tAgg[dw]||{})[H]||0)/tdw:0; wkSales+=s; wkLabor+=l; const need=Math.max(needMetric(s,t),floorFor(H)); const over=l-need; if(ldw&&over>=0.5&&!isProt(dw,H)){ wkCutHrs+=over; if(cur&&cur.endH===H-1){cur.endH=H;cur.overSum+=over;cur.sales+=s;} else {cur={dw,startH:H,endH:H,overSum:over,sales:s};fixes.push(cur);} } else cur=null; }); });
  fixes.forEach(f=>f.saveWk=f.overSum*avgWage); fixes.sort((a,b)=>b.saveWk-a.saveWk);
  const wkLaborCost=wkLabor*avgWage, wkPct=wkSales>0?wkLaborCost/wkSales*100:0, wkSPLH=wkLabor>0?wkSales/wkLabor:0;
  const tgtLabel=mode==='pct'?pctTarget+'% labor':mode==='tplh'?tplhTarget+' transactions per labor hour':'$'+splhTarget+' sales per labor hour';
  return { snapshot:{sales:wkSales,hrs:wkLabor,cost:wkLaborCost,pct:wkPct,splh:wkSPLH}, fixes, totalSaveWk:wkCutHrs*avgWage, tgtLabel, hasLabor, dowShort, hrRange };
};
window.csReport=async function(){
  const v=document.getElementById('view'); if(!v)return; v.innerHTML='<div class="muted">Building your report…</div>';
  const o=await csOpportunities();
  const M$=n=>'$'+Math.round(n||0).toLocaleString();
  const today=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const rest=(state.settings&&state.settings.name)||'Your restaurant';
  const top=o.fixes.filter(f=>f.overSum>=1).slice(0,10);
  let h=`<style>@media print{ body *{visibility:hidden!important;} #csRep,#csRep *{visibility:visible!important;} #csRep{position:absolute;left:0;top:0;width:100%;padding:0 8px;} .noprint{display:none!important;} }</style>`;
  h+=`<div class="row noprint" style="gap:10px;margin-bottom:14px"><button class="btn pri" style="width:auto;padding:10px 18px" onclick="window.print()"><i class="ti ti-printer"></i> Print / Save as PDF</button><button class="btn" style="width:auto;padding:10px 16px" onclick="go('costsmart')">Back</button></div>`;
  h+=`<div id="csRep">`;
  h+=`<div style="border-bottom:3px solid var(--tealdark);padding-bottom:12px;margin-bottom:16px"><div style="font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--brand)">Labor Opportunities</div><div style="font-size:26px;font-weight:800;color:var(--ink);margin-top:2px">${esc(rest)}</div><div style="font-size:13px;color:var(--muted);margin-top:3px">${today} &middot; aiming for ${o.tgtLabel}</div></div>`;
  h+=`<div style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-bottom:8px">Where we are &mdash; an average week</div><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:10px;margin-bottom:20px">`;
  const tile=(l,val)=>`<div style="border:1px solid var(--line);border-radius:10px;padding:11px 13px"><div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);font-weight:800;margin-bottom:5px">${l}</div><div style="font-size:19px;font-weight:800;color:var(--ink)">${val}</div></div>`;
  h+=tile('Sales',M$(o.snapshot.sales))+tile('Labor hours',o.snapshot.hrs.toFixed(0)+'h')+tile('Labor cost',M$(o.snapshot.cost))+tile('Labor % of sales',o.snapshot.pct.toFixed(0)+'%')+tile('Sales / labor hr','$'+Math.round(o.snapshot.splh))+`</div>`;
  h+=`<div style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--brand);margin-bottom:10px">Where we can tighten &mdash; start at the top</div>`;
  if(!o.hasLabor){ h+=`<div class="faint" style="font-size:13px">Labor history is still loading &mdash; opportunities show once it’s in.</div>`; }
  else if(!top.length){ h+=`<div style="font-size:14px;color:var(--tealdark)"><i class="ti ti-circle-check"></i> Nothing sticking out &mdash; we’re at or under target all week. Nice work.</div>`; }
  else { h+=top.map((f,i)=>`<div style="display:flex;gap:13px;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--line)"><div style="width:28px;height:28px;border-radius:50%;background:var(--accent-soft);color:var(--accent-ink);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0">${i+1}</div><div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:700;color:var(--ink)">${o.dowShort[f.dw]} ${o.hrRange(f.startH,f.endH)}</div><div style="font-size:13.5px;color:var(--muted);margin-top:2px">About ${f.overSum.toFixed(1)} more labor-hours than the ${M$(f.sales)} of sales needs &mdash; room to trim a shift or send someone a little early.</div></div><div style="text-align:right;flex-shrink:0"><div style="font-size:16px;font-weight:800;color:var(--accent-ink)">${M$(f.saveWk)}</div><div style="font-size:11px;color:var(--faint);font-weight:700">per week</div></div></div>`).join(''); }
  if(o.hasLabor && top.length){ h+=`<div style="margin-top:16px;padding:14px 16px;border:2px solid var(--accent-line);border-radius:12px;background:var(--accent-soft)"><div style="font-size:15px;color:var(--ink)">Working through all of these is about <b style="color:var(--accent-ink)">${M$(o.totalSaveWk)} a week</b> in labor. We don’t do it all at once &mdash; pick the top one, trim gently, watch a week, then take the next.</div></div>`; }
  h+=`<div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--line)"><div style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-bottom:8px">How we’ll work this together</div><div style="font-size:13.5px;color:var(--ink);line-height:1.7">Start with #1. Trim one shift or shorten it &mdash; don’t cut it all at once. Watch the next week: did service hold? If yes, take the next one. Protect the rush and the guest experience above the number. And remember &mdash; not every extra person is waste. Some labor is a bet on growth; cut the waste and protect the bets on purpose. This is about growing into it as a team, not slashing.</div></div>`;
  h+=`<div style="margin-top:18px;font-size:11px;color:var(--faint)">Generated by Cost-Smart &middot; ${today} &middot; Based on your real sales and clock-in history.</div></div>`;
  v.innerHTML=h; window.scrollTo(0,0);
};
window.csLearnLabor=function(){
  const v=document.getElementById('view'); if(!v)return;
  const p=t=>`<p style="font-size:15.5px;line-height:1.72;color:var(--ink);margin:0 0 15px">${t}</p>`;
  const hd=t=>`<div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--brand);margin:22px 0 10px">${t}</div>`;
  let h=`<div class="row" style="gap:10px;margin-bottom:14px"><button class="btn" style="width:auto;padding:9px 16px" onclick="go('costsmart')"><i class="ti ti-arrow-left"></i> Back to Cost-Smart</button></div><div style="max-width:720px">`;
  h+=`<div style="background:linear-gradient(135deg,var(--tealmid),var(--tealdark));color:#fff;border-radius:16px;padding:20px 22px;margin-bottom:18px"><div style="font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin-bottom:6px">A short teaching</div><div style="font-size:26px;font-weight:800">The two sides of labor</div><div style="font-size:14px;opacity:.9;margin-top:5px">Why the leanest schedule isn't always the best one.</div></div>`;
  h+=p(`Most people look at labor one way: as a cost to cut. Trim it down, get the number low, feel good. That's half the picture &mdash; and it's the half that gets a lot of good restaurants in trouble.`);
  h+=p(`I look at labor as two different things.`);
  h+=hd('1. The labor you need to run the business');
  h+=p(`This is your schedule &mdash; the people it takes to open, serve, and close well on the sales you have today. This is the side Cost-Smart helps you with. When you're carrying more people than the sales need, that's real waste, and trimming it is money back in your pocket. Get this side tight.`);
  h+=hd('2. The labor you invest to grow');
  h+=p(`This one almost nobody talks about. Sometimes you put an extra person on <b>not</b> because the sales are there today, but because you're trying to grow &mdash; a slow daypart you want to build, or a peak you've been stuck at. On a spreadsheet it looks like waste. It isn't. It's a bet.`);
  h+=p(`Years ago at Chick-fil-A, my 2 to 4 in the afternoon was dead. So I started putting extra people outside on the drive-thru &mdash; not because the volume needed them, but so every car that drove by <b>saw</b> people out there, ready to serve. My team hated it. &ldquo;We don't need these people.&rdquo; The first month and a half was rough, and yes, I was spending labor I wasn't getting back yet.`);
  h+=p(`I kept with it. Month two it started to move. Month three it was growing. By the end of the year that slow afternoon was my <b>fastest-growing</b> part of the day &mdash; not the biggest, but growing faster than anything else &mdash; and it more than paid back every hour of labor I'd put in. That's not a labor cost. That's marketing. It's staffing for the sales you <b>want</b>, not the sales you have.`);
  h+=hd('What this means for Cost-Smart');
  h+=p(`Cost-Smart is very good at side one. It reads your real numbers and shows you where you're carrying more than the sales need. Use it. Trim the true waste &mdash; the hour you're overstaffed for no reason.`);
  h+=p(`But Cost-Smart only sees the cost. It can't see your strategy. It doesn't know the extra person you put on Tuesday afternoon is a bet you're making on purpose. So when it flags an hour, ask one question: <b>is this waste, or is this a bet?</b> Cut the waste. Protect the bets.`);
  h+=hd('Give it three months');
  h+=p(`Here's the part most people get wrong: they try something for a few weeks, don't see a return, and call it dead. A real strategy needs time. Plan to stick with it for <b>three months</b>. You're not going to learn anything in 30 days &mdash; it just takes time to build.`);
  h+=p(`On the front end it'll look like you're spending money for nothing. That's normal &mdash; same as any marketing, you spend before the return shows up. If you believe in the goal and the strategy, you make it up on the back end. Set the window before you start, and don't judge it early.`);
  h+=hd(`And don't cut too tight`);
  h+=p(`If you're wired like me, you'll want to cut every last thing until the tool says you've got it. Be careful there. Cut too tight and you lose the room to serve well, to grow, to breathe when it gets busy. The best operators I know pull both levers: they cut cost <b>and</b> they invest in growth. One without the other is how you end up efficient and shrinking at the same time.`);
  h+=p(`Run the numbers. Then run the business. That second part is on you &mdash; and it's the fun part.`);
  h+=`<div style="margin-top:8px;padding:14px 16px;border-radius:12px;background:var(--brand-soft);border:1px solid var(--brand-line)"><div style="font-size:13.5px;color:var(--ink);line-height:1.6"><b>Coming soon:</b> a video walkthrough of this, plus a way to mark certain labor as a growth investment so Cost-Smart leaves it alone. For now &mdash; cut the waste, protect the bets.</div></div>`;
  h+=`<div style="margin-top:14px"><button class="btn pri" style="width:auto;padding:10px 18px" onclick="csInvest()"><i class="ti ti-seeding"></i> Plan a labor investment</button></div>`;
  h+=`<div style="margin-top:16px;font-size:14px;color:var(--muted)">&mdash; Jason</div></div>`;
  v.innerHTML=h; window.scrollTo(0,0);
};
window.csInvest=async function(){
  const v=document.getElementById('view'); if(!v)return; v.innerHTML='<div class="muted">Loading…</div>';
  const [rs,rc,rb]=await Promise.all([
    sb.from('day_items').select('detail').eq('kind','hourly'),
    sb.from('day_items').select('*').eq('kind','csconfig').limit(1),
    sb.from('day_items').select('*').eq('kind','laborbet').order('created_at',{ascending:false})
  ]);
  let cfg={}; try{ if(rc.data&&rc.data[0]) cfg=JSON.parse(rc.data[0].detail||'{}'); }catch(e){}
  const wage=+cfg.avgWage||15;
  let totS=0,totT=0; (rs.data||[]).forEach(r=>{ try{const d=JSON.parse(r.detail||'{}'); totS+=+d.total||0; totT+=+d.txns||0;}catch(e){} });
  const avgTicket=totT>0?totS/totT:0; window._csInv={avgTicket,wage};
  const M$=n=>'$'+Math.round(n||0).toLocaleString();
  const bets=(rb.data||[]).map(r=>{ let d={}; try{d=JSON.parse(r.detail||'{}')}catch(e){} return {id:r.id,d}; });
  const inp='padding:9px 11px;border:1px solid var(--line2);border-radius:9px;font-family:inherit;font-size:14px;background:var(--card);color:var(--ink);width:100%';
  let h=`<div class="row" style="gap:10px;margin-bottom:14px"><button class="btn" style="width:auto;padding:9px 16px" onclick="go('costsmart')"><i class="ti ti-arrow-left"></i> Back to Cost-Smart</button></div><div style="max-width:720px">`;
  h+=`<div style="background:linear-gradient(135deg,var(--accent-2),var(--accent));color:#3A2B00;border-radius:16px;padding:20px 22px;margin-bottom:16px"><div style="font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#6E5000;margin-bottom:6px">The other side of labor</div><div style="font-size:26px;font-weight:800">Plan a labor investment</div><div style="font-size:14px;margin-top:5px;color:#5A4600">Not cutting cost &mdash; spending it on purpose, to grow.</div></div>`;
  h+=`<div class="card" style="padding:14px 16px;margin-bottom:16px;border-left:4px solid var(--brand)"><div style="font-size:14px;line-height:1.6;color:var(--ink)"><b>Strategy is the whole game.</b> Throwing three people at a slow drive-thru isn't a plan &mdash; it's a hope. One person with a clear job beats three with none. Define the role, name the belief, give it a real window, and measure it. <span onclick="csLearnLabor()" style="color:var(--brand);font-weight:700;cursor:pointer">Read the teaching &rarr;</span></div></div>`;
  if(bets.length){ h+=`<div class="sec" style="margin-bottom:8px">Your open bets</div>`; bets.forEach(b=>{ const d=b.d; const dc=(d.days||[]).length; const cw=(+d.people||1)*(+d.hours||0)*dc*(+d.wage||wage); const clkb=t=>{ if(!t)return''; let H=+t.slice(0,2); const m=t.slice(3,5); const ap=H<12?'a':'p'; let h12=H%12||12; return h12+(m==='00'?'':':'+m)+ap; }; h+=`<div class="card" style="padding:13px 15px;margin-bottom:10px"><div class="row" style="align-items:flex-start"><div style="flex:1;min-width:0"><div style="font-weight:800;font-size:15px;color:var(--ink)">${esc(d.what||'Labor investment')}</div><div style="font-size:12.5px;color:var(--muted);margin-top:2px">${+d.people||1} person &middot; ${clkb(d.start)}&ndash;${clkb(d.end)} &middot; ${dc} day${dc!==1?'s':''}/wk &middot; ${M$(cw)}/week</div>${d.role?`<div style="font-size:13px;color:var(--ink);margin-top:5px"><b>The job:</b> ${esc(d.role)}</div>`:''}${d.belief?`<div style="font-size:13px;color:var(--ink);margin-top:3px"><b>The bet:</b> ${esc(d.belief)}</div>`:''}<div style="font-size:11.5px;color:var(--faint);margin-top:5px">Started ${d.created?new Date(d.created).toLocaleDateString():''} &middot; give it three months, check monthly</div></div><span onclick="csInvestDel('${b.id}')" style="cursor:pointer;color:var(--muted);font-size:16px;flex-shrink:0" title="Remove"><i class="ti ti-trash"></i></span></div></div>`; }); }
  h+=`<div class="card" style="padding:16px 18px;margin-bottom:14px"><div class="sec" style="margin-bottom:12px">Plan a new bet</div>`;
  h+=`<label style="font-size:12.5px;font-weight:700;color:var(--muted)">What are you trying to grow?</label><input id="ivWhat" placeholder="e.g., grow the 2&ndash;4pm daypart" style="${inp};margin:5px 0 14px"/>`;
  h+=`<div class="row" style="gap:10px;flex-wrap:wrap;margin-bottom:12px"><div style="flex:1;min-width:78px"><label style="font-size:12.5px;font-weight:700;color:var(--muted)">People</label><input id="ivPeople" type="number" min="1" value="1" oninput="csInvestCalc()" style="${inp};margin-top:5px"/></div><div style="flex:1;min-width:96px"><label style="font-size:12.5px;font-weight:700;color:var(--muted)">From</label><input id="ivStart" type="time" value="14:00" oninput="csInvestCalc()" style="${inp};margin-top:5px"/></div><div style="flex:1;min-width:96px"><label style="font-size:12.5px;font-weight:700;color:var(--muted)">To</label><input id="ivEnd" type="time" value="16:00" oninput="csInvestCalc()" style="${inp};margin-top:5px"/></div><div style="flex:1;min-width:78px"><label style="font-size:12.5px;font-weight:700;color:var(--muted)">Wage $</label><input id="ivWage" type="number" min="1" step="0.5" value="${wage}" oninput="csInvestCalc()" style="${inp};margin-top:5px"/></div></div>`;
  h+=`<label style="font-size:12.5px;font-weight:700;color:var(--muted)">On which days?</label><div class="row" style="gap:6px;margin:6px 0 12px;flex-wrap:wrap">`+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((L,i)=>`<label style="display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border:1px solid var(--line2);border-radius:8px;font-size:13px;cursor:pointer;color:var(--ink)"><input type="checkbox" class="ivDay" data-jsdow="${(i+1)%7}" ${i<5?'checked':''} onchange="csInvestCalc()" style="width:15px;height:15px"/>${L}</label>`).join('')+`</div>`;
  h+=`<div id="csInvResult" style="margin:12px 0 14px"></div>`;
  h+=`<label style="font-size:12.5px;font-weight:700;color:var(--muted)">What is this person's ONE job here?</label><input id="ivRole" placeholder="Not 'help out' — a specific role, e.g. greet + bus tables so the dining room is spotless" style="${inp};margin:5px 0 14px"/>`;
  h+=`<label style="font-size:12.5px;font-weight:700;color:var(--muted)">What do you believe will happen &mdash; and what will you watch?</label><input id="ivBelief" placeholder="e.g., more dine-in and repeat visits; I'll watch dine-in count + reviews" style="${inp};margin:5px 0 14px"/>`;
  h+=`<button class="btn pri" style="width:auto;padding:11px 20px" onclick="csInvestSave()"><i class="ti ti-device-floppy"></i> Save this bet</button></div>`;
  h+=`<div style="font-size:12.5px;color:var(--muted);line-height:1.6;margin-bottom:22px">Marketing bets don't pay on day one. Plan to stick with it <b>three months</b> &mdash; you won't learn much in 30 days, and you'll spend before the return shows up. Check monthly. If it's truly not moving by the end, change the play or stop. That's not failure; that's how you find what works.</div></div>`;
  v.innerHTML=h; setTimeout(csInvestCalc,60); window.scrollTo(0,0);
};
window.csInvestCalc=function(){
  const g=id=>{const e=document.getElementById(id);return e?+e.value:0;};
  const tv=id=>{const e=document.getElementById(id);return e?e.value:'';};
  const hh=t=>{ if(!t)return 0; return (+t.slice(0,2))+(+t.slice(3,5))/60; };
  const inv=window._csInv||{avgTicket:0,wage:15};
  const people=Math.max(1,g('ivPeople')), wage=Math.max(1,g('ivWage')||inv.wage);
  const hours=Math.max(0, hh(tv('ivEnd'))-hh(tv('ivStart')));
  const days=document.querySelectorAll('.ivDay:checked').length;
  const cd=people*hours*wage, cw=cd*days, cm=cw*4.33, c12=cw*12;
  const M$=n=>'$'+Math.round(n||0).toLocaleString();
  const guests=inv.avgTicket>0? Math.ceil(cw/inv.avgTicket) : null;
  const el=document.getElementById('csInvResult'); if(!el)return;
  el.innerHTML=`<div style="background:var(--accent-soft);border:1px solid var(--accent-line);border-radius:12px;padding:14px 16px"><div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-ink);margin-bottom:8px">What it costs</div><div class="row" style="gap:18px;flex-wrap:wrap"><div><div style="font-size:20px;font-weight:800;color:var(--ink)">${M$(cd)}</div><div style="font-size:11px;color:var(--muted)">per day</div></div><div><div style="font-size:20px;font-weight:800;color:var(--ink)">${M$(cw)}</div><div style="font-size:11px;color:var(--muted)">per week</div></div><div><div style="font-size:20px;font-weight:800;color:var(--ink)">${M$(cm)}</div><div style="font-size:11px;color:var(--muted)">per month</div></div><div><div style="font-size:20px;font-weight:800;color:var(--accent-ink)">${M$(c12)}</div><div style="font-size:11px;color:var(--muted)">a 12-week test</div></div></div>${guests?`<div style="font-size:13px;color:var(--ink);margin-top:10px;border-top:1px solid var(--accent-line);padding-top:9px">To break even it needs to add more than <b>${M$(cw)}/week</b> &mdash; about <b>${guests} more guest${guests>1?'s':''} a week</b> at your ~${M$(inv.avgTicket)} average ticket (more once you count product cost). Grow it past that and you're winning.</div>`:''}</div>`;
};
window.csInvestSave=async function(){
  const gv=id=>{const e=document.getElementById(id);return e?e.value:'';};
  const hh=t=>{ if(!t)return 0; return (+t.slice(0,2))+(+t.slice(3,5))/60; };
  const what=gv('ivWhat').trim(), role=gv('ivRole').trim(), belief=gv('ivBelief').trim();
  const people=+gv('ivPeople')||1, wage=+gv('ivWage')||15, start=gv('ivStart'), end=gv('ivEnd');
  const days=[...document.querySelectorAll('.ivDay:checked')].map(c=>+c.dataset.jsdow);
  const hours=Math.max(0, hh(end)-hh(start));
  if(!what){ alert('What are you trying to grow? Give the bet a name first.'); return; }
  if(!role){ alert("Name this person's one job first — that's the whole point. A bet with no defined role is just throwing people at it."); return; }
  if(!days.length){ alert('Pick at least one day for this bet.'); return; }
  if(hours<=0){ alert('The end time needs to be after the start time.'); return; }
  await sb.from('day_items').insert({kind:'laborbet',title:what.slice(0,80),detail:JSON.stringify({what,role,belief,people,start,end,days,hours,wage,created:new Date().toISOString()}),created_by:state.user.id});
  csInvest();
};
window.csInvestDel=async function(id){ if(!confirm('Remove this bet?'))return; await sb.from('day_items').delete().eq('id',id); csInvest(); };
window.csDay=async function(dw){ const y=window.scrollY||document.documentElement.scrollTop||0; state.ctx.csDow=dw; await vCostSmart(document.getElementById('view')); window.scrollTo(0,y); };
window.csToggleHelp=function(){ const b=document.getElementById('csHelpBody'); if(!b)return; const hide=b.style.display!=='none'; b.style.display=hide?'none':'block'; try{localStorage.setItem('cs_help_hidden',hide?'1':'0');}catch(e){} const c=document.getElementById('csHelpChev'); if(c)c.className='ti ti-chevron-'+(hide?'down':'up'); };
window.csToggleDetail=function(){ const b=document.getElementById('csDetail'); if(!b)return; const open=b.style.display==='none'; b.style.display=open?'block':'none'; try{localStorage.setItem('cs_detail_open',open?'1':'0');}catch(e){} const c=document.getElementById('csDetChev'); if(c)c.className='ti ti-chevron-'+(open?'up':'down'); };
window.csSaveTarget=async function(mode){ const g=id=>{const e=document.getElementById(id);return e?+e.value:null;}; const splhTarget=Math.max(1,g('csTarget')||40); const pctTarget=Math.min(60,Math.max(1,g('csPct')||25)); const tplhTarget=Math.max(1,g('csTplh')||6); const minCov=Math.max(1,g('csMin')||2); const minClose=Math.max(1,g('csMinClose')||3); const avgWage=Math.max(1,g('csWage')||15); const m=['pct','splh','tplh'].includes(mode)?mode:'splh'; const _rk=await window._replaceKind('csconfig',{kind:'csconfig',title:'csconfig',detail:JSON.stringify({splhTarget,pctTarget,tplhTarget,minCov,minClose,avgWage,mode:m}),created_by:state.user.id}); if(!_rk.ok){ alert(window._replaceMsg(_rk)); return; } vCostSmart(document.getElementById('view')); };
function heroTile(){ return `<svg class="phero-svg" width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none"><defs><pattern id="swtile" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M20 0 L40 20 L20 40 L0 20 Z" fill="none" stroke="#EAF7FA" stroke-width="1.1"/><circle cx="20" cy="20" r="2.2" fill="#EAF7FA"/><path d="M20 6 L20 34 M6 20 L34 20" stroke="#EAF7FA" stroke-width=".7"/></pattern></defs><rect width="400" height="200" fill="url(#swtile)" opacity=".13"/></svg><svg class="phero-heart" viewBox="0 0 24 24" width="230" height="230"><path d="M12 21s-7-4.5-9.5-8.5C.7 9.6 2 6 5.2 6c2 0 3.2 1.2 3.9 2.2C9.6 7.2 10.8 6 12.8 6 16 6 17.3 9.6 15.5 12.5 13 16.5 12 21 12 21z"/></svg>`; }
function heroBanner(eyebrow,titleHTML,sub,ctaHTML){ return `<div class="phero">${heroTile()}<div class="phero-in"><div class="phero-eyebrow">${eyebrow}</div><div class="phero-title">${titleHTML}</div>${sub?`<div class="phero-sub">${sub}</div>`:''}${ctaHTML||''}</div></div>`; }
function smartResume(){
  const vt=visibleTracks();
  const started=t=>trackLessons(t.id).some(x=>isDone(x.id));
  // 1) mid-module: the last lesson they actually opened, if unfinished
  let lv=null; try{ lv=JSON.parse(localStorage.getItem('sw_last')||'null'); }catch(e){}
  if(lv&&lv.lid){ const tt=state.tracks.find(x=>x.id===lv.tid); const ll=tt&&trackLessons(tt.id).find(x=>x.id===lv.lid); if(ll&&!isDone(ll.id)&&vt.some(x=>x.id===tt.id)) return {t:tt,l:ll,verb:'Resume'}; }
  // 2) something the owner assigned to them that isn't finished
  const uid=state.user&&state.user.id;
  const mine=(state.assignments||[]).filter(a=>a.user_id===uid).map(a=>a.track_id);
  for(const tid of mine){ const tt=vt.find(x=>x.id===tid); if(!tt) continue; for(const l of trackLessons(tid)){ if(!isDone(l.id)) return {t:tt,l,verb:started(tt)?'Continue':'Start'}; } }
  // 3) otherwise the natural next module
  for(const t of vt){ for(const l of trackLessons(t.id)){ if(!isDone(l.id)) return {t,l,verb:started(t)?'Continue':'Start'}; } }
  return null;
}
function vHome(v){
  const name=state.profile?state.profile.name:"";
  const _first=((name||'').split(/\s+/)[0]||name); setTitle(`Welcome back, ${_first.charAt(0).toUpperCase()+_first.slice(1)}`, "Your training");
  const rz=smartResume();
  const cta = rz ? `<button class="phero-cta" onclick="go('lesson',{tid:'${rz.t.id}',lid:'${rz.l.id}'})"><span class="pd">&#9654;</span> ${rz.verb} — ${esc(rz.l.title)}</button>` : '';
  let h = heroBanner('&#10022; The Academy', 'Learn it.<br>Lead it. <span class="hl">Own it.</span>', 'Everything your team needs to grow — from leading people to running every station — in one place, at their own pace.', cta);
  const _vt=visibleTracks();
  const _dev=_vt.filter(t=>(t.category||'development')!=='operations');
  const _ops=_vt.filter(t=>t.category==='operations');
  const ICON_SCHOOL='<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fff" stroke-width="1.8"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/></svg>';
  const ICON_TOOLS='<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#3A2B00" stroke-width="1.8"><path d="M14.7 6.3a4 4 0 00-5.4 5.4l-6 6 2 2 6-6a4 4 0 005.4-5.4l-2.3 2.3-2-2 2.3-2.3z"/></svg>';
  const _entry=(cat,label,desc,list,tone)=>{ if(!list.length) return ''; const dc=list.filter(t=>trackDone(t.id)).length;
    return `<div class="entrycard" style="position:relative;overflow:hidden;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;box-shadow:0 10px 26px rgba(23,37,42,.09);cursor:pointer" onclick="go('acat',{cat:'${cat}'})"><div style="position:absolute;top:0;left:0;right:0;height:5px;background:${tone.bar}"></div><div class="emedallion" style="background:${tone.med};box-shadow:0 8px 18px ${tone.sh}">${tone.icon}</div><div style="font-weight:800;font-size:18px;letter-spacing:-.01em">${label}</div><div class="muted" style="font-size:13px;margin-top:5px;line-height:1.5">${desc}</div><div style="font-weight:800;font-size:11px;letter-spacing:.06em;text-transform:uppercase;margin-top:14px;color:${tone.ink}">${list.length} ${list.length===1?'track':'tracks'}${dc?` &middot; ${dc} certified`:''} &middot; Open &rarr;</div></div>`; };
  const dev=_entry('development','Leadership &amp; Development','Grow into and beyond your role.',_dev,{bar:'linear-gradient(90deg,var(--tealmid),var(--teallite))',med:'linear-gradient(135deg,var(--tealmid),var(--tealdark))',sh:'rgba(46,125,138,.36)',icon:ICON_SCHOOL,ink:'var(--brand)'});
  const ops=_entry('operations','Operations &amp; How-To','The daily craft, station by station.',_ops,{bar:'linear-gradient(90deg,var(--accent-2),var(--accent))',med:'linear-gradient(135deg,var(--accent),var(--accent-2))',sh:'rgba(229,168,0,.4)',icon:ICON_TOOLS,ink:'var(--accent-ink)'});
  if(_vt.length) h+=`<div class="entrygrid">${dev}${ops}</div>`;
  else h+=`<div class="muted" style="padding:8px 2px">No tracks yet.</div>`;
  v.innerHTML=h;
}