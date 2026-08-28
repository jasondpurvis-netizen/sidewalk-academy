
async function vTeamSkills(v){
  v.innerHTML='<div class="muted">Loading…</div>';
  await loadProfiles(); await loadPositions(); await loadArchived();
  const base=(state.settings&&Array.isArray(state.settings.stations)&&state.settings.stations.length)?state.settings.stations:['Bake / Prep','Register','Bar / Espresso'];
  const extra=new Set(); Object.keys(window._profiles||{}).forEach(n=>{ ((window._profiles[n]||{}).roles||[]).forEach(r=>{ if(base.indexOf(r)<0) extra.add(r); }); });
  const cols=[...base, ...extra];
  const people=Object.keys(window._posMap||{}).filter(n=>posOf(n)!=='Owner'&&!isArchived(n)).sort((a,b)=>{ const ra=POS_ORDER.indexOf(posOf(a)),rb=POS_ORDER.indexOf(posOf(b)); return (ra<0?99:ra)-(rb<0?99:rb) || a.localeCompare(b); });
  const isLeaderX=n=>['Owner','Manager','Supervisor'].includes(posOf(n));
  const canO=n=>{ const c=(window._profiles[n]||{}).caps; return (c&&typeof c==='object')?(('open'in c)?!!c.open:isLeaderX(n)):isLeaderX(n); };
  const canC=n=>{ const c=(window._profiles[n]||{}).caps; return (c&&typeof c==='object')?(('close'in c)?!!c.close:isLeaderX(n)):isLeaderX(n); };
  const hasRole=(n,st)=>((window._profiles[n]||{}).roles||[]).indexOf(st)>=0;
  const lvlOf=(n,st)=>{ const sl=(window._profiles[n]||{}).skillLevels; if(sl&&typeof sl==='object'&&(st in sl)) return +sl[st]||0; return hasRole(n,st)?2:0; }; // existing binary "trained" shows as Solid until you set a level
  const jn=x=>String(x).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const box=(chk,h)=>`<input type="checkbox" ${chk?'checked':''} onclick="${h}" style="width:17px;height:17px;cursor:pointer"/>`;
  const _LV=[['—','var(--muted)','var(--card)'],['L','#fff','#B7791F'],['S','#fff','var(--brand)'],['E','#fff','#1B7B3F']];
  const pill=(lvl,h)=>`<button onclick="${h}" title="Click to change: not trained → Learning → Solid → Expert" style="width:27px;height:24px;border-radius:6px;border:1px solid var(--line2);cursor:pointer;font-size:11px;font-weight:800;color:${_LV[lvl][1]};background:${_LV[lvl][2]}">${_LV[lvl][0]}</button>`;
  const vth=(t,col)=>`<th style="padding:6px 7px;font-size:11px;font-weight:700;color:${col||'var(--muted)'};white-space:nowrap;writing-mode:vertical-rl;transform:rotate(180deg);height:78px;vertical-align:bottom">${esc(t)}</th>`;
  let h=`<div class="faint" style="font-size:12.5px;margin-bottom:8px">Who can work what, and how well. Open &amp; close are built‑in yes/no; each station cycles when you tap it — it saves as you go. The number under each column is how many people can work it — a <span style="color:var(--amber)">low count</span> is a cross‑training gap.</div><div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;margin-bottom:12px">${[['—','var(--muted)','var(--card)','not trained'],['L','#fff','#B7791F','Learning'],['S','#fff','var(--brand)','Solid — runs it alone'],['E','#fff','#1B7B3F','Expert — your go‑to']].map(x=>`<span style="display:inline-flex;align-items:center;gap:5px"><span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:18px;border-radius:5px;border:1px solid var(--line2);font-size:10px;font-weight:800;color:${x[1]};background:${x[2]}">${x[0]}</span> ${x[3]}</span>`).join('')}</div><div style="overflow-x:auto;border:1px solid var(--line);border-radius:10px"><table style="border-collapse:collapse;font-size:12.5px;width:100%"><thead><tr><th style="padding:6px 10px;text-align:left;position:sticky;left:0;background:var(--card);z-index:2"></th>${vth('Open','var(--brand)')}${vth('Close','var(--brand)')}${cols.map(c=>vth(c)).join('')}</tr></thead><tbody>`;
  people.forEach(n=>{ h+=`<tr style="border-top:1px solid var(--line)"><td style="padding:7px 10px;position:sticky;left:0;background:var(--card);white-space:nowrap;z-index:1"><span style="font-weight:600">${esc(n.split(' ')[0])}</span> <span class="faint" style="font-size:11px">${esc(posOf(n))}</span></td><td style="text-align:center;padding:5px">${box(canO(n),`toggleCap('${jn(n)}','open',this.checked)`)}</td><td style="text-align:center;padding:5px">${box(canC(n),`toggleCap('${jn(n)}','close',this.checked)`)}</td>${cols.map(st=>`<td style="text-align:center;padding:4px">${pill(lvlOf(n,st),`cycleLevel('${jn(n)}','${jn(st)}',this)`)}</td>`).join('')}</tr>`; });
  const cnt=c=>`<td style="text-align:center;font-size:12px;font-weight:800;color:${c<=1?'var(--amber)':'var(--muted)'}">${c}</td>`;
  h+=`<tr style="border-top:2px solid var(--line2);background:var(--bg)"><td style="padding:7px 10px;position:sticky;left:0;background:var(--bg);font-size:11px;color:var(--muted);font-weight:700">Trained</td>${cnt(people.filter(canO).length)}${cnt(people.filter(canC).length)}${cols.map(st=>cnt(people.filter(n=>lvlOf(n,st)>=1).length)).join('')}</tr></tbody></table></div>`;
  v.innerHTML=h;
}
window._roleSaveTmr={};
function _saveProfileNow(name){
  /* This deletes the stored profile and writes whatever is in memory. If memory holds a
     partial object -- a screen that only ever loaded someone's stations, say, or code that
     created a blank profile to add one field to -- everything else on that person is
     destroyed: hours, wage, contact details, emergency contact. That is how a co-owner's
     profile ended up containing nothing but a station list.
     Now it reads the stored record first and merges over it, so a screen that knows about
     one field can only ever change that field. Keys explicitly set to undefined or null in
     memory are still removed, so deleting a value on purpose still works. */
  clearTimeout(window._roleSaveTmr[name]);
  window._roleSaveTmr[name]=setTimeout(async()=>{
    const d=window._profiles[name]; if(!d)return;
    try{
      const cur=await sb.from('day_items').select('id,detail').eq('kind','profile').eq('title',name).order('id',{ascending:false}).limit(1).maybeSingle();
      let stored={}; try{ stored=JSON.parse((cur.data&&cur.data.detail)||'{}')||{}; }catch(e){ stored={}; }
      const merged=Object.assign({}, stored, d);
      await sb.from('day_items').delete().eq('kind','profile').eq('title',name);
      await sb.from('day_items').insert({kind:'profile',title:name,on_date:null,detail:JSON.stringify(merged),created_by:state.user.id});
      window._profiles[name]=merged;
    }catch(e){}
  },500);
}
window.toggleRole=function(name,station,checked){ const d=window._profiles[name]||(window._profiles[name]={}); const roles=Array.isArray(d.roles)?d.roles:(d.roles=[]); const i=roles.indexOf(station); if(checked&&i<0) roles.push(station); if(!checked&&i>=0) roles.splice(i,1); _saveProfileNow(name); const c=document.querySelector('#teambody'); };
window.cycleLevel=function(name,station,btn){ const d=window._profiles[name]||(window._profiles[name]={}); const sl=(d.skillLevels&&typeof d.skillLevels==='object')?d.skillLevels:(d.skillLevels={}); const roles=Array.isArray(d.roles)?d.roles:(d.roles=[]); let cur=(station in sl)?(+sl[station]||0):(roles.indexOf(station)>=0?2:0); const nx=(cur+1)%4; if(nx===0) delete sl[station]; else sl[station]=nx; const i=roles.indexOf(station); if(nx>=1&&i<0) roles.push(station); if(nx===0&&i>=0) roles.splice(i,1); _saveProfileNow(name); if(btn){ const LV=[['—','var(--muted)','var(--card)'],['L','#fff','#B7791F'],['S','#fff','var(--brand)'],['E','#fff','#1B7B3F']]; btn.textContent=LV[nx][0]; btn.style.color=LV[nx][1]; btn.style.background=LV[nx][2]; } };
window.toggleCap=function(name,cap,checked){ const d=window._profiles[name]||(window._profiles[name]={}); const caps=(d.caps&&typeof d.caps==='object')?d.caps:(d.caps={}); caps[cap]=!!checked; _saveProfileNow(name); };

/* ---------- Import a roster from another scheduler (CSV) ----------
   Typing in 100+ people is the reason nobody finishes setup. Every scheduling tool
   (7shifts, HotSchedules, When I Work) exports employees to CSV, so we read that
   instead. Column names differ per vendor, so headers are matched loosely.
   Two things worth noting:
     - Exports include everyone who ever worked there. A 632-row file was 518 former
       staff. We default to active only and say so plainly.
     - The vendor's "Role" column (Baker, Coffee, BOH) is a STATION, not a rank. It
       gets stored as a skill, which pre-fills part of the scheduling brain. */
window._impPick=function(h){
  h=(h||'').toLowerCase().replace(/[^a-z]/g,'');
  return function(cands){ return cands.some(function(c){ return h===c || h.indexOf(c)>=0; }); };
};
window._impMap=function(headers){
  var m={};
  headers.forEach(function(h,i){
    var t=(h||'').toLowerCase().replace(/[^a-z]/g,'');
    if(m.first==null && (t==='firstname'||t==='first'||t==='givenname')) m.first=i;
    else if(m.last==null && (t==='lastname'||t==='last'||t==='surname'||t==='familyname')) m.last=i;
    else if(m.full==null && (t==='name'||t==='employeename'||t==='fullname')) m.full=i;
    else if(m.role==null && (t==='role'||t==='position'||t==='job'||t==='jobtitle')) m.role=i;
    else if(m.wage==null && (t==='wage'||t==='payrate'||t==='rate'||t==='hourlyrate')) m.wage=i;
    else if(m.status==null && (t==='userstatus'||t==='status'||t==='employmentstatus')) m.status=i;
    else if(m.utype==null && (t==='usertype'||t==='accesslevel'||t==='permission')) m.utype=i;
    else if(m.dept==null && (t==='department'||t==='dept')) m.dept=i;
    else if(m.term==null && (t==='terminationdate'||t==='enddate'||t==='termdate')) m.term=i;
    else if(m.hire==null && (t==='hiredate'||t==='startdate'||t==='starteddate')) m.hire=i;
  });
  return m;
};
var RANKW={'Team Member':0,'Trainee':0,'Trainer':1,'Supervisor':2,'Manager':3,'GM':4,'Owner':5};
window._impRank=function(utype,dept,role){
  /* Rank comes from the job title, not from the vendor's permission fields. A first
     pass trusted "User type: Admin" and "Department: Manager" and produced 53 managers
     out of 114 -- those columns describe app access, not who runs the shift. The Role
     column is the only one that reliably names the job. Anything unrecognised lands as
     Team Member, which is the safe default: under-promoting is easy to correct in the
     roster, over-promoting hands out permissions nobody asked for. */
  var r=(role||'').toLowerCase().trim(), u=(utype||'').toLowerCase();
  if(r){
    if(r.indexOf('owner')>=0) return 'Owner';
    if(r.indexOf('gm')>=0||r.indexOf('general manager')>=0) return 'GM';
    if(r.indexOf('manager')>=0) return 'Manager';
    if(r.indexOf('supervisor')>=0||r.indexOf('leader')>=0||r.indexOf('lead')>=0) return 'Supervisor';
    if(r.indexOf('trainer')>=0||r.indexOf('ojr')>=0) return 'Trainer';
    return 'Team Member';
  }
  if(u.indexOf('owner')>=0) return 'Owner';
  return 'Team Member';
};
window._impParse=function(text){
  var rows=_csvParse(text);
  if(!rows.length) return {error:'That file looks empty.'};
  var headers=rows[0], m=_impMap(headers);
  if(m.first==null && m.full==null) return {error:'I could not find a name column. Expected something like "First name" or "Name".'};
  var out=[], skippedNoName=0, inactive=0;
  for(var i=1;i<rows.length;i++){
    var r=rows[i];
    var nm = (m.full!=null? (r[m.full]||'') : ((r[m.first]||'')+' '+(r[m.last]||''))).trim().replace(/\s+/g,' ');
    if(!nm){ skippedNoName++; continue; }
    var st=(m.status!=null?(r[m.status]||''):'').trim().toLowerCase();
    var termed = m.term!=null && (r[m.term]||'').trim()!=='';
    var active = st ? (st.indexOf('active')===0) : !termed;
    if(!active){ inactive++; continue; }
    var wage=parseFloat(String(m.wage!=null?(r[m.wage]||''):'').replace(/[^0-9.]/g,''));
    out.push({
      name:nm,
      station:(m.role!=null?(r[m.role]||''):'').trim(),
      rank:_impRank(m.utype!=null?r[m.utype]:'', m.dept!=null?r[m.dept]:'', m.role!=null?r[m.role]:''),
      wage:isFinite(wage)&&wage>0?wage:null,
      hire:(m.hire!=null?(r[m.hire]||''):'').trim()
    });
  }
  /* One row per person PER ROLE, not per person. A real 7shifts export had 114 active
     rows that were only 16 people -- one of them held 16 roles. Listing someone 16 times
     is obviously wrong, but the roles themselves are the useful part: they are exactly
     the stations that person can work. So merge rows by name and keep every role as a
     skill. That is most of the scheduling brain, imported for free. */
  var byName={}, order=[];
  out.forEach(function(p){
    var k=p.name.toLowerCase();
    if(!byName[k]){ byName[k]={name:p.name, stations:[], rank:p.rank, wage:p.wage, hire:p.hire, rows:0}; order.push(k); }
    var g=byName[k]; g.rows++;
    /* A vendor's "Role" list is not a station list. It mixes real stations (Roller,
       Cashier) with ranks (Manager, Supervisor/Leader, OJR) and catch-all categories
       (BOH, FOH). Ranks are already handled by _impRank and belong on the roster; broad
       categories are unanswerable as a skill -- "who can work BOH" covers Baker, Roller
       and dishes at once. Import the real ones and leave the rest out. */
    if(p.station && !/^(manager|supervisor|leader|supervisor\/leader|gm|owner|ojr|ojr am|ojr pm|trainer|trainee|boh|foh|back of house|front of house|kitchen)$/i.test(p.station.trim())
       && g.stations.indexOf(p.station)<0) g.stations.push(p.station);
    if(RANKW[p.rank] > RANKW[g.rank]) g.rank=p.rank;      // keep the most senior title they hold
    if(p.wage && (!g.wage || p.wage>g.wage)) g.wage=p.wage; // roles can carry different rates; keep the highest
    if(p.hire && (!g.hire || p.hire<g.hire)) g.hire=p.hire; // earliest hire date is the real start
  });
  var merged=order.map(function(k){ var g=byName[k]; g.station=g.stations.join(', '); return g; });
  /* Newest hires first. A staff list cannot tell us who still works here -- leavers are
     rarely marked inactive. Hire date is not proof either, but recent hires are the
     likeliest to still be around, so putting them on top makes the picking quicker. */
  merged.sort(function(a,b){ return (b.hire||'').localeCompare(a.hire||''); });
  return {people:merged, inactive:inactive, skippedNoName:skippedNoName, total:rows.length-1, rawRows:out.length};
};


