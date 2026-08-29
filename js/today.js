
function isoDate(d){ const x=new Date(d); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); }
function weekStart(d){ const x=new Date(d); const off=(x.getDay()+6)%7; x.setDate(x.getDate()-off); x.setHours(0,0,0,0); return x; }
function fmtDay(d){ return new Date(d).toLocaleDateString(undefined,{weekday:'short',month:'numeric',day:'numeric'}); }
function parseClock(t){ if(!t)return null; t=String(t).trim().toLowerCase(); let ap=null; if(/am|a$/.test(t))ap='a'; if(/pm|p$/.test(t))ap='p'; t=t.replace(/[ap]m?$/,'').trim(); let parts=t.split(':'); let hh=parseInt(parts[0]); let mm=parseInt(parts[1]||'0'); if(isNaN(hh))return null; if(ap==='p'&&hh<12)hh+=12; if(ap==='a'&&hh===12)hh=0; return hh+(mm||0)/60; }
function shiftHours(s){ const a=parseClock(s.start_time),b=parseClock(s.end_time); if(a==null||b==null)return 0; let d=b-a; if(d<0)d+=24; return d; }
function fmtClock(t){ const v=parseClock(t); if(v==null)return esc(t||''); let hh=Math.floor(v),mm=Math.round((v-hh)*60); const ap=hh>=12?'p':'a'; let h12=hh%12||12; return h12+(mm?':'+String(mm).padStart(2,'0'):'')+ap; }
function money(n){ return '$'+(Math.round(n*100)/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
async function vSchedule(v){
  const isAdmin=state.profile&&state.profile.role==='admin';
  const stab=state.ctx.stab||'schedule';
  setTitle('Operations','Scheduling, team & the daily log — one place');
  const _w=document.querySelector('.wrap'); if(_w) _w.style.maxWidth='1180px';
  const TABS=[['schedule','Schedule',1],['team','Who\u2019s working',3],['availability','Availability',1],['timeoff','Time off',1],['pool','Shift pool',1],['reports','Reports',3]];
  const tabs=TABS.filter(t=>myRank()>=t[2]); const allowed=new Set(tabs.map(t=>t[0])); const useTab=allowed.has(stab)?stab:'overview';
  v.innerHTML=`<div class="schtabs">`+tabs.map(t=>`<button class="schtab${useTab===t[0]?' on':''}" onclick="schGo('${t[0]}')">${t[1]}</button>`).join('')+`</div><div id="schbody"><div class="muted">Loading…</div></div>`;
  const body=document.getElementById('schbody');
  ({schedule:schBoard, team:schTeam, availability:schAvail, timeoff:schTimeoff, pool:schPool, reports:schReports}[useTab]||schBoard)(body);
}
window.schGo=function(t){ state.ctx.stab=t; try{ localStorage.setItem('sw_nav',JSON.stringify({p:state.page,c:state.ctx})); }catch(e){} vSchedule(document.getElementById('view')); };
window.startSchedTour=function(){
  window._tour=[
    {el:'schRhythm',title:'The weekly rhythm',text:'Making a schedule is five simple steps, always in the same order. This bar up top shows which step you’re on.'},
    {el:'schWeekNav',title:'1 · Pick the week',text:'Use the arrows to land on the week you are building. “Today” jumps back to this week.'},
    {el:'schAutoDraft',title:'2 · Auto-draft',text:'One click fills the whole week from each person’s availability and skills and your coverage rules — so it’s only as good as those. You set those up once on the Setup page. Then every week you just edit the draft instead of starting from a blank grid.'},
    {el:'schRhythm',title:'3 · Review the flags',text:'After it drafts, anything worth a look — time-off conflicts, overtime, open shifts — appears right above the grid. Fix it or move on.'},
    {el:'schPublish',title:'4 & 5 · Adjust, then Publish',text:'Click any shift to change it. When it looks right, hit Publish to send the week to your team. That is the whole loop.'}
  ];
  window._tourI=0; window._tourShow();
};
window._tourShow=function(){
  var old=document.getElementById('tourOv'); if(old)old.remove();
  var st=window._tour||[]; var s=st[window._tourI]; if(!s){ window._tourEnd(); return; }
  var el=document.getElementById(s.el); var r=null;
  if(el){ try{ el.scrollIntoView({block:'center'}); }catch(e){} r=el.getBoundingClientRect(); }
  var ring; if(r){ ring='<div style="position:fixed;z-index:9998;border:3px solid var(--brand);border-radius:12px;top:'+(r.top-5)+'px;left:'+(r.left-5)+'px;width:'+(r.width+10)+'px;height:'+(r.height+10)+'px;box-shadow:0 0 0 4000px rgba(20,30,35,.55);pointer-events:none"></div>'; } else { ring='<div style="position:fixed;inset:0;background:rgba(20,30,35,.55);z-index:9998"></div>'; }
  var bw=312, boxTop, boxLeft;
  if(r){ boxTop=(r.bottom < window.innerHeight-235)?(r.bottom+14):Math.max(14,r.top-235); boxLeft=Math.min(Math.max(12,r.left), window.innerWidth-bw-12); }
  else { boxTop=Math.max(20,window.innerHeight/2-120); boxLeft=Math.max(12,window.innerWidth/2-bw/2); }
  var last=window._tourI===st.length-1;
  var box='<div style="position:fixed;z-index:10000;width:'+bw+'px;max-width:92vw;background:var(--card);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.34);padding:17px 19px;top:'+boxTop+'px;left:'+boxLeft+'px"><div style="font-weight:800;font-size:15.5px;color:var(--ink)">'+s.title+'</div><div class="faint" style="font-size:14px;margin-top:7px;line-height:1.55">'+s.text+'</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:15px"><span class="faint" style="font-size:12.5px">'+(window._tourI+1)+' of '+st.length+'</span><div style="display:flex;gap:7px"><button class="btn" style="width:auto;padding:6px 11px;font-size:12.5px" onclick="window._tourEnd()">Skip tour</button>'+(window._tourI>0?'<button class="btn" style="width:auto;padding:6px 11px;font-size:12.5px" onclick="window._tourNav(-1)">Back</button>':'')+'<button class="btn pri" style="width:auto;padding:6px 13px;font-size:12.5px" onclick="'+(last?'window._tourEnd()':'window._tourNav(1)')+'">'+(last?'Got it':'Next')+'</button></div></div></div>';
  var ov=document.createElement('div'); ov.id='tourOv'; ov.style.cssText='position:fixed;inset:0;z-index:9997'; ov.innerHTML=ring+box; document.body.appendChild(ov);
};
window._tourNav=function(d){ window._tourI=(window._tourI||0)+d; if(window._tourI<0)window._tourI=0; window._tourShow(); };
window._tourEnd=function(){ var o=document.getElementById('tourOv'); if(o)o.remove(); try{localStorage.setItem('sw_schedtour','1');}catch(e){} };
/* ---------- Positions: single source of truth (stored as day_items kind='pos') ---------- */
const POS_ORDER=['OJR','Owner','GM','Manager','Supervisor','Trainer','Trainee','Team Member','Unassigned'];
const POS_COL={OJR:'#DC2626',Owner:'#7C3AED',GM:'#6D28D9',Manager:'#2563EB',Supervisor:'#0D9488',Trainer:'#0891B2',Trainee:'#D97706','Team Member':'#64748B',Unassigned:'#94A3B8'};
const POS_PICK=['Owner','GM','Manager','Supervisor','Trainer','Trainee','Team Member','Unassigned']; // OJR is a per-day designation, not a stored position
/* Scheduling law rules by jurisdiction — feeds auto-draft flags + time clock. Home store = AZ (minimal, no nagging). Full set for selling to CA/Seattle/NYC owners. Not legal advice. */
const LAW_RULES={"US":{"meal_after_hrs":null,"ot_daily_hrs":null,"ot_weekly_hrs":40,"min_rest_between_shifts_hrs":null,"advance_notice_days":null},"AZ":{"meal_after_hrs":null,"ot_daily_hrs":null,"ot_weekly_hrs":40,"min_rest_between_shifts_hrs":null,"advance_notice_days":null},"CA":{"meal_after_hrs":5,"ot_daily_hrs":8,"ot_weekly_hrs":40,"min_rest_between_shifts_hrs":null,"advance_notice_days":null},"OR":{"meal_after_hrs":6,"ot_daily_hrs":null,"ot_weekly_hrs":40,"min_rest_between_shifts_hrs":10,"advance_notice_days":14},"Seattle":{"meal_after_hrs":5,"ot_daily_hrs":null,"ot_weekly_hrs":40,"min_rest_between_shifts_hrs":10,"advance_notice_days":14},"NYC":{"meal_after_hrs":6,"ot_daily_hrs":null,"ot_weekly_hrs":40,"min_rest_between_shifts_hrs":11,"advance_notice_days":14},"Chicago":{"meal_after_hrs":7.5,"ot_daily_hrs":null,"ot_weekly_hrs":40,"min_rest_between_shifts_hrs":10,"advance_notice_days":14},"LA":{"meal_after_hrs":5,"ot_daily_hrs":8,"ot_weekly_hrs":40,"min_rest_between_shifts_hrs":10,"advance_notice_days":null},"SF":{"meal_after_hrs":5,"ot_daily_hrs":8,"ot_weekly_hrs":40,"min_rest_between_shifts_hrs":null,"advance_notice_days":14},"Emeryville":{"meal_after_hrs":5,"ot_daily_hrs":8,"ot_weekly_hrs":40,"min_rest_between_shifts_hrs":11,"advance_notice_days":14}};