
function vAcat(v){
  const cat=(state.ctx&&state.ctx.cat)||'development';
  const isOps=cat==='operations';
  const label=isOps?'Operations & How-To':'Leadership & Development';
  setTitle(label, isOps?'Station procedures and how-to':'Leadership, decisions, and ownership');
  const list=visibleTracks().filter(t=> isOps ? t.category==='operations' : (t.category||'development')!=='operations');
  const _tcard=t=>{ const done=trackDone(t.id); const ls=trackLessons(t.id); const dn=ls.filter(l=>isDone(l.id)).length; const pct=trackPct(t.id);
    return `<div class="card" style="padding:0;overflow:hidden;cursor:pointer" onclick="go('track',{tid:'${t.id}'})">${trackBanner(t,pct,done)}<div style="padding:15px 17px 17px"><div style="font-weight:600;font-size:15.5px;margin:0 0 3px">${esc(t.name)}</div><div class="muted" style="font-size:12.5px;margin-bottom:11px">${done?esc(t.cert):dn+' of '+ls.length+' modules'}</div><div class="bar"><i style="width:${pct}%"></i></div></div></div>`; };
  let h=`<div class="crumb" onclick="go('home')">← Academy</div>`+academySibs('home');
  h+=`<div style="position:relative;margin:0 0 16px"><i class="ti ti-search" style="position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:15.5px;pointer-events:none"></i><input id="acatSearch" type="search" autocomplete="off" oninput="acatFilter()" placeholder="Search ${esc(label)} — a station, a step, a word…" style="width:100%"/></div>`;
  h+=`<div id="acatResults"></div><div id="acatMain">`;
  h+=`<div class="grid">`+list.map(_tcard).join("")+`</div>`;
  if(list.length){ h+=`<div class="sec">Badges</div><div class="card" style="padding:22px 18px"><div class="row" style="flex-wrap:wrap;gap:24px;justify-content:flex-start;align-items:flex-start">`+
    list.map((t,i)=>{ const done=trackDone(t.id); const bt=BADGE_THEMES[i%BADGE_THEMES.length];
      return `<div style="text-align:center;width:100px"><div style="width:70px;height:70px;margin:0 auto;position:relative;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;${done?`color:#fff;background:${bt.g};box-shadow:0 8px 22px rgba(${bt.s},.55),inset 0 2px 6px rgba(255,255,255,.45);border:3px solid #fff`:'color:var(--faint);background:var(--bg);border:2px dashed var(--line2)'}"><i class="ti ${done?bt.ic:'ti-lock'}"></i>${done?`<span style="position:absolute;top:-3px;right:-3px;width:23px;height:23px;border-radius:50%;background:linear-gradient(135deg,#FFE07A,#F2A104);color:#7a4d00;display:flex;align-items:center;justify-content:center;font-size:12.5px;box-shadow:0 2px 7px rgba(242,161,4,.6);border:2px solid #fff"><i class="ti ti-star-filled"></i></span>`:''}</div><div style="font-size:12.5px;margin-top:9px;line-height:1.3;font-weight:${done?'600':'400'};color:${done?'var(--ink)':'var(--faint)'}">${esc(t.cert)}</div></div>`;
    }).join("")+`</div></div>`; }
  h+=`</div>`;
  v.innerHTML=h;
  window._acatIdx=[]; list.forEach(function(t){ trackLessons(t.id).forEach(function(l){ const txt=((l.title||'')+' '+(l.subtitle||'')+' '+String(l.body||'').replace(/<[^>]+>/g,' ')).toLowerCase(); window._acatIdx.push({tid:t.id,lid:l.id,title:l.title||'',track:t.name||'',n:l.n,txt:txt}); }); });
}
// Typo-tolerant search: "gridle" should still find "griddle". Exact match first (fast), then a bounded edit-distance check per word.
window._lev=function(a,b,max){
  if(a===b) return 0;
  var la=a.length, lb=b.length;
  if(Math.abs(la-lb)>max) return max+1;
  var prev=new Array(lb+1), cur=new Array(lb+1), i, j;
  for(j=0;j<=lb;j++) prev[j]=j;
  for(i=1;i<=la;i++){
    cur[0]=i; var best=cur[0];
    for(j=1;j<=lb;j++){
      var cost=a.charCodeAt(i-1)===b.charCodeAt(j-1)?0:1;
      cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+cost);
      if(cur[j]<best) best=cur[j];
    }
    if(best>max) return max+1;
    var t=prev; prev=cur; cur=t;
  }
  return prev[lb];
};
window.fuzzyHas=function(txt,term){
  if(!term) return true;
  txt=txt||'';
  if(txt.indexOf(term)>=0) return true;
  if(term.length<4) return false; // too short to guess at safely
  var max=term.length<=5?1:2;
  var words=txt.split(/[^a-z0-9]+/);
  for(var i=0;i<words.length;i++){
    var w=words[i];
    if(!w || Math.abs(w.length-term.length)>max) continue;
    if(window._lev(w,term,max)<=max) return true;
  }
  return false;
};
window.acatFilter=function(){ const el=document.getElementById('acatSearch'); const main=document.getElementById('acatMain'); const res=document.getElementById('acatResults'); if(!el||!res)return; const q=(el.value||'').trim().toLowerCase(); if(!q){ res.innerHTML=''; if(main)main.style.display=''; return; } if(main)main.style.display='none'; const idx=window._acatIdx||[]; const terms=q.split(/\s+/).filter(Boolean); const hits=idx.filter(function(r){ return terms.every(function(tm){ return window.fuzzyHas(r.txt,tm); }); }).slice(0,40);
  if(!hits.length){ res.innerHTML='<div class="card" style="padding:22px 18px;text-align:center"><div class="muted" style="font-size:14px">No modules match &ldquo;'+esc(q)+'&rdquo;. Try a station name or a single word.</div></div>'; return; }
  res.innerHTML='<div class="faint" style="font-size:12.5px;margin:0 0 8px">'+hits.length+' match'+(hits.length===1?'':'es')+'</div><div class="card" style="padding:4px 0">'+hits.map(function(r){ const done=isDone(r.lid); return '<div class="lesson-row" onclick="go(\'lesson\',{tid:\''+r.tid+'\',lid:\''+r.lid+'\'})"><div class="dot '+(done?'done':'')+'">'+(done?'✓':'')+'</div><div style="flex:1"><div style="font-weight:500">'+esc(r.title)+'</div><div class="faint" style="font-size:12.5px">'+esc(r.track)+' &middot; Module '+r.n+'</div></div><span class="faint">&rsaquo;</span></div>'; }).join('')+'</div>'; };
/* ---------- Which station does this training teach? ----------
   Training and the schedule have never known about each other. The Brain knows who can run
   Bar, the Academy knows how to teach Bar, and nothing joins the two -- so a manager who
   finds out only two people can close has to go and work out for themselves what to do
   about it.

   One field closes that. Say a track teaches a station, and the team screen can stop
   reporting a problem and start offering the fix. Stored as a day_item rather than a
   column on `tracks` so it needs no migration and no downtime. */
