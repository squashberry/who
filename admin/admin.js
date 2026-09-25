(() => {
  const API_BASE = (document.querySelector('meta[name="who-admin-api"]')?.content || '').replace(/\/+$/, '');
  const KEY = 'whoAdminApiKey';
  const sections = [...document.querySelectorAll('.page')];
  const nav = [...document.querySelectorAll('[data-page]')];
  const meta = {
    overview:['Overview','Live WHO product command center.'],
    users:['Users','Account and device visibility.'],
    caller:['Caller intelligence','Signals, confidence and corrections.'],
    reports:['Reports','Community spam and reputation moderation.'],
    releases:['Releases','Versions and update gates.'],
    remote:['Remote config','App behavior controlled remotely.'],
    announcements:['Announcements','Revisioned product messages.'],
    crashes:['Crashes','Crash review and triage.'],
    feedback:['Feedback','Close the beta loop.'],
    audit:['Audit','Administrative activity.']
  };
  let state={config:{},summary:{},users:[],reports:[],crashes:[],feedback:[],audit:[]};
  let reportFilter='pending', crashFilter='pending';

  function toast(msg){
    const el=document.getElementById('toast');
    if(!el)return;
    el.textContent=msg;
    el.style.display='block';
    clearTimeout(window.__whoToast);
    window.__whoToast=setTimeout(()=>el.style.display='none',2400);
  }
  window.toast=toast;
  window.showAdminToast=toast;

  function setPage(page){
    const chosen=meta[page]?page:'overview';
    sections.forEach(s=>s.classList.toggle('active',s.dataset.section===chosen));
    nav.forEach(b=>b.classList.toggle('active',b.dataset.page===chosen));
    document.getElementById('pageTitle').textContent=meta[chosen][0];
    document.getElementById('pageSub').textContent=meta[chosen][1];
    history.replaceState(null,'','#'+chosen);
    window.scrollTo(0,0);
  }
  nav.forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
  document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.jump)));

  function setApiState(text,connected){
    const el=document.getElementById('apiState');
    if(el)el.innerHTML='<i></i> '+text;
    if(el)el.classList.toggle('connected',!!connected);
  }

  async function api(path,options={}){
    const headers=new Headers(options.headers||{});
    headers.set('Content-Type','application/json');
    const key=sessionStorage.getItem(KEY)||'';
    if(key)headers.set('Authorization','Bearer '+key);
    const res=await fetch(API_BASE+path,{...options,headers});
    let body={}; try{body=await res.json();}catch{}
    if(res.status===401){
      sessionStorage.removeItem(KEY);
      showLogin();
      throw new Error('Admin authentication required');
    }
    if(!res.ok||body.success===false)throw new Error(body.error||body.message||('HTTP '+res.status));
    return body;
  }

  function showLogin(){
    if(document.getElementById('whoAdminLogin'))return;
    const wrap=document.createElement('div');
    wrap.id='whoAdminLogin';
    wrap.style.cssText='position:fixed;inset:0;z-index:20000;display:grid;place-items:center;background:rgba(3,5,9,.88);backdrop-filter:blur(18px);padding:20px';
    wrap.innerHTML='<div style="width:min(430px,100%);background:#0d1220;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:26px;box-shadow:0 30px 100px rgba(0,0,0,.55)"><div style="font-size:11px;font-weight:900;color:#6fbdf2;letter-spacing:.14em">WHO CONTROL</div><h2 style="margin:8px 0">Admin authentication</h2><p style="color:#71819d;font-size:13px">Enter your private Admin API key. It stays in this browser session.</p><input id="whoAdminKey" type="password" autocomplete="off" placeholder="Admin API key" style="width:100%;box-sizing:border-box;background:#080b13;border:1px solid #26334a;color:#fff;border-radius:12px;padding:12px"><button id="whoAdminConnect" class="primary-btn" style="margin-top:14px;width:100%">Connect</button><div id="whoAdminError" style="display:none;color:#ff8f9f;font-size:12px;margin-top:12px"></div></div>';
    document.body.appendChild(wrap);
    const input=wrap.querySelector('#whoAdminKey');
    const btn=wrap.querySelector('#whoAdminConnect');
    const connect=async()=>{
      const value=input.value.trim();
      if(!value)return;
      btn.disabled=true;btn.textContent='Connecting…';
      try{
        const r=await fetch(API_BASE+'/admin/verify',{headers:{Authorization:'Bearer '+value}});
        if(!r.ok)throw new Error('Authentication failed');
        sessionStorage.setItem(KEY,value);
        wrap.remove();
        await loadLive();
      }catch(e){
        wrap.querySelector('#whoAdminError').textContent=e.message||'Could not connect.';
        wrap.querySelector('#whoAdminError').style.display='block';
        btn.disabled=false;btn.textContent='Connect';
      }
    };
    btn.addEventListener('click',connect);
    input.addEventListener('keydown',e=>{if(e.key==='Enter')connect();});
  }

  async function loadLive(){
    setApiState('Connecting…',false);
    try{
      state=await api('/admin/bootstrap');
      setApiState('API connected',true);
      renderAll();
    }catch(e){
      setApiState(e.message==='Admin authentication required'?'Login required':'API unavailable',false);
      if(e.message!=='Admin authentication required')toast(e.message);
      throw e;
    }
  }
  window.connectAdminApi=()=>{sessionStorage.removeItem(KEY);showLogin();};

  function val(id,fallback=''){
    return document.getElementById(id)?.value ?? state.config?.[fallback] ?? '';
  }
  function checked(id,fallback=false){
    const el=document.getElementById(id);
    if(!el)return !!state.config?.[fallback];
    return el.type==='checkbox'?el.checked:el.classList.contains('on');
  }
  function assign(id,value){
    const el=document.getElementById(id);if(!el||value===undefined||value===null)return;
    if(el.type==='checkbox')el.checked=!!value;else el.value=String(value);
  }
  function toggle(id,on){
    const el=document.getElementById(id);if(!el)return;
    el.classList.toggle('on',!!on);el.setAttribute('aria-pressed',String(!!on));
  }

  function configFromUi(){
    const c=state.config||{};
    return {
      ...c,
      appVersion:val('appVersion','appVersion')||'1.0.0',
      latestVersion:val('latestVersion','latestVersion')||'1.0.0',
      minimumVersion:val('minimumVersion','minimumVersion')||'1.0.0',
      forceUpdate:checked('forceToggle','forceUpdate') || checked('forceUpdate','forceUpdate'),
      updateUrl:val('updateUrl','updateUrl'),
      forceUpdateTitle:val('forceTitle','forceUpdateTitle'),
      forceUpdateMessage:val('forceMessage','forceUpdateMessage'),
      forceUpdateButton:val('forceButton','forceUpdateButton')||'Update WHO',
      welcomeEnabled:checked('welcomeToggle','welcomeEnabled') || checked('welcomeEnabled','welcomeEnabled'),
      welcomeRevision:Number(val('welcomeRevision','welcomeRevision')||1),
      welcomeTitle:val('welcomeTitle','welcomeTitle'),
      welcomeMessage:val('welcomeMessage','welcomeMessage'),
      welcomeEmail:val('welcomeEmail','welcomeEmail'),
      welcomeButtonText:val('welcomeButton','welcomeButtonText')||'Continue',
      maintenanceEnabled:checked('maintenanceToggle','maintenanceEnabled') || checked('maintenanceEnabled','maintenanceEnabled'),
      maintenanceTitle:val('maintenanceTitle','maintenanceTitle'),
      maintenanceMessage:val('maintenanceMessage','maintenanceMessage'),
      announcementEnabled:checked('announcementToggle','announcementEnabled') || checked('announcementEnabled','announcementEnabled'),
      announcementRevision:Number(val('annRevision','announcementRevision')||0),
      announcementTitle:val('announcementTitle','announcementTitle')||val('annTitle','announcementTitle'),
      announcementMessage:val('announcementMessage','announcementMessage')||val('annMessage','announcementMessage'),
      announcementButtonText:val('annButton','announcementButtonText')||'Continue'
    };
  }

  function loadForm(){
    const c=state.config||{};
    ['appVersion','latestVersion','minimumVersion','updateUrl','forceTitle','forceMessage','forceButton','welcomeRevision','welcomeTitle','welcomeEmail','welcomeMessage','welcomeButton','maintenanceTitle','maintenanceMessage','announcementTitle','announcementMessage','annRevision','annTitle','annMessage','annButton'].forEach(id=>{
      const map={
        forceTitle:'forceUpdateTitle',forceMessage:'forceUpdateMessage',forceButton:'forceUpdateButton',
        welcomeButton:'welcomeButtonText',announcementTitle:'announcementTitle',announcementMessage:'announcementMessage',
        annTitle:'announcementTitle',annMessage:'announcementMessage',annButton:'announcementButtonText'
      };
      assign(id,c[map[id]||id]);
    });
    ['forceUpdate','welcomeEnabled','maintenanceEnabled','announcementEnabled'].forEach(id=>assign(id,c[id]));
    toggle('forceToggle',!!c.forceUpdate);
    toggle('welcomeToggle',!!c.welcomeEnabled);
    toggle('maintenanceToggle',!!c.maintenanceEnabled);
    toggle('announcementToggle',!!c.announcementEnabled);
  }

  async function saveConfig(){
    try{
      const r=await api('/admin/config',{method:'PUT',body:JSON.stringify({config:configFromUi()})});
      state.config=r.config;
      loadForm();
      renderAll();
      toast('Saved to WHO backend.');
    }catch(e){toast(e.message);}
  }
  window.saveConfig=saveConfig;
  window.saveRelease=saveConfig;
  window.loadConfig=loadForm;

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function put(id,value){const e=document.getElementById(id);if(e)e.textContent=String(value);}
  
  function renderUsers(){
    const body=document.querySelector('[data-section="users"] tbody');if(!body)return;
    body.innerHTML=state.users.length?state.users.map(u=>'<tr><td>'+esc(u.phone_masked||u.id)+'</td><td>'+esc(u.platform)+'</td><td>'+esc(u.app_version)+'</td><td>'+new Date(Number(u.last_seen||0)).toLocaleString()+'</td><td><span class="tag '+(u.status==='active'?'green':'amber')+'">'+esc(u.status)+'</span></td></tr>').join(''):'<tr><td colspan="5">No users have reached the backend yet.</td></tr>';
  }

  function renderReports(){
    const body=document.getElementById('reportBody');if(!body)return;
    const q=(document.getElementById('reportSearch')?.value||'').toLowerCase();
    const rows=(state.reports||[]).filter(r=>(reportFilter==='all'||r.status===reportFilter)&&(!q||JSON.stringify(r).toLowerCase().includes(q)));
    body.innerHTML=rows.length?rows.map(r=>'<tr><td>'+esc(r.phone_masked)+'</td><td>'+esc(r.reason)+'</td><td>'+esc(r.report_count)+'</td><td><span class="tag '+(r.status==='resolved'?'green':'amber')+'">'+esc(r.status)+'</span></td><td><button class="ghost-btn" data-report="'+esc(r.id)+'">'+(r.status==='resolved'?'Resolved':'Resolve')+'</button></td></tr>').join(''):'<tr><td colspan="5">No API reports match.</td></tr>';
    body.querySelectorAll('[data-report]').forEach(btn=>btn.addEventListener('click',async()=>{
      if(btn.textContent==='Resolved')return;
      try{await api('/admin/reports/'+encodeURIComponent(btn.dataset.report)+'/resolve',{method:'POST'});await loadLive();toast('Report resolved.');}catch(e){toast(e.message);}
    }));
  }

  function renderCrashes(){
    const body=document.getElementById('crashBody');if(!body)return;
    const rows=(state.crashes||[]).filter(r=>crashFilter==='all'||r.status===crashFilter);
    body.innerHTML=rows.length?rows.map(r=>'<tr><td>'+new Date(Number(r.received_at||0)).toLocaleString()+'</td><td><span class="tag '+(r.fatal?'red':'amber')+'">'+(r.fatal?'Fatal':'Non-fatal')+'</span></td><td>'+esc(r.app_version)+'</td><td>'+esc(r.platform)+'</td><td>'+esc(r.error)+'</td><td><span class="tag '+(r.status==='fixed'?'green':'amber')+'">'+esc(r.status)+'</span></td><td><button class="ghost-btn" data-fix="'+esc(r.id)+'">'+(r.status==='fixed'?'Reopen':'Fix')+'</button></td></tr>').join(''):'<tr><td colspan="7">No API crash reports match.</td></tr>';
    put('pendingCrash',(state.crashes||[]).filter(r=>r.status==='pending').length);
    put('fixedCrash',(state.crashes||[]).filter(r=>r.status==='fixed').length);
    put('fatalCrash',(state.crashes||[]).filter(r=>!!r.fatal).length);
    put('todayCrash',(state.crashes||[]).filter(r=>new Date(Number(r.received_at||0)).toDateString()===new Date().toDateString()).length);
    body.querySelectorAll('[data-fix]').forEach(btn=>btn.addEventListener('click',async()=>{
      try{await api('/admin/crashes/'+encodeURIComponent(btn.dataset.fix)+'/status',{method:'POST',body:JSON.stringify({status:btn.textContent.trim()==='Fix'?'fixed':'pending'})});await loadLive();toast('Crash status updated.');}catch(e){toast(e.message);}
    }));
  }

  function renderFeedback(){
    const grid=document.querySelector('[data-section="feedback"] .feedback-grid');if(!grid)return;
    grid.innerHTML=(state.feedback||[]).length?(state.feedback||[]).map(f=>'<article><span class="tag blue">'+esc(f.category||'FEEDBACK')+'</span><h3>'+esc(f.title||'Untitled')+'</h3><p>'+esc(f.message||'')+'</p><small>v'+esc(f.version||'unknown')+' · '+new Date(Number(f.created_at||0)).toLocaleString()+'</small></article>').join(''):'<article><h3>No feedback yet</h3><p>Feedback submitted through the backend will appear here.</p></article>';
  }

  function renderAudit(){
    const body=document.querySelector('[data-section="audit"] tbody');if(!body)return;
    body.innerHTML=(state.audit||[]).length?(state.audit||[]).map(a=>'<tr><td>'+new Date(Number(a.created_at||0)).toLocaleString()+'</td><td>'+esc(a.actor)+'</td><td>'+esc(a.action)+'</td><td><span class="tag blue">'+esc(a.result)+'</span></td></tr>').join(''):'<tr><td colspan="4">No audit records yet.</td></tr>';
  }

  function renderOverview(){
    put('forceStat',state.config?.forceUpdate?'ON':'OFF');
    put('announceStat',state.config?.announcementEnabled?'ON':'OFF');
    put('crashStat',state.summary?.pendingCrashes||0);
  }

  function renderAll(){loadForm();renderOverview();renderUsers();renderReports();renderCrashes();renderFeedback();renderAudit();}

  window.lookupNumber=async()=>{
    const phone=document.getElementById('numberSearch')?.value.trim()||'';
    if(!phone){toast('Enter a number first.');return;}
    try{
      const r=await api('/admin/intelligence/lookup',{method:'POST',body:JSON.stringify({phone})});
      const box=document.getElementById('lookupResult');
      box.innerHTML=(r.candidates||[]).length?(r.candidates||[]).map(c=>'<b>'+esc(c.candidate_name)+'</b><span>'+Number(c.confidence||0).toFixed(1)+'% confidence · '+esc(c.contribution_count)+' contributions</span><hr>').join(''):'<span>No intelligence candidates found.</span>';
    }catch(e){toast(e.message);}
  };

  window.publishAnnouncement=async()=>{
    const c={...state.config,announcementEnabled:true,announcementRevision:Number(document.getElementById('annRevision')?.value||1),announcementTitle:document.getElementById('annTitle')?.value||'',announcementMessage:document.getElementById('annMessage')?.value||'',announcementButtonText:document.getElementById('annButton')?.value||'Continue'};
    try{const r=await api('/admin/config',{method:'PUT',body:JSON.stringify({config:c})});state.config=r.config;renderAll();toast('Announcement published.');}catch(e){toast(e.message);}
  };

  window.addPreviewCrash=()=>toast('Live API mode: preview crash creation is disabled.');
  window.copyConfig=async()=>{
    const payload=JSON.stringify(state.config||{},null,2);
    try{await navigator.clipboard.writeText(payload);toast('Config JSON copied.');}catch{window.prompt('WHO config JSON',payload);}
  };

  document.querySelectorAll('.toggle').forEach(el=>el.addEventListener('click',()=>{el.classList.toggle('on');el.setAttribute('aria-pressed',String(el.classList.contains('on')));}));
  document.getElementById('reportSearch')?.addEventListener('input',renderReports);
  document.querySelectorAll('[data-report-filter]').forEach(b=>b.addEventListener('click',()=>{reportFilter=b.dataset.reportFilter;document.querySelectorAll('[data-report-filter]').forEach(x=>x.classList.toggle('active',x===b));renderReports();}));
  document.querySelectorAll('[data-crash-filter]').forEach(b=>b.addEventListener('click',()=>{crashFilter=b.dataset.crashFilter;document.querySelectorAll('[data-crash-filter]').forEach(x=>x.classList.toggle('active',x===b));renderCrashes();}));
  document.getElementById('refreshButton')?.addEventListener('click',()=>loadLive().catch(()=>{}));
  document.getElementById('adminInstall')?.addEventListener('click',()=>alert('Use your browser menu to install WHO Control.'));

  setPage(location.hash.slice(1)||'overview');
  window.addEventListener('load',async()=>{
    try{
      if(sessionStorage.getItem(KEY))await loadLive();
      else{setApiState('Login required',false);showLogin();}
    }catch{}
    document.getElementById('adminBoot')?.classList.add('hide');
  });
})();