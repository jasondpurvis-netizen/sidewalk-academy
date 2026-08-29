
function vAcat(v){
  const cat=(state.ctx&&state.ctx.cat)||'development';
  const isOps=cat==='operations';
  const label=isOps?'Operations & How-To':'Leadership & Development';
  setTitle(label, isOps?'Station procedures and how-to':'Leadership, decisions, and ownership');
  const list=visibleTracks().filter(t=> isOps ? t.category==='operations' : (t.category||'development')!=='operations');
  const _tcard=t=>{ const done=trackDone(t.id); const ls=trackLessons(t.id); const dn=ls.filter(l=>isDone(l.id)).length; const pct=trackPct(t.id);
    return `<div class="card" style="padding:0;overflow:hidden;cursor:pointer" onclick="go('track',{tid:'${t.id}'})">${trackBanner(t,pct,done)}<div style="padding:15px 17px 17px"><div style="font-weight:600;font-size:15.5px;margin:0 0 3px">${esc(t.name)}</div><div class="muted" style="font-size:12.5px;margin-bottom:11px">${done?esc(t.cert):dn+' of '+ls.length+' modules'}</div><div class="bar"><i style="width:${pct}%"></i></div></div></div>`; };
  let h=`<div class="crumb" onclick="go('home')">← Academy</div>`;
  h+=`<div style="position:relative;margin:0 0 16px"><i class="ti ti-search" style="position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:15.5px;pointer-events:none"></i><input id="acatSearch" type="search" autocomplete="off" oninput="acatFilter()" placeholder="Search ${esc(label)} — a station, a step, a word…" style="width:100%;padding:12px 14px 12px 38px;border:1px solid var(--line2);border-radius:12px;background:var(--card);color:var(--ink);font-family:inherit;font-size:14px"/></div>`;
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
function vTrack(v){
  const t=state.tracks.find(x=>x.id===state.ctx.tid); if(!t){ go("home"); return; }
  setTitle(t.name, `${trackLessons(t.id).length} modules · earns ${t.cert}`);
  const _bk=t.category==='operations'?'operations':'development'; const _bl=_bk==='operations'?'Operations & How-To':'Leadership & Development';
  let h=`<div class="crumb" onclick="go('acat',{cat:'${_bk}'})">← ${_bl}</div><div class="card">`;
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
  if((t.category||'development')!=='operations') main+=`<div class="card" style="padding:18px 20px;margin-top:24px"><div style="font-weight:600;margin-bottom:4px">📓 Your reflection</div><div class="muted" style="font-size:14px;margin-bottom:10px">Answer this module's questions here. It saves to your journal for your next conversation.</div><textarea id="jr" onblur="saveJournal('${l.id}')" style="width:100%;min-height:130px;padding:12px 13px;border:1px solid var(--line2);border-radius:8px;font-size:14px;font-family:inherit;line-height:1.65;color:var(--ink);background:var(--card)" placeholder="Write your thoughts...">${esc(state.responses[l.id]||'')}</textarea><div class="row" style="margin-top:9px"><button class="btn pri" style="width:auto" onclick="saveJournal('${l.id}')">Save reflection</button><span class="muted" id="jrmsg" style="font-size:12.5px"></span></div></div>`;
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
  v.innerHTML=`<div class="muted">Loading…</div>`;
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
  let h=`<div class="card row" style="margin-bottom:18px;align-items:stretch">${stat(learners.length,'On the team','var(--ink)')}<div style="width:1px;background:var(--line)"></div>${stat(nNew,'Not started','var(--amber)')}<div style="width:1px;background:var(--line)"></div>${stat(nTrain,'In training','var(--brand)')}<div style="width:1px;background:var(--line)"></div>${stat(nCert,'Certified','var(--green)')}</div>`;
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
  if(!state.community){ v.innerHTML=`<div class="muted">Loading…</div>`; const [p,c,m,rx,rd,pf,cd]=await Promise.all([ sb.from('posts').select('*').order('created_at',{ascending:false}), sb.from('comments').select('*').order('created_at'), sb.from('channel_modes').select('*'), sb.from('reactions').select('*'), sb.from('channel_reads').select('*').eq('user_id',state.user.id), sb.from('profiles').select('id,name,avatar_url'), sb.from('day_items').select('title,detail').eq('kind','chandef') ]); const chandefs=(cd.data||[]).map(r=>{ try{ const d=typeof r.detail==='string'?JSON.parse(r.detail||'{}'):(r.detail||{}); d.id=d.id||r.title; return d; }catch(e){ return null; } }).filter(x=>x&&x.id); state.community={posts:p.data||[],comments:c.data||[],modes:m.data||[],reactions:rx.data||[],reads:rd.data||[],profiles:pf.data||[],chandefs}; }
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
  if(canPost) h+=`<div class="card" style="padding:14px 15px;margin-bottom:18px"><textarea id="np" spellcheck="true" autocorrect="on" autocapitalize="sentences" placeholder="${ph}" style="width:100%;min-height:66px;padding:11px;border:1px solid var(--line2);border-radius:8px;font-size:14px;font-family:inherit;line-height:1.6;color:var(--ink);background:var(--card)"></textarea><div id="npprev" style="margin-top:9px"></div><div class="row" style="margin-top:9px"><select id="npkudos" style="width:100%;padding:8px 10px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;font-size:14px"><option value="">👏 Recognize a teammate (optional)…</option>${(state.community.profiles||[]).filter(x=>x.name).map(x=>`<option value="${esc(x.name)}">${esc(x.name)}</option>`).join('')}</select></div><div class="row" style="margin-top:9px;gap:8px"><input type="file" id="npfile" accept="image/*,video/*" style="display:none" onchange="pickMedia(this)"/><button class="btn" style="width:auto" onclick="document.getElementById('npfile').click()"><i class="ti ti-photo"></i> Photo / Video</button><button class="btn pri" id="postbtn" style="width:auto;margin-left:auto" onclick="postNew()">Post to ${esc(cur.label)}</button></div></div>`;
  else h+=`<div class="card" style="padding:13px 16px;margin-bottom:18px"><div class="muted" style="font-size:14px">📣 Announcements are posted by leadership — check here for important updates.</div></div>`;
  if(!posts||!posts.length) h+=`<div class="card" style="padding:34px;text-align:center"><div style="font-size:26px;margin-bottom:8px">💬</div><div class="muted" style="font-size:14px">Nothing here yet.${canPost?' Start the conversation.':''}</div></div>`;
  else h+=posts.map(p=>{
    const cs=cBy[p.id]||[];
    return `<div class="card" style="padding:15px 17px;margin-bottom:12px"><div class="row" style="gap:10px;margin-bottom:9px"><div style="width:34px;height:34px;border-radius:50%;overflow:hidden;background:#EFE9E2;color:#7a6f63;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0">${(function(){var pr=(state.community.profiles||[]).find(function(x){return x.id===p.author_id;});return pr&&pr.avatar_url&&pr.name===p.author_name?'<img src="'+pr.avatar_url+'" style="width:100%;height:100%;object-fit:cover"/>':esc((p.author_name||'?').charAt(0).toUpperCase());})()}</div><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(p.author_name||'Someone')}</div><div class="faint" style="font-size:12.5px">${timeAgo(p.created_at)}${p.edited?' · edited':''}</div></div><button onclick="markUnreadFrom(${p.id})" class="no-print" title="Mark unread from here — flags it so you come back to it" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:15.5px;line-height:1;align-self:flex-start"><i class="ti ti-bookmark"></i></button>${(((state.profile||{}).name||'').trim().toLowerCase()===((p.author_name||'').trim().toLowerCase()))?`<button onclick="editPost(${p.id})" class="no-print" title="Edit" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:12.5px;align-self:flex-start">Edit</button>`:''}${(p.author_id===state.user.id||isAdmin)?`<button onclick="delPostC(${p.id})" class="no-print" title="Delete" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:15.5px;line-height:1;align-self:flex-start">×</button>`:''}</div>${p.recognized_name?`<div style="display:flex;align-items:center;gap:8px;background:#FFF7E0;border:1px solid #F0D98A;border-radius:8px;padding:8px 11px;margin-bottom:8px"><span style="font-size:15.5px">👏</span><span style="font-size:14px;font-weight:700;color:#8A5A00">Shout-out to ${esc(p.recognized_name)}</span></div>`:''}<div class="muted" style="line-height:1.55;white-space:pre-wrap">${linkifyTags(p.body)}</div>`+
      (cs.length?`<div style="margin-top:10px;border-top:1px solid var(--line)">`+cs.map(c=>`<div style="padding:9px 0 0"><span style="font-weight:600;font-size:14px">${esc(c.author_name||'Someone')}</span> <span class="muted" style="font-size:14px;white-space:pre-wrap">${esc(c.body)}</span>${(((state.profile||{}).name||'').trim().toLowerCase()===((c.author_name||'').trim().toLowerCase()))?` <button onclick="editComment(${c.id})" class="no-print" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:12.5px">edit</button>`:''}${(c.author_id===state.user.id||isAdmin)?`<button onclick="delComment(${c.id})" class="no-print" title="Delete" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:14px;line-height:1">×</button>`:''}</div>`).join('')+`</div>`:``)+
      `${p.media_url?(p.media_type==='video'?`<video src="${p.media_url}" controls playsinline style="width:100%;max-height:420px;margin-top:11px;border-radius:12px;background:#000"></video>`:`<img src="${p.media_url}" loading="lazy" style="width:100%;margin-top:11px;border-radius:12px;display:block"/>`):''}`+
      reactionBar(p)+
      ((twoWay||isAdmin)?`<div class="row" style="margin-top:11px;gap:8px"><input id="rc${p.id}" spellcheck="true" autocorrect="on" autocapitalize="sentences" placeholder="Reply…" style="flex:1;padding:8px 11px;border:1px solid var(--line2);border-radius:8px;font-size:14px;font-family:inherit;color:var(--ink);background:var(--card)" onkeydown="if(event.key==='Enter')commentNew(${p.id})"/><button class="btn" style="width:auto" onclick="commentNew(${p.id})">Reply</button></div>`:`<div class="faint" style="margin-top:10px;font-size:12.5px;font-style:italic;border-top:1px solid var(--line);padding-top:9px">📣 One-way channel — replies are off here.</div>`)+`</div>`;
  }).join('');
  v.innerHTML=h;
}
window.toggleChannelMode=async function(ch,tw){ await sb.from('channel_modes').upsert({channel:ch, two_way:tw, updated_at:new Date().toISOString()}); state.community=null; go('community',{ch}); };
// ── Owner channel manager: add / rename / reorder / hide / who-sees / who-posts. Persists to day_items kind 'chandef'. Hiding never deletes posts.
window.manageChannels=function(){ const all=effectiveChannels(); window._chanEdit=all.map(c=>({id:c.id,label:c.label,announceOnly:!!c.announceOnly,memberVisible:!!c.memberVisible,icon:c.icon||'ti-hash',hidden:!!c.hidden,builtin:!!c.builtin})); renderChanManager(); };