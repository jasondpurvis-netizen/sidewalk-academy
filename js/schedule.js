
function lawRules(){ const j=(state.settings&&state.settings.law_jurisdiction)||'AZ'; return LAW_RULES[j]||LAW_RULES.AZ; }
const LAW_OPTS=[['US','United States — federal minimum'],['AZ','Arizona'],['CA','California'],['LA','Los Angeles, CA'],['SF','San Francisco, CA'],['Emeryville','Emeryville, CA'],['OR','Oregon'],['Seattle','Seattle, WA'],['NYC','New York City'],['Chicago','Chicago, IL']];
window.POSCOL=v=>POS_COL[v]||'#94A3B8';
async function loadPositions(){ const r=await sb.from('day_items').select('title,detail').eq('kind','pos'); const m={}; (r.data||[]).forEach(x=>{ if(x.title) m[x.title]=x.detail||'Unassigned'; }); window._posMap=m; return m; }
function posOf(name){ return (window._posMap&&window._posMap[name])||'Unassigned'; }
function rosterNames(){ return Object.keys(window._posMap||{}).filter(n=>n&&posOf(n)!=='Owner'&&!isArchived(n)); } // owner-added team only — people who merely log in never auto-appear on the roster
async function loadArchived(){ const r=await sb.from('day_items').select('title').eq('kind','archived'); const s=new Set(); (r.data||[]).forEach(x=>{ if(x.title) s.add(x.title); }); window._archived=s; return s; }
function isArchived(name){ return !!(window._archived&&window._archived.has(name)); }
async function loadDates(){ const r=await sb.from('day_items').select('title,detail').eq('kind','profile'); const m={}; (r.data||[]).forEach(x=>{ if(x.title){ try{m[x.title]=JSON.parse(x.detail||'{}');}catch(e){m[x.title]={};} } }); window._profiles=m; const pd={}; Object.keys(m).forEach(n=>{ pd[n]={bday:m[n].bday||'',hired:m[n].hired||''}; }); window._pdates=pd; return pd; }
async function loadProfiles(){ return loadDates(); }
function profileOf(name){ return (window._profiles&&window._profiles[name])||{}; }
function _nextOccur(mm,dd){ const t=new Date(); t.setHours(0,0,0,0); const y=t.getFullYear(); let d=new Date(y,mm-1,dd); d.setHours(0,0,0,0); if(d<t) d=new Date(y+1,mm-1,dd); return d; }
function _daysUntil(d){ const t=new Date(); t.setHours(0,0,0,0); return Math.round((d-t)/86400000); }
function upcomingCelebrations(within){ within=(within==null?7:within); const m=window._pdates||{}; const out=[];
  Object.keys(m).forEach(name=>{ if(isArchived(name))return; const p=m[name]||{};
    if(p.bday){ const a=p.bday.split('-').map(Number); if(a.length===2){ const d=_nextOccur(a[0],a[1]); const du=_daysUntil(d); if(du>=0&&du<=within) out.push({name,type:'Birthday',emoji:'🎂',date:d,days:du}); } }
    if(p.hired){ const a=p.hired.split('-').map(Number); if(a.length===3){ let bad=false; const dob=(profileOf(name)||{}).dob; if(dob&&dob.length>=4&&a[0]<=(+dob.slice(0,4))+12) bad=true; /* "hired" before ~age 13 = it's really their birthdate in the hire field */ if(p.bday){ const b=p.bday.split('-').map(Number); if(b.length===2&&b[0]===a[1]&&b[1]===a[2]) bad=true; } /* hire date == birthday → bad data */ const d=_nextOccur(a[1],a[2]); const du=_daysUntil(d); const years=d.getFullYear()-a[0]; if(!bad&&du>=0&&du<=within&&years>=1&&years<=60) out.push({name,type:'Work anniversary',emoji:'🎉',date:d,days:du,years}); } }
  });
  return out.sort((a,b)=>a.days-b.days);
}
function celebLabel(c){ const when=c.days===0?'today':c.days===1?'tomorrow':'in '+c.days+' days'; return c.type==='Work anniversary'?(esc(c.name)+' — '+c.years+'-year work anniversary '+when):(esc(c.name)+"'s birthday "+when); }
window.openArchive=function(name,editId){
  const cur = editId!=null ? (window._archMap&&window._archMap[editId]) : null; const d=cur?cur.d:{};
  let m=document.getElementById('archm'); if(m)m.remove();
  const reasons=['Quit','Terminated','Laid off / seasonal','Job abandonment (no-show)','Mutual','Other'];
  const rehires=[['','— not set —'],['Eligible','Eligible for rehire'],['Conditional','Conditional — case by case'],['No','Do not rehire']];
  m=document.createElement('div'); m.id='archm'; m.style.cssText='position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  m.innerHTML=`<div style="background:var(--card);width:100%;max-width:460px;border-radius:16px 16px 0 0;padding:20px 20px 28px;box-shadow:0 -8px 40px rgba(0,0,0,.22)"><div style="font-weight:700;font-size:16px">${cur?'Edit record':'No longer employed'}</div><div class="faint" style="font-size:12.5px;margin-bottom:15px">${esc(name)} · drops off active views — history stays on record</div><label style="font-size:12px;color:var(--muted)">Reason for leaving</label><select id="arReason" style="width:100%;padding:11px;margin:4px 0 12px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit">${reasons.map(r=>`<option${d.reason===r?' selected':''}>${r}</option>`).join('')}</select><label style="font-size:12px;color:var(--muted)">Rehire status</label><select id="arRehire" style="width:100%;padding:11px;margin:4px 0 12px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit">${rehires.map(o=>`<option value="${o[0]}"${d.rehire===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select><label style="font-size:12px;color:var(--muted)">Notes — why they left, anything a future you should know</label><textarea id="arNotes" placeholder="e.g. Great closer, left for school. Would take back in a heartbeat." style="width:100%;min-height:84px;padding:11px;margin:4px 0 2px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit;font-size:14px;line-height:1.5">${esc(d.notes||'')}</textarea><div class="faint" style="font-size:12.5px;margin:14px 0 2px;line-height:1.5">Their upcoming shifts come off the schedule automatically. Past shifts stay on the record.</div><div class="row" style="gap:8px;margin-top:14px"><button class="btn" style="width:auto;margin-left:auto" onclick="document.getElementById('archm').remove()">Cancel</button><button class="btn pri" style="width:auto" onclick='doArchive(${JSON.stringify(name)},${editId!=null?editId:'null'})'>${cur?'Save':'Archive'}</button></div></div>`;
  document.body.appendChild(m); m.addEventListener('click',e=>{if(e.target===m)m.remove();});
};
window.doArchive=async function(name,editId){ const reason=(document.getElementById('arReason')||{}).value||''; const rehire=(document.getElementById('arRehire')||{}).value||''; const notes=((document.getElementById('arNotes')||{}).value||'').trim(); const prev=(editId!=null&&window._archMap&&window._archMap[editId])?window._archMap[editId].d:{}; const detail=JSON.stringify(Object.assign({},prev,{reason,rehire,notes,date:prev.date||isoDate(new Date())})); if(editId!=null){ await sb.from('day_items').update({detail}).eq('id',editId); } else { await sb.from('day_items').insert({kind:'archived',title:name,on_date:null,detail,created_by:state.user.id}); if(window._archived)window._archived.add(name); }
  // Someone who has left comes off the schedule. Not optional: an owner offboarding a person has already
  // thought about coverage, and an unchecked box would just leave phantom shifts behind.
  let _removed=0;
  if(editId==null){ try{ const _d=await sb.from('shifts').delete().gte('on_date',isoDate(new Date())).eq('person_name',name).select(); _removed=(_d&&_d.data)?_d.data.length:0; }catch(e){} }
  const m=document.getElementById('archm'); if(m)m.remove();
  if(_removed>0) alert(name+' is off the team, and '+_removed+' upcoming shift'+(_removed>1?'s were':' was')+' removed from the schedule.\n\nCheck the schedule for gaps to cover.'); state.ctx.obtab='former'; state.ctx.ttab='former'; _reRenderPeople(); };
// Catches anyone already archived who still has shifts on the board (e.g. offboarded before this existed).
window.clearFormerShifts=async function(){
  const arch=[...((window._archived)||[])]; if(!arch.length) return;
  if(!confirm('Remove all upcoming shifts for people who are no longer employed?\n\nThis only affects today onward. Past shifts stay on the record.')) return;
  const r=await sb.from('shifts').delete().gte('on_date',isoDate(new Date())).in('person_name',arch);
  if(r&&r.error){ alert('Could not remove those shifts: '+r.error.message); return; }
  if(typeof schRefresh==='function') schRefresh();
};
window.restorePerson=async function(name){
  if(!confirm('Bring '+name+' back to your active roster?\n\nThey move off the Former list and onto your team. Their leaving notes will be removed.')) return;
  // preserve their old position (if any was saved in the archive) so we can put them back where they belong
  let pos=''; try{ const ar=await sb.from('day_items').select('detail').eq('kind','archived').eq('title',name).maybeSingle(); if(ar.data&&ar.data.detail){ const d=JSON.parse(ar.data.detail||'{}'); if(d.pos)pos=d.pos; } }catch(e){}
  await sb.from('day_items').delete().eq('kind','archived').eq('title',name); if(window._archived)window._archived.delete(name);
  // make sure they actually appear somewhere: if there is no position record for them, give them one so they show on the roster instead of vanishing
  try{ const rp=await sb.from('day_items').select('id').eq('kind','pos').eq('title',name).maybeSingle(); if(!rp.data){ const p=pos||'Team Member'; await sb.from('day_items').insert({kind:'pos',title:name,detail:p,on_date:null,created_by:state.user.id}); if(window._posMap)window._posMap[name]=p; } }catch(e){}
  _reRenderPeople();
};
function _reRenderPeople(){ const v=document.getElementById('view'); if(state.page==='schedule') vSchedule(v); else if(state.page==='onboarding') vOnboarding(v); else vTeam(v); }
window.openProfile=function(name){
  const p=profileOf(name); const pos=posOf(name);
  const myRoles=Array.isArray(p.roles)?p.roles:[];
  const _baseStations=(state.settings&&Array.isArray(state.settings.stations)&&state.settings.stations.length)?state.settings.stations:['Bake / Prep','Register','Bar / Espresso'];
  const STATIONS=[...new Set([..._baseStations, ...myRoles])]; // always show anything this person already has checked, even if it's since left the restaurant's list — never silently drop a selection
  const DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; const myDaysOff=Array.isArray(p.daysOff)?p.daysOff:[]; const dayOffBoxes=DOW.map((d,i)=>`<label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;background:var(--bg);border:1px solid var(--line2);border-radius:8px;padding:6px 9px;cursor:pointer"><input type="checkbox" class="prDayOff" value="${i}" ${myDaysOff.indexOf(i)>=0?'checked':''}/> ${d}</label>`).join('');
  const stationBoxes=STATIONS.map(s=>`<label style="display:inline-flex;align-items:center;gap:7px;font-size:13px;background:var(--bg);border:1px solid var(--line2);border-radius:8px;padding:7px 11px;cursor:pointer"><input type="checkbox" class="prRoleCb" value="${esc(s)}" ${myRoles.includes(s)?'checked':''}/> ${esc(s)}</label>`).join('');
  const F=(id,lbl,type,val,ph)=>`<div style="flex:1;min-width:120px"><label style="font-size:11px;color:var(--muted)">${lbl}</label><input id="${id}" type="${type||'text'}" value="${val?esc(String(val)):''}" placeholder="${ph||''}" style="width:100%;padding:9px 10px;margin-top:3px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;font-size:14px"/></div>`;
  let m=document.getElementById('prm'); if(m)m.remove();
  m=document.createElement('div'); m.id='prm'; m.style.cssText='position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  m.innerHTML=`<div style="background:var(--card);width:100%;max-width:520px;border-radius:16px 16px 0 0;padding:20px 20px 26px;box-shadow:0 -8px 40px rgba(0,0,0,.22);max-height:88vh;overflow:auto"><div style="font-weight:700;font-size:17px">${esc(name)}</div><div class="faint" style="font-size:12.5px;margin-bottom:14px">Profile — kept on record</div><label style="font-size:11px;color:var(--muted)">Position</label><select id="prPos" style="width:100%;padding:10px;margin:3px 0 6px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit">${POS_PICK.map(o=>`<option${o===pos?' selected':''}>${o}</option>`).join('')}</select><div class="sec" style="margin-top:6px">Dates</div><div class="row" style="gap:10px;flex-wrap:wrap">${F('prBday','Birthday','date',p.bday?('2000-'+p.bday):'')}${F('prHired','Hire date','date',p.hired||'')}</div><div class="sec">Contact</div><div class="row" style="gap:10px;flex-wrap:wrap">${F('prMobile','Mobile phone','tel',p.mobile,'(555) 555-5555')}${F('prHome','Home phone','tel',p.home)}</div><div class="row" style="gap:10px;flex-wrap:wrap;margin-top:8px">${F('prAddr','Address','text',p.address)}</div><div class="row" style="gap:10px;flex-wrap:wrap;margin-top:8px">${F('prCity','City','text',p.city)}${F('prState','State','text',p.state)}${F('prZip','Zip','text',p.zip)}</div><div class="sec">Emergency contact</div><div class="row" style="gap:10px;flex-wrap:wrap">${F('prEcName','Name','text',p.ec_name)}${F('prEcPhone','Phone','tel',p.ec_phone)}</div><div class="sec">Pay</div><div class="row" style="gap:10px;flex-wrap:wrap">${F('prWage','Hourly wage ($)','number',p.wage,'0.00')}</div><div class="sec">Scheduling rules</div><div class="faint" style="font-size:12px;margin:-4px 0 8px">The stuff a good manager keeps in their head. The auto-draft follows every rule you set here. Leave blank for none.</div><div style="margin-bottom:10px"><label style="font-size:11px;color:var(--muted)">Scheduling priority — who gets their hours first</label><select id="prPriority" style="width:100%;padding:9px 10px;margin-top:3px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;font-size:14px">${[['1','1 · First — protect their hours'],['2','2 · High'],['3','3 · Normal'],['4','4 · Backup — fills gaps last']].map(o=>`<option value="${o[0]}"${String(p.priority||(pos==='Trainee'?'4':'3'))===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select></div><div style="margin-bottom:10px"><label style="font-size:11px;color:var(--muted)">Time of day they fit best — your call, not theirs</label><select id="prTimePref" style="width:100%;padding:9px 10px;margin-top:3px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;font-size:14px">${[['','No preference'],['early','Better in the mornings — lean early'],['late','Better later — lean closing']].map(o=>`<option value="${o[0]}"${(p.timePref||'')===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select></div><div class="row" style="gap:10px;flex-wrap:wrap">${F('prSalary','Salary / year','number',p.salary,'e.g. 55000')}${F('prMaxDays','Max days / week','number',p.maxDays,'e.g. 5')}${F('prMaxRun','Most days in a row','number',p.maxRun,'e.g. 2')}${F('prMaxShift','Longest shift (hrs)','number',p.maxShift,'e.g. 8')}</div><div class="row" style="gap:10px;flex-wrap:wrap;margin-top:8px">${F('prMinHrs','Min hours / week','number',p.minHrs,'e.g. 36')}${F('prMaxHrs','Max hours / week','number',p.maxHrs,'e.g. 40')}</div><div style="margin-top:10px"><label style="font-size:11px;color:var(--muted)">Days off — the draft will never schedule these</label><div class="faint" style="font-size:11.5px;margin:2px 0 7px">Hard rule. The draft will not put them on these days for any reason. You can still add a shift by hand if they agree to cover.</div><div style="display:flex;flex-wrap:wrap;gap:6px">${dayOffBoxes}</div></div>${myRoles.length?`<div style="margin-top:12px"><label style="font-size:11px;color:var(--muted)">Skill day limits <span class="faint" style="font-weight:400">— trained, but not on certain days</span></label><div class="faint" style="font-size:11.5px;margin:2px 0 8px">Check the days to keep them <b>off</b> a station (e.g. off the bar on busy Saturdays). The draft still uses them elsewhere those days.</div>`+myRoles.map(st=>{ const ex=(p.skillDays&&Array.isArray(p.skillDays[st]))?p.skillDays[st]:[]; return `<div style="margin-bottom:8px"><div style="font-size:12.5px;font-weight:600;margin-bottom:4px">${esc(st)}</div><div style="display:flex;flex-wrap:wrap;gap:5px">`+DOW.map((d,i)=>`<label style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;background:var(--bg);border:1px solid var(--line2);border-radius:7px;padding:5px 8px;cursor:pointer"><input type="checkbox" class="prSkillDay" data-st="${esc(st)}" value="${i}" ${ex.indexOf(i)>=0?'checked':''}/> ${d}</label>`).join('')+`</div></div>`; }).join('')+`</div>`:''}<div class="faint" style="font-size:11.5px;margin-top:12px;padding:9px 11px;background:var(--bg);border-radius:8px">Stations, skill level, and can open / can close are all set on the <b style="color:var(--brand);cursor:pointer" onclick="document.getElementById('prm').remove();state.ctx.ttab='skills';go('team')">Team → Skills</b> grid — one place to see and set everyone at once.</div><div class="faint" style="font-size:11.5px;margin-top:10px;padding:8px 10px;background:var(--bg);border-radius:8px">Minor status is detected automatically from their birthday — hour caps and curfew limits then apply on their own.</div>${canCorract()?`<div style="margin-top:14px"><button class="btn" style="width:100%;justify-content:center;gap:7px" onclick='document.getElementById("prm").remove();openCorract(${JSON.stringify(name)})'><i class="ti ti-flag"></i> Corrective actions</button></div>`:''}<div class="row" style="gap:8px;margin-top:18px;flex-wrap:wrap"><button class="btn" style="width:auto;color:#A32D2D;border-color:#F0C9C9" onclick='document.getElementById("prm").remove();openArchive(${JSON.stringify(name)})'>No longer employed</button><button class="btn" style="width:auto;margin-left:auto" onclick="prCancel()">Cancel</button><button class="btn pri" style="width:auto" onclick='doProfile(${JSON.stringify(name)})'>Save</button></div></div>`;
  document.body.appendChild(m);
  // unsaved-changes guard: any edit marks the modal dirty; closing it without saving warns first
  m.addEventListener('input',function(){ m._dirty=true; },true);
  m.addEventListener('change',function(){ m._dirty=true; },true);
  m.addEventListener('click',function(e){ if(e.target===m){ if(m._dirty && !confirm('You changed this profile but haven\'t saved it. Discard your changes?')) return; m.remove(); } });
};
window.prCancel=function(){ const m=document.getElementById('prm'); if(!m)return; if(m._dirty && !confirm('You changed this profile but haven\'t saved it. Discard your changes?')) return; m.remove(); };
window.doProfile=async function(name){ const g=id=>((document.getElementById(id)||{}).value||'').trim(); const b=g('prBday'); const prev=profileOf(name)||{}; /* stations, skill levels and caps are edited on the Skills grid — preserve them here */ const detail=JSON.stringify(Object.assign({},prev,{bday:b?b.slice(5):'',hired:g('prHired'),mobile:g('prMobile'),home:g('prHome'),address:g('prAddr'),city:g('prCity'),state:g('prState'),zip:g('prZip'),ec_name:g('prEcName'),ec_phone:g('prEcPhone'),wage:g('prWage'),minHrs:g('prMinHrs'),maxHrs:g('prMaxHrs'),salary:g('prSalary'),maxDays:g('prMaxDays'),maxRun:g('prMaxRun'),maxShift:g('prMaxShift'),priority:g('prPriority'),timePref:((document.getElementById('prTimePref')||{}).value||''),daysOff:[...document.querySelectorAll('.prDayOff')].filter(c=>c.checked).map(c=>+c.value),skillDays:(function(){const o={};document.querySelectorAll('.prSkillDay').forEach(c=>{if(c.checked){const st=c.getAttribute('data-st');(o[st]=o[st]||[]).push(+c.value);}});return o;})()})); await sb.from('day_items').delete().eq('kind','profile').eq('title',name); await sb.from('day_items').insert({kind:'profile',title:name,on_date:null,detail,created_by:state.user.id}); const posv=(document.getElementById('prPos')||{}).value; if(posv) await setPos(name,posv); const w=g('prWage'); if(w) await sb.from('pay_rates').upsert({person_name:name,wage:Number(w)||0,updated_at:new Date().toISOString()}); await loadProfiles(); const m=document.getElementById('prm'); if(m)m.remove(); _reRenderPeople(); };
window.setPos=async function(name,pos){ await sb.from('day_items').delete().eq('kind','pos').eq('title',name); if(pos){ await sb.from('day_items').insert({kind:'pos',title:name,detail:pos,on_date:null,created_by:state.user.id}); } if(window._posMap) window._posMap[name]=pos; };
/* ---------- Corrective actions (private disciplinary record — GM & owner only) ----------
   Stored as day_items kind 'coract', title = person's roster name, on_date = date of the incident,
   detail JSON {type, level, note, by, byName, created}. UI-gated to GM/owner (rank>=4 or admin). */
function canCorract(){ return (state.profile&&state.profile.role==='admin') || (typeof myRank==='function' && myRank()>=4); }
const CORACT_TYPES=[['late','Late / tardy','#B7791F'],['noshow','No-show','#B32D2D'],['performance','Performance','#2563EB'],['policy','Policy / conduct','#7C3AED'],['other','Other','#64748B']];
const CORACT_LEVELS=[['note','Note','#64748B'],['verbal','Verbal warning','#B7791F'],['written','Written warning','#C2410C'],['final','Final warning','#B32D2D']];
function coractType(t){ return CORACT_TYPES.find(o=>o[0]===t)||['other','Other','#64748B']; }
function coractLevel(l){ return CORACT_LEVELS.find(o=>o[0]===l)||['note','Note','#64748B']; }
async function loadCoract(name){ const r=await sb.from('day_items').select('*').eq('kind','coract').eq('title',name); return (r.data||[]).map(x=>{ let d={}; try{ d=typeof x.detail==='string'?JSON.parse(x.detail||'{}'):(x.detail||{}); }catch(e){} return {id:x.id, on_date:x.on_date, type:d.type||'other', level:d.level||'note', note:d.note||'', byName:d.byName||'', created:d.created||''}; }).sort((a,b)=>(b.on_date||'').localeCompare(a.on_date||'')||(b.created||'').localeCompare(a.created||'')); }
function coractFlags(entries){ const cutoff=isoDate(new Date(Date.now()-30*864e5)); const lates30=entries.filter(e=>e.type==='late'&&(e.on_date||'')>=cutoff).length; const hasFinal=entries.some(e=>e.level==='final'); const f=[]; if(lates30>=3)f.push(lates30+' lates in 30 days'); if(hasFinal)f.push('Final warning on file'); return f; }
window.openCorract=async function(name){
  if(!canCorract()){ alert('Corrective actions are limited to the GM and owner.'); return; }
  const entries=await loadCoract(name); await loadPositions(); const pos=posOf(name);
  const flags=coractFlags(entries);
  const list = entries.length ? entries.map(e=>{ const t=coractType(e.type), l=coractLevel(e.level); return `<div style="border:1px solid var(--line2);border-radius:10px;padding:11px 13px;margin-bottom:9px"><div class="row" style="gap:7px;align-items:center;flex-wrap:wrap"><span style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#fff;background:${t[2]};border-radius:6px;padding:2px 8px">${esc(t[1])}</span><span style="font-size:10.5px;font-weight:700;color:${l[2]};border:1px solid ${l[2]};border-radius:6px;padding:2px 8px">${esc(l[1])}</span><span class="faint" style="font-size:12px">${esc(fmtDay(_d(e.on_date)))}</span><button onclick='coractDel(${e.id},${JSON.stringify(name)})' title="Delete" style="margin-left:auto;border:none;background:none;color:var(--muted);cursor:pointer;font-size:14px"><i class="ti ti-trash"></i></button></div><div style="font-size:14px;line-height:1.5;margin-top:7px;white-space:pre-wrap">${esc(e.note)}</div>${e.byName?`<div class="faint" style="font-size:11.5px;margin-top:6px">Logged by ${esc(e.byName)}</div>`:''}</div>`; }).join('') : `<div class="faint" style="font-size:13px;text-align:center;padding:14px">No entries yet.</div>`;
  let m=document.getElementById('cam'); if(m)m.remove();
  m=document.createElement('div'); m.id='cam'; m.style.cssText='position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:10000;display:flex;align-items:flex-end;justify-content:center';
  m.innerHTML=`<div style="background:var(--card);width:100%;max-width:560px;border-radius:16px 16px 0 0;padding:20px 20px 26px;box-shadow:0 -8px 40px rgba(0,0,0,.22);max-height:90vh;overflow:auto"><div class="row" style="align-items:flex-start;gap:10px"><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:17px">${esc(name)}</div><div class="faint" style="font-size:12.5px">Corrective actions &middot; ${esc(pos)} &middot; GM &amp; owner only</div></div><button class="btn" style="width:auto;padding:6px 12px;flex:none" onclick='printCoract(${JSON.stringify(name)})'><i class="ti ti-printer"></i> Print record</button></div>${flags.length?`<div style="margin-top:12px;background:#FCEBEB;border:1px solid #F0C9C9;color:#8A1C1C;border-radius:9px;padding:9px 12px;font-size:12.5px;font-weight:600"><i class="ti ti-flag"></i> ${flags.map(esc).join(' &middot; ')}</div>`:''}<div class="card" style="padding:13px 14px;margin-top:14px;background:var(--bg)"><div style="font-weight:700;font-size:13px;margin-bottom:9px">Log an entry</div><div class="row" style="gap:8px;flex-wrap:wrap"><input id="caDate" type="date" value="${isoDate(new Date())}" style="padding:8px 9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;font-size:13px"/><select id="caType" style="padding:8px 9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;font-size:13px">${CORACT_TYPES.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select><select id="caLevel" style="padding:8px 9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;font-size:13px">${CORACT_LEVELS.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select></div><textarea id="caNote" placeholder="What happened — be specific and factual: what occurred, the impact, and any expectation you set." style="width:100%;min-height:80px;margin-top:8px;padding:10px;border:1px solid var(--line2);border-radius:8px;font-family:inherit;font-size:14px;line-height:1.5;color:var(--ink);background:var(--card);box-sizing:border-box"></textarea><div class="row" style="margin-top:9px"><button class="btn pri" style="width:auto;margin-left:auto" onclick='coractAdd(${JSON.stringify(name)})'>Add entry</button></div></div><div class="sec" style="margin-top:16px">History <span class="faint" style="font-weight:400">&middot; ${entries.length}</span></div>${list}<div class="row" style="margin-top:16px"><button class="btn" style="width:auto;margin-left:auto" onclick="document.getElementById('cam').remove()">Close</button></div></div>`;
  document.body.appendChild(m); m.addEventListener('click',e=>{ if(e.target===m) m.remove(); });
};
window.coractAdd=async function(name){ if(!canCorract())return; const d=(document.getElementById('caDate')||{}).value||isoDate(new Date()); const type=(document.getElementById('caType')||{}).value||'other'; const level=(document.getElementById('caLevel')||{}).value||'note'; const note=((document.getElementById('caNote')||{}).value||'').trim(); if(!note){ alert('Add a description of what happened.'); return; } const detail=JSON.stringify({type,level,note,by:state.user.id,byName:(state.profile&&state.profile.name)||'',created:new Date().toISOString()}); const r=await sb.from('day_items').insert({kind:'coract',title:name,on_date:d,detail,created_by:state.user.id}); if(r&&r.error)return; openCorract(name); };
window.coractDel=async function(id,name){ if(!confirm('Delete this entry? It will be removed from the record.'))return; const r=await sb.from('day_items').delete().eq('id',id); if(r&&r.error)return; openCorract(name); };
window.printCoract=async function(name){ const entries=await loadCoract(name); await loadPositions(); await loadProfiles(); const pos=posOf(name); const p=profileOf(name)||{}; const hired=p.hired||''; const brand=(state.settings&&state.settings.brand_color)||'#4A9CAD'; const shop=(state.settings&&state.settings.academy_name)||'Sidewalk'; const rows=entries.map(e=>`<tr><td>${esc(fmtDay(_d(e.on_date)))}</td><td>${esc(coractType(e.type)[1])}</td><td>${esc(coractLevel(e.level)[1])}</td><td>${esc(e.note).replace(/\n/g,'<br>')}</td><td>${esc(e.byName||'')}</td></tr>`).join(''); const w=window.open('','_blank'); if(!w)return; w.document.write(`<!doctype html><html><head><meta charset=utf-8><title>${esc(name)} — Corrective actions</title><style>@page{margin:.6in}body{font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;font-size:12px;line-height:1.5}h1{font-size:20px;margin:0 0 2px}.sub{color:#555;margin-bottom:14px}.hd{border-bottom:3px solid ${brand};padding-bottom:8px;margin-bottom:14px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:7px 8px;text-align:left;vertical-align:top}th{background:#f2f2f2;font-size:10px;text-transform:uppercase;letter-spacing:.04em}td{font-size:12px}.meta{font-size:11px;color:#666;margin-top:16px}.pbar{position:fixed;top:10px;right:10px}.pbar button{padding:8px 14px;border:0;background:${brand};color:#fff;border-radius:6px;cursor:pointer}@media print{.pbar{display:none}}</style></head><body><div class=pbar><button onclick="window.print()">Print</button></div><div class=hd><h1>Corrective Action Record</h1><div class=sub>${esc(shop)}</div></div><div><b>Employee:</b> ${esc(name)} &nbsp;&middot;&nbsp; <b>Position:</b> ${esc(pos)}${hired?` &nbsp;&middot;&nbsp; <b>Hire date:</b> ${esc(hired)}`:''}</div>${entries.length?`<table><thead><tr><th>Date</th><th>Type</th><th>Level</th><th>Details</th><th>Logged by</th></tr></thead><tbody>${rows}</tbody></table>`:'<p style="margin-top:14px">No corrective actions on record.</p>'}<div class=meta>Generated ${new Date().toLocaleDateString()} &middot; ${entries.length} entr${entries.length===1?'y':'ies'} &middot; Confidential</div></body></html>`); w.document.close(); setTimeout(()=>{try{w.focus();w.print();}catch(e){}},400); };
async function teamCorract(v){
  if(!canCorract()){ v.innerHTML='<div class="card" style="padding:22px;text-align:center"><div class="faint">This is limited to the GM and owner.</div></div>'; return; }
  v.innerHTML='<div class="muted">Loading…</div>';
  await loadPositions(); await loadArchived();
  const r=await sb.from('day_items').select('*').eq('kind','coract');
  const byPerson={}; (r.data||[]).forEach(x=>{ let d={}; try{ d=typeof x.detail==='string'?JSON.parse(x.detail||'{}'):(x.detail||{}); }catch(e){} const nm=x.title; if(!nm)return; (byPerson[nm]=byPerson[nm]||[]).push({on_date:x.on_date,type:d.type||'other',level:d.level||'note'}); });
  const roster=Object.keys(window._posMap||{}).filter(n=>n&&!isArchived(n)).sort((a,b)=>a.localeCompare(b));
  const withEntries=Object.keys(byPerson).sort((a,b)=>byPerson[b].length-byPerson[a].length||a.localeCompare(b));
  let h=`<div class="faint" style="font-size:12.5px;margin-bottom:14px;line-height:1.5">A private record of lateness, no-shows, and performance or policy issues. GM and owner only, hidden from everyone else. Log an entry on anyone, and print a full record whenever you need it.</div>`;
  h+=`<div class="card" style="padding:13px 15px;margin-bottom:16px"><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><span style="font-weight:600;font-size:13.5px">Log an action for</span><select id="caPick" style="flex:1;min-width:160px;padding:8px 10px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;font-size:13.5px"><option value="">Choose a team member…</option>${roster.map(n=>`<option value="${esc(n)}">${esc(n)} &middot; ${esc(posOf(n))}</option>`).join('')}</select><button class="btn pri" style="width:auto" onclick="var s=document.getElementById('caPick');if(s&&s.value)openCorract(s.value)">Open</button></div></div>`;
  if(!withEntries.length){ h+=`<div class="card" style="padding:22px;text-align:center"><div class="faint">Nothing on record. Nobody has a corrective action logged.</div></div>`; v.innerHTML=h; return; }
  h+=`<div class="sec">On record</div>`;
  h+=withEntries.map(nm=>{ const es=byPerson[nm]; const flags=coractFlags(es); const latest=es.slice().sort((a,b)=>(b.on_date||'').localeCompare(a.on_date||''))[0]; const inits=(nm||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); return `<div class="card" style="padding:12px 15px;margin-bottom:9px;display:flex;align-items:center;gap:11px;cursor:pointer" onclick='openCorract(${JSON.stringify(nm)})'><span class="av">${esc(inits)}</span><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(nm)}</div><div class="faint" style="font-size:12px">${es.length} entr${es.length===1?'y':'ies'} &middot; last ${esc(fmtDay(_d(latest.on_date)))}</div></div>${flags.length?`<span style="font-size:11px;font-weight:700;color:#8A1C1C;background:#FCEBEB;border:1px solid #F0C9C9;border-radius:7px;padding:3px 9px;white-space:nowrap">${flags.map(esc).join(' &middot; ')}</span>`:''}<i class="ti ti-chevron-right" style="color:var(--faint)"></i></div>`; }).join('');
  v.innerHTML=h;
}
function posSelect(name,cur){ return `<select onchange="setPos('${esc(name).replace(/'/g,"\\'")}',this.value);var d=this.parentNode.querySelector('.posdot');if(d)d.style.background=window.POSCOL(this.value)" style="padding:7px 9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;font-size:13px">${POS_PICK.map(o=>`<option value="${o}"${o===cur?' selected':''}>${o}</option>`).join('')}</select>`; }
async function schBoard(v){
  const isAdmin=myRank()>=3||hasGrant('schedule'); /* schedule building tools = Manager and up (or a person granted Schedule access); others get a read-only published view */
  if(!v.querySelector('.board')) v.innerHTML='<div class="muted">Loading…</div>'; // keep the current week's grid on screen while the new one loads — no blank flash on week-switch
  if(!state.ctx.wk){ try{ const _sw=localStorage.getItem('sched_wk'); if(_sw) state.ctx.wk=_sw; }catch(e){} }
  const base = state.ctx.wk ? wkDate(state.ctx.wk) : weekStart(new Date());
  const start=weekStart(base); const days=[...Array(7)].map((_,i)=>{ const d=new Date(start); d.setDate(d.getDate()+i); return d; });
  const isoDays=days.map(isoDate); const wkStart=isoDays[0];
  const lyDates=isoDays.map(iso=>{ const x=new Date(iso+'T00:00'); x.setFullYear(x.getFullYear()-1); return isoDate(x); });
  const [rsh,rpf,rpay,rsal,rpub,rojr,rto,rhr,,,,rcov,rfc,rav] = await Promise.all([
    sb.from('shifts').select('*').gte('on_date',isoDays[0]).lte('on_date',isoDays[6]),
    sb.from('profiles').select('*'),
    sb.from('pay_rates').select('*'),
    sb.from('day_sales').select('*').gte('on_date',isoDays[0]).lte('on_date',isoDays[6]),
    sb.from('published_weeks').select('*').eq('week_start',wkStart).maybeSingle(),
    sb.from('day_items').select('on_date,detail').eq('kind','ojr').gte('on_date',isoDays[0]).lte('on_date',isoDays[6]),
    sb.from('time_off').select('*').eq('status','approved'),
    sb.from('day_items').select('on_date,detail').eq('kind','hourly').in('on_date',lyDates),
    loadPositions(),
    loadArchived(),
    loadProfiles(),
    sb.from('day_items').select('detail').eq('kind','covrules').order('id',{ascending:false}).limit(1).maybeSingle(),
    sb.from('day_items').select('on_date,detail').eq('kind','fcadj').in('on_date',isoDays),
    sb.from('availability').select('person_name,weekday,can_work,note')
  ]);
  // availability, so the board can flag anyone scheduled on a day they said they can't work
  const avMapB={}; (rav&&rav.data||[]).forEach(a=>{ (avMapB[a.person_name]=avMapB[a.person_name]||{})[a.weekday]=a; });
  const ojrByDay={}; (rojr.data||[]).forEach(o=>{ if(o.on_date) ojrByDay[o.on_date]=o.detail; });
  let covRules={requireLeader:true,shiftLen:8,minLen:4,maxLen:8,targetPct:'',burdenPct:'',matrix:{blocks:[]},days:{},roleReqs:[],blackouts:[]}; try{ const cd=JSON.parse((rcov&&rcov.data&&rcov.data.detail)||'{}'); covRules={requireLeader:cd.requireLeader!==false, shiftLen:+(cd.shiftLen)||8, minLen:+(cd.minLen)||4, maxLen:+(cd.maxLen)||8, targetPct:cd.targetPct||'', burdenPct:+(cd.burdenPct)||0, matrix:cd.matrix||{blocks:[]}, days:cd.days||{}, roleReqs:Array.isArray(cd.roleReqs)?cd.roleReqs:[], blackouts:Array.isArray(cd.blackouts)?cd.blackouts:[]}; }catch(e){}
  const covTarget=di=>{ const M=covRules.matrix; if(M&&M.blocks&&M.blocks.length){ let mx=0; M.blocks.forEach(b=>{ const n=+((b.n||[])[di]||0); if(n>mx)mx=n; }); return mx||null; } const c=covRules.days[di]; return c&&c.people?+c.people:null; };
  let fcAdj={}; if(isAdmin && rfc){ try{ (rfc.data||[]).forEach(x=>{ try{ const d=typeof x.detail==='string'?JSON.parse(x.detail||'{}'):(x.detail||{}); if(d&&+d.amt>0) fcAdj[x.on_date]=+d.amt; }catch(e){} }); }catch(e){} }
  const offMap={}; (rto.data||[]).forEach(t=>{ isoDays.forEach(iso=>{ if(iso>=t.start_date && iso<=(t.end_date||t.start_date)){ (offMap[t.person_name]=offMap[t.person_name]||{})[iso]=t.reason||'Time off'; } }); });
  const shifts=rsh.data||[]; window._shifts={}; shifts.forEach(s=>window._shifts[s.id]=s); const _pm={}; (rpf.data||[]).forEach(p=>_pm[p.name]=p); const team=rosterNames().map(n=>({name:n,id:(_pm[n]||{}).id||null})); window._team=team; let _evList=[]; try{ const _rev=await sb.from('events').select('*').gte('on_date',isoDays[0]).lte('on_date',isoDays[6]); _evList=_rev.data||[]; }catch(e){ _evList=[]; } window._events={}; _evList.forEach(function(e){ window._events[e.id]=e; });
  const wage={}; (rpay.data||[]).forEach(p=>wage[p.person_name]=Number(p.wage)||0);
  let sales={}; (rsal.data||[]).forEach(d=>sales[d.on_date]=Number(d.sales)||0); if(isAdmin && !Object.keys(sales).length){ try{ sales=await window._carrySales(isoDays); }catch(e){} } else { window._salesCarried=false; }
  const pub=rpub.data; const todayIso=isoDate(new Date());
  const byPD={}; shifts.forEach(s=>{ const k=(s.person_name||'')+'|'+s.on_date; (byPD[k]=byPD[k]||[]).push(s); });
  const _ownOnly=(myRank()<2 && !hasGrant('schedule') && state.perms && state.perms._teamView==='own'); const _meRoster=myRosterName()||(state.profile&&state.profile.name)||''; const gridPeople=_ownOnly?team.filter(p=>p.name===_meRoster):team;
  const roles={}; gridPeople.forEach(p=>{ const r=posOf(p.name); (roles[r]=roles[r]||[]).push(p); });
  const known=new Set(gridPeople.map(p=>p.name));
  if(!_ownOnly) shifts.forEach(s=>{ if(s.person_name && s.person_name!=='__OPEN__' && !known.has(s.person_name) && !isArchived(s.person_name)){ known.add(s.person_name); const r=posOf(s.person_name); (roles[r]=roles[r]||[]).push({name:s.person_name,title:r}); } });
  const fmtH=d=>{ const x=new Date(d); return x.toLocaleDateString(undefined,{weekday:'short'})+' '+(x.getMonth()+1)+'/'+x.getDate(); };
  const daysAhead = pub ? Math.round((start - new Date(pub.published_at))/86400000) : null;
  let h=`<div class="sched-bar"><div class="sched-nav" id="schWeekNav"><button class="iconbtn" aria-label="Previous week" onclick="weekShift(-1)"><i class="ti ti-chevron-left"></i></button><button class="iconbtn" aria-label="Next week" onclick="weekShift(1)"><i class="ti ti-chevron-right"></i></button><button class="btn" style="width:auto" onclick="weekShift(0)">Today</button></div><div style="min-width:0"><div style="font-size:18px;font-weight:600;line-height:1.2">${fmtDay(days[0])} – ${fmtDay(days[6])}</div><div class="faint" style="font-size:12px;margin-top:2px">${pub?`<span style="color:var(--green)">●</span> Published${daysAhead>=0?' · posted '+daysAhead+' days ahead':''}`:'Draft — not published yet'}</div></div>`;
  if(isAdmin) h+=`<div class="sched-actions"><button class="btn" id="schAutoDraft" style="width:auto" onclick="autoDraft()"><i class="ti ti-wand"></i> Auto-draft</button><button class="btn" style="width:auto" onclick="copyLastWeek()"><i class="ti ti-copy"></i> Copy week</button><button class="btn" style="width:auto" onclick="readMyWeek()"><i class="ti ti-sparkles"></i> Read my week</button>${pub?`<button class="btn" style="width:auto" onclick="whatChanged()"><i class="ti ti-arrows-diff"></i> What changed</button>`:''}<button class="btn pri" id="schPublish" style="width:auto" onclick="publishWeek()"><i class="ti ti-send"></i> ${pub?'Re-publish':'Publish'}</button></div>`;
  h+=`</div>`;
  if(!isAdmin && !pub){ h+=`<div class="card" style="padding:30px 22px;text-align:center;margin-top:14px"><div style="font-size:30px;color:var(--brand);margin-bottom:8px"><i class="ti ti-calendar-time"></i></div><div style="font-weight:600;margin-bottom:3px">Not posted yet</div><div class="faint" style="font-size:13px">This week's schedule shows here once leadership publishes it.</div></div>`; v.innerHTML=h; return; }
  if(isAdmin){ const _r5=[['Pick week'],['Auto-draft'],['Review flags'],['Adjust'],['Publish']]; const _cur5=pub?6:(shifts.length?4:2);
    h+=`<div class="card" id="schRhythm" style="padding:11px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1;min-width:0">`+_r5.map(function(s5,i5){ var n5=i5+1; var d5=pub||n5<_cur5; var a5=!pub&&n5===_cur5; return '<div style="display:flex;align-items:center;gap:6px"><div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;background:'+(d5?'#1B7B3F':(a5?'var(--brand)':'var(--line)'))+';color:'+(d5||a5?'#fff':'var(--muted)')+'">'+(d5?'✓':n5)+'</div><span style="font-size:12.5px;font-weight:'+(a5?'800':'600')+';color:'+(a5?'var(--brand)':(d5?'var(--ink)':'var(--muted)'))+'">'+s5[0]+'</span></div>'+(i5<4?'<span style="color:var(--line2);font-size:12px">›</span>':''); }).join('')+`</div><button class="btn" style="width:auto;padding:6px 12px;font-size:12.5px;flex:none" onclick="startSchedTour()"><i class="ti ti-help-circle"></i> Show me how</button></div>`;
    if(!shifts.length){ h+=`<div class="card" style="padding:20px 18px;margin-bottom:14px;background:var(--brand-soft);border-color:var(--brand-line);text-align:center"><div style="font-size:26px;margin-bottom:6px">🗓️</div><div style="font-weight:800;font-size:15.5px;margin-bottom:4px">No schedule for this week yet</div><div class="faint" style="font-size:13px;margin-bottom:14px;line-height:1.55;max-width:470px;margin-left:auto;margin-right:auto">Coming from another app, you'd drag every shift by hand. Here, <b>Auto-draft</b> builds the whole week in one click — from your team, availability and coverage — then you just adjust and publish.</div><button class="btn pri" style="width:auto" onclick="autoDraft()"><i class="ti ti-wand"></i> Auto-draft this week</button></div>`; }
  }
  if(isAdmin){ const _rost=team.map(p=>p.name); const _isLead=n=>['Owner','Manager','Supervisor'].includes(posOf(n)); const _capO=n=>{ const c=(profileOf(n)||{}).caps; return (c&&typeof c==='object'&&'open'in c)?!!c.open:_isLead(n); }; const _capC=n=>{ const c=(profileOf(n)||{}).caps; return (c&&typeof c==='object'&&'close'in c)?!!c.close:_isLead(n); }; const _has=(n,st)=>((profileOf(n)||{}).roles||[]).includes(st); const _lvl=(n,st)=>{ const s=(profileOf(n)||{}).skillLevels; if(s&&typeof s==='object'&&(st in s))return +s[st]||0; return _has(n,st)?2:0; }; const fn=n=>esc((n||'').split(' ')[0]); const W=[];
    _rost.forEach(n=>{ const p=profileOf(n)||{}; const mx=+p.maxHrs,mn=+p.minHrs,ms=+p.maxShift,md=(p.maxDays===''||p.maxDays==null)?null:+p.maxDays;
      if(mx>0&&mn>0&&mx<mn) W.push([1,`${fn(n)}'s max hours (${mx}) are below their min (${mn}) — they can never hit their minimum.`]);
      if(ms>0&&ms<covRules.minLen) W.push([1,`${fn(n)}'s longest shift (${ms}h) is under your ${covRules.minLen}h minimum shift — they won't fit any shift.`]);
      if(md!=null&&md<1) W.push([1,`${fn(n)}'s max days is ${md} — they can't be scheduled at all.`]);
    });
    const openers=_rost.filter(_capO), closers=_rost.filter(_capC);
    if(covRules.requireLeader&&openers.length===0) W.push([2,`No one can open. Every day needs an opener — set "Can open" for a leader on the Skills grid.`]);
    if(covRules.requireLeader&&closers.length===0) W.push([2,`No one can close. Every day needs a closer — set "Can close" for a leader on the Skills grid.`]);
    (covRules.roleReqs||[]).forEach(rq=>{ if(!rq||!rq.role)return; const cnt=Math.max(1,+rq.count||1); const lab=esc(rq.label||(rq.role==='__open__'?'Opening leader':rq.role==='__close__'?'Closing leader':rq.role));
      if(rq.role==='__open__'){ if(openers.length<cnt) W.push([openers.length?1:2,`Requirement "${lab}" needs ${cnt} who can open, but only ${openers.length} can.`]); }
      else if(rq.role==='__close__'){ if(closers.length<cnt) W.push([closers.length?1:2,`Requirement "${lab}" needs ${cnt} who can close, but only ${closers.length} can.`]); }
      else { const trained=_rost.filter(n=>_has(n,rq.role)); if(trained.length===0) W.push([2,`Requirement "${lab}" needs someone trained on ${esc(rq.role)}, but no one is.`]); else if(trained.length<cnt) W.push([1,`Requirement "${lab}" needs ${cnt} trained on ${esc(rq.role)}, but only ${trained.length} ${trained.length===1?'is':'are'}.`]); if(+rq.minLevel>1){ const q=_rost.filter(n=>_lvl(n,rq.role)>=+rq.minLevel); if(q.length<cnt) W.push([1,`Requirement "${lab}" wants ${cnt} at a higher skill level on ${esc(rq.role)}, but only ${q.length} qualif${q.length===1?'ies':'y'}.`]); } }
    });
    const _M=covRules.matrix; if(_M&&_M.blocks&&_M.blocks.length){ let peak=0; _M.blocks.forEach(b=>{ (b.n||[]).forEach(x=>{ if(+x>peak)peak=+x; }); }); if(peak>_rost.length) W.push([1,`Your busiest block needs ${peak} people, but you have ${_rost.length} on the roster — expect open shifts.`]); }
    if(W.length){ W.sort((a,b)=>b[0]-a[0]); const nB=W.filter(w=>w[0]===2).length; h+=`<div class="card" style="padding:13px 15px;margin-bottom:14px;border-left:4px solid ${nB?'#B32D2D':'var(--amber)'}"><div style="font-weight:700;font-size:13.5px;margin-bottom:7px">${nB?'⛔':'⚠️'} Before you draft — ${W.length} thing${W.length>1?'s':''} to check</div>`+W.map(w=>`<div style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;padding:3px 0;color:var(--ink)"><span style="color:${w[0]===2?'#B32D2D':'var(--amber)'};font-weight:800;line-height:1.4">•</span><span>${w[1]}</span></div>`).join('')+`</div>`; }
  }
  /* Last year's numbers used to sit above the schedule as a seven-row bar chart -- the
     single biggest thing on the page, and in the wrong place. You forecast while looking
     at the grid, not before it. The data is still gathered here; it now surfaces inside
     each day column where the decision actually gets made. */
  let lyH={};
  (rhr.data||[]).forEach(x=>{ try{ lyH[x.on_date]=JSON.parse(x.detail||'{}'); }catch(e){} });
  const lyForDay = isoDays.map((iso,i)=>{
    const d=lyH[lyDates[i]]; if(!d||!d.byHour) return null;
    let peakH=null,peakV=0;
    Object.keys(d.byHour).forEach(k=>{ if(+d.byHour[k]>peakV){ peakV=+d.byHour[k]; peakH=+k; } });
    return {total:+d.total||0, peakH:peakH, peakV:peakV};
  });
  const burdenMul=1+((covRules.burdenPct||0)/100);
  const allHrs=shifts.reduce((a,s)=>a+shiftHours(s),0); const allCost=shifts.reduce((a,s)=>a+shiftHours(s)*(wage[s.person_name]||0),0)*burdenMul; const ppl=new Set(shifts.map(s=>s.person_name).filter(n=>n&&n!=='__OPEN__')).size;
  const totSales=isoDays.reduce((a,iso)=>a+(sales[iso]||0),0); const labpctO=(isAdmin&&totSales&&allCost)?Math.round(allCost/totSales*100):null;
  window._sch={shifts:shifts, wage:Object.assign({},wage), isoDays:isoDays.slice(), isAdmin:isAdmin, burden:(covRules.burdenPct||0)};
  const metric=(ic,vv,ll,col,id)=>`<div class="metric"><div class="ml"><i class="ti ${ic}"></i>${ll}</div><div class="mv"${id?` id="${id}"`:''}${col?` style="color:${col}"`:''}>${vv}</div></div>`;
  /* ---------- Is this day actually safe? ----------
     Every scheduling tool shows a grid of who is working and leaves the manager to read
     it and work out whether it holds up. The real question is not "who is on Tuesday",
     it is "is Tuesday covered" -- is someone in charge at open, is someone in charge at
     close, is anyone on at all. So each day gets a verdict before you read a single name.
     Green: a leader opens and a leader closes. Amber: covered, but one of those ends is
     bare. Red: nobody scheduled, or no leader on the day at all. */
  const LEAD_POS = ['Owner','GM','Manager','Supervisor'];
  /* Archived people still hold their old position, so without this check someone who quit
     still counted as leadership cover and every day read "Covered". A verdict is about
     whether the shift will actually be run, and a leader who left will not be running it. */
  const _isLead = n => !isArchived(n) && LEAD_POS.indexOf(posOf(n)) >= 0;
  const _mins = t => { const m=/^(\d{1,2}):(\d{2})/.exec(t||''); return m ? (+m[1])*60 + (+m[2]) : null; };
  /* Five names in Monday's column reads as "five people" when the rule being checked is
     about how many are on at once. They are not the same number: staggered shifts mean
     five people can work a day that caps at four concurrent. Show the peak alongside the
     cap so it can be checked at a glance instead of counted by eye and worried about. */
  const _capFor = di => { let m=0; try{ (cov.matrix&&cov.matrix.blocks||[]).forEach(b=>{ const v=+(b.n&&b.n[di]); if(v>m) m=v; }); }catch(e){} return m; };
  const peakOf = isoDays.map(function(iso,di){
    const list=(rsh.data||[]).filter(x=>x.on_date===iso && x.start_time && x.end_time && x.person_name && x.person_name!=='__OPEN__' && !isArchived(x.person_name));
    const mn=t=>{ const m=/^(\d{1,2}):(\d{2})/.exec(t||''); return m? +m[1]*60 + +m[2] : null; };
    let peak=0;
    for(let t=4*60; t<=23*60; t+=15){
      let on=0; list.forEach(x=>{ const a=mn(x.start_time), b=mn(x.end_time); if(a!=null&&b!=null&&a<=t&&b>t) on++; });
      if(on>peak) peak=on;
    }
    return {peak:peak, cap:_capFor(di), people:list.length};
  });
  const dayVerdict = isoDays.map(function(iso){
    const list = (rsh.data||[]).filter(s => s.on_date===iso && s.start_time && s.end_time && !isArchived(s.person_name) && s.person_name!=='__OPEN__' && s.person_name!=='__open__');
    if(!list.length) return {level:'none', label:'Nobody on', why:'No shifts scheduled for this day.'};
    const starts = list.map(s=>_mins(s.start_time)).filter(v=>v!==null);
    const ends   = list.map(s=>_mins(s.end_time)).filter(v=>v!==null);
    if(!starts.length || !ends.length) return {level:'ok', label:'', why:''};
    const open = Math.min.apply(null, starts), close = Math.max.apply(null, ends);
    const leads = list.filter(s=>_isLead(s.person_name));
    if(!leads.length) return {level:'bad', label:'No leader', why:'Nobody at supervisor level or above is on this day.'};
    // A leader "covers" an end if their shift reaches it within 30 minutes.
    const openCovered  = leads.some(s => _mins(s.start_time) !== null && _mins(s.start_time) <= open + 30);
    const closeCovered = leads.some(s => _mins(s.end_time)   !== null && _mins(s.end_time)   >= close - 30);
    if(openCovered && closeCovered) return {level:'ok', label:'Covered', why:'A leader opens and a leader closes.'};
    if(!openCovered && !closeCovered) return {level:'bad', label:'Open & close bare', why:'No leader at open or at close.'};
    return {level:'warn', label: openCovered ? 'No closer' : 'No opener',
            why: openCovered ? 'A leader opens, but nobody in charge is on at close.' : 'A leader closes, but nobody in charge is on at open.'};
  });
  const _VC = {ok:{bg:'#E1EFE7',fg:'#2C6E4B'}, warn:{bg:'#F7EEDC',fg:'#7A5B1E'}, bad:{bg:'#F7E1DA',fg:'#A8401C'}, none:{bg:'#ECEFF1',fg:'#5C6E73'}};
  /* ---------- Is this week alright? ----------
     The schedule page opens with a sales chart, three number boxes, a warning panel, a
     step tracker and a twenty-row grid. A small badge on a day column disappears in that.
     So the week's answer goes first, in plain words, above everything else: how many days
     have a gap, and which ones. If every day is fine it says so in one line and takes up
     almost no room. */
  const _bad = dayVerdict.map((v,i)=>({v,i})).filter(x=>x.v.level==='bad');
  const _warn = dayVerdict.map((v,i)=>({v,i})).filter(x=>x.v.level==='warn');
  const _empty = dayVerdict.map((v,i)=>({v,i})).filter(x=>x.v.level==='none');
  const _dn = i => days[i].toLocaleDateString(undefined,{weekday:'long'});
  if(isAdmin){
    const _issues = _bad.concat(_warn);
    if(!_issues.length && !_empty.length){
      h += `<div style="display:flex;align-items:center;gap:11px;background:var(--good-wash,#E1EFE7);border-radius:12px;padding:14px 17px;margin-bottom:14px">
        <i class="ti ti-circle-check" style="font-size:21px;color:#2C6E4B"></i>
        <div><div style="font-weight:800;font-size:15px;color:#2C6E4B">This week is covered</div>
        <div style="font-size:12.5px;color:#2C6E4B;opacity:.85">Every day has a leader at open and at close.</div></div></div>`;
    } else {
      const _rows = _issues.map(x=>`<div style="display:flex;gap:9px;align-items:baseline;padding:5px 0">
          <span style="font-weight:800;font-size:13.5px;min-width:82px">${esc(_dn(x.i))}</span>
          <span style="font-size:13.5px">${esc(x.v.why)}</span></div>`).join('')
        + (_empty.length? `<div style="display:flex;gap:9px;align-items:baseline;padding:5px 0;opacity:.75">
          <span style="font-weight:800;font-size:13.5px;min-width:82px">${_empty.length===1?esc(_dn(_empty[0].i)):_empty.length+' days'}</span>
          <span style="font-size:13.5px">Nobody scheduled yet.</span></div>` : '');
      const _tone = _bad.length ? {bg:'#F7E1DA',fg:'#A8401C',ic:'ti-alert-triangle'} : {bg:'#F7EEDC',fg:'#7A5B1E',ic:'ti-alert-circle'};
      h += `<div style="background:${_tone.bg};border-radius:12px;padding:15px 18px;margin-bottom:14px;color:${_tone.fg}">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <i class="ti ${_tone.ic}" style="font-size:20px"></i>
          <div style="font-weight:800;font-size:15px">${_issues.length+_empty.length} ${(_issues.length+_empty.length)===1?'day needs':'days need'} attention</div></div>
        ${_rows}</div>`;
    }
  }
  if(isAdmin) h+=`<div class="metrics">${metric('ti-clock',allHrs?allHrs.toFixed(1):'0','Hours · week')}${metric('ti-currency-dollar',allCost?money(allCost):'—','Labor $ · week','','lbl-cost')}${metric('ti-percentage',labpctO!=null?labpctO+'%':'—','Labor % · week',labpctO!=null?(labpctO>30?'var(--amber)':'var(--green)'):'','lbl-pct')}</div>`;
  let fcS={}, fcBasis=null;
  if(isAdmin){ let fc=null; try{ if(window._fcCache&&window._fcCache.wk===isoDays[0]) fc=window._fcCache.data; else if(typeof csForecast==='function'){ fc=await csForecast(isoDays[0]); window._fcCache={wk:isoDays[0],data:fc}; } }catch(e){}
    if(fc&&fc.perJsw){ isoDays.forEach(iso=>{ const jsw=new Date(iso+'T12:00:00').getDay(); const f=fc.perJsw[jsw]; let s=0; if(f&&f.s){ for(let H=0;H<24;H++) s+=(f.s[H]||0); } fcS[iso]=s; }); fcBasis=fc.basis||null; } }
  const fcAuto=Object.assign({},fcS); // remember the machine's number so we can show it next to any override
  isoDays.forEach(iso=>{ if(fcAdj[iso]>0) fcS[iso]=fcAdj[iso]; }); // owner's number wins for labor % and the week total
  if(isAdmin){ const R=lawRules(); const warns=[]; const hoursByP={}; shifts.forEach(s=>{ if(s.person_name&&s.person_name!=='__OPEN__') hoursByP[s.person_name]=(hoursByP[s.person_name]||0)+shiftHours(s); }); const seen=new Set(); shifts.forEach(s=>{ if(s.person_name==='__OPEN__')return; if(offMap[s.person_name]&&offMap[s.person_name][s.on_date]){ const k=s.person_name+'|'+s.on_date; if(!seen.has(k)){ seen.add(k); warns.push('🌴 '+s.person_name+' is scheduled '+fmtDay(_d(s.on_date))+' but has approved time off'); } } });
    // scheduled on a day they've said they can't work
    const seenAv=new Set(); shifts.forEach(s=>{ if(s.person_name==='__OPEN__')return; const di=isoDays.indexOf(s.on_date); if(di<0)return; const a=avMapB[s.person_name]&&avMapB[s.person_name][di]; if(a&&a.can_work===false){ const k=s.person_name+'|'+s.on_date; if(!seenAv.has(k)){ seenAv.add(k); warns.push('🚫 '+s.person_name+' is scheduled '+fmtDay(_d(s.on_date))+" but isn't available that day"); } } });
    // recurring day off (the profile rule the draft never breaks) being overridden by hand
    const seenOff=new Set(); shifts.forEach(s=>{ if(s.person_name==='__OPEN__')return; const di=isoDays.indexOf(s.on_date); if(di<0)return; const o=(profileOf(s.person_name)||{}).daysOff; if(Array.isArray(o)&&o.indexOf(di)>=0){ const k=s.person_name+'|'+s.on_date; if(!seenOff.has(k)){ seenOff.add(k); warns.push('📅 '+s.person_name+' is scheduled '+fmtDay(_d(s.on_date))+' but that is one of their days off'); } } }); const otW=R.ot_weekly_hrs||40; Object.keys(hoursByP).forEach(n=>{ if(hoursByP[n]>otW) warns.push('⏰ '+n+' is over '+otW+'h this week ('+hoursByP[n].toFixed(1)+'h)'); }); if(warns.length) h+=`<div class="card" style="padding:12px 15px;margin-bottom:14px;background:var(--amber-soft);border-color:var(--amber)"><div style="font-weight:700;color:var(--amber);margin-bottom:5px">${warns.length} thing${warns.length>1?'s':''} to check before publishing</div><div style="font-size:13px;line-height:1.8">${warns.map(w=>esc(w)).join('<br>')}</div></div>`;
    // Shifts left behind by someone who no longer works here. They don't get a row on the board, so without this they're invisible.
    const _ghost={}; (rsh.data||[]).forEach(s=>{ if(s.person_name&&s.person_name!=='__OPEN__'&&typeof isArchived==='function'&&isArchived(s.person_name)) _ghost[s.person_name]=(_ghost[s.person_name]||0)+1; });
    const _gn=Object.keys(_ghost);
    if(_gn.length){
      /* The list is of shifts in the week being viewed; the button only deletes shifts
         from today onward. On a past week those never overlap, so the button correctly
         removed nothing and the panel never cleared -- which reads as broken. Count what
         is actually upcoming and only offer the button when there is something to remove. */
      let _up = 0;
      try{ const _ur = await sb.from('shifts').select('id').gte('on_date', isoDate(new Date())).in('person_name', _gn); _up = (_ur.data||[]).length; }catch(e){}
      const _past = !_up;
      h+=`<div class="card" style="padding:12px 15px;margin-bottom:14px;background:#FCEBEB;border-color:#E9A6A6"><div style="font-weight:700;color:#A32D2D;margin-bottom:4px">Still on the schedule but no longer employed</div><div style="font-size:13px;line-height:1.7;margin-bottom:9px">${_gn.map(n=>esc(n)+' &middot; '+_ghost[n]+' shift'+(_ghost[n]>1?'s':'')+' this week').join('<br>')}</div>`
        + (_past
            ? `<div style="font-size:12.5px;color:#7A2E2E;opacity:.9">These are in the past, so they stay on the record. Nothing upcoming to remove.</div>`
            : `<button class="btn" style="width:auto;padding:6px 12px;font-size:12.5px" onclick="clearFormerShifts()"><i class="ti ti-trash"></i> Remove ${_up} upcoming shift${_up>1?'s':''}</button>`)
        + `</div>`; } }
  if(window._draftSummary){ const ds=window._draftSummary; window._draftSummary=null;
    if(ds.noAvail && ds.noAvail.length){
      h+=`<div class="card" style="padding:13px 16px;margin-bottom:14px;background:#F7EEDC;border-color:#E4CFA3">
        <div style="font-weight:700;font-size:14px;color:#7A5B1E">${ds.noAvail.length} ${ds.noAvail.length===1?'person has':'people have'} no availability set</div>
        <div style="font-size:12.5px;line-height:1.6;color:#7A5B1E;margin-top:4px">${ds.noAvail.slice(0,8).map(n=>esc(dispName(n))).join(', ')}${ds.noAvail.length>8?' and '+(ds.noAvail.length-8)+' more':''} were treated as available any day, any hour \u2014 which is why this draft may put people on shifts they cannot work.</div>
        <button class="btn" style="width:auto;padding:7px 13px;font-size:12.5px;margin-top:9px" onclick="openAvailSetup()">Set availability</button></div>`;
    } h+=`<div class="card" style="padding:14px 16px;margin-bottom:14px;background:var(--brand-soft);border-color:var(--brand-line)"><div style="font-weight:700;margin-bottom:3px">✨ Auto-draft ready — ${ds.made} shift${ds.made!==1?'s':''} placed${ds.unfilled?', '+ds.unfilled+' still open':''}</div><div class="faint" style="font-size:12.5px">Review below, tweak anything, then Publish. Nothing reaches the team until you publish.</div>${ds.flags.length?`<div style="margin-top:9px;font-size:13px;line-height:1.7;border-top:1px solid var(--brand-line);padding-top:8px">${ds.flags.map(f=>`<div style="white-space:pre-line;margin-bottom:5px">${esc(f)}</div>`).join('')}</div>`:''}</div>`; }
  if(!shifts.length) h+=`<div class="card" style="padding:30px 22px;text-align:center;margin-bottom:14px"><div style="font-size:30px;color:var(--brand);margin-bottom:8px"><i class="ti ti-calendar-plus"></i></div><div style="font-weight:600;margin-bottom:3px">No shifts this week</div><div class="faint" style="font-size:13px">${isAdmin?'Add one below, tap Copy week, or ✨ Auto-draft to build it from a past week.':'Your shifts show here once leadership posts the schedule.'}</div></div>`;
  h+=`<div style="margin:0 2px 10px"><button class="btn" style="width:auto;padding:6px 12px;font-size:12.5px" onclick="addMyShiftsToCal()"><i class="ti ti-calendar-plus"></i> Add my shifts to my calendar</button></div>`;
  
h+=`<div class="board"><div class="board-grid"><div class="bh bh-team">Team</div>`+days.map((d,di)=>`<div class="bh ${isoDate(d)===todayIso?'bh-today':''}">${d.toLocaleDateString(undefined,{weekday:'short'})}<span>${d.getDate()}</span>${dayVerdict[di].label?`<span title="${esc(dayVerdict[di].why)}" style="display:block;margin-top:4px;font-size:9.5px;font-weight:700;letter-spacing:.03em;text-transform:none;padding:2px 6px;border-radius:999px;background:${_VC[dayVerdict[di].level].bg};color:${_VC[dayVerdict[di].level].fg};white-space:nowrap">${esc(dayVerdict[di].label)}</span>`:''}${(isAdmin&&peakOf[di]&&peakOf[di].cap)?`<span title="Most people on at once, against what your coverage matrix allows" style="display:block;margin-top:3px;font-size:9.5px;font-weight:600;text-transform:none;letter-spacing:0;color:${peakOf[di].peak>peakOf[di].cap?'#A8401C':'var(--muted)'};white-space:nowrap">${peakOf[di].peak}/${peakOf[di].cap} at once${peakOf[di].people!==peakOf[di].peak?` &middot; ${peakOf[di].people} people`:''}</span>`:''}${(isAdmin&&lyForDay[di])?`<span title="Same day last year" style="display:block;margin-top:3px;font-size:9.5px;font-weight:600;text-transform:none;letter-spacing:0;color:var(--muted);white-space:nowrap">LY ${money(lyForDay[di].total)}${lyForDay[di].peakH!=null?` &middot; peak ${((lyForDay[di].peakH%12)||12)+(lyForDay[di].peakH<12?'a':'p')}`:''}</span>`:''}</div>`).join('');
  /* Meetings & events row: 1-on-1s, interviews, leadership meetings, other meetings. RLS decides who sees what (admins all; staff only events they're on). */
  { const _EK={one_on_one:{l:'1-on-1',c:'#4A9CAD'},interview:{l:'Interview',c:'#7C3AED'},leadership:{l:'Leadership',c:'#2563EB'},meeting:{l:'Meeting',c:'#64748B'}};
    const _eBy={}; (_evList||[]).forEach(function(e){ (_eBy[e.on_date]=_eBy[e.on_date]||[]).push(e); });
    if(isAdmin || (_evList&&_evList.length)){
      h+=`<div class="band" style="display:flex;align-items:center;justify-content:space-between"><span>Meetings &amp; events</span>${isAdmin?`<button onclick="addEventModal()" style="border:none;background:none;color:var(--brand);font-weight:700;font-size:11px;letter-spacing:.02em;cursor:pointer;text-transform:none"><i class="ti ti-plus"></i> Add event</button>`:''}</div>`;
      const _ec=isoDays.map(function(iso){ const list=(_eBy[iso]||[]).sort(function(a,b){ return (a.start_time||'').localeCompare(b.start_time||''); }); const inner=list.map(function(e){ const k=_EK[e.kind]||_EK.meeting; return `<div class="scard" onclick="event.stopPropagation();eventDetail('${e.id}')" style="cursor:pointer;background:${k.c}14;color:${k.c};border:1px solid ${k.c}33;white-space:normal;line-height:1.2">${e.start_time?fmtClock(e.start_time):''} ${esc(e.title||k.l)}</div>`; }).join(''); return `<div class="daycell${iso===todayIso?' today':''}"${isAdmin?` onclick="addEventModal('${iso}')" style="cursor:pointer"`:''}>${inner}${isAdmin?`<div class="addhint" style="text-align:center;color:var(--brand);opacity:${inner?'.55':'.28'};font-size:${inner?'11px':'14px'};font-weight:700;line-height:1.5;margin-top:${inner?'2px':'0'}">${inner?'+ add':'+'}</div>`:''}</div>`; }).join('');
      h+=`<div class="pcell"><span class="av"><i class="ti ti-calendar-event"></i></span><span style="min-width:0"><span class="nm">Meetings</span><span class="mt">${(_evList||[]).length} this week</span></span></div>`+_ec;
    }
  }
  const dayHrs=isoDays.map(()=>0), dayCost=isoDays.map(()=>0);
  const POS_ORDER=['OJR','Owner','GM','Manager','Supervisor','Trainer','Trainee','Team Member','Unassigned']; const POS_COL={OJR:'#DC2626',Owner:'#7C3AED',Manager:'#2563EB',Supervisor:'#0D9488',Trainer:'#0891B2',Trainee:'#D97706','Team Member':'#64748B',Unassigned:'#94A3B8'};
  Object.keys(roles).sort((a,b)=>{const ia=POS_ORDER.indexOf(a),ib=POS_ORDER.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b);}).forEach(role=>{
    const _bc=POS_COL[role]||'#94A3B8';
    h+=`<div class="band" style="background:${_bc}14;color:${_bc};border-left:4px solid ${_bc}">${esc(role)}</div>`;
    roles[role].forEach(p=>{
      let wHrs=0,wCost=0;
      /* A salaried person costs the same whether they work 30 hours or 50, so charging by
         the hour overstates a heavy week and understates a light one. Spread the annual
         figure across the week and across the hours they actually work, so the person's
         week and each day still add up correctly. */
      const _sal=(profileOf(p.name)||{}).salary; const _salWk=(+_sal>0)? (+_sal)/52 : 0;
      let _rate = wage[p.name]||0;
      if(_salWk){ const _h=list.reduce((a,s)=>a+shiftHours(s),0); _rate = _h>0 ? _salWk/_h : 0; }
      const cells=isoDays.map((iso,di)=>{ const list=byPD[p.name+'|'+iso]||[]; let cell=''; const isOjr=ojrByDay[iso]===p.name; const offRec=offMap[p.name]&&offMap[p.name][iso];
        // can this person work this day at all? drives the red flag on the chip and the red drop target
        const _av=avMapB[p.name]&&avMapB[p.name][di]; const _unavail=!!(_av&&_av.can_work===false);
        const _pdo=(profileOf(p.name)||{}).daysOff; const _isDayOff=Array.isArray(_pdo)&&_pdo.indexOf(di)>=0;
        const _bad=_unavail||_isDayOff; const _badWhy=_unavail?(p.name+" isn't available this day"):(_isDayOff?(p.name+' has this day off'):'');
        list.forEach(s=>{ const hrs=shiftHours(s); wHrs+=hrs; /* A salaried manager costs the same whether they work 30 hours or 50, so charging them
       by the hour overstates a heavy week and understates a light one. Spread the annual
       figure evenly across the week and across the days they actually work, so day totals
       still add up to the week. */
      const c=hrs*_rate; wCost+=c; dayHrs[di]+=hrs; dayCost[di]+=c; const tr=s.kind==='training'; const oj=isOjr?';border-color:#F4C7C7;background:#FEECEC':''; const styleAttr=isAdmin?` style="cursor:pointer${oj}"`:(isOjr?` style="border-color:#F4C7C7;background:#FEECEC"`:''); cell+=`<div class="scard${tr?' train':''}${_bad?' conflict':''}"${_bad?` title="${esc(_badWhy)}"`:''}${isAdmin?` onclick="editShift(${s.id})" draggable="true" data-sid="${s.id}" ondragstart="schDragStart(event)" ondragend="schDragEnd(event)"`:''}${styleAttr}>${_bad?'<i class="ti ti-alert-triangle" onclick="event.stopPropagation();schWhyConflict(this)" title="Why is this red?" style="font-size:12px;margin-right:4px;vertical-align:-1px;cursor:pointer"></i>':''}${isOjr?'<span style="display:inline-block;background:#DC2626;color:#fff;font-size:9px;font-weight:800;letter-spacing:.03em;padding:1px 4px;border-radius:4px;margin-right:4px;vertical-align:middle">OJR</span>':''}${s.start_time?fmtClock(s.start_time):'shift'}${s.end_time?'–'+fmtClock(s.end_time):''}${tr?' · train':''}${s.note?`<div style="font-size:9.5px;font-weight:700;opacity:.9;letter-spacing:.02em;margin-top:1px">${esc(s.note)}</div>`:''}${isAdmin?`<span class="x" onclick="event.stopPropagation();delShift(${s.id})">×</span>`:''}${(s.role&&s.role!==posOf(p.name)&&s.role.trim())?`<div style="font-size:9.5px;font-weight:700;opacity:.75;white-space:normal;line-height:1.15;margin-top:1px">${esc(s.role)}</div>`:''}</div>`; });
        if(offRec) cell=`<div class="scard" style="background:#F1F0EE;color:#8A8A8A;border-color:#E2E0DD;font-weight:600;cursor:default" title="${esc(offRec)}"><i class="ti ti-plane" style="font-size:11px"></i> Time off</div>`+cell;
        const canAdd = isAdmin && !cell;
        return `<div class="daycell${iso===todayIso?' today':''}"${isAdmin?` data-nm="${esc(p.name)}" data-iso="${iso}"${_bad?` data-bad="1" data-badwhy="${esc(_badWhy)}"`:''} ondragover="schDragOver(event)" ondragleave="schDragLeave(event)" ondrop="schDrop(event)"`:''}${canAdd?` onclick="quickAdd(this)" style="cursor:pointer"`:''}>${cell}${canAdd?'<span class="addhint" style="display:block;text-align:center;color:var(--brand);opacity:.28;font-size:15px;font-weight:700;line-height:1">+</span>':''}</div>`;
      }).join('');
      const inits=(p.name||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
      h+=`<div class="pcell"><span class="av">${esc(inits)}</span><span style="min-width:0"><span class="nm">${esc(p.name)}</span><span class="mt">${wHrs?wHrs.toFixed(1)+' h':'0 h'}${isAdmin&&(wage[p.name]||_salWk)?' · '+money(wCost)+(_salWk?' salaried':''):''}</span></span></div>${cells}`;
    });
  });
  const openShifts=shifts.filter(s=>s.person_name==='__OPEN__');
  if(openShifts.length){ const openBy={}; openShifts.forEach(s=>{ (openBy[s.on_date]=openBy[s.on_date]||[]).push(s); });
    h+=`<div class="band" style="background:#FDE7E7;color:#B32D2D;border-left:4px solid #DC2626">Open — needs filling <span style="opacity:.75;font-weight:500">· ${openShifts.length}</span></div>`;
    const ocells=isoDays.map(iso=>{ const list=openBy[iso]||[]; let cell=''; list.forEach(s=>{ cell+=`<div class="scard"${isAdmin?` onclick="fillShift(${s.id})"`:''} style="background:#FEECEC;border-color:#F4C7C7;color:#B32D2D;font-weight:600${isAdmin?';cursor:pointer':''}">${esc(s.role||'Open')} ${s.start_time?fmtClock(s.start_time):''}${s.end_time?'–'+fmtClock(s.end_time):''}${isAdmin?'<div style="font-size:10px;font-weight:500;opacity:.85">tap to fill</div>':''}${(isAdmin&&s.note)?`<div style="font-size:9.5px;font-weight:400;opacity:.8;line-height:1.2;margin-top:2px">${esc(s.note)}</div>`:''}</div>`; }); return `<div class="daycell${iso===todayIso?' today':''}">${cell}</div>`; }).join('');
    h+=`<div class="pcell"><span class="av" style="background:#FEECEC;color:#DC2626"><i class="ti ti-alert-triangle"></i></span><span style="min-width:0"><span class="nm">Open shifts</span><span class="mt">${openShifts.length} to fill</span></span></div>${ocells}`;
  }
  const totHrs=dayHrs.reduce((a,b)=>a+b,0), totCost=dayCost.reduce((a,b)=>a+b,0);
  const dayPpl=isoDays.map(iso=> new Set(shifts.filter(s=>s.on_date===iso&&s.person_name&&s.person_name!=='__OPEN__').map(s=>s.person_name)).size );
  const totPpl=new Set(shifts.filter(s=>s.person_name&&s.person_name!=='__OPEN__').map(s=>s.person_name)).size;
  h+=`<div class="bt bt-team" style="font-weight:600">On the floor</div>`+isoDays.map((iso,di)=>{ const t=covTarget(di); const short=t!=null&&dayPpl[di]<t; return `<div class="bt" style="font-weight:600">${dayPpl[di]||'—'}${t!=null?`<span class="faint" style="font-weight:400"> / ${t}</span>`:''}${short?`<div style="font-size:10px;font-weight:600;color:var(--amber)">short ${t-dayPpl[di]}</div>`:''}</div>`; }).join('');
  const _tgtPct=+covRules.targetPct||30;
  h+=`<div class="bt bt-team">Daily total</div>`+isoDays.map((iso,di)=>{ const sl=sales[iso]||fcS[iso]||0; const dc=dayCost[di]*burdenMul; const pct=(isAdmin&&sl&&dc)?Math.round(dc/sl*100):null; return `<div class="bt">${dayHrs[di]?dayHrs[di].toFixed(1)+'h':'—'}${isAdmin&&dc?`<div class="faint" style="font-weight:400;font-size:11px">${money(dc)}</div>`:''}${pct!=null?`<div style="font-size:11px;font-weight:600;color:${pct>_tgtPct?'var(--amber)':'var(--green)'}">${pct}%</div>`:''}</div>`; }).join('');
  const _wkFc=isoDays.reduce((a,iso)=>a+(fcS[iso]||0),0);
  h+=`<div class="bt bt-team" style="font-weight:400"><span class="faint" title="Expected sales for the week. Auto-figured from last year, scaled to this year's trend. Tap a number to set your own — labor % uses this until real sales come in.">Forecast<div style="font-size:9px;opacity:.7;font-weight:400">tap to adjust</div></span></div>`+isoDays.map(iso=>{ const es=fcS[iso]||0; const over=fcAdj[iso]>0; const auto=fcAuto[iso]||0; return `<div class="bt"><div style="display:flex;align-items:center;justify-content:center;gap:1px"><span class="faint" style="font-size:10px">$</span><input type="number" min="0" value="${es?Math.round(es):''}" placeholder="—" onchange="setFcAdj('${iso}',this.value,${Math.round(auto)})" onclick="this.select()" style="width:50px;font-size:11px;font-weight:600;text-align:center;padding:3px 2px;border:1px solid ${over?'var(--brand)':'var(--line2)'};border-radius:6px;background:var(--card);color:${over?'var(--brand)':'var(--muted)'}"/></div>${over?`<div style="font-size:9px;color:var(--brand);font-weight:700;cursor:pointer" onclick="resetFcAdj('${iso}')" title="Back to the forecast number">your # &middot; ↺ reset</div>`:(es?'<div class="faint" style="font-size:9px;opacity:.7">est.</div>':'')}</div>`; }).join('')+`</div></div>`;
  if(isAdmin && _wkFc){
    let _acc=null; try{ _acc=await fcAccuracy(); }catch(e){}
    const yoyPct=fcBasis?Math.round((fcBasis.yoy-1)*100):0; const ndgPct=fcBasis?Math.round((fcBasis.nudge-1)*100):0; const haveLY=fcBasis?!!fcBasis.haveLY:false;
    h+=`<div class="faint" style="font-size:12px;margin:8px 2px 0">Forecast this week: <b>${money(_wkFc)}</b><span onclick="fcGoalInfo()" title="How the forecast works" style="cursor:pointer;display:inline-block;width:15px;height:15px;line-height:15px;text-align:center;border-radius:50%;background:var(--brand);color:#fff;font-size:10px;font-weight:800;margin-left:5px">i</span>${covRules.targetPct?` &middot; aiming for the <b>whole week</b> at ${_tgtPct}% labor (heavy prep days and lean weekends both count toward it)`:''}. <span style="color:var(--brand);cursor:pointer;font-weight:600" onclick="var e=document.getElementById('fcMath');var s=e.style.display==='none';e.style.display=s?'block':'none';this.textContent=s?'Hide the math':'Show how this is figured';">Show how this is figured</span>${Object.keys(fcAdj).length?` &middot; <span style="color:var(--brand);cursor:pointer;font-weight:600" onclick="resetAllFcAdj('${isoDays[0]}','${isoDays[6]}')" title="Clear every number you typed this week, back to the forecast">Reset my overrides</span>`:''}</div>`;
    if(_acc){ h+=`<div class="faint" style="font-size:11.5px;margin:3px 2px 0">Tracking within about <b>${_acc.mape}%</b> of actual lately (last ${_acc.n} days${_acc.within>=50?`, inside 10% on ${_acc.within}% of them`:''}).</div>`; }
    let em='';
    if(haveLY){ em+=`<div style="font-size:12.5px;line-height:1.7;color:var(--ink)">We start with <b>last year, this same week</b> — hour by hour, day by day (dropping any freak day so one snow day or festival doesn't skew it). Then two adjustments:<br>&bull; You're running <b>${yoyPct>=0?'+':''}${yoyPct}%</b> vs a year ago (your last 4 weeks against the same 4 weeks last year), so we scale last year by that.<br>&bull; Last week came in <b>${Math.abs(ndgPct)<1?'right on trend':(ndgPct>0?'+'+ndgPct+'% hot':ndgPct+'% soft')}</b>, so we ${Math.abs(ndgPct)<1?'hold steady':'nudge '+(ndgPct>0?'up':'down')+' a touch'}.</div>`; }
    else { em+=`<div style="font-size:12.5px;line-height:1.7;color:var(--ink)">You don't have last year's numbers for this week yet, so we use your <b>recent same-weekday average</b> (the last several of each weekday), ${Math.abs(ndgPct)<1?'held with':(ndgPct>0?'nudged up '+ndgPct+'% with':'nudged down '+Math.abs(ndgPct)+'% with')} last week's trend. <b style="color:var(--brand);cursor:pointer" onclick="go('saleshist')">Import last year's hourly sales</b> and this sharpens up.</div>`; }
    const DN2=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    em+=`<table style="border-collapse:collapse;font-size:12px;margin-top:11px;width:100%"><thead><tr style="color:var(--muted);text-align:left"><th style="padding:4px 6px">Day</th>${haveLY?'<th style="padding:4px 6px;text-align:right">Last year</th>':''}<th style="padding:4px 6px;text-align:right">Forecast</th><th style="padding:4px 6px;text-align:right">You set</th></tr></thead><tbody>`;
    isoDays.forEach((iso,i)=>{ const dt=new Date(iso+'T12:00:00'); const ly=haveLY?((lyH[lyDates[i]]||{}).total||0):0; const auto=fcAuto[iso]||0; const over=fcAdj[iso]>0?fcAdj[iso]:null; em+=`<tr style="border-top:1px solid var(--line)"><td style="padding:4px 6px;font-weight:600">${DN2[dt.getDay()]} <span class="faint" style="font-weight:400">${dt.getMonth()+1}/${dt.getDate()}</span></td>${haveLY?`<td style="padding:4px 6px;text-align:right;color:var(--muted)">${ly?money(ly):'—'}</td>`:''}<td style="padding:4px 6px;text-align:right;font-weight:600">${auto?money(auto):'—'}</td><td style="padding:4px 6px;text-align:right;color:var(--brand);font-weight:700">${over?money(over):''}</td></tr>`; });
    em+=`</tbody></table><div class="faint" style="font-size:11px;margin-top:8px">Type your own number in the Forecast row above to override any day — your number wins, and labor % recalculates against it.</div>`;
    h+=`<div id="fcMath" class="card" style="display:none;padding:13px 15px;margin:8px 2px 0">${em}</div>`;
  }
  if(isAdmin){ const dn=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const _M=(covRules.matrix&&covRules.matrix.blocks&&covRules.matrix.blocks.length)?covRules.matrix:{blocks:[{s:'05:30',e:'06:00',n:[]},{s:'06:00',e:'08:00',n:[]},{s:'08:00',e:'11:00',n:[]},{s:'11:00',e:'13:00',n:[]},{s:'13:00',e:'14:00',n:[]}]};
    const _cc='padding:6px;border:1px solid var(--line2);border-radius:7px;background:var(--card);color:var(--ink);font-family:inherit;font-size:12.5px';
    const mrowHTML=(b)=>`<tr class="mrow"><td style="padding:3px 4px"><input type="time" class="mStart" value="${b.s||''}" style="width:88px;${_cc}"/></td><td style="padding:3px 4px"><input type="time" class="mEnd" value="${b.e||''}" style="width:88px;${_cc}"/></td>${dn.map((d,di)=>`<td style="padding:3px 4px;text-align:center"><input type="number" min="0" class="mN" value="${(b.n&&b.n[di]!=null&&b.n[di]!=='')?b.n[di]:''}" placeholder="—" style="width:42px;text-align:center;${_cc}"/></td>`).join('')}<td style="padding:3px 4px"><button onclick="this.closest('tr').remove()" title="Remove row" style="border:none;background:none;color:#B32D2D;cursor:pointer;font-size:17px;line-height:1">×</button></td></tr>`;
    const _stations=(state.settings&&Array.isArray(state.settings.stations))?state.settings.stations:[];
    const _roleOpts=[['__open__','Opening leader'],['__close__','Closing leader'],..._stations.map(s=>[s,s])];
    const _dLet=['M','T','W','T','F','S','S'];
    const rqrowHTML=(rq)=>{ rq=rq||{}; const days=Array.isArray(rq.days)?rq.days:[0,1,2,3,4,5,6]; return `<tr class="rqrow"><td style="padding:3px 4px"><select class="rqRole" style="${_cc}">${_roleOpts.map(o=>`<option value="${o[0]}"${rq.role===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select></td><td style="padding:3px 4px;text-align:center"><input type="number" min="1" class="rqCount" value="${rq.count||1}" style="width:40px;text-align:center;${_cc}"/></td><td style="padding:3px 4px"><input type="time" class="rqStart" value="${rq.start||''}" style="width:84px;${_cc}"/></td><td style="padding:3px 4px"><input type="time" class="rqEnd" value="${rq.end||''}" style="width:84px;${_cc}"/></td><td style="padding:3px 4px"><div style="display:flex;gap:2px">${_dLet.map((L,i)=>`<label style="display:inline-flex;flex-direction:column;align-items:center;font-size:9px;color:var(--muted)">${L}<input type="checkbox" class="rqDay" data-d="${i}" ${days.indexOf(i)>=0?'checked':''} style="width:14px;height:14px;margin-top:1px"/></label>`).join('')}</div></td><td style="padding:3px 4px"><input type="text" class="rqLabel" value="${esc(rq.label||'')}" placeholder="(optional)" title="Shows on the shift, e.g. Opening support" style="width:118px;${_cc}"/></td><td style="padding:3px 4px"><button onclick="this.closest('tr').remove()" title="Remove" style="border:none;background:none;color:#B32D2D;cursor:pointer;font-size:17px;line-height:1">×</button></td></tr>`; };
    const _presetBtn=(t,p)=>`<button class="btn" style="width:auto;padding:6px 11px;font-size:12.5px" onclick='addReqRow(${JSON.stringify(p)})'>+ ${t}</button>`;
    const _bakeStation=_stations.indexOf('Bake')>=0?'Bake':(_stations[0]||'Bake');
    const _presets=`<div class="faint" style="font-size:11.5px;margin:2px 0 7px">Quick add — tap a common one, then tweak:</div><div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:12px">${_presetBtn('Opening leader',{role:'__open__',count:1,start:'',end:'',label:'Opening lead'})}${_presetBtn('Opening support ('+_bakeStation.toLowerCase()+' at open)',{role:_bakeStation,count:1,start:'06:00',end:'08:00',label:'Opening support'})}${_presetBtn('Closing leader',{role:'__close__',count:1,start:'',end:'',label:'Closing lead'})}</div>`;
    const blkrowHTML=(bk)=>{ bk=bk||{}; const days=Array.isArray(bk.days)?bk.days:[0,1,2,3,4,5,6]; return `<tr class="blkrow"><td style="padding:3px 4px"><input type="time" class="blkStart" value="${bk.start||''}" style="width:88px;${_cc}"/></td><td style="padding:3px 4px"><input type="time" class="blkEnd" value="${bk.end||''}" style="width:88px;${_cc}"/></td><td style="padding:3px 4px"><div style="display:flex;gap:2px">${_dLet.map((L,i)=>`<label style="display:inline-flex;flex-direction:column;align-items:center;font-size:9px;color:var(--muted)">${L}<input type="checkbox" class="blkDay" data-d="${i}" ${days.indexOf(i)>=0?'checked':''} style="width:14px;height:14px;margin-top:1px"/></label>`).join('')}</div></td><td style="padding:3px 4px"><button onclick="this.closest('tr').remove()" title="Remove" style="border:none;background:none;color:#B32D2D;cursor:pointer;font-size:17px;line-height:1">×</button></td></tr>`; };
    h+=`<div class="faint" style="font-size:12px;margin:10px 0;text-align:center">Add a shift by tapping any empty day cell in the grid above — look for the <b style="color:var(--brand)">+</b>.</div>`;
    let _setupOpen=false; try{ _setupOpen=localStorage.getItem('sch_setup_open')==='1'; }catch(e){}
    h+=`<div onclick="schToggleSetup()" style="cursor:pointer;display:flex;align-items:center;gap:9px;padding:12px 15px;margin:14px 0 10px;border:1px solid var(--line2);border-radius:11px;background:var(--card)"><i class="ti ti-bulb" style="color:var(--brand);font-size:18px"></i><div style="flex:1;min-width:0"><div style="font-weight:800;font-size:14px;color:var(--ink)">The rules behind this schedule</div><div class="faint" style="font-size:12px">Coverage matrix, required roles, protected rush, labour targets, pay rates &mdash; these live in <b>The Brain</b>. Open them here if you need a quick change.</div></div><i id="schSetupChev" class="ti ti-chevron-${_setupOpen?'up':'down'}" style="color:var(--brand);font-size:18px"></i></div><div id="schSetup" style="display:${_setupOpen?'block':'none'}">`;
    h+=`<div class="sec">Coverage matrix — your staffing by time of day</div><div class="card" style="padding:14px" onchange="autoSaveCov()"><div class="faint" style="font-size:12px;margin-bottom:10px">Changes here <b>save automatically</b> as you make them. This is <b>your</b> matrix — every restaurant's is different, built from your own sales &amp; traffic. Add your time blocks, then for each block enter how many people you need on each day. The auto-draft staggers shifts to match this curve, so you're never overstaffed at open. (Later this imports straight from your POS.)</div><label style="display:flex;align-items:center;gap:9px;font-size:14px;cursor:pointer;margin-bottom:10px"><input type="checkbox" id="covLeader" ${covRules.requireLeader?'checked':''}/> <span>Require a <b>leader</b> (manager or supervisor) to open and close every day</span></label><div class="row" style="gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap"><span class="faint" style="font-size:12.5px">Shift length</span><span class="faint" style="font-size:12px">min</span><input type="number" min="2" max="12" step="0.5" id="covMin" value="${covRules.minLen||4}" style="width:54px;${_cc};text-align:center"/><span class="faint" style="font-size:12px">max</span><input type="number" min="3" max="14" step="0.5" id="covMax" value="${covRules.maxLen||8}" style="width:54px;${_cc};text-align:center"/><span class="faint" style="font-size:12px">hrs</span><span class="faint" style="font-size:12.5px;margin-left:18px">Labor&nbsp;% goal</span><input type="number" min="0" max="100" step="0.5" id="covLaborPct" value="${covRules.targetPct||''}" placeholder="e.g. 28" style="width:58px;${_cc};text-align:center"/><span class="faint" style="font-size:12px">%</span><span class="faint" style="font-size:12.5px;margin-left:18px" title="Payroll taxes, workers' comp, benefits on top of wages — an estimate you can set. Varies by state and wage level.">Labor burden</span><input type="number" min="0" max="60" step="1" id="covBurden" value="${covRules.burdenPct||''}" placeholder="~12" style="width:52px;${_cc};text-align:center"/><span class="faint" style="font-size:12px">% &mdash; the taxes &amp; benefits added on top of wages</span></div><div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12.5px"><thead><tr style="color:var(--muted)"><th style="padding:4px 6px 6px;text-align:left">Start</th><th style="padding:4px 6px 6px;text-align:left">End</th>${dn.map(d=>`<th style="padding:4px 6px 6px">${d}</th>`).join('')}<th></th></tr></thead><tbody id="matrixBody">${_M.blocks.map(mrowHTML).join('')}</tbody></table></div><div class="row" style="gap:10px;margin-top:12px;flex-wrap:wrap"><button class="btn" style="width:auto" onclick="addMatrixRow()"><i class="ti ti-plus"></i> Add time block</button><button class="btn" style="width:auto" onclick="seedMatrixFromDemand()"><i class="ti ti-wand"></i> Build from sales data</button></div><div class="faint" style="font-size:11.5px;margin-top:7px"><b>Build from sales data</b> reads your own sales history and drops in a starting matrix — the right number of people at the right hours for each day, based on how busy you actually were. It's a first draft: edit any cell after, it saves as you go.</div><div class="sec" style="margin-top:18px;font-size:13px">Required roles by time <span class="faint" style="font-weight:400">— optional</span></div><div class="faint" style="font-size:12px;margin-bottom:9px">On top of the headcount above, force specific coverage: an <b>opening leader</b>, an opening <b>baker at 6</b>, or two opening leads (front &amp; back, Chick-fil-A style). The draft fills these first and only with people who qualify — and counts them <b>inside</b> your headcount, not on top of it. Leave the times blank to mean "any shift that day." The <b>label</b> shows on the drafted shift so the schedule reads plainly.</div>${_presets}<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12.5px"><thead><tr style="color:var(--muted)"><th style="padding:4px 6px 6px;text-align:left">Need</th><th style="padding:4px 6px 6px">#</th><th style="padding:4px 6px 6px;text-align:left">From</th><th style="padding:4px 6px 6px;text-align:left">To</th><th style="padding:4px 6px 6px;text-align:left">Days</th><th style="padding:4px 6px 6px;text-align:left">Label</th><th></th></tr></thead><tbody id="reqBody">${(covRules.roleReqs||[]).map(rqrowHTML).join('')}</tbody></table></div><div class="row" style="gap:10px;margin-top:10px;flex-wrap:wrap"><button class="btn" style="width:auto" onclick="addReqRow()"><i class="ti ti-plus"></i> Add requirement</button></div><div class="sec" style="margin-top:18px;font-size:13px">Protected rush — no mid-rush shift changes <span class="faint" style="font-weight:400">— optional</span></div><div class="faint" style="font-size:12px;margin-bottom:9px">The draft won't <b>start or end</b> a shift inside these windows — nobody is scheduled to arrive or leave in the middle of the chaos (hard to get someone placed and a leader has to peel off to direct them). Someone can still clock in to help last‑minute; this only controls the schedule. Example: 11:00–1:00 lunch rush.</div><div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12.5px"><thead><tr style="color:var(--muted)"><th style="padding:4px 6px 6px;text-align:left">From</th><th style="padding:4px 6px 6px;text-align:left">To</th><th style="padding:4px 6px 6px;text-align:left">Days</th><th></th></tr></thead><tbody id="blkBody">${(covRules.blackouts||[]).map(blkrowHTML).join('')}</tbody></table></div><div class="row" style="gap:10px;margin-top:10px;flex-wrap:wrap"><button class="btn" style="width:auto" onclick="addBlkRow()"><i class="ti ti-plus"></i> Add protected window</button><button class="btn pri" style="width:auto" onclick="saveCovRules()">Save matrix &amp; rules</button><span id="covmsg" class="muted" style="font-size:13px;align-self:center"></span></div></div>`;
    h+=`<div class="sec">Projected sales (for labor %)</div><div class="card" style="padding:14px"><div class="faint" style="font-size:12px;margin-bottom:8px">Enter each day's expected sales — the daily total row shows labor as a % of sales, updating instantly.${window._salesCarried?` <span style="color:var(--amber)">Estimated from a recent week — edit any day for this one.</span>`:''}</div><div class="row" style="gap:10px;flex-wrap:wrap">${isoDays.map((iso,di)=>`<div style="text-align:center"><div class="faint" style="font-size:11px;margin-bottom:3px">${days[di].toLocaleDateString(undefined,{weekday:'short'})}</div><div class="row" style="gap:2px"><span class="faint" style="align-self:center">$</span><input type="number" id="sales-${iso}" min="0" value="${sales[iso]||''}" placeholder="0" oninput="setSales('${iso}',this.value)" style="width:72px;padding:6px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink)"/></div></div>`).join('')}</div></div>`;
    h+=`<div class="sec">Pay rates</div><div class="card" style="padding:16px;display:flex;align-items:center;gap:12px"><i class="ti ti-lock" style="font-size:20px;color:var(--muted)"></i><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13.5px">Kept off the schedule</div><div class="faint" style="font-size:12px">Wages don't show here, so no one reads them over your shoulder. They still power Labor $ and Labor %.</div></div><button class="btn" style="width:auto" onclick="go('pay')">Manage pay rates</button></div>`;
    h+=`</div>`;
  }
  // keep the reader exactly where they were: re-rendering after an edit shouldn't jump the page or lose the grid's sideways scroll
  var _sy=(typeof window!=='undefined'&&(window.scrollY||document.documentElement.scrollTop))||0;
  var _oldBoard=v.querySelector('.board'); var _sx=_oldBoard?_oldBoard.scrollLeft:0;
  v.innerHTML=h;
  try{ var _nb=v.querySelector('.board'); if(_nb&&_sx) _nb.scrollLeft=_sx; if(_sy) window.scrollTo(0,_sy); }catch(e){}
  if(isAdmin){ try{ if(!localStorage.getItem('sw_schedtour')) setTimeout(function(){ if(document.getElementById('schAutoDraft')) window.startSchedTour(); },700); }catch(e){} }
}
window.schToggleSetup=function(){ const b=document.getElementById('schSetup'); if(!b)return; const open=b.style.display==='none'; b.style.display=open?'block':'none'; try{localStorage.setItem('sch_setup_open',open?'1':'0');}catch(e){} const c=document.getElementById('schSetupChev'); if(c)c.className='ti ti-chevron-'+(open?'up':'down'); };
window.addMatrixRow=function(){ const c='padding:6px;border:1px solid var(--line2);border-radius:7px;background:var(--card);color:var(--ink);font-family:inherit;font-size:12.5px'; let cells=''; for(let d=0;d<7;d++) cells+=`<td style="padding:3px 4px;text-align:center"><input type="number" min="0" class="mN" placeholder="—" style="width:42px;text-align:center;${c}"/></td>`; const h=`<tr class="mrow"><td style="padding:3px 4px"><input type="time" class="mStart" style="width:88px;${c}"/></td><td style="padding:3px 4px"><input type="time" class="mEnd" style="width:88px;${c}"/></td>${cells}<td style="padding:3px 4px"><button onclick="this.closest('tr').remove()" title="Remove row" style="border:none;background:none;color:#B32D2D;cursor:pointer;font-size:17px;line-height:1">×</button></td></tr>`; const b=document.getElementById('matrixBody'); if(b) b.insertAdjacentHTML('beforeend',h); };
window.addReqRow=function(preset){ const b=document.getElementById('reqBody'); if(!b) return; const p=(preset&&typeof preset==='object')?preset:{}; const c='padding:6px;border:1px solid var(--line2);border-radius:7px;background:var(--card);color:var(--ink);font-family:inherit;font-size:12.5px'; const stations=(state.settings&&Array.isArray(state.settings.stations))?state.settings.stations:[]; const opts=[['__open__','Opening leader'],['__close__','Closing leader'],...stations.map(s=>[s,s])]; const dLet=['M','T','W','T','F','S','S']; const days=Array.isArray(p.days)?p.days:[0,1,2,3,4,5,6]; const esc2=s=>String(s==null?'':s).replace(/"/g,'&quot;'); const h=`<tr class="rqrow"><td style="padding:3px 4px"><select class="rqRole" style="${c}">${opts.map(o=>`<option value="${o[0]}"${p.role===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select></td><td style="padding:3px 4px;text-align:center"><input type="number" min="1" class="rqCount" value="${+p.count||1}" style="width:40px;text-align:center;${c}"/></td><td style="padding:3px 4px"><input type="time" class="rqStart" value="${esc2(p.start)}" style="width:84px;${c}"/></td><td style="padding:3px 4px"><input type="time" class="rqEnd" value="${esc2(p.end)}" style="width:84px;${c}"/></td><td style="padding:3px 4px"><div style="display:flex;gap:2px">${dLet.map((L,i)=>`<label style="display:inline-flex;flex-direction:column;align-items:center;font-size:9px;color:var(--muted)">${L}<input type="checkbox" class="rqDay" data-d="${i}" ${days.indexOf(i)>=0?'checked':''} style="width:14px;height:14px;margin-top:1px"/></label>`).join('')}</div></td><td style="padding:3px 4px"><input type="text" class="rqLabel" value="${esc2(p.label)}" placeholder="(optional)" style="width:118px;${c}"/></td><td style="padding:3px 4px"><button onclick="this.closest('tr').remove()" title="Remove" style="border:none;background:none;color:#B32D2D;cursor:pointer;font-size:17px;line-height:1">×</button></td></tr>`; b.insertAdjacentHTML('beforeend',h); };
window.addBlkRow=function(){ const b=document.getElementById('blkBody'); if(!b) return; const c='padding:6px;border:1px solid var(--line2);border-radius:7px;background:var(--card);color:var(--ink);font-family:inherit;font-size:12.5px'; const dLet=['M','T','W','T','F','S','S']; const h=`<tr class="blkrow"><td style="padding:3px 4px"><input type="time" class="blkStart" style="width:88px;${c}"/></td><td style="padding:3px 4px"><input type="time" class="blkEnd" style="width:88px;${c}"/></td><td style="padding:3px 4px"><div style="display:flex;gap:2px">${dLet.map((L,i)=>`<label style="display:inline-flex;flex-direction:column;align-items:center;font-size:9px;color:var(--muted)">${L}<input type="checkbox" class="blkDay" data-d="${i}" checked style="width:14px;height:14px;margin-top:1px"/></label>`).join('')}</div></td><td style="padding:3px 4px"><button onclick="this.closest('tr').remove()" title="Remove" style="border:none;background:none;color:#B32D2D;cursor:pointer;font-size:17px;line-height:1">×</button></td></tr>`; b.insertAdjacentHTML('beforeend',h); };
window.saveCovRules=async function(){ const g=id=>((document.getElementById(id)||{}).value||'').trim(); const blocks=[]; document.querySelectorAll('#matrixBody .mrow').forEach(tr=>{ const s=(tr.querySelector('.mStart')||{}).value||''; const e=(tr.querySelector('.mEnd')||{}).value||''; const ns=[...tr.querySelectorAll('.mN')].map(inp=>{ const v=(inp.value||'').trim(); return v===''?0:+v; }); if(s&&e) blocks.push({s,e,n:ns}); }); const roleReqs=[]; document.querySelectorAll('#reqBody .rqrow').forEach(tr=>{ const role=(tr.querySelector('.rqRole')||{}).value||''; if(!role) return; const count=Math.max(1,+((tr.querySelector('.rqCount')||{}).value)||1); const start=(tr.querySelector('.rqStart')||{}).value||''; const end=(tr.querySelector('.rqEnd')||{}).value||''; const days=[...tr.querySelectorAll('.rqDay')].filter(c=>c.checked).map(c=>+c.getAttribute('data-d')); const label=((tr.querySelector('.rqLabel')||{}).value||'').trim(); roleReqs.push({role,count,start,end,days,label}); }); const blackouts=[]; document.querySelectorAll('#blkBody .blkrow').forEach(tr=>{ const start=(tr.querySelector('.blkStart')||{}).value||''; const end=(tr.querySelector('.blkEnd')||{}).value||''; if(!start||!end) return; const days=[...tr.querySelectorAll('.blkDay')].filter(c=>c.checked).map(c=>+c.getAttribute('data-d')); blackouts.push({start,end,days}); }); const requireLeader=!!((document.getElementById('covLeader')||{}).checked); const minLen=+g('covMin')||4, maxLen=+g('covMax')||8; const tp=+g('covLaborPct'); const bp=+g('covBurden'); const detail=JSON.stringify({requireLeader,minLen,maxLen,targetPct:(tp>0?tp:''),burdenPct:(bp>0?bp:''),matrix:{blocks},roleReqs,blackouts}); const m=document.getElementById('covmsg'); const _rk=await window._replaceKind('covrules',{kind:'covrules',title:'coverage',on_date:null,detail,created_by:state.user.id}); if(!_rk.ok){ if(m){ m.textContent='⚠️ '+window._replaceMsg(_rk); m.style.color='#B32D2D'; } return; } if(m){ m.textContent='Saved ✓'; m.style.color='var(--green)'; } };
window.autoSaveCov=function(){ clearTimeout(window._covSaveT); const m=document.getElementById('covmsg'); if(m){ m.textContent='Saving…'; m.style.color='var(--muted)'; } window._covSaveT=setTimeout(()=>{ if(typeof saveCovRules==='function') saveCovRules(); }, 600); };
// Seed the coverage matrix from the restaurant's own last-year demand, then merge same-headcount hours into clean blocks. Starting point only — owner edits after.
window.seedMatrixFromDemand=async function(){
  const btn=document.querySelector('[onclick="seedMatrixFromDemand()"]'); if(btn){ btn._h=btn.innerHTML; btn.innerHTML='<i class="ti ti-loader"></i> Reading last year…'; btn.style.pointerEvents='none'; btn.style.opacity='.7'; }
  const restore=()=>{ if(btn){ btn.innerHTML=btn._h; btn.style.pointerEvents=''; btn.style.opacity=''; } };
  try{
    if(typeof csTargetMatrix!=='function'){ alert('The forecast engine isn\'t loaded.'); return restore(); }
    const wk=state.ctx.wk||isoDate(weekStart(new Date()));
    const m=await csTargetMatrix(wk);
    if(!m||!m.blocks||!m.blocks.length){ alert('I need your Toast hourly sales history first. Import last year\'s hourly sales under Sales history, then tap Build from last year again.'); return restore(); }
    const merged=[]; m.blocks.forEach(b=>{ const last=merged[merged.length-1]; if(last && last.e===b.s && JSON.stringify(last.n)===JSON.stringify(b.n)) last.e=b.e; else merged.push({s:b.s,e:b.e,n:(b.n||[]).slice()}); });
    const body=document.getElementById('matrixBody'); if(!body){ return restore(); }
    const hasVals=[...body.querySelectorAll('.mN')].some(i=>(i.value||'').trim()!=='');
    if(hasVals && !confirm('Replace your current coverage matrix with one built from last year’s demand?\n\nIt’s a starting point — you can edit every cell after, and nothing publishes until you draft and publish.')) return restore();
    const c='padding:6px;border:1px solid var(--line2);border-radius:7px;background:var(--card);color:var(--ink);font-family:inherit;font-size:12.5px';
    const row=b=>{ let cells=''; for(let d=0;d<7;d++){ const v=(b.n&&b.n[d]!=null&&b.n[d]!=='')?b.n[d]:''; cells+=`<td style="padding:3px 4px;text-align:center"><input type="number" min="0" class="mN" value="${v}" placeholder="—" style="width:42px;text-align:center;${c}"/></td>`; } return `<tr class="mrow"><td style="padding:3px 4px"><input type="time" class="mStart" value="${b.s||''}" style="width:88px;${c}"/></td><td style="padding:3px 4px"><input type="time" class="mEnd" value="${b.e||''}" style="width:88px;${c}"/></td>${cells}<td style="padding:3px 4px"><button onclick="this.closest('tr').remove()" title="Remove row" style="border:none;background:none;color:#B32D2D;cursor:pointer;font-size:17px;line-height:1">×</button></td></tr>`; };
    body.innerHTML=merged.map(row).join('');
    if(typeof saveCovRules==='function') saveCovRules();
    const msg=document.getElementById('covmsg'); if(msg){ msg.textContent='Built from last year ✓ — edit any cell, it saves as you go'; msg.style.color='var(--green)'; }
  }catch(e){ alert('Couldn\'t build the matrix: '+(e&&e.message||e)); }
  restore();
};
// Save/clear an owner override of a day's forecast. Storing only when it differs from the machine's number keeps "your #" honest.
window.setFcAdj=async function(iso,val,auto){ const n=Math.round(+val||0); try{ await sb.from('day_items').delete().eq('kind','fcadj').eq('on_date',iso); if(n>0 && n!==Math.round(+auto||0)){ await sb.from('day_items').insert({kind:'fcadj',title:'forecast override',on_date:iso,detail:JSON.stringify({amt:n}),created_by:state.user.id}); } }catch(e){} const _b=document.getElementById('schbody'); if(_b&&typeof schBoard==='function') schBoard(_b); };
// Snap one day back to the machine forecast (clear the owner's override).
window.resetFcAdj=async function(iso){ try{ await sb.from('day_items').delete().eq('kind','fcadj').eq('on_date',iso); }catch(e){} const _b=document.getElementById('schbody'); if(_b&&typeof schBoard==='function') schBoard(_b); };
// Snap the whole visible week back to the forecast.
window.resetAllFcAdj=async function(a,b){ if(!confirm('Clear the forecast numbers you typed for this week and go back to the auto forecast?')) return; try{ await sb.from('day_items').delete().eq('kind','fcadj').gte('on_date',a).lte('on_date',b); }catch(e){} const _b=document.getElementById('schbody'); if(_b&&typeof schBoard==='function') schBoard(_b); };
window.weekShift=function(n){ if(n===0){ state.ctx.wk=isoDate(weekStart(new Date())); } else { const base=state.ctx.wk?wkDate(state.ctx.wk):weekStart(new Date()); base.setDate(base.getDate()+n*7); state.ctx.wk=isoDate(base); } try{localStorage.setItem('sched_wk',state.ctx.wk);}catch(e){} const _b=document.getElementById('schbody'); if(_b&&typeof schBoard==='function'){ schBoard(_b); } else { vSchedule(document.getElementById('view')); } };
/* NOTE: addShift() below is dead code -- it is never called and the form ids it reads
   (shname/shdate/shstart/shkind) do not exist anywhere in this file. Shifts are added
   through the quick-add on the board and edited through editShift(). Left in place
   rather than deleted so nothing that might reference it later breaks silently. */
window.addShift=async function(){ const nm=val('shname'); const on=document.getElementById('shdate').value; if(!nm||!on){ alert('Pick a person and a date.'); return; } const prof=(window._team||[]).find(p=>p.name===nm);
  /* A person can have more than one block on a day -- a manager works 6 to 12, comes back
     3 to 4 for a leadership meeting. Both are real shifts. The optional label says what the
     block IS, so the schedule reads "Manager Meeting" rather than an unexplained second bar. */
  const _lbl=(document.getElementById('shnote')?document.getElementById('shnote').value.trim():'');
  const _st=document.getElementById('shstart').value, _en=document.getElementById('shend').value;
  const _r=await sb.from('shifts').insert({person_name:nm,role:val('shrole')||(prof&&prof.title)||'',on_date:on,start_time:_st,end_time:_en,kind:document.getElementById('shkind').value,note:_lbl||null,user_id:prof?prof.id:null});
  if(_r&&_r.error){ alert('That shift was not saved.\n\n'+_r.error.message); return; }
  state.ctx.wk=isoDate(weekStart(wkDate(on))); schRefresh(); };
// Refresh ONLY the schedule board, never the whole schedule page. Rebuilding the page is what made every edit feel like a reload.
window.schRefresh=function(){
  var b=document.getElementById('schbody');
  if(b&&typeof schBoard==='function'){ schBoard(b); return; }
  var v=document.getElementById('view'); if(v&&typeof vSchedule==='function') vSchedule(v);
};
// Cancel the quick-add box by restoring the cell we replaced, instead of rebuilding anything.
window.schQuickCancel=function(btn){
  var c=btn&&btn.closest?btn.closest('.daycell'):null; if(!c) return;
  if(c._prevHTML!=null) c.innerHTML=c._prevHTML; else schRefresh();
};
// Tapping the red warning triangle explains the conflict rather than opening the shift editor.
window.schWhyConflict=function(el){
  var cell=el&&el.closest?el.closest('.daycell'):null;
  var why=(cell&&cell.getAttribute('data-badwhy'))||'This shift conflicts with their availability';
  var old=document.getElementById('whyConf'); if(old) old.remove();
  var w=document.createElement('div'); w.id='whyConf';
  w.style.cssText='position:fixed;inset:0;z-index:10001;background:rgba(16,24,40,.35);display:flex;align-items:center;justify-content:center;padding:20px';
  w.onclick=function(e){ if(e.target===w) w.remove(); };
  var box=document.createElement('div'); box.className='card'; box.style.cssText='max-width:370px;width:100%;padding:18px 20px';
  box.innerHTML='<div style="display:flex;gap:11px;align-items:flex-start"><i class="ti ti-alert-triangle" style="color:#A32D2D;font-size:20px;margin-top:1px;flex:none"></i><div><div style="font-weight:700;font-size:15px;margin-bottom:5px;color:#A32D2D">Scheduling conflict</div><div style="font-size:13.5px;line-height:1.55;color:var(--ink)">'+esc(why)+'.</div><div class="faint" style="font-size:12.5px;margin-top:9px">Leave it if they have agreed to cover, or drag the shift to another day.</div></div></div><div style="text-align:right;margin-top:16px"><button class="btn" style="width:auto">Got it</button></div>';
  w.appendChild(box); document.body.appendChild(w);
  box.querySelector('button').onclick=function(){ w.remove(); };
};
window.delShift=async function(id){
  // take the chip off screen straight away, then save. Only the board refreshes, not the whole schedule page.
  var chip=document.querySelector('.scard[data-sid="'+id+'"]'), parent=chip&&chip.parentNode, next=chip&&chip.nextSibling;
  if(chip) chip.remove();
  var r=await sb.from('shifts').delete().eq('id',id);
  if(r&&r.error){ if(chip&&parent) parent.insertBefore(chip,next); alert('Could not remove that shift: '+r.error.message); return; }
  var b=document.getElementById('schbody');
  if(b&&typeof schBoard==='function') schBoard(b); else vSchedule(document.getElementById('view'));
};
// Click an empty schedule cell -> type start/end right there -> saves a shift for that person/day
window.quickAdd=function(cell){ if(!cell||cell.querySelector('.qadd'))return; cell._prevHTML=cell.innerHTML; cell.innerHTML=`<div class="qadd" onclick="event.stopPropagation()" style="display:flex;flex-direction:column;gap:3px;padding:1px"><input type="time" class="qaS" value="08:00" style="font-size:11px;padding:2px 3px;border:1px solid var(--line2);border-radius:5px;font-family:inherit;background:var(--card);color:var(--ink)"/><input type="time" class="qaE" value="14:00" style="font-size:11px;padding:2px 3px;border:1px solid var(--line2);border-radius:5px;font-family:inherit;background:var(--card);color:var(--ink)"/><div style="display:flex;gap:3px"><button onclick="quickAddSave(this)" style="flex:1;font-size:10px;padding:3px;border:none;border-radius:5px;background:var(--brand);color:#fff;cursor:pointer;font-weight:700">Add</button><button onclick="schQuickCancel(this)" style="font-size:10px;padding:3px 5px;border:1px solid var(--line2);border-radius:5px;background:var(--card);color:var(--muted);cursor:pointer">&times;</button></div></div>`; const f=cell.querySelector('.qaS'); if(f)f.focus(); };
window.quickAddSave=async function(btn){ const cell=btn.closest('.daycell'); const box=btn.closest('.qadd'); if(!cell||!box)return; const name=cell.dataset.nm, iso=cell.dataset.iso; const s=box.querySelector('.qaS').value, e=box.querySelector('.qaE').value; if(!s||!e){ alert('Pick a start and end time.'); return; } if(e<=s){ alert('End time needs to be after the start time.'); return; } await sb.from('shifts').insert({person_name:name, role:posOf(name), on_date:iso, start_time:s, end_time:e, kind:'shift', user_id:(profileOf(name)||{}).id||null});
  // If this new shift covers an OPEN slot that day, clear the open slot so the "needs filling" flag goes away
  try{ const op=await sb.from('shifts').select('id,start_time,end_time').eq('on_date',iso).eq('person_name','__OPEN__'); const cov=(op.data||[]).filter(o=>(o.start_time||'')>=s && (o.end_time||'99:99')<=e); if(cov.length) await sb.from('shifts').delete().in('id',cov.map(o=>o.id)); }catch(e2){}
  schRefresh(); };
window.editShift=function(id){
  const s=(window._shifts||{})[id]; if(!s)return; const ojr=false;
  let m=document.getElementById('shedit'); if(m)m.remove();
  m=document.createElement('div'); m.id='shedit'; m.style.cssText='position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  m.innerHTML=`<div style="background:var(--card);width:100%;max-width:460px;border-radius:16px 16px 0 0;padding:20px 20px 28px;box-shadow:0 -8px 40px rgba(0,0,0,.22)"><div style="font-weight:700;font-size:16px">${esc(s.person_name||'Shift')}</div><div class="faint" style="font-size:12.5px;margin-bottom:16px">${esc(fmtDay(_d(s.on_date)))}${s.role?' · '+esc(s.role):''}</div><div class="row" style="gap:10px"><div style="flex:1"><label style="font-size:12px;color:var(--muted)">Start</label><input id="esStart" type="time" value="${s.start_time||''}" style="width:100%;padding:11px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit"/></div><div style="flex:1"><label style="font-size:12px;color:var(--muted)">End</label><input id="esEnd" type="time" value="${s.end_time||''}" style="width:100%;padding:11px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit"/></div></div><div style="margin-top:14px"><label style="font-size:12px;color:var(--muted)">What is this block? <span style="opacity:.7">(optional)</span></label><input id="esNote" type="text" value="${esc(s.note||'')}" placeholder="e.g. Manager Meeting, Prep, Training" style="width:100%;padding:11px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit"/><div class="faint" style="font-size:11.5px;margin-top:5px">Someone can have more than one block in a day \u2014 open the store, then come back for a meeting. Naming it means the team knows why they are on twice.</div></div><label style="display:flex;align-items:center;gap:9px;margin:14px 0 4px;font-size:14px;cursor:pointer"><input type="checkbox" id="esTrain" ${s.kind==='training'?'checked':''}/> Training shift</label><label style="display:flex;align-items:center;gap:9px;margin:8px 0 2px;font-size:14px;cursor:pointer"><input type="checkbox" id="esOjr" ${ojr?'checked':''}/> <span><b>OJR today</b> \u2014 in charge of this day</span></label><div id="ojrTeach" style="display:none;background:var(--bg,#f4f7f8);border-left:3px solid var(--brand,#4a9cad);border-radius:9px;padding:11px 13px;margin:8px 0 2px"><div style="font-weight:700;font-size:13px">Owner Judgment Representative</div><div class="faint" style="font-size:12.5px;line-height:1.55;margin-top:3px">When more than one leader is on, one person is actually running the shift. That is the OJR. The team knows who to go to, and you know who to ask about how the shift went. Pick one per day \u2014 not per leader.</div></div><div class="row" style="gap:8px;margin-top:16px"><button class="btn" style="width:auto;color:#A32D2D;border-color:#F0C9C9" onclick="delShiftM(${s.id})">Delete</button><button class="btn" style="width:auto;margin-left:auto" onclick="document.getElementById('shedit').remove()">Cancel</button><button class="btn pri" style="width:auto" onclick='saveShift(${s.id},${JSON.stringify(s.on_date)},${JSON.stringify(s.person_name||"")})'>Save</button></div></div>`;
  document.body.appendChild(m); m.addEventListener('click',e=>{ if(e.target===m) m.remove(); });
  /* Teach OJR the first time someone meets it, then get out of the way. It is a real
     operating concept a new manager will not know, and a bare acronym on a checkbox
     teaches nobody. Shown once. */
  try{ if(!localStorage.getItem('ojr_taught')){ const _t=document.getElementById('ojrTeach'); if(_t){ _t.style.display='block'; localStorage.setItem('ojr_taught','1'); } } }catch(e){}
  sb.from('day_items').select('detail').eq('kind','ojr').eq('on_date',s.on_date).maybeSingle().then(o=>{ if(o.data&&o.data.detail===s.person_name){ const cb=document.getElementById('esOjr'); if(cb)cb.checked=true; } });
};
window.saveShift=async function(id,onDate,person){ const st=document.getElementById('esStart').value; const en=document.getElementById('esEnd').value; const kind=document.getElementById('esTrain').checked?'training':'shift'; const ojr=document.getElementById('esOjr').checked; const _n=(document.getElementById('esNote')?document.getElementById('esNote').value.trim():'');
  const _u=await sb.from('shifts').update({start_time:st||null,end_time:en||null,kind,note:_n||null}).eq('id',id);
  if(_u&&_u.error){ alert('That change was not saved.\n\n'+_u.error.message); return; } await sb.from('day_items').delete().eq('kind','ojr').eq('on_date',onDate); if(ojr) await sb.from('day_items').insert({kind:'ojr',on_date:onDate,title:'OJR',detail:person,created_by:state.user.id}); const m=document.getElementById('shedit'); if(m)m.remove(); schRefresh(); };
window.delShiftM=async function(id){ var chip=document.querySelector('.scard[data-sid="'+id+'"]'); if(chip) chip.remove(); await sb.from('shifts').delete().eq('id',id); const m=document.getElementById('shedit'); if(m)m.remove(); schRefresh(); };
/* ---- Calendar events (meetings, 1-on-1s, interviews, leadership) + add-to-calendar (.ics / Google) ---- */
function _icsDT(iso,hhmm){ const t=(hhmm||'09:00').split(':'); return String(iso).replace(/-/g,'')+'T'+String(t[0]||'09').padStart(2,'0')+String(t[1]||'00').padStart(2,'0')+'00'; }
function _icsEsc(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n'); }
function _vevent(o){ const uid=o.uid||('sw'+Math.random().toString(36).slice(2)+'@sidewalk'); const st=_icsDT(o.on_date,o.start_time||'09:00'); const en=_icsDT(o.on_date,o.end_time||o.start_time||'10:00'); return ['BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+_icsDT(isoDate(new Date()),'00:00'),'DTSTART:'+st,'DTEND:'+en,'SUMMARY:'+_icsEsc(o.title||'Event'),o.location?'LOCATION:'+_icsEsc(o.location):'',o.note?'DESCRIPTION:'+_icsEsc(o.note):'','BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY','DESCRIPTION:'+_icsEsc(o.title||'Event'),'END:VALARM','END:VEVENT'].filter(Boolean).join('\r\n'); }
function _downloadICS(fn,ve){ const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sidewalk Academy//Schedule//EN','CALSCALE:GREGORIAN'].concat(ve).concat(['END:VCALENDAR']).join('\r\n'); const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=fn; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); },600); }
function _gcalUrl(o){ const st=_icsDT(o.on_date,o.start_time||'09:00'), en=_icsDT(o.on_date,o.end_time||o.start_time||'10:00'); const p=new URLSearchParams(); p.set('action','TEMPLATE'); p.set('text',o.title||'Event'); p.set('dates',st+'/'+en); if(o.location)p.set('location',o.location); if(o.note)p.set('details',o.note); return 'https://calendar.google.com/calendar/render?'+p.toString(); }
window.addMyShiftsToCal=function(){ const me=myRosterName()||(state.profile&&state.profile.name)||''; const all=(window._sch&&window._sch.shifts)||[]; const mine=all.filter(function(s){ return s.person_name===me && s.person_name!=='__OPEN__'; }); if(!mine.length){ alert(me?'No shifts for you in this week yet.':'Your name isn\'t on the schedule yet.'); return; } const ve=mine.map(function(s){ return _vevent({on_date:s.on_date,start_time:s.start_time,end_time:s.end_time,title:'Work · Sidewalk'+(s.role&&s.role!=='shift'?' ('+s.role+')':''),uid:'shift-'+s.id+'@sidewalk'}); }); _downloadICS('my-sidewalk-shifts.ics',ve); };
window.addEventModal=function(iso,editId){ const ev=editId?(window._events||{})[editId]:null; const team=(window._team||[]).map(function(p){return p.name;}).filter(Boolean); const kinds=[['one_on_one','1-on-1'],['interview','Interview'],['leadership','Leadership meeting'],['meeting','Meeting']]; const cur=ev?ev.kind:'one_on_one'; const att=(ev&&Array.isArray(ev.attendees))?ev.attendees:[];
  let m=document.getElementById('evmodal'); if(m)m.remove(); m=document.createElement('div'); m.id='evmodal'; m.style.cssText='position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  m.innerHTML=`<div style="background:var(--card);width:100%;max-width:480px;border-radius:16px 16px 0 0;padding:20px 20px 28px;box-shadow:0 -8px 40px rgba(0,0,0,.22);max-height:88vh;overflow:auto"><div style="font-weight:700;font-size:16px;margin-bottom:14px">${ev?'Edit event':'Add an event'}</div><label style="font-size:12px;color:var(--muted)">Type</label><select id="evKind" style="width:100%;padding:11px;margin:4px 0 12px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit">${kinds.map(function(k){return `<option value="${k[0]}" ${cur===k[0]?'selected':''}>${k[1]}</option>`;}).join('')}</select><label style="font-size:12px;color:var(--muted)">Title</label><input id="evTitle" value="${ev?esc(ev.title||''):''}" placeholder="e.g. 1-on-1 with Presley" style="width:100%;padding:11px;margin:4px 0 12px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit"/><div class="row" style="gap:10px"><div style="flex:1"><label style="font-size:12px;color:var(--muted)">Date</label><input id="evDate" type="date" value="${ev?ev.on_date:(iso||isoDate(new Date()))}" style="width:100%;padding:11px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit"/></div></div><div class="row" style="gap:10px;margin-top:12px"><div style="flex:1"><label style="font-size:12px;color:var(--muted)">Start</label><input id="evStart" type="time" value="${ev?(ev.start_time||''):''}" style="width:100%;padding:11px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit"/></div><div style="flex:1"><label style="font-size:12px;color:var(--muted)">End</label><input id="evEnd" type="time" value="${ev?(ev.end_time||''):''}" style="width:100%;padding:11px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit"/></div></div><label style="font-size:12px;color:var(--muted);display:block;margin-top:12px">Location / note</label><input id="evLoc" value="${ev?esc(ev.location||''):''}" placeholder="Optional — where, or a quick note" style="width:100%;padding:11px;margin:4px 0 12px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit"/><label style="font-size:12px;color:var(--muted);display:block">Who's joining <span class="faint">— they'll see it and can add it to their own calendar</span></label><div id="evAtt" style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 4px">${team.length?team.map(function(n){return `<label style="display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line2);border-radius:999px;padding:5px 11px;font-size:13px;cursor:pointer"><input type="checkbox" value="${esc(n)}" ${att.indexOf(n)>=0?'checked':''}/> ${esc(n)}</label>`;}).join(''):'<span class="faint" style="font-size:12.5px">No team members on the roster yet</span>'}</div><div class="row" style="gap:8px;margin-top:18px">${ev?`<button class="btn" style="width:auto;color:#A32D2D;border-color:#F0C9C9" onclick="delEvent('${ev.id}')">Delete</button>`:''}<button class="btn" style="width:auto;margin-left:auto" onclick="document.getElementById('evmodal').remove()">Cancel</button><button class="btn pri" style="width:auto" onclick="saveNewEvent(${ev?`'${ev.id}'`:'null'})">${ev?'Save':'Add event'}</button></div></div>`;
  document.body.appendChild(m); m.addEventListener('click',function(e){ if(e.target===m) m.remove(); }); };
window.saveNewEvent=async function(id){ const kind=val('evKind'); const title=(val('evTitle')||'').trim(); const on=document.getElementById('evDate').value; const st=document.getElementById('evStart').value; const en=document.getElementById('evEnd').value; const loc=(val('evLoc')||'').trim(); const att=[].slice.call(document.querySelectorAll('#evAtt input:checked')).map(function(c){return c.value;}); if(!on){ alert('Pick a date.'); return; } const KL={one_on_one:'1-on-1',interview:'Interview',leadership:'Leadership meeting',meeting:'Meeting'}; const finalTitle=title||(att.length?(KL[kind]||'Meeting')+' — '+att.join(', '):(KL[kind]||'Meeting')); const rec={kind:kind,title:finalTitle,on_date:on,start_time:st||null,end_time:en||null,location:loc||null,attendees:att}; try{ if(id){ await sb.from('events').update(rec).eq('id',id); } else { rec.created_by=state.user.id; await sb.from('events').insert(rec); } }catch(e){ alert("Couldn't save the event: "+(e&&e.message||e)+(String(e&&e.message).indexOf('events')>=0?' — the events table may not be set up yet.':'')); return; } const mm=document.getElementById('evmodal'); if(mm)mm.remove(); state.ctx.wk=isoDate(weekStart(wkDate(on))); schRefresh(); };
window.eventDetail=function(id){ const e=(window._events||{})[id]; if(!e)return; const isAdmin=(typeof myRank==='function'&&myRank()>=3)||(typeof hasGrant==='function'&&hasGrant('schedule')); const KL={one_on_one:'1-on-1',interview:'Interview',leadership:'Leadership meeting',meeting:'Meeting'}; const KC={one_on_one:'#4A9CAD',interview:'#7C3AED',leadership:'#2563EB',meeting:'#64748B'}; const col=KC[e.kind]||'#64748B'; const att=Array.isArray(e.attendees)?e.attendees:[]; const when=fmtDay(_d(e.on_date))+(e.start_time?' · '+fmtClock(e.start_time):'')+(e.end_time?'–'+fmtClock(e.end_time):'');
  let m=document.getElementById('evdet'); if(m)m.remove(); m=document.createElement('div'); m.id='evdet'; m.style.cssText='position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  m.innerHTML=`<div style="background:var(--card);width:100%;max-width:460px;border-radius:16px 16px 0 0;padding:20px 20px 28px;box-shadow:0 -8px 40px rgba(0,0,0,.22)"><div style="display:inline-block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${col};background:${col}14;padding:3px 9px;border-radius:6px;margin-bottom:9px">${KL[e.kind]||'Meeting'}</div><div style="font-weight:700;font-size:17px;line-height:1.25">${esc(e.title||KL[e.kind]||'Event')}</div><div class="faint" style="font-size:13px;margin-top:3px">${esc(when)}</div>${e.location?`<div style="font-size:13.5px;margin-top:8px"><i class="ti ti-map-pin" style="color:var(--muted)"></i> ${esc(e.location)}</div>`:''}${att.length?`<div style="font-size:13px;margin-top:10px;color:var(--muted)">With: <span style="color:var(--ink)">${att.map(esc).join(', ')}</span></div>`:''}<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" style="width:auto" onclick="calAddEvent('${e.id}')"><i class="ti ti-calendar-plus"></i> Add to my calendar</button><a class="btn" style="width:auto;text-decoration:none;display:inline-flex;align-items:center;gap:5px" href="${_gcalUrl({on_date:e.on_date,start_time:e.start_time,end_time:e.end_time,title:e.title,location:e.location,note:e.note})}" target="_blank" rel="noopener"><i class="ti ti-brand-google"></i> Google</a></div><div class="row" style="gap:8px;margin-top:16px">${isAdmin?`<button class="btn" style="width:auto" onclick="document.getElementById('evdet').remove();addEventModal(null,'${e.id}')"><i class="ti ti-pencil"></i> Edit</button>`:''}<button class="btn" style="width:auto;margin-left:auto" onclick="document.getElementById('evdet').remove()">Close</button></div></div>`;
  document.body.appendChild(m); m.addEventListener('click',function(x){ if(x.target===m) m.remove(); }); };
window.calAddEvent=function(id){ const e=(window._events||{})[id]; if(!e)return; const fn=(e.title||'event').replace(/[^a-z0-9]+/gi,'-').toLowerCase().replace(/^-+|-+$/g,'')||'event'; _downloadICS(fn+'.ics',[_vevent({on_date:e.on_date,start_time:e.start_time,end_time:e.end_time,title:e.title||'Event',location:e.location,note:e.note,uid:'ev-'+e.id+'@sidewalk'})]); };
window.delEvent=async function(id){ if(!confirm('Delete this event?'))return; try{ await sb.from('events').delete().eq('id',id); }catch(e){} ['evmodal','evdet'].forEach(function(x){ const el=document.getElementById(x); if(el)el.remove(); }); vSchedule(document.getElementById('view')); };
window.fillShift=async function(id){
  const s=(window._shifts||{})[id]; if(!s)return;
  const wd=(new Date(s.on_date+'T00:00').getDay()+6)%7;
  const [rav,rto,rpf,rsh]=await Promise.all([ sb.from('availability').select('person_name,weekday,can_work,note'), sb.from('time_off').select('*').eq('status','approved'), sb.from('profiles').select('name,role'), sb.from('shifts').select('person_name,on_date') ]);
  await loadPositions(); await loadArchived();
  const set=new Set(); rosterNames().forEach(n=>set.add(n)); (rsh.data||[]).forEach(x=>{ if(x.person_name&&x.person_name!=='__OPEN__')set.add(x.person_name); });
  const people=[...set].filter(n=>n&&!isArchived(n));
  const avMap={}; (rav.data||[]).forEach(a=>{ (avMap[a.person_name]=avMap[a.person_name]||{})[a.weekday]={can_work:a.can_work,note:a.note}; });
  const onLeave=n=> (rto.data||[]).some(t=>t.person_name===n && s.on_date>=t.start_date && s.on_date<=(t.end_date||t.start_date));
  const busy=n=> (rsh.data||[]).some(x=>x.person_name===n && x.on_date===s.on_date);
  const ss=parseClock(s.start_time), se=parseClock(s.end_time);
  const status=n=>{ if(onLeave(n)) return {ok:false,r:'On approved time off'}; if(busy(n)) return {ok:false,r:'Already scheduled this day'}; const a=avMap[n]&&avMap[n][wd]; if(a&&a.can_work===false) return {ok:false,r:'Marked unavailable that day'}; const win=a&&parseWin(a.note); if(win){ const ws=parseClock(win[0]),we=parseClock(win[1]); if(ws!=null&&we!=null&&ss!=null&&se!=null&&(ss<ws-1e-9||se>we+1e-9)) return {ok:false,r:'Only available '+win[0]+'–'+win[1]}; } return {ok:true,r: posOf(n)===s.role?'Available':'Available · '+posOf(n)}; };
  const list=people.map(n=>({n,st:status(n),sp:posOf(n)===s.role})).sort((a,b)=> (a.st.ok?0:1)-(b.st.ok?0:1) || (b.sp?1:0)-(a.sp?1:0) || a.n.localeCompare(b.n));
  let m=document.getElementById('fillm'); if(m)m.remove();
  m=document.createElement('div'); m.id='fillm'; m.style.cssText='position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  m.innerHTML=`<div style="background:var(--card);width:100%;max-width:480px;border-radius:16px 16px 0 0;padding:20px 20px 26px;box-shadow:0 -8px 40px rgba(0,0,0,.22);max-height:86vh;overflow:auto"><div style="font-weight:700;font-size:16px">Fill open ${esc(s.role||'shift')}</div><div class="faint" style="font-size:12.5px;margin-bottom:6px">${esc(fmtDay(_d(s.on_date)))} · ${s.start_time?fmtClock(s.start_time):''}${s.end_time?'–'+fmtClock(s.end_time):''}</div><div class="faint" style="font-size:12px;margin-bottom:12px">Green = ready to go. Anyone blocked shows why — you can still assign them, but they'll need to approve.</div>`+list.map(x=>{ const inits=(x.n||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); return `<div class="row" style="padding:9px 2px;border-bottom:1px solid var(--line);gap:10px"><span class="av">${esc(inits)}</span><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(x.n)}</div><div style="font-size:12px;color:${x.st.ok?'#1B7B3F':'#A32D2D'}">${esc(x.st.r)}</div></div>${x.st.ok?`<button class="btn pri" style="width:auto;padding:6px 13px" onclick='assignFill(${s.id},${JSON.stringify(x.n)},false)'>Assign</button>`:`<button class="btn" style="width:auto;padding:6px 10px;color:#A32D2D;border-color:#F0C9C9" onclick='assignFill(${s.id},${JSON.stringify(x.n)},true)'>Assign anyway</button>`}</div>`; }).join('')+`<div class="row" style="gap:8px;margin-top:14px"><button class="btn" style="width:auto;color:#A32D2D;border-color:#F0C9C9" onclick="delShift(${s.id})">Delete slot</button><button class="btn" style="width:auto;margin-left:auto" onclick="document.getElementById('fillm').remove()">Close</button></div></div>`;
  document.body.appendChild(m); m.addEventListener('click',e=>{ if(e.target===m) m.remove(); });
};
window.assignFill=async function(id,name,override){ if(override && !confirm(name+' is outside their availability. Assign anyway? They should approve the change first.')) return; const patch={person_name:name,role:posOf(name)}; if(override) patch.note='Assigned outside availability — needs '+name+"'s ok"; await sb.from('shifts').update(patch).eq('id',id); const m=document.getElementById('fillm'); if(m)m.remove(); schRefresh(); };
window._salesCarried=false;
window._carrySales=async function(isoDays){ window._salesCarried=false; if(window._noSalesEver) return {}; const r=await sb.from('day_sales').select('*').gte('on_date',isoDays[0]).lte('on_date',isoDays[6]); const map={}; (r.data||[]).forEach(d=>map[d.on_date]=Number(d.sales)||0); if((r.data||[]).length) return map; try{ const _any=await sb.from('day_sales').select('on_date',{count:'exact',head:true}); if(!_any.count){ window._noSalesEver=true; return map; } }catch(e){} for(let back=1;back<=12;back++){ const ps=isoDays.map(iso=>{ const d=new Date(iso+'T00:00'); d.setDate(d.getDate()-7*back); return isoDate(d); }); const pr=await sb.from('day_sales').select('*').gte('on_date',ps[0]).lte('on_date',ps[6]); if((pr.data||[]).length){ const bywd={}; (pr.data||[]).forEach(d=>{ const wd=(new Date(d.on_date+'T00:00').getDay()+6)%7; bywd[wd]=Number(d.sales)||0; }); const rows=[]; isoDays.forEach((iso,di)=>{ if(bywd[di]!=null){ map[iso]=bywd[di]; rows.push({on_date:iso,sales:bywd[di]}); } }); if(rows.length){ window._salesCarried=true; try{ await sb.from('day_sales').upsert(rows); }catch(e){} } return map; } } return map; };
window.refreshLabor=function(){ const sc=window._sch; if(!sc||!sc.isAdmin)return; const bm=1+((sc.burden||0)/100); let cost=0; const sales={}; sc.isoDays.forEach(iso=>{ const el=document.getElementById('sales-'+iso); sales[iso]=el?(Number(el.value)||0):0; }); sc.shifts.forEach(s=>{ if(s.person_name!=='__OPEN__') cost+=shiftHours(s)*((sc.wage[s.person_name])||0)*bm; }); const totSales=sc.isoDays.reduce((a,iso)=>a+(sales[iso]||0),0); const ce=document.getElementById('lbl-cost'); if(ce)ce.textContent=cost?money(cost):'—'; const pe=document.getElementById('lbl-pct'); if(pe){ const pct=(totSales&&cost)?Math.round(cost/totSales*100):null; pe.textContent=pct!=null?pct+'%':'—'; pe.style.color=pct!=null?(pct>30?'var(--amber)':'var(--green)'):''; } };
window._wageTmr=null;
window.setWage=function(name,w){ if(window._sch&&window._sch.wage) window._sch.wage[name]=Number(w)||0; refreshLabor(); clearTimeout(window._wageTmr); window._wageTmr=setTimeout(()=>{ sb.from('pay_rates').upsert({person_name:name, wage:Number(w)||0, updated_at:new Date().toISOString()}).then(()=>{}); },500); };
window._salesTmr={};
window.setSales=function(iso,s){ window._noSalesEver=false; refreshLabor(); clearTimeout(window._salesTmr[iso]); window._salesTmr[iso]=setTimeout(()=>{ sb.from('day_sales').upsert({on_date:iso, sales:Number(s)||0}).then(()=>{}); },500); };
window.publishWeek=async function(){ const wk=state.ctx.wk||isoDate(weekStart(new Date())); const start=weekStart(wkDate(wk)); const d6=isoDate(new Date(start.getTime()+6*864e5));
  try{ const _mon=new Date(start); const _lbl=_mon.toLocaleDateString(undefined,{month:'short',day:'numeric'});
    await notify({title:'The schedule is up', body:'Week of '+_lbl+' has been published. Check your shifts.', act:"go('schedule')"}); }catch(e){}
  // Snapshot the published state so "What changed" can diff later edits against it.
  try{ const rs=await sb.from('shifts').select('person_name,on_date,start_time,end_time').gte('on_date',wk).lte('on_date',d6); const snap=(rs.data||[]).filter(s=>s.person_name&&s.person_name!=='__OPEN__').map(s=>({n:s.person_name,d:s.on_date,s:s.start_time,e:s.end_time})); await sb.from('day_items').delete().eq('kind','pubsnap').eq('title',wk); await sb.from('day_items').insert({kind:'pubsnap',title:wk,on_date:null,detail:JSON.stringify(snap),created_by:state.user.id}); }catch(e){}
  await sb.from('published_weeks').upsert({week_start:wk, published_at:new Date().toISOString()}); vSchedule(document.getElementById('view')); };
// "What changed" — diff the current week against the last published snapshot; draft a team note.
window.whatChanged=async function(){
  const wk=state.ctx.wk||isoDate(weekStart(new Date())); const start=weekStart(wkDate(wk)); const d6=isoDate(new Date(start.getTime()+6*864e5)); const days=[...Array(7)].map((_,i)=>isoDate(new Date(start.getTime()+i*864e5)));
  let m=document.getElementById('wch'); if(m)m.remove(); m=document.createElement('div'); m.id='wch'; m.style.cssText='position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  m.innerHTML=`<div style="background:var(--card);width:100%;max-width:520px;border-radius:16px 16px 0 0;padding:20px 20px 26px;box-shadow:0 -8px 40px rgba(0,0,0,.22);max-height:86vh;overflow:auto"><div style="font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin-bottom:6px">✦ What changed</div><div class="faint" style="font-size:12.5px;margin-bottom:14px">Changes since you last published ${fmtDay(_d(days[0]))} – ${fmtDay(_d(days[6]))}.</div><div id="wchOut" style="font-size:14px;line-height:1.6"><div class="faint">Comparing…</div></div><div class="row" style="margin-top:16px;gap:8px" id="wchBtns"></div></div>`;
  document.body.appendChild(m); m.addEventListener('click',e=>{ if(e.target===m) m.remove(); });
  const [rs,rsnap]=await Promise.all([ sb.from('shifts').select('person_name,on_date,start_time,end_time').gte('on_date',wk).lte('on_date',d6), sb.from('day_items').select('detail').eq('kind','pubsnap').eq('title',wk).maybeSingle() ]);
  const out=document.getElementById('wchOut');
  if(!rsnap.data){ if(out)out.innerHTML='<div class="faint">Publish the week once and I\'ll track changes from that point on.</div>'; return; }
  const cur=(rs.data||[]).filter(s=>s.person_name&&s.person_name!=='__OPEN__'); let snap=[]; try{ snap=JSON.parse(rsnap.data.detail||'[]'); }catch(e){}
  const curMap={}, snapMap={}; cur.forEach(s=>{ (curMap[s.person_name]=curMap[s.person_name]||{})[s.on_date]=(s.start_time||'')+'|'+(s.end_time||''); }); snap.forEach(s=>{ (snapMap[s.n]=snapMap[s.n]||{})[s.d]=(s.s||'')+'|'+(s.e||''); });
  const fmtT=v=>{ const p=(v||'').split('|'); return p[0]?(fmtClock(p[0])+(p[1]?'–'+fmtClock(p[1]):'')):''; };
  const names=[...new Set(Object.keys(curMap).concat(Object.keys(snapMap)))].sort();
  const lines=[]; const plain=[];
  names.forEach(n=>{ const parts=[]; days.forEach(d=>{ const a=(snapMap[n]||{})[d]||'', b=(curMap[n]||{})[d]||''; if(a===b)return; const wd=_d(d).toLocaleDateString(undefined,{weekday:'short'}); if(!a&&b) parts.push('added '+wd+' '+fmtT(b)); else if(a&&!b) parts.push('off '+wd+' (was '+fmtT(a)+')'); else parts.push(wd+' now '+fmtT(b)+' (was '+fmtT(a)+')'); }); if(parts.length){ lines.push('<b>'+esc(n)+'</b>: '+esc(parts.join('; '))); plain.push(n+': '+parts.join('; ')); } });
  if(!lines.length){ if(out)out.innerHTML='<div class="faint">No changes since the last publish.</div>'; return; }
  if(out)out.innerHTML=lines.map(l=>'<div style="padding:5px 0;border-bottom:1px solid var(--line)">'+l+'</div>').join('');
  const note='Schedule update for '+fmtDay(_d(days[0]))+'–'+fmtDay(_d(days[6]))+':\n'+plain.map(p=>'• '+p).join('\n')+'\n\nDouble-check your shifts — thanks!';
  window._wchNote=note;
  const btns=document.getElementById('wchBtns'); if(btns) btns.innerHTML='<button class="btn" style="width:auto" onclick="navigator.clipboard&&navigator.clipboard.writeText(window._wchNote);this.textContent=\'Copied ✓\'">Copy note</button><button class="btn pri" style="width:auto" onclick="wchPost()">Post to Community</button><button class="btn" style="width:auto;margin-left:auto" onclick="document.getElementById(\'wch\').remove()">Close</button>';
};
window.wchPost=async function(){ const note=window._wchNote; if(!note)return; try{ const r=await sb.from('posts').insert({channel:'announcements', body:note, author_id:state.user.id, author_name:(state.profile&&state.profile.name)||'Manager'}); if(r&&r.error){ alert('Could not post: '+r.error.message); return; } state.community=null; const b=document.getElementById('wchBtns'); if(b) b.innerHTML='<div class="faint" style="font-size:13px">Posted to Announcements ✓</div><button class="btn" style="width:auto;margin-left:auto" onclick="document.getElementById(\'wch\').remove()">Close</button>'; }catch(e){ alert('Could not post.'); } };
// "Read my week" — AI reads the visible week's shifts + forecast and gives a plain-English second opinion. Suggestions only; changes nothing.
window.readMyWeek=async function(){
  const wk=state.ctx.wk||isoDate(weekStart(new Date())); const start=weekStart(wkDate(wk)); const days=[...Array(7)].map((_,i)=>{ const d=new Date(start); d.setDate(start.getDate()+i); return isoDate(d); });
  let m=document.getElementById('rmw'); if(m)m.remove(); m=document.createElement('div'); m.id='rmw'; m.style.cssText='position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  m.innerHTML=`<div style="background:var(--card);width:100%;max-width:520px;border-radius:16px 16px 0 0;padding:20px 20px 26px;box-shadow:0 -8px 40px rgba(0,0,0,.22);max-height:86vh;overflow:auto"><div style="font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin-bottom:6px">✦ Read my week</div><div class="faint" style="font-size:12.5px;margin-bottom:14px">${fmtDay(_d(days[0]))} – ${fmtDay(_d(days[6]))}, straight from your schedule — the same read every time. Nothing here changes anything.</div><div id="rmwOut" style="font-size:14px;line-height:1.6"><div class="faint">Checking…</div></div><div class="row" style="margin-top:16px"><button class="btn" style="width:auto;margin-left:auto" onclick="document.getElementById('rmw').remove()">Close</button></div></div>`;
  document.body.appendChild(m); m.addEventListener('click',e=>{ if(e.target===m) m.remove(); });
  try{
    const [rsh,rcov,rav,rto]=await Promise.all([ sb.from('shifts').select('*').gte('on_date',days[0]).lte('on_date',days[6]), sb.from('day_items').select('detail').eq('kind','covrules').order('id',{ascending:false}).limit(1).maybeSingle(), sb.from('availability').select('person_name,weekday,can_work,note'), sb.from('time_off').select('*').eq('status','approved') ]);
    try{ await loadPositions(); }catch(e){}
    const shifts=rsh.data||[]; const real=shifts.filter(s=>s.person_name&&s.person_name!=='__OPEN__'); const opens=shifts.filter(s=>s.person_name==='__OPEN__');
    if(!shifts.length){ const o=document.getElementById('rmwOut'); if(o)o.innerHTML='<div class="faint">This week has no shifts yet — build it first, then check.</div>'; return; }
    let cov={}; try{ cov=JSON.parse((rcov.data&&rcov.data.detail)||'{}'); }catch(e){}
    const covTarget=di=>{ const M=cov.matrix; if(M&&M.blocks&&M.blocks.length){ let mx=0; M.blocks.forEach(b=>{ const n=+((b.n||[])[di]||0); if(n>mx)mx=n; }); return mx||null; } const c=(cov.days||{})[di]; return (c&&c.people)?+c.people:null; };
    const hoursOf=s=>{ const a=parseClock(s.start_time),b=parseClock(s.end_time); return (a!=null&&b!=null&&b>a)?(b-a):0; };
    const dayFlags=[]; days.forEach((iso,di)=>{ const ppl=new Set(real.filter(s=>s.on_date===iso).map(s=>s.person_name)).size; const op=opens.filter(s=>s.on_date===iso).length; const t=covTarget(di); const wdN=_d(iso).toLocaleDateString(undefined,{weekday:'long'}); if(t!=null&&ppl<t){ dayFlags.push({sev:2, txt:'<b>'+wdN+'</b> is short '+(t-ppl)+' — '+ppl+' scheduled vs target '+t+(op?', '+op+' open shift'+(op>1?'s':'')+' unfilled':'')}); } else if(op){ dayFlags.push({sev:1, txt:'<b>'+wdN+'</b> has '+op+' open shift'+(op>1?'s':'')+' unfilled'}); } });
    const H={},D={}; real.forEach(s=>{ H[s.person_name]=(H[s.person_name]||0)+hoursOf(s); (D[s.person_name]=D[s.person_name]||new Set()).add(s.on_date); });
    const otW=(lawRules().ot_weekly_hrs)||40; const peopleFlags=[];
    Object.keys(H).sort((a,b)=>H[b]-H[a]).forEach(n=>{ if(H[n]>otW) peopleFlags.push({sev:2, txt:'<b>'+esc(n)+'</b> is over '+otW+'h — '+H[n].toFixed(1)+'h (overtime)'}); else if(H[n]>=otW-4) peopleFlags.push({sev:1, txt:'<b>'+esc(n)+'</b> is close to overtime — '+H[n].toFixed(1)+'h'}); });
    Object.keys(D).forEach(n=>{ if(D[n].size>=6) peopleFlags.push({sev:1, txt:'<b>'+esc(n)+'</b> works '+D[n].size+' days this week'}); });
    const avMap={}; (rav.data||[]).forEach(a=>{ (avMap[a.person_name]=avMap[a.person_name]||{})[a.weekday]={can:a.can_work,note:a.note}; });
    const onLeave=(n,iso)=> (rto.data||[]).some(t=>t.person_name===n && iso>=t.start_date && iso<=(t.end_date||t.start_date));
    const busy=(n,iso)=> real.some(s=>s.person_name===n && s.on_date===iso);
    const roster=(typeof rosterNames==='function'?rosterNames():Object.keys(H)).filter(n=>n&&(typeof isArchived!=='function'||!isArchived(n)));
    const fillRecs=opens.map(o=>{ const wd=(new Date(o.on_date+'T00:00').getDay()+6)%7; const ss=parseClock(o.start_time), se=parseClock(o.end_time); const who=roster.filter(n=>{ if(onLeave(n,o.on_date)||busy(n,o.on_date))return false; const a=avMap[n]&&avMap[n][wd]; if(a&&a.can===false)return false; if(a&&a.note&&typeof parseWin==='function'){ const win=parseWin(a.note); if(win){ const ws=parseClock(win[0]),we=parseClock(win[1]); if(ws!=null&&we!=null&&ss!=null&&se!=null&&(ss<ws-1e-9||se>we+1e-9)) return false; } } return true; }); return {o, who}; });
    const sevCol=s=>s>=2?'#B32D2D':'var(--amber)';
    const allFlags=dayFlags.concat(peopleFlags).sort((a,b)=>b.sev-a.sev);
    let html='';
    if(allFlags.length){ html+='<div style="font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 8px">What to check</div>'+allFlags.map(f=>'<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--line)"><span style="color:'+sevCol(f.sev)+';font-weight:800;line-height:1.5">•</span><span>'+f.txt+'</span></div>').join(''); }
    else html+='<div class="card" style="padding:14px 16px;background:var(--brand-soft);border-color:var(--brand-line)"><b>This week looks solid.</b> Coverage meets target every day, no one\'s over hours, nothing unfilled.</div>';
    if(fillRecs.length){ html+='<div style="font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">Who can fill the open shifts</div>'; fillRecs.forEach(fr=>{ const wdN=_d(fr.o.on_date).toLocaleDateString(undefined,{weekday:'long'}); const tm=(fr.o.start_time?fmtClock(fr.o.start_time):'')+(fr.o.end_time?'–'+fmtClock(fr.o.end_time):''); html+='<div style="padding:6px 0;border-bottom:1px solid var(--line)"><div style="font-weight:600">'+esc(wdN)+' '+esc(tm)+(fr.o.role?' · '+esc(fr.o.role):'')+'</div><div class="faint" style="font-size:13px;margin-top:2px">'+(fr.who.length?('Free to take it: '+fr.who.slice(0,6).map(esc).join(', ')):'No one\'s free — everyone that day is already working, off, or unavailable.')+'</div></div>'; }); }
    const out=document.getElementById('rmwOut'); if(out) out.innerHTML=html;
  }catch(e){ const out=document.getElementById('rmwOut'); if(out) out.innerHTML='<div class="faint">Couldn\'t read the week: '+esc(String((e&&e.message)||e))+'</div>'; }
};
window.copyLastWeek=async function(){ const base=state.ctx.wk?wkDate(state.ctx.wk):weekStart(new Date()); const cur=weekStart(base); const start=new Date(cur); start.setDate(start.getDate()-7*8); const end=new Date(cur); end.setDate(end.getDate()-1); const r=await sb.from('shifts').select('on_date').gte('on_date',isoDate(start)).lte('on_date',isoDate(end)); const byWk={}; (r.data||[]).forEach(s=>{ const ws=isoDate(weekStart(new Date(s.on_date+'T00:00:00'))); byWk[ws]=(byWk[ws]||0)+1; }); const weeks=Object.keys(byWk).sort().reverse(); if(!weeks.length){ alert('No past week with shifts to copy from (I looked back 8 weeks). Build a week first, or use Auto-draft.'); return; } const ov=document.createElement('div'); ov.id='cwOv'; ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px'; const card=document.createElement('div'); card.style.cssText='background:var(--card);color:var(--ink);border-radius:14px;padding:22px;max-width:400px;width:100%;box-shadow:0 12px 44px rgba(0,0,0,.32);max-height:80vh;overflow:auto'; card.innerHTML=`<div style="font-weight:700;font-size:16px;margin-bottom:4px">Copy a week into this one</div><div class="faint" style="font-size:13px;margin-bottom:14px">Pick which week to copy. Its shifts drop straight onto the week you're viewing — edit from there.</div>`+weeks.map(ws=>{ const d=new Date(ws+'T00:00:00'); const e=new Date(d); e.setDate(e.getDate()+6); const lbl=d.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' – '+e.toLocaleDateString(undefined,{month:'short',day:'numeric'}); return `<button class="btn" style="width:100%;justify-content:space-between;margin-bottom:8px" onclick="cwDo('${ws}')"><span>${lbl}</span><span class="faint" style="font-size:12px">${byWk[ws]} shift${byWk[ws]===1?'':'s'}</span></button>`; }).join('')+`<button class="btn" style="width:100%;margin-top:6px;color:var(--muted)" onclick="document.getElementById('cwOv').remove()">Cancel</button>`; ov.appendChild(card); ov.onclick=e=>{ if(e.target===ov) ov.remove(); }; document.body.appendChild(ov); };
window.cwDo=async function(fromWs){ const ov=document.getElementById('cwOv'); if(ov) ov.remove(); const base=state.ctx.wk?wkDate(state.ctx.wk):weekStart(new Date()); const cur=weekStart(base); const from=new Date(fromWs+'T00:00:00'); const fromEnd=new Date(from); fromEnd.setDate(fromEnd.getDate()+6); const diffDays=Math.round((cur-from)/86400000); const r=await sb.from('shifts').select('*').gte('on_date',isoDate(from)).lte('on_date',isoDate(fromEnd)); const rows=(r.data||[]).map(s=>{ const nd=new Date(s.on_date+'T00:00:00'); nd.setDate(nd.getDate()+diffDays); return {person_name:s.person_name,role:s.role,on_date:isoDate(nd),start_time:s.start_time,end_time:s.end_time,kind:s.kind,user_id:s.user_id,note:s.note}; }); if(!rows.length){ alert('That week had no shifts.'); return; } await sb.from('shifts').insert(rows); vSchedule(document.getElementById('view')); };
window.autoDraft=async function(opts){
  opts=opts||{};
  const base=opts.week?wkDate(opts.week):(state.ctx.wk?wkDate(state.ctx.wk):weekStart(new Date()));
  const ws=weekStart(base); const isoDays=[...Array(7)].map((_,i)=>{ const d=new Date(ws); d.setDate(d.getDate()+i); return isoDate(d); });
  // Coverage rules (owner-set): store hours + people/openers/closers per day
  const rcov=await sb.from('day_items').select('detail').eq('kind','covrules').order('id',{ascending:false}).limit(1).maybeSingle();
  let cov={days:{},shiftLen:8,matrix:null,minLen:4,maxLen:8,roleReqs:[],blackouts:[]}; let requireLeaderCoverage=true; try{ const cd=JSON.parse((rcov.data&&rcov.data.detail)||'{}'); cov={days:cd.days||{}, shiftLen:+(cd.shiftLen)||8, matrix:(cd.matrix&&cd.matrix.blocks&&cd.matrix.blocks.length)?cd.matrix:null, minLen:+(cd.minLen)||4, maxLen:+(cd.maxLen)||8, targetPct:+(cd.targetPct)||0, burdenPct:+(cd.burdenPct)||0, roleReqs:Array.isArray(cd.roleReqs)?cd.roleReqs:[], blackouts:Array.isArray(cd.blackouts)?cd.blackouts:[]}; if(cd.requireLeader===false) requireLeaderCoverage=false; }catch(e){}
  if(opts.matrix&&opts.matrix.blocks&&opts.matrix.blocks.length){ cov.matrix=opts.matrix; cov._csTarget=true; } // Cost-Smart override: coverage curve comes from your target, everything else (floors, leaders, blackouts, availability) still applies
  const anyRules=(cov.matrix&&cov.matrix.blocks&&cov.matrix.blocks.length)||Object.keys(cov.days).some(d=>cov.days[d]&&+cov.days[d].people>0);
  // template week: most recent non-empty week within 3 weeks back — used for days WITHOUT a coverage rule (and to keep working before rules are set)
  let tmpl=[]; let twStart=null;
  for(let back=1; back<=3 && !tmpl.length; back++){ const ps=new Date(ws); ps.setDate(ps.getDate()-7*back); const pe=new Date(ps); pe.setDate(pe.getDate()+6); const r=await sb.from('shifts').select('*').gte('on_date',isoDate(ps)).lte('on_date',isoDate(pe)); if((r.data||[]).length){ tmpl=r.data; twStart=isoDate(ps); } }
  if(!tmpl.length && !anyRules){ alert('Auto-draft needs either your Coverage rules set (on the Schedule page) or one past week of shifts to learn from. Set your coverage rules, or build a week first.'); return; }
  // Name the exact week so the scheduler always knows what they're building.
  const _MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const _dlbl=iso=>{ const d=new Date(iso+'T00:00'); return _MON[d.getMonth()]+' '+d.getDate(); };
  const wkLbl=_dlbl(isoDays[0])+' – '+_dlbl(isoDays[6])+', '+isoDays[6].slice(0,4);
  // existing shifts this week?
  const cur=await sb.from('shifts').select('id').gte('on_date',isoDays[0]).lte('on_date',isoDays[6]);
  if(!opts.preview){ // preview mode never touches your real schedule
    if((cur.data||[]).length){ if(!confirm('Build the week of '+wkLbl+'?\n\nThis week already has '+cur.data.length+' shifts — building will replace all of them with a fresh draft.')) return; await sb.from('shifts').delete().gte('on_date',isoDays[0]).lte('on_date',isoDays[6]); }
    else { if(!confirm('Build a draft schedule for the week of '+wkLbl+'?')) return; }
  }
  // inputs
  const [rav,rto,rpay,rsal]=await Promise.all([ sb.from('availability').select('person_name,weekday,can_work,note'), sb.from('time_off').select('*').eq('status','approved'), sb.from('pay_rates').select('*'), sb.from('day_sales').select('*').gte('on_date',isoDays[0]).lte('on_date',isoDays[6]) ]);
  await loadPositions(); await loadProfiles(); await loadArchived();
  const R=lawRules(); const otW=R.ot_weekly_hrs||40; const minRest=R.min_rest_between_shifts_hrs;
  const avMap={}; (rav.data||[]).forEach(a=>{ (avMap[a.person_name]=avMap[a.person_name]||{})[a.weekday]={can_work:a.can_work,note:a.note}; });
  const onLeave=(person,iso)=> (rto.data||[]).some(t=>t.person_name===person && iso>=t.start_date && iso<=(t.end_date||t.start_date));
  const fitsAvail=(person,wd,sStart,sEnd)=>{ const a=avMap[person]&&avMap[person][wd]; if(!a) return true; if(a.can_work===false) return false; const win=parseWin(a.note); if(win){ const ws=parseClock(win[0]),we=parseClock(win[1]),ss=parseClock(sStart),se=parseClock(sEnd); if(ws==null||we==null||ss==null||se==null) return true; return ss>=ws-1e-9 && se<=we+1e-9; } return true; };
  const ageOn=(person,iso)=>{ const dob=(profileOf(person)||{}).dob; if(!dob||dob.length<10) return null; const b=new Date(dob+'T00:00'),d=new Date(iso+'T00:00'); let a=d.getFullYear()-b.getFullYear(); const m=d.getMonth()-b.getMonth(); if(m<0||(m===0&&d.getDate()<b.getDate())) a--; return a; };
  const minorCapEnd=(person,iso)=>{ const a=ageOn(person,iso); if(a==null||a>=16) return null; const mo=+iso.slice(5,7); return (mo>=6&&mo<=8)?21:19; };
  const roster={}; Object.keys(window._posMap||{}).forEach(n=>{ if(isArchived(n))return; if(posOf(n)==='Trainee')return; if(posOf(n)==='Owner')return; (roster[posOf(n)]=roster[posOf(n)]||[]).push(n); }); // Owners are on the team but not in the scheduling pool -- they are salaried and never take a rostered shift, so auto-drafting them creates phantom coverage that isn't really there. // Trainees are NOT auto-scheduled — they ride as an extra and you place their (short) training shifts by hand
  const hoursBy={}; const lastEnd={}; const daysBy={};
  const under=n=>{ const mn=+((profileOf(n)||{}).minHrs||0); return mn>0 && (hoursBy[n]||0)<mn; };
  const draft=[]; let unfilled=[]; const meta=[]; // meta[i] holds {skill,lead} requirement for draft[i] (kept out of the DB row)
  const OPEN_FLOOR=(state.settings&&state.settings.open_floor)||'05:30'; // earliest anyone starts
  const hhmm=h=>{ h=Math.round(h*4)/4; let hh=Math.floor(h+1e-9), mm=Math.round((h-hh)*60); if(mm>=60){hh++;mm-=60;} return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0'); };
  const clampFloor=st=>(st&&st<OPEN_FLOOR)?OPEN_FLOOR:st;
  const covDays=cov.days||{}; const shiftLen=+(cov.shiftLen)||8; const mMin=+(cov.minLen)||4, mMax=+(cov.maxLen)||8; const floorH=parseClock(OPEN_FLOOR);
  // Peak blackout windows: nobody may clock OUT mid-rush. A shift ending inside a window gets pushed to the window's end (stay through the rush); a split hand-off gets cut to just before it.
  const _blk=(cov.blackouts||[]).map(b=>({s:parseClock(b.start),e:parseClock(b.end),days:(Array.isArray(b.days)&&b.days.length)?b.days:[0,1,2,3,4,5,6]})).filter(b=>b.s!=null&&b.e!=null&&b.e>b.s);
  const inBlk=(dw,t)=>_blk.find(b=>b.days.indexOf(dw)>=0 && t>b.s+1e-9 && t<b.e-1e-9);
  // Push a boundary out of the UNION of overlapping rush windows (iterate) — escaping one window could otherwise land inside another.
  const cleanEnd=(dw,t)=>{ let b,g=0; while((b=inBlk(dw,t))&&g++<20) t=b.e; return t; };   // a shift ending mid-rush stays through it
  const cleanStart=(dw,t)=>{ let b,g=0; while((b=inBlk(dw,t))&&g++<20) t=b.s; return t; }; // a shift starting mid-rush starts just before it (in place before the chaos)
  const cleanMid=(dw,t)=>{ return inBlk(dw,t)?cleanStart(dw,t):t; };
  // Build a day's shifts FROM YOUR MATRIX by HORIZONTAL LAYERING: each demand level = one shift spanning the whole time it's needed, so the opener works a full shift (open→close) instead of a stub, and peak surges become short mid shifts. Splits any shift over max length; extends any under min length.
  const genMatrix=dw=>{ const M=cov.matrix; if(!M||!M.blocks||!M.blocks.length) return null; const rows=M.blocks.map(b=>({s:parseClock(b.s),e:parseClock(b.e),need:+((b.n||[])[dw]||0)})).filter(b=>b.s!=null&&b.e!=null&&b.e>b.s).sort((a,b)=>a.s-b.s); if(!rows.length) return null; const peak=Math.max.apply(null,rows.map(r=>r.need)); if(peak<=0) return null; const dayStart=rows[0].s, dayEnd=rows[rows.length-1].e; const out=[]; for(let L=1;L<=peak;L++){ let segS=null,segE=null; rows.forEach(r=>{ if(r.need>=L){ if(segS==null)segS=r.s; segE=r.e; } }); if(segS==null) continue; let s=segS; if(floorH!=null&&s<floorH)s=floorH; const e=segE, span=e-s; if(span<=mMax+1+1e-9){ out.push({s,e}); } else { const pieces=Math.ceil(span/mMax), plen=span/pieces; for(let i=0;i<pieces;i++) out.push({s:s+i*plen, e:(i===pieces-1)?e:s+(i+1)*plen}); } }
    // Stagger: no two people START together (≥15 min apart), and no two LEAVE together except the closers — avoids pile-ups at the door (congregating, chaos, harder to lead)
    out.sort((a,b)=>a.s-b.s||a.e-b.e); for(let i=1;i<out.length;i++){ if(out[i].s < out[i-1].s + 0.25 - 1e-9){ out[i].s = out[i-1].s + 0.25; if(out[i].s > out[i].e - mMin) out[i].s = Math.max(dayStart, out[i].e - mMin); } }
    const dEnd=Math.max.apply(null,out.map(x=>x.e)); const nc=out.filter(x=>x.e < dEnd-1e-9).sort((a,b)=>a.e-b.e); for(let i=1;i<nc.length;i++){ if(nc[i].e < nc[i-1].e + 0.25 - 1e-9){ nc[i].e = Math.min(dEnd, nc[i-1].e + 0.25); } }
    return out.map(sh=>{ let s=sh.s,e=sh.e; if(e-s<mMin-1e-9){ let ne=Math.min(dayEnd,s+mMin), ns=s; if(ne-ns<mMin-1e-9) ns=Math.max(dayStart,ne-mMin); s=ns; e=ne; if(floorH!=null&&s<floorH){ s=floorH; e=Math.min(dayEnd,s+mMin);} } e=Math.min(dayEnd,cleanEnd(dw,e)); s=Math.max(dayStart,cleanStart(dw,s)); if(floorH!=null&&s<floorH)s=floorH; if(e<=s){ s=sh.s; e=sh.e; } return {dow:dw,start:hhmm(s),end:hhmm(e),kind:'shift',station:''}; }).filter(x=>parseClock(x.end)>parseClock(x.start)); };
  // Fallback (no matrix set): simple open/mid/close from the flat coverage rule
  const genDay=dw=>{ const c=covDays[dw]; if(!(c&&+c.people>0)) return null; const inH=parseClock(c.in||OPEN_FLOOR), outH=parseClock(c.out||'14:00'); if(inH==null||outH==null||outH-inH<2) return null; const N=+c.people, nO=Math.min(+(c.openers||1),N), nC=Math.min(+(c.closers||0), Math.max(0,N-nO)); const arr=[]; const mk=(s,e)=>({dow:dw,start:hhmm(cleanStart(dw,Math.max(inH,s))),end:hhmm(Math.min(outH,cleanEnd(dw,Math.min(outH,e)))),kind:'shift',station:''}); for(let i=0;i<nO;i++) arr.push(mk(inH, inH+shiftLen)); for(let i=0;i<nC;i++) arr.push(mk(outH-shiftLen, outH)); const mids=N-nO-nC, span=Math.max(0,(outH-shiftLen)-inH); for(let i=0;i<mids;i++){ const st=(mids===1)?inH+span/2:inH+span*(i/(mids-1)); arr.push(mk(st, st+shiftLen)); } return arr; };
  // Days with no matrix and no flat rule fall back to the template's shape (clamped to your opening floor)
  const tmplByDow={}; tmpl.forEach(s=>{ const dw=(new Date(s.on_date+'T00:00').getDay()+6)%7; let st=clampFloor(s.start_time); const a=parseClock(st),b=parseClock(s.end_time); if(a!=null&&b!=null&&b<=a) return; (tmplByDow[dw]=tmplByDow[dw]||[]).push({dow:dw,start:st,end:s.end_time,kind:s.kind,station:(s.role||'').trim()}); });
  let slots=[]; for(let dw=0; dw<7; dw++){ const g=genMatrix(dw)||genDay(dw); if(g&&g.length) slots.push(...g); else if(tmplByDow[dw]) slots.push(...tmplByDow[dw]); }
  /* Cover every day's open and close before filling anyone's day out.
     Sorting purely by demand filled Thursday to Sunday first, and those days used up the
     leaders' weekly day-quota -- so Tuesday and Wednesday came out with nobody in charge
     while other days carried three leaders. That is backwards from how an owner builds a
     week: place the opening and closing leader across all seven days, then fill around
     them. So the open of every day goes first, then the close of every day, then
     everything else by demand. */
  const _dem={}; slots.forEach(s=>{ _dem[s.dow]=(_dem[s.dow]||0)+1; });
  const _firstOf={}, _lastOf={};
  slots.forEach(s=>{
    const st=s.start||'', en=s.end||'';
    if(_firstOf[s.dow]===undefined || st < _firstOf[s.dow]) _firstOf[s.dow]=st;
    if(_lastOf[s.dow]===undefined  || en > _lastOf[s.dow])  _lastOf[s.dow]=en;
  });
  const _wave = s => ((s.start||'')===_firstOf[s.dow] ? 0 : ((s.end||'')===_lastOf[s.dow] ? 1 : 2));
  slots.sort((a,b)=>
      _wave(a)-_wave(b)                       // every day's open, then every day's close
   || (_dem[b.dow]-_dem[a.dow])               // then the busiest days first, as before
   || (a.start||'').localeCompare(b.start||'')
   || a.dow-b.dow);
  const isRankLabel=s=>POS_ORDER.indexOf(s)>=0; // old template rows carry a RANK as role, not a real station
  const eligible=(n,sl,iso,hrs,ignoreLen)=>{ if(!n) return false; if(onLeave(n,iso)) return false; if(draft.some(d=>d.person_name===n && d.on_date===iso)) return false; if(!fitsAvail(n,sl.dow,sl.start,sl.end)) return false;
    const pr=profileOf(n)||{};
    // Station/role qualification — only gate when the slot names a real station (not a legacy rank label) and the person has a skill list
    if(sl.station && !isRankLabel(sl.station) && Array.isArray(pr.roles) && pr.roles.length && !pr.roles.includes(sl.station)) return false;
    if(sl.station && !isRankLabel(sl.station) && !skillDayOk(n,sl.station,sl.dow)) return false; // trained on it, but restricted off it this weekday
    // Longest single shift this person can handle (some tap out at 5h, others do 8–9h)
    if(!ignoreLen && pr.maxShift && hrs > +pr.maxShift + 1e-9) return false;
    const cap=minorCapEnd(n,iso); if(cap!=null){ const se=parseClock(sl.end); if(se!=null && se>cap+1e-9) return false; const ag=ageOn(n,iso); if(ag!=null&&ag<16&&hrs>8+1e-9) return false; }
    if(minRest){ const le=lastEnd[n]; if(le){ const gap=Math.round((new Date(iso+'T00:00')-new Date(le.iso+'T00:00'))/86400000); const ss=parseClock(sl.start); if(ss!=null&&gap>=0){ if(((gap*24)-le.end)+ss < minRest-1e-9) return false; } } }
    const _mx=+pr.maxHrs,_mn=+pr.minHrs; const mx=(_mx>0 && (!(_mn>0)||_mx>=_mn))?_mx:otW; if((hoursBy[n]||0)+hrs > mx+1e-9) return false;
    const maxD=pr.maxDays?+pr.maxDays:5; { const dset=daysBy[n]; if((!dset||!dset.has(iso)) && (dset?dset.size:0) >= maxD) return false; }
    return true; };
  const allNames=[]; Object.keys(roster).forEach(p=>roster[p].forEach(n=>allNames.push(n)));
  const capOf=n=>{ const pr=profileOf(n)||{}; const mx=+pr.maxHrs, mn=+pr.minHrs; return (mx>0 && (!(mn>0)||mx>=mn))?mx:otW; }; // ceiling: their max (ignored if invalid — ≤0 or below their own minimum), else the OT line
  const prio=n=>{ const p=+((profileOf(n)||{}).priority); if(p) return p; return posOf(n)==='Trainee'?5:3; }; // who gets hours first: 1=protect … 5=last (trainees fill last by default)
  const prefOff=(n,dw)=>{ const o=(profileOf(n)||{}).daysOff; return Array.isArray(o)&&o.indexOf(dw)>=0; }; // recurring day off. HARD rule in the draft (see eligForSlot); the owner can still place a shift by hand.
  const tpref=n=>((profileOf(n)||{}).timePref)||''; // owner's observation: this person fits early / late shifts better
  const timeFit=(n,sl)=>{ const t=tpref(n); if(!t) return 0; if(t==='early') return sl._earlyLean?-1:(sl._lateLean?1:0); return sl._lateLean?-1:(sl._earlyLean?1:0); }; // lower = better fit (soft)
  // Coverage is generic: anyone qualified can cover any slot (rank only sets PRIORITY). Owners aren't auto-scheduled onto the floor.
  /* Longest allowed run of consecutive days. Counts the days already given to this person
     either side of the one being considered, so it catches a new shift that would join two
     shorter runs into one long one -- not just one that extends a run at the end. */
  const _runLenAround=(iso, has)=>{
    const day=86400000, t=new Date(iso+'T00:00').getTime();
    let run=1;
    for(let k=1;k<7;k++){ if(has(isoDate(new Date(t-k*day)))) run++; else break; }
    for(let k=1;k<7;k++){ if(has(isoDate(new Date(t+k*day)))) run++; else break; }
    return run;
  };
  const runOkSet=(n,iso,set)=>{
    const pr=profileOf(n)||{}; const mr=pr.maxRun?+pr.maxRun:0;
    if(!(mr>0)) return true;
    return _runLenAround(iso, d=>set&&set.has&&set.has(d)) <= mr;
  };
  const runOk=(n,iso)=>runOkSet(n,iso,daysBy[n]);
  const canCover=(n)=>{ const pp=posOf(n); return pp!=='Owner'&&pp!=='Unassigned'; };
  const LEADER=new Set(['Owner','Manager','Supervisor']); const isLeader=n=>LEADER.has(posOf(n));
  // Capabilities: who is trusted to open / close. If a person has caps set, use them; otherwise fall back to their position (leaders) so existing setups keep working.
  const _caps=n=>{ const c=(profileOf(n)||{}).caps; return (c&&typeof c==='object')?c:null; };
  const canOpen=n=>{ const c=_caps(n); return c?(('open'in c)?!!c.open:isLeader(n)):isLeader(n); };
  const canClose=n=>{ const c=_caps(n); return c?(('close'in c)?!!c.close:isLeader(n)):isLeader(n); };
  const hasSkill=(n,st)=>{ if(!st) return true; const pr=profileOf(n)||{}; return Array.isArray(pr.roles)?pr.roles.includes(st):true; }; // required-role check; if a person has no skills list yet, don't block them (same rule as station gate)
  const lvlOf=(n,st)=>{ if(!st) return 0; const pr=profileOf(n)||{}; const sl=pr.skillLevels; if(sl&&typeof sl==='object'&&(st in sl)) return +sl[st]||0; return hasSkill(n,st)?2:0; }; // proficiency 1=Learning 2=Solid 3=Expert; legacy "trained" reads as Solid
  const skillDayOk=(n,st,dw)=>{ if(!st) return true; const sd=(profileOf(n)||{}).skillDays; if(!sd||!Array.isArray(sd[st])) return true; return sd[st].indexOf(dw)<0; }; // day-restricted skill: owner keeps this person OFF station 'st' on weekday dw (e.g. off the bar on busy Saturdays) — still schedulable elsewhere that day
  const lblOf=sl=>(sl.station&&!isRankLabel(sl.station))?sl.station:'';
  // The role label that shows on the drafted shift, so the schedule reads plainly (e.g. "Opening support · Bake"), not just a name.
  const slotRole=sl=>{ if(sl._roleLabel){ return sl._needSkill?(sl._roleLabel+' · '+sl._needSkill):sl._roleLabel; } if(sl._leadReq==='opening') return 'Opening lead'; if(sl._leadReq==='closing') return 'Closing lead'; if(sl._needSkill) return sl._needSkill; return ''; };
  const hrsOf=sl=>shiftHours({start_time:sl.start,end_time:sl.end});
  const metaOf=sl=>({skill:sl._needSkill||null,lead:sl._leadReq||null,minLevel:sl._minLevel||0,reqSt:reqStOf(sl)||null,label:slotRole(sl)||null});
  const commit=(pick,sl,roleOverride)=>{ const iso=isoDays[sl.dow]; hoursBy[pick]=(hoursBy[pick]||0)+hrsOf(sl); (daysBy[pick]=daysBy[pick]||new Set()).add(iso); const e=parseClock(sl.end); lastEnd[pick]={iso,end:(e!=null?e:0)}; draft.push({person_name:pick,role:roleOverride||slotRole(sl)||lblOf(sl)||posOf(pick),on_date:iso,start_time:sl.start,end_time:sl.end,kind:sl.kind,user_id:null,note:null}); meta.push(metaOf(sl)); sl._done=true; };
  // Why couldn't this slot fill? Categorize the binding reason so the open shift explains itself.
  const openReason=(sl,hrs)=>{ const dw=sl.dow, iso=isoDays[dw]; if(sl._leadReq){ const anyLead=allNames.some(n=>canCover(n)&&(sl._leadReq==='opening'?canOpen(n):canClose(n))); if(!anyLead) return 'no one is set to '+(sl._leadReq==='opening'?'open':'close'); } const c={off:0,days:0,hours:0,busy:0,len:0}; allNames.forEach(n=>{ if(!canCover(n))return; if(draft.some(d=>d.person_name===n&&d.on_date===iso)){c.busy++;return;} if(!fitsAvail(n,dw,sl.start,sl.end)){c.off++;return;} const pr=profileOf(n)||{}; const maxD=pr.maxDays?+pr.maxDays:5; const ds=daysBy[n]; if((!ds||!ds.has(iso))&&(ds?ds.size:0)>=maxD){c.days++;return;}
      /* 'Four days, but never three in a row' is a different rule from four days, and a
         common one -- it is how people avoid burning someone out while still using them
         often. Without it a four-day cap happily produces Thu/Fri/Sat/Sun. */
      if(!runOk(n,iso)){c.days++;return;} if((hoursBy[n]||0)+hrs>capOf(n)+1e-9){c.hours++;return;} if(pr.maxShift&&hrs>+pr.maxShift+1e-9){c.len++;return;} }); const t=Object.entries(c).sort((a,b)=>b[1]-a[1])[0]; const map={off:'everyone else is off or unavailable then',days:'everyone free is at their max days this week',hours:'everyone free is at their weekly hour cap',busy:'everyone available already works that day',len:'shift is longer than anyone left can work'}; return (t&&t[1])?map[t[0]]:'no one left who can cover it'; };
  const openSlot=(sl,role,reason)=>{ const iso=isoDays[sl.dow]; const lab=role||slotRole(sl); unfilled.push({day:iso,station:lab||lblOf(sl),start:sl.start,end:sl.end}); draft.push({person_name:'__OPEN__',role:lab||lblOf(sl)||'Open',on_date:iso,start_time:sl.start,end_time:sl.end,kind:'shift',user_id:null,note:reason||null}); meta.push(metaOf(sl)); sl._done=true; };
  // ---- PRIORITY-DRIVEN FILL ----
  // Your highest-priority people get the LONGEST shifts first (so full-timers hit their minimums). The opener & closer of each day must be a leader — and because openers are now full shifts, a leader lands there AND gets real hours. Lower tiers fill the blanks.
  const leaderGaps=[];
  const daySlots={}; slots.forEach(s=>{ (daySlots[s.dow]=daySlots[s.dow]||[]).push(s); });
  if(requireLeaderCoverage) Object.keys(daySlots).forEach(dw=>{ const arr=daySlots[dw]; if(!arr.length) return; let opener=arr[0], closer=arr[0]; arr.forEach(sl=>{ if((sl.start||'')<(opener.start||'')) opener=sl; if((sl.end||'')>(closer.end||'')) closer=sl; }); opener._leadReq='opening'; if(!closer._leadReq) closer._leadReq='closing'; }); // opener = earliest start, closer = latest END (the shift that actually closes)
  // Owner-defined required roles by time: an opening leader, a baker at 6, CFA front+back opening leads, etc. These TAG existing coverage slots (count inside your headcount, not on top), and only qualified people can fill them.
  (cov.roleReqs||[]).forEach(rq=>{ const role=rq&&rq.role; if(!role) return; const cnt=Math.max(1,+rq.count||1); const rs=parseClock(rq.start), re=parseClock(rq.end); const days=(Array.isArray(rq.days)&&rq.days.length)?rq.days:[0,1,2,3,4,5,6];
    days.forEach(dw=>{ const arr=daySlots[dw]; if(!arr||!arr.length) return;
      let cand=arr.filter(sl=>{ const a=parseClock(sl.start),b=parseClock(sl.end); if(a==null||b==null) return false; if(rs!=null&&re!=null) return a<re-1e-9 && b>rs+1e-9; if(rs!=null) return b>rs+1e-9; return true; });
      if(role==='__open__') cand.sort((a,b)=>(a.start||'').localeCompare(b.start||''));
      else if(role==='__close__') cand.sort((a,b)=>(b.end||'').localeCompare(a.end||''));
      else cand.sort((a,b)=>{ const da=Math.abs(parseClock(a.start)-(rs!=null?rs:parseClock(a.start))), db=Math.abs(parseClock(b.start)-(rs!=null?rs:parseClock(b.start))); return da-db || (a.start||'').localeCompare(b.start||''); });
      let done=0; for(const sl of cand){ if(done>=cnt) break;
        if(role==='__open__'){ if(sl._leadReq&&sl._leadReq!=='opening') continue; sl._leadReq='opening'; }
        else if(role==='__close__'){ if(sl._leadReq&&sl._leadReq!=='closing') continue; sl._leadReq='closing'; }
        else { if(sl._needSkill&&sl._needSkill!==role) continue; sl._needSkill=role; if(+rq.minLevel>0) sl._minLevel=+rq.minLevel; }
        if(rq.label) sl._roleLabel=rq.label;
        done++; }
    });
  });
  // Time-of-day lean per slot (drives prefer-early / prefer-late): early = starts in the first third of the day's span, late = ends in the last third
  Object.keys(daySlots).forEach(dw=>{ const arr=daySlots[dw]; if(!arr.length) return; let mn=Infinity,mx=-Infinity; arr.forEach(sl=>{ const a=parseClock(sl.start),b=parseClock(sl.end); if(a!=null&&a<mn)mn=a; if(b!=null&&b>mx)mx=b; }); const span=mx-mn; if(!(span>0)) return; const third=span/3; arr.forEach(sl=>{ const a=parseClock(sl.start),b=parseClock(sl.end); sl._earlyLean=(a!=null&&a<=mn+third+1e-9); sl._lateLean=(b!=null&&b>=mx-third-1e-9); }); });
  // longest shifts first (so anchors + full shifts go to top priority), then busiest day
  // Fill the BUSIEST days first (so weekend peaks claim their people before a slow weekday uses them up), then longest-shift-first within each day (anchors full-timers to the long shifts). Fixes: at a low shift-minimum, short peak shifts used to sort last and go open once the roster hit its day/hour caps.
  const orderSlots=slots.slice().sort((a,b)=> ((_dem[b.dow]||0)-(_dem[a.dow]||0)) || (hrsOf(b)-hrsOf(a)) || a.dow-b.dow || (a.start||'').localeCompare(b.start||''));
  const reqStOf=sl=>sl._needSkill||(sl.station&&!isRankLabel(sl.station)?sl.station:'');
  // Days off are a HARD rule: the draft never schedules someone on a day they've said they're off. Schedulers would rather it hold the line and let them override by hand than quietly break it.
  const eligForSlot=(n,sl,iso,hrs,ignoreLen)=>{ const needLeader=!!sl._leadReq; return canCover(n)&&!prefOff(n,sl.dow)&&(!needLeader||(sl._leadReq==='opening'?canOpen(n):canClose(n)))&&(!sl._needSkill||hasSkill(n,sl._needSkill))&&(!sl._needSkill||skillDayOk(n,sl._needSkill,sl.dow))&&(!sl._minLevel||lvlOf(n,reqStOf(sl))>=sl._minLevel)&&eligible(n,sl,iso,hrs,ignoreLen); };
  const placeSlot=(sl)=>{ if(sl._done) return; const iso=isoDays[sl.dow]; const hrs=hrsOf(sl); const needLeader=!!sl._leadReq; const reqSt=reqStOf(sl);
    const pool=allNames.filter(n=>eligForSlot(n,sl,iso,hrs));
    pool.sort((a,b)=>{ const oa=((hoursBy[a]||0)+hrs>capOf(a)+1e-9)?1:0, ob=((hoursBy[b]||0)+hrs>capOf(b)+1e-9)?1:0; if(oa!==ob) return oa-ob; if(reqSt){ const la=lvlOf(a,reqSt), lb=lvlOf(b,reqSt); if(la!==lb) return lb-la; } /* strongest hand on a required station */ const ua=under(a)?0:1, ub=under(b)?0:1; if(ua!==ub) return ua-ub; const pa=prio(a), pb=prio(b); if(pa!==pb) return pa-pb; const fa=timeFit(a,sl), fb=timeFit(b,sl); if(fa!==fb) return fa-fb; const offa=prefOff(a,sl.dow)?1:0, offb=prefOff(b,sl.dow)?1:0; if(offa!==offb) return offa-offb; return (hoursBy[a]||0)-(hoursBy[b]||0) || a.localeCompare(b); });
    if(pool[0]){ commit(pool[0],sl); return; }
    // Nobody can take the WHOLE shift. If length is the only thing blocking someone, CLEAN-CUT it into two coverable pieces (e.g. 7–2 → 7–10:30 + 10:30–2).
    const a=parseClock(sl.start), b=parseClock(sl.end);
    const lengthBlocked = allNames.some(n=>{ const pr=profileOf(n)||{}; return pr.maxShift && hrs>+pr.maxShift+1e-9 && eligForSlot(n,sl,iso,hrs,true); });
    if(!sl._nosplit && a!=null && b!=null && (b-a)>=2*mMin-1e-9 && lengthBlocked){
      let midN=Math.round((a+(b-a)/2)*4)/4; const cm=cleanMid(sl.dow,midN); if(cm>a+1e-9 && cm<b-1e-9) midN=cm; const mid=hhmm(midN);
      if(mid>sl.start && mid<sl.end){
        placeSlot({dow:sl.dow,start:sl.start,end:mid,kind:sl.kind,station:sl.station,_leadReq:(sl._leadReq==='opening'?'opening':undefined),_needSkill:sl._needSkill,_minLevel:sl._minLevel,_roleLabel:sl._roleLabel,_nosplit:true});
        placeSlot({dow:sl.dow,start:mid,end:sl.end,kind:sl.kind,station:sl.station,_leadReq:(sl._leadReq==='closing'?'closing':undefined),_nosplit:true});
        return;
      }
    }
    if(needLeader){ openSlot(sl, sl._leadReq==='opening'?'Opening lead':'Closing lead', openReason(sl,hrs)); leaderGaps.push({day:iso,type:sl._leadReq}); } else openSlot(sl, sl._needSkill?(sl._needSkill+' needed'):undefined, openReason(sl,hrs));
  };
  orderSlots.forEach(sl=>placeSlot(sl));
  // ---- LOCAL-SEARCH OPTIMIZER: hill-climb the draft (fill opens, reassign hours) to lower the quality score. Best-effort; the greedy draft stands if anything goes wrong. ----
  let optMoves=0;
  try{
    const wageO={}; (rpay.data||[]).forEach(p=>wageO[p.person_name]=Number(p.wage)||0);
    const salesO={}; (rsal.data||[]).forEach(d=>salesO[d.on_date]=Number(d.sales)||0);
    const wkSalesO=isoDays.reduce((a,iso)=>a+(salesO[iso]||0),0); const tgtO=+(cov.targetPct)||0; const OPEN_PEN=10000;
    const hrsE=e=>shiftHours({start_time:e.start_time,end_time:e.end_time});
    const minHr=n=>+((profileOf(n)||{}).minHrs||0); const minW=n=>(6-Math.min(5,prio(n)))*8;
    const minPen=(n,h)=>{ const mn=minHr(n); return (mn>0&&h<mn)?(mn-h)*minW(n):0; };
    const laborPen=c=>(wkSalesO&&tgtO)?Math.max(0,(c/wkSalesO*100)-tgtO)*300:0;
    const DAYOFF_PEN=120; const isOffO=(n,e)=>{ const o=(profileOf(n)||{}).daysOff; if(!Array.isArray(o))return false; const wd=(new Date(e.on_date+'T00:00').getDay()+6)%7; return o.indexOf(wd)>=0; };
    const H={}, Dset={}; let cost=0;
    allNames.forEach(n=>{ H[n]=0; Dset[n]=new Set(); });
    draft.forEach(e=>{ if(e.person_name==='__OPEN__')return; H[e.person_name]=(H[e.person_name]||0)+hrsE(e); (Dset[e.person_name]=Dset[e.person_name]||new Set()).add(e.on_date); cost+=hrsE(e)*(wageO[e.person_name]||0); });
    const anchIdx={}; { const byDay={}; draft.forEach((e,i)=>{ (byDay[e.on_date]=byDay[e.on_date]||[]).push(i); }); if(requireLeaderCoverage) Object.keys(byDay).forEach(dt=>{ const ix=byDay[dt]; let op=ix[0],cl=ix[0]; ix.forEach(i=>{ if((draft[i].start_time||'')<(draft[op].start_time||''))op=i; if((draft[i].end_time||'')>(draft[cl].end_time||''))cl=i; }); anchIdx[op]='open'; if(anchIdx[cl]===undefined)anchIdx[cl]='close'; }); }
    const canTakeO=(n,e,idx)=>{ if(posOf(n)==='Owner'||posOf(n)==='Unassigned')return false; const iso=e.on_date; if(!Dset[n]||Dset[n].has(iso))return false; const wd=(new Date(iso+'T00:00').getDay()+6)%7; const hrs=hrsE(e); if(onLeave(n,iso))return false; if(!fitsAvail(n,wd,e.start_time,e.end_time))return false; const pr=profileOf(n)||{}; if(pr.maxShift&&hrs>+pr.maxShift+1e-9)return false; const cap=minorCapEnd(n,iso); if(cap!=null){ const se=parseClock(e.end_time); if(se!=null&&se>cap+1e-9)return false; const ag=ageOn(n,iso); if(ag!=null&&ag<16&&hrs>8+1e-9)return false; } const _mx=+pr.maxHrs,_mn=+pr.minHrs; const mx=(_mx>0&&(!(_mn>0)||_mx>=_mn))?_mx:otW; if((H[n]||0)+hrs>mx+1e-9)return false; const maxD=pr.maxDays?+pr.maxDays:5; if(Dset[n].size>=maxD)return false;
    if(!runOkSet(n,iso,Dset[n]))return false; const an=anchIdx[idx]; if(an==='open'&&!canOpen(n))return false; if(an==='close'&&!canClose(n))return false; const rq=meta[idx]||{}; if(rq.skill&&!hasSkill(n,rq.skill))return false; if(rq.minLevel&&rq.reqSt&&lvlOf(n,rq.reqSt)<rq.minLevel)return false; if(rq.lead==='opening'&&!canOpen(n))return false; if(rq.lead==='closing'&&!canClose(n))return false; return true; };
    let guard=0;
    while(guard++<2000){ let best=null, bestDelta=-1e-6;
      for(let i=0;i<draft.length;i++){ const e=draft[i]; const hrs=hrsE(e); const cur=e.person_name;
        if(cur==='__OPEN__'){ for(const n of allNames){ if(!canTakeO(n,e,i))continue; const d=-OPEN_PEN+(minPen(n,H[n]+hrs)-minPen(n,H[n]))+(laborPen(cost+hrs*(wageO[n]||0))-laborPen(cost))+(isOffO(n,e)?DAYOFF_PEN:0); if(d<bestDelta){ bestDelta=d; best={i,n,from:'__OPEN__',hrs}; } } }
        else { for(const n of allNames){ if(n===cur)continue; if(!canTakeO(n,e,i))continue; const dCost=hrs*((wageO[n]||0)-(wageO[cur]||0)); const d=(minPen(cur,H[cur]-hrs)-minPen(cur,H[cur]))+(minPen(n,H[n]+hrs)-minPen(n,H[n]))+(laborPen(cost+dCost)-laborPen(cost))+((isOffO(n,e)?DAYOFF_PEN:0)-(isOffO(cur,e)?DAYOFF_PEN:0)); if(d<bestDelta){ bestDelta=d; best={i,n,from:cur,hrs}; } } }
      }
      if(!best) break;
      const e=draft[best.i]; const hrs=best.hrs;
      if(best.from!=='__OPEN__'){ H[best.from]-=hrs; Dset[best.from].delete(e.on_date); cost-=hrs*(wageO[best.from]||0); }
      H[best.n]+=hrs; Dset[best.n].add(e.on_date); cost+=hrs*(wageO[best.n]||0);
      e.person_name=best.n; e.role=(meta[best.i]&&meta[best.i].label)||posOf(best.n); optMoves++;
    }
    unfilled=draft.filter(e=>e.person_name==='__OPEN__').map(e=>({day:e.on_date,station:'',start:e.start_time,end:e.end_time}));
    Object.keys(hoursBy).forEach(k=>delete hoursBy[k]); draft.forEach(e=>{ if(e.person_name!=='__OPEN__') hoursBy[e.person_name]=(hoursBy[e.person_name]||0)+shiftHours(e); });
  }catch(err){ /* greedy draft stands */ }
  if(draft.length && !opts.preview) await sb.from('shifts').insert(draft);
  const flags=[];
  if(unfilled.length){ const lines=unfilled.slice().sort((a,b)=>(a.day+(a.start||'')).localeCompare(b.day+(b.start||''))).map(u=>'   • '+(u.station?u.station+' · ':'')+fmtDay(_d(u.day))+(u.start?' · '+fmtClock(u.start)+(u.end?'–'+fmtClock(u.end):''):'')); flags.push('⚠ '+unfilled.length+' shift'+(unfilled.length>1?'s':'')+" couldn't be filled within everyone's rules:\n"+lines.join('\n')); }
  const overs=Object.keys(hoursBy).filter(n=>hoursBy[n]>otW); if(overs.length) flags.push('⏰ Over '+otW+'h (overtime): '+overs.map(n=>n+' '+hoursBy[n].toFixed(1)+'h').join(', '));
  if(R.meal_after_hrs){ const longs=draft.filter(d=>shiftHours(d)>R.meal_after_hrs); if(longs.length) flags.push('🍽 '+longs.length+' shift'+(longs.length>1?'s':'')+' over '+R.meal_after_hrs+'h — schedule a meal break.'); }
  const belowMin=allNames.filter(n=>{ const mn=+((profileOf(n)||{}).minHrs||0); return mn>0 && (hoursBy[n]||0) < mn-1e-9; }); if(belowMin.length) flags.push('📉 Below their weekly minimum: '+belowMin.map(n=>n+' '+(hoursBy[n]||0).toFixed(1)+'/'+(profileOf(n).minHrs)+'h').join(', ')+' — add hours or adjust their rule.');
  if(leaderGaps.length){ flags.unshift('👤 '+leaderGaps.length+' shift'+(leaderGaps.length>1?'s':'')+' need someone who can open/close (nobody qualified is free): '+leaderGaps.map(x=>fmtDay(_d(x.day))+' '+x.type).join(', ')+' — mark someone able to open/close, or free one up.'); }
  // ---- SCHEDULE QUALITY SCORE: measure the draft against your goals (labor % target, minimums, coverage) ----
  const wageMap={}; (rpay.data||[]).forEach(p=>wageMap[p.person_name]=Number(p.wage)||0);
  const salesMap={}; (rsal.data||[]).forEach(d=>salesMap[d.on_date]=Number(d.sales)||0); if(!Object.keys(salesMap).length){ try{ Object.assign(salesMap, await window._carrySales(isoDays)); }catch(e){} }
  const real=draft.filter(d=>d.person_name!=='__OPEN__');
  const burdenMul=1+((+(cov.burdenPct)||0)/100);
  const wkCost=real.reduce((a,d)=>a+shiftHours(d)*(wageMap[d.person_name]||0),0)*burdenMul;
  const wkSales=isoDays.reduce((a,iso)=>a+(salesMap[iso]||0),0);
  const laborPct=(wkSales&&wkCost)?(wkCost/wkSales*100):null;
  const tgt=+(cov.targetPct)||0; const openCount=draft.filter(d=>d.person_name==='__OPEN__').length;
  const qParts=[];
  if(laborPct!=null){ const over=laborPct-tgt; qParts.push('Labor '+laborPct.toFixed(1)+'%'+(tgt?(' vs '+tgt+'% goal'+(over>0.5?' — '+over.toFixed(1)+' pts over':(over<-0.5?' ✓ under':' ✓ on target'))):'')); }
  else if(tgt){ qParts.push('Labor goal '+tgt+'% — add projected sales to measure it'); }
  qParts.push(openCount?(openCount+' open'):'0 open ✓');
  qParts.push(belowMin.length?(belowMin.length+' below minimum'):'minimums met ✓');
  // (internal shift-balancing swaps are not shown to the user — they were confusing, not actionable)
  flags.unshift('📊 '+qParts.join('   ·   '));
  if(opts.preview){
    const curR=await sb.from('shifts').select('*').gte('on_date',isoDays[0]).lte('on_date',isoDays[6]); const curP=(curR.data||[]).filter(s=>s.person_name!=='__OPEN__');
    const curHrs=curP.reduce((a,s)=>a+shiftHours(s),0), curCost=curP.reduce((a,s)=>a+shiftHours(s)*(wageMap[s.person_name]||0),0)*burdenMul; const curPct=(wkSales&&curCost)?(curCost/wkSales*100):null;
    const propHrs=real.reduce((a,d)=>a+shiftHours(d),0);
    const curByDay=isoDays.map(iso=>{ const day=curP.filter(s=>s.on_date===iso); return {ppl:new Set(day.map(s=>s.person_name)).size, hrs:day.reduce((a,s)=>a+shiftHours(s),0)}; });
    window._csPreview={ isoDays:isoDays.slice(), week:isoDays[0], draft:draft.slice(), flags:flags.slice(), wkSales:wkSales, cur:{hrs:curHrs,cost:curCost,pct:curPct,n:curP.length}, prop:{hrs:propHrs,cost:wkCost,pct:laborPct,open:openCount}, curByDay:curByDay, wage:Object.assign({},wageMap), burden:(+(cov.burdenPct)||0) };
    if(typeof csRenderPreview==='function') csRenderPreview();
    return;
  }
  /* Anyone with no availability record is treated as always available -- the only sane
     default, since assuming the opposite would produce an empty schedule. But it is also
     the reason a draft can look wrong for no visible reason: with 2 of 14 people on
     record, twelve were being placed on any shift at any hour. Say so, rather than
     letting the owner conclude auto-draft is simply bad at its job. */
  let _noAvail=[];
  try{
    const _pool=Object.keys(window._posMap||{}).filter(n=>!isArchived(n)&&posOf(n)!=='Trainee'&&posOf(n)!=='Owner');
    _noAvail=_pool.filter(n=>!avMap[n] || !Object.keys(avMap[n]).length);
  }catch(e){}
  window._draftSummary={made:draft.length, unfilled:unfilled.length, flags, noAvail:_noAvail};
  vSchedule(document.getElementById('view'));
};
const _d=iso=>new Date(iso+'T00:00');
async function schOverview(v){
  const isAdmin=state.profile&&state.profile.role==='admin';
  const today=new Date(); const todayIso=isoDate(today);
  const start=weekStart(today); const days=[...Array(7)].map((_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return isoDate(d);});
  const [rsh,rpay,rsal,rto]=await Promise.all([
    sb.from('shifts').select('*').gte('on_date',days[0]).lte('on_date',days[6]),
    sb.from('pay_rates').select('*'),
    sb.from('day_sales').select('*').gte('on_date',days[0]).lte('on_date',days[6]),
    sb.from('time_off').select('*').eq('status','pending')
  ]);
  const shifts=rsh.data||[]; const wage={}; (rpay.data||[]).forEach(p=>wage[p.person_name]=Number(p.wage)||0);
  const sales={}; (rsal.data||[]).forEach(d=>sales[d.on_date]=Number(d.sales)||0);
  const wkHrs=shifts.reduce((a,s)=>a+shiftHours(s),0);
  const wkCost=shifts.reduce((a,s)=>a+shiftHours(s)*(wage[s.person_name]||0),0);
  const wkSales=days.reduce((a,iso)=>a+(sales[iso]||0),0);
  const labpct=(wkSales&&wkCost)?Math.round(wkCost/wkSales*100):null;
  const todayShifts=shifts.filter(s=>s.on_date===todayIso).sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||''));
  const pendTO=(rto.data||[]).length;
  let h=`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(148px,1fr));margin-bottom:20px">`;
  h+=`<div class="otile"><div class="ol"><i class="ti ti-users"></i>On today</div><div class="ov">${todayShifts.length}</div></div>`;
  h+=`<div class="otile"><div class="ol"><i class="ti ti-clock"></i>Week hours</div><div class="ov">${wkHrs?wkHrs.toFixed(1):'0'}</div></div>`;
  if(isAdmin) h+=`<div class="otile"><div class="ol"><i class="ti ti-currency-dollar"></i>Week labor</div><div class="ov">${wkCost?money(wkCost):'—'}</div></div>`;
  if(isAdmin) h+=`<div class="otile"><div class="ol"><i class="ti ti-percentage"></i>Labor %</div><div class="ov" style="color:${labpct!=null?(labpct>30?'var(--amber)':'var(--green)'):'inherit'}">${labpct!=null?labpct+'%':'—'}</div></div>`;
  h+=`</div>`;
  h+=`<div class="sec">On the floor today · ${today.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</div>`;
  if(!todayShifts.length) h+=`<div class="card" style="padding:22px;text-align:center"><div class="faint">No one scheduled today${isAdmin?' — build the week in the Schedule tab.':'.'}</div></div>`;
  else h+=`<div class="card">`+todayShifts.map(s=>{ const inits=(s.person_name||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); const tr=s.kind==='training'; return `<div class="row" style="padding:11px 15px;border-bottom:1px solid var(--line)"><span class="av">${esc(inits)}</span><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(s.person_name||'—')}</div><div class="faint" style="font-size:12px">${esc(s.role||'Team')}${tr?' · training':''}</div></div><div style="font-size:13px;font-weight:600;color:${tr?'var(--amber)':'var(--brand)'}">${s.start_time?fmtClock(s.start_time):'shift'}${s.end_time?'–'+fmtClock(s.end_time):''}</div></div>`; }).join('')+`</div>`;
  if(pendTO) h+=`<div class="sec">Needs your attention</div><div class="card" style="padding:13px 16px;background:var(--amber-soft);border-color:var(--amber)"><b style="color:var(--amber)">${pendTO} time-off request${pendTO>1?'s':''} waiting for approval</b> <span style="color:var(--brand);cursor:pointer;font-weight:600;margin-left:6px" onclick="schGo('timeoff')">Review →</span></div>`;
  v.innerHTML=h;
}
async function schTeam(v){
  const isAdmin=state.profile&&state.profile.role==='admin';
  const tv=state.ctx.tv||'roster';
  const todayIso=isoDate(new Date());
  const [rpf,rsh,rpay,rtoday]=await Promise.all([ sb.from('profiles').select('*'), sb.from('shifts').select('person_name,role'), sb.from('pay_rates').select('*'), sb.from('shifts').select('*').eq('on_date',todayIso), loadPositions(), loadArchived() ]);
  const _pm={}; (rpf.data||[]).forEach(p=>_pm[p.name]=p); const team=rosterNames().map(n=>({name:n,title:posOf(n),email:(_pm[n]||{}).email,member:!!_pm[n]}));
  const known=new Set(team.map(p=>p.name));
  (rsh.data||[]).forEach(s=>{ if(s.person_name&&!known.has(s.person_name)&&!isArchived(s.person_name)){ known.add(s.person_name); team.push({name:s.person_name,title:posOf(s.person_name),member:false}); } });
  const wage={}; (rpay.data||[]).forEach(p=>wage[p.person_name]=Number(p.wage)||0);
  const seg=(k,l)=>`<button onclick="state.ctx.tv='${k}';schTeam(document.getElementById('schbody'))" style="padding:7px 14px;font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:inherit;background:${tv===k?'var(--brand)':'var(--card)'};color:${tv===k?'#fff':'var(--muted)'}">${l}</button>`;
  let h=`<div style="display:inline-flex;border:1px solid var(--line2);border-radius:9px;overflow:hidden;margin-bottom:16px">${seg('roster','Roster')}${seg('now','On the clock now')}</div>`;
  if(tv==='now'){
    const now=new Date(); const nowH=now.getHours()+now.getMinutes()/60;
    const todays=(rtoday.data||[]).filter(s=>!isArchived(s.person_name)).slice().sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||''));
    const onNow=todays.filter(s=>{ const a=parseClock(s.start_time),b=parseClock(s.end_time); if(a==null||b==null)return false; let end=b; if(end<a)end+=24; return nowH>=a && nowH<end; });
    const later=todays.filter(s=>{ const a=parseClock(s.start_time); return a!=null && a>nowH; });
    const rowOf=(s,tag,col)=>{ const inits=(s.person_name||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); const pos=posOf(s.person_name); const pc=POS_COL[pos]||'#94A3B8'; return `<div class="row" style="padding:11px 15px;border-bottom:1px solid var(--line)"><span class="av" style="background:${pc}22;color:${pc}">${esc(inits)}</span><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(s.person_name||'—')}</div><div class="faint" style="font-size:12px">${esc(pos)}${s.kind==='training'?' · training':''}</div></div><div style="text-align:right"><div style="font-size:13px;font-weight:600;color:${col}">${s.start_time?fmtClock(s.start_time):''}${s.end_time?'–'+fmtClock(s.end_time):''}</div>${tag?`<div class="faint" style="font-size:11px">${tag}</div>`:''}</div></div>`; };
    h+=`<div class="faint" style="font-size:12.5px;margin-bottom:12px">${now.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})} · as of ${now.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</div>`;
    h+=`<div class="sec">On the clock now · ${onNow.length}</div>`;
    h+= onNow.length? `<div class="card">`+onNow.map(s=>rowOf(s,'on shift','var(--green)')).join('')+`</div>` : `<div class="card" style="padding:22px;text-align:center"><div class="faint">No one is on a shift right now.</div></div>`;
    if(later.length){ h+=`<div class="sec">Coming up today</div><div class="card">`+later.map(s=>rowOf(s,'starts '+fmtClock(s.start_time),'var(--brand)')).join('')+`</div>`; }
    v.innerHTML=h; return;
  }
  const roles={}; team.forEach(p=>{ if(p.name==='__OPEN__'||p.name==='__open__') return; (roles[p.title]=roles[p.title]||[]).push(p); });
  h+=`${isAdmin?`<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button onclick="openRosterImport()" style="background:transparent;border:1px solid var(--line2,#d5dde0);border-radius:9px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;color:inherit"><i class="ti ti-upload"></i> Import from another scheduler</button><button onclick="openConceptSetup()" style="margin-left:8px;background:transparent;border:1px solid var(--line2,#d5dde0);border-radius:9px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;color:inherit"><i class="ti ti-building-store"></i> Set up stations</button><button onclick="openSkillsSetup()" style="margin-left:8px;background:transparent;border:1px solid var(--line2,#d5dde0);border-radius:9px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;color:inherit"><i class="ti ti-checkbox"></i> Set up who works where</button></div>`:''}`;
h+=`<div class="faint" style="font-size:13px;margin-bottom:14px">${team.length} people${isAdmin?' · positions are set in Onboarding':''}</div>`;
  if(!team.length) h+=`<div class="card" style="padding:24px;text-align:center"><div class="faint">No team yet. Add shifts in the Schedule tab, or share your join code so they sign in.</div></div>`;
  else Object.keys(roles).sort((a,b)=>{const ia=POS_ORDER.indexOf(a),ib=POS_ORDER.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b);}).forEach(role=>{
    const _bc=POS_COL[role]||'#94A3B8';
    h+=`<div class="band" style="background:${_bc}14;color:${_bc};border-left:4px solid ${_bc};margin:16px 0 0">${esc(role)} <span style="opacity:.7;font-weight:500">· ${roles[role].length}</span></div><div class="card" style="margin-top:0">`+roles[role].map(p=>{ const inits=(p.name||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); return `<div class="row" style="padding:11px 15px;border-bottom:1px solid var(--line)${isAdmin?';cursor:pointer':''}"${isAdmin?` onclick='openProfile(${JSON.stringify(p.name)})'`:''}><span class="av">${esc(inits)}</span><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(p.name)}</div><div class="faint" style="font-size:12px">${isAdmin?'Tap to set their scheduling rules':(p.member?(p.email?esc(p.email):'On the academy'):'Not on the academy yet')}</div></div>${isAdmin&&wage[p.name]?`<div class="faint" style="font-size:12.5px;margin-right:8px">${money(wage[p.name])}/hr</div>`:''}${isAdmin?'<i class="ti ti-chevron-right" style="color:var(--faint)"></i>':''}</div>`; }).join('')+`</div>`;
  });
  v.innerHTML=h;
}
const AV_DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
async function schAvail(v){
  const isAdmin=state.profile&&state.profile.role==='admin';
  const mgr=myRank()>=3||hasGrant('schedule'); // team-availability grid is a scheduling tool — any manager (or granted scheduler), not just the owner
  const me=myRosterName()||state.profile.name;
  v.innerHTML='<div class="muted">Loading…</div>';
  const [ra,rpf,rsh]=await Promise.all([ sb.from('availability').select('*'), sb.from('profiles').select('name,role'), sb.from('shifts').select('person_name'), loadPositions(), loadArchived() ]);
  const byPerson={}; (ra.data||[]).forEach(r=>{ const p=byPerson[r.person_name]=byPerson[r.person_name]||{}; p[r.weekday]=r; });
  window._avail=byPerson;
  let h=`<div class="sec">My availability</div><div class="faint" style="font-size:12.5px;margin:-4px 0 11px">For each day pick <b style="color:#1B7B3F">Available</b> (all day), <b style="color:#B7791F">Limited</b> (only certain hours), or <b style="color:#A32D2D">Off</b>. On Limited, enter the hours you can actually work — e.g. 10:00 to 2:00. Leadership uses this to build the schedule.</div>`;
  h+=`<div class="card" style="padding:4px 2px;margin-bottom:26px">`+AV_DOW.map((d,i)=>{ const row=(byPerson[me]||{})[i]; const can=row?row.can_work!==false:true; const note=row?(row.note||''):''; const win=parseWin(note); const status=!can?'off':((win||note==='limited')?'limited':'avail');
    return `<div style="padding:9px 12px;${i<6?'border-bottom:1px solid var(--line)':''}"><div class="row" style="gap:9px"><div style="width:38px;font-weight:600;font-size:14px">${d}</div><div class="avseg"><button class="avbtn${status==='avail'?' on':''}" onclick="avMe(${i},'avail',this)">Available</button><button class="avbtn${status==='limited'?' lim':''}" onclick="avMe(${i},'limited',this)">Limited</button><button class="avbtn${status==='off'?' off':''}" onclick="avMe(${i},'off',this)">Off</button></div></div><div class="avwin" data-wd="${i}" style="display:${status==='limited'?'flex':'none'};gap:7px;align-items:center;margin:9px 0 2px 47px;flex-wrap:wrap"><span class="faint" style="font-size:12px">Can work</span><input type="time" class="avfrom" value="${win?win[0]:''}" onchange="avWin(${i})" style="padding:7px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;font-size:13px"/><span class="faint" style="font-size:12px">to</span><input type="time" class="avto" value="${win?win[1]:''}" onchange="avWin(${i})" style="padding:7px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;font-size:13px"/></div></div>`; }).join('')+`</div>`;
  if(mgr){
    const set=new Set(); rosterNames().forEach(n=>set.add(n)); (rsh.data||[]).forEach(s=>{ if(s.person_name)set.add(s.person_name); }); set.delete(me);
    const people=[...set].filter(n=>n&&!isArchived(n)).sort((a,b)=>{const pa=POS_ORDER.indexOf(posOf(a)),pb=POS_ORDER.indexOf(posOf(b));return (pa<0?99:pa)-(pb<0?99:pb)||a.localeCompare(b);});
    h+=`<div class="sec">Team availability</div><div class="faint" style="font-size:12.5px;margin:-4px 0 11px">Green ✓ = available, amber <b style="color:#B7791F">L</b> = limited hours (hover for the window), red ✕ = off. Tap a cell to flip available/off. People set their own limited hours in My availability. This is what the auto-draft reads.</div>`;
    if(!people.length) h+=`<div class="card" style="padding:20px;text-align:center"><div class="faint">No team yet.</div></div>`;
    else { h+=`<div class="avgrid-wrap"><div class="avgrid"><div class="avgh avgh-name">Team</div>`+AV_DOW.map(d=>`<div class="avgh">${d}</div>`).join('');
      people.forEach(person=>{ const pos=posOf(person); const c=POS_COL[pos]||'#94A3B8'; const inits=(person||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
        h+=`<div class="avgn"><span class="av" style="background:${c}22;color:${c}">${esc(inits)}</span><span class="nm" style="font-size:13px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(person)}</span></div>`+AV_DOW.map((d,i)=>{ const row=(byPerson[person]||{})[i]; const can=row?row.can_work!==false:true; const note=row?(row.note||''):''; const win=parseWin(note); const lim=can&&(win||note==='limited'); return `<div class="avg${lim?' lim':(can?' on':' off')}" data-person="${esc(person)}" data-wd="${i}" onclick="avToggle(this)" title="${lim?(win?win[0]+'–'+win[1]:'Limited hours'):(can?'Available':'Off')}">${lim?'L':(can?'✓':'✕')}</div>`; }).join('');
      });
      h+=`</div></div>`;
    }
  }
  v.innerHTML=h;
}
async function _avUpsert(person,wd,fields){
  const cur=(window._avail&&window._avail[person]&&window._avail[person][wd])||null;
  if(cur){ Object.assign(cur,fields); await sb.from('availability').update({...fields,updated_at:new Date().toISOString()}).eq('id',cur.id); }
  else { const ins=await sb.from('availability').insert({person_name:person,weekday:wd,user_id:state.user.id,...fields}).select(); const row=ins.data&&ins.data[0]; if(row){ (window._avail[person]=window._avail[person]||{})[wd]=row; } }
}
function parseWin(note){ const m=(note||'').match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/); return m?[m[1],m[2]]:null; }
window.avMe=function(wd,status,btn){ const seg=btn.parentNode; seg.querySelectorAll('.avbtn').forEach(b=>b.classList.remove('on','lim','off')); btn.classList.add(status==='avail'?'on':status==='limited'?'lim':'off'); const winDiv=[...document.querySelectorAll('.avwin')].find(x=>+x.getAttribute('data-wd')===wd); if(winDiv) winDiv.style.display=status==='limited'?'flex':'none'; if(status==='off') _avUpsert(myRosterName()||state.profile.name,wd,{can_work:false,note:null}); else if(status==='avail') _avUpsert(myRosterName()||state.profile.name,wd,{can_work:true,note:null}); else avWin(wd); };
window.avWin=function(wd){ const winDiv=[...document.querySelectorAll('.avwin')].find(x=>+x.getAttribute('data-wd')===wd); if(!winDiv)return; const from=winDiv.querySelector('.avfrom').value, to=winDiv.querySelector('.avto').value; const note=(from&&to)?from+'-'+to:'limited'; _avUpsert(myRosterName()||state.profile.name,wd,{can_work:true,note}); };
window.avToggle=function(el){ const person=el.getAttribute('data-person'); const wd=+el.getAttribute('data-wd'); const isOff=el.classList.contains('off'); const nowOn=isOff; el.classList.remove('on','off','lim'); el.classList.add(nowOn?'on':'off'); el.innerHTML=nowOn?'✓':'✕'; _avUpsert(person,wd,{can_work:nowOn,note:null}); };
async function schPool(v){
  const isAdmin=state.profile&&state.profile.role==='admin';
  const mgr=myRank()>=3||hasGrant('schedule'); // approving trades is a scheduling job — any manager, not just the owner
  const me=myRosterName()||state.profile.name;
  v.innerHTML='<div class="muted">Loading…</div>';
  const today=new Date(); const todayIso=isoDate(today); const end=new Date(); end.setDate(end.getDate()+21); const endIso=isoDate(end);
  const [rsh,rpl,rpf]=await Promise.all([
    sb.from('shifts').select('*').gte('on_date',todayIso).lte('on_date',endIso).order('on_date'),
    sb.from('day_items').select('*').eq('kind','pool'),
    sb.from('profiles').select('name,id')
  ]);
  await loadPositions();
  const shifts=rsh.data||[]; window._poolShifts={}; shifts.forEach(s=>window._poolShifts[s.id]=s);
  const profById={}; (rpf.data||[]).forEach(p=>profById[p.name]=p.id); window._poolProf=profById;
  const pool=(rpl.data||[]).map(r=>{ let d={}; try{d=JSON.parse(r.detail||'{}');}catch(e){} return {id:r.id,on_date:r.on_date,d}; });
  window._pool={}; pool.forEach(p=>window._pool[p.id]=p);
  const fmtSlot=s=> fmtDay(_d(s.on_date))+' · '+(s.start_time?fmtClock(s.start_time):'shift')+(s.end_time?'–'+fmtClock(s.end_time):'');
  let h=`<div class="faint" style="font-size:12.5px;margin-bottom:14px">Give up a shift you can't work, or pick up one a teammate dropped. ${mgr?'You approve every trade before it becomes real.':'Leadership approves every trade before it becomes real.'}</div>`;
  const claimed=pool.filter(p=>p.d.status==='claimed');
  if(mgr&&claimed.length){ h+=`<div class="sec">Needs your approval</div><div class="card" style="margin-bottom:18px">`+claimed.map(p=>{ const s=window._poolShifts[p.d.shift_id]; return `<div class="row" style="padding:12px 15px;border-bottom:1px solid var(--line)"><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(p.d.claimant)} → picks up ${esc(p.d.requester)}'s shift</div><div class="faint" style="font-size:12.5px">${s?esc(fmtSlot(s)):esc(fmtDay(_d(p.on_date)))} · ${esc(p.d.role||'')}</div></div><div class="row" style="gap:6px"><button class="btn pri" style="width:auto;padding:5px 10px" onclick="poolApprove(${p.id})">Approve</button><button class="btn" style="width:auto;padding:5px 10px" onclick="poolDeny(${p.id})">Deny</button></div></div>`; }).join('')+`</div>`; }
  const grabbable=pool.filter(p=>p.d.status==='open'&&p.d.requester!==me);
  h+=`<div class="sec">Up for grabs</div>`;
  if(!grabbable.length) h+=`<div class="card" style="padding:20px;text-align:center;margin-bottom:18px"><div class="faint">Nothing open right now. When a teammate gives up a shift, it shows here to pick up.</div></div>`;
  else h+=`<div class="card" style="margin-bottom:18px">`+grabbable.map(p=>{ const s=window._poolShifts[p.d.shift_id]; return `<div class="row" style="padding:12px 15px;border-bottom:1px solid var(--line)"><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${s?esc(fmtSlot(s)):esc(fmtDay(_d(p.on_date)))}</div><div class="faint" style="font-size:12.5px">${esc(p.d.role||'')} · was ${esc(p.d.requester)}'s</div></div><button class="btn pri" style="width:auto;padding:6px 12px" onclick="poolPickup(${p.id})">Pick up</button></div>`; }).join('')+`</div>`;
  const myShifts=shifts.filter(s=>s.person_name===me);
  h+=`<div class="sec">My shifts</div>`;
  if(!myShifts.length) h+=`<div class="card" style="padding:20px;text-align:center"><div class="faint">You have no upcoming shifts in the next 3 weeks.</div></div>`;
  else h+=`<div class="card">`+myShifts.map(s=>{ const poolItem=pool.find(p=>p.d.shift_id===s.id&&p.d.requester===me); const st=poolItem?poolItem.d.status:null; return `<div class="row" style="padding:12px 15px;border-bottom:1px solid var(--line)"><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(fmtSlot(s))}</div><div class="faint" style="font-size:12.5px">${esc(posOf(me))}${st?' · <b style="color:var(--brand)">'+(st==='open'?'up for grabs':'picked up — pending approval')+'</b>':''}</div></div>${poolItem?`<button class="btn" style="width:auto;padding:6px 11px" onclick="poolCancel(${poolItem.id})">${st==='claimed'?'Withdraw':'Cancel'}</button>`:`<button class="btn" style="width:auto;padding:6px 11px" onclick="poolOffer(${s.id})">Give up</button>`}</div>`; }).join('')+`</div>`;
  v.innerHTML=h;
}
window.poolOffer=async function(shiftId){ const s=(window._poolShifts||{})[shiftId]; if(!s)return; const d={shift_id:shiftId,requester:s.person_name,start:s.start_time,end:s.end_time,role:posOf(s.person_name),claimant:null,status:'open'}; await sb.from('day_items').insert({kind:'pool',on_date:s.on_date,title:s.person_name,detail:JSON.stringify(d),created_by:state.user.id}); schGo('pool'); };
window.poolCancel=async function(id){ await sb.from('day_items').delete().eq('id',id); schGo('pool'); };
window.poolPickup=async function(id){ const p=(window._pool||{})[id]; if(!p)return; const nd=Object.assign({},p.d,{claimant:myRosterName()||state.profile.name,status:'claimed'}); await sb.from('day_items').update({detail:JSON.stringify(nd)}).eq('id',id); schGo('pool'); };
window.poolApprove=async function(id){ const p=(window._pool||{})[id]; if(!p)return; const c=p.d.claimant; if(c){ await sb.from('shifts').update({person_name:c,role:posOf(c),user_id:(window._poolProf||{})[c]||null}).eq('id',p.d.shift_id); } await sb.from('day_items').delete().eq('id',id); schGo('pool'); };
window.poolDeny=async function(id){ const p=(window._pool||{})[id]; if(!p)return; const nd=Object.assign({},p.d,{claimant:null,status:'open'}); await sb.from('day_items').update({detail:JSON.stringify(nd)}).eq('id',id); schGo('pool'); };
async function schTimeoff(v){
  const isAdmin=state.profile&&state.profile.role==='admin'; const mgr=myRank()>=3||hasGrant('schedule'); const me=myRosterName()||state.profile.name; // approving time off is a manager job, not owner-only
  const r=await sb.from('time_off').select('*').order('start_date',{ascending:true});
  const rows=r.data||[]; const todayIso=isoDate(new Date());
  const wkEnd=isoDate((()=>{const d=new Date();d.setDate(d.getDate()+7);return d;})());
  const pending=rows.filter(t=>t.status==='pending');
  const upcoming=rows.filter(t=>t.status==='approved'&&(t.end_date||t.start_date)>=todayIso);
  const history=rows.filter(t=>t.status==='denied'||(t.status==='approved'&&(t.end_date||t.start_date)<todayIso)).sort((a,b)=>(b.start_date).localeCompare(a.start_date));
  const offWeekList=upcoming.filter(t=>t.start_date<=wkEnd);
  const offThisWeek=new Set(offWeekList.map(t=>t.person_name)).size;
  const stpill=s=> s==='approved'?`<span class="pill" style="background:var(--green-soft);color:var(--green);font-size:11px;font-weight:600">Approved</span>` : s==='denied'?`<span class="pill" style="background:#FCEBEB;color:#A32D2D;font-size:11px;font-weight:600">Declined</span>` : `<span class="pill" style="background:var(--amber-soft);color:var(--amber);font-size:11px;font-weight:600">Pending</span>`;
  const _in=n=>(n||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
  const _dur=t=>{ const a=new Date(t.start_date+'T00:00'),b=new Date((t.end_date||t.start_date)+'T00:00'); return Math.round((b-a)/86400000)+1; };
  const _ds=t=>esc(fmtDay(_d(t.start_date)))+(t.end_date&&t.end_date!==t.start_date?' – '+esc(fmtDay(_d(t.end_date))):'');
  const row=(t,actions)=>`<div class="row" style="padding:12px 15px;border-bottom:1px solid var(--line)"><span class="av">${esc(_in(t.person_name))}</span><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(t.person_name||'Someone')}</div><div class="faint" style="font-size:12.5px">${_ds(t)} · ${_dur(t)} day${_dur(t)>1?'s':''}${t.reason?' · '+esc(t.reason):''}</div></div><div class="row" style="gap:6px">${actions||stpill(t.status)}</div></div>`;
  let h=`<div class="card" style="padding:15px;margin-bottom:18px"><div style="font-weight:600;margin-bottom:10px">Request time off</div><div class="row" style="gap:8px;flex-wrap:wrap"><input id="tofrom" type="date" style="padding:9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit"/><span class="faint" style="align-self:center">to</span><input id="toto" type="date" style="padding:9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit"/><input id="toreason" placeholder="Reason (optional)" style="flex:1;min-width:150px;padding:9px 11px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit"/><button class="btn pri" style="width:auto" onclick="addTimeOff()">Request</button></div></div>`;
  const tile=(ic,lbl,vv,col,target)=>`<div class="otile" style="cursor:pointer" onclick="var e=document.getElementById('${target}');if(e)e.scrollIntoView({behavior:'smooth',block:'start'})"><div class="ol"><i class="ti ${ic}"></i>${lbl}</div><div class="ov"${col?` style="color:${col}"`:''}>${vv}</div></div>`;
  if(mgr) h+=`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));margin-bottom:18px">${tile('ti-inbox','Awaiting you',pending.length,pending.length?'var(--amber)':'','toSecPending')}${tile('ti-plane','Off this week',offThisWeek,'','toSecWeek')}${tile('ti-calendar','Upcoming',upcoming.length,'','toSecUpcoming')}</div>`;
  if(mgr){ h+=`<div class="sec" id="toSecPending">Needs your approval</div>`; h+= pending.length? `<div class="card" style="margin-bottom:18px;background:var(--amber-soft);border-color:var(--amber)">`+pending.map(t=>row(t,`<button class="btn pri" style="width:auto;padding:5px 11px" onclick="setTO(${t.id},'approved')">Approve</button><button class="btn" style="width:auto;padding:5px 10px" onclick="setTO(${t.id},'denied')">Decline</button>`)).join('')+`</div>` : `<div class="card" style="padding:18px;text-align:center;margin-bottom:18px"><div class="faint">Nothing waiting on you — all caught up.</div></div>`;
    h+=`<div class="sec" id="toSecWeek">Off this week</div>`; h+= offWeekList.length? `<div class="card" style="margin-bottom:18px">`+offWeekList.map(t=>row(t,stpill('approved'))).join('')+`</div>` : `<div class="card" style="padding:18px;text-align:center;margin-bottom:18px"><div class="faint">Nobody is off in the next 7 days.</div></div>`;
  }
  else { const mine=rows.filter(t=>t.person_name===me && t.status==='pending'); if(mine.length){ h+=`<div class="sec">Your pending requests</div><div class="card" style="margin-bottom:18px">`+mine.map(t=>row(t)).join('')+`</div>`; } }
  h+=`<div class="sec" id="toSecUpcoming">Approved — upcoming</div>`;
  h+= upcoming.length? `<div class="card" style="margin-bottom:18px">`+upcoming.map(t=>row(t,mgr?`${stpill('approved')}<button class="btn" style="width:auto;padding:5px 8px" title="Revoke" onclick="setTO(${t.id},'denied')">✕</button>`:stpill('approved'))).join('')+`</div>` : `<div class="card" style="padding:20px;text-align:center;margin-bottom:18px"><div class="faint">No approved time off coming up.</div></div>`;
  if(history.length){ h+=`<div class="sec">Past &amp; declined</div><div class="card">`+history.slice(0,20).map(t=>row(t)).join('')+`</div>`; }
  v.innerHTML=h;
}
window.addTimeOff=async function(){ const f=document.getElementById('tofrom').value; const t=document.getElementById('toto').value||f; const reason=document.getElementById('toreason').value.trim(); if(!f){ alert('Pick a start date.'); return; } await sb.from('time_off').insert({user_id:state.user.id, person_name:myRosterName()||state.profile.name, start_date:f, end_date:t, reason, status:'pending'}); schGo('timeoff'); };
window.setTO=async function(id,st){ await sb.from('time_off').update({status:st}).eq('id',id); schGo('timeoff'); };
async function schLogbook(v){
  const isAdmin=state.profile&&state.profile.role==='admin';
  const d0=state.ctx.logDate||isoDate(new Date());
  if(typeof setTitle==='function') setTitle('Log','Close out the shift — what got done, what to hand off');
  const [rsh,rpay,rsal,rlog,rmeta,rcov,ractRow]=await Promise.all([
    sb.from('shifts').select('*').eq('on_date',d0),
    sb.from('pay_rates').select('*'),
    sb.from('day_sales').select('*').eq('on_date',d0).maybeSingle(),
    sb.from('log_entries').select('*').eq('on_date',d0).order('created_at',{ascending:false}),
    sb.from('day_items').select('*').eq('kind','daylog').eq('on_date',d0).maybeSingle(),
    sb.from('day_items').select('detail').eq('kind','covrules').order('id',{ascending:false}).limit(1).maybeSingle(),
    sb.from('day_items').select('detail').eq('kind','actual').eq('on_date',d0).maybeSingle()
  ]);
  await loadPositions();
  let burden=0; try{ burden=+JSON.parse((rcov.data&&rcov.data.detail)||'{}').burdenPct||0; }catch(e){}
  const wage={}; (rpay.data||[]).forEach(p=>wage[p.person_name]=Number(p.wage)||0);
  const shifts=(rsh.data||[]).filter(s=>s.person_name&&s.person_name!=='__OPEN__');
  const hrs=shifts.reduce((a,s)=>a+shiftHours(s),0); const cost=shifts.reduce((a,s)=>a+shiftHours(s)*(wage[s.person_name]||0),0)*(1+burden/100);
  const forecast=rsal.data?Number(rsal.data.sales)||0:0; let actual=0; try{ actual=ractRow&&ractRow.data?Number(JSON.parse(ractRow.data.detail||'{}').amount)||0:0; }catch(e){} const useSales=actual||forecast; const pct=(useSales&&cost)?cost/useSales*100:null; const varP=(forecast&&actual)?((actual-forecast)/forecast*100):null;
  let meta={score:0,summary:''}; try{ if(rmeta.data) meta=Object.assign(meta,JSON.parse(rmeta.data.detail||'{}')); }catch(e){}
  window._logScoreVal=meta.score||0;
  const dt=_d(d0); const SCORES=[[1,'Hard','#B32D2D'],[2,'OK','#B7791F'],[3,'Good','#2563EB'],[4,'Great','#1B7B3F']];
  let h=`<div class="sched-bar"><div class="sched-nav"><button class="iconbtn" onclick="logDay(-1)"><i class="ti ti-chevron-left"></i></button><button class="iconbtn" onclick="logDay(1)"><i class="ti ti-chevron-right"></i></button><button class="btn" style="width:auto" onclick="logDay(0)">Today</button></div><div style="font-size:18px;font-weight:600">${dt.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</div></div>`;
  const cell=(l,vv,c)=>`<div style="flex:1;min-width:88px;text-align:center"><div class="faint" style="font-size:11px;text-transform:uppercase;letter-spacing:.03em">${l}</div><div style="font-size:20px;font-weight:800;color:${c||'var(--ink)'}">${vv}</div></div>`;
  const actCell=`<div style="flex:1;min-width:96px;text-align:center"><div class="faint" style="font-size:11px;text-transform:uppercase;letter-spacing:.03em">Actual</div><div style="font-size:20px;font-weight:800">${isAdmin?`<input type="number" id="logActual" value="${actual||''}" placeholder="0" oninput="logSetActual('${d0}',this.value)" style="width:96px;text-align:center;font-size:19px;font-weight:800;border:1px solid var(--line2);border-radius:8px;padding:3px 6px;background:var(--card);color:var(--ink)"/>`:(actual?money(actual):'—')}</div>${varP!=null?`<div style="font-size:11px;font-weight:800;color:${varP>=0?'#1B7B3F':'#B32D2D'}">${varP>=0?'▲':'▼'} ${Math.abs(varP).toFixed(0)}% vs forecast</div>`:''}</div>`;
  h+=`<div class="card" style="padding:16px 16px 14px"><div style="font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin-bottom:12px">✦ The day&rsquo;s numbers</div><div class="row" style="gap:10px;flex-wrap:wrap">${actCell}${cell('Forecast',forecast?money(forecast):'—')}${isAdmin?cell('Labor',money(cost)):''}${isAdmin?cell('Labor %',pct!=null?pct.toFixed(0)+'%':'—',pct!=null&&pct>30?'var(--amber)':'var(--green)'):''}${cell('Hours',hrs.toFixed(1))}</div><div class="faint" style="font-size:11px;margin-top:8px">Forecast comes from the projected sales you set on the Schedule. Enter the day's actual here at close.</div></div>`;
  h+=`<div class="card" style="padding:16px;margin-top:14px"><div style="font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin-bottom:12px">✦ How&rsquo;d the day go?</div><div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:12px" id="scoreRow">${SCORES.map(s=>`<button onclick="logScore(${s[0]})" data-sc="${s[0]}" style="flex:1;min-width:70px;padding:10px;border-radius:9px;border:2px solid ${meta.score==s[0]?s[2]:'var(--line2)'};background:${meta.score==s[0]?s[2]:'var(--card)'};color:${meta.score==s[0]?'#fff':'var(--muted)'};font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">${s[1]}</button>`).join('')}</div><textarea id="logSummary" placeholder="Shift summary — what the next leader should know. Wins, problems, follow-ups…" style="width:100%;min-height:70px;padding:11px;border:1px solid var(--line2);border-radius:9px;font-size:14px;font-family:inherit;color:var(--ink);background:var(--card)">${esc(meta.summary||'')}</textarea><div class="row" style="margin-top:9px"><button class="btn pri" style="width:auto;margin-left:auto" onclick="logSaveMeta('${d0}')">Save the day</button><span id="logmsg" class="muted" style="font-size:13px;align-self:center;margin-left:8px"></span></div></div>`;
  const cats=['note','maintenance','incident','cash','staffing','other']; const cico={note:'ti-note',maintenance:'ti-tool',incident:'ti-alert-triangle',cash:'ti-cash',staffing:'ti-users',other:'ti-dots'}; const CAT_COL={note:'#64748B',maintenance:'#0D9488',incident:'#B32D2D',cash:'#1B7B3F',staffing:'#2563EB',other:'#94A3B8'};
  h+=`<div class="card" style="padding:16px;margin-top:14px;margin-bottom:14px"><div style="font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin-bottom:7px">✦ Close out your shift</div><div class="faint" style="font-size:12.5px;margin:0 0 12px">Pick your shift, log what happened, and flag anything the next shift needs.</div><div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:8px"><select id="lgseg" style="padding:9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit"><option value="Opening">Opening</option><option value="Mid">Mid</option><option value="Closing">Closing</option></select><select id="lgcat" style="padding:9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit">${cats.map(c=>`<option value="${c}">${c[0].toUpperCase()+c.slice(1)}</option>`).join('')}</select></div><textarea id="lgbody" placeholder="What got done, what broke, what the next shift needs to know…" style="width:100%;min-height:56px;padding:11px;border:1px solid var(--line2);border-radius:9px;font-size:14px;font-family:inherit;color:var(--ink);background:var(--card)"></textarea><div class="row" style="margin-top:8px"><button class="btn" style="width:auto;margin-left:auto" onclick="addLog('${d0}')">Add note</button></div></div>`;
  h+=`<div style="font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin:4px 2px 10px">✦ The day&rsquo;s log</div>`;
  const logs=rlog.data||[];
  if(!logs.length) h+=`<div class="faint" style="font-size:13px;text-align:center;padding:8px">No notes logged for this day.</div>`;
  else h+=logs.map(e=>`<div class="card" style="padding:12px 15px;margin-bottom:9px;border-left:4px solid ${CAT_COL[e.category]||'#94A3B8'}${e.resolved?';opacity:.55':''}"><div class="row" style="gap:9px;margin-bottom:5px">${e.segment?`<span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#534AB7;background:#EEEDFE;border-radius:6px;padding:2px 7px;flex-shrink:0">${esc(e.segment)}</span>`:''}<i class="ti ${cico[e.category]||'ti-note'}" style="color:${CAT_COL[e.category]||'var(--brand)'};font-size:16px"></i><span style="font-weight:600;font-size:13px;text-transform:capitalize">${esc(e.category||'note')}</span><span class="faint" style="font-size:11.5px">· ${esc(e.author_name||'')} · ${timeAgo(e.created_at)}</span><button onclick="logToggleResolved(${e.id},${e.resolved?0:1})" title="${e.resolved?'Reopen — put back on Today':'Clear — done, drop from Today'}" style="margin-left:auto;border:1px solid var(--line2);background:var(--card);color:${e.resolved?'#1B7B3F':'var(--muted)'};cursor:pointer;font-size:11px;font-weight:700;border-radius:6px;padding:2px 9px">${e.resolved?'✓ Cleared':'Clear'}</button>${isAdmin?`<button onclick="delLog(${e.id},'${d0}')" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:15px;margin-left:6px">×</button>`:''}</div><div class="muted" style="font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(e.body||'')}</div></div>`).join('');
  v.innerHTML=h;
}
window.logDay=function(n){ const cur=state.ctx.logDate?new Date(state.ctx.logDate+'T00:00'):new Date(); if(n===0){ state.ctx.logDate=isoDate(new Date()); } else { cur.setDate(cur.getDate()+n); state.ctx.logDate=isoDate(cur); } schLogbook(document.getElementById('view')); };
window.logScore=function(s){ window._logScoreVal=s; const cols={1:'#B32D2D',2:'#B7791F',3:'#2563EB',4:'#1B7B3F'}; document.querySelectorAll('#scoreRow [data-sc]').forEach(b=>{ const on=+b.getAttribute('data-sc')===s; b.style.border='2px solid '+(on?cols[s]:'var(--line2)'); b.style.background=on?cols[s]:'var(--card)'; b.style.color=on?'#fff':'var(--muted)'; }); };
window.logSetSales=function(iso,val){ window._noSalesEver=false; clearTimeout(window._logSalesTmr); window._logSalesTmr=setTimeout(()=>{ sb.from('day_sales').upsert({on_date:iso,sales:Number(val)||0}).then(()=>{}); },500); };
window.logSetActual=function(iso,val){ clearTimeout(window._logActTmr); window._logActTmr=setTimeout(async()=>{ await sb.from('day_items').delete().eq('kind','actual').eq('on_date',iso); if(Number(val)>0) await sb.from('day_items').insert({kind:'actual',on_date:iso,title:'actual',detail:JSON.stringify({amount:Number(val)}),created_by:state.user.id}); },500); };
window.logSaveMeta=async function(iso){ const summary=(document.getElementById('logSummary')||{}).value||''; const score=window._logScoreVal||0; const m=document.getElementById('logmsg'); if(m){m.style.color='';m.textContent='Saving…';}
  const del=await sb.from('day_items').delete().eq('kind','daylog').eq('on_date',iso);
  if(del&&del.error){ if(m){m.style.color='#B32D2D';m.textContent='Could not save: '+del.error.message;} return; }
  const ins=await sb.from('day_items').insert({kind:'daylog',on_date:iso,title:'daylog',detail:JSON.stringify({score,summary}),created_by:state.user.id});
  if(ins&&ins.error){ if(m){m.style.color='#B32D2D';m.textContent='Could not save: '+ins.error.message;} return; }
  if(m){m.style.color='';m.textContent='Saved ✓';} };
window.addLog=async function(iso){ const body=(document.getElementById('lgbody')||{}).value.trim(); if(!body){ alert('Write something first.'); return; } await sb.from('log_entries').insert({author_id:state.user.id, author_name:state.profile.name, category:(document.getElementById('lgcat')||{}).value||'note', segment:(document.getElementById('lgseg')||{}).value||null, on_date:iso||isoDate(new Date()), body}); schLogbook(document.getElementById('view')); };
window.delLog=async function(id,iso){ await sb.from('log_entries').delete().eq('id',id); schLogbook(document.getElementById('view')); };
window.logToggleResolved=async function(id,val){ const r=await sb.from('log_entries').update({resolved:!!val}).eq('id',id); if(r&&r.error){ alert('Could not update: '+r.error.message); return; } schLogbook(document.getElementById('view')); };
async function schReports(v){
  const isAdmin=state.profile&&state.profile.role==='admin';
  const base=state.ctx.wk?wkDate(state.ctx.wk):weekStart(new Date());
  const start=weekStart(base); const days=[...Array(7)].map((_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return isoDate(d);});
  const lyDays=days.map(iso=>{ const d=new Date(iso+'T00:00'); d.setDate(d.getDate()-364); return isoDate(d); });
  const [rsh,rpay,rsal,rcov,ract,rlys,rlya,rpun]=await Promise.all([ sb.from('shifts').select('*').gte('on_date',days[0]).lte('on_date',days[6]), sb.from('pay_rates').select('*'), sb.from('day_sales').select('*').gte('on_date',days[0]).lte('on_date',days[6]), sb.from('day_items').select('detail').eq('kind','covrules').order('id',{ascending:false}).limit(1).maybeSingle(), sb.from('day_items').select('on_date,detail').eq('kind','actual').gte('on_date',days[0]).lte('on_date',days[6]), sb.from('day_sales').select('on_date,sales').gte('on_date',lyDays[0]).lte('on_date',lyDays[6]), sb.from('day_items').select('on_date,detail').eq('kind','actual').gte('on_date',lyDays[0]).lte('on_date',lyDays[6]), sb.from('day_items').select('title,detail').eq('kind','punch').gte('on_date',days[0]).lte('on_date',days[6]) ]);
  const punchedHrs={}; (rpun.data||[]).forEach(x=>{ let d={}; try{d=JSON.parse(x.detail||'{}');}catch(e){} (d.sessions||[]).forEach(s=>{ if(s.in&&s.out){ const ms=new Date(s.out)-new Date(s.in); if(ms>0) punchedHrs[x.title]=(punchedHrs[x.title]||0)+ms/3600000; } }); });
  const lyMap={}; (rlys.data||[]).forEach(d=>lyMap[d.on_date]=Number(d.sales)||0); (rlya.data||[]).forEach(x=>{ try{ const a=Number(JSON.parse(x.detail||'{}').amount)||0; if(a) lyMap[x.on_date]=a; }catch(e){} }); const lyTotal=lyDays.reduce((a,iso)=>a+(lyMap[iso]||0),0);
  let target=0,burden=0; try{ const cd=JSON.parse((rcov.data&&rcov.data.detail)||'{}'); target=+cd.targetPct||0; burden=+cd.burdenPct||0; }catch(e){} const bMul=1+(burden/100);
  const shifts=(rsh.data||[]).filter(s=>s.person_name&&s.person_name!=='__OPEN__'); const opens=(rsh.data||[]).filter(s=>s.person_name==='__OPEN__').length;
  const wage={}; (rpay.data||[]).forEach(p=>wage[p.person_name]=Number(p.wage)||0);
  const forecast={}; (rsal.data||[]).forEach(d=>forecast[d.on_date]=Number(d.sales)||0);
  const actual={}; (ract.data||[]).forEach(x=>{ try{ actual[x.on_date]=Number(JSON.parse(x.detail||'{}').amount)||0; }catch(e){} });
  const sales={}; days.forEach(iso=>{ sales[iso]=actual[iso]||forecast[iso]||0; });
  const per={}; shifts.forEach(s=>{ const k=s.person_name; const hrs=shiftHours(s); (per[k]=per[k]||{hrs:0,cost:0,dset:new Set()}); per[k].hrs+=hrs; per[k].cost+=hrs*(wage[k]||0); per[k].dset.add(s.on_date); });
  const names=Object.keys(per).sort((a,b)=>per[b].hrs-per[a].hrs);
  const byDay=days.map(iso=>{ const ds=shifts.filter(s=>s.on_date===iso); const hrs=ds.reduce((a,s)=>a+shiftHours(s),0); const cost=ds.reduce((a,s)=>a+shiftHours(s)*(wage[s.person_name]||0),0)*bMul; const sal=sales[iso]||0; return {iso,hrs,cost,sal,pct:(sal&&cost)?cost/sal*100:null,heads:new Set(ds.map(s=>s.person_name)).size}; });
  const totHrs=names.reduce((a,n)=>a+per[n].hrs,0); const totCost=names.reduce((a,n)=>a+per[n].cost,0)*bMul; const totSales=days.reduce((a,iso)=>a+(sales[iso]||0),0); const labpct=(totSales&&totCost)?(totCost/totSales*100):null; const otW=(lawRules().ot_weekly_hrs)||40;
  const totForecast=days.reduce((a,iso)=>a+(forecast[iso]||0),0); const totActual=days.reduce((a,iso)=>a+(actual[iso]||0),0); const svar=(totForecast&&totActual)?((totActual-totForecast)/totForecast*100):null;
  const maxDC=Math.max(1,...byDay.map(d=>d.cost)); const maxPH=Math.max(1,...names.map(n=>per[n].hrs));
  const pctCol=p=>p==null?'var(--muted)':(target&&p>target+0.5?'#B32D2D':(target&&p>target-2?'var(--amber)':'var(--green)'));
  let h=`<div class="print-only" style="margin-bottom:10px"><div style="font-size:20px;font-weight:800">Labor report</div><div style="font-size:13px;color:#555">${fmtDay(_d(days[0]))} – ${fmtDay(_d(days[6]))}</div></div>`;
  h+=`<div class="sched-bar"><div class="sched-nav"><button class="iconbtn" onclick="repWeek(-1)"><i class="ti ti-chevron-left"></i></button><button class="iconbtn" onclick="repWeek(1)"><i class="ti ti-chevron-right"></i></button><button class="btn" style="width:auto" onclick="repWeek(0)">This week</button></div><div style="font-size:18px;font-weight:600;flex:1">${fmtDay(_d(days[0]))} – ${fmtDay(_d(days[6]))}</div><button class="btn no-print" style="width:auto" onclick="window.print()"><i class="ti ti-printer"></i> Print / PDF</button></div>`;
  const card=(lbl,val,sub,col)=>`<div class="card" style="padding:14px 16px;flex:1;min-width:130px"><div class="faint" style="font-size:11.5px;text-transform:uppercase;letter-spacing:.03em;margin-bottom:4px">${lbl}</div><div style="font-size:24px;font-weight:800;line-height:1;color:${col||'var(--ink)'}">${val}</div>${sub?`<div class="faint" style="font-size:11.5px;margin-top:4px">${sub}</div>`:''}</div>`;
  h+=`<div class="row" style="gap:12px;flex-wrap:wrap;margin-bottom:6px">${card('Total hours',totHrs.toFixed(1),names.length+' people'+(opens?` · <span style="color:#B32D2D">${opens} open</span>`:''))}${isAdmin?card('Labor cost',money(totCost),burden?`incl. ${burden}% burden`:'wages'):''}${isAdmin?card('Sales',totSales?money(totSales):'—',(totActual&&totForecast)?`f'cast ${money(totForecast)} · ${svar>=0?'+':''}${svar.toFixed(0)}% vs`:(totForecast?('forecast '+money(totForecast)):'add in Schedule')):''}${isAdmin?card('Labor %',labpct!=null?labpct.toFixed(1)+'%':'—',target?('goal '+target+'%'):'',pctCol(labpct)):''}</div>`;
  if(isAdmin){
    const lyDelta=lyTotal?((totSales-lyTotal)/lyTotal*100):null;
    h+=`<div class="sec">Sales vs last year</div><div class="card" style="padding:16px"><div class="row" style="gap:18px;flex-wrap:wrap;align-items:flex-end"><div><div class="faint" style="font-size:11px;text-transform:uppercase;letter-spacing:.03em">This week</div><div style="font-size:24px;font-weight:800">${totSales?money(totSales):'—'}</div></div><div><div class="faint" style="font-size:11px;text-transform:uppercase;letter-spacing:.03em">Same week last year</div><div style="font-size:20px;font-weight:700;color:var(--muted)">${lyTotal?money(lyTotal):'—'}</div></div>${lyDelta!=null?`<div style="font-size:17px;font-weight:800;color:${lyDelta>=0?'#1B7B3F':'#B32D2D'}">${lyDelta>=0?'▲':'▼'} ${Math.abs(lyDelta).toFixed(1)}% ${lyDelta>=0?'up':'down'}</div>`:`<div class="faint" style="font-size:12.5px">No sales recorded for this week last year yet.</div>`}</div></div>`;
    const dWA=days.filter(iso=>actual[iso]>0);
    if(dWA.length){ let beat=0,miss=0,worst=null; dWA.forEach(iso=>{ const f=forecast[iso]||0, a=actual[iso]||0; if(!f)return; const vp=(a-f)/f*100; if(vp>=0)beat++;else miss++; if(worst===null||vp<worst.vp) worst={iso,vp,f,a}; });
      h+=`<div class="sec">Forecast accuracy</div><div class="card" style="padding:16px"><div style="font-size:13.5px">Hit or beat forecast on <b style="color:#1B7B3F">${beat}</b> ${beat===1?'day':'days'}, missed on <b style="color:#B32D2D">${miss}</b>.</div>${(worst&&worst.vp<0)?`<div class="faint" style="font-size:12.5px;margin-top:8px">Biggest miss: <b>${_d(worst.iso).toLocaleDateString(undefined,{weekday:'long'})}</b> came in at ${money(worst.a)} vs ${money(worst.f)} forecast (${worst.vp.toFixed(0)}%).${worst.vp<-10?' Worth a look — staffing, weather, or a slow daypart.':''}</div>`:''}</div>`;
    }
    h+=`<div class="sec">By day</div><div class="card" style="padding:6px 4px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="color:var(--muted)"><th style="text-align:left;padding:6px 10px">Day</th><th style="text-align:right;padding:6px 6px">Hrs</th><th style="text-align:right;padding:6px 6px">Labor</th><th style="padding:6px 8px;width:34%"></th><th style="text-align:right;padding:6px 6px">Sales</th><th style="text-align:right;padding:6px 10px">Labor %</th></tr></thead><tbody>`+byDay.map(d=>{ const dt=_d(d.iso); const tod=d.iso===isoDate(new Date()); return `<tr style="border-top:1px solid var(--line)${tod?';background:var(--brand-soft)':''}"><td style="padding:7px 10px;font-weight:600">${dt.toLocaleDateString(undefined,{weekday:'short'})} <span class="faint" style="font-weight:400">${dt.getMonth()+1}/${dt.getDate()}</span></td><td style="text-align:right;padding:7px 6px">${d.hrs?d.hrs.toFixed(1):'—'}</td><td style="text-align:right;padding:7px 6px">${d.cost?money(d.cost):'—'}</td><td style="padding:7px 8px"><div style="height:7px;border-radius:4px;background:var(--line);overflow:hidden"><i style="display:block;height:100%;width:${Math.round(d.cost/maxDC*100)}%;background:var(--brand)"></i></div></td><td style="text-align:right;padding:7px 6px">${d.sal?money(d.sal):'—'}</td><td style="text-align:right;padding:7px 10px;font-weight:700;color:${pctCol(d.pct)}">${d.pct!=null?d.pct.toFixed(0)+'%':'—'}</td></tr>`; }).join('')+`</tbody></table></div>`; }
  if(isAdmin){ const anyPunch=Object.keys(punchedHrs).length;
    h+=`<div class="sec">Time clock vs scheduled</div>`;
    if(!anyPunch) h+=`<div class="card" style="padding:16px"><div class="faint" style="font-size:12.5px">No clock data yet. Open the <b style="color:var(--brand);cursor:pointer" onclick="go('clock')">Time Clock</b> on a tablet so people punch in — then this shows scheduled vs actual hours and what early clock‑ins / late clock‑outs are costing you.</div></div>`;
    else{ const allP=[...new Set([...names,...Object.keys(punchedHrs)])]; const rows=allP.map(n=>{ const sched=per[n]?per[n].hrs:0; const act=punchedHrs[n]||0; const diff=act-sched; return {n,sched,act,diff,cost:diff*(wage[n]||0)*bMul}; }).sort((a,b)=>b.diff-a.diff);
      const overCost=rows.filter(r=>r.diff>0.05).reduce((a,r)=>a+r.cost,0);
      h+=`<div class="card" style="padding:14px 16px;margin-bottom:10px;border-left:4px solid ${overCost>0.5?'#B32D2D':'#1B7B3F'}"><div style="font-size:13.5px">Clocking in early / out late ran <b style="color:${overCost>0.5?'#B32D2D':'#1B7B3F'}">${money(overCost)}</b> over the schedule this week.${overCost>0.5?' Tightening punches is real, recurring money.':''}</div></div>`;
      h+=`<div class="card" style="padding:6px 4px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="color:var(--muted)"><th style="text-align:left;padding:6px 10px">Person</th><th style="text-align:right;padding:6px 6px">Sched</th><th style="text-align:right;padding:6px 6px">Actual</th><th style="text-align:right;padding:6px 10px">Diff</th></tr></thead><tbody>`+rows.map(r=>`<tr style="border-top:1px solid var(--line)"><td style="padding:7px 10px;font-weight:600">${esc(dispName(r.n))}</td><td style="text-align:right;padding:7px 6px">${r.sched.toFixed(1)}</td><td style="text-align:right;padding:7px 6px">${r.act?r.act.toFixed(1):'—'}</td><td style="text-align:right;padding:7px 10px;font-weight:700;color:${r.diff>0.1?'#B32D2D':(r.diff<-0.1?'var(--muted)':'#1B7B3F')}">${r.act?(r.diff>=0?'+':'')+r.diff.toFixed(1)+'h':'—'}</td></tr>`).join('')+`</tbody></table></div>`;
    }
  }
  h+=`<div class="sec">Hours by person</div>`;
  if(!names.length) h+=`<div class="card" style="padding:22px;text-align:center"><div class="faint">No shifts scheduled this week.</div></div>`;
  else h+=`<div class="card">`+names.map(n=>{ const p=per[n]; const inits=(n||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); const ot=p.hrs>otW+1e-9; return `<div class="row" style="padding:10px 15px;border-bottom:1px solid var(--line);gap:11px"><span class="av">${esc(inits)}</span><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(dispName(n))} <span class="faint" style="font-size:11.5px;font-weight:500">${esc(posOf(n))} · ${p.dset.size}d</span>${ot?' <span class="pill" style="background:#FCEBEB;color:#B32D2D;font-size:10px;font-weight:800;padding:1px 6px">OT</span>':''}</div><div style="height:6px;border-radius:4px;background:var(--line);overflow:hidden;margin-top:5px"><i style="display:block;height:100%;width:${Math.round(p.hrs/maxPH*100)}%;background:${ot?'#B32D2D':'var(--brand)'}"></i></div></div><div style="text-align:right"><div style="font-weight:700;font-size:14px">${p.hrs.toFixed(1)}h</div>${isAdmin&&p.cost?`<div class="faint" style="font-size:12px">${money(p.cost)}</div>`:''}</div></div>`; }).join('')+`</div>`;
  v.innerHTML=h;
}
window.repWeek=function(n){ if(n===0){ state.ctx.wk=isoDate(weekStart(new Date())); } else { const base=state.ctx.wk?wkDate(state.ctx.wk):weekStart(new Date()); base.setDate(base.getDate()+n*7); state.ctx.wk=isoDate(base); } schGo('reports'); };

/* ---------- Sales KPIs (from day_sales; Toast can feed this later) ---------- */
async function vSales(v){
  if(!canSee(state.page)){ go('home'); return; }
  setTitle('Sales','Real numbers from your POS — daily, weekly, monthly');
  v.innerHTML='<div class="muted">Loading…</div>';
  const now=new Date(); const y=now.getFullYear(); const iso=d=>isoDate(d);
  const curWS=weekStart(now); const lastWS=new Date(curWS); lastWS.setDate(lastWS.getDate()-7);
  const [rh,rsh,rpay,rcov,rds]=await Promise.all([ sb.from('day_items').select('on_date,detail').eq('kind','hourly').gte('on_date',(y-1)+'-01-01').lte('on_date',iso(now)), sb.from('shifts').select('person_name,on_date,start_time,end_time').gte('on_date',isoDate(lastWS)).lte('on_date',iso(now)), sb.from('pay_rates').select('person_name,wage'), sb.from('day_items').select('detail').eq('kind','covrules').order('id',{ascending:false}).limit(1).maybeSingle(), sb.from('day_sales').select('on_date,sales').gte('on_date',(y-1)+'-01-01').lte('on_date',iso(now)) ]);
  let cov={}; try{ const cd=rcov&&rcov.data&&rcov.data.detail; cov=cd?(typeof cd==='string'?JSON.parse(cd):cd):{}; }catch(e){} const burdenMul=1+((+(cov.burdenPct)||0)/100); const goalPct=+(cov.targetPct)||0;
  const wage={}; (rpay.data||[]).forEach(p=>wage[p.person_name]=Number(p.wage)||0); const havePay=Object.keys(wage).length>0;
  const shiftsByDay={}; (rsh.data||[]).forEach(s=>{ (shiftsByDay[s.on_date]=shiftsByDay[s.on_date]||[]).push(s); });
  const map={}, byHourMap={}; (rh.data||[]).forEach(x=>{ try{ const dv=typeof x.detail==='string'?JSON.parse(x.detail||'{}'):(x.detail||{}); let t=Number(dv.total)||0; const bh=dv.byHour||null; if(!t&&bh){ t=Object.values(bh).reduce((a,b)=>a+(+b||0),0); } if(t) map[x.on_date]=t; if(bh&&Object.keys(bh).length) byHourMap[x.on_date]=bh; }catch(e){} });
  (rds.data||[]).forEach(x=>{ const s=Math.round(+x.sales||0); if(s) map[x.on_date]=Math.max(map[x.on_date]||0, s); }); /* day_sales backstops days where the hourly POS feed came in partial/broken */
  const has=Object.keys(map).length;
  const sumRange=(s,e)=>{ let t=0; Object.keys(map).forEach(k=>{ if(k>=s&&k<=e) t+=map[k]; }); return t; };
  const todayIso=iso(now); const lyToday=iso(new Date(y-1,now.getMonth(),now.getDate()));
  const mStart=iso(new Date(y,now.getMonth(),1)); const mStartLY=iso(new Date(y-1,now.getMonth(),1)); const mEndLY=iso(new Date(y-1,now.getMonth(),now.getDate()));
  const today=(todayIso in map)?map[todayIso]:null, mtd=sumRange(mStart,todayIso), ytd=sumRange(y+'-01-01',todayIso);
  const mtdLY=sumRange(mStartLY,mEndLY), ytdLY=sumRange((y-1)+'-01-01',lyToday);
  const delta=(a,b)=> b?((a-b)/b*100):null;
  const kpi=(lbl,val,d,note)=>{ const dc=d==null?'var(--muted)':(d>=0?'#1B7B3F':'#B32D2D'); const arrow=d==null?'':(d>=0?'▲':'▼'); return `<div class="card" style="padding:16px 18px;flex:1;min-width:150px"><div class="faint" style="font-size:11.5px;text-transform:uppercase;letter-spacing:.03em">${lbl}</div><div style="font-size:26px;font-weight:800;margin:3px 0">${val==null?'<span style="color:var(--faint)">—</span>':money(val)}</div><div style="font-size:12.5px;color:${dc};font-weight:600">${note||(d==null?'no last-year data':arrow+' '+Math.abs(d).toFixed(1)+'% vs last year')}</div></div>`; };
  const curDays=[]; { let dd=new Date(curWS); while(iso(dd)<=todayIso){ curDays.push(iso(dd)); dd.setDate(dd.getDate()+1); } }
  const lastDays=curDays.map(k=>{ const dd=_d(k); dd.setDate(dd.getDate()-7); return iso(dd); });
  const _lc=k=>(shiftsByDay[k]||[]).reduce((a,s)=>a+shiftHours(s)*(wage[s.person_name]||0),0)*burdenMul;
  const curSales=curDays.reduce((a,k)=>a+(map[k]||0),0), lastSales=lastDays.reduce((a,k)=>a+(map[k]||0),0);
  const curLabor=curDays.reduce((a,k)=>a+_lc(k),0), lastLabor=lastDays.reduce((a,k)=>a+_lc(k),0);
  const curLPct=(curSales&&curLabor)?(curLabor/curSales*100):null, lastLPct=(lastSales&&lastLabor)?(lastLabor/lastSales*100):null;
  const wow=lastSales?((curSales-lastSales)/lastSales*100):null;
  const pctCard=(lbl,val,sub,dc)=>`<div class="card" style="padding:16px 18px;flex:1;min-width:150px"><div class="faint" style="font-size:11.5px;text-transform:uppercase;letter-spacing:.03em">${lbl}</div><div style="font-size:26px;font-weight:800;margin:3px 0">${val==null?'<span style="color:var(--faint)">—</span>':val.toFixed(1)+'%'}</div><div style="font-size:12.5px;color:${dc||'var(--muted)'};font-weight:600">${sub}</div></div>`;
  let lpSub, lpColor='var(--muted)';
  if(curLPct==null){ lpSub=havePay?'need sales + a posted schedule':'add pay rates to see labor %'; }
  else if(goalPct){ const o=curLPct-goalPct; lpColor=o>0.5?'#B32D2D':'#1B7B3F'; lpSub='vs '+goalPct+'% goal'+(o>0.5?' — '+o.toFixed(1)+' pts over':(o<-0.5?' ✓ under':' ✓ on target')); }
  else if(lastLPct!=null){ lpColor=curLPct<=lastLPct?'#1B7B3F':'#B32D2D'; lpSub=(curLPct<=lastLPct?'▼':'▲')+' '+Math.abs(curLPct-lastLPct).toFixed(1)+' pts vs last wk'; }
  else { lpSub='this week to date'; }
  let h=`<div class="sec">This week to date</div><div class="row" style="gap:12px;flex-wrap:wrap;margin-bottom:16px">${kpi('Net sales',curSales||null,wow, wow==null?'no last-week data':((wow>=0?'▲':'▼')+' '+Math.abs(wow).toFixed(1)+'% vs last week'))}${pctCard('Labor %',curLPct,lpSub,lpColor)}${kpi('Last week (same days)',lastSales||null,null,'for comparison')}</div>`;
  h+=`<div class="sec">Vs last year</div><div class="row" style="gap:12px;flex-wrap:wrap;margin-bottom:14px">${kpi('Today',today,today!=null?delta(today,map[lyToday]):null, today==null?'syncs overnight':undefined)}${kpi('Month to date',mtd,delta(mtd,mtdLY))}${kpi('Year to date',ytd,delta(ytd,ytdLY))}</div>`;
  { const hDates=Object.keys(byHourMap).filter(k=>k<=todayIso).sort(); const hd=hDates[hDates.length-1]; if(hd){ const bh=byHourMap[hd]; const hrs=Object.keys(bh).map(Number).filter(n=>n>=0&&n<=23); if(hrs.length){ const lo=Math.min(...hrs),hi=Math.max(...hrs); const mxH=Math.max(1,...hrs.map(n=>+bh[n]||0)); const dayTot=hrs.reduce((a,n)=>a+(+bh[n]||0),0); let bars=''; for(let hh=lo;hh<=hi;hh++){ const val=+bh[hh]||0; const ph=Math.max(2,Math.round(val/mxH*110)); const lab=(hh%12||12)+(hh<12?'a':'p'); bars+=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:12px"><div title="${lab}: ${money(val)}" style="width:100%;max-width:26px;height:${ph}px;background:var(--brand);border-radius:3px 3px 0 0"></div><div class="faint" style="font-size:9px">${lab}</div></div>`; } const lbl2=hd===todayIso?'Today':_d(hd).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}); h+=`<div class="sec">${lbl2} by hour <span class="faint" style="font-weight:400;text-transform:none;letter-spacing:0">· ${money(dayTot)}</span></div><div class="card" style="padding:18px 14px;margin-bottom:4px;overflow-x:auto"><div style="display:flex;align-items:flex-end;gap:3px;height:130px;min-width:300px">${bars}</div></div>`; } } }
  if(!has){ h+=`<div class="card" style="padding:22px;text-align:center"><div class="faint">No sales synced yet. Your Toast connection loads yesterday's sales every morning.</div></div>`; v.innerHTML=h; return; }
  const view=state.ctx.salesView||'daily';
  const tab=(id,lbl)=>`<button onclick="state.ctx.salesView='${id}';vSales(document.getElementById('view'))" style="border:none;background:${view===id?'var(--brand)':'transparent'};color:${view===id?'#fff':'var(--muted)'};padding:7px 16px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer">${lbl}</button>`;
  h+=`<div style="display:inline-flex;gap:4px;padding:4px;background:var(--bg);border-radius:11px;margin-bottom:14px">${tab('daily','Daily')}${tab('weekly','Weekly')}${tab('monthly','Monthly')}</div>`;
  const fmtD=s=>_d(s).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  if(view==='daily'){
    const days=Object.keys(map).filter(k=>k<=todayIso).sort().slice(-14).reverse(); const mx=Math.max(1,...days.map(k=>map[k]));
    h+=`<div class="sec">Last 14 days</div><div class="card" style="padding:4px 2px">`+days.map(k=>`<div class="row" style="padding:10px 14px;border-bottom:1px solid var(--line);gap:12px;align-items:center"><div style="width:118px;font-size:13px;font-weight:600">${fmtD(k)}</div><div style="flex:1;height:9px;background:var(--line);border-radius:5px;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(map[k]/mx*100)}%;background:var(--brand)"></i></div><div style="width:92px;text-align:right;font-weight:700;font-size:14px">${money(map[k])}</div></div>`).join('')+`</div>`;
  } else if(view==='weekly'){
    const weeks={}; Object.keys(map).forEach(k=>{ const ws=isoDate(weekStart(_d(k))); weeks[ws]=(weeks[ws]||0)+map[k]; });
    const wk=Object.keys(weeks).filter(w=>w<=todayIso).sort().slice(-8).reverse(); const mx=Math.max(1,...wk.map(w=>weeks[w]));
    h+=`<div class="sec">Last 8 weeks</div><div class="card" style="padding:4px 2px">`+wk.map(w=>{ const we=new Date(_d(w).getTime()+6*864e5); return `<div class="row" style="padding:10px 14px;border-bottom:1px solid var(--line);gap:12px;align-items:center"><div style="width:150px;font-size:13px;font-weight:600">${_d(w).toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${we.toLocaleDateString(undefined,{month:'short',day:'numeric'})}</div><div style="flex:1;height:9px;background:var(--line);border-radius:5px;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(weeks[w]/mx*100)}%;background:var(--brand)"></i></div><div style="width:100px;text-align:right;font-weight:700;font-size:14px">${money(weeks[w])}</div></div>`; }).join('')+`</div>`;
  } else {
    const monTotals=yy=>{ const arr=Array(12).fill(0); Object.keys(map).forEach(k=>{ if(+k.slice(0,4)===yy) arr[+k.slice(5,7)-1]+=map[k]; }); return arr; };
    const tY=monTotals(y), tL=monTotals(y-1); const maxM=Math.max(1,...tY,...tL); const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    h+=`<div class="sec">Monthly — ${y} vs ${y-1}</div><div class="card" style="padding:16px"><div style="display:flex;align-items:flex-end;gap:6px;height:164px">`+tY.map((val,i)=>{ const hY=Math.round(val/maxM*118), hL=Math.round(tL[i]/maxM*118); return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><div style="font-size:8.5px;color:var(--muted);height:12px">${val?('$'+Math.round(val/1000)+'k'):''}</div><div style="display:flex;align-items:flex-end;gap:2px;height:122px"><div title="${y-1} ${MN[i]}: ${money(tL[i])}" style="width:7px;height:${hL}px;background:var(--line2);border-radius:2px 2px 0 0"></div><div title="${y} ${MN[i]}: ${money(val)}" style="width:9px;height:${hY}px;background:var(--brand);border-radius:2px 2px 0 0"></div></div><div class="faint" style="font-size:9.5px">${MN[i][0]}</div></div>`; }).join('')+`</div><div class="row" style="gap:14px;margin-top:10px;font-size:11.5px"><span style="display:inline-flex;align-items:center;gap:5px"><span style="width:9px;height:9px;background:var(--brand);border-radius:2px"></span>${y}</span><span style="display:inline-flex;align-items:center;gap:5px"><span style="width:9px;height:9px;background:var(--line2);border-radius:2px"></span>${y-1}</span></div></div>`;
  }
  h+=`<div class="faint" style="font-size:12px;margin-top:14px;padding:10px 12px;background:var(--bg);border-radius:8px">Live from your Toast POS — yesterday's sales load automatically each morning. Today fills in overnight. ${canSee('saleshist')?`&middot; <b style="color:var(--brand);cursor:pointer" onclick="go('saleshist')">Update hourly history</b>`:''}</div>`;
  v.innerHTML=h;
}

/* ---------- Sales history: import hourly POS sales (powers last-year-by-hour) ---------- */
async function vSalesHist(v){
  if(!canSee('saleshist')){ go('home'); return; }
  setTitle('Sales history',"Load last year's hourly sales so the scheduler sees the real curve");
  v.innerHTML='<div class="muted">Loading…</div>';
  const r=await sb.from('day_items').select('on_date').eq('kind','hourly');
  const dates=(r.data||[]).map(x=>x.on_date).filter(Boolean).sort();
  const have=dates.length, first=dates[0], last=dates[dates.length-1];
  let h=`<div class="card" style="padding:16px 18px;margin-bottom:16px"><div style="font-weight:700;font-size:15px">Hourly sales on file</div>${have?`<div style="font-size:13.5px;margin-top:5px">${have} day${have>1?'s':''} loaded · ${esc(fmtDay(_d(first)))} → ${esc(fmtDay(_d(last)))}</div>`:`<div class="faint" style="font-size:13px;margin-top:5px">Nothing loaded yet — import a POS export below.</div>`}<div class="faint" style="font-size:12px;margin-top:6px">This powers the “last year, this day, by hour” panel on the Schedule and holiday comparisons. Once your POS is connected live, this stays current automatically.</div></div>`;
  h+=`<div class="card" style="padding:18px"><div style="font-weight:700;font-size:15px;margin-bottom:4px">Import hourly sales</div><div class="faint" style="font-size:12.5px;margin-bottom:12px">Export an <b>hourly sales</b> report from your POS as a CSV (Toast: Reports → Sales, export), then drop it here. You'll pick which columns are the date, the hour, and the sales — I'll figure out the rest.</div><input type="file" id="hsFile" accept=".csv,text/csv" style="font-size:13px" onchange="hsPick(this)"/><div id="hsMap" style="margin-top:14px"></div></div>`;
  v.innerHTML=h;
}
function _csvParse(text){ const rows=[]; let i=0,field='',row=[],inQ=false; const pushF=()=>{row.push(field);field='';}; const pushR=()=>{rows.push(row);row=[];}; while(i<text.length){ const c=text[i]; if(inQ){ if(c==='"'){ if(text[i+1]==='"'){field+='"';i++;} else inQ=false; } else field+=c; } else { if(c==='"')inQ=true; else if(c===',')pushF(); else if(c==='\n'){pushF();pushR();} else if(c==='\r'){} else field+=c; } i++; } if(field.length||row.length){pushF();pushR();} return rows.filter(r=>r.length&&r.some(x=>String(x).trim()!=='')); }
window.hsPick=function(inp){ const f=inp.files&&inp.files[0]; if(!f)return; const rd=new FileReader(); rd.onload=()=>{ const rows=_csvParse(String(rd.result||'')); if(rows.length<2){ alert('Could not read rows from that file.'); return; } window._hsHead=rows[0]; window._hsRows=rows.slice(1); const opts=window._hsHead.map((c,i)=>`<option value="${i}">${esc(c||('Column '+(i+1)))}</option>`).join(''); const guess=kw=>{ const idx=window._hsHead.findIndex(c=>kw.test(String(c||'').toLowerCase())); return idx<0?0:idx; }; const sel=(id,lbl,g)=>`<div><div class="faint" style="font-size:11px;margin-bottom:2px">${lbl}</div><select id="${id}" style="padding:8px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit">${opts}</select></div>`; const m=document.getElementById('hsMap'); m.innerHTML=`<div class="faint" style="font-size:12px;margin-bottom:8px">${window._hsRows.length} rows found. Map the columns:</div><div class="row" style="gap:10px;flex-wrap:wrap">${sel('hsDate','Date')}${sel('hsHour','Hour / time')}${sel('hsSales','Net sales')}</div><div class="row" style="margin-top:14px"><button class="btn pri" style="width:auto" onclick="hsImport()">Import</button><span class="muted" id="hsMsg" style="font-size:13px;margin-left:10px"></span></div>`; document.getElementById('hsDate').value=guess(/date|day/); document.getElementById('hsHour').value=guess(/hour|time/); document.getElementById('hsSales').value=guess(/net|sales|amount|total|revenue/); }; rd.readAsText(f); };
window.hsImport=async function(){ if(!window._hsRows)return; const di=+document.getElementById('hsDate').value, hi=+document.getElementById('hsHour').value, si=+document.getElementById('hsSales').value; const parseHour=v=>{ v=String(v||'').trim(); let m=v.match(/(\d{1,2})\s*(am|pm)/i); if(m){ let hh=+m[1]%12; if(/pm/i.test(m[2]))hh+=12; return hh; } m=v.match(/(\d{1,2}):(\d{2})/); if(m) return +m[1]; m=v.match(/^(\d{1,2})$/); return m?+m[1]:null; }; const parseDate=v=>{ v=String(v||'').trim(); const d=new Date(v); return isNaN(d)?null:isoDate(d); }; const byDate={}; let n=0; window._hsRows.forEach(r=>{ const iso=parseDate(r[di]); const hr=parseHour(r[hi]); const sal=Number(String(r[si]||'').replace(/[^0-9.\-]/g,''))||0; if(iso&&hr!=null&&hr>=0&&hr<=23){ (byDate[iso]=byDate[iso]||{})[hr]=(byDate[iso][hr]||0)+sal; n++; } }); const dates=Object.keys(byDate); const msg=document.getElementById('hsMsg'); if(!dates.length){ if(msg)msg.textContent='No valid rows — check the column mapping.'; return; } if(msg)msg.textContent='Importing '+dates.length+' days…'; let _ok=0,_fail=0,_firstErr='';
  for(const iso of dates){ const total=Object.values(byDate[iso]).reduce((a,b)=>a+b,0);
    const d=await sb.from('day_items').delete().eq('kind','hourly').eq('on_date',iso);
    if(d&&d.error){ _fail++; if(!_firstErr)_firstErr=d.error.message; continue; }
    const i2=await sb.from('day_items').insert({kind:'hourly',on_date:iso,title:iso,detail:JSON.stringify({byHour:byDate[iso],total}),created_by:state.user.id});
    if(i2&&i2.error){ _fail++; if(!_firstErr)_firstErr=i2.error.message; } else { _ok++; }
    if(msg&&(_ok+_fail)%25===0) msg.textContent='Importing… '+(_ok+_fail)+' of '+dates.length;
  }
  if(msg){ if(_fail){ msg.style.color='#B32D2D'; msg.textContent='Imported '+_ok+' days, '+_fail+' failed. First error: '+_firstErr; } else { msg.style.color=''; msg.textContent='Done ✓ '+_ok+' days from '+n+' rows.'; } }
  if(_fail) return; window._hsRows=null; setTimeout(()=>go('saleshist'),1400); };

/* ---------- Checklists: open/close/clean, check-off + photo proof ---------- */
const CL_DEFAULTS=[
  {title:'Opening',items:['Unlock & disarm alarm','Lights & music on','Espresso machine & grinders on','Check & log cooler/freezer temps','Pull, date & stock bagels','Brew first batch of coffee','Stock register, count drawer','Fresh sanitizer buckets','Restrooms stocked & clean','Flip the Open sign']},
  {title:'Closing',items:['Count & reconcile drawer','Clean espresso group heads & wands','Break down & clean grinders','Wipe all prep surfaces','Sweep & mop floors','Take out trash & recycling','Bag & log day-olds','Set alarm & lock up']},
  {title:'Cleaning',items:['Steam wands & group heads','Grinder hoppers & burrs','Cooler handles & gaskets','Sink & drains','Restroom deep clean','Trash bins washed','Bagel boards & tools']}
];
async function vChecklists(v){
  const isAdmin=state.profile&&state.profile.role==='admin';
  setTitle('Checklists','Open, close & clean — checked off, with photo proof');
  v.innerHTML='<div class="muted">Loading…</div>';
  const d0=state.ctx.clDate||isoDate(new Date());
  let rt=await sb.from('day_items').select('*').eq('kind','cltmpl').order('created_at');
  if(!(rt.data||[]).length && isAdmin){ for(const t of CL_DEFAULTS){ await sb.from('day_items').insert({kind:'cltmpl',title:t.title,on_date:null,detail:JSON.stringify({items:t.items}),created_by:state.user.id}); } rt=await sb.from('day_items').select('*').eq('kind','cltmpl').order('created_at'); }
  const tmpls=(rt.data||[]).map(x=>{ let d={}; try{d=JSON.parse(x.detail||'{}');}catch(e){} return {id:x.id,title:x.title,items:Array.isArray(d.items)?d.items:[]}; });
  const rr=await sb.from('day_items').select('*').eq('kind','clrun').eq('on_date',d0);
  const runs={}; (rr.data||[]).forEach(x=>{ let d={}; try{d=JSON.parse(x.detail||'{}');}catch(e){} runs[x.title]={id:x.id,checks:d.checks||{}}; });
  window._clRuns=runs; window._clDate=d0; window._clTmpls=tmpls;
  const dt=_d(d0);
  let h=`<div class="row" style="justify-content:flex-end;margin-bottom:6px">${isAdmin?`<button class="btn" style="width:auto" onclick="clAddTmpl()"><i class="ti ti-plus"></i> New list</button>`:''}</div>`;
  if(!tmpls.length) h+=`<div class="card" style="padding:24px;text-align:center"><div class="faint">No checklists yet.${isAdmin?' Tap “New list” to add one.':''}</div></div>`;
  const clTab=(state.ctx.clTab&&tmpls.some(t=>String(t.id)===String(state.ctx.clTab)))?String(state.ctx.clTab):(tmpls[0]&&String(tmpls[0].id));
  if(tmpls.length>1) h+=`<div style="display:flex;gap:6px;overflow-x:auto;padding:2px 0 14px">`+tmpls.map(t=>{ const on=String(t.id)===clTab; const rr2=runs[String(t.id)]||{checks:{}}; const dn2=t.items.filter((_,i)=>rr2.checks[i]&&rr2.checks[i].done).length; return `<button onclick="state.ctx.clTab='${t.id}';vChecklists(document.getElementById('view'))" style="flex:none;border:1px solid ${on?'var(--brand)':'var(--line2)'};background:${on?'var(--brand)':'var(--card)'};color:${on?'#fff':'var(--ink)'};padding:8px 16px;border-radius:999px;font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap">${esc(t.title)}${dn2?` <span style="opacity:.75">${dn2}/${t.items.length}</span>`:''}</button>`; }).join('')+`</div>`;
  tmpls.filter(t=>String(t.id)===clTab).forEach(t=>{ const run=runs[String(t.id)]||{checks:{}}; const checks=run.checks; const done=t.items.filter((_,i)=>checks[i]&&checks[i].done).length; const pct=t.items.length?Math.round(done/t.items.length*100):0;
    h+=`<div class="card" style="padding:0;margin-bottom:16px;overflow:hidden"><div style="padding:13px 16px;display:flex;align-items:center;gap:10px"><div style="font-weight:700;font-size:15px;flex:1">${esc(t.title)}</div><div class="faint" style="font-size:12px">${done}/${t.items.length}</div><button onclick="clPrint(${t.id})" class="faint no-print" style="border:none;background:none;cursor:pointer;font-size:15px" title="Print this section"><i class="ti ti-printer"></i></button>${isAdmin?`<button onclick="clEdit(${t.id})" class="faint" style="border:none;background:none;cursor:pointer;font-size:13px">Edit</button>`:''}</div><div style="height:6px;background:var(--line)"><i style="display:block;height:100%;width:${pct}%;background:${pct===100?'#1B7B3F':'var(--brand)'}"></i></div>`;
    t.items.forEach((it,i)=>{ const c=checks[i]||{}; h+=`<div style="display:flex;align-items:flex-start;gap:11px;padding:11px 16px;border-top:1px solid var(--line)"><input type="checkbox" ${c.done?'checked':''} onclick="clCheck(${t.id},${i},this.checked)" style="width:19px;height:19px;margin-top:1px;cursor:pointer"/><div style="flex:1;min-width:0"><div style="font-size:14px;${c.done?'color:var(--muted);text-decoration:line-through':''}">${esc(it)}</div>${c.done&&c.by?`<div class="faint" style="font-size:11px;margin-top:2px">✓ ${esc(c.by)}${c.at?' · '+timeAgo(c.at):''}</div>`:''}</div>${c.photo?`<img src="${c.photo}" onclick="clPhotoView(${t.id},${i})" style="width:38px;height:38px;object-fit:cover;border-radius:7px;cursor:pointer"/>`:`<button onclick="clPhotoPick(${t.id},${i})" title="Add photo proof" style="border:1px solid var(--line2);background:var(--card);border-radius:7px;width:38px;height:38px;cursor:pointer;color:var(--muted)"><i class="ti ti-camera"></i></button>`}</div>`; });
    h+=`</div>`;
  });
  h+=`<input type="file" id="clFile" accept="image/*" capture="environment" style="display:none"/>`;
  v.innerHTML=h;
}
window.clDay=function(n){ const cur=state.ctx.clDate?new Date(state.ctx.clDate+'T00:00'):new Date(); if(n===0) state.ctx.clDate=isoDate(new Date()); else { cur.setDate(cur.getDate()+n); state.ctx.clDate=isoDate(cur); } go('checklists'); };
async function _clSaveRun(tid){ const run=window._clRuns[String(tid)]||(window._clRuns[String(tid)]={checks:{}}); const detail=JSON.stringify({checks:run.checks}); if(run.id){ await sb.from('day_items').update({detail}).eq('id',run.id); } else { const ins=await sb.from('day_items').insert({kind:'clrun',title:String(tid),on_date:window._clDate,detail,created_by:state.user.id}).select(); if(ins.data&&ins.data[0]) run.id=ins.data[0].id; } }
window.clCheck=async function(tid,idx,checked){ const run=window._clRuns[String(tid)]||(window._clRuns[String(tid)]={checks:{}}); run.checks[idx]=Object.assign(run.checks[idx]||{},{done:checked,by:checked?((state.profile.name||'').split(' ')[0]):null,at:checked?new Date().toISOString():null}); await _clSaveRun(tid); go('checklists'); };
window.clPhotoPick=function(tid,idx){ const f=document.getElementById('clFile'); if(!f)return; f.onchange=async()=>{ const file=f.files[0]; if(!file)return; const img=new Image(); img.onload=async()=>{ const sc=Math.min(1,400/Math.max(img.width,img.height)); const cnv=document.createElement('canvas'); cnv.width=Math.round(img.width*sc); cnv.height=Math.round(img.height*sc); cnv.getContext('2d').drawImage(img,0,0,cnv.width,cnv.height); let url=''; try{ url=cnv.toDataURL('image/jpeg',0.6); }catch(e){} URL.revokeObjectURL(img.src); if(!url)return; const run=window._clRuns[String(tid)]||(window._clRuns[String(tid)]={checks:{}}); run.checks[idx]=Object.assign(run.checks[idx]||{},{photo:url}); await _clSaveRun(tid); go('checklists'); }; img.src=URL.createObjectURL(file); }; f.value=''; f.click(); };
window.clPhotoView=function(tid,idx){ const c=(window._clRuns[String(tid)]||{checks:{}}).checks[idx]||{}; if(!c.photo)return; const m=document.createElement('div'); m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px'; m.onclick=()=>m.remove(); m.innerHTML=`<img src="${c.photo}" style="max-width:100%;max-height:100%;border-radius:10px"/>`; document.body.appendChild(m); };
window.clAddTmpl=async function(){ const name=prompt('Name this checklist (e.g. Weekly Deep Clean)'); if(!name)return; await sb.from('day_items').insert({kind:'cltmpl',title:name.trim(),on_date:null,detail:JSON.stringify({items:[]}),created_by:state.user.id}); go('checklists'); };
window.clPrint=function(tid){
  const t=(window._clTmpls||[]).find(x=>String(x.id)===String(tid)); if(!t){ alert('Open the checklist first, then print.'); return; }
  const rows=t.items.map(it=>`<tr><td style="width:24px;height:32px;border:1.6px solid #111"></td><td style="padding:5px 12px;font-size:15px;border-bottom:1px solid #ddd">${esc(it)}</td></tr>`).join('');
  const win=window.open('','_blank','width=720,height=920'); if(!win){ alert('Allow pop-ups for this site to print the checklist.'); return; }
  win.document.write(`<html><head><title>${esc(t.title)} checklist</title><meta charset="utf-8"></head><body style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111;margin:0;padding:34px 38px"><div style="border-bottom:3px solid #4A9CAD;padding-bottom:12px;margin-bottom:16px"><div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#4A9CAD;font-weight:800">Sidewalk &middot; Checklist</div><div style="font-size:28px;font-weight:800;margin-top:2px">${esc(t.title)}</div></div><div style="margin-bottom:16px;font-size:14px">Date: <span style="display:inline-block;border-bottom:1px solid #111;width:150px">&nbsp;</span>&nbsp;&nbsp;&nbsp; Completed by: <span style="display:inline-block;border-bottom:1px solid #111;width:200px">&nbsp;</span></div><table style="width:100%;border-collapse:collapse">${rows}</table><div style="margin-top:26px;font-size:11px;color:#888;letter-spacing:.5px">SIDEWALK Coffee + Bagel &middot; Post-shift verification</div></body></html>`);
  win.document.close(); win.focus(); setTimeout(function(){ try{win.print();}catch(e){} }, 350);
};
window.clEdit=async function(tid){ const r=await sb.from('day_items').select('*').eq('id',tid).maybeSingle(); let d={}; try{d=JSON.parse((r.data&&r.data.detail)||'{}');}catch(e){} const items=(d.items||[]).join('\n'); const m=document.createElement('div'); m.id='clem'; m.style.cssText='position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center'; m.onclick=e=>{if(e.target===m)m.remove();}; m.innerHTML=`<div style="background:var(--card);width:100%;max-width:460px;border-radius:16px 16px 0 0;padding:20px 20px 26px"><div style="font-weight:700;font-size:16px;margin-bottom:4px">Edit “${esc((r.data||{}).title||'')}”</div><div class="faint" style="font-size:12px;margin-bottom:10px">One task per line.</div><textarea id="clItems" style="width:100%;min-height:220px;padding:11px;border:1px solid var(--line2);border-radius:9px;font-size:14px;font-family:inherit;color:var(--ink);background:var(--card)">${esc(items)}</textarea><div class="row" style="gap:8px;margin-top:14px"><button class="btn" style="width:auto;color:#A32D2D;border-color:#F0C9C9" onclick="clDelTmpl(${tid})">Delete list</button><button class="btn" style="width:auto;margin-left:auto" onclick="document.getElementById('clem').remove()">Cancel</button><button class="btn pri" style="width:auto" onclick="clSaveTmpl(${tid})">Save</button></div></div>`; document.body.appendChild(m); };
window.clSaveTmpl=async function(tid){ const items=((document.getElementById('clItems')||{}).value||'').split('\n').map(s=>s.trim()).filter(Boolean); await sb.from('day_items').update({detail:JSON.stringify({items})}).eq('id',tid); const m=document.getElementById('clem'); if(m)m.remove(); go('checklists'); };
window.clDelTmpl=async function(tid){ if(!confirm('Delete this checklist entirely?'))return; await sb.from('day_items').delete().eq('id',tid); const m=document.getElementById('clem'); if(m)m.remove(); go('checklists'); };

/* ---------- Time Clock — shared station; tap your name to clock in/out ---------- */
async function vClock(v){
  if(!canSee(state.page)){ go('home'); return; }
  setTitle('Time Clock','Tap your name to clock in or out');
  v.innerHTML='<div class="muted">Loading…</div>';
  const today=isoDate(new Date());
  const [rp,rsh]=await Promise.all([ sb.from('day_items').select('*').eq('kind','punch').eq('on_date',today), sb.from('shifts').select('*').eq('on_date',today) ]);
  await loadPositions(); await loadArchived();
  const punch={}; (rp.data||[]).forEach(x=>{ let d={}; try{d=JSON.parse(x.detail||'{}');}catch(e){} punch[x.title]={id:x.id,sessions:d.sessions||[]}; });
  window._punch=punch; window._punchDate=today;
  const schBy={}; (rsh.data||[]).forEach(s=>{ if(s.person_name&&s.person_name!=='__OPEN__') (schBy[s.person_name]=schBy[s.person_name]||[]).push(s); });
  const roster=rosterNames().sort((a,b)=>{const ra=POS_ORDER.indexOf(posOf(a)),rb=POS_ORDER.indexOf(posOf(b));return (ra<0?99:ra)-(rb<0?99:rb)||a.localeCompare(b);});
  const now=Date.now();
  const isOn=p=>{ const s=(punch[p]||{}).sessions||[]; return s.length&&!s[s.length-1].out; };
  const elapsed=p=>{ const s=(punch[p]||{}).sessions||[]; let ms=0; s.forEach(x=>{ const a=x.in?new Date(x.in).getTime():0; const b=x.out?new Date(x.out).getTime():now; if(a)ms+=b-a; }); return ms; };
  const fmtDur=ms=>{ const m=Math.max(0,Math.round(ms/60000)); return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m'; };
  const onCount=roster.filter(isOn).length;
  let h=`<div class="card" style="padding:14px 16px;margin-bottom:14px"><span style="font-size:22px;font-weight:800;color:var(--brand)">${onCount}</span> <span class="faint">on the clock</span> <span class="faint">· ${_d(today).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</span><div class="faint" style="font-size:11.5px;margin-top:5px">Leave this open on a shared tablet at the counter. Everyone taps their own name.</div></div>`;
  if(!roster.length) h+=`<div class="card" style="padding:22px;text-align:center"><div class="faint">No team yet.</div></div>`;
  else h+=`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">`+roster.map(p=>{ const on=isOn(p); const sch=(schBy[p]||[])[0]; const el=elapsed(p); const nm=esc(p).replace(/'/g,"\\'"); return `<div class="card" style="padding:14px;border-left:4px solid ${on?'#1B7B3F':'var(--line2)'}"><div style="font-weight:700;font-size:15px">${esc(p.split(' ')[0])}</div><div class="faint" style="font-size:12px">${esc(posOf(p))}${sch?` · sched ${fmtClock(sch.start_time)}–${fmtClock(sch.end_time)}`:' · not scheduled'}</div><div style="font-size:12.5px;margin:7px 0;color:${on?'#1B7B3F':'var(--muted)'};font-weight:600">${on?'● On the clock · '+fmtDur(el):(el>0?'Worked '+fmtDur(el)+' today':'Not clocked in')}</div><button class="btn ${on?'':'pri'}" style="width:100%" onclick="clock${on?'Out':'In'}('${nm}')">${on?'Clock out':'Clock in'}</button></div>`; }).join('')+`</div>`;
  v.innerHTML=h;
}
window.clockIn=async function(p){ const punch=window._punch||{}, today=window._punchDate; let rec=punch[p]; const sess=(rec&&rec.sessions)||[]; if(sess.length&&!sess[sess.length-1].out) return go('clock'); sess.push({in:new Date().toISOString(),out:null}); if(rec&&rec.id){ await sb.from('day_items').update({detail:JSON.stringify({sessions:sess})}).eq('id',rec.id); } else { const ins=await sb.from('day_items').insert({kind:'punch',on_date:today,title:p,detail:JSON.stringify({sessions:sess}),created_by:state.user.id}).select(); punch[p]={id:ins.data&&ins.data[0]&&ins.data[0].id,sessions:sess}; } go('clock'); };
window.clockOut=async function(p){ const punch=window._punch||{}; const rec=punch[p]; if(!rec)return; const sess=rec.sessions||[]; if(sess.length&&!sess[sess.length-1].out) sess[sess.length-1].out=new Date().toISOString(); await sb.from('day_items').update({detail:JSON.stringify({sessions:sess})}).eq('id',rec.id); go('clock'); };

/* ---------- Pay rates — private, leadership-only page ---------- */
async function vPay(v){
  if(!canSee(state.page)){ go('home'); return; }
  setTitle('Pay rates','Leadership only — hourly wages that power labor cost');
  v.innerHTML='<div class="muted">Loading…</div>';
  await loadPositions(); await loadArchived();
  const rpay=await sb.from('pay_rates').select('*');
  const wage={}; (rpay.data||[]).forEach(p=>wage[p.person_name]=Number(p.wage)||0);
  const team=rosterNames().sort((a,b)=>{const ra=POS_ORDER.indexOf(posOf(a)),rb=POS_ORDER.indexOf(posOf(b));return (ra<0?99:ra)-(rb<0?99:rb)||a.localeCompare(b);});
  let h=`<div class="card" style="padding:13px 15px;margin-bottom:14px;display:flex;gap:10px;align-items:center"><i class="ti ti-lock" style="color:var(--brand);font-size:18px"></i><div class="faint" style="font-size:12.5px">Only leadership sees this page. Wages stay off the schedule so they're never visible to the floor.</div></div>`;
  if(!team.length) h+=`<div class="card" style="padding:22px;text-align:center"><div class="faint">No team members yet.</div></div>`;
  else h+=`<div class="card">`+team.map(p=>`<div class="row" style="gap:8px;padding:9px 15px;border-bottom:1px solid var(--line)"><div style="flex:1;font-size:14px;font-weight:600">${esc(p.split(' ')[0])} <span class="faint" style="font-weight:400;font-size:12px">${esc(posOf(p))}</span></div><span class="faint">$</span><input type="number" min="0" step="0.25" value="${wage[p]||''}" placeholder="0.00" onchange="setWagePage('${esc(p).replace(/'/g,'')}',this.value)" style="width:96px;padding:8px 10px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink)"/><span class="faint" style="font-size:12px">/hr</span></div>`).join('')+`</div>`;
  v.innerHTML=h;
}
window.setWagePage=function(name,w){ clearTimeout(window._wageTmr2); window._wageTmr2=setTimeout(()=>{ sb.from('pay_rates').upsert({person_name:name, wage:Number(w)||0, updated_at:new Date().toISOString()}).then(()=>{}); },500); };

/* ---------- Who's on: live timeline + time off + closed days ---------- */
async function schWhoson(v){
  v.innerHTML='<div class="muted">Loading…</div>';
  const todayIso=isoDate(new Date()); const now=new Date(); const nowH=now.getHours()+now.getMinutes()/60;
  const [rsh,rto]=await Promise.all([ sb.from('shifts').select('*').eq('on_date',todayIso).order('start_time'), sb.from('time_off').select('*').eq('status','approved') ]);
  await loadPositions();
  const shifts=(rsh.data||[]).filter(s=>s.person_name&&s.person_name!=='__OPEN__');
  let mn=24,mx=0; shifts.forEach(s=>{ const a=parseClock(s.start_time),b=parseClock(s.end_time); if(a!=null&&a<mn)mn=a; if(b!=null&&b>mx)mx=b; });
  if(mn>=mx){ mn=6; mx=15; } mn=Math.floor(mn); mx=Math.ceil(mx); const span=Math.max(1,mx-mn);
  const onNow=shifts.filter(s=>{const a=parseClock(s.start_time),b=parseClock(s.end_time); return a!=null&&b!=null&&nowH>=a&&nowH<b;});
  const next=shifts.filter(s=>{const a=parseClock(s.start_time); return a!=null&&a>nowH;}).slice(0,3);
  let h=`<div class="sec">On the floor — ${_d(todayIso).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</div>`;
  h+=`<div class="card" style="padding:14px 16px;margin-bottom:14px"><span style="font-size:22px;font-weight:800;color:var(--brand)">${onNow.length}</span> <span class="faint">on the clock right now</span>${onNow.length?` — ${onNow.map(s=>esc(s.person_name.split(' ')[0])).join(', ')}`:''}${next.length?`<div class="faint" style="font-size:12.5px;margin-top:6px">Next in: ${next.map(s=>esc(s.person_name.split(' ')[0])+' @'+fmtClock(s.start_time)).join(' · ')}</div>`:''}</div>`;
  if(!shifts.length) h+=`<div class="card" style="padding:22px;text-align:center"><div class="faint">No one scheduled today.</div></div>`;
  else{ const marks=[]; for(let hh=mn;hh<=mx;hh++) marks.push(hh);
    h+=`<div class="card" style="padding:14px 12px 16px;overflow-x:auto"><div style="min-width:520px;position:relative"><div style="position:relative;height:16px;margin-left:96px;border-bottom:1px solid var(--line)">`+marks.map(hh=>`<span style="position:absolute;left:${(hh-mn)/span*100}%;font-size:10px;color:var(--muted);transform:translateX(-50%)">${((hh%12)||12)}${hh<12?'a':'p'}</span>`).join('')+`</div>`;
    shifts.forEach(s=>{ const a=parseClock(s.start_time),b=parseClock(s.end_time); const L=Math.max(0,(a-mn)/span*100), W=Math.max(2,(b-a)/span*100); const isNow=nowH>=a&&nowH<b; const c=POSCOL(posOf(s.person_name)); h+=`<div style="display:flex;align-items:center;height:30px;margin-top:5px"><div style="width:92px;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 14px 0 2px">${esc(s.person_name.split(' ')[0])}</div><div style="position:relative;flex:1;height:22px;background:var(--bg);border-radius:5px"><div style="position:absolute;left:${L}%;width:${W}%;height:100%;border-radius:5px;background:${isNow?c:c+'59'};display:flex;align-items:center;padding:0 6px;font-size:10px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden">${fmtClock(s.start_time)}–${fmtClock(s.end_time)}</div></div></div>`; });
    if(nowH>=mn&&nowH<=mx){ h+=`<div style="position:absolute;top:16px;bottom:0;left:calc(96px + ${(nowH-mn)/span*100}% * (100% - 96px) / 100);width:2px;background:#DC2626;pointer-events:none"></div>`; }
    h+=`</div></div>`;
  }
  const horizon=isoDate((()=>{const d=new Date();d.setDate(d.getDate()+14);return d;})());
  const to=(rto.data||[]).filter(t=>(t.end_date||t.start_date)>=todayIso && t.start_date<=horizon).sort((a,b)=>a.start_date.localeCompare(b.start_date));
  h+=`<div class="sec">Time off — next 2 weeks</div>`;
  if(!to.length) h+=`<div class="card" style="padding:16px;text-align:center"><div class="faint">No approved time off coming up.</div></div>`;
  else h+=`<div class="card">`+to.map(t=>`<div class="row" style="padding:10px 15px;border-bottom:1px solid var(--line);gap:10px"><i class="ti ti-plane" style="color:var(--brand)"></i><div style="flex:1"><div style="font-weight:600;font-size:13.5px">${esc(t.person_name)}</div><div class="faint" style="font-size:12px">${esc(fmtDay(_d(t.start_date)))}${t.end_date&&t.end_date!==t.start_date?' – '+esc(fmtDay(_d(t.end_date))):''}${t.reason?' · '+esc(t.reason):''}</div></div></div>`).join('')+`</div>`;
  const y=new Date().getFullYear(); const hols=usHolidays(y).concat(usHolidays(y+1)).filter(x=>x.closed && x.date>=todayIso && x.date<=horizon);
  h+=`<div class="sec">Closed / blocked days — next 2 weeks</div>`;
  if(!hols.length) h+=`<div class="card" style="padding:16px;text-align:center"><div class="faint">No closures in the next two weeks.</div></div>`;
  else h+=`<div class="card">`+hols.map(x=>`<div class="row" style="padding:10px 15px;border-bottom:1px solid var(--line);gap:10px"><i class="ti ti-lock" style="color:#B32D2D"></i><div style="flex:1"><div style="font-weight:600;font-size:13.5px">${esc(x.name)}</div><div class="faint" style="font-size:12px">${esc(fmtDay(_d(x.date)))} · closed</div></div></div>`).join('')+`</div>`;
  v.innerHTML=h;
}

/* ---------- Schedule Setup: one page, in order, self-checking ---------- */
async function vSetup(v){
  if(!canSee(state.page)){ go('home'); return; }
  setTitle('Setup','Your step-by-step guide — do these in order to go live');
  v.innerHTML='<div class="muted">Loading…</div>';
  const [rav,rprof,rpay,rcov,rsh,rds,rpo]=await Promise.all([
    sb.from('availability').select('person_name').limit(1),
    sb.from('day_items').select('title,detail').eq('kind','profile'),
    sb.from('pay_rates').select('person_name').limit(1),
    sb.from('day_items').select('detail').eq('kind','covrules').order('id',{ascending:false}).limit(1).maybeSingle(),
    sb.from('shifts').select('id').limit(1),
    sb.from('day_sales').select('on_date').limit(1),
    sb.from('posts').select('id').limit(1)
  ]);
  await loadPositions(); await loadArchived();
  const roster=rosterNames();
  const profs={}; (rprof.data||[]).forEach(x=>{try{profs[x.title]=JSON.parse(x.detail||'{}');}catch(e){}});
  const anyRoles=roster.some(n=>Array.isArray((profs[n]||{}).roles)&&profs[n].roles.length);
  const anyRules=roster.some(n=>{const p=profs[n]||{};return p.priority||p.maxHrs||p.minHrs||p.maxDays||(Array.isArray(p.daysOff)&&p.daysOff.length)||p.timePref;});
  let cov={}; try{ cov=JSON.parse((rcov.data&&rcov.data.detail)||'{}'); }catch(e){}
  const hasMatrix=cov.matrix&&cov.matrix.blocks&&cov.matrix.blocks.length;
  const hasReq=(Array.isArray(cov.roleReqs)&&cov.roleReqs.length)||(Array.isArray(cov.blackouts)&&cov.blackouts.length);
  const lg=(state.settings&&state.settings.logo_url)||''; const hasBrand=!!(lg && lg.indexOf('data:image/svg+xml')<0);
  const assigned=(Object.keys(state.trackAssign||{}).length>0)||roster.length>0;
  const hasSales=!!(rds.data&&rds.data.length); const hasPosts=!!(rpo.data&&rpo.data.length);
  const sched=[
    {t:'Set availability',d:'When each person can work. The draft never schedules outside it.',ok:!!(rav.data&&rav.data.length),go:"go('schedule',{stab:'availability'})",cta:'Set availability'},
    {t:'Set roles & skill levels',d:'Which stations each person can work, and how strong (Learning → Expert).',ok:anyRoles,go:"go('team',{ttab:'skills'})",cta:'Skills grid'},
    {t:'Set who can open & close',d:'Only trusted leaders should open or close — set it on the Skills grid.',ok:anyRoles,go:"go('team',{ttab:'skills'})",cta:'Skills grid'},
    {t:'Set each person’s rules',d:'Priority, max hours, max days, usual days off, and morning/closing fit.',ok:anyRules,go:"go('team',{ttab:'roster'})",cta:'Open Team'},
    {t:'Enter pay rates',d:'Powers your labor $ and labor % everywhere.',ok:!!(rpay.data&&rpay.data.length),go:"go('pay')",cta:'Add pay'},
    {t:'Build your coverage matrix',d:'How many people you need at each time of day — the draft matches this curve.',ok:hasMatrix,go:"go('schedule',{stab:'schedule'})",cta:'Build matrix'},
    {t:'Add required roles & protected windows',d:'Opening leader, a baker at 6, no clock-outs mid-rush.',ok:hasReq,go:"go('schedule',{stab:'schedule'})",cta:'Set requirements'},
    {t:'Set your labor % goal',d:'The draft keeps you at or under your target.',ok:!!cov.targetPct,inline:'labor'},
    {t:'Run auto-draft',d:'Everything above comes together into a near-final schedule you just tweak.',ok:!!(rsh.data&&rsh.data.length),go:"go('schedule',{stab:'schedule'})",cta:'Go to Schedule'}
  ];
  const schedDone=sched.every(x=>x.ok);
  const sections=[
    {t:'Make it your own',d:'Name your academy and add your logo and colors — make it feel like your restaurant.',ok:hasBrand,go:"go('settings')",cta:'Open Settings'},
    {t:'Add your team',d:'Add everyone who works for you so they can log in, learn, and get scheduled.',ok:roster.length>0,go:"go('onboarding')",cta:'Add people'},
    {t:'Turn on training',d:'Your leadership courses are already loaded. Assign who takes which — or let everyone start.',ok:assigned,go:"go('build')",cta:'Open Training'},
    {t:'Build your schedule',d:'The big one. Set availability, skills, rules and coverage — then auto-draft writes the schedule for you.',sub:true,ok:schedDone},
    {t:'Connect your sales',d:'Link your POS so labor % and the forecast run on real numbers.',ok:hasSales,go:"go('sales')",cta:'Open Sales'},
    {t:'Start the conversation',d:'Post a welcome in Community so your team has one place to talk.',ok:hasPosts,go:"go('community')",cta:'Open Community'}
  ];
  const secDone=sections.filter(s=>s.ok).length; const firstOpenSec=sections.findIndex(s=>!s.ok);
  let h=`<div class="card" style="padding:0;overflow:hidden;margin-bottom:18px"><div style="padding:15px 18px;border-bottom:1px solid var(--line)"><div style="font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin-bottom:8px">✦ Get set up</div><div style="height:6px;border-radius:4px;background:var(--line);overflow:hidden"><i style="display:block;height:100%;width:${Math.round(secDone/sections.length*100)}%;background:${secDone===sections.length?'#1B7B3F':'var(--brand)'}"></i></div><div class="faint" style="font-size:12px;margin-top:6px">${secDone} of ${sections.length} done · you can change anything later</div></div>`;
  sections.forEach((s,i)=>{ const next=i===firstOpenSec;
    h+=`<div style="display:flex;gap:12px;align-items:center;padding:13px 18px;border-top:1px solid var(--line)"><div style="width:26px;height:26px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;${s.ok?'background:#1B7B3F;color:#fff':'background:var(--card);color:var(--brand);border:1.5px solid var(--brand-line)'}">${s.ok?'✓':(i+1)}</div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:14.5px">${s.t}${next?` <span style="font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--brand);background:var(--brand-soft);padding:1px 7px;border-radius:5px;margin-left:5px">Start here</span>`:''}</div><div class="faint" style="font-size:12.5px;margin-top:2px;line-height:1.45">${s.d}</div></div>${s.sub?'':`<button class="btn${next?' pri':''}" style="width:auto;flex:none;padding:6px 13px;font-size:13px" onclick="${s.go}">${s.cta}</button>`}</div>`;
    if(s.sub){ const firstOpenSub=sched.findIndex(x=>!x.ok);
      h+=`<div style="padding:2px 18px 8px 56px">`+sched.map((ss,j)=>{ const sn=j===firstOpenSub; return `<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)"><div style="width:20px;height:20px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;${ss.ok?'background:#1B7B3F;color:#fff':'background:var(--card);color:var(--brand);border:1px solid var(--brand-line)'}">${ss.ok?'✓':(j+1)}</div><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">${ss.t}</div><div class="faint" style="font-size:11.5px">${ss.d}</div></div>${ss.inline==='labor'?`<div class="row" style="gap:5px;align-items:center;flex:none"><input id="setupGoal" type="number" min="0" max="100" step="0.5" value="${cov.targetPct||''}" placeholder="28" style="width:52px;text-align:center;padding:6px;border:1px solid var(--line2);border-radius:7px;background:var(--card);color:var(--ink);font-family:inherit"/><span class="faint">%</span><button class="btn pri" style="width:auto;padding:6px 12px" onclick="setupSaveGoal()">Save</button></div>`:`<button class="btn${sn?' pri':''}" style="width:auto;flex:none;padding:5px 11px;font-size:12px" onclick="${ss.go}">${ss.cta}</button>`}</div>`; }).join('')+`</div>`;
    }
  });
  v.innerHTML=h;
}
window.setupSaveGoal=async function(){ const val=+((document.getElementById('setupGoal')||{}).value)||0; const r=await sb.from('day_items').select('detail').eq('kind','covrules').order('id',{ascending:false}).limit(1).maybeSingle(); let cd={}; try{cd=JSON.parse((r.data&&r.data.detail)||'{}');}catch(e){} cd.targetPct=val>0?val:''; await sb.from('day_items').delete().eq('kind','covrules'); await sb.from('day_items').insert({kind:'covrules',title:'coverage',on_date:null,detail:JSON.stringify(cd),created_by:state.user.id}); go('setup'); };

async function teamCerts(v){
  v.innerHTML='<div class="muted">Loading…</div>';
  try{ await loadProfiles(); await loadPositions(); await loadArchived(); }catch(e){}
  const people=Object.keys(window._posMap||{}).filter(n=>!isArchived(n)).sort();
  const r=await sb.from('certifications').select('*').order('expires_on',{ascending:true});
  if(r&&r.error){ v.innerHTML='<div class="card" style="padding:20px"><div class="muted">Couldn’t load certifications: '+esc(r.error.message)+'</div></div>'; return; }
  const certs=r.data||[];
  const TYPES=['Food Handler card','Alcohol server (TIPS/ServSafe)','ServSafe Manager','Health card','Minor work permit','Other'];
  const opt=a=>a.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  let h=`<div class="card" style="padding:15px 17px;margin-bottom:16px"><div style="font-weight:800;font-size:15px;margin-bottom:3px">Certifications &amp; documents</div><div class="muted" style="font-size:12.5px;margin-bottom:12px;line-height:1.5">Track food-handler cards, alcohol-server certs, health cards and work permits — sorted so what’s expiring soonest is up top.</div><div class="row" style="gap:8px;flex-wrap:wrap"><select id="ctPerson" style="padding:9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;min-width:150px"><option value="">Who…</option>${opt(people)}</select><select id="ctType" style="padding:9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit">${opt(TYPES)}</select><input id="ctExp" type="date" title="Expires on" style="padding:9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit"/><input id="ctNote" placeholder="Note (optional)" onkeydown="if(event.key==='Enter')addCert()" style="flex:1;min-width:120px;padding:9px 11px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit"/><button class="btn pri" style="width:auto" onclick="addCert()">Add</button></div><div id="ctmsg" class="faint" style="font-size:12px;margin-top:7px"></div></div>`;
  if(!certs.length){ h+=`<div class="card" style="padding:28px;text-align:center"><div class="muted" style="font-size:14px">Nothing logged yet. Add a card above and you’ll get a heads-up before it expires.</div></div>`; }
  else { h+=certs.map(c=>{ const d=c.expires_on?new Date(c.expires_on+'T00:00:00'):null; const days=d?Math.ceil((d.getTime()-Date.now())/864e5):null; let bg,fg,lbl; if(!d){ bg='var(--bg)';fg='var(--muted)';lbl='No expiry set'; } else if(days<0){ bg='#FCEBEB';fg='#A32D2D';lbl='Expired '+(-days)+' day'+(-days===1?'':'s')+' ago'; } else if(days<=30){ bg='#FFF3DF';fg='#8A5A00';lbl='Expires in '+days+' day'+(days===1?'':'s'); } else { bg='#EEF6E6';fg='#3B6D11';lbl='Valid — '+d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }
    return `<div class="card" style="padding:12px 15px;margin-bottom:9px"><div class="row" style="gap:10px;align-items:center"><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:14px">${esc(c.person_name)}</div><div class="muted" style="font-size:13px">${esc(c.cert_type)}${c.note?' · '+esc(c.note):''}</div></div><span class="pill" style="background:${bg};color:${fg};font-size:11px;font-weight:800;padding:3px 10px;white-space:nowrap">${lbl}</span><button onclick="delCert('${c.id}')" title="Remove" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:15px">×</button></div></div>`; }).join(''); }
  v.innerHTML=h;
}
window.addCert=async function(){ const person=((document.getElementById('ctPerson')||{}).value||'').trim(); const type=(document.getElementById('ctType')||{}).value||'Other'; const exp=(document.getElementById('ctExp')||{}).value||null; const note=((document.getElementById('ctNote')||{}).value||'').trim()||null; const m=document.getElementById('ctmsg'); if(!person){ if(m)m.textContent='Pick who it belongs to.'; return; } const r=await sb.from('certifications').insert({person_name:person,cert_type:type,expires_on:exp,note,created_by:state.user.id}); if(r&&r.error){ if(m)m.textContent='Could not save: '+r.error.message; return; } teamCerts(document.getElementById('teambody')||document.getElementById('view')); };
window.delCert=async function(id){ if(!confirm('Remove this certification record?'))return; await sb.from('certifications').delete().eq('id',id); teamCerts(document.getElementById('teambody')||document.getElementById('view')); };
/* ---------- Areas of responsibility (the ownership map / org chart) ----------
   An area = a part of the business with ONE point of contact. Ownership is who you go to,
   not who does it alone, and it never restricts anyone's access. Everyone sees the map;
   only the owner edits it. Stored as day_items kind 'area', detail {owner, icon, order, desc}. */
const AREA_STARTER=[
  {name:'Culture', icon:'ti-confetti', desc:'Birthdays, anniversaries, celebrations, team feel'},
  {name:'Facilities', icon:'ti-tools', desc:'Repairs, upkeep, the building running right'},
  {name:'Training', icon:'ti-school', desc:'Onboarding, skill sign-offs, growing the team'},
  {name:'Baking', icon:'ti-bread', desc:'Rolling, bake, pastry, prep standards'},
  {name:'Service', icon:'ti-coffee', desc:'Register, bar, expo, the guest experience'}
];
const AREA_TREE_CSS=`.ocwrap{overflow-x:auto;padding:8px 2px 6px}
@media(min-width:721px){.ocwrap{width:calc(100vw - 300px)}}
.octree{display:inline-block;min-width:100%;text-align:center}
.octree ul{display:flex;justify-content:center;padding:22px 0 0 0;position:relative;margin:0;list-style:none}
.octree li{list-style:none;position:relative;padding:22px 9px 0;text-align:center}
.octree li::before,.octree li::after{content:'';position:absolute;top:0;right:50%;border-top:2px solid var(--line2);width:50%;height:22px}
.octree li::after{right:auto;left:50%;border-left:2px solid var(--line2)}
.octree li:only-child::before,.octree li:only-child::after{display:none}
.octree li:only-child{padding-top:0}
.octree li:first-child::before,.octree li:last-child::after{border:0 none}
.octree li:last-child::before{border-right:2px solid var(--line2);border-radius:0 6px 0 0}
.octree li:first-child::after{border-radius:6px 0 0 0}
.octree ul ul::before{content:'';position:absolute;top:0;left:50%;border-left:2px solid var(--line2);width:0;height:22px}
.octree .node{display:inline-block;vertical-align:top}
.octree .onode{display:inline-flex;gap:10px;justify-content:center;flex-wrap:wrap}
.octree .ochip{display:flex;align-items:center;gap:8px;background:var(--brand-soft);border:1px solid var(--brand);border-radius:12px;padding:9px 13px}
.octree .onm{font-weight:700;font-size:13.5px;line-height:1.15}
.octree .orole{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.octree .cnode{background:var(--card);border:1px solid var(--line2);border-radius:12px;padding:11px 14px;min-width:152px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.octree .chead{display:flex;align-items:center;gap:7px;justify-content:center;font-weight:700;font-size:14px;margin-bottom:8px}
.octree .chead i{color:var(--brand);font-size:17px}
.octree .pline{display:inline-flex;align-items:center;gap:7px;justify-content:center}
.octree .pnm{font-weight:600;font-size:12.5px;line-height:1.15}
.octree .prole{font-size:10.5px;color:var(--muted)}
.octree .pnone{color:var(--muted);font-style:italic;font-size:12px}
.octree .hnode{display:inline-flex;align-items:center;gap:7px;background:var(--card);border:1px solid var(--line2);border-radius:10px;padding:7px 11px;min-width:118px}
.octree .hnm{font-weight:600;font-size:12px;line-height:1.15}
.octree .hrole{font-size:10px;color:var(--muted)}`;
async function loadAreas(){ const r=await sb.from('day_items').select('*').eq('kind','area'); return (r.data||[]).map(x=>{ let d={}; try{ d=typeof x.detail==='string'?JSON.parse(x.detail||'{}'):(x.detail||{}); }catch(e){} return {id:x.id, name:x.title, owner:d.owner||'', icon:d.icon||'ti-flag', desc:d.desc||'', order:+d.order||0, helpers:Array.isArray(d.helpers)?d.helpers:[]}; }).sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name)); }
async function teamAreas(v){
  const isAdmin=state.profile&&state.profile.role==='admin';
  await loadPositions(); await loadArchived();
  const areas=await loadAreas();
  const roster=Object.keys(window._posMap||{}).filter(n=>n&&!isArchived(n)&&posOf(n)!=='Owner').sort((a,b)=>a.localeCompare(b));
  const owners=Object.keys(window._posMap||{}).filter(n=>posOf(n)==='Owner'&&!isArchived(n));
  const av=n=>`<span style="width:30px;height:30px;border-radius:50%;flex:none;background:var(--brand-soft);color:var(--brand);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${esc((n||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase())}</span>`;
  const mgmt=isAdmin && window._areaMgmt;
  const fullTree=isAdmin||myRank()>=2; // leaders see the whole tree; team members see just the key positions
  const avSm=n=>`<span style="width:24px;height:24px;border-radius:50%;flex:none;background:var(--brand-soft);color:var(--brand);display:inline-flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:700">${esc((n||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase())}</span>`;
  let h=`<div class="row" style="justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:14px"><div class="faint" style="font-size:12.5px;line-height:1.5;flex:1">${fullTree?'Who to go to for what, and who helps. Owner at the top, each part of the business below it, and the people helping under their point of contact.':'Who to go to for what. Owner at the top, and the point of contact for each part of the business.'} Nobody loses any access; this is just the map.</div>${isAdmin?`<button class="btn" style="width:auto;flex:none;white-space:nowrap" onclick="window._areaMgmt=${mgmt?'false':'true'};window._areaEdit=null;areaRerender()">${mgmt?'<i class="ti ti-check"></i> Done':'<i class="ti ti-adjustments-horizontal"></i> Edit'}</button>`:''}</div>`;
  // management view shows the owner bar; the clean chart draws its own owner box
  if(mgmt && owners.length){ h+=`<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px">`+owners.map(o=>`<div class="card" style="padding:12px 15px;display:flex;align-items:center;gap:10px;border:1px solid var(--brand);background:var(--brand-soft)">${av(o)}<div><div style="font-weight:700;font-size:14px">${esc(o)}</div><div class="faint" style="font-size:11.5px;text-transform:uppercase;letter-spacing:.06em">Owner</div></div></div>`).join('')+`</div><div style="width:2px;height:14px;background:var(--line2);margin:0 0 6px 24px"></div>`; }
  if(!areas.length){
    if(isAdmin){ h+=`<div class="card" style="padding:20px 22px"><div style="font-weight:700;font-size:15px;margin-bottom:5px">Set up who owns what</div><div class="faint" style="font-size:13px;line-height:1.55;margin-bottom:14px">Give each part of the business one point of contact. The starter set drops in five common ones, Culture, Facilities, Training, Baking and Service, that you can rename, reassign or remove. Or build your own from scratch.</div><button class="btn pri" style="width:auto" onclick="areaAddStarter()"><i class="ti ti-wand"></i> Use the starter set</button> <button class="btn" style="width:auto" onclick="areaAdd()"><i class="ti ti-plus"></i> Build my own</button></div>`; }
    else { h+=`<div class="card" style="padding:22px;text-align:center"><div class="faint">Nothing set up here yet.</div></div>`; }
    v.innerHTML=h; return;
  }
  if(!mgmt){
    const ownerBox=`<div class="onode">${(owners.length?owners:['Owner']).map(o=>`<div class="ochip">${avSm(o)}<div style="text-align:left"><div class="onm">${esc(o)}</div><div class="orole">Owner</div></div></div>`).join('')}</div>`;
    const cats=areas.map(a=>{
      const poc=a.owner?`<div class="pline">${avSm(a.owner)}<div style="text-align:left"><div class="pnm">${esc(a.owner)}</div><div class="prole">${esc(posOf(a.owner)||'')}</div></div></div>`:`<div class="pline pnone">Point of contact TBD</div>`;
      const hh=a.helpers||[];
      const helpers=(fullTree&&hh.length)?`<ul>${hh.map(hn=>`<li><div class="node hnode">${avSm(hn)}<div style="text-align:left"><div class="hnm">${esc(hn)}</div><div class="hrole">${esc(posOf(hn)||'')}</div></div></div></li>`).join('')}</ul>`:'';
      return `<li><div class="node cnode"><div class="chead"><i class="ti ${esc(a.icon)}"></i><span>${esc(a.name)}</span></div>${poc}</div>${helpers}</li>`;
    }).join('');
    h+=`<style>${AREA_TREE_CSS}</style><div class="ocwrap"><div class="octree"><ul><li><div class="node">${ownerBox}</div><ul>${cats}</ul></li></ul></div></div>`;
    v.innerHTML=h; return;
  }
  const editing=window._areaEdit;
  h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">`+areas.map(a=>{
    if(isAdmin && editing===a.id){
      return `<div class="card" style="padding:15px 16px;border:1px solid var(--brand)"><div class="faint" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Name</div><input id="aeN_${a.id}" value="${esc(a.name)}" style="width:100%;padding:8px 9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;font-size:14px;font-weight:600;box-sizing:border-box"><div class="faint" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin:10px 0 6px">Description</div><textarea id="aeD_${a.id}" rows="2" placeholder="What this covers" style="width:100%;padding:8px 9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;font-size:13px;box-sizing:border-box;resize:vertical">${esc(a.desc)}</textarea><div class="row" style="gap:8px;margin-top:10px"><button class="btn pri" style="width:auto" onclick="areaEditSave(${a.id})">Save</button><button class="btn" style="width:auto" onclick="areaEditCancel()">Cancel</button></div></div>`;
    }
    const node=a.owner?`<div class="row" style="gap:8px;align-items:center">${av(a.owner)}<div style="min-width:0"><div style="font-weight:600;font-size:13.5px">${esc(a.owner)}</div><div class="faint" style="font-size:11.5px">${esc(posOf(a.owner)||'')}</div></div></div>`:`<div class="faint" style="font-size:12.5px">No point of contact yet</div>`;
    const sel=isAdmin?`<select onchange="areaSetOwner(${a.id},this.value)" style="width:100%;margin-top:8px;padding:7px 9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--muted);font-family:inherit;font-size:12.5px"><option value="">${a.owner?'Change point of contact…':'Assign a point of contact…'}</option>${roster.map(n=>`<option value="${esc(n)}"${a.owner===n?' selected':''}>${esc(n)} &middot; ${esc(posOf(n))}</option>`).join('')}</select>`:'';
    const hlp=a.helpers||[];
    const helpersHtml=hlp.length?`<div style="margin-top:9px;margin-left:13px;border-left:2px solid var(--line2);padding-left:12px;display:flex;flex-direction:column;gap:8px">`+hlp.map((hn,hi)=>`<div class="row" style="gap:8px;align-items:center">${av(hn)}<div style="min-width:0;flex:1"><div style="font-weight:600;font-size:12.5px">${esc(hn)}</div><div class="faint" style="font-size:11px">${esc(posOf(hn)||'')}</div></div>${isAdmin?`<button onclick="areaRemoveHelper(${a.id},${hi})" title="Remove" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:13px"><i class="ti ti-x"></i></button>`:''}</div>`).join('')+`</div>`:'';
    const addHelp=isAdmin?`<select onchange="areaAddHelper(${a.id},this.value);this.value='';" style="width:100%;margin-top:8px;padding:7px 9px;border:1px dashed var(--line2);border-radius:8px;background:var(--card);color:var(--muted);font-family:inherit;font-size:12.5px"><option value="">+ Add someone who helps…</option>${roster.filter(n=>n!==a.owner&&!hlp.includes(n)).map(n=>`<option value="${esc(n)}">${esc(n)} &middot; ${esc(posOf(n))}</option>`).join('')}</select>`:'';
    const showHelping=hlp.length||isAdmin;
    const helping=showHelping?`<div class="faint" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;margin:12px 0 2px">Helping</div>${helpersHtml||(isAdmin?'<div class="faint" style="font-size:12px;margin-top:4px">No one yet</div>':'')}${addHelp}`:'';
    const ctrls=isAdmin?`<button onclick="areaEditStart(${a.id})" title="Edit name & description" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:15px"><i class="ti ti-pencil"></i></button><button onclick="areaDelete(${a.id})" title="Remove" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:15px"><i class="ti ti-trash"></i></button>`:'';
    return `<div class="card" style="padding:15px 16px"><div class="row" style="align-items:center;gap:9px"><i class="ti ${esc(a.icon)}" style="font-size:19px;color:var(--brand)"></i><div style="font-weight:700;font-size:15px;flex:1;min-width:0">${esc(a.name)}</div>${ctrls}</div>${a.desc?`<div class="faint" style="font-size:12px;line-height:1.45;margin-top:4px">${esc(a.desc)}</div>`:''}<div style="margin-top:11px;padding-top:11px;border-top:1px dashed var(--line2)"><div class="faint" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Point of contact</div>${node}${sel}${helping}</div></div>`;
  }).join('')+`</div>`;
  if(isAdmin) h+=`<div style="margin-top:14px"><button class="btn" style="width:auto" onclick="areaAdd()"><i class="ti ti-plus"></i> Add one</button></div>`;
  v.innerHTML=h;
}
function areaRerender(){ teamAreas(document.getElementById('teambody')||document.getElementById('view')); }
window.areaAddStarter=async function(){
  const existing=(await loadAreas()).map(a=>a.name.toLowerCase());
  let i=0;
  for(const a of AREA_STARTER){ if(existing.includes(a.name.toLowerCase())) continue; await sb.from('day_items').insert({kind:'area',title:a.name,on_date:null,detail:JSON.stringify({owner:'',icon:a.icon,desc:a.desc,order:i++}),created_by:state.user.id}); }
  areaRerender();
};
window.areaAdd=async function(){ const name=prompt('Name it (e.g. Catering, Merch, Cleanliness)'); if(!name||!name.trim())return; const n=(await loadAreas()).length; const r=await sb.from('day_items').insert({kind:'area',title:name.trim(),on_date:null,detail:JSON.stringify({owner:'',icon:'ti-flag',order:n}),created_by:state.user.id}); if(r&&r.error)return; areaRerender(); };
window.areaSetOwner=async function(id,owner){ const r=await sb.from('day_items').select('detail').eq('id',id).maybeSingle(); let d={}; try{ d=JSON.parse((r.data&&r.data.detail)||'{}'); }catch(e){} d.owner=owner; if(Array.isArray(d.helpers)) d.helpers=d.helpers.filter(n=>n!==owner); const u=await sb.from('day_items').update({detail:JSON.stringify(d)}).eq('id',id); if(u&&u.error)return; areaRerender(); };
window.areaAddHelper=async function(id,name){ if(!name)return; const r=await sb.from('day_items').select('detail').eq('id',id).maybeSingle(); let d={}; try{ d=JSON.parse((r.data&&r.data.detail)||'{}'); }catch(e){} d.helpers=Array.isArray(d.helpers)?d.helpers:[]; if(name===d.owner||d.helpers.includes(name))return; d.helpers.push(name); const u=await sb.from('day_items').update({detail:JSON.stringify(d)}).eq('id',id); if(u&&u.error)return; areaRerender(); };
window.areaRemoveHelper=async function(id,idx){ const r=await sb.from('day_items').select('detail').eq('id',id).maybeSingle(); let d={}; try{ d=JSON.parse((r.data&&r.data.detail)||'{}'); }catch(e){} d.helpers=Array.isArray(d.helpers)?d.helpers:[]; d.helpers.splice(idx,1); const u=await sb.from('day_items').update({detail:JSON.stringify(d)}).eq('id',id); if(u&&u.error)return; areaRerender(); };
window.areaDelete=async function(id){ if(!confirm('Remove this from the map? Nobody loses any access; it just comes off the map.'))return; await sb.from('day_items').delete().eq('id',id); areaRerender(); };
window.areaEditStart=function(id){ window._areaEdit=id; areaRerender(); };
window.areaEditCancel=function(){ window._areaEdit=null; areaRerender(); };
window.areaEditSave=async function(id){ const nm=((document.getElementById('aeN_'+id)||{}).value||'').trim(); const ds=((document.getElementById('aeD_'+id)||{}).value||'').trim(); if(!nm){ alert('Give it a name.'); return; } const r=await sb.from('day_items').select('detail').eq('id',id).maybeSingle(); let d={}; try{ d=JSON.parse((r.data&&r.data.detail)||'{}'); }catch(e){} d.desc=ds; const u=await sb.from('day_items').update({title:nm,detail:JSON.stringify(d)}).eq('id',id); if(u&&u.error)return; window._areaEdit=null; areaRerender(); };
async function vOwnership(v){
  if(!canSee('ownership')){ go('home'); return; }
  setTitle('Who owns what','Who to go to for what, and who helps');
  teamAreas(v);
}
async function vTeam(v){
  if(!canSee(state.page)){ go('home'); return; }
  let tab=state.ctx.ttab; if(!tab){ try{ tab=localStorage.getItem('teamTab'); }catch(e){} } if(!tab) tab='roster'; state.ctx.ttab=tab;
  setTitle('Team','Your people — profiles, progress & former team');
  const seg=(k,l)=>`<button onclick="state.ctx.ttab='${k}';try{localStorage.setItem('teamTab','${k}')}catch(e){};vTeam(document.getElementById('view'))" style="padding:7px 15px;font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:inherit;background:${tab===k?'var(--brand)':'var(--card)'};color:${tab===k?'#fff':'var(--muted)'}">${l}</button>`;
  v.innerHTML=`<div style="display:inline-flex;border:1px solid var(--line2);border-radius:9px;overflow:hidden;margin-bottom:18px;flex-wrap:wrap">${seg('roster','Roster')}${seg('skills','Skills')}${seg('certs','Certifications')}${seg('progress','Academy progress')}${canCorract()?seg('corract','Corrective actions'):''}${seg('former','Former team')}</div><div id="teambody"><div class="muted">Loading…</div></div>`;
  const body=document.getElementById('teambody');
  if(tab==='corract'){ teamCorract(body); return; }
  if(tab==='progress'){ vSummary(body); return; }
  if(tab==='former'){ teamFormer(body); return; }
  if(tab==='skills'){ vTeamSkills(body); return; }
  if(tab==='certs'){ teamCerts(body); return; }
  teamRoster(body);
}