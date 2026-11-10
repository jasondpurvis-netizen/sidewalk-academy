/* ---------- Self-check ----------
   Four things broke on this app and every one was found by a person opening a page:
   a build that blanked the whole app, a labour cost that left salary out, poll choices
   wiped by a redraw, and an availability page that threw on a reassigned constant and had
   been doing it for weeks. Nothing in the app ever said so.

   This walks every page and every tab, signed in, against the real database, and says what
   broke. It runs inside the app on purpose: the failures live behind the login and behind
   the row-level security rules, so a test that signs in as nobody tests nothing. It loads
   only when the address ends in #selftest, so it costs a normal visit nothing and no
   member of staff ever meets it.

   It reads. It writes nothing. */

(function(){
  const WAIT_MS = 9000;     // a slow page on a cold cache
  const SETTLE  = 160;

  // Everything with a door, plus the tabs inside the ones that have them. A route that
  // needs something picked first (a lesson, a category) is covered by its parent.
  function routes(){
    const R = [
      ['today',{}], ['home',{}], ['team',{}], ['community',{}], ['brain',{}],
      ['logbook',{}], ['lists',{}], ['rm',{}], ['recovery',{}], ['catering',{}],
      ['recipes',{}], ['resources',{}], ['downloads',{}], ['onboarding',{}],
      ['calendar',{}], ['checklists',{}], ['setup',{}], ['settings',{}],
      ['ownership',{}], ['journal',{}], ['summary',{}], ['feedback',{}],
      ['ask',{}], ['build',{}], ['pay',{}], ['clock',{}],
      ['sales',{}], ['saleshist',{}], ['costsmart',{}]
    ];
    ['schedule','team','whenwork','availability','timeoff','pool','reports'].forEach(function(t){
      R.push(['schedule',{stab:t}]);
    });
    // Whatever the Academy actually holds today, not a list written down months ago.
    try{
      (state.tracks||[]).slice(0,3).forEach(function(t){
        R.push(['track',{tid:t.id}]);
        const L=(state.lessons||{})[t.id]||[];
        if(L.length) R.push(['lesson',{tid:t.id, lid:L[0].id}]);
      });
    }catch(e){}
    return R;
  }

  function label(p,c){ const k=Object.keys(c||{}); return p + (k.length? ' · '+k.map(function(x){return c[x];}).join('/') : ''); }

  function settled(v){
    if(!v) return false;
    const h=v.innerHTML||'';
    if(!h.trim()) return false;
    if(h.indexOf('class="waiting"')>=0) return false;
    if(/>\s*Loading…\s*</.test(h)) return false;
    return true;
  }

  async function step(p,c,bus){
    bus.errors.length=0;
    const v=document.getElementById('view');
    if(v) v.innerHTML='';
    let thrown=null;
    // go() stops to ask about unsaved changes. A walk of thirty-six pages must not sit
    // behind a confirm box nobody is there to answer.
    try{ window._dirty=null; }catch(e){}
    try{ go(p,c); }catch(e){ thrown=e; }
    const t0=Date.now();
    while(Date.now()-t0 < WAIT_MS){
      await new Promise(function(r){ setTimeout(r,SETTLE); });
      if(settled(document.getElementById('view'))) break;
    }
    await new Promise(function(r){ setTimeout(r,SETTLE); });
    const el=document.getElementById('view');
    const txt=(el&&el.innerText)||'';
    const html=(el&&el.innerHTML)||'';
    if(thrown) return bad('threw on the way in: '+(thrown.message||thrown));
    if(bus.errors.length) return bad(bus.errors[0]);
    if(txt.indexOf('This didn’t load')>=0 || txt.indexOf("This didn't load")>=0){
      const m=txt.match(/\(([^)]{3,160})\)/);
      return bad('the page reported a failure'+(m?': '+m[1]:''));
    }
    if(!html.trim()) return bad('rendered nothing at all');
    if(!settled(el)) return bad('never finished loading ('+(WAIT_MS/1000)+'s)');
    return {ok:true};
    function bad(why){ return {ok:false, why:why}; }
  }

  function panel(){
    let b=document.getElementById('stPanel');
    if(!b){
      b=document.createElement('div'); b.id='stPanel';
      b.style.cssText='position:fixed;inset:auto 0 0 0;max-height:62vh;overflow:auto;z-index:10090;'
        +'background:#12171A;color:#E8EDEF;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;'
        +'padding:14px 16px calc(16px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 40px rgba(0,0,0,.35)';
      document.body.appendChild(b);
    }
    return b;
  }

  window.selfTest = async function(){
    const bus={errors:[]};
    const onErr=function(e){ try{ bus.errors.push(String((e&&e.error&&e.error.message)||(e&&e.message)||e)); }catch(_){} };
    const onRej=function(e){ try{ bus.errors.push('unhandled: '+String((e&&e.reason&&e.reason.message)||(e&&e.reason)||e)); }catch(_){} };
    const _ce=console.error;
    console.error=function(){ try{ const a=[].slice.call(arguments).map(String).join(' '); if(a.indexOf('view failed')>=0) bus.errors.push(a); }catch(_){} return _ce.apply(console,arguments); };
    window.addEventListener('error',onErr);
    window.addEventListener('unhandledrejection',onRej);

    const where={p:state.page, c:state.ctx};
    const R=routes(), out=[];
    const b=panel();
    const draw=function(done){
      const bad=out.filter(function(x){ return !x.ok; });
      b.innerHTML='<div style="font-weight:700;margin-bottom:8px">Self-check '
        + (done? (bad.length? '— '+bad.length+' broken of '+out.length : '— all '+out.length+' pages fine') : '— '+out.length+'/'+R.length+'…')
        + (done?' <span style="opacity:.6;font-weight:400">'+(window.BUILD||'')+'</span>':'')
        + (done?'<button onclick="document.getElementById(\'stPanel\').remove()" style="float:right;background:#2A3338;color:#E8EDEF;border:0;border-radius:6px;padding:4px 11px;cursor:pointer;font:inherit">Close</button>':'')
        +'</div>'
        + out.map(function(x){
            return '<div style="padding:2px 0;color:'+(x.ok?'#7FB98B':'#F08C7A')+'">'
              + (x.ok?'ok  ':'FAIL') + '  ' + x.name
              + (x.ok?'':' <span style="opacity:.85">— '+x.why+'</span>') + '</div>';
          }).join('')
        + (done&&bad.length? '<div style="margin-top:9px;opacity:.75">Tell Jason which lines say FAIL.</div>' : '');
      b.scrollTop=b.scrollHeight;
    };
    draw(false);

    for(let i=0;i<R.length;i++){
      const p=R[i][0], c=R[i][1];
      let r;
      try{ r=await step(p,c,bus); }catch(e){ r={ok:false,why:'the check itself threw: '+(e&&e.message||e)}; }
      r.name=label(p,c); out.push(r); draw(false);
    }

    window.removeEventListener('error',onErr);
    window.removeEventListener('unhandledrejection',onRej);
    console.error=_ce;
    try{ go(where.p, where.c); }catch(e){}
    draw(true);
    const bad=out.filter(function(x){ return !x.ok; });
    try{ _ce('self-check: '+(bad.length? bad.length+' broken' : 'all '+out.length+' fine'), bad); }catch(e){}
    return {total:out.length, failed:bad.length, broken:bad.map(function(x){ return x.name+' — '+x.why; })};
  };

  // Opening the app at #selftest runs it, once the app is actually up.
  (function arm(){
    if((location.hash||'').toLowerCase()!=='#selftest') return;
    const t=setInterval(function(){
      if(typeof state==='undefined' || !state.user || !document.getElementById('view')) return;
      clearInterval(t); window.selfTest();
    },400);
  })();
})();