window._trackStation={};
async function loadTrackStations(){
  try{ const r=await sb.from('day_items').select('title,detail').eq('kind','trackstation');
    const m={}; (r.data||[]).forEach(x=>{ try{ const d=JSON.parse(x.detail||'{}'); if(x.title&&d.station) m[x.title]=d.station; }catch(e){} });
    window._trackStation=m; }catch(e){ window._trackStation={}; }
  return window._trackStation;
}
window.setTrackStation=async function(tid,station){
  const prev=window._trackStation[tid];
  if(station) window._trackStation[tid]=station; else delete window._trackStation[tid];
  const msg=document.getElementById('tsMsg'); if(msg){ msg.style.color='var(--muted)'; msg.textContent='Saving…'; }
  try{
    const d=await sb.from('day_items').delete().eq('kind','trackstation').eq('title',tid);
    if(d.error) throw d.error;
    if(station){ const i=await sb.from('day_items').insert({kind:'trackstation',title:tid,on_date:null,detail:JSON.stringify({station}),created_by:state.user.id}); if(i.error) throw i.error; }
    if(msg){ msg.style.color='var(--green)'; msg.textContent='Saved'; setTimeout(function(){ if(msg) msg.textContent=''; },2200); }
  }catch(e){
    if(prev) window._trackStation[tid]=prev; else delete window._trackStation[tid];
    if(msg){ msg.style.color='#B32D2D'; msg.textContent='Not saved: '+(e.message||e); }
  }
};
function vTrack(v){
  const t=state.tracks.find(x=>x.id===state.ctx.tid); if(!t){ go("home"); return; }
  setTitle(t.name, `${trackLessons(t.id).length} modules · earns ${t.cert}`);
  const _bk=t.category==='operations'?'operations':'development'; const _bl=_bk==='operations'?'Operations & How-To':'Leadership & Development';
  let h=`<div class="crumb" onclick="go('acat',{cat:'${_bk}'})">← ${_bl}</div>`;
  if(myRank()>=3){
    const _st=(state.settings&&Array.isArray(state.settings.stations))?state.settings.stations:[];
    const _cur=(window._trackStation||{})[t.id]||'';
    h+=`<div class="card" style="padding:15px 17px;margin-bottom:14px">
      <div style="font-size:15.5px;font-weight:600;letter-spacing:-.012em;margin-bottom:3px">What does this teach?</div>
      <div class="faint" style="font-size:13.5px;margin-bottom:11px;line-height:1.5">Tie it to a station and the team screen can offer this training to whoever is short on it, instead of just telling you there is a gap.</div>
      <div class="row" style="gap:10px;flex-wrap:wrap">
        <select onchange="setTrackStation('${t.id}',this.value)" style="min-width:200px">
          <option value="">Not tied to a station</option>
          ${_st.map(x=>`<option value="${esc(x)}"${x===_cur?' selected':''}>${esc(x)}</option>`).join('')}
          <option value="__open"${_cur==='__open'?' selected':''}>Opening the store</option>
          <option value="__close"${_cur==='__close'?' selected':''}>Closing the store</option>
        </select>
        <span id="tsMsg" class="faint" style="font-size:13px"></span>
      </div>
    </div>`;
  }
  h+=`<div class="card">`;
  h+=trackLessons(t.id).map(l=>{ const d=isDone(l.id);
    return `<div class="lesson-row" onclick="go('lesson',{tid:'${t.id}',lid:'${l.id}'})"><div class="dot ${d?'done':''}">${d?'✓':''}</div><div style="flex:1"><div style="font-weight:500">${esc(l.title)}</div><div class="faint" style="font-size:12.5px">Module ${l.n}</div></div><span class="faint">›</span></div>`;
  }).join("")+`</div>`;
  v.innerHTML=h;
}
function vLesson(v){
  const t=state.tracks.find(x=>x.id===state.ctx.tid); const ls=trackLessons(t.id);
  const l=ls.find(x=>x.id===state.ctx.lid); const i=ls.findIndex(x=>x.id===l.id); const next=ls[i+1];
  try{ if(t&&l) localStorage.setItem('sw_last', JSON.stringify({tid:t.id,lid:l.id})); }catch(e){}
  const done=isDone(l.id); const hasSteps=/<(ol|ul)/i.test(l.body||'');
  setTitle(t.name, `Module ${l.n} · ${l.title}`);
  let main = l.video_url ? `<div class="video" style="padding:0;overflow:hidden;background:#000"><video src="${l.video_url}" controls playsinline style="width:100%;height:100%;object-fit:contain;background:#000"></video></div>` : '';
  if(l.body && l.body.trim()) main+=`<div class="richwrap">${richBody(l.body)}</div>`;
  else if(l.subtitle) main+=`<div class="lead">${esc(l.subtitle)}</div>`;
  else main+=`<div class="card" style="padding:24px 22px;text-align:center"><div style="font-size:26px;margin-bottom:8px">📖</div><div style="font-weight:600;margin-bottom:6px">Full module text coming in</div><div class="muted" style="font-size:14px;max-width:430px;margin:0 auto;line-height:1.6">This module's written lesson is being loaded into the academy.</div></div>`;
  if((t.category||'development')!=='operations') main+=`<div class="card" style="padding:18px 20px;margin-top:24px"><div style="font-weight:600;margin-bottom:4px">📓 Your reflection</div><div class="muted" style="font-size:14px;margin-bottom:10px">Answer this module's questions here. It saves to your journal for your next conversation.</div><textarea id="jr" onblur="saveJournal('${l.id}')" style="width:100%;min-height:130px;line-height:1.65" placeholder="Write your thoughts...">${esc(state.responses[l.id]||'')}</textarea><div class="row" style="margin-top:9px"><button class="btn pri" style="width:auto" onclick="saveJournal('${l.id}')">Save reflection</button><span class="muted" id="jrmsg" style="font-size:12.5px"></span></div></div>`;
  main+=`<div class="row" style="margin-top:20px;flex-wrap:wrap;gap:8px">${done?`<button class="btn" onclick="undo('${l.id}')"><span class="pill g" style="padding:0">✓</span> Completed — undo</button>`:`<button class="btn pri" style="width:auto" onclick="markDone('${t.id}','${l.id}')"><i class="ti ti-circle-check"></i> Mark complete</button>`}<button class="btn" id="sharebtn" style="width:auto" onclick="shareLesson('${t.id}','${l.id}')"><i class="ti ti-share"></i> Share</button><button class="btn" style="width:auto" onclick="printLesson('${l.id}')"><i class="ti ti-printer"></i> Print</button>${(hasSteps && t.category!=='development')?`<button class="btn" style="width:auto" onclick="printSopCard('${l.id}')"><i class="ti ti-clipboard-check"></i> SOP card</button>`:''}${next?`<button class="btn ${done?'pri':''}" id="nextbtn" style="width:auto;margin-left:auto" onclick="go('lesson',{tid:'${t.id}',lid:'${next.id}'})">Next: ${esc(next.title)} <i class="ti ti-arrow-right"></i></button>`:`<button class="btn ${done?'pri':''}" id="nextbtn" style="width:auto;margin-left:auto" onclick="go('track',{tid:'${t.id}'})">Finish course <i class="ti ti-circle-check"></i></button>`}</div>`;
  const dls=[];
  if(l.download_url) dls.push({name:l.download_name||'Workbook', url:l.download_url});
  if((l.n===0 || i===0) && t.workbook_url) dls.push({name:t.workbook_name||(t.name+' — Workbook'), url:t.workbook_url});
  const rail = dls.length ? `<div class="card" style="padding:14px 15px;background:var(--brand-soft);border-color:var(--brand-line)"><div style="font-size:15.5px;font-weight:600;color:var(--ink);text-transform:none;letter-spacing:-.012em;margin-bottom:11px">Downloads</div>`+dls.map(d=>`<a href="${d.url}" target="_blank" style="display:flex;align-items:flex-start;gap:9px;text-decoration:none;margin-bottom:12px"><div style="color:var(--brand);font-size:18px;flex-shrink:0">📄</div><div style="font-size:14px;color:var(--ink);line-height:1.4">${esc(d.name)}<div style="color:var(--brand);font-size:12.5px;margin-top:3px;font-weight:500">Download ↓</div></div></a>`).join('')+`</div>` : '';
  let h=`<div class="crumb" onclick="go('track',{tid:'${t.id}'})">← ${esc(t.name)}</div>`;
  h+= rail ? `<div class="lesson-grid"><div class="lesson-main">${main}</div><aside class="lesson-rail">${rail}</aside></div>` : main;
  v.innerHTML=h;
  linkGlossary(v);
}
async function vSummary(v){
  setTitle("Team progress","Who's where — and who needs a nudge");
  v.innerHTML='<div class="waiting"><i></i><i></i><i></i></div>';
  const { data:profiles } = await sb.from("profiles").select("*");
  const { data:prog } = await sb.from("progress").select("user_id,lesson_id,at");
  await loadPositions(); await loadArchived();
  const total = state.tracks.reduce((a,t)=>a+trackLessons(t.id).length,0);
  const byUser={}, lastAt={};
  (prog||[]).forEach(p=>{ byUser[p.user_id]=(byUser[p.user_id]||0)+1; if(p.at&&(!lastAt[p.user_id]||p.at>lastAt[p.user_id]))lastAt[p.user_id]=p.at; });
  const weekAgo=Date.now()-7*86400000; const weekDone=(prog||[]).filter(p=>p.at&&new Date(p.at).getTime()>=weekAgo).length;
  const learners=(profiles||[]).filter(p=>p.role!=="admin"&&!isArchived(p.name)&&(window._posMap&&window._posMap[p.name]&&window._posMap[p.name]!=='Owner')).map(p=>{
    const dn=byUser[p.id]||0, pct=total?Math.round(dn/total*100):0;
    let status= pct>=100?'certified': dn>0?'training':'notstarted';
    const days = lastAt[p.id]? Math.floor((Date.now()-new Date(lastAt[p.id]))/86400000) : null;
    const stalled = status==='training' && days!==null && days>=STALL_DAYS;
    return {...p,dn,pct,status,days,stalled};
  });
  const nCert=learners.filter(l=>l.status==='certified').length;
  const nTrain=learners.filter(l=>l.status==='training').length;
  const nNew=learners.filter(l=>l.status==='notstarted').length;
  const nStall=learners.filter(l=>l.stalled).length;
  // attention first: stalled, then not-started, then lowest %, certified last
  const ord={notstarted:1,training:2,certified:3};
  learners.sort((a,b)=> (b.stalled-a.stalled) || (ord[a.status]-ord[b.status]) || (a.pct-b.pct) || (a.name||'').localeCompare(b.name||''));
  const stat=(n,l,c)=>`<div style="flex:1;text-align:center;padding:14px 8px"><div style="font-size:26px;font-weight:700;color:${c}">${n}</div><div class="faint" style="font-size:12.5px">${l}</div></div>`;
  let h=academySibs('summary')+`<div class="card row" style="margin-bottom:18px;align-items:stretch">${stat(learners.length,'On the team','var(--ink)')}<div style="width:1px;background:var(--line)"></div>${stat(nNew,'Not started','var(--amber)')}<div style="width:1px;background:var(--line)"></div>${stat(nTrain,'In training','var(--brand)')}<div style="width:1px;background:var(--line)"></div>${stat(nCert,'Certified','var(--green)')}</div>`;
  h+=`<div class="card" style="padding:12px 15px;margin-bottom:16px"><b>This week</b> <span class="muted" style="font-size:14px">— ${weekDone} lesson${weekDone===1?'':'s'} completed across the team.${nStall?'':' Nice momentum.'}</span></div>`;
  if(nStall) h+=`<div class="card" style="padding:12px 15px;margin-bottom:16px;background:var(--amber-soft);border-color:var(--amber)"><b style="color:var(--amber)">⚠ ${nStall} ${nStall===1?'person has':'people have'} stalled</b> <span class="muted" style="font-size:14px">— no progress in ${STALL_DAYS}+ days. A quick check-in goes a long way.</span></div>`;
  const pill=l=> l.stalled?`<span class="pill" style="background:var(--amber-soft);color:var(--amber)">Stalled ${l.days}d</span>`: l.status==='certified'?`<span class="pill g">Certified ✓</span>`: l.status==='training'?`<span class="pill" style="background:var(--brand-soft);color:var(--brand)">In training</span>`:`<span class="pill" style="background:#F2F2F2;color:#888">Not started</span>`;
  let h2=`<div class="card">`;
  h2+=learners.map(p=>`<div class="lesson-row" style="cursor:default"><div style="width:32px;height:32px;border-radius:50%;background:var(--brand-soft);color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">${esc((p.name||'?').charAt(0).toUpperCase())}</div><div style="flex:1;min-width:0"><div style="font-weight:500">${esc(p.name)}</div><div class="faint" style="font-size:12.5px">${esc(p.title||'Team member')}</div></div><div style="margin-right:14px">${pill(p)}</div><div style="width:130px;text-align:right"><div class="muted" style="font-size:12.5px;margin-bottom:5px">${p.dn} of ${total}</div><div class="bar"><i style="width:${p.pct}%"></i></div></div></div>`).join("")||`<div style="padding:30px;text-align:center" class="faint">No team members yet. Share your join code from Settings to get them in.</div>`;
  h2+=`</div>`;
  v.innerHTML=h+h2;
}

function vJournal(v){
  setTitle("Your journal","Your reflections, all in one place");
  const ls = state.tracks.flatMap(t=>trackLessons(t.id));
  const entries = ls.filter(l=>state.responses[l.id] && state.responses[l.id].trim());
  if(!entries.length){ v.innerHTML=`<div class="card" style="padding:32px;text-align:center"><div style="font-size:26px;margin-bottom:8px">📓</div><div class="muted" style="font-size:14px;max-width:400px;margin:0 auto;line-height:1.6">No reflections yet. Answer the questions at the end of a module and they'll collect here for your next conversation.</div></div>`; return; }
  v.innerHTML=`<div class="card">`+entries.map(l=>`<div style="padding:16px 18px;border-bottom:1px solid var(--line)"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px"><div style="font-weight:600;font-size:14px">${esc(l.title)}</div><span onclick="go('lesson',{tid:'${l.track_id}',lid:'${l.id}'})" style="cursor:pointer;font-size:12.5px;color:var(--brand);white-space:nowrap">Open →</span></div><div class="muted" style="font-size:14px;line-height:1.65;white-space:pre-wrap">${esc(state.responses[l.id])}</div></div>`).join("")+`</div>`;
}

function timeAgo(ts){ if(!ts) return ''; const d=(Date.now()-new Date(ts).getTime())/1000; if(d<60)return 'just now'; if(d<3600)return Math.floor(d/60)+'m ago'; if(d<86400)return Math.floor(d/3600)+'h ago'; return Math.floor(d/86400)+'d ago'; }
function linkifyTags(s){ return esc(s).replace(/(^|\s)(#[A-Za-z0-9_]{1,30})/g, (m,pre,tag)=>pre+'<span style="color:var(--brand);cursor:pointer;font-weight:600" onclick="filterTag(\''+tag.toLowerCase().replace(/'/g,'')+'\')">'+tag+'</span>'); }
window.filterTag=function(tag){ go('community',{ch:state.ctx.ch||'announcements', tag}); };
const CH_DEFAULTS=[
  {id:'announcements',label:'Announcements',announceOnly:true,memberVisible:true,icon:'ti-speakerphone'},
  {id:'general',label:'General',announceOnly:false,memberVisible:false,icon:'ti-messages'},
  {id:'leadership',label:'Leadership',announceOnly:false,memberVisible:false,icon:'ti-user-star'},
  {id:'ideas',label:'Ideas & Feedback',announceOnly:false,memberVisible:true,icon:'ti-bulb'},
  {id:'fol',label:'Foundations of Leadership',announceOnly:false,memberVisible:true,icon:'ti-school'},
  {id:'positioncert',label:'Position Certification',announceOnly:false,memberVisible:false,icon:'ti-certificate'},
];
// Effective channel list = built-in defaults, overlaid with the owner's saved edits (day_items kind 'chandef'), plus any brand-new channels. Owner fully controls order, names, who-sees, who-posts, and hide.
window.effectiveChannels=function(){
  const defs={}; ((state.community&&state.community.chandefs)||[]).forEach(d=>{ if(d&&d.id) defs[d.id]=d; });
  const out=[], seen={};
  CH_DEFAULTS.forEach((b,i)=>{ const d=defs[b.id]||{}; seen[b.id]=1; out.push({ id:b.id, label:(d.label||b.label), announceOnly:(d.announceOnly!=null?!!d.announceOnly:b.announceOnly), memberVisible:(d.memberVisible!=null?!!d.memberVisible:b.memberVisible), icon:(d.icon||b.icon), order:(d.order!=null?+d.order:i), hidden:!!d.hidden, builtin:true }); });
  Object.keys(defs).forEach(id=>{ if(seen[id])return; const d=defs[id]; out.push({ id:id, label:(d.label||id), announceOnly:!!d.announceOnly, memberVisible:(d.memberVisible!=null?!!d.memberVisible:true), icon:(d.icon||'ti-hash'), order:(d.order!=null?+d.order:99), hidden:!!d.hidden, builtin:false }); });
  out.sort((a,b)=>a.order-b.order || String(a.label).localeCompare(String(b.label)));
  return out;
};
async function vCommunity(v){
  const isAdmin = state.profile && state.profile.role==='admin';
  // "leadership" = the owner plus any leader rank (Supervisor and up). The leadership channel and
  // announcement posting were gated on isAdmin (owner only), so every leader was silently shut out.
  const isLeader = isAdmin || myRank()>=2;
  const ch = state.ctx.ch || 'announcements';
  const tag = (state.ctx.tag||'').toLowerCase();
  setTitle("Community", tag?('Posts tagged '+tag):"Talk it through together");
  if(!state.community){ v.innerHTML='<div class="waiting"><i></i><i></i><i></i></div>'; const [p,c,m,rx,rd,pf,cd]=await Promise.all([ sb.from('posts').select('*').order('created_at',{ascending:false}), sb.from('comments').select('*').order('created_at'), sb.from('channel_modes').select('*'), sb.from('reactions').select('*'), sb.from('channel_reads').select('*').eq('user_id',state.user.id), sb.from('profiles').select('id,name,avatar_url'), sb.from('day_items').select('title,detail').eq('kind','chandef') ]); const chandefs=(cd.data||[]).map(r=>{ try{ const d=typeof r.detail==='string'?JSON.parse(r.detail||'{}'):(r.detail||{}); d.id=d.id||r.title; return d; }catch(e){ return null; } }).filter(x=>x&&x.id); state.community={posts:p.data||[],comments:c.data||[],modes:m.data||[],reactions:rx.data||[],reads:rd.data||[],profiles:pf.data||[],chandefs}; }
  const allCh=effectiveChannels();
  const canCh=id=>{ const cc=allCh.find(x=>x.id===id); if(!cc||cc.hidden) return false; return isLeader || cc.memberVisible; };
  if(!canCh(ch)){ go('community',{ch:'announcements'}); return; }
  const visible = allCh.filter(c=> !c.hidden && (isLeader || c.memberVisible));
  let _cf={}; try{ _cf=JSON.parse(localStorage.getItem('sw_chfav')||'{}'); _cf[ch]=(_cf[ch]||0)+1; localStorage.setItem('sw_chfav',JSON.stringify(_cf)); }catch(e){} visible.sort((a,b)=>(_cf[b.id]||0)-(_cf[a.id]||0)); /* your most-used channels float to the front so you don't scroll to find them */
  let posts = tag ? state.community.posts.filter(p=>(p.body||'').toLowerCase().includes(tag) && (p.channel!=='leadership'||isLeader)) : state.community.posts.filter(p=>p.channel===ch);
  const cBy={}; state.community.comments.forEach(c=>{ (cBy[c.post_id]=cBy[c.post_id]||[]).push(c); });
  const cur = allCh.find(c=>c.id===ch)||visible[0]||allCh[0];
  const _ov=state.community.modes.find(x=>x.channel===ch); const twoWay = _ov? _ov.two_way : !cur.announceOnly; const canPost = isLeader || twoWay;
  const reads={}; (state.community.reads||[]).forEach(r=>{ reads[r.channel]=r.last_read_at; });
  const unreadOf=cid=>{ const lr=reads[cid]?new Date(reads[cid]).getTime():0; return state.community.posts.filter(pp=>pp.channel===cid && new Date(pp.created_at).getTime()>lr).length; };
  sb.from('channel_reads').upsert({user_id:state.user.id,channel:ch,last_read_at:new Date().toISOString()}).then(()=>{}); reads[ch]=new Date().toISOString();
  // opening this channel clears its unread; recompute the nav badge from what's now read
  try{ let _tot=0; visible.forEach(c=>{ const lr=reads[c.id]?new Date(reads[c.id]).getTime():0; _tot+=state.community.posts.filter(pp=>pp.channel===c.id && pp.author_id!==state.user.id && new Date(pp.created_at).getTime()>lr).length; }); window._communityUnread=_tot; const _navA=[...document.querySelectorAll('#nav a')].find(a=>/community/.test(a.getAttribute('onclick')||'')); if(_navA){ const _lbl=_navA.querySelector('span'); let _b=_navA.querySelector('.commbadge'); if(_tot>0){ if(!_b){ _b=document.createElement('span'); _b.className='commbadge'; _b.style.cssText='background:#DC2626;color:#fff;font-size:10.5px;font-weight:800;min-width:18px;height:18px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;flex-shrink:0'; if(_lbl&&_lbl.nextSibling) _navA.insertBefore(_b,_lbl.nextSibling); else _navA.appendChild(_b); } _b.textContent=_tot>99?'99+':_tot; } else if(_b){ _b.remove(); } } }catch(e){}
  let h=`<div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:18px;padding-bottom:5px;scrollbar-width:thin;white-space:nowrap">`+visible.map(c=>{ const on=ch===c.id; const u=unreadOf(c.id); const bdg=(u&&!on)?`<span style="background:var(--accent);color:#3A2B00;border-radius:999px;font-size:11.5px;font-weight:800;padding:1px 6px;margin-left:5px">${u>9?'9+':u}</span>`:''; const ic=c.icon||'ti-hash'; return `<button onclick="go('community',{ch:'${c.id}'})" style="display:inline-flex;align-items:center;gap:7px;padding:9px 16px;flex-shrink:0;border-radius:999px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;border:1px solid ${on?'transparent':'var(--line2)'};${on?'background:linear-gradient(135deg,var(--tealmid),var(--tealdark));color:#fff;box-shadow:0 6px 15px rgba(46,125,138,.32)':'background:var(--card);color:var(--ink)'}"><i class="ti ${ic}" style="font-size:15.5px"></i>${esc(c.label)}${bdg}</button>`; }).join('')+(isAdmin?`<button onclick="manageChannels()" title="Add, rename, reorder or hide channels" style="display:inline-flex;align-items:center;gap:6px;padding:9px 14px;flex-shrink:0;border-radius:999px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;border:1px dashed var(--line2);background:var(--card);color:var(--muted)"><i class="ti ti-settings" style="font-size:15.5px"></i>Manage</button><button onclick="importChats()" title="Import an old group's chat history from a message.json export" style="display:inline-flex;align-items:center;gap:6px;padding:9px 14px;flex-shrink:0;border-radius:999px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;border:1px dashed var(--line2);background:var(--card);color:var(--muted)"><i class="ti ti-upload" style="font-size:15.5px"></i>Import</button>`:'')+`</div>`;
  const q=(state.ctx.q||'').trim().toLowerCase();
  const mediaMode=!!state.ctx.media && !q;
  const chName=id=>{const cc=allCh.find(x=>x.id===id);return cc?cc.label:id;};
  h+=`<div class="row" style="gap:8px;margin-bottom:16px;flex-wrap:wrap"><div style="flex:1;min-width:180px;position:relative"><i class="ti ti-search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--brand);font-size:15.5px"></i><input id="comq" value="${esc(state.ctx.q||'')}" placeholder="Search everything you can see…" onkeydown="if(event.key==='Enter')comSearch(document.getElementById('comq').value)" style="width:100%;padding:11px 14px 11px 38px;border:1.5px solid var(--brand-line);border-radius:999px;background:var(--brand-soft);color:var(--ink);font-family:inherit;font-size:14px"/></div><button class="btn" style="width:auto" onclick="comSearch(document.getElementById('comq').value)">Search</button><button class="btn ${mediaMode?'pri':''}" style="width:auto" onclick="comMedia(${mediaMode?'false':'true'})"><i class="ti ti-photo"></i> Media</button></div>`;
  if(q){
    const res=state.community.posts.filter(p=>canCh(p.channel) && (p.channel!=='leadership'||isLeader) && ((p.body||'').toLowerCase().includes(q)||(p.author_name||'').toLowerCase().includes(q)));
    h+=`<div class="faint" style="font-size:14px;margin-bottom:12px">${res.length} result${res.length===1?'':'s'} for "${esc(q)}" · <span style="color:var(--brand);cursor:pointer;font-weight:600" onclick="comSearch('')">clear</span></div>`;
    if(!res.length) h+=`<div class="card" style="padding:30px;text-align:center"><div class="faint">No posts match. Try a different word.</div></div>`;
    else h+=res.map(p=>`<div class="card" style="padding:14px 16px;margin-bottom:10px;cursor:pointer" onclick="go('community',{ch:'${p.channel}'})"><div class="row" style="gap:8px;margin-bottom:6px;flex-wrap:wrap"><span class="pill" style="background:var(--brand-soft);color:var(--brand);font-size:12.5px">${esc(chName(p.channel))}</span><span style="font-weight:600;font-size:14px">${esc(p.author_name||'Someone')}</span><span class="faint" style="font-size:12.5px">${timeAgo(p.created_at)}</span></div><div class="muted" style="font-size:14px;line-height:1.5;white-space:pre-wrap">${esc((p.body||'').slice(0,240))}${(p.body||'').length>240?'…':''}</div>${p.media_url?`<div class="faint" style="font-size:12.5px;margin-top:5px"><i class="ti ti-${p.media_type==='video'?'video':'photo'}"></i> ${p.media_type==='video'?'video':'photo'} attached</div>`:''}</div>`).join('');
    v.innerHTML=h; return;
  }
  if(mediaMode){
    const media=state.community.posts.filter(p=>p.channel===ch && p.media_url);
    h+=`<div class="faint" style="font-size:14px;margin-bottom:12px">${media.length} photo/video${media.length===1?'':'s'} shared in ${esc(cur.label)} — only people with access to this channel see these.</div>`;
    if(!media.length) h+=`<div class="card" style="padding:30px;text-align:center"><div class="faint">No photos or videos shared here yet. They'll collect here automatically as they're posted.</div></div>`;
    else h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px">`+media.map(p=>p.media_type==='video'?`<video src="${p.media_url}" controls playsinline style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;background:#000"></video>`:`<img src="${p.media_url}" loading="lazy" onclick="window.open('${p.media_url}','_blank')" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;cursor:pointer"/>`).join('')+`</div>`;
    v.innerHTML=h; return;
  }
  if(ch==='announcements') h+=`<div class="card" style="padding:15px 17px;margin-bottom:16px;border-left:3px solid var(--brand)"><div style="font-weight:700;font-size:14px;margin-bottom:7px">How we use this space</div><div class="muted" style="font-size:14px;line-height:1.62">This is for information you can read on your own time — a searchable record, not where we run the shift. It supports coaching and training; it doesn't replace them.<br><br><b>Reaching a leader — a simple way to think about it:</b><br>• <b>Emergency, or you can't keep your commitment → call</b> — someone's hurt, a safety or security problem, we can't open or run the shift, or you're going to be late or need to call out. If it affects your shift, you call — that's how we own it.<br>• <b>Important, but not an emergency → text</b> — something a leader should know soon that isn't urgent enough to interrupt them.<br>• <b>Not urgent → post here</b> — swapping a shift next week, a heads-up for the next crew, an idea, or a shout-out.<br><br>Protect your time off — you're not expected to be on here after your shift.</div></div>`;
  if(isAdmin) h+=`<div style="margin-bottom:14px;font-size:14px"><span class="muted">This channel is <b>${twoWay?'two-way — anyone can post':'announce-only — leaders post'}</b>.</span> <span style="color:var(--brand);cursor:pointer;font-weight:600" onclick="toggleChannelMode('${ch}',${twoWay?'false':'true'})">Switch to ${twoWay?'announce-only':'two-way'}</span></div>`;
  if(tag) h+=`<div class="card" style="padding:10px 14px;margin-bottom:14px;background:var(--brand-soft);border-color:var(--brand-line)"><b style="color:var(--brand)">${esc(tag)}</b> <span class="muted" style="font-size:14px">— posts with this tag, all channels</span> <span style="float:right;cursor:pointer;color:var(--muted)" onclick="go('community',{ch:'${ch}'})">✕ clear</span></div>`;
  const ph = ch==='ideas' ? 'Suggest an improvement or ask a question…' : (ch==='announcements'?'Post an announcement for the team…':'Share something or ask a question…');
  if(canPost) h+=`<div class="card" style="padding:14px 15px;margin-bottom:18px"><textarea id="np" spellcheck="true" autocorrect="on" autocapitalize="sentences" placeholder="${ph}" style="width:100%;min-height:66px;line-height:1.6"></textarea><div id="npprev" style="margin-top:9px"></div><div class="row" style="margin-top:9px"><select id="npkudos" style="width:100%"><option value="">👏 Recognize a teammate (optional)…</option>${(state.community.profiles||[]).filter(x=>x.name).map(x=>`<option value="${esc(x.name)}">${esc(x.name)}</option>`).join('')}</select></div><div class="row" style="margin-top:9px;gap:8px"><input type="file" id="npfile" accept="image/*,video/*" style="display:none" onchange="pickMedia(this)"/><button class="btn" style="width:auto" onclick="document.getElementById('npfile').click()"><i class="ti ti-photo"></i> Photo / Video</button><button class="btn pri" id="postbtn" style="width:auto;margin-left:auto" onclick="postNew()">Post to ${esc(cur.label)}</button></div></div>`;
  else h+=`<div class="card" style="padding:13px 16px;margin-bottom:18px"><div class="muted" style="font-size:14px">📣 Announcements are posted by leadership — check here for important updates.</div></div>`;
  if(!posts||!posts.length) h+=`<div class="card" style="padding:34px;text-align:center"><div style="font-size:26px;margin-bottom:8px">💬</div><div class="muted" style="font-size:14px">Nothing here yet.${canPost?' Start the conversation.':''}</div></div>`;
  else h+=posts.map(p=>{
    const cs=cBy[p.id]||[];
    return `<div class="card" style="padding:15px 17px;margin-bottom:12px"><div class="row" style="gap:10px;margin-bottom:9px"><div style="width:34px;height:34px;border-radius:50%;overflow:hidden;background:#EFE9E2;color:#7a6f63;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0">${(function(){var pr=(state.community.profiles||[]).find(function(x){return x.id===p.author_id;});return pr&&pr.avatar_url&&pr.name===p.author_name?'<img src="'+pr.avatar_url+'" style="width:100%;height:100%;object-fit:cover"/>':esc((p.author_name||'?').charAt(0).toUpperCase());})()}</div><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(p.author_name||'Someone')}</div><div class="faint" style="font-size:12.5px">${timeAgo(p.created_at)}${p.edited?' · edited':''}</div></div><button onclick="markUnreadFrom(${p.id})" class="no-print" title="Mark unread from here — flags it so you come back to it" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:15.5px;line-height:1;align-self:flex-start"><i class="ti ti-bookmark"></i></button>${(((state.profile||{}).name||'').trim().toLowerCase()===((p.author_name||'').trim().toLowerCase()))?`<button onclick="editPost(${p.id})" class="no-print" title="Edit" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:12.5px;align-self:flex-start">Edit</button>`:''}${(p.author_id===state.user.id||isAdmin)?`<button onclick="delPostC(${p.id})" class="no-print" title="Delete" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:15.5px;line-height:1;align-self:flex-start">×</button>`:''}</div>${p.recognized_name?`<div style="display:flex;align-items:center;gap:8px;background:#FFF7E0;border:1px solid #F0D98A;border-radius:8px;padding:8px 11px;margin-bottom:8px"><span style="font-size:15.5px">👏</span><span style="font-size:14px;font-weight:700;color:#8A5A00">Shout-out to ${esc(p.recognized_name)}</span></div>`:''}<div class="muted" style="line-height:1.55;white-space:pre-wrap">${linkifyTags(p.body)}</div>`+
      (cs.length?`<div style="margin-top:10px;border-top:1px solid var(--line)">`+cs.map(c=>`<div style="padding:9px 0 0"><span style="font-weight:600;font-size:14px">${esc(c.author_name||'Someone')}</span> <span class="muted" style="font-size:14px;white-space:pre-wrap">${esc(c.body)}</span>${(((state.profile||{}).name||'').trim().toLowerCase()===((c.author_name||'').trim().toLowerCase()))?` <button onclick="editComment(${c.id})" class="no-print" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:12.5px">edit</button>`:''}${(c.author_id===state.user.id||isAdmin)?`<button onclick="delComment(${c.id})" class="no-print" title="Delete" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:14px;line-height:1">×</button>`:''}</div>`).join('')+`</div>`:``)+
      `${p.media_url?(p.media_type==='video'?`<video src="${p.media_url}" controls playsinline style="width:100%;max-height:420px;margin-top:11px;border-radius:12px;background:#000"></video>`:`<img src="${p.media_url}" loading="lazy" style="width:100%;margin-top:11px;border-radius:12px;display:block"/>`):''}`+
      reactionBar(p)+
      ((twoWay||isAdmin)?`<div class="row" style="margin-top:11px;gap:8px"><input id="rc${p.id}" spellcheck="true" autocorrect="on" autocapitalize="sentences" placeholder="Reply…" style="flex:1" onkeydown="if(event.key==='Enter')commentNew(${p.id})"/><button class="btn" style="width:auto" onclick="commentNew(${p.id})">Reply</button></div>`:`<div class="faint" style="margin-top:10px;font-size:12.5px;font-style:italic;border-top:1px solid var(--line);padding-top:9px">📣 One-way channel — replies are off here.</div>`)+`</div>`;
  }).join('');
  v.innerHTML=h;
}
window.toggleChannelMode=async function(ch,tw){ await sb.from('channel_modes').upsert({channel:ch, two_way:tw, updated_at:new Date().toISOString()}); state.community=null; go('community',{ch}); };
// ── Owner channel manager: add / rename / reorder / hide / who-sees / who-posts. Persists to day_items kind 'chandef'. Hiding never deletes posts.
window.manageChannels=function(){ const all=effectiveChannels(); window._chanEdit=all.map(c=>({id:c.id,label:c.label,announceOnly:!!c.announceOnly,memberVisible:!!c.memberVisible,icon:c.icon||'ti-hash',hidden:!!c.hidden,builtin:!!c.builtin})); renderChanManager(); };


/* ---------- Recipes ----------
   Jason's recipes live in MarginEdge, costed, with real quantities. Retyping 177 of them
   would guarantee two versions that drift apart, so this reads a MarginEdge export and
   keeps recipeId as the identity -- a re-import updates rather than duplicating.

   Three levels, the same shape as Leadership & Operations: categories you click, then
   the recipes in one, then the recipe. A flat 177-row scroll was the wrong answer.

   No money on this page at all. Jason asked for the costs off, and half a decision --
   costs for owners, hidden for staff -- still puts food cost on a screen a barista is
   standing next to. Cost lives in MarginEdge, which is where it is maintained anyway. */

/* Twelve distinct hues, and every category is guaranteed one of its own.
   Keyword rules alone were not enough -- 'Breakfast Bagels' contains 'bagel',
   so three categories came out as the same orange loaf. A category now states
   a preference, and if that colour is already taken it gets the next free one,
   so no two can ever match however the categories are named. */
const RECIPE_PALETTE=[
  'linear-gradient(135deg,#8A5CF6,#5A2FC2)',  /* violet  */
  'linear-gradient(135deg,#4A9CAD,#2A6E7A)',  /* teal    */
  'linear-gradient(135deg,#F2820A,#BF5E00)',  /* orange  */
  'linear-gradient(135deg,#3FA06B,#227048)',  /* green   */
  'linear-gradient(135deg,#E0567F,#A82552)',  /* rose    */
  'linear-gradient(135deg,#5C7CE0,#2F4BA8)',  /* indigo  */
  'linear-gradient(135deg,#C9962E,#8E6510)',  /* gold    */
  'linear-gradient(135deg,#6E7B8A,#41505E)',  /* slate   */
  'linear-gradient(135deg,#B0539B,#78256A)',  /* magenta */
  'linear-gradient(135deg,#D4573D,#9E2F1A)',  /* clay    */
  'linear-gradient(135deg,#7FA82E,#4E7010)',  /* lime    */
  'linear-gradient(135deg,#38A0D8,#1B6795)'   /* sky     */
];
/* Most specific name first, or 'Breakfast Bagels' matches the bagel rule. */
const RECIPE_RULES=[
  [/breakfast/,                6, 'ti-egg-fried'],
  [/lunch|sandwich|burger/,    7, 'ti-burger'],
  [/drink.*prep|prep.*drink/,  5, 'ti-flask'],
  [/drink|coffee|espresso|tea/,0, 'ti-cup'],
  [/cream cheese|cheese/,      4, 'ti-cheese'],
  [/avocado/,                  3, 'ti-avocado'],
  [/toast|salad/,              3, 'ti-salad'],
  [/dough/,                    9, 'ti-chef-hat'],
  [/bagel/,                    2, 'bagel'],
  [/bread|toast/,              2, 'ti-bread'],
  [/base/,                     1, 'ti-bowl-spoon'],
  [/pastry|danish|muffin|cake/,8,'ti-cookie'],
  [/sauce|syrup|spread|milk/, 10, 'ti-milk'],
  [/egg/,                      6, 'ti-egg-fried'],
  [/retail|merch/,            11, 'ti-shopping-bag']
];
function _recRule(name){
  const n=(name||'').toLowerCase();
  for(const r of RECIPE_RULES){ if(r[0].test(n)) return r; }
  return null;
}
/* Built once from every category present, so a colour is the same on the grid,
   inside the category and at the top of a recipe. */
function _recToneMap(){
  if(state._recToneMap) return state._recToneMap;
  const names=[...new Set((state._recipes||[]).map(o=>o.d.type||'Other'))]
              .sort((a,b)=>a.localeCompare(b));
  const used=new Set(), map={};
  names.forEach(n=>{ const r=_recRule(n);
    if(r && !used.has(r[1])){ used.add(r[1]); map[n]={c:r[1],ic:r[2]}; } });
  let next=0;
  names.forEach(n=>{ if(map[n]) return;
    while(used.has(next)) next++;
    used.add(next);
    const r=_recRule(n);
    map[n]={c:next, ic:(r&&r[2])||'ti-tools-kitchen-2'};
  });
  state._recToneMap=map;
  return map;
}

/* Tabler has no bagel, and substituting a loaf for one is how "Bagels" ended up
   looking like toast while "Avocado Toast" was a salad bowl. Two are drawn here;
   everything else uses a Tabler glyph that actually depicts the thing. */
const RECIPE_DRAWN={
  'bagel':(sz,col,op)=>`<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="${col}" stroke-width="1.7" stroke-linecap="round" style="opacity:${op}"><circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="3.3"/><path d="M8.6 6.1l.6 1.1M15.4 6.1l-.6 1.1M6.1 15.4l1.1-.6M17.9 15.4l-1.1-.6M12 3.4v1.2"/></svg>`,
  'bagel-egg':(sz,col,op)=>`<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="${col}" stroke-width="1.7" stroke-linecap="round" style="opacity:${op}"><circle cx="8.6" cy="15" r="6.6"/><circle cx="8.6" cy="15" r="2.5"/><circle cx="16.6" cy="7.4" r="4.7"/><circle cx="16.6" cy="7.4" r="1.7" fill="${col}" stroke="none"/></svg>`
};
function _recIcon(ic,sz,col,op){
  if(RECIPE_DRAWN[ic]) return RECIPE_DRAWN[ic](sz,col,op);
  return `<i class="ti ${ic}" style="font-size:${sz}px;color:${col};opacity:${op}"></i>`;
}
function _recTone(name){
  const m=_recToneMap()[name||'Other'];
  return m ? {g:RECIPE_PALETTE[m.c%RECIPE_PALETTE.length], ic:m.ic}
           : {g:RECIPE_PALETTE[7], ic:'ti-bowl'};
}
function _qty(n){
  if(n==null||isNaN(n)) return '';
  const x=Number(n);
  return (Math.abs(x-Math.round(x))<0.001) ? String(Math.round(x)) : String(+x.toFixed(2));
}
function _unitLbl(u,q){
  if(!u) return '';
  const w=String(u).toLowerCase().replace(/_/g,' ');
  const one=Math.abs(Number(q)-1)<0.001;
  return one ? w : (w.endsWith('s')?w:w+'s');
}
function _recSearchBox(ph){
  return `<div style="position:relative;margin:0 0 16px"><i class="ti ti-search" style="position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:15.5px;pointer-events:none"></i><input id="recSearch" type="search" autocomplete="off" value="${esc(state.ctx.q||'')}" oninput="recipeSearch(this.value)" placeholder="${esc(ph)}" style="width:100%"/></div>`;
}

async function vRecipes(v){
  if(!canSee('recipes')){ go('home'); return; }
  /* Every other page carries a header; this one was built inside out and never got
     one, so Recipes was the only screen that opened with no name on it. */
  setTitle('Recipes','Every recipe and exactly what goes in it');
  if(!state._recipes){
    v.innerHTML='<div class="waiting"><i></i><i></i><i></i></div>';
    const r=await sb.from('day_items').select('*').eq('kind','recipe').order('title');
    state._recipes=(r.data||[]).map(x=>{ let d={}; try{ d=JSON.parse(x.detail||'{}'); }catch(e){} return {id:x.id,name:x.title,d}; })
                                .filter(o=>!o.d.inactive);
    state._recipeCount=state._recipes.length;
    state._recToneMap=null;
  }
  _renderRecipes(v);
}

function _renderRecipes(v){
  const all=state._recipes||[];
  const q=((state.ctx.q||'')+'').trim().toLowerCase();
  const openId=state.ctx.rid, cat=state.ctx.rcat;

  /* one recipe */
  if(openId){
    const o=all.find(x=>String(x.id)===String(openId));
    if(o) return _renderOneRecipe(v,o);
  }

  let h='';

  /* searching cuts across everything, so it never matters which level you were on */
  if(q){
    h+=`<div class="crumb" onclick="recipeSearch('')">← All recipes</div>`+_recSearchBox('Search a recipe or an ingredient…');
    const hits=all.filter(o=>
      (o.name||'').toLowerCase().includes(q) ||
      (o.d.type||'').toLowerCase().includes(q) ||
      (o.d.ing||[]).some(i=>(i.n||'').toLowerCase().includes(q)));
    h+=`<div class="sec">${hits.length} result${hits.length===1?'':'s'} for “${esc(state.ctx.q)}”</div>`;
    h+=hits.length?`<div class="card">`+hits.map(o=>_recRow(o,true)).join('')+`</div>`
                  :`<div class="card" style="padding:26px;text-align:center"><span class="muted">Nothing matches.</span></div>`;
    v.innerHTML=h; _recFocus(); return;
  }

  /* inside one category */
  if(cat){
    const list=all.filter(o=>(o.d.type||'Other')===cat);
    const t=_recTone(cat);
    h+=`<div class="crumb" onclick="recipeCat(null)">← Recipes</div>`;
    /* Step between categories without going back to the grid first. */
    const _names=[...new Set(all.map(o=>o.d.type||'Other'))].sort((a,b)=>a.localeCompare(b));
    h+=`<div class="sibs">`+_names.map(n=>`<a onclick="recipeCat('${esc(n).replace(/'/g,"\\'")}')"${n===cat?' class="on"':''}>${esc(n)}</a>`).join('')+`</div>`;
    h+=`<div style="display:flex;align-items:center;gap:14px;margin:0 0 15px">
          <div style="width:52px;height:52px;border-radius:12px;background:${t.g};display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 8px 18px rgba(23,37,42,.2)">${_recIcon(t.ic,26,'#fff',1)}</div>
          <div><div style="font-weight:800;font-size:20px;letter-spacing:-.02em">${esc(cat)}</div>
          <div class="muted" style="font-size:13.5px">${list.length} recipe${list.length===1?'':'s'}</div></div>
        </div>`;
    h+=_recSearchBox('Search a recipe or an ingredient…');
    h+=`<div class="card">`+list.map(o=>_recRow(o,false)).join('')+`</div>`;
    v.innerHTML=h; return;
  }

  /* the categories */
  h+=`<div class="crumb" onclick="go('home')">← Academy</div>`+academySibs('recipes');
  h+=_recSearchBox('Search a recipe or an ingredient…');
  if(!all.length){
    h+=`<div class="card" style="padding:30px;text-align:center"><span class="muted">No recipes loaded yet.</span></div>`;
    v.innerHTML=h+_recImportBox(); return;
  }
  const groups={};
  all.forEach(o=>{ const g=o.d.type||'Other'; (groups[g]=groups[g]||[]).push(o); });
  const names=Object.keys(groups).sort((a,b)=>groups[b].length-groups[a].length);
  h+=`<div class="grid">`+names.map((n,i)=>{
    const t=_recTone(n), c=groups[n].length;
    return `<div class="card tile" onclick="recipeCat('${esc(n).replace(/'/g,"\\'")}')">
      <div class="tile-top" style="background:${t.g}">
        ${_recIcon(t.ic,34,'#fff',.97)}
        <span style="position:absolute;right:-12px;bottom:-16px;line-height:0">${_recIcon(t.ic,82,'#fff',.11)}</span>
      </div>
      <div class="tile-body">
        <div class="tile-title">${esc(n)}</div>
        <div class="tile-sub">${c} recipe${c===1?'':'s'}</div>
      </div></div>`;
  }).join('')+`</div>`;
  h+=_recImportBox();
  v.innerHTML=h;
}

function _recRow(o,showCat){
  const n=(o.d.ing||[]).length;
  const y=(o.d.yield&&o.d.yield!=1)?` · makes ${_qty(o.d.yield)} ${_unitLbl(o.d.unit,o.d.yield)}`:'';
  return `<div class="lesson-row" style="cursor:pointer" onclick="recipeShow(${o.id})">
    <div style="flex:1;min-width:0">
      <div style="font-weight:500">${esc(o.name)}</div>
      <div class="faint" style="font-size:12.5px">${showCat?esc(o.d.type||'Other')+' · ':''}${n} ingredient${n===1?'':'s'}${y}</div>
    </div><i class="ti ti-chevron-right" style="opacity:.45"></i></div>`;
}

function _renderOneRecipe(v,o){
  const d=o.d, t=_recTone(d.type||'');
  const ing=(d.ing||[]).slice().sort((a,b)=>(a.p||0)-(b.p||0));
  let h=`<div class="crumb" onclick="recipeCat('${esc(d.type||'').replace(/'/g,"\\'")}')">← ${esc(d.type||'Recipes')}</div>`;
  h+=`<div class="card" style="padding:0;overflow:hidden">
    <div style="height:8px;background:${t.g}"></div>
    <div style="padding:22px 24px 6px">
      <div style="font-weight:800;font-size:23px;letter-spacing:-.022em;line-height:1.2">${esc(o.name)}</div>
      <div class="muted" style="font-size:14px;margin-top:6px">
        ${d.yield?`Makes ${_qty(d.yield)} ${_unitLbl(d.unit,d.yield)}`:''}${d.yield&&ing.length?' · ':''}${ing.length?ing.length+' ingredient'+(ing.length===1?'':'s'):''}
      </div>
    </div>`;
  if(ing.length){
    h+=`<div style="padding:16px 24px 24px">
      <div style="font-family:inherit;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);font-weight:600;padding-bottom:8px;border-bottom:1px solid var(--line)">What goes in</div>`;
    ing.forEach((i,k)=>{
      h+=`<div style="display:flex;gap:16px;align-items:baseline;padding:13px 0;${k<ing.length-1?'border-bottom:1px solid var(--line)':''}">
        <div style="min-width:112px;text-align:right;font-weight:600;font-size:15px;font-variant-numeric:tabular-nums;letter-spacing:-.01em">${esc(_qty(i.q))} <span style="font-weight:400;color:var(--ink2)">${esc(_unitLbl(i.u,i.q))}</span></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:16px;line-height:1.35">${esc(i.n||'')}</div>
          ${i.note?`<div class="muted" style="font-size:13px;margin-top:2px">${esc(i.note)}</div>`:''}
        </div></div>`;
    });
    h+=`</div>`;
  } else {
    h+=`<div style="padding:8px 24px 24px" class="muted">MarginEdge has no ingredients listed for this one.</div>`;
  }
  h+=`</div>`;
  v.innerHTML=h;
}

function _recImportBox(){
  if(myRank()<4) return '';
  return `<div class="card" style="padding:13px 15px;margin-top:18px">
    <div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">
      <div style="flex:1;min-width:190px">
        <div style="font-weight:600;font-size:13.5px">Refresh from MarginEdge</div>
        <div class="faint" style="font-size:12.5px;margin-top:3px;line-height:1.5">Run the pull script, then choose <b>both</b> files from <b>recipes-export</b>. Re-loading updates what changed &mdash; it never makes duplicates.</div>
      </div>
      <input type="file" id="recFiles" accept=".json,application/json" multiple onchange="recFilesPicked()" style="font-size:13px;max-width:230px"/>
      <button class="btn" style="width:auto" onclick="recipesImport()">Load</button>
    </div>
    <div id="recImportMsg"></div>
  </div>`;
}
function _recFocus(){ const si=document.getElementById('recSearch'); if(si&&state.ctx.q){ si.focus(); si.setSelectionRange(si.value.length,si.value.length); } }

window.recipeSearch=function(t){ state.ctx.q=t; state.ctx.rid=null; _renderRecipes(document.getElementById('view')); };
window.recipeCat=function(c){ state.ctx.rcat=c||null; state.ctx.rid=null; state.ctx.q=''; scrollTo(0,0); _renderRecipes(document.getElementById('view')); };
window.recipeShow=function(id){ state.ctx.rid=id; scrollTo(0,0); _renderRecipes(document.getElementById('view')); };

window.recFilesPicked=function(){
  const f=document.getElementById('recFiles'), m=document.getElementById('recImportMsg');
  if(!f||!m) return;
  const names=Array.from(f.files||[]).map(x=>x.name);
  if(!names.length){ m.innerHTML=''; return; }
  const missing=[];
  if(!names.some(n=>/recipes\.json$/i.test(n))) missing.push('recipes.json');
  if(!names.some(n=>/ingredients\.json$/i.test(n))) missing.push('recipeIngredients.json');
  m.innerHTML = missing.length
    ? `<div class="msg err" style="margin-top:9px">Still need ${esc(missing.join(' and '))}.</div>`
    : `<div class="msg ok" style="margin-top:9px">Both files ready. Press Load.</div>`;
};

/* Identity is MarginEdge's recipeId, kept in detail, so loading the same export twice
   updates rather than duplicates. Nothing is deleted -- a recipe dropped in MarginEdge
   simply stops being updated here. */
window.recipesImport=async function(){
  const msg=document.getElementById('recImportMsg');
  const say=(t,bad)=>{ if(msg) msg.innerHTML=`<div class="msg ${bad?'err':'ok'}" style="margin-top:9px">${esc(t)}</div>`; };
  const f=document.getElementById('recFiles');
  const files=(f&&f.files)?Array.from(f.files):[];
  if(!files.length){ say('Pick both files first.',true); return; }

  let recs=null, ings=null;
  for(const file of files){
    let parsed; try{ parsed=JSON.parse(await file.text()); }catch(e){ say('Could not read '+file.name+' — '+e.message,true); return; }
    const arr=Array.isArray(parsed)?parsed:(Object.values(parsed).find(x=>Array.isArray(x))||[]);
    if(arr.length && arr[0] && arr[0].ingredientName!==undefined) ings=arr;
    else if(arr.length && arr[0] && arr[0].recipeName!==undefined) recs=arr;
  }
  if(!recs){ say('No recipes file in that selection.',true); return; }
  say('Reading '+recs.length+' recipes…');

  const byRecipe={};
  (ings||[]).forEach(i=>{ (byRecipe[i.recipeId]=byRecipe[i.recipeId]||[]).push({
    n:i.ingredientName, q:i.quantity, u:i.unit, p:i.ingredientPosition,
    note:(i.notes||'')||undefined, sub:i.subRecipeId||undefined }); });

  const ex=await sb.from('day_items').select('id,detail').eq('kind','recipe');
  const seen={};
  (ex.data||[]).forEach(row=>{ try{ const d=JSON.parse(row.detail||'{}'); if(d.rid) seen[d.rid]=row.id; }catch(e){} });

  const pack=r=>JSON.stringify({
    rid:r.recipeId, type:r.recipeTypeName||'Other', cat:r.recipeCategoryType,
    yield:r.yieldQuantity, unit:r.unit, inactive:!!r.isInactive, ing:byRecipe[r.recipeId]||[] });

  const toAdd=[], toUpd=[];
  recs.forEach(r=>{
    const detail=pack(r);
    if(seen[r.recipeId]) toUpd.push({id:seen[r.recipeId],detail});
    else toAdd.push({kind:'recipe',on_date:null,title:(r.recipeName||'Untitled').slice(0,140),detail,created_by:state.user.id});
  });

  try{
    for(let i=0;i<toAdd.length;i+=50){
      const e=await sb.from('day_items').insert(toAdd.slice(i,i+50));
      if(e&&e.error) throw e.error;
      say('Adding… '+Math.min(i+50,toAdd.length)+' of '+toAdd.length);
    }
    for(let i=0;i<toUpd.length;i++){
      const e=await sb.from('day_items').update({detail:toUpd[i].detail}).eq('id',toUpd[i].id);
      if(e&&e.error) throw e.error;
      if(i%25===0) say('Updating… '+i+' of '+toUpd.length);
    }
  }catch(e){ say('Stopped: '+e.message,true); return; }

  say(`Done — ${toAdd.length} new, ${toUpd.length} updated.`);
  state._recipes=null; state._recipeCount=null; state._recToneMap=null;
  await vRecipes(document.getElementById('view'));
};