window.openRosterImport=function(){
  var w=document.createElement('div'); w.id='impModal';
  w.style.cssText='position:fixed;inset:0;z-index:10060;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:18px';
  w.innerHTML='<div style="background:var(--card,#fff);color:var(--ink,#111);border-radius:16px;max-width:620px;width:100%;max-height:88vh;overflow:auto;padding:22px 24px;box-shadow:0 20px 60px rgba(0,0,0,.3)">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
    +'<div><div style="font-weight:800;font-size:18px">Bring your team over</div>'
    +'<div class="muted" style="font-size:13px;margin-top:3px">Export your staff list from your current scheduler and drop the file here. Nothing is typed by hand.</div></div>'
    +'<button onclick="var m=document.getElementById(\'impModal\');if(m)m.remove()" style="border:none;background:transparent;font-size:22px;cursor:pointer;line-height:1;color:inherit">&times;</button></div>'
    +'<div id="impDrop" style="margin-top:16px;border:2px dashed var(--line2,#d5dde0);border-radius:12px;padding:26px;text-align:center;cursor:pointer">'
    +'<div style="font-weight:700;font-size:14.5px">Choose your CSV file</div>'
    +'<div class="muted" style="font-size:12.5px;margin-top:4px">or drag it here</div>'
    +'<input id="impFile" type="file" accept=".csv,text/csv" style="display:none"></div>'
    +'<div id="impBody" style="margin-top:16px"></div></div>';
  document.body.appendChild(w);
  var drop=document.getElementById('impDrop'), inp=document.getElementById('impFile');
  drop.onclick=function(){ inp.click(); };
  inp.onchange=function(){ if(inp.files&&inp.files[0]) _impRead(inp.files[0]); };
  drop.ondragover=function(e){ e.preventDefault(); drop.style.borderColor='var(--brand,#4a9cad)'; };
  drop.ondragleave=function(){ drop.style.borderColor='var(--line2,#d5dde0)'; };
  drop.ondrop=function(e){ e.preventDefault(); drop.style.borderColor='var(--line2,#d5dde0)'; var f=e.dataTransfer.files&&e.dataTransfer.files[0]; if(f) _impRead(f); };
};
window._impRead=function(file){
  var body=document.getElementById('impBody');
  body.innerHTML='<div class="muted">Reading '+esc(file.name)+'…</div>';
  var fr=new FileReader();
  fr.onload=function(){
    var res=_impParse(String(fr.result||''));
    if(res.error){ body.innerHTML='<div style="color:#B32D2D;font-size:13.5px">'+esc(res.error)+'</div>'; return; }
    window._impPending=res.people;
    /* Show everyone in the file, including people already on the roster. Hiding them made
       a 16-person team look like 8 and read as a broken import. They are shown greyed out
       and cannot be ticked, so nothing gets added twice, but the owner can see their whole
       team and tell at a glance that the file was read correctly. */
    var known={}; try{ rosterNames().forEach(function(n){ known[n.toLowerCase()]=1; }); }catch(e){}
    res.people.forEach(function(p){ p.already = !!known[p.name.toLowerCase()]; });
    var fresh=res.people;
    window._impFresh=fresh;
    /* Names on the roster that are NOT in the file are usually people who have left. Worth
       surfacing -- a stale roster quietly pollutes every schedule and report. */
    var inFile={}; res.people.forEach(function(p){ inFile[p.name.toLowerCase()]=1; });
    var stale=[]; try{ rosterNames().forEach(function(n){ if(!inFile[n.toLowerCase()]) stale.push(n); }); }catch(e){}
    window._impStale=stale;
    var stations={}; res.people.forEach(function(p){ if(p.station) stations[p.station]=(stations[p.station]||0)+1; });
    var stationList=Object.keys(stations).sort(function(a,b){return stations[b]-stations[a];});
    var h='<div style="background:var(--bg,#f4f7f8);border-radius:11px;padding:14px 16px">'
      +'<div style="font-weight:800;font-size:15px">'+fresh.filter(function(p){return !p.already;}).length+' people ready to import</div>'
      +'<div class="muted" style="font-size:12.5px;margin-top:5px;line-height:1.6">'
      +'Your file had '+res.total+' rows covering '+res.people.length+' people \u2014 most schedulers write one row per person per role. '
      +(res.inactive? ('<b>'+res.inactive+'</b> are former staff and were left out. ') : '')
      +(function(){ var a=res.people.filter(function(p){return p.already;}).length; return a? ('<b>'+a+'</b> are already on your roster and are greyed out below. ') : ''; })()
      +'</div></div>';
    if(window._impStale && window._impStale.length){
      h+='<div style="margin-top:12px;background:var(--bg,#f4f7f8);border-left:3px solid #7A6224;border-radius:9px;padding:12px 14px">'
        +'<div style="font-weight:700;font-size:13.5px">'+window._impStale.length+' on your roster are not in this file</div>'
        +'<div class="muted" style="font-size:12.5px;margin-top:4px;line-height:1.55">'+window._impStale.map(esc).join(', ')
        +'. Usually people who have left. This import will not touch them \u2014 remove them from the roster when you get a chance, since they still show up in schedules and reports.</div></div>';
    }
    if(stationList.length){
      h+='<div style="margin-top:14px"><div style="font-weight:700;font-size:13.5px;margin-bottom:6px">Stations found</div>'
        +'<div style="display:flex;flex-wrap:wrap;gap:6px">'
        + stationList.map(function(k){ return '<span style="background:var(--bg,#eef3f4);border-radius:999px;padding:4px 10px;font-size:12px">'+esc(k)+' &middot; '+stations[k]+'</span>'; }).join('')
        +'</div><div class="muted" style="font-size:12px;margin-top:6px">These become skills on each person, so the schedule builder already knows who can work where.</div></div>';
    }
    if(fresh.length){
      /* Default nothing selected. The file says 114 people are active; the owner says
         about 15. Ticking the ones who still work here is far less work than unticking
         99 who don't, and it means we never quietly import a hundred former employees. */
      h+='<div style="margin-top:16px;display:flex;gap:9px;align-items:center;flex-wrap:wrap">'
        +'<input id="impSearch" placeholder="Search names\u2026" oninput="_impFilter()" style="flex:1;min-width:170px;padding:9px 12px;border:1px solid var(--line2,#d5dde0);border-radius:9px;font-size:13.5px;background:transparent;color:inherit">'
        +'<button onclick="_impAll(true)" style="background:transparent;border:1px solid var(--line2,#d5dde0);border-radius:8px;padding:8px 12px;font-size:12.5px;cursor:pointer;color:inherit">Select all</button>'
        +'<button onclick="_impAll(false)" style="background:transparent;border:1px solid var(--line2,#d5dde0);border-radius:8px;padding:8px 12px;font-size:12.5px;cursor:pointer;color:inherit">Clear</button></div>';
      h+='<div class="muted" style="font-size:12.5px;margin-top:9px;line-height:1.55">Tick the people who still work here. Most recent hires are listed first \u2014 staff lists usually still show people who left, so this is the one part worth your eyes.</div>';
      h+='<div id="impList" style="margin-top:10px;max-height:290px;overflow:auto;border:1px solid var(--line2,#e2e9ea);border-radius:10px">'
        + fresh.map(function(p,i){ return '<label data-improw="'+i+'" data-impname="'+esc(p.name.toLowerCase())+'" style="display:flex;gap:10px;align-items:center;padding:9px 12px;border-bottom:1px solid var(--line,#eef2f3);cursor:'+(p.already?'default':'pointer')+';opacity:'+(p.already?'.55':'1')+'">'
            +'<input type="checkbox" data-impchk="'+i+'"'+(p.already?' disabled':'')+' onchange="_impCount()" style="width:17px;height:17px;flex:none;cursor:'+(p.already?'default':'pointer')+'">'
            +'<span style="flex:1;min-width:0;font-size:13.5px">'+esc(p.name)+'</span>'
            +(p.already?'<span class="muted" style="font-size:11px">already added</span>':'')
            +'<span class="muted" style="font-size:12px">'+esc(p.stations&&p.stations.length?(p.stations.length+' stations'):(p.station||p.rank))+'</span>'
            +'<span class="muted" style="font-size:11.5px;min-width:74px;text-align:right">'+esc(p.hire||'')+'</span></label>'; }).join('')
        +'</div>';
      h+='<div style="display:flex;gap:9px;margin-top:16px;align-items:center;flex-wrap:wrap">'
        +'<button class="btn" onclick="_impCommit()" id="impGo" disabled style="background:var(--brand,#4a9cad);color:#fff;border:none;border-radius:9px;padding:11px 18px;font-weight:700;cursor:pointer;opacity:.5">Import 0 people</button>'
        +'<button onclick="var m=document.getElementById(\'impModal\');if(m)m.remove()" style="background:transparent;border:1px solid var(--line2,#d5dde0);border-radius:9px;padding:11px 16px;cursor:pointer;color:inherit">Cancel</button>'
        +'<span id="impMsg" class="muted" style="font-size:12.5px"></span></div>';
    } else {
      h+='<div class="muted" style="margin-top:14px;font-size:13.5px">Everyone in this file is already on your roster. Nothing to import.</div>';
    }
    body.innerHTML=h;
  };
  fr.onerror=function(){ body.innerHTML='<div style="color:#B32D2D">Could not read that file.</div>'; };
  fr.readAsText(file);
};

window._impFilter=function(){
  var q=(document.getElementById('impSearch').value||'').toLowerCase().trim();
  [].forEach.call(document.querySelectorAll('#impList [data-improw]'), function(el){
    el.style.display = !q || el.getAttribute('data-impname').indexOf(q)>=0 ? 'flex' : 'none';
  });
};
window._impAll=function(on){
  [].forEach.call(document.querySelectorAll('#impList [data-impchk]'), function(c){
    if(!c.disabled && c.closest('[data-improw]').style.display!=='none') c.checked=!!on;
  });
  _impCount();
};
window._impCount=function(){
  var n=document.querySelectorAll('#impList [data-impchk]:checked').length;
  var go=document.getElementById('impGo');
  if(go){ go.disabled=!n; go.style.opacity=n?'1':'.5'; go.textContent='Import '+n+(n===1?' person':' people'); }
};
window._impCommit=async function(){
  var all=window._impFresh||[];
  var list=[].map.call(document.querySelectorAll('#impList [data-impchk]:checked'), function(c){ return all[+c.getAttribute('data-impchk')]; }).filter(Boolean);
  /* Re-check against the roster now, not just when the preview was drawn. The preview is
     built from whatever was loaded at the time; if the roster had not finished loading,
     someone already on it could be offered again and end up with two entries. */
  try{
    await loadPositions();
    var have={}; rosterNames().forEach(function(n){ have[n.toLowerCase()]=1; });
    list=list.filter(function(p){ return !have[p.name.toLowerCase()]; });
  }catch(e){}
  if(!list.length) return;
  var go=document.getElementById('impGo'), msg=document.getElementById('impMsg');
  if(go){ go.disabled=true; go.textContent='Importing…'; }
  var uid=state.user.id;
  var posRows=list.map(function(p){ return {kind:'pos',title:p.name,detail:p.rank,on_date:null,created_by:uid}; });
  var ins=await sb.from('day_items').insert(posRows);
  if(ins.error){ if(msg){ msg.style.color='#B32D2D'; msg.textContent='Nothing was imported: '+ins.error.message; } if(go){go.disabled=false;go.textContent='Try again';} return; }
  // Stations become skills, so the scheduling brain starts with real data instead of blanks.
  var withStation=list.filter(function(p){ return p.station; });
  if(withStation.length){
    var profRows=withStation.map(function(p){ return {kind:'profile',title:p.name,on_date:null,detail:JSON.stringify({roles:(p.stations&&p.stations.length?p.stations:(p.station?[p.station]:[]))}),created_by:uid}; });
    var pr=await sb.from('day_items').insert(profRows);
    if(pr.error && msg){ msg.style.color='#7A6224'; msg.textContent='People imported, but stations did not save: '+pr.error.message; }
  }
  var withWage=list.filter(function(p){ return p.wage; });
  if(withWage.length){
    var wr=await sb.from('pay_rates').upsert(withWage.map(function(p){ return {person_name:p.name, wage:p.wage, updated_at:new Date().toISOString()}; }));
    if(wr.error && msg){ msg.style.color='#7A6224'; msg.textContent='People imported, but pay rates did not save: '+wr.error.message; }
  }
  var m=document.getElementById('impModal'); if(m) m.remove();
  try{ await loadPositions(); await loadProfiles(); }catch(e){}
  try{ go('team',{ttab:'roster'}); }catch(e){ location.reload(); }
};


/* ---------- Skills setup, asked by station instead of by person ----------
   Setting skills person-by-person means opening 15 profiles and ticking 12 boxes in
   each: 180 interactions across 15 screens, which is where setup gets abandoned.
   Asked the other way round -- one station, tap everyone who can work it -- it is
   12 screens and the same data. It also matches how an owner actually thinks: you
   know who your closers are as a group, you don't recall it one person at a time. */
window._skillStations=function(){
  var list=[];
  try{ if(Array.isArray(state.settings.stations)) list=state.settings.stations.slice(); }catch(e){}
  /* Stations imported onto people may not be in the configured list yet, so include
     them -- but only from people who still work here. Archived staff keep whatever they
     were imported with, and folding those back in resurrects every station the owner
     just cleaned up: a tidied list of 10 came back as 16 because eight former employees
     still carried BOH, FOH, Coffee and Cashier. */
  try{ Object.keys(window._profiles||{}).forEach(function(n){
    if(typeof isArchived==='function' && isArchived(n)) return;
    var r=(window._profiles[n]||{}).roles; if(Array.isArray(r)) r.forEach(function(st){ if(st && list.indexOf(st)<0) list.push(st); });
  }); }catch(e){}
  return list;
};
window._skillPeople=function(){
  try{ return rosterNames().filter(function(n){ return !isArchived(n) && posOf(n)!=='Owner'; }).sort(); }catch(e){ return []; }
};
window.openSkillsSetup=function(){
  window._ssStations=_skillStations(); window._ssIdx=0;
  if(!window._ssStations.length){ alert('No stations set up yet. Add them under Settings first, or import a roster — station names come across with it.'); return; }
  var w=document.createElement('div'); w.id='ssModal';
  w.style.cssText='position:fixed;inset:0;z-index:10060;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:18px';
  w.innerHTML='<div id="ssCard" style="background:var(--card,#fff);color:var(--ink,#111);border-radius:16px;max-width:560px;width:100%;max-height:88vh;overflow:auto;padding:22px 24px;box-shadow:0 20px 60px rgba(0,0,0,.3)"></div>';
  document.body.appendChild(w);
  _ssRender();
};
window._ssRender=function(){
  var stations=window._ssStations, i=window._ssIdx, st=stations[i];
  var people=_skillPeople();
  var card=document.getElementById('ssCard'); if(!card) return;
  if(i>=stations.length){
    var counts=people.map(function(n){ return ((window._profiles[n]||{}).roles||[]).length; });
    var trained=counts.filter(function(c){return c>0;}).length;
    card.innerHTML='<div style="text-align:center;padding:14px 4px">'
      +'<div style="font-size:34px;line-height:1">✓</div>'
      +'<div style="font-weight:800;font-size:19px;margin-top:8px">Skills are set</div>'
      +'<div class="muted" style="font-size:13.5px;margin-top:6px;line-height:1.6">'+trained+' of '+people.length+' people now have at least one station. The schedule builder will only put someone where they can actually work.</div>'
      +'<button onclick="var m=document.getElementById(\'ssModal\');if(m)m.remove(); try{go(\'schedule\',{stab:\'team\'});}catch(e){}" style="margin-top:16px;background:var(--brand,#4a9cad);color:#fff;border:none;border-radius:9px;padding:11px 20px;font-weight:700;cursor:pointer">Done</button></div>';
    return;
  }
  var can=people.filter(function(n){ return (((window._profiles[n]||{}).roles)||[]).indexOf(st)>=0; }).length;
  var h='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
    +'<div><div class="muted" style="font-size:11.5px;letter-spacing:.09em;text-transform:uppercase">Station '+(i+1)+' of '+stations.length+'</div>'
    +'<div style="font-weight:800;font-size:21px;margin-top:3px">Who can work '+esc(st)+'?</div>'
    +'<div class="muted" style="font-size:13px;margin-top:3px">Tap everyone who can be scheduled here on their own.</div></div>'
    +'<button onclick="var m=document.getElementById(\'ssModal\');if(m)m.remove()" style="border:none;background:transparent;font-size:22px;cursor:pointer;line-height:1;color:inherit">&times;</button></div>';
  h+='<div style="height:5px;background:var(--bg,#eef3f4);border-radius:99px;margin:14px 0 4px"><div style="height:5px;width:'+Math.round(i/stations.length*100)+'%;background:var(--brand,#4a9cad);border-radius:99px;transition:width .2s"></div></div>';
  h+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px">'
    + people.map(function(n){
        var on=(((window._profiles[n]||{}).roles)||[]).indexOf(st)>=0;
        return '<button onclick="_ssToggle('+JSON.stringify(n).replace(/"/g,'&quot;')+')" data-ssname="'+esc(n)+'" style="border:1.5px solid '+(on?'var(--brand,#4a9cad)':'var(--line2,#d5dde0)')+';background:'+(on?'var(--brand,#4a9cad)':'transparent')+';color:'+(on?'#fff':'inherit')+';border-radius:999px;padding:9px 15px;font-size:13.5px;font-weight:600;cursor:pointer">'+esc(n)+'</button>';
      }).join('')
    +'</div>';
  h+='<div class="muted" style="font-size:12.5px;margin-top:12px" id="ssCount">'+can+' selected</div>';
  h+='<div style="display:flex;gap:9px;margin-top:18px;align-items:center">'
    +(i>0?'<button onclick="_ssGo(-1)" style="background:transparent;border:1px solid var(--line2,#d5dde0);border-radius:9px;padding:11px 16px;cursor:pointer;color:inherit">Back</button>':'')
    +'<button onclick="_ssGo(1)" style="background:var(--brand,#4a9cad);color:#fff;border:none;border-radius:9px;padding:11px 20px;font-weight:700;cursor:pointer">'+(i===stations.length-1?'Finish':'Next')+'</button>'
    +'<button onclick="_ssGo(1)" style="background:transparent;border:none;color:var(--muted,#6b8087);font-size:13px;cursor:pointer">Skip</button></div>';
  card.innerHTML=h;
};
window._ssToggle=function(name){
  var st=window._ssStations[window._ssIdx];
  var d=window._profiles[name]||(window._profiles[name]={});
  var roles=Array.isArray(d.roles)?d.roles:(d.roles=[]);
  var k=roles.indexOf(st);
  if(k<0) roles.push(st); else roles.splice(k,1);
  try{ _saveProfileNow(name); }catch(e){}
  _ssRender();
};
window._ssGo=function(step){ window._ssIdx=Math.max(0,window._ssIdx+step); _ssRender(); };


/* ---------- Concept templates ----------
   Stations are wildly different by concept: a coffee and bagel shop runs 6-8, a QSR
   runs 20+, and a casual place with a bar has servers, bartenders and a kitchen
   brigade that share almost nothing with either. Starting everyone from a blank list
   (or from one restaurant's list) means every operator does the same tedious guessing.
   These are starting points, not rules -- every station can be renamed, removed or
   added to, because the words a team actually uses on the floor matter more than ours. */
window.CONCEPTS=[
  {id:'coffee', name:'Coffee / bakery cafe', blurb:'Counter service, espresso, baked goods',
   stations:['Register','Espresso Bar','Bake','Roller','Prep','Expo','Dish'],
   dayparts:['Open','Morning Rush','Midday','Close']},
  {id:'qsr', name:'Quick service (QSR)', blurb:'Drive-thru, front counter, high volume',
   stations:['Front Counter','Drive-Thru Order','Drive-Thru Window','Headset','Grill','Fries','Breading','Assembly','Expo','Bagger','Runner','Prep','Dining Room','Dish'],
   dayparts:['Breakfast','Lunch','Dinner','Late Night']},
  {id:'fastcasual', name:'Fast casual', blurb:'Order at counter, made-to-order line',
   stations:['Register','Make Line','Grill','Prep','Expo','Dining Room','Dish'],
   dayparts:['Open','Lunch','Dinner','Close']},
  {id:'casual', name:'Casual dining with bar', blurb:'Servers, full bar, table service',
   stations:['Host','Server','Bartender','Barback','Busser','Food Runner','Line Cook','Prep Cook','Expo','Dish'],
   dayparts:['Lunch','Happy Hour','Dinner','Late']},
  {id:'finedining', name:'Fine dining', blurb:'Full service, brigade kitchen',
   stations:['Host','Server','Sommelier','Bartender','Busser','Runner','Garde Manger','Saute','Grill','Pastry','Expo','Dish'],
   dayparts:['Prep','Dinner','Close']},
  {id:'pizza', name:'Pizza', blurb:'Dough, oven, delivery or carry-out',
   stations:['Register','Phones','Dough','Make Line','Oven','Cut & Box','Delivery','Prep','Dish'],
   dayparts:['Open','Lunch','Dinner','Close']},
  {id:'bar', name:'Bar / pub', blurb:'Drinks led, kitchen support',
   stations:['Bartender','Barback','Server','Host','Kitchen','Dish'],
   dayparts:['Open','Happy Hour','Evening','Late']},
  {id:'truck', name:'Food truck / small counter', blurb:'Small team, tight space',
   stations:['Window','Grill','Prep','Expo'],
   dayparts:['Prep','Service','Close']}
];
window.openConceptSetup=function(){
  var w=document.createElement('div'); w.id='cxModal';
  w.style.cssText='position:fixed;inset:0;z-index:10060;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:18px';
  w.innerHTML='<div id="cxCard" style="background:var(--card,#fff);color:var(--ink,#111);border-radius:16px;max-width:600px;width:100%;max-height:88vh;overflow:auto;padding:22px 24px;box-shadow:0 20px 60px rgba(0,0,0,.3)"></div>';
  document.body.appendChild(w); _cxPick();
};
window._cxPick=function(){
  var c=document.getElementById('cxCard'); if(!c) return;
  var h='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
    +'<div><div style="font-weight:800;font-size:20px">What kind of restaurant is this?</div>'
    +'<div class="muted" style="font-size:13px;margin-top:4px">Pick the closest one. It just fills in a starting set of stations — you can rename or remove any of them next.</div></div>'
    +'<button onclick="var m=document.getElementById(\'cxModal\');if(m)m.remove()" style="border:none;background:transparent;font-size:22px;cursor:pointer;line-height:1;color:inherit">&times;</button></div>';
  h+='<div style="display:grid;gap:9px;margin-top:16px">'
    + CONCEPTS.map(function(k,i){ return '<button onclick="_cxChoose('+i+')" style="text-align:left;background:transparent;border:1.5px solid var(--line2,#d5dde0);border-radius:11px;padding:13px 15px;cursor:pointer;color:inherit">'
        +'<div style="font-weight:700;font-size:15px">'+esc(k.name)+'</div>'
        +'<div class="muted" style="font-size:12.5px;margin-top:2px">'+esc(k.blurb)+' · '+k.stations.length+' stations</div></button>'; }).join('')
    +'</div>';
  c.innerHTML=h;
};
window._cxChoose=function(i){
  var k=CONCEPTS[i]; window._cxSel=JSON.parse(JSON.stringify(k));
  _cxEdit();
};
window._cxEdit=function(){
  var k=window._cxSel, c=document.getElementById('cxCard'); if(!c) return;
  var h='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
    +'<div><div style="font-weight:800;font-size:20px">Make these your own</div>'
    +'<div class="muted" style="font-size:13px;margin-top:4px">Use the words your team actually says on the floor. Remove anything you do not run.</div></div>'
    +'<button onclick="var m=document.getElementById(\'cxModal\');if(m)m.remove()" style="border:none;background:transparent;font-size:22px;cursor:pointer;line-height:1;color:inherit">&times;</button></div>';
  h+='<div style="margin-top:16px;display:flex;flex-direction:column;gap:7px">'
    + k.stations.map(function(st,j){ return '<div style="display:flex;gap:8px;align-items:center">'
        +'<input value="'+esc(st)+'" oninput="_cxSet('+j+',this.value)" style="flex:1;padding:9px 12px;border:1px solid var(--line2,#d5dde0);border-radius:9px;font-size:13.5px;background:transparent;color:inherit">'
        +'<button onclick="_cxDel('+j+')" title="Remove" style="border:none;background:transparent;font-size:19px;cursor:pointer;color:var(--muted,#6b8087);line-height:1">&times;</button></div>'; }).join('')
    +'</div>';
  h+='<button onclick="_cxAdd()" style="margin-top:10px;background:transparent;border:1px dashed var(--line2,#d5dde0);border-radius:9px;padding:9px 14px;font-size:13px;cursor:pointer;color:inherit">+ Add a station</button>';
  h+='<div style="display:flex;gap:9px;margin-top:18px;align-items:center">'
    +'<button onclick="_cxSave()" id="cxGo" style="background:var(--brand,#4a9cad);color:#fff;border:none;border-radius:9px;padding:11px 20px;font-weight:700;cursor:pointer">Save '+k.stations.length+' stations</button>'
    +'<button onclick="_cxPick()" style="background:transparent;border:1px solid var(--line2,#d5dde0);border-radius:9px;padding:11px 16px;cursor:pointer;color:inherit">Back</button>'
    +'<span id="cxMsg" class="muted" style="font-size:12.5px"></span></div>';
  c.innerHTML=h;
};
window._cxSet=function(j,v){ window._cxSel.stations[j]=v; };
window._cxDel=function(j){ window._cxSel.stations.splice(j,1); _cxEdit(); };
window._cxAdd=function(){ window._cxSel.stations.push(''); _cxEdit(); };
window._cxSave=async function(){
  var list=window._cxSel.stations.map(function(x){ return String(x||'').trim(); }).filter(Boolean);
  var seen={}, out=[]; list.forEach(function(x){ var k=x.toLowerCase(); if(!seen[k]){ seen[k]=1; out.push(x); } });
  var msg=document.getElementById('cxMsg'), go=document.getElementById('cxGo');
  if(!out.length){ if(msg){ msg.style.color='#B32D2D'; msg.textContent='Add at least one station.'; } return; }
  if(go){ go.disabled=true; go.textContent='Saving…'; }
  var r=await window._replaceKind('stations',{kind:'stations',title:'stations',on_date:null,detail:JSON.stringify(out),created_by:state.user.id});
  if(!r.ok){ if(msg){ msg.style.color='#B32D2D'; msg.textContent=window._replaceMsg(r); } if(go){ go.disabled=false; go.textContent='Try again'; } return; }
  state.settings.stations=out;
  var m=document.getElementById('cxModal'); if(m) m.remove();
  if(confirm('Stations saved.\n\nSet who can work each one now? It is one screen per station — tap the people who can work it.')) openSkillsSetup();
};


/* ---------- Show a name people can act on ----------
   Everywhere the app picked a person it showed only their first name. With two Jessicas
   on the roster the assignment list read "Jessica" and "Jessica", so an owner had a coin
   flip between a manager and a trainee. Full names everywhere would be noisy -- nobody
   says "Baylee Furler" out loud -- so the last initial appears only when the first name
   is shared by someone else currently on the team. Ambiguity is the trigger, not policy. */
window.dispName=function(n){
  n=String(n||'').trim(); if(!n) return '';
  const parts=n.split(/\s+/); const first=parts[0]; const last=parts[parts.length-1];
  if(parts.length<2) return first;
  let peers=[];
  try{ peers=rosterNames().filter(x=>x&&x!==n&&!isArchived(x)&&String(x).trim().split(/\s+/)[0].toLowerCase()===first.toLowerCase()); }
  catch(e){ return n; }
  if(!peers.length) return first;                       // nobody else has this first name
  const li=last.charAt(0).toUpperCase();
  const initialClash = peers.some(x=>{ const lp=String(x).trim().split(/\s+/); return lp[lp.length-1].charAt(0).toUpperCase()===li; });
  if(!initialClash) return first+' '+li+'.';            // "Jessica S." is enough
  return first+' '+last;                                // two Jessica S-somethings: use the whole name
};


/* ================= The Brain =================
   What the restaurant knows about itself: its stations, who can work them, how many
   people it needs and when, and who has to be in charge. Auto-draft is only as good as
   this, which is why it lived scattered across the schedule page and Settings and why
   neither screen made sense. Gathering it in one place does two things: the schedule page
   becomes just the schedule, and the setup work gets a visible payoff -- a readiness
   score that climbs as you fill it in, and a plain list of what auto-draft still cannot
   do without you. Nobody finishes a forty-minute setup on faith. */

/* ---------- Set everyone's pay in one place ----------
   Pay was only editable one person at a time, behind a tap into a profile that also holds
   birthdays and emergency contacts. Fifteen people meant fifteen round trips, so of course
   some were missed, some sat below minimum wage, and nobody could see that at a glance.
   One screen, every rate visible, anything under the legal floor flagged. */
window.openPayEditor = async function(){
  await loadPositions(); await loadProfiles(); await loadArchived();
  const people = rosterNames().filter(n=>!isArchived(n) && posOf(n)!=='Owner').sort();
  const r = await sb.from('pay_rates').select('person_name,wage');
  const cur = {}; (r.data||[]).forEach(x=>cur[x.person_name]=+x.wage);
  window._payCur = cur;
  window._payPeople = people;
  let w=document.getElementById('payModal'); if(w) w.remove();
  w=document.createElement('div'); w.id='payModal';
  w.style.cssText='position:fixed;inset:0;z-index:10060;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px';
  w.innerHTML='<div id="payCard" style="background:var(--card,#fff);color:var(--ink,#111);border-radius:16px;max-width:560px;width:100%;max-height:90vh;overflow:auto;padding:22px 24px;box-shadow:0 20px 60px rgba(0,0,0,.3)"></div>';
  document.body.appendChild(w); _payRender();
};
window._payRender = function(){
  const c=document.getElementById('payCard'); if(!c) return;
  const people=window._payPeople, cur=window._payCur;
  const MINW = 15.15;   // Arizona
  let h='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
    +'<div><div style="font-weight:800;font-size:20px">Pay rates</div>'
    +'<div class="muted" style="font-size:13px;margin-top:3px">Everyone in one place. Leave someone blank if they are salaried — set the salary on their profile instead.</div></div>'
    +'<button onclick="var m=document.getElementById(\'payModal\');if(m)m.remove()" style="border:none;background:transparent;font-size:22px;cursor:pointer;line-height:1;color:inherit">&times;</button></div>';
  h+='<div style="display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap">'
    +'<input id="payAllVal" type="number" step="0.01" placeholder="15.15" style="width:110px;padding:8px 10px;border:1px solid var(--line2,#d5dde0);border-radius:8px;font-size:13.5px;background:transparent;color:inherit">'
    +'<button onclick="_payFillBlank()" style="border:1px solid var(--line2,#d5dde0);background:transparent;color:inherit;border-radius:8px;padding:8px 12px;font-size:12.5px;cursor:pointer">Fill the blanks with this</button></div>';
  h+='<div style="display:flex;flex-direction:column;gap:6px;margin-top:14px">';
  people.forEach(function(n){
    const pr=(window._profiles||{})[n]||{};
    const sal=+pr.salary>0;
    const v=cur[n]!=null? cur[n] : '';
    const low = !sal && v!=='' && +v < MINW;
    h+='<div style="display:flex;gap:10px;align-items:center;border:1px solid '+(low?'#E4B8A8':'var(--line2,#d5dde0)')+';background:'+(low?'#F9EDE8':'transparent')+';border-radius:10px;padding:9px 12px">'
      /* Full names here, not the shortened form used elsewhere. This is a payroll decision:
         getting the wrong Jessica costs somebody real money, and the screen has room. */
      +'<span style="flex:1;min-width:0;font-size:13.5px;font-weight:600">'+esc(n)+'</span>'
      +'<span class="muted" style="font-size:11.5px;min-width:82px">'+esc(posOf(n))+'</span>'
      + (sal
          ? '<span class="muted" style="font-size:12.5px;min-width:120px;text-align:right">salaried &middot; $'+Number(pr.salary).toLocaleString()+'</span>'
          : '<span style="display:flex;align-items:center;gap:4px"><span class="muted" style="font-size:13px">$</span>'
            +'<input type="number" step="0.01" value="'+esc(String(v))+'" data-payfor="'+esc(n)+'" oninput="_paySet('+JSON.stringify(n).replace(/"/g,'&quot;')+',this.value)" style="width:92px;padding:7px 9px;border:1px solid var(--line2,#d5dde0);border-radius:8px;font-size:13.5px;background:var(--card,#fff);color:inherit"></span>')
      +'</div>'
      + (low? '<div style="font-size:11.5px;color:#A8401C;margin:-2px 0 2px 12px">Below the $'+MINW.toFixed(2)+' minimum</div>' : '');
  });
  h+='</div>';
  h+='<div style="display:flex;gap:9px;margin-top:18px;align-items:center;flex-wrap:wrap">'
    +'<button onclick="_paySave()" id="payGo" style="background:var(--brand,#4a9cad);color:#fff;border:none;border-radius:9px;padding:11px 20px;font-weight:700;cursor:pointer">Save pay rates</button>'
    +'<button onclick="var m=document.getElementById(\'payModal\');if(m)m.remove()" style="background:transparent;border:1px solid var(--line2,#d5dde0);border-radius:9px;padding:11px 16px;cursor:pointer;color:inherit">Cancel</button>'
    +'<span id="payMsg" class="muted" style="font-size:12.5px"></span></div>';
  c.innerHTML=h;
};
window._paySet = function(n,v){ window._payCur[n] = v===''? null : +v; };
window._payFillBlank = function(){
  const v=+(document.getElementById('payAllVal')||{}).value;
  if(!(v>0)) { alert('Put a rate in the box first.'); return; }
  window._payPeople.forEach(function(n){
    const pr=(window._profiles||{})[n]||{};
    if(+pr.salary>0) return;                                  // salaried people have no hourly rate
    if(window._payCur[n]==null || window._payCur[n]==='') window._payCur[n]=v;
  });
  _payRender();
};
window._paySave = async function(){
  const go=document.getElementById('payGo'), msg=document.getElementById('payMsg');
  if(go){ go.disabled=true; go.textContent='Saving…'; }
  const rows=[], clear=[];
  window._payPeople.forEach(function(n){
    const pr=(window._profiles||{})[n]||{};
    if(+pr.salary>0){ clear.push(n); return; }                 // salaried: no hourly row at all
    const v=window._payCur[n];
    if(v==null || v==='' || !(+v>0)) { clear.push(n); return; }
    rows.push({person_name:n, wage:+v, updated_at:new Date().toISOString()});
  });
  if(clear.length){ const d=await sb.from('pay_rates').delete().in('person_name', clear); if(d.error && msg){ msg.style.color='#B32D2D'; msg.textContent=d.error.message; } }
  if(rows.length){ const u=await sb.from('pay_rates').upsert(rows);
    if(u.error){ if(msg){ msg.style.color='#B32D2D'; msg.textContent='Not saved: '+u.error.message; } if(go){ go.disabled=false; go.textContent='Try again'; } return; } }
  const m=document.getElementById('payModal'); if(m) m.remove();
  try{ vBrain(document.getElementById('view')); }catch(e){}
};

async function vBrain(v){
  if(!canSee('brain')){ go('home'); return; }
  setTitle('The Brain','What your restaurant knows about itself — everything auto-draft needs, in one place');
  v.innerHTML='<div class="muted">Loading…</div>';
  await loadSettings(); await loadPositions(); await loadProfiles(); await loadArchived();
  const [rcov, rav, rpay, rrev] = await Promise.all([
    sb.from('day_items').select('detail').eq('kind','covrules').order('id',{ascending:false}).limit(1).maybeSingle(),
    sb.from('availability').select('person_name'),
    sb.from('pay_rates').select('person_name,wage'),
    sb.from('day_items').select('detail').eq('kind','avreview').order('id',{ascending:false}).limit(1).maybeSingle()
  ]);
  const people = rosterNames().filter(n=>!isArchived(n) && posOf(n)!=='Owner');
  const stations = (state.settings && Array.isArray(state.settings.stations)) ? state.settings.stations : [];
  const skilled = people.filter(n=>(((window._profiles||{})[n]||{}).roles||[]).length>0);
  /* Availability is judged by whether the team has been reviewed, not by how many rows
     exist -- somebody free all week legitimately has none. Anyone hired since the last
     review is flagged, so a new starter is caught without invalidating the whole pass. */
  /* How many people actually carry a scheduling limit. Someone with none is not wrong --
     it means auto-draft may use them any day, any hours, up to the defaults. */
  const RULE_KEYS=['minHrs','maxHrs','maxDays','maxRun','offRun','maxShift','salary'];
  const ruleCount = people.filter(n=>{ const pr=(window._profiles||{})[n]||{}; return RULE_KEYS.some(k=>pr[k]!=null && pr[k]!==''); }).length;
  let avReviewed=false, avNew=[];
  try{
    const d=JSON.parse((rrev.data&&rrev.data.detail)||'null');
    if(d && Array.isArray(d.people)){ avReviewed=true; avNew=people.filter(n=>d.people.indexOf(n)<0); }
  }catch(e){}
  const paid = new Set((rpay.data||[]).filter(r=>+r.wage>0).map(r=>r.person_name));
  const withPay = people.filter(n=>paid.has(n));
  let cov=null; try{ cov=JSON.parse((rcov.data&&rcov.data.detail)||'null'); }catch(e){}
  const covSet = !!(cov && cov.matrix && cov.matrix.blocks && Object.keys(cov.matrix.blocks).length);
  const leaders = people.filter(n=>['GM','Manager','Supervisor'].indexOf(posOf(n))>=0);

  const parts = [
    {k:'stations', done: stations.length>0,        label:'Stations',        detail: stations.length? stations.length+' set up' : 'None yet',
     why:'Auto-draft cannot place anyone until it knows what jobs exist.', act: stations.length?'openStationClean()':'openConceptSetup()', cta: stations.length?'Tidy up stations':'Set up stations'},
    {k:'skills',   done: people.length? skilled.length===people.length : false, label:'Who works where', detail: people.length? skilled.length+' of '+people.length+' people' : 'No team yet',
     why:'Without skills, auto-draft will put people on stations they cannot run.', act:'openSkillsSetup()', cta:'Set skills'},
    {k:'coverage', done: covSet,                   label:'Coverage rules',  detail: covSet? 'Matrix set' : 'Not set',
     why:'This is how many people you need, hour by hour. Without it there is nothing to staff against.', act:"go('schedule',{stab:'schedule'}); setTimeout(function(){try{localStorage.setItem('sch_setup_open','1');var b=document.getElementById('schSetup');if(b)b.style.display='block';var e=document.getElementById('schSetup');if(e)e.scrollIntoView({behavior:'smooth',block:'center'});}catch(err){}},1200)", cta:'Set coverage'},
    {k:'leaders',  done: leaders.length>0,         label:'Leadership',      detail: leaders.length? leaders.length+' leader'+(leaders.length>1?'s':'') : 'Nobody assigned',
     why:'Every shift needs someone in charge. Auto-draft protects open and close first.', act:"go('team',{ttab:'roster'})", cta:'Set positions'},
    {k:'avail',    done: avReviewed && !avNew.length, label:'Availability',
     detail: !avReviewed ? 'Not reviewed yet'
             : avNew.length ? avNew.length+' new '+(avNew.length===1?'person needs':'people need')+' checking'
             : 'Reviewed for all '+people.length,
     why:'Auto-draft will schedule people when they cannot work until it knows their hours.', act:'openAvailSetup()', cta:'Set availability'},
    {k:'rules',    done: ruleCount>0, label:'Scheduling rules',
     detail: ruleCount? ruleCount+' of '+people.length+' people have limits set' : 'Nobody has limits set',
     why:'Hours, days per week, days off in a row, longest shift. These decide what auto-draft is allowed to do, and they were the hardest thing in the app to find.',
     act:"go('schedule',{stab:'team'})", cta:'Open rules', soft:true},
    {k:'pay',      done: people.length? withPay.length===people.length : false, label:'Pay rates', detail: people.length? withPay.length+' of '+people.length+' people' : 'No team yet',
     why:'Needed for labour cost and your labour target. Scheduling still works without it.', act:'openPayEditor()', cta:'Set pay', soft:true}
  ];
  const hard = parts.filter(p=>!p.soft);
  const ready = Math.round(hard.filter(p=>p.done).length / hard.length * 100);
  const blocking = parts.filter(p=>!p.done && !p.soft);

  let h = '';

  h += `<div class="card" style="padding:18px 20px;margin-bottom:16px">
    <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap">
      <div style="font-size:34px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums">${ready}%</div>
      <div style="flex:1;min-width:170px">
        <div style="font-weight:700;font-size:15px">${ready===100?'Auto-draft is ready':'Auto-draft is not ready yet'}</div>
        <div class="faint" style="font-size:12.5px">${ready===100?'Everything it needs is set. Build a week and it will hold up.':blocking.length+' thing'+(blocking.length>1?'s':'')+' still missing.'}</div>
      </div>
    </div>
    <div style="height:8px;background:var(--bg);border-radius:99px;margin-top:14px;overflow:hidden">
      <div style="height:8px;width:${ready}%;background:${ready===100?'#2C6E4B':'var(--brand)'};border-radius:99px;transition:width .3s"></div>
    </div>
  </div>`;

  h += `<div class="sec">What it knows</div><div class="card" style="padding:0;overflow:hidden">`;
  parts.forEach((p,i)=>{
    h += `<div style="display:flex;gap:13px;align-items:flex-start;padding:15px 17px;${i?'border-top:1px solid var(--line)':''}">
      <i class="ti ${p.done?'ti-circle-check':'ti-circle-dashed'}" style="font-size:20px;flex:none;margin-top:1px;color:${p.done?'#2C6E4B':'var(--muted)'}"></i>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:14.5px">${esc(p.label)} ${p.soft?'<span class="faint" style="font-weight:500;font-size:11.5px">· optional</span>':''}</div>
        <div class="faint" style="font-size:12.5px;margin-top:1px">${esc(p.detail)}</div>
        ${p.done?'':`<div class="faint" style="font-size:12.5px;margin-top:5px;line-height:1.5">${esc(p.why)}</div>`}
      </div>
      <button class="btn" style="width:auto;padding:7px 13px;font-size:12.5px;flex:none" onclick="${p.act}">${esc(p.cta)}</button>
    </div>`;
  });
  h += `</div>`;

  if(blocking.length){
    h += `<div class="card" style="padding:15px 18px;margin-top:16px;background:#F7EEDC;border-color:#E4CFA3">
      <div style="font-weight:700;font-size:14.5px;color:#7A5B1E;margin-bottom:5px">What auto-draft cannot do yet</div>
      <div style="font-size:13px;line-height:1.7;color:#7A5B1E">${blocking.map(b=>'&bull; '+esc(b.why)).join('<br>')}</div></div>`;
  }
  v.innerHTML = h;
}


/* ---------- Availability, asked by day instead of by person ----------
   No POS holds availability -- a POS records what happened, not what someone can do --
   and 7shifts has no availability export either, so this has to be entered by hand.
   That makes the shape of the asking the whole job. Per person it is 14 people x 7 days
   = 98 decisions across 14 forms. Per day it is 7 screens: everyone starts available,
   and you tap the few who cannot work. Most people can work most days, so the taps are
   few. Worked history is deliberately NOT used to prefill: someone free every Sunday who
   has never been scheduled on one would be marked unavailable, and a confident wrong
   answer is worse than an empty one. */
window.WDAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
window._timeOpts=function(sel){
  /* Restaurant hours land on quarter hours, and a native time field makes 2:15 needlessly
     fiddly, so offer the quarter hours directly. */
  var out='';
  for(var m=4*60; m<=23*60+45; m+=15){
    var hh=Math.floor(m/60), mm=m%60;
    var v=(hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm;
    var lbl=((hh%12)||12)+':'+(mm<10?'0':'')+mm+(hh<12?'a':'p');
    out+='<option value="'+v+'"'+(v===sel?' selected':'')+'>'+lbl+'</option>';
  }
  return out;
};
window.openAvailSetup=async function(){
  const people=rosterNames().filter(n=>!isArchived(n)&&posOf(n)!=='Owner').sort();
  if(!people.length){ alert('Add your team first — there is nobody to set availability for.'); return; }
  const r=await sb.from('availability').select('*');
  window._avail={}; (r.data||[]).forEach(row=>{ (window._avail[row.person_name]=window._avail[row.person_name]||{})[row.weekday]=row; });
  window._asPeople=people;
  let w=document.getElementById('asModal'); if(w) w.remove();
  w=document.createElement('div'); w.id='asModal';
  w.style.cssText='position:fixed;inset:0;z-index:10060;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:14px';
  w.innerHTML='<div id="asCard" style="background:var(--card,#fff);color:var(--ink,#111);border-radius:16px;max-width:920px;width:100%;max-height:92vh;overflow:auto;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.3)"></div>';
  document.body.appendChild(w); _asRender();
};
window._asFinish=async function(){
  /* Somebody available all week needs no records at all -- a blank square already means
     that. Counting records therefore punished the easy cases: a person with nothing to
     declare looked unfinished until you clicked something at them, which is busywork.
     So record the review itself, along with who was on the team when it happened. A
     blank stays a blank; the pass is what gets marked done. New hires afterwards are
     detected by name and asked for, rather than resetting the whole thing. */
  const people=(window._asPeople||[]).slice().sort();
  await window._replaceKind('avreview', {kind:'avreview', title:'avreview', on_date:null,
    detail: JSON.stringify({at:new Date().toISOString(), people:people}), created_by:state.user.id});
  const m=document.getElementById('asModal'); if(m) m.remove();
  try{ go('brain'); }catch(e){}
};
window._asState=function(n,wd){
  const row=((window._avail||{})[n]||{})[wd];
  if(!row) return {k:'all'};
  if(row.can_work===false) return {k:'off'};
  const w=parseWin(row.note||'');
  return w? {k:'part', from:w[0], to:w[1]} : {k:'all'};
};
window._asRender=function(){
  /* A grid, not a wizard. Walking one day at a time meant somebody who only works
     weekends had to be switched off on five separate screens, and by the fourth you
     could no longer see which day you were on. Everyone down the side, days across the
     top, the whole week visible at once -- and a row of one-click patterns for the
     shapes that actually recur: weekends only, weekdays only, off all week. */
  const c=document.getElementById('asCard'); if(!c) return;
  const people=window._asPeople;
  const SHORT=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const cell=function(n,wd){
    const st=_asState(n,wd);
    const tone = st.k==='off' ? {bg:'#F7E1DA',fg:'#A8401C',t:'Off'}
              : st.k==='part' ? {bg:'#F7EEDC',fg:'#7A5B1E',t:((+st.from.slice(0,2)%12)||12)+(st.from.slice(3)==='00'?'':':'+st.from.slice(3))+'–'+((+st.to.slice(0,2)%12)||12)+(st.to.slice(3)==='00'?'':':'+st.to.slice(3))}
              : {bg:'#E1EFE7',fg:'#2C6E4B',t:'All day'};
    return '<td style="padding:3px"><button onclick="_asOpen('+JSON.stringify(n).replace(/"/g,'&quot;')+','+wd+',event)" style="width:100%;border:none;border-radius:8px;padding:8px 4px;font-size:11.5px;font-weight:700;cursor:pointer;background:'+tone.bg+';color:'+tone.fg+'">'+esc(tone.t)+'</button></td>';
  };
  let h='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
    +'<div><div style="font-weight:800;font-size:20px">Who can work when</div>'
    +'<div class="muted" style="font-size:13px;margin-top:3px">Everyone can work all day unless you say otherwise. Tap any square to change it.</div></div>'
    +'<button onclick="var m=document.getElementById(\'asModal\');if(m)m.remove(); try{go(\'brain\');}catch(e){}" style="border:none;background:transparent;font-size:22px;cursor:pointer;line-height:1;color:inherit">&times;</button></div>';
  h+='<div style="overflow-x:auto;margin-top:14px"><table style="width:100%;border-collapse:collapse;min-width:640px">'
    +'<thead><tr><th style="text-align:left;padding:6px 8px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);position:sticky;left:0;background:var(--card,#fff)">Person</th>'
    + SHORT.map(d=>'<th style="padding:6px 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">'+d+'</th>').join('')
    +'<th style="padding:6px 8px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);white-space:nowrap">Quick set</th></tr></thead><tbody>';
  people.forEach(function(n){
    const nm=JSON.stringify(n).replace(/"/g,'&quot;');
    h+='<tr style="border-top:1px solid var(--line,#eef2f3)">'
      +'<td style="padding:6px 8px;font-size:13px;font-weight:600;white-space:nowrap;position:sticky;left:0;background:var(--card,#fff)">'+esc(dispName(n))+'</td>'
      + [0,1,2,3,4,5,6].map(function(wd){ return cell(n,wd); }).join('')
      +'<td style="padding:3px 6px;white-space:nowrap">'
        +'<button onclick="_asPreset('+nm+',\'weekends\')" title="Weekends only" style="border:1px solid var(--line2,#d5dde0);background:transparent;color:inherit;border-radius:7px;padding:5px 7px;font-size:11px;cursor:pointer;margin-right:3px">Wknd</button>'
        +'<button onclick="_asPreset('+nm+',\'weekdays\')" title="Weekdays only" style="border:1px solid var(--line2,#d5dde0);background:transparent;color:inherit;border-radius:7px;padding:5px 7px;font-size:11px;cursor:pointer;margin-right:3px">Wkdy</button>'
        +'<button onclick="_asPreset('+nm+',\'all\')" title="Available every day" style="border:1px solid var(--line2,#d5dde0);background:transparent;color:inherit;border-radius:7px;padding:5px 7px;font-size:11px;cursor:pointer">All</button>'
      +'</td></tr>';
  });
  h+='</tbody></table></div>';
  /* Finishing records that the review happened. A blank square legitimately means
     "available all day", so there is nothing to fill in for most people. */
  h+='<div style="display:flex;gap:9px;margin-top:16px;align-items:center;flex-wrap:wrap">'
    +'<button onclick="_asFinish()" style="background:var(--brand,#4a9cad);color:#fff;border:none;border-radius:9px;padding:11px 20px;font-weight:700;cursor:pointer">Done</button>'
    +'<span class="muted" style="font-size:12.5px">Saves as you go.</span></div>';

  c.innerHTML=h;
};
window._asOpen=function(name,wd,ev){
  if(ev) ev.stopPropagation();
  const old=document.getElementById('asPop'); if(old) old.remove();
  const st=_asState(name,wd);
  const nm=JSON.stringify(name).replace(/"/g,'&quot;');
  const pop=document.createElement('div'); pop.id='asPop';
  pop.style.cssText='position:fixed;z-index:10070;background:var(--card,#fff);color:var(--ink,#111);border:1px solid var(--line2,#d5dde0);border-radius:12px;box-shadow:0 12px 34px rgba(0,0,0,.22);padding:12px 13px;min-width:230px';
  pop.innerHTML='<div style="font-weight:700;font-size:13px;margin-bottom:8px">'+esc(dispName(name))+' &middot; '+['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][wd]+'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
    +'<button onclick="_asSet('+nm+','+wd+',\'all\')" style="border:none;border-radius:7px;padding:7px 11px;font-size:12px;font-weight:600;cursor:pointer;background:'+(st.k==='all'?'#2C6E4B':'rgba(0,0,0,.06)')+';color:'+(st.k==='all'?'#fff':'inherit')+'">All day</button>'
    +'<button onclick="_asSet('+nm+','+wd+',\'part\')" style="border:none;border-radius:7px;padding:7px 11px;font-size:12px;font-weight:600;cursor:pointer;background:'+(st.k==='part'?'#7A5B1E':'rgba(0,0,0,.06)')+';color:'+(st.k==='part'?'#fff':'inherit')+'">Some hours</button>'
    +'<button onclick="_asSet('+nm+','+wd+',\'off\')" style="border:none;border-radius:7px;padding:7px 11px;font-size:12px;font-weight:600;cursor:pointer;background:'+(st.k==='off'?'#A8401C':'rgba(0,0,0,.06)')+';color:'+(st.k==='off'?'#fff':'inherit')+'">Can\'t work</button></div>'
    + (st.k==='part' ? '<div style="display:flex;gap:5px;align-items:center;margin-top:9px;flex-wrap:wrap"><span class="muted" style="font-size:12px">from</span>'
        +'<select onchange="_asWin('+nm+','+wd+',this.value,null)" style="padding:6px 7px;border:1px solid var(--line2,#d5dde0);border-radius:7px;font-size:12px;background:var(--card,#fff);color:inherit">'+_timeOpts(st.from)+'</select>'
        +'<span class="muted" style="font-size:12px">to</span>'
        +'<select onchange="_asWin('+nm+','+wd+',null,this.value)" style="padding:6px 7px;border:1px solid var(--line2,#d5dde0);border-radius:7px;font-size:12px;background:var(--card,#fff);color:inherit">'+_timeOpts(st.to)+'</select>'
        +'<button onclick="_asSpread('+nm+','+wd+')" style="border:none;background:transparent;font-size:11.5px;font-weight:600;cursor:pointer;color:#2F7F91;padding:0;margin-top:4px;width:100%;text-align:left">Use these hours every day they work</button></div>' : '')
    +'<button onclick="var p=document.getElementById(\'asPop\');if(p)p.remove()" style="margin-top:10px;border:none;background:transparent;font-size:12px;cursor:pointer;color:var(--muted,#6b8087);padding:0">Close</button>';
  document.body.appendChild(pop);
  /* Anchor once and remember it. Every change re-renders the grid and reopens this
     panel, and reopening without the original event used to fall back to a default
     corner -- so the popover hopped across the screen on each tap. */
  try{
    if(ev && ev.currentTarget){
      const r=ev.currentTarget.getBoundingClientRect();
      window._asPopAt={ left: Math.min(window.innerWidth-250, Math.max(8, r.left)),
                        top:  Math.min(window.innerHeight-230, r.bottom+6) };
    }
    const a=window._asPopAt||{left:40, top:120};
    pop.style.left=a.left+'px'; pop.style.top=a.top+'px';
  }catch(e){ pop.style.left='40px'; pop.style.top='120px'; }
  setTimeout(function(){ document.addEventListener('click', function h(e){ const p=document.getElementById('asPop'); if(p&&!p.contains(e.target)){ p.remove(); window._asPopAt=null; document.removeEventListener('click',h); } }); }, 0);
};
window._asSet=async function(name,wd,kind){
  if(kind==='off') await _avUpsert(name,wd,{can_work:false,note:null});
  else if(kind==='all') await _avUpsert(name,wd,{can_work:true,note:null});
  else {
    const row=((window._avail||{})[name]||{})[wd];
    const w=parseWin((row&&row.note)||'') || ['09:00','17:00'];
    await _avUpsert(name,wd,{can_work:true,note:w[0]+'-'+w[1]});
  }
  _asRender(); _asOpen(name,wd,null);
};
window._asWin=async function(name,wd,from,to){
  const row=((window._avail||{})[name]||{})[wd];
  const cur=parseWin((row&&row.note)||'') || ['09:00','17:00'];
  const f=from||cur[0], t=to||cur[1];
  if(f&&t&&t<=f){ alert('The end time needs to be after the start time.'); return; }
  await _avUpsert(name,wd,{can_work:true,note:f+'-'+t});
  _asRender(); _asOpen(name,wd,null);
};
window._asPreset=async function(name,kind){
  /* The shapes that actually recur. Elleen works weekends only -- one click, not five
     screens. */
  const off=kind==='weekends'? [0,1,2,3,4] : kind==='weekdays'? [5,6] : [];
  for(let d=0; d<7; d++){
    if(off.indexOf(d)>=0) await _avUpsert(name,d,{can_work:false,note:null});
    else await _avUpsert(name,d,{can_work:true,note:null});
  }
  _asRender();
};
window._asSpread=async function(name,wd){
  const row=((window._avail||{})[name]||{})[wd];
  const w=parseWin((row&&row.note)||'');
  if(!w) return;
  for(let d=0; d<7; d++){
    if(d===wd) continue;
    const r2=((window._avail||{})[name]||{})[d];
    if(r2 && r2.can_work===false) continue;   // never undo a day off
    await _avUpsert(name,d,{can_work:true,note:w[0]+'-'+w[1]});
  }
  _asRender();
};



/* ---------- Telling people things ----------
   Real reviews of competing tools complain overwhelmingly about this: the schedule got
   built fine, the message about it never arrived. This app had no notification of any
   kind -- no push, no email, nothing -- so publishing a week told nobody.
   Events are recorded as day_items rows (kind 'notif'), which inherits the tenant
   isolation already in place and needs no schema change. Push and email become delivery
   channels reading these same records later; the record is the thing that matters. */
window.notify=async function(opts){
  try{
    const row={
      kind:'notif',
      title: String(opts.title||'').slice(0,180),
      on_date: isoDate(new Date()),
      detail: JSON.stringify({
        body: String(opts.body||'').slice(0,400),
        act: opts.act||'',
        who: Array.isArray(opts.who)? opts.who : (opts.who? [opts.who] : null),  // null = everyone
        from: (state.profile&&state.profile.name)||'',
        at: new Date().toISOString()
      }),
      created_by: state.user && state.user.id
    };
    await sb.from('day_items').insert(row);
  }catch(e){}
};
window.loadNotifs=async function(){
  const me=(myRosterName&&myRosterName())||((state.profile&&state.profile.name)||'');
  const since=isoDate(new Date(Date.now()-14*864e5));
  const r=await sb.from('day_items').select('id,title,detail,on_date').eq('kind','notif').gte('on_date',since).order('id',{ascending:false}).limit(40);
  let seen={}; try{ seen=JSON.parse(localStorage.getItem('notif_seen')||'{}'); }catch(e){}
  const out=[];
  (r.data||[]).forEach(function(x){
    let d={}; try{ d=JSON.parse(x.detail||'{}'); }catch(e){}
    if(d.who && d.who.length && d.who.indexOf(me)<0) return;   // addressed to specific people
    out.push({id:x.id, title:x.title, body:d.body||'', act:d.act||'', at:d.at||x.on_date, unread:!seen[x.id]});
  });
  window._notifs=out; return out;
};
window.markNotifsSeen=function(){
  try{
    let seen={}; try{ seen=JSON.parse(localStorage.getItem('notif_seen')||'{}'); }catch(e){}
    (window._notifs||[]).forEach(function(n){ seen[n.id]=1; });
    localStorage.setItem('notif_seen', JSON.stringify(seen));
  }catch(e){}
};


/* ---------- Cleaning up stations ----------
   The roster import turned every 7shifts "Role" into a station, which was wrong: that
   list mixes real stations (Roller, Cashier), broad categories (BOH, FOH) and ranks
   (Manager, Supervisor/Leader, OJR am/PM). Categories are not stations -- "who can work
   BOH" is unanswerable when BOH contains Baker, Roller and dishes -- and ranks belong on
   the roster, not the skills matrix. And some are plain duplicates: Coffee is Barista.
   So: rename, merge or drop stations, and carry everyone's skills across as you go.
   Merging is the important one -- deleting Coffee would lose who can run the bar. */
window.openStationClean=async function(){
  await loadProfiles(); await loadPositions(); await loadArchived();
  const people=rosterNames().filter(n=>!isArchived(n));
  const list=(state.settings&&Array.isArray(state.settings.stations))?state.settings.stations.slice():[];
  const seen={}; people.forEach(n=>{ (((window._profiles||{})[n]||{}).roles||[]).forEach(st=>{ if(st&&list.indexOf(st)<0) list.push(st); }); });
  window._scList=list.map(function(st){
    const n=people.filter(p=>((((window._profiles||{})[p]||{}).roles)||[]).indexOf(st)>=0).length;
    return {name:st, orig:st, count:n, drop:false, mergeTo:''};
  });
  let w=document.getElementById('scModal'); if(w) w.remove();
  w=document.createElement('div'); w.id='scModal';
  w.style.cssText='position:fixed;inset:0;z-index:10060;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:18px';
  w.innerHTML='<div id="scCard" style="background:var(--card,#fff);color:var(--ink,#111);border-radius:16px;max-width:640px;width:100%;max-height:88vh;overflow:auto;padding:22px 24px;box-shadow:0 20px 60px rgba(0,0,0,.3)"></div>';
  document.body.appendChild(w); _scRender();
};
window._scRender=function(){
  const c=document.getElementById('scCard'); if(!c) return;
  const L=window._scList;
  const RANKY=/^(manager|supervisor|leader|supervisor\/leader|gm|owner|ojr|ojr am|ojr pm|trainer|trainee)$/i;
  const BROAD=/^(boh|foh|back of house|front of house|kitchen)$/i;
  let h='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
    +'<div><div style="font-weight:800;font-size:20px">Tidy up your stations</div>'
    +'<div class="muted" style="font-size:13px;margin-top:4px;line-height:1.55">Rename anything to what your team actually calls it. Merge duplicates so nobody loses a skill. Drop the ones that are ranks or catch-alls rather than a job someone stands at.</div></div>'
    +'<button onclick="var m=document.getElementById(\'scModal\');if(m)m.remove()" style="border:none;background:transparent;font-size:22px;cursor:pointer;line-height:1;color:inherit">&times;</button></div>';
  h+='<div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">';
  L.forEach(function(r,i){
    const flag = RANKY.test(r.orig) ? 'This is a rank, not a station' : (BROAD.test(r.orig) ? 'This is a catch-all, not a station' : '');
    h+='<div style="border:1px solid '+(r.drop?'#E4B8A8':'var(--line2,#d5dde0)')+';background:'+(r.drop?'#F9EDE8':'transparent')+';border-radius:11px;padding:11px 13px">'
      +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
      +'<input value="'+esc(r.name)+'" oninput="_scName('+i+',this.value)" '+(r.drop?'disabled':'')+' style="flex:1;min-width:150px;padding:8px 11px;border:1px solid var(--line2,#d5dde0);border-radius:8px;font-size:13.5px;background:transparent;color:inherit">'
      +'<span class="muted" style="font-size:12px;white-space:nowrap">'+r.count+' '+(r.count===1?'person':'people')+'</span>'
      +'<select onchange="_scMerge('+i+',this.value)" style="padding:8px 9px;border:1px solid var(--line2,#d5dde0);border-radius:8px;font-size:12.5px;background:transparent;color:inherit">'
        +'<option value="">Keep separate</option>'
        + L.map(function(o,j){ return j===i||o.drop? '' : '<option value="'+esc(o.name)+'"'+(r.mergeTo===o.name?' selected':'')+'>Merge into '+esc(o.name)+'</option>'; }).join('')
      +'</select>'
      +'<button onclick="_scDrop('+i+')" style="border:none;background:transparent;font-size:12.5px;font-weight:600;cursor:pointer;color:'+(r.drop?'#2C6E4B':'#A8401C')+'">'+(r.drop?'Keep':'Drop')+'</button>'
      +'</div>'
      + (flag && !r.drop ? '<div style="font-size:11.5px;margin-top:6px;color:#7A5B1E">'+esc(flag)+'</div>' : '')
      + (r.mergeTo ? '<div style="font-size:11.5px;margin-top:6px;color:#2F7F91">Everyone here keeps the skill as <b>'+esc(r.mergeTo)+'</b>.</div>' : '')
      + (!r.drop && !r.mergeTo ? (r.splitTo!=null
          ? '<div style="display:flex;gap:7px;align-items:center;margin-top:8px;flex-wrap:wrap"><span class="muted" style="font-size:12px">and also</span>'
            +'<input value="'+esc(r.splitTo)+'" oninput="_scSplitName('+i+',this.value)" placeholder="second station" style="flex:1;min-width:130px;padding:7px 10px;border:1px solid var(--line2,#d5dde0);border-radius:8px;font-size:13px;background:transparent;color:inherit">'
            +'<button onclick="_scSplit('+i+')" style="border:none;background:transparent;font-size:12.5px;font-weight:600;cursor:pointer;color:#A8401C">Cancel split</button>'
            +'<div style="width:100%;font-size:11.5px;color:#2F7F91">Both stations are created, and everyone who had this one gets both. Prune the ones who should only do one.</div></div>'
          : '<button onclick="_scSplit('+i+')" style="border:none;background:transparent;font-size:12.5px;font-weight:600;cursor:pointer;color:#2F7F91;margin-top:6px;padding:0">Split into two</button>') : '')
      +'</div>';
  });
  h+='</div>';
  h+='<button onclick="_scAdd()" style="margin-top:10px;background:transparent;border:1px dashed var(--line2,#d5dde0);border-radius:9px;padding:9px 14px;font-size:13px;cursor:pointer;color:inherit">+ Add a station</button>';
  h+='<div style="display:flex;gap:9px;margin-top:18px;align-items:center;flex-wrap:wrap">'
    +'<button onclick="_scSave()" id="scGo" style="background:var(--brand,#4a9cad);color:#fff;border:none;border-radius:9px;padding:11px 20px;font-weight:700;cursor:pointer">Save stations</button>'
    +'<button onclick="var m=document.getElementById(\'scModal\');if(m)m.remove()" style="background:transparent;border:1px solid var(--line2,#d5dde0);border-radius:9px;padding:11px 16px;cursor:pointer;color:inherit">Cancel</button>'
    +'<span id="scMsg" class="muted" style="font-size:12.5px"></span></div>';
  c.innerHTML=h;
};
window._scName=function(i,v){ window._scList[i].name=v; };
window._scMerge=function(i,v){ window._scList[i].mergeTo=v; if(v) window._scList[i].drop=false; _scRender(); };
window._scDrop=function(i){ const r=window._scList[i]; r.drop=!r.drop; if(r.drop) r.mergeTo=''; _scRender(); };
window._scSplit=function(i){ const r=window._scList[i]; r.splitTo = (r.splitTo==null? '' : null); _scRender(); };
window._scSplitName=function(i,v){ window._scList[i].splitTo=v; };
window._scAdd=function(){ window._scList.push({name:'', orig:'__new__'+window._scList.length, count:0, drop:false, mergeTo:'', splitTo:null}); _scRender(); };
window._scSave=async function(){
  const L=window._scList, msg=document.getElementById('scMsg'), go=document.getElementById('scGo');
  if(go){ go.disabled=true; go.textContent='Saving…'; }
  // what each old station becomes: itself renamed, something else, or nothing
  /* A station can become nothing (dropped), something else (merged), itself renamed,
     or two stations. Line/Expo is really two jobs with different skills, so splitting
     gives both to everyone who had the original -- the owner then prunes whoever only
     does one. That is far less work than reassigning the station from scratch. */
  const map={};
  L.forEach(function(r){
    const nm=String(r.name||'').trim();
    if(r.drop || (!nm && String(r.orig).indexOf('__new__')===0)) { map[r.orig]=null; return; }
    if(r.mergeTo){ map[r.orig]=[r.mergeTo]; return; }
    const out=[nm||r.orig];
    const sp=String(r.splitTo==null?'':r.splitTo).trim();
    if(sp && out.indexOf(sp)<0) out.push(sp);
    map[r.orig]=out;
  });
  const finalList=[];
  L.forEach(function(r){ const to=map[r.orig]; if(!to) return; to.forEach(function(x){ if(x && finalList.indexOf(x)<0) finalList.push(x); }); });
  const rk=await window._replaceKind('stations', finalList.length? {kind:'stations',title:'stations',on_date:null,detail:JSON.stringify(finalList),created_by:state.user.id} : []);
  if(!rk.ok){ if(msg){ msg.style.color='#B32D2D'; msg.textContent=window._replaceMsg(rk); } if(go){ go.disabled=false; go.textContent='Try again'; } return; }
  state.settings.stations=finalList;
  // carry everyone's skills across, so a rename or merge never silently loses one
  let moved=0;
  const people=rosterNames().filter(n=>!isArchived(n));
  for(const n of people){
    const d=(window._profiles||{})[n]; if(!d||!Array.isArray(d.roles)||!d.roles.length) continue;
    const next=[];
    d.roles.forEach(function(st){
      const to=Object.prototype.hasOwnProperty.call(map,st)? map[st] : [st];
      if(!to) return;
      to.forEach(function(x){ if(x && next.indexOf(x)<0) next.push(x); });
    });
    if(next.join('|')!==d.roles.join('|')){ d.roles=next; try{ _saveProfileNow(n); moved++; }catch(e){} }
  }
  const m=document.getElementById('scModal'); if(m) m.remove();
  alert('Stations saved.\n\n'+finalList.length+' station'+(finalList.length===1?'':'s')+' kept'+(moved?', and '+moved+' '+(moved===1?'person\'s skills were':'people\'s skills were')+' carried across.':'.'));
  try{ vBrain(document.getElementById('view')); }catch(e){}
};

async function teamRoster(v){
  v.innerHTML='<div class="muted">Loading…</div>';
  const [rpf,rsh]=await Promise.all([ sb.from('profiles').select('id,name,role'), sb.from('shifts').select('person_name') ]);
  await loadPositions(); await loadProfiles(); await loadArchived();
  const set=new Set(); rosterNames().forEach(n=>set.add(n)); (rsh.data||[]).forEach(s=>{ if(s.person_name)set.add(s.person_name); });
  const roster=[...set].filter(n=>n&&!isArchived(n)&&n!=='__OPEN__'&&n!=='__open__');
  const groups={}; roster.forEach(n=>{ (groups[posOf(n)]=groups[posOf(n)]||[]).push(n); });
  const ordered=Object.keys(groups).sort((a,b)=>{const ia=POS_ORDER.indexOf(a),ib=POS_ORDER.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b);});
  let h=`<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button onclick="openRosterImport()" style="background:transparent;border:1px solid var(--line2,#d5dde0);border-radius:9px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;color:inherit"><i class="ti ti-upload"></i> Import from another scheduler</button></div><div class="faint" style="font-size:12.5px;margin-bottom:12px">Tap anyone to open their profile — position, birthday, hire date, contact, emergency contact and pay. Positions here flow to the schedule automatically.</div>`;
  if(!roster.length) h+=`<div class="card" style="padding:24px;text-align:center"><div class="faint">No team yet. Add people in Onboarding.</div></div>`;
  ordered.forEach(pos=>{ const c=POS_COL[pos]||'#94A3B8'; h+=`<div class="band" style="background:${c}14;color:${c};border-left:4px solid ${c};margin:14px 0 0">${esc(pos)} <span style="opacity:.7;font-weight:500">· ${groups[pos].length}</span></div><div class="card" style="margin-top:0">`+groups[pos].slice().sort().map(n=>{ const p=profileOf(n); const inits=(n||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); const sub=p.mobile?esc(p.mobile):'Tap to view profile'; return `<div class="row" style="padding:11px 15px;border-bottom:1px solid var(--line);cursor:pointer" onclick='openProfile(${JSON.stringify(n)})'><span class="av">${esc(inits)}</span><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(n)}</div><div class="faint" style="font-size:12px">${sub}</div></div><i class="ti ti-chevron-right" style="color:var(--faint)"></i></div>`; }).join('')+`</div>`; });
  v.innerHTML=h;
}
async function teamFormer(v){
  v.innerHTML='<div class="muted">Loading…</div>';
  await loadPositions();
  const r=await sb.from('day_items').select('*').eq('kind','archived');
  const archRows=(r.data||[]).map(x=>{ let d={}; try{d=JSON.parse(x.detail||'{}');}catch(e){} return {id:x.id,name:x.title,d}; }).sort((a,b)=>a.name.localeCompare(b.name));
  window._archMap={}; archRows.forEach(a=>window._archMap[a.id]=a); window._archived=new Set(archRows.map(a=>a.name));
  let h=`<div class="faint" style="font-size:12.5px;margin-bottom:11px">People who've left. History kept for your records. Open a card for why they left and rehire eligibility.</div>`;
  if(!archRows.length){ h+=`<div class="card" style="padding:26px;text-align:center"><div class="faint">No former team members.</div></div>`; v.innerHTML=h; return; }
  h+=`<input id="fsearch" placeholder="Search former team by name…" oninput="var q=this.value.toLowerCase();var n=0;document.querySelectorAll('#formerlist>[data-fn]').forEach(function(el){var m=el.getAttribute('data-fn').indexOf(q)>=0;el.style.display=m?'':'none';if(m)n++;});var c=document.getElementById('fcount');if(c)c.textContent=q?(n+' of ${archRows.length}'):('${archRows.length} former');" style="width:100%;padding:11px 13px;border:1px solid var(--line2);border-radius:9px;font-size:14px;background:var(--card);color:var(--ink);font-family:inherit"/><div class="faint" id="fcount" style="font-size:12px;margin:8px 0 12px">${archRows.length} former</div>`;
  const rehireMeta={Eligible:['Eligible for rehire','#1B7B3F','#E7F5EC'],Conditional:['Conditional','#B7791F','#FBF0DA'],No:['Do not rehire','#A32D2D','#FCEBEB']};
  h+=`<div id="formerlist">`+archRows.map(a=>{ const rm=rehireMeta[a.d.rehire]||['Rehire — not set','#64748B','#EEF1F4']; const inits=(a.name||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); const sub=[esc(posOf(a.name))]; if(a.d.date)sub.push('left '+esc(a.d.date)); if(a.d.reason)sub.push(esc(a.d.reason)); if(a.d.mobile)sub.push(esc(a.d.mobile)); const fn=esc((a.name+' '+(a.d.reason||'')).toLowerCase()); return `<div class="card" data-fn="${fn}" style="padding:14px 16px;margin-bottom:10px"><div class="row" style="gap:10px"><span class="av">${esc(inits)}</span><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(a.name)}</div><div class="faint" style="font-size:12px">${sub.join(' · ')}</div></div><span class="pill" style="background:${rm[2]};color:${rm[1]};font-size:11px;font-weight:700;white-space:nowrap">${rm[0]}</span></div>${a.d.notes?`<div style="margin-top:9px;font-size:13px;line-height:1.55;color:#444;background:var(--brand-soft);border-radius:8px;padding:9px 11px;white-space:pre-wrap">${esc(a.d.notes)}</div>`:''}<div class="row" style="gap:8px;margin-top:11px"><button class="btn" style="width:auto;padding:6px 11px" onclick='openArchive(${JSON.stringify(a.name)},${a.id})'>Edit</button><button class="btn pri" style="width:auto;padding:6px 11px" onclick='restorePerson(${JSON.stringify(a.name)})'>Restore &amp; rehire</button></div></div>`; }).join('')+`</div>`;
  v.innerHTML=h;
}
const ONBOARD_STEPS=['I-9 employment eligibility verified','E-Verify submitted','W-4 tax form signed','State tax form signed','Direct deposit set up','Employee handbook acknowledged','Food handler card on file','Allergen & safety briefing','Uniform & name tag issued','POS login created','Building tour & emergency exits','Shadow a full shift','Join the academy (sign in with the code)','Start the first training track'];
async function vOnboarding(v){
  if(!canSee(state.page)){ go('home'); return; }
  setTitle('New Hires','Bring a new hire up to speed — checklist, training, and their review milestones');
  v.innerHTML='<div class="muted">Loading…</div>';
  const [rh,rs,rv]=await Promise.all([
    sb.from('hires').select('*').order('start_date',{ascending:false}),
    sb.from('onboarding_steps').select('*').order('position'),
    sb.from('day_items').select('*').eq('kind','review')
  ]);
  await loadPositions();
  const byHire={}; (rs.data||[]).forEach(s=>{ (byHire[s.hire_id]=byHire[s.hire_id]||[]).push(s); });
  const revByHire={}; (rv.data||[]).forEach(x=>{ let d={}; try{ d=typeof x.detail==='string'?JSON.parse(x.detail||'{}'):(x.detail||{}); }catch(e){} d._id=x.id; if(d.hireId!=null)(revByHire[d.hireId]=revByHire[d.hireId]||[]).push(d); });
  window._revByHire=revByHire; window._hires=rh.data||[];
  const todayIso=isoDate(new Date());
  const dueList=[]; (rh.data||[]).forEach(hh=>{ if(!hh.start_date)return; reviewMilestones(hh.start_date).forEach(m=>{ const due=isoDate(new Date(_d(hh.start_date).getTime()+m.d*864e5)); if(!(revByHire[hh.id]||[]).some(r=>r.milestone===m.k) && due<=todayIso){ dueList.push({hh,m,due}); } }); });
  let h='';
  if(dueList.length){ h+=`<div class="card" style="padding:15px 17px;margin-bottom:18px;background:var(--brand-soft);border-color:var(--brand-line)"><div style="font-weight:700;color:var(--brand);font-size:12.5px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:9px"><i class="ti ti-bell"></i> Reviews due now</div>`+dueList.slice(0,10).map(x=>`<div class="row" style="padding:6px 0;border-top:1px solid var(--line);align-items:center;gap:8px"><div style="flex:1;font-size:13.5px"><b>${esc(x.hh.name)}</b> — ${esc(x.m.l)} <span class="faint" style="font-size:12px">· due ${_d(x.due).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span></div><button class="btn pri" style="width:auto;padding:5px 12px" onclick="openReviewMenu(${x.hh.id},'${x.m.k}')">Start</button></div>`).join('')+`</div>`; }
  h+=`<div class="card" style="padding:16px;margin-bottom:18px"><div style="font-weight:700;margin-bottom:4px">Add a new hire</div><div class="faint" style="font-size:12.5px;margin-bottom:11px">Name + position puts them on the schedule, starts their checklist, and schedules their review milestones. Their full profile lives in <b style="color:var(--brand);cursor:pointer" onclick="state.ctx.ttab='roster';go('team')">Team</b>.</div><div class="row" style="gap:8px;flex-wrap:wrap"><input id="hname" placeholder="Full name" style="flex:1;min-width:150px;padding:10px 12px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit"/><select id="hpos" style="padding:10px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit">${POS_PICK.map(o=>`<option value="${o}"${o==='Team Member'?' selected':''}>${o}</option>`).join('')}</select><input id="hdate" type="date" value="${isoDate(new Date())}" style="padding:10px;border:1px solid var(--line2);border-radius:9px;background:var(--card);color:var(--ink);font-family:inherit"/><button class="btn pri" style="width:auto" onclick="addHire()">Add hire</button></div><div class="faint" style="font-size:12px;margin-top:9px">Share your join code so they sign in and start training. Employment paperwork (I-9, W-4) is handled by your onboarding provider.</div></div>`;
  h+=`<div class="sec">In their track</div>`;
  if(!(rh.data||[]).length) h+=`<div class="card" style="padding:26px;text-align:center"><div class="faint">No one in their track right now. Add a hire above to start a checklist and review schedule.</div></div>`;
  h+=(rh.data||[]).map(hh=>{ const st=byHire[hh.id]||[]; const done=st.filter(s=>s.done).length; const pct=st.length?Math.round(done/st.length*100):0; const pos=posOf(hh.name); const c=POS_COL[pos]||'#94A3B8'; const revs=revByHire[hh.id]||[];
    const tl = hh.start_date ? (`<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:11px"><div class="faint" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Review milestones</div><div class="row" style="gap:6px;flex-wrap:wrap">`+reviewMilestones(hh.start_date).map(m=>{ const due=new Date(_d(hh.start_date).getTime()+m.d*864e5); const dueIso=isoDate(due); const rc=revs.filter(r=>r.milestone===m.k); const has=rc.length>0; const isDue=!has&&dueIso<=todayIso; return `<button onclick="openReviewMenu(${hh.id},'${m.k}')" style="border:1px solid ${has?'var(--green)':(isDue?'var(--brand)':'var(--line2)')};background:${has?'rgba(27,123,63,.10)':(isDue?'var(--brand-soft)':'var(--bg)')};color:${has?'var(--green)':(isDue?'var(--brand)':'var(--muted)')};border-radius:8px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;text-align:left">${has?'✓ ':(isDue?'● ':'')}${esc(m.l)}<div style="font-weight:400;font-size:10px;opacity:.85">${has?rc.length+' submitted':due.toLocaleDateString(undefined,{month:'short',day:'numeric'})}</div></button>`; }).join('')+`</div></div>`) : `<div class="faint" style="font-size:12px;margin-top:9px">Add a start date to schedule review milestones.</div>`;
    return `<div class="card" style="padding:15px;margin-bottom:12px"><div class="row"><div style="flex:1;min-width:0"><div style="font-weight:600">${esc(hh.name)} <span class="pill" style="background:${c}14;color:${c};font-size:11px;font-weight:600;margin-left:4px">${esc(pos)}</span></div><div class="faint" style="font-size:12px">Starts ${hh.start_date||'—'} · ${done} of ${st.length} steps</div></div><div style="width:110px"><div class="bar"><i style="width:${pct}%"></i></div></div><button class="btn" style="width:auto;padding:4px 9px;margin-left:10px" onclick="delHire(${hh.id})">✕</button></div><div style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px">${st.map(s=>`<label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:14px;cursor:pointer"><input type="checkbox" ${s.done?'checked':''} onchange="toggleStep(${s.id},this.checked)"/> <span style="${s.done?'text-decoration:line-through;color:#999':''}">${esc(s.label)}</span></label>`).join('')}</div>${tl}</div>`;
  }).join('');
  v.innerHTML=h;
}
window.addHire=async function(){ const name=val('hname'); if(!name)return; const pos=(document.getElementById('hpos')||{}).value||'Team Member'; const ins=await sb.from('hires').insert({name,role:pos,start_date:document.getElementById('hdate').value||null}).select(); if(ins.error){alert(ins.error.message);return;} const hid=ins.data&&ins.data[0]&&ins.data[0].id; if(hid) await sb.from('onboarding_steps').insert(ONBOARD_STEPS.map((l,i)=>({hire_id:hid,label:l,position:i}))); await setPos(name,pos); vOnboarding(document.getElementById('view')); };
window.toggleStep=async function(id,done){ await sb.from('onboarding_steps').update({done}).eq('id',id); };
window.delHire=async function(id){ await sb.from('onboarding_steps').delete().eq('hire_id',id); await sb.from('hires').delete().eq('id',id); vOnboarding(document.getElementById('view')); };
/* ---------- New-hire review milestones + self/leadership forms ---------- */
const REVIEW_DIMS=['Learning the role','Following our standards','Teamwork & attitude','Reliability & showing up'];
function reviewMilestones(startISO){ const arr=[{k:'w1',d:7,l:'1-week check-in'},{k:'w2',d:14,l:'2-week check-in'},{k:'d30',d:30,l:'30-day review'},{k:'d60',d:60,l:'60-day review'},{k:'d90',d:90,l:'90-day review'}]; if(startISO){ const el=Math.floor((Date.now()-_d(startISO).getTime())/864e5); let dd=270,g=0; while(dd<=el+185 && g++<10){ arr.push({k:'m'+dd,d:dd,l:'Follow-up review'}); dd+=180; } } return arr; }
function _milLabel(k){ const map={w1:'1-week check-in',w2:'2-week check-in',d30:'30-day review',d60:'60-day review',d90:'90-day review'}; return map[k]||'Follow-up review'; }
function _revOverlay(inner){ let ov=document.getElementById('revOv'); if(ov)ov.remove(); ov=document.createElement('div'); ov.id='revOv'; ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto'; const card=document.createElement('div'); card.style.cssText='background:var(--card);color:var(--ink);border-radius:14px;padding:22px;max-width:480px;width:100%;box-shadow:0 14px 48px rgba(0,0,0,.34);margin:auto'; card.innerHTML=inner; ov.appendChild(card); ov.onclick=e=>{ if(e.target===ov) ov.remove(); }; document.body.appendChild(ov); return card; }
window.closeReview=function(){ const o=document.getElementById('revOv'); if(o)o.remove(); };
window.openReviewMenu=function(hireId,mkey){ const hh=(window._hires||[]).find(x=>x.id==hireId); if(!hh)return; const revs=((window._revByHire||{})[hireId]||[]).filter(r=>r.milestone===mkey); const hasSelf=revs.some(r=>r.role==='self'); const leadN=revs.filter(r=>r.role==='leadership').length; let h=`<div style="font-weight:800;font-size:17px;margin-bottom:2px">${esc(hh.name)}</div><div class="faint" style="font-size:13px;margin-bottom:16px">${esc(_milLabel(mkey))}</div>`; h+=`<button class="btn pri" style="width:100%;margin-bottom:9px;justify-content:flex-start" onclick="openReviewForm(${hireId},'${mkey}','leadership')"><i class="ti ti-clipboard-check"></i> ${leadN?'Add another leadership review':'Fill out leadership review'}${leadN?` (${leadN} so far)`:''}</button>`; h+=`<button class="btn" style="width:100%;margin-bottom:9px;justify-content:flex-start" onclick="openReviewForm(${hireId},'${mkey}','self')"><i class="ti ti-user"></i> ${hasSelf?'Add self review':'Fill out self review'}</button>`; if(revs.length) h+=`<button class="btn" style="width:100%;margin-bottom:9px;justify-content:flex-start" onclick="viewReviews(${hireId},'${mkey}')"><i class="ti ti-eye"></i> View submitted (${revs.length})</button>`; h+=`<button class="btn" style="width:100%;color:var(--muted)" onclick="closeReview()">Close</button>`; _revOverlay(h); };
window.openReviewForm=function(hireId,mkey,role){ const hh=(window._hires||[]).find(x=>x.id==hireId); if(!hh)return; const isSelf=role==='self'; let h=`<div style="font-weight:800;font-size:17px;margin-bottom:2px">${isSelf?'Self review':'Leadership review'}</div><div class="faint" style="font-size:13px;margin-bottom:16px">${esc(hh.name)} · ${esc(_milLabel(mkey))}</div>`; h+=`<div class="faint" style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">${isSelf?'Rate yourself':'Rate how they&rsquo;re doing'} (1 = needs work, 5 = excellent)</div>`; h+=REVIEW_DIMS.map((d,i)=>`<div class="row" style="align-items:center;gap:10px;margin-bottom:8px"><div style="flex:1;font-size:13.5px">${esc(d)}</div><select id="rd${i}" style="padding:7px 9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit"><option value="">—</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></div>`).join(''); const ta=(id,ph)=>`<textarea id="${id}" placeholder="${ph}" style="width:100%;min-height:62px;padding:9px 11px;border:1px solid var(--line2);border-radius:9px;font-family:inherit;font-size:13.5px;line-height:1.5;color:var(--ink);background:var(--card);margin-bottom:10px"></textarea>`; h+=`<div style="margin-top:6px">`+(isSelf?ta('rn1','What I&rsquo;m proud of so far…')+ta('rn2','Where I&rsquo;d like more help or training…'):ta('rn1','What&rsquo;s going well…')+ta('rn2','What to work on next…'))+`</div>`; h+=`<div class="row" style="align-items:center;gap:10px;margin-bottom:14px"><div style="font-size:13.5px;font-weight:600">${isSelf?'How do you feel it&rsquo;s going?':'Overall'}</div><select id="rot" style="padding:7px 9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit"><option value="">—</option><option value="on">On track</option><option value="watch">Keep an eye</option><option value="concern">Needs support</option></select></div>`; h+=`<div class="row" style="gap:8px"><button class="btn pri" style="width:auto" onclick="saveReview(${hireId},'${mkey}','${role}')">Save review</button><button class="btn" style="width:auto" onclick="openReviewMenu(${hireId},'${mkey}')">Back</button></div>`; _revOverlay(h); };
window.saveReview=async function(hireId,mkey,role){ const hh=(window._hires||[]).find(x=>x.id==hireId); if(!hh)return; const ratings={}; REVIEW_DIMS.forEach((d,i)=>{ const el=document.getElementById('rd'+i); if(el&&el.value) ratings[d]=+el.value; }); const notes={a:val('rn1'),b:val('rn2')}; const onTrack=(document.getElementById('rot')||{}).value||''; const m=reviewMilestones(hh.start_date).find(x=>x.k===mkey)||{d:0}; const due=hh.start_date?isoDate(new Date(_d(hh.start_date).getTime()+m.d*864e5)):isoDate(new Date()); const detail={hireId:hireId,hireName:hh.name,milestone:mkey,role:role,reviewer:(state.profile&&state.profile.name)||'',ratings:ratings,notes:notes,onTrack:onTrack,at:new Date().toISOString()}; const e=await sb.from('day_items').insert({kind:'review',on_date:due,title:hh.name+' · '+mkey+' · '+role,detail:JSON.stringify(detail),created_by:state.user.id}); if(e&&e.error){ alert(e.error.message); return; } closeReview(); vOnboarding(document.getElementById('view')); };
window.viewReviews=function(hireId,mkey){ const revs=((window._revByHire||{})[hireId]||[]).filter(r=>r.milestone===mkey); const hh=(window._hires||[]).find(x=>x.id==hireId); const otLbl={on:'On track',watch:'Keep an eye',concern:'Needs support'}; let h=`<div style="font-weight:800;font-size:17px;margin-bottom:2px">${esc(hh?hh.name:'')}</div><div class="faint" style="font-size:13px;margin-bottom:14px">${esc(_milLabel(mkey))} · ${revs.length} submitted</div>`; if(revs.length>=2){ h+=`<button class="btn" style="width:100%;margin-bottom:6px" onclick="aiReviewSummary(${hireId},'${mkey}')">✨ AI summary + self-awareness gap check</button><div id="revAiBox" style="margin-bottom:12px"></div>`; } h+=revs.map(r=>{ const rd=Object.keys(r.ratings||{}).map(k=>`${esc(k)}: <b>${r.ratings[k]}</b>`).join(' · '); return `<div class="card" style="padding:13px 15px;margin-bottom:10px;box-shadow:none;border:1px solid var(--line)"><div style="font-size:11.5px;font-weight:700;color:${r.role==='self'?'var(--muted)':'var(--brand)'};text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px">${r.role==='self'?'Self review':'Leadership'}${r.reviewer?' · '+esc(r.reviewer):''}${r.onTrack?' · '+(otLbl[r.onTrack]||''):''}</div>${rd?`<div style="font-size:12.5px;margin-bottom:6px">${rd}</div>`:''}${r.notes&&r.notes.a?`<div style="font-size:13px;margin-bottom:4px">${esc(r.notes.a)}</div>`:''}${r.notes&&r.notes.b?`<div style="font-size:13px;color:var(--muted)">${esc(r.notes.b)}</div>`:''}</div>`; }).join(''); h+=`<button class="btn" style="width:100%;margin-top:4px" onclick="openReviewMenu(${hireId},'${mkey}')">Back</button>`; _revOverlay(h); };
window.aiReviewSummary=async function(hireId,mkey){ const revs=((window._revByHire||{})[hireId]||[]).filter(r=>r.milestone===mkey); const box=document.getElementById('revAiBox'); if(!box)return; box.innerHTML='<div class="faint" style="font-size:13px;padding:6px 0">Reading the reviews…</div>'; const ctx=revs.map(r=>{ const rd=Object.keys(r.ratings||{}).map(k=>k+'='+r.ratings[k]).join(', '); return (r.role==='self'?'SELF':'LEADERSHIP'+(r.reviewer?' ('+r.reviewer+')':''))+' — ratings: '+(rd||'none')+'. Going well: '+((r.notes&&r.notes.a)||'-')+'. Work on: '+((r.notes&&r.notes.b)||'-')+'. Overall: '+(r.onTrack||'-'); }).join('\n'); const q='Combine these new team member reviews into one short manager-ready summary: (1) overall how they are doing, (2) the main strengths, (3) what to work on, and (4) any SELF-AWARENESS GAP — a dimension where the person rated themselves clearly higher or lower than leadership did (name the dimension and the direction). Concrete, brief, plain restaurant language. Do not invent anything not in the reviews.'; const ans=await aiCall({mode:'reviewsum',question:q,context:ctx}); box.innerHTML= ans ? `<div style="font-size:13.5px;line-height:1.6;white-space:pre-wrap;background:var(--brand-soft);border-radius:9px;padding:13px 15px">${esc(ans)}</div>` : '<div class="faint" style="font-size:13px">AI is busy — try again in a moment.</div>'; };

/* ---------- Calendar (deliveries, holidays, events, deep cleans) ---------- */
function nthWeekday(year,month,weekday,n){ const first=new Date(year,month-1,1); const fd=first.getDay(); const day=1+((weekday-fd+7)%7)+(n-1)*7; return new Date(year,month-1,day); }
function lastWeekday(year,month,weekday){ const last=new Date(year,month,0); const ld=last.getDay(); const day=last.getDate()-((ld-weekday+7)%7); return new Date(year,month-1,day); }
function usHolidays(year){ const p=n=>String(n).padStart(2,'0'); const D=(m,day)=>year+'-'+p(m)+'-'+p(day); const W=dt=>dt.getFullYear()+'-'+p(dt.getMonth()+1)+'-'+p(dt.getDate()); return [
  {date:D(1,1),name:"New Year's Day",closed:false},{date:W(nthWeekday(year,1,1,3)),name:"MLK Day",closed:false},{date:D(2,14),name:"Valentine's Day",closed:false},{date:W(nthWeekday(year,2,1,3)),name:"Presidents' Day",closed:false},{date:W(nthWeekday(year,5,0,2)),name:"Mother's Day",closed:false},{date:W(lastWeekday(year,5,1)),name:"Memorial Day",closed:false},{date:W(nthWeekday(year,6,0,3)),name:"Father's Day",closed:false},{date:D(6,19),name:"Juneteenth",closed:false},{date:D(7,4),name:"Independence Day",closed:false},{date:W(nthWeekday(year,9,1,1)),name:"Labor Day",closed:false},{date:D(10,31),name:"Halloween",closed:false},{date:D(11,11),name:"Veterans Day",closed:false},{date:W(nthWeekday(year,11,4,4)),name:"Thanksgiving",closed:true},{date:D(12,24),name:"Christmas Eve",closed:false},{date:D(12,25),name:"Christmas Day",closed:true},{date:D(12,31),name:"New Year's Eve",closed:false}
]; }
const CAL_KINDS={delivery:['🚚','Delivery'],holiday:['🎉','Holiday'],event:['⭐','Event'],rm:['🔧','Repair / maint.'],clean:['🧽','Deep clean'],order:['🛍️','Order'],note:['📝','Note'],task:['📌','Task'],people:['👋','People']};
function monthMeta(ym){ const a=ym.split('-'); const y=+a[0],m=+a[1]; const dim=new Date(y,m,0).getDate(); const first=new Date(y,m-1,1); return {y,m,dim,startDow:(first.getDay()+6)%7}; }
async function vCalendar(v){
  const now=new Date(); const ym=state.ctx.cal||(now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'));
  const mm=monthMeta(ym); const y=mm.y,m=mm.m,dim=mm.dim,startDow=mm.startDow;
  setTitle('Calendar', new Date(y,m-1,1).toLocaleDateString(undefined,{month:'long',year:'numeric'}));
  const pad=n=>String(n).padStart(2,'0'); const first=y+'-'+pad(m)+'-01'; const last=y+'-'+pad(m)+'-'+pad(dim);
  let data;
  if(state.calCache && state.calCache.ym===ym){ data=state.calCache.data; }
  else { v.innerHTML='<div class="muted">Loading…</div>'; const r=await sb.from('day_items').select('*').gte('on_date',first).lte('on_date',last).order('created_at'); data=r.data||[]; state.calCache={ym,data}; }
  const CAL_HIDE=new Set(['pos','ojr','mission','vision','pool','archived','pdates','profile','covrules','stations','daylog','cltmpl','clrun','actual','punch','hourly']);
  const byd={}; (data||[]).forEach(it=>{ if(!CAL_KINDS[it.kind])return; (byd[it.on_date]=byd[it.on_date]||[]).push(it); }); // whitelist: only real calendar kinds show — never internal rows like csconfig
  const hol={}; usHolidays(y).forEach(x=>hol[x.date]=x);
  const todayIso=isoDate(new Date()); const sel=state.ctx.day||(ym===todayIso.slice(0,7)?todayIso:first);
  let h=`<div class="sched-bar"><div class="sched-nav"><button class="iconbtn" aria-label="Previous month" onclick="calMonth(-1)"><i class="ti ti-chevron-left"></i></button><button class="iconbtn" aria-label="Next month" onclick="calMonth(1)"><i class="ti ti-chevron-right"></i></button><button class="btn" style="width:auto" onclick="calMonth(0)">This month</button></div><div style="font-size:18px;font-weight:600">${new Date(y,m-1,1).toLocaleDateString(undefined,{month:'long',year:'numeric'})}</div></div>`;
  h+=`<div class="calgrid">`+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<div class="calhd">${d}</div>`).join('');
  for(let i=0;i<startDow;i++) h+=`<div class="calcell empty"></div>`;
  for(let d=1;d<=dim;d++){ const iso=y+'-'+pad(m)+'-'+pad(d); const its=byd[iso]||[]; const isT=iso===todayIso; const isS=iso===sel; const hx=hol[iso]; const holChip=hx?`<div class="calchip" style="background:var(--amber-soft);color:var(--amber)">🎉 ${esc(hx.name)}</div>`:'';
    const nDots=its.length+(hx?1:0); const dots=nDots?`<div class="caldots">`+(hx?`<span class="caldot hol"></span>`:'')+its.slice(0,7).map(()=>`<span class="caldot"></span>`).join('')+`</div>`:'';
    h+=`<div class="calcell${isT?' today':''}${isS?' sel':''}" onclick="calPick('${iso}')"><div class="cald">${d}</div>${holChip}`+its.slice(0,3).map(it=>`<div class="calchip">${(CAL_KINDS[it.kind]||['•'])[0]} ${esc(it.title)}</div>`).join('')+(its.length>3?`<div class="calmore">+${its.length-3} more</div>`:'')+dots+`</div>`;
  }
  h+=`</div>`;
  const selIts=byd[sel]||[]; const selLbl=new Date(sel+'T00:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  if(hol[sel]) h+=`<div class="card" style="padding:12px 15px;margin-bottom:10px;background:var(--amber-soft);border-color:var(--amber)"><b style="color:var(--amber)">🎉 ${esc(hol[sel].name)}</b> <span class="muted" style="font-size:13px">${hol[sel].closed?"— closed. End of day: perishables prepped today are waste after close, so don't over-prep.":"— banks and government closed, so expect it busier. Bump prep and staffing."}</span></div>`;
  h+=`<div class="sec">${esc(selLbl)}</div><div class="card">`+(selIts.length?selIts.map(it=>`<div class="lesson-row"><div style="font-size:16px">${(CAL_KINDS[it.kind]||['•'])[0]}</div><div style="flex:1;min-width:0"><div style="font-weight:500;${it.done?'text-decoration:line-through;color:#999':''}">${esc(it.title)}</div>${it.detail?`<div class="faint" style="font-size:12px">${esc(it.detail)}</div>`:''}</div><button class="btn" style="width:auto" onclick="toggleDayItem(${it.id},${it.done?'false':'true'})">${it.done?'✓ Done':'Mark done'}</button><button class="btn" style="width:auto;padding:4px 9px" onclick="delDayItem(${it.id})">✕</button></div>`).join(''):`<div style="padding:20px;text-align:center" class="faint">Nothing scheduled.</div>`)+`</div>`;
  h+=`<div class="card" style="padding:14px;margin-top:10px"><div style="font-weight:600;font-size:13px;margin-bottom:8px">Add to ${esc(selLbl)}</div><div class="row" style="gap:8px;flex-wrap:wrap"><select id="calkind" style="padding:9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit">`+Object.keys(CAL_KINDS).map(k=>`<option value="${k}">${CAL_KINDS[k][1]}</option>`).join('')+`</select><input id="caltitle" placeholder="What's happening?" onkeydown="if(event.key==='Enter')calAdd('${sel}')" style="flex:1;min-width:150px;padding:9px 11px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit"/></div><div class="row" style="gap:8px;margin-top:8px"><input id="caldetail" placeholder="Details (optional)" onkeydown="if(event.key==='Enter')calAdd('${sel}')" style="flex:1;padding:9px 11px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit"/><button class="btn pri" style="width:auto" onclick="calAdd('${sel}')">Add</button></div><div class="faint" style="font-size:12px;margin-top:7px">A holiday auto-adds a prep &amp; staffing heads-up to the Lineup the day before and the day of.</div></div>`;
  v.innerHTML=h;
}
window.calMonth=function(n){ const now=new Date(); let ym=state.ctx.cal||(now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')); if(n===0){ ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'); } else { const a=ym.split('-'); let y=+a[0],m=+a[1]; m+=n; if(m<1){m=12;y--;} if(m>12){m=1;y++;} ym=y+'-'+String(m).padStart(2,'0'); } state.ctx.cal=ym; state.ctx.day=null; vCalendar(document.getElementById('view')); };
window.calPick=function(iso){ state.ctx.day=iso; vCalendar(document.getElementById('view')); };
window.calAdd=async function(iso){ const kind=document.getElementById('calkind').value; const title=val('caltitle'); if(!title)return; const detail=val('caldetail'); await sb.from('day_items').insert({title,kind,detail,on_date:iso,created_by:state.user.id}); if(kind==='holiday'){ const d=new Date(iso+'T00:00:00'); const prev=new Date(d); prev.setDate(prev.getDate()-1); await sb.from('day_items').insert([{title:title+' tomorrow — prep extra & pull more product',kind:'note',detail:'Auto-added from calendar. Consider extra staff.',on_date:isoDate(prev),created_by:state.user.id},{title:title+' today — extra product & staffing',kind:'note',detail:'Auto-added from calendar.',on_date:iso,created_by:state.user.id}]); } state.ctx.day=iso; state.calCache=null; vCalendar(document.getElementById('view')); };

/* ---------- boot ---------- */
async function vSettings(v){
  if(!canSee(state.page)){ go('home'); return; }
  setTitle("Settings","Make it yours");
  /* This read state.settings without loading it, so arriving here on a fresh page render
     showed built-in defaults rather than the restaurant's saved values -- and every card
     has a Save button. Ten real stations displayed as the three factory ones, one click
     from being overwritten along with every skill assignment attached to them. */
  v.innerHTML='<div class="muted">Loading\u2026</div>';
  try{ await loadSettings(); }catch(e){}
  const s=state.settings||{};
  try{ const _rpf=await sb.from('profiles').select('name'); window._profNames=(_rpf.data||[]).map(p=>p.name).filter(Boolean); }catch(e){} // grant picker lists real login accounts so a grant keys to the right person
  v.innerHTML=`<div class="card" style="padding:22px;max-width:480px">
    <div style="margin-bottom:18px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Academy name</label><input id="setname" type="text" value="${esc(s.academy_name||'')}" style="width:100%;padding:10px 12px;border:1px solid var(--line2);border-radius:9px;font-size:14px;background:var(--card);color:var(--ink);font-family:inherit"/></div>
    <div style="margin-bottom:18px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Brand color</label><div class="row" style="gap:11px"><input id="setcolor" type="color" value="${s.brand_color||DEFAULT_BRAND}" style="width:54px;height:38px;border:1px solid var(--line2);border-radius:8px;background:var(--card);padding:2px;cursor:pointer"/><span class="muted" style="font-size:13px">Pick your restaurant's color — the app matches it instantly.</span></div></div>
    <div style="margin-bottom:20px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Logo</label><div class="row" style="gap:12px">${s.logo_url?`<img src="${s.logo_url}" style="width:48px;height:48px;border-radius:10px;object-fit:cover;border:1px solid var(--line)"/>`:`<div style="width:48px;height:48px;border-radius:10px;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px">${esc((s.academy_name||'A').charAt(0).toUpperCase())}</div>`}<div><input id="setlogo" type="file" accept="image/*" style="font-size:13px"/><div class="faint" style="font-size:12px;margin-top:4px">PNG or JPG, square works best.</div></div></div></div>
    <div style="margin-bottom:20px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Team join code</label><input id="setjoin" type="text" value="${esc(s.join_code||'')}" placeholder="e.g. SIDEWALK" style="width:100%;max-width:220px;padding:10px 12px;border:1px solid var(--line2);border-radius:9px;font-size:14px;background:var(--card);color:var(--ink);font-family:inherit;letter-spacing:1px"/><div class="faint" style="font-size:12px;margin-top:6px">New team members enter this code to join — it keeps strangers out. Post it in the restaurant, or have them scan below.</div>${s.join_code?`<div style="margin-top:12px;display:flex;align-items:center;gap:14px"><img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(location.origin+'/?join='+encodeURIComponent(s.join_code))}" style="width:104px;height:104px;border:1px solid var(--line);border-radius:10px;padding:6px;background:#fff"/><div class="muted" style="font-size:13px">Scan it and it opens the sign-up screen with the code <b>${esc(s.join_code)}</b> already filled in &mdash; they just add their name, email, and a password.</div></div><div class="row" style="gap:8px;margin-top:12px"><button class="btn" style="width:auto" onclick="copyInvite('${esc(s.join_code)}')"><i class="ti ti-copy"></i> Copy invite</button><button class="btn" style="width:auto" onclick="shareInvite('${esc(s.join_code)}')"><i class="ti ti-send"></i> Text / Email</button></div>`:''}</div>
    <div class="row"><button class="btn pri" style="width:auto" onclick="saveSettings()">Save</button><span class="muted" id="setmsg" style="font-size:13px;margin-left:10px"></span></div>
  </div>
  <div class="card" style="padding:22px;max-width:480px;margin-top:16px"><div style="font-size:13px;font-weight:600;margin-bottom:6px">Stations &amp; skills</div><div class="faint" style="font-size:12px;margin-bottom:12px">These now live in <b>The Brain</b>, together with who can work each one, so there is one place to change them instead of two that can disagree.</div><button class="btn" style="width:auto" onclick="go('brain')">Open The Brain</button></div>
  <div class="card" data-savebar="saveScheduleRules|Scheduling and labor rules" style="padding:22px;max-width:480px;margin-top:16px"><div style="font-size:13px;font-weight:600;margin-bottom:6px">Scheduling &amp; labor rules</div><div class="faint" style="font-size:12px;margin-bottom:14px">Set your area so the schedule flags overtime, meal breaks, rest gaps, and advance-notice for you. This is a helpful heads-up, not legal advice or a compliance guarantee.</div>
    <div style="margin-bottom:16px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Your area (labor law)</label><select id="setlaw" style="width:100%;max-width:300px;padding:10px 12px;border:1px solid var(--line2);border-radius:9px;font-size:14px;background:var(--card);color:var(--ink);font-family:inherit">${LAW_OPTS.map(o=>`<option value="${o[0]}"${(s.law_jurisdiction||'AZ')===o[0]?' selected':''}>${esc(o[1])}</option>`).join('')}</select><div class="faint" style="font-size:12px;margin-top:5px">Pick the strictest that applies to your restaurant. Don't see yours? Start with your state.</div></div>
    <div style="margin-bottom:18px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Open floor — earliest start</label><input id="setfloor" type="time" value="${esc(s.open_floor||'05:30')}" style="padding:10px 12px;border:1px solid var(--line2);border-radius:9px;font-size:14px;background:var(--card);color:var(--ink);font-family:inherit"/><div class="faint" style="font-size:12px;margin-top:5px">The earliest anyone can be scheduled to start — the draft won't place a shift before this.</div></div>
    <div class="row"><button class="btn pri" style="width:auto" onclick="saveScheduleRules()">Save</button><span class="muted" id="schrulemsg" style="font-size:13px;margin-left:10px"></span></div></div>
  <div class="card" style="padding:22px;max-width:520px;margin-top:16px"><div style="font-size:13px;font-weight:600;margin-bottom:6px">Access &amp; permissions</div><div class="faint" style="font-size:12px;margin-bottom:12px">Set the minimum role that can open each area. Owners always see everything. A person's role comes from their position on the team — Owner, Manager, Supervisor, or everyone else counts as Team member.</div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="color:var(--muted)"><th style="text-align:left;padding:5px 8px">Area</th><th style="text-align:left;padding:5px 8px">Who can open it</th></tr></thead><tbody>${Object.keys(PERM_LABELS).map(pg=>`<tr style="border-top:1px solid var(--line)"><td style="padding:7px 8px;font-weight:600">${esc(PERM_LABELS[pg])}</td><td style="padding:7px 8px"><select class="permSel" data-pg="${pg}" onchange="savePerms()" style="padding:7px 9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit">${[5,4,3,2,1].map(r=>`<option value="${r}"${permOf(pg)===r?' selected':''}>${ROLE_LABELS[r]}${r===1?' (everyone)':(r===5?' only':' and up')}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div><div style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px"><div class="row" style="gap:10px;align-items:center;flex-wrap:wrap"><span style="font-size:13px;font-weight:600;flex:1;min-width:180px">Team members' schedule view</span><select id="teamViewSel" onchange="savePerms()" style="padding:7px 9px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit"><option value="team"${(!state.perms||state.perms._teamView!=='own')?' selected':''}>Whole team schedule (standard)</option><option value="own"${(state.perms&&state.perms._teamView==='own')?' selected':''}>Only their own shifts</option></select></div><div class="faint" style="font-size:11.5px;margin-top:5px">Supervisors and up always see the whole roster. This only changes what a Team member sees.</div></div><div class="row" style="margin-top:14px"><button class="btn pri" style="width:auto" onclick="savePerms()">Save access levels</button><span class="muted" id="permsg" style="font-size:13px;margin-left:10px"></span></div></div>
  <div class="card" style="padding:22px;max-width:520px;margin-top:16px"><div style="font-size:13px;font-weight:600;margin-bottom:6px">Give one person extra access</div><div class="faint" style="font-size:12px;margin-bottom:12px">On top of their role, let a specific person into one or more areas &mdash; like a scheduler who's still a team member. Pick the person, check the areas, Save. (Owners already see everything.)</div><div id="grantList" style="margin-bottom:14px">${_grantListHTML()}</div><div class="faint" style="font-size:11.5px;font-weight:700;margin-bottom:5px">Person</div><select id="grantWho" onchange="grantSel()" style="width:100%;max-width:300px;padding:9px 11px;border:1px solid var(--line2);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit;margin-bottom:14px">${_grantRoster().map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select><div class="faint" style="font-size:11.5px;font-weight:700;margin-bottom:6px">Extra areas they can open</div><div id="grantPages" style="display:flex;flex-wrap:wrap;gap:13px;margin-bottom:14px">${_grantPageList().map(pg=>`<label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" class="grantPg" value="${pg}"/> ${esc(PERM_LABELS[pg]||pg)}</label>`).join('')}</div><div class="row"><button class="btn pri" style="width:auto" onclick="saveUserGrant()">Save this person's access</button><span class="muted" id="grantMsg" style="font-size:13px;margin-left:10px"></span></div></div>`;
  const ci=document.getElementById('setcolor'); if(ci) ci.addEventListener('input',e=>applyBrand(e.target.value));
  if(typeof grantSel==='function') grantSel();
}
function _addStationPill(v){ const list=document.getElementById('stationList'); if(!list||!v)return; const span=document.createElement('span'); span.setAttribute('data-st',v); span.style.cssText='background:var(--bg);border:1px solid var(--line2);border-radius:8px;padding:6px 10px;font-size:13px;display:inline-flex;align-items:center;gap:6px'; span.textContent=v; const x=document.createElement('span'); x.textContent='×'; x.style.cssText='cursor:pointer;color:#B32D2D;font-weight:700;margin-left:2px'; x.onclick=function(){ span.remove(); }; span.appendChild(x); list.appendChild(span); }
window.addStation=function(){ const inp=document.getElementById('stationNew'); const v=(inp.value||'').trim(); if(!v)return; if([...document.querySelectorAll('#stationList [data-st]')].some(e=>(e.getAttribute('data-st')||'').toLowerCase()===v.toLowerCase())){ inp.value=''; return; } _addStationPill(v); inp.value=''; inp.focus(); };
window.saveStations=async function(){ window.clearDirty&&window.clearDirty(); const arr=[...document.querySelectorAll('#stationList [data-st]')].map(e=>e.getAttribute('data-st')).filter(Boolean);
  /* The editor this belonged to has moved to the Brain. If it is ever called without that
     editor on screen it would read an empty list and save it, wiping every station and the
     skills attached to them. Refuse rather than destroy. */
  if(!document.getElementById('stationList')) return; const m=document.getElementById('stmsg'); if(m){m.style.color='';m.textContent='Saving…';}
  const _rk=await window._replaceKind('stations', arr.length?{kind:'stations',title:'stations',on_date:null,detail:JSON.stringify(arr),created_by:state.user.id}:[]);
  if(!_rk.ok){ if(m){m.style.color='#B32D2D';m.textContent=window._replaceMsg(_rk);} return; }
  state.settings.stations=arr; if(m){m.style.color='';m.textContent='Saved ✓';} };
window.saveScheduleRules=async function(){ window.clearDirty&&window.clearDirty(); const law=(document.getElementById('setlaw')||{}).value||'AZ'; const floor=(document.getElementById('setfloor')||{}).value||'05:30'; const m=document.getElementById('schrulemsg'); if(m)m.textContent='Saving…'; try{ if(state.profile && state.profile.tenant_id){ const r=await sb.from('tenants').update({law_jurisdiction:law, open_floor:floor}).eq('id',state.profile.tenant_id); if(r&&r.error){ if(m)m.textContent='Could not save: '+r.error.message; return; } } else { const r=await sb.from('settings').update({law_jurisdiction:law, open_floor:floor, updated_at:new Date().toISOString()}).eq('id',1); if(r&&r.error){ if(m)m.textContent='Could not save: '+r.error.message; return; } } }catch(e){ if(m)m.textContent='Could not save.'; return; } state.settings=Object.assign({}, state.settings, {law_jurisdiction:law, open_floor:floor}); if(m)m.textContent='Saved ✓'; };
/* ---------- Unsaved-changes guard ----------
   A save button you have to scroll to find is the same as no save button. Any card marked
   data-savebar="fnName|Label" raises a sticky bar the moment you change something in it,
   and leaving the page asks first. */
window._dirty=null;
window.markDirty=function(saveFn,label){ if(window._dirty&&window._dirty.save===saveFn) return; window._dirty={save:saveFn,label:label||''}; _renderDirtyBar(); };
window.clearDirty=function(){ window._dirty=null; _renderDirtyBar(); };
function _renderDirtyBar(){
  var el=document.getElementById('dirtybar');
  if(!window._dirty){ if(el) el.remove(); return; }
  if(!el){ el=document.createElement('div'); el.id='dirtybar'; document.body.appendChild(el); }
  el.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:9998;background:#1A1A1A;color:#fff;padding:12px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;box-shadow:0 -4px 20px rgba(0,0,0,.22)';
  el.innerHTML='<span style="font-size:13.5px;font-weight:700;flex:1;min-width:150px">Unsaved changes'+(window._dirty.label?' &middot; '+esc(window._dirty.label):'')+'</span>'
    +'<button onclick="_dirtyDiscard()" style="border:1px solid rgba(255,255,255,.45);background:transparent;color:#fff;border-radius:9px;padding:8px 14px;font-size:13px;font-family:inherit;cursor:pointer">Discard</button>'
    +'<button onclick="_dirtySave()" style="border:none;background:var(--accent);color:#3A2B00;font-weight:800;border-radius:9px;padding:8px 16px;font-size:13px;font-family:inherit;cursor:pointer">Save now</button>';
}
window._dirtySave=async function(){ var d=window._dirty; if(!d) return; try{ await d.save(); }catch(e){} window.clearDirty(); };
window._dirtyDiscard=function(){ window.clearDirty(); try{ if(typeof render==='function') render(); }catch(e){} };
function _dirtyWatch(e){
  var t=e.target; if(!t||!t.closest) return;
  var box=t.closest('[data-savebar]'); if(!box) return;
  var spec=(box.getAttribute('data-savebar')||'').split('|');
  var fn=window[spec[0]]; if(typeof fn!=='function') return;
  var arg=box.getAttribute('data-savearg'); // some save fns need an id (e.g. which track) — bind it so "Save now" works
  var key=spec[0]+'|'+(arg||'');
  if(window._dirty && window._dirty._key===key) return; // already tracking this exact form
  var save=(arg!=null&&arg!=='')?function(){return fn(arg);}:fn;
  window.markDirty(save, spec[1]||'');
  if(window._dirty) window._dirty._key=key;
}
document.addEventListener('input',_dirtyWatch,true);
document.addEventListener('change',_dirtyWatch,true);
window.addEventListener('beforeunload',function(e){ if(window._dirty){ e.preventDefault(); e.returnValue=''; } });
window.savePerms=async function(){
  const perms={}; document.querySelectorAll('.permSel').forEach(s=>{ perms[s.getAttribute('data-pg')]=+s.value; });
  const tv=document.getElementById('teamViewSel'); if(tv) perms._teamView=tv.value;
  const m=document.getElementById('permsg'); if(m){ m.style.color=''; m.textContent='Saving…'; }
  const _rk=await window._replaceKind('perms',{kind:'perms',title:'perms',on_date:null,detail:JSON.stringify(perms),created_by:state.user.id});
  if(!_rk.ok){ if(m){ m.style.color='#A32D2D'; m.textContent=window._replaceMsg(_rk); } return; } // never claim success on a failed write
  state.perms=perms;
  if(m){ m.style.color=''; m.textContent='Saved ✓'; }
  try{ renderNav&&renderNav(); }catch(e){}
};
// Preview as any role, not just the lowest one, so access changes can actually be tested.
window.setPreviewRank=function(r){ state.previewRank=+r||1; if(!state.previewLIT){ if(state.profile){ state._realRole=state.profile.role; state.profile.role='team'; } state.previewLIT=true; } state.page='whiteboard'; state.ctx={}; renderApp(); };
// Per-person extra-access grants (stored as day_items kind 'usergrant', title=name, detail={pages:[...]}).
function _grantPageList(){ return ['schedule','today','logbook','rm','team','onboarding','calendar','checklists','lists','recovery','build','sales','saleshist']; }
function _grantRoster(){ const set={}; (window._profNames||[]).forEach(n=>{ if(n)set[n]=1; }); Object.keys(window._posMap||{}).forEach(n=>{ if(n)set[n]=1; }); return Object.keys(set).filter(n=>typeof isArchived!=='function'||!isArchived(n)).sort(); }
function _grantListHTML(){ const g=state.grants||{}; const names=Object.keys(g).filter(n=>(g[n]||[]).length); if(!names.length) return '<div class="faint" style="font-size:12.5px">No one has extra access yet.</div>'; return names.sort().map(n=>`<div class="row" style="gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)"><span style="font-weight:600;font-size:13px;flex-shrink:0">${esc(n)}</span><span class="faint" style="font-size:12px;flex:1">${g[n].map(p=>esc(PERM_LABELS[p]||p)).join(', ')}</span><span style="color:#B32D2D;cursor:pointer;font-size:12px;flex-shrink:0" onclick='removeUserGrant(${JSON.stringify(n)})'>Remove</span></div>`).join(''); }
window.grantSel=function(){ const who=(document.getElementById('grantWho')||{}).value; const g=(state.grants&&state.grants[who])||[]; document.querySelectorAll('.grantPg').forEach(c=>{ c.checked=g.indexOf(c.value)>=0; }); };
/* Logins that don't resolve to a roster person. Until they're linked, that person is treated as a
   plain team member no matter what position the owner gave them. */
/* Deliberately NOT here: any screen that lets a person pick which roster entry they are.
   That would let anyone with the join code claim to be the GM and grant themselves leadership access.
   A person's position is set by the owner on the Team page, and nowhere else. */
window.linkAccount=async function(pid,rosterName){
  if(!pid) return;
  await sb.from('day_items').delete().eq('kind','acctlink').eq('title',pid);
  if(rosterName){ const r=await sb.from('day_items').insert({kind:'acctlink',title:pid,on_date:null,detail:rosterName,created_by:state.user.id}); if(r&&r.error) return; }
  if(!window._acctLink) window._acctLink={};
  if(rosterName) window._acctLink[pid]=rosterName; else delete window._acctLink[pid];
  if(typeof vTeam==='function') vTeam(document.getElementById('view'));
};
window.saveUserGrant=async function(){ const who=(document.getElementById('grantWho')||{}).value; if(!who)return; const pages=[...document.querySelectorAll('.grantPg')].filter(c=>c.checked).map(c=>c.value); const m=document.getElementById('grantMsg'); await sb.from('day_items').delete().eq('kind','usergrant').eq('title',who); if(pages.length){ const ins=await sb.from('day_items').insert({kind:'usergrant',title:who,on_date:null,detail:JSON.stringify({pages}),created_by:state.user.id}); if(ins&&ins.error){ if(m){m.textContent="Couldn't save — "+ins.error.message;m.style.color='#B32D2D';} return; } if(!state.grants)state.grants={}; state.grants[who]=pages; } else { if(state.grants)delete state.grants[who]; } if(m){m.textContent='Saved ✓ — takes effect on their next screen';m.style.color='var(--green)';} const gl=document.getElementById('grantList'); if(gl)gl.innerHTML=_grantListHTML(); };
window.removeUserGrant=async function(name){ await sb.from('day_items').delete().eq('kind','usergrant').eq('title',name); if(state.grants)delete state.grants[name]; const gl=document.getElementById('grantList'); if(gl)gl.innerHTML=_grantListHTML(); const who=(document.getElementById('grantWho')||{}).value; if(who===name && typeof grantSel==='function')grantSel(); };
function _inviteText(code){ const nm=(state.settings&&state.settings.academy_name)||'our team'; const url=location.origin+'/?join='+encodeURIComponent(code); return "You're invited to join "+nm+"!\n\n"
  +"This is our team app — it's where you'll find your schedule, your training, and team messages, all in one place.\n\n"
  +"Getting set up takes about a minute:\n"
  +"1. Tap this link: "+url+"\n"
  +"2. Enter your name, your email, and a password to create your login.\n"
  +"3. That's it — you're in. Your schedule and training will be waiting for you.\n\n"
  +"If the link doesn't open, go to "+location.origin+" and enter this join code: "+code+"\n\n"
  +"Welcome to the team!"; }
window.copyInvite=function(code){ const t=_inviteText(code); const done=function(){ const m=document.getElementById('setmsg'); if(m){ m.textContent='Invite copied — paste it into a text or email.'; setTimeout(function(){m.textContent='';},3000);} }; if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done,function(){ prompt('Copy this invite:', t); }); } else { prompt('Copy this invite:', t); } };
window.shareInvite=function(code){ const t=_inviteText(code); const nm=(state.settings&&state.settings.academy_name)||'the team'; if(navigator.share){ navigator.share({title:nm, text:t}).catch(function(){}); } else { location.href='mailto:?subject='+encodeURIComponent('Join '+nm)+'&body='+encodeURIComponent(t); } };
window.saveSettings=async function(){
  window.clearDirty&&window.clearDirty();
  const name=(document.getElementById('setname').value||'').trim();
  const color=document.getElementById('setcolor').value;
  const msg=document.getElementById('setmsg'); if(msg)msg.textContent='Saving…';
  let logo_url=(state.settings&&state.settings.logo_url)||null;
  const f=document.getElementById('setlogo').files[0];
  if(f){ try{ logo_url=await fileToLogo(f); }catch(e){ if(msg) msg.textContent='Could not read that image — try a PNG or JPG.'; } }
  const join_code=val('setjoin');
  if(state.profile && state.profile.tenant_id){
    const r=await sb.from('tenants').update({academy_name:name, brand_color:color, logo_url, join_code}).eq('id',state.profile.tenant_id);
    if(r&&r.error){ if(msg)msg.textContent='Could not save: '+r.error.message; return; }
  } else {
    const r2=await sb.from('settings').update({academy_name:name, brand_color:color, logo_url, join_code, updated_at:new Date().toISOString()}).eq('id',1);
    if(r2&&r2.error){ if(msg)msg.textContent='Could not save: '+r2.error.message; return; }
  }
  state.settings={...state.settings, academy_name:name, brand_color:color, logo_url, join_code};
  applyBrand(color);
  if(msg)msg.textContent='Saved ✓';
  render();
};
function fileToLogo(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{ const max=256; let w=img.width,h=img.height; const sc=Math.min(1,max/Math.max(w,h)); w=Math.round(w*sc); h=Math.round(h*sc); const c=document.createElement('canvas'); c.width=w;c.height=h; c.getContext('2d').drawImage(img,0,0,w,h); res(c.toDataURL('image/png')); }; img.onerror=rej; img.src=r.result; }; r.onerror=rej; r.readAsDataURL(file); }); }
window.go=window.go||function(){};

/* ---------- Billing / subscription gating (dormant until BILLING_LIVE) ---------- */
const BILLING_LIVE=true; // Stripe keys + edge functions live (test mode) 2026-07-08
const SB_URL='https://wjqcnxnwjqmuzrandgea.supabase.co';
function billingState(){ const t=state.sub||{}; const st=(t.status||'active');
  if(st==='comp'||st==='active') return {ok:true,status:st};
  if(st==='past_due') return {ok:true,status:'past_due'}; // keep access during Stripe dunning
  if(st==='trialing'){ if(!t.stripe_subscription_id) return {ok:false,status:'needs_checkout'}; const end=t.trial_ends_at?new Date(t.trial_ends_at).getTime():0; const days=end?Math.ceil((end-Date.now())/864e5):null; if(!end||days>=0) return {ok:true,status:'trialing',daysLeft:days}; return {ok:false,status:'trial_expired'}; }
  return {ok:false,status:st}; } // canceled / unpaid / anything unknown-locked
function billingAllowed(){ return !BILLING_LIVE || billingState().ok; }
window.startCheckout=async function(interval){ const btn=document.getElementById('bpaybtn'); if(btn){ btn.disabled=true; btn.textContent='Opening secure checkout…'; }
  try{ const { data:{ session } }=await sb.auth.getSession(); const r=await fetch(SB_URL+'/functions/v1/create-checkout',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(session&&session.access_token||'')},body:JSON.stringify({interval:interval||'month',tenant_id:(state.tenant||{}).id})}); const j=await r.json(); if(j&&j.url){ location.href=j.url; return; } throw new Error((j&&j.error)||'Could not start checkout'); }
  catch(e){ if(btn){ btn.disabled=false; btn.textContent='Try again'; } alert('Billing isn’t live yet: '+e.message); } };
window.openBillingPortal=async function(){ try{ const { data:{ session } }=await sb.auth.getSession(); const r=await fetch(SB_URL+'/functions/v1/billing-portal',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(session&&session.access_token||'')},body:JSON.stringify({tenant_id:(state.tenant||{}).id})}); const j=await r.json(); if(j&&j.url){ location.href=j.url; return; } throw new Error((j&&j.error)||'Could not open billing'); }catch(e){ alert('Could not open billing: '+e.message); } };
function renderPaywall(bs){ const admin=(state.profile&&state.profile.role==='admin'); const nm=(state.settings&&state.settings.academy_name)||'your academy'; const brand=(state.settings&&state.settings.brand_color)||DEFAULT_BRAND; const brandNew=bs.status==='needs_checkout'; const expired=bs.status==='trial_expired'; const head=brandNew?'Start your 14-day free trial':(expired?'Your 14-day trial has ended':'Your subscription is paused'); const sub=brandNew?('Add a card to start your free trial of '+esc(nm)+'. You won’t be charged until the 14 days are up — cancel anytime before then.'):(expired?('Thanks for trying '+esc(nm)+'. Add a payment method to keep your team, schedules, and training going.'):'Reactivate to restore full access. Your data is safe.'); const app=document.getElementById('app')||document.body;
  app.innerHTML=`<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--bg)"><div class="card" style="max-width:440px;width:100%;padding:30px 28px;text-align:center"><div style="width:54px;height:54px;border-radius:15px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;background:${brand};color:#fff;font-size:26px"><i class="ti ti-lock"></i></div><div style="font-weight:800;font-size:20px;margin-bottom:8px">${head}</div><div class="muted" style="font-size:14px;line-height:1.6;margin-bottom:20px">${sub}</div>`+
    (admin?`<div class="card" style="padding:14px 16px;margin-bottom:12px;text-align:left;border:1px solid var(--brand-line)"><div class="row" style="justify-content:space-between;align-items:center"><div><div style="font-weight:700">Monthly</div><div class="faint" style="font-size:12px">Billed each month</div></div><div style="font-weight:800;font-size:17px">$149<span class="faint" style="font-size:12px;font-weight:600">/location</span></div></div></div><div class="card" style="padding:14px 16px;margin-bottom:16px;text-align:left;border:1px solid var(--brand-line);position:relative"><div class="pill" style="position:absolute;top:-9px;right:12px;background:#1B7B3F;color:#fff;font-size:10px;font-weight:800;padding:2px 8px">2 MONTHS FREE</div><div class="row" style="justify-content:space-between;align-items:center"><div><div style="font-weight:700">Annual</div><div class="faint" style="font-size:12px">$1,490/location billed yearly</div></div><div style="font-weight:800;font-size:17px">$124<span class="faint" style="font-size:12px;font-weight:600">/mo</span></div></div></div><button id="bpaybtn" class="btn pri" style="width:100%;margin-bottom:8px" onclick="startCheckout('month')">${brandNew?'Start free trial — monthly':'Add payment — start monthly'}</button><button class="btn" style="width:100%" onclick="startCheckout('year')">${brandNew?'Start free trial — yearly':'Pay yearly &amp; save'}</button>`
    :`<div class="muted" style="font-size:13.5px;line-height:1.6">Ask your restaurant’s owner to reactivate the account.</div>`)+
    `<div style="margin-top:16px"><a href="#" onclick="sb.auth.signOut().then(function(){location.reload();});return false" class="faint" style="font-size:12.5px">Sign out</a></div></div></div>`; }
window.renderPaywall=renderPaywall;

async function boot(){
  const { data:{ session } } = await sb.auth.getSession();
  { const _rh=(__RECOVERY_HASH||location.hash||''); const _hp=new URLSearchParams(_rh.replace(/^#/,'')); const _qp=new URLSearchParams(__RECOVERY_SEARCH||location.search||'');
    if(_hp.get('error')||_qp.get('error')){ try{history.replaceState(null,'',location.pathname);}catch(e){} state.user=null; state.settings={academy_name:DEFAULT_NAME,brand_color:DEFAULT_BRAND,logo_url:DEFAULT_LOGO}; try{applyBrand(DEFAULT_BRAND);}catch(e){} state.authMode='reset'; render(); setTimeout(function(){ try{ amsg('That reset link had expired or was already used. Enter your email and we\'ll send a fresh one.','err'); }catch(e){} },60); return; }
    const _at=_hp.get('access_token'), _rt=_hp.get('refresh_token'), _tp=_hp.get('type'), _code=_qp.get('code');
    if((_tp==='recovery' && _at) || state.recovery){ if(_at){ try{ await sb.auth.setSession({access_token:_at, refresh_token:_rt||''}); }catch(e){} } state.recovery=true; try{history.replaceState(null,'',location.pathname);}catch(e){} renderSetPassword(); return; }
    if(_code){ try{ const _ex=await sb.auth.exchangeCodeForSession(_code); if(_ex && !_ex.error){ state.recovery=true; try{history.replaceState(null,'',location.pathname);}catch(e){} renderSetPassword(); return; } }catch(e){} } }
  if(!session){ state.user=null; state.settings={academy_name:DEFAULT_NAME,brand_color:DEFAULT_BRAND,logo_url:DEFAULT_LOGO}; try{applyBrand(DEFAULT_BRAND);}catch(e){} try{ const _jc=new URLSearchParams(location.search).get('join'); if(_jc){ state.authMode='up'; state._joinPrefill=_jc; } }catch(e){} render(); return; }
  state.user = session.user; state.busy=false;
  await ensureProfile();
  if(!state.profile || !state.profile.tenant_id){
    if(window._pendingJoin){ const _c=window._pendingJoin; window._pendingJoin=null; const _r=await sb.rpc('join_restaurant',{p_code:_c}); if(_r&&!_r.error){ state.profile=null; await ensureProfile(); } }
    if(!state.profile || !state.profile.tenant_id){ renderNewRestaurant(); return; }
  }
  await loadSettings();
  /* Nine of thirteen logins had no last name. The app matches people to shifts by name,
     so those staff could not see their own schedule and showed up as a second person on
     the roster. Signup now demands a full name, but existing accounts predate that -- so
     ask once, on the way in, rather than leaving them quietly broken. */
  try{
    const _nm=String((state.profile&&state.profile.name)||'').trim();
    if(_nm && _nm.split(/\s+/).filter(Boolean).length<2){
      const _full=prompt('Your account is saved as "'+_nm+'".\n\nAdd your last name so your shifts and messages reach you. Use the name your manager has on the schedule.', _nm+' ');
      if(_full && _full.trim().split(/\s+/).filter(Boolean).length>=2){
        const _u=await sb.from('profiles').update({name:_full.trim().replace(/\s+/g,' ')}).eq('id',state.profile.id);
        if(!(_u&&_u.error)) state.profile.name=_full.trim().replace(/\s+/g,' ');
      }
    }
  }catch(e){}
  if(BILLING_LIVE){ const bs=billingState(); if(!bs.ok){ renderPaywall(bs); return; } }
  try{ await loadPositions(); }catch(e){}
  // Someone who signs up IS on the team. Put them on the roster as Unassigned so the owner can see
  // they joined and set their position, instead of them existing as an invisible login.
  try{
    const _p=state.profile;
    if(_p && _p.name && _p.role!=='admin' && !rosterKeyFor(_p.name) && !((window._acctLink||{})[_p.id])){
      const _ins=await sb.from('day_items').insert({kind:'pos',title:_p.name,detail:'Unassigned',on_date:null,created_by:state.user.id});
      if(!(_ins&&_ins.error)) await loadPositions();
    }
  }catch(e){}
  await loadAll();
  if(!applyHash()){
    let np='today',nc={};
    try{ const n=JSON.parse(localStorage.getItem('sw_nav')||'null'); if(n&&n.p){ np=n.p; nc=n.c||{}; } }catch(e){}
    if((np==='lesson'||np==='track') && !(nc.tid && state.tracks.find(t=>t.id===nc.tid))){ np='home'; nc={}; }
    state.page=np; state.ctx=nc;
  }
  render();
  try{ updateBillingBanner(); }catch(e){}
}
function updateBillingBanner(){ let el=document.getElementById('billingBanner'); if(!BILLING_LIVE){ if(el)el.remove(); return; } const bs=billingState(); const admin=(state.profile&&state.profile.role==='admin'); let msg='',bg='',fg='',act=''; if(bs.status==='trialing'){ const d=bs.daysLeft; if(d==null||d>5){ if(el)el.remove(); return; } msg=(d<=0?'Your trial ends today':('Trial ends in '+d+' day'+(d===1?'':'s')))+'.'; bg='#FFF7E6'; fg='#8A5A00'; if(admin)act='<button class="btn pri" style="width:auto;padding:4px 12px;font-size:12px;margin-left:10px" onclick="startCheckout(\'month\')">Add payment</button>'; }
  else if(bs.status==='past_due'){ msg='Payment didn’t go through — update your card to avoid losing access.'; bg='#FCEBEB'; fg='#8A1C1C'; if(admin)act='<button class="btn" style="width:auto;padding:4px 12px;font-size:12px;margin-left:10px" onclick="openBillingPortal()">Update card</button>'; }
  else { if(el)el.remove(); return; }
  if(!el){ el=document.createElement('div'); el.id='billingBanner'; document.body.appendChild(el); } el.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;font-size:13px;font-weight:600;background:'+bg+';color:'+fg+';border-top:1px solid rgba(0,0,0,.08)'; el.innerHTML='<i class="ti ti-clock"></i> '+msg+act; }
window.updateBillingBanner=updateBillingBanner;
function applyHash(){ const m=(location.hash||'').match(/^#lesson\/([^/]+)\/(.+)$/); if(m){ const tid=decodeURIComponent(m[1]); if(state.tracks.find(t=>t.id===tid)){ state.page='lesson'; state.ctx={tid, lid:decodeURIComponent(m[2])}; return true; } } return false; }
window.addEventListener('hashchange',()=>{ if(state.user && applyHash()) render(); });
window.shareLesson=function(tid,lid){ const url=location.origin+location.pathname+'#lesson/'+encodeURIComponent(tid)+'/'+encodeURIComponent(lid); try{ navigator.clipboard&&navigator.clipboard.writeText(url); }catch(e){} const b=document.getElementById('sharebtn'); if(b){ b.textContent='Link copied ✓'; setTimeout(()=>{ b.innerHTML='<i class="ti ti-share"></i> Share'; },2000); } };
window.printLesson=function(lid){ let L=null,T=null; state.tracks.forEach(t=>(state.lessons[t.id]||[]).forEach(l=>{ if(l.id===lid){L=l;T=t;} })); if(!L)return; const name=(state.settings&&state.settings.academy_name)||'Academy'; const brand=(state.settings&&state.settings.brand_color)||'#4A9CAD'; const body=L.body&&L.body.trim()?richBody(L.body):('<p>'+esc(L.subtitle||'')+'</p>'); const w=window.open('','_blank'); if(!w)return; w.document.write(`<!doctype html><html><head><meta charset=utf-8><title>${esc(L.title)}</title><style>@page{margin:.7in}body{font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;max-width:720px;margin:0 auto;line-height:1.65}h1{font-size:24px;margin:0 0 6px}.ey{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${brand};font-weight:700}.hd{border-bottom:3px solid ${brand};padding-bottom:8px;margin-bottom:18px}blockquote{border-left:3px solid ${brand};margin:0 0 14px;padding:8px 16px;background:#f3f8f9;font-style:italic}.pbar{position:fixed;top:10px;right:10px}.pbar button{padding:8px 16px;border:1px solid ${brand};background:${brand};color:#fff;border-radius:6px;cursor:pointer}@media print{.pbar{display:none}}</style></head><body><div class=pbar><button onclick="window.print()">Print</button></div><div class=hd><div class=ey>${esc(name)} · ${esc(T.name)}</div></div><h1>${esc(L.title)}</h1>${L.subtitle?'<p style="font-style:italic;color:#666">'+esc(L.subtitle)+'</p>':''}${body}</body></html>`); w.document.close(); setTimeout(()=>{try{w.focus();w.print();}catch(e){}},400); };
window.printSopCard=function(lid){ let L=null,T=null; state.tracks.forEach(t=>(state.lessons[t.id]||[]).forEach(l=>{ if(l.id===lid){L=l;T=t;} })); if(!L)return; const brand=(state.settings&&state.settings.brand_color)||'#4A9CAD'; const name=(state.settings&&state.settings.academy_name)||'Academy'; const tmp=document.createElement('div'); tmp.innerHTML=L.body||''; const h1=tmp.querySelector('h1'); const title=(h1?h1.textContent:L.title)||L.title; const blocks=[]; let cur=null; const EXC=['why it matters','in practice','rundown','what good looks like','what this lesson installs','take with you','the miss','the move']; tmp.querySelectorAll('h2, ul, ol').forEach(el=>{ if(el.tagName==='H2'){ const low=el.textContent.trim().toLowerCase(); cur=EXC.some(x=>low.indexOf(x)>=0)?null:{label:el.textContent.trim(),items:[]}; if(cur)blocks.push(cur); } else if(cur){ el.querySelectorAll(':scope > li').forEach(li=>cur.items.push(li.textContent.trim())); } }); const secHtml=blocks.filter(b=>b.items.length).map(b=>`<div class=lbl>${esc(b.label)}</div>`+b.items.map(it=>`<div class=ck>&#9744; ${esc(it)}</div>`).join('')).join(''); const w=window.open('','_blank'); if(!w)return; w.document.write(`<!doctype html><html><head><meta charset=utf-8><title>${esc(title)} — SOP Card</title><style>@page{margin:.5in}body{font-family:Helvetica,Arial,sans-serif;color:#111;max-width:420px;margin:0 auto}.hd{background:${brand};color:#fff;padding:16px 20px}.cat{font-size:10px;letter-spacing:2px;text-transform:uppercase;opacity:.9;font-weight:700;margin:0 0 4px}.ttl{font-size:23px;font-weight:800;margin:0;line-height:1.1}.bd{padding:16px 20px;border:1.5px solid #111;border-top:none}.lbl{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${brand};font-weight:800;margin:15px 0 6px}.lbl:first-child{margin-top:0}.ck{font-size:13px;line-height:1.85}.sign{font-size:13px;margin-top:16px;border-top:1px solid #111;padding-top:10px}.ft{font-size:9px;color:#999;letter-spacing:.5px;margin-top:14px;text-align:center}.pbar{position:fixed;top:10px;right:10px}.pbar button{padding:8px 14px;border:0;background:${brand};color:#fff;border-radius:6px;cursor:pointer}@media print{.pbar{display:none}}</style></head><body><div class=pbar><button onclick="window.print()">Print</button></div><div class=hd><p class=cat>${esc(T.name)}</p><p class=ttl>${esc(title)}</p></div><div class=bd>${secHtml||'<div class=ck style="color:#888">This lesson has no step-by-step list yet &mdash; add numbered steps to the lesson and this card fills in automatically.</div>'}<div class=sign>Done by: __________________&nbsp;&nbsp;Date: __________</div><div class=ft>${esc(name)} &middot; Post it at the station</div></div></body></html>`); w.document.close(); setTimeout(()=>{try{w.focus();w.print();}catch(e){}},400); };
window.go=go; window.markDone=markDone; window.undo=undo;
try{ sb.auth.onAuthStateChange(function(ev){ if(ev==='PASSWORD_RECOVERY'){ state.recovery=true; renderSetPassword(); } }); }catch(e){}
boot();
