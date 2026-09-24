(() => {
  const boot = document.getElementById('adminBoot');
  const title = document.getElementById('pageTitle');
  const sub = document.getElementById('pageSub');
  const sections = [...document.querySelectorAll('.page')];
  const navButtons = [...document.querySelectorAll('[data-page]')];

  const meta = {
    overview:['Overview','A light command center for the WHO product.'],
    users:['Users','Account and device visibility without raw contact content.'],
    caller:['Caller intelligence','Signals, confidence and corrections.'],
    reports:['Reports','Community spam and reputation moderation.'],
    releases:['Releases','Versions, download targets and update gates.'],
    remote:['Remote config','App copy and behavior controlled remotely.'],
    announcements:['Announcements','Revisioned product messages.'],
    crashes:['Crashes','Crash review and local preview triage.'],
    feedback:['Feedback','Close the beta loop.'],
    audit:['Audit','Track every administrative mutation.']
  };

  let deferredPrompt = null;
  let crashFilter = 'pending';
  let reportFilter = 'pending';

  const defaultConfig = {
    appVersion:'1.0.0', latestVersion:'1.0.0', minimumVersion:'1.0.0',
    forceUpdate:false, updateUrl:'https://squashberry.github.io/who/download.html',
    forceUpdateTitle:'WHO update required',
    forceUpdateMessage:'You need to update this app to continue using it.',
    welcomeEnabled:true, welcomeRevision:1, welcomeTitle:'WHO Beta 1.0',
    welcomeMessage:'This is a WHO Beta 1.0 app created by Squashberry.',
    welcomeButtonText:'Continue',
    maintenanceEnabled:false, maintenanceTitle:'WHO is temporarily unavailable',
    maintenanceMessage:'WHO is undergoing maintenance. Please try again later.',
    announcementEnabled:false, announcementTitle:'', announcementMessage:''
  };

  function cfg() {
    try { return Object.assign({}, defaultConfig, JSON.parse(localStorage.getItem('who_admin_config') || '{}')); }
    catch (_) { return {...defaultConfig}; }
  }
  function saveCfg(value) {
    localStorage.setItem('who_admin_config', JSON.stringify(value));
  }

  function setPage(page) {
    const chosen = sections.some((s)=>s.dataset.section===page) ? page : 'overview';
    sections.forEach((s)=>s.classList.toggle('active', s.dataset.section===chosen));
    navButtons.forEach((b)=>b.classList.toggle('active', b.dataset.page===chosen));
    title.textContent = meta[chosen][0];
    sub.textContent = meta[chosen][1];
    if (location.hash !== '#' + chosen) history.replaceState(null,'','#'+chosen);
    window.scrollTo({top:0,behavior:'auto'});
  }

  navButtons.forEach((btn)=>btn.addEventListener('click',()=>setPage(btn.dataset.page)));
  document.querySelectorAll('[data-jump]').forEach((btn)=>btn.addEventListener('click',()=>setPage(btn.dataset.jump)));

  function loadConfig() {
    const c = cfg();
    document.getElementById('latestVersion').value = c.latestVersion;
    document.getElementById('minimumVersion').value = c.minimumVersion;
    document.getElementById('updateUrl').value = c.updateUrl;
    document.getElementById('forceTitle').value = c.forceUpdateTitle;
    document.getElementById('forceMessage').value = c.forceUpdateMessage;
    document.getElementById('welcomeTitle').value = c.welcomeTitle;
    document.getElementById('welcomeButton').value = c.welcomeButtonText;
    document.getElementById('welcomeMessage').value = c.welcomeMessage;
    document.getElementById('maintenanceTitle').value = c.maintenanceTitle;
    document.getElementById('maintenanceMessage').value = c.maintenanceMessage;
    document.getElementById('announcementTitle').value = c.announcementTitle;
    document.getElementById('announcementMessage').value = c.announcementMessage;
    setToggle('forceToggle', c.forceUpdate);
    setToggle('welcomeToggle', c.welcomeEnabled);
    setToggle('maintenanceToggle', c.maintenanceEnabled);
    setToggle('announcementToggle', c.announcementEnabled);
    renderStats();
  }

  function readConfigFromUi() {
    const c = cfg();
    c.latestVersion = document.getElementById('latestVersion').value.trim();
    c.minimumVersion = document.getElementById('minimumVersion').value.trim();
    c.updateUrl = document.getElementById('updateUrl').value.trim();
    c.forceUpdateTitle = document.getElementById('forceTitle').value;
    c.forceUpdateMessage = document.getElementById('forceMessage').value;
    c.welcomeTitle = document.getElementById('welcomeTitle').value;
    c.welcomeButtonText = document.getElementById('welcomeButton').value;
    c.welcomeMessage = document.getElementById('welcomeMessage').value;
    c.maintenanceTitle = document.getElementById('maintenanceTitle').value;
    c.maintenanceMessage = document.getElementById('maintenanceMessage').value;
    c.announcementTitle = document.getElementById('announcementTitle').value;
    c.announcementMessage = document.getElementById('announcementMessage').value;
    c.forceUpdate = getToggle('forceToggle');
    c.welcomeEnabled = getToggle('welcomeToggle');
    c.maintenanceEnabled = getToggle('maintenanceToggle');
    c.announcementEnabled = getToggle('announcementToggle');
    return c;
  }

  function saveConfig() { saveCfg(readConfigFromUi()); renderStats(); toast('Remote config draft saved locally.'); }
  function saveRelease() { saveCfg(readConfigFromUi()); toast('Release draft saved locally.'); }

  function setToggle(id,on) {
    const el=document.getElementById(id);
    if (!el) return;
    el.classList.toggle('on', !!on);
    el.setAttribute('aria-pressed',String(!!on));
  }
  function getToggle(id) { return document.getElementById(id)?.classList.contains('on') === true; }
  document.querySelectorAll('.toggle').forEach((el)=>el.addEventListener('click',()=>{
    el.classList.toggle('on');
    el.setAttribute('aria-pressed',String(el.classList.contains('on')));
    renderStats();
  }));

  function renderStats() {
    const c=cfg();
    document.getElementById('forceStat').textContent=c.forceUpdate?'ON':'OFF';
    document.getElementById('announceStat').textContent=c.announcementEnabled?'ON':'OFF';
    const crashes=readCrashes();
    document.getElementById('crashStat').textContent=String(crashes.length);
  }

  function readCrashes() {
    try{return JSON.parse(localStorage.getItem('who_admin_crash_preview')||'[]')}catch(_){return[]}
  }
  function writeCrashes(rows){localStorage.setItem('who_admin_crash_preview',JSON.stringify(rows))}
  function addPreviewCrash(){
    const now=new Date().toISOString();
    const rows=readCrashes();
    rows.unshift({id:'preview-'+Date.now(),received_at:now,app_version:'1.0.0',platform:'android',fatal:true,error:'Preview crash report — not a real user crash.',status:'pending'});
    writeCrashes(rows); renderCrashes(); renderStats(); setPage('crashes'); toast('Preview crash added.');
  }
  function renderCrashes(){
    const rows=readCrashes().filter(r=>crashFilter==='all' || (r.status||'pending')===crashFilter);
    const body=document.getElementById('crashBody');
    body.innerHTML=rows.length?rows.map(r=>'<tr><td>'+new Date(r.received_at).toLocaleString()+'</td><td><span class="tag '+(r.fatal?'red':'amber')+'">'+(r.fatal?'Fatal':'Non-fatal')+'</span></td><td>'+r.app_version+'</td><td>'+r.platform+'</td><td>'+escapeHtml(r.error)+'</td><td><span class="tag '+(r.status==='fixed'?'green':'amber')+'">'+(r.status||'pending')+'</span></td><td><button class="ghost-btn" data-fix="'+r.id+'">'+(r.status==='fixed'?'Reopen':'Fix')+'</button></td></tr>').join(''):'<tr><td colspan="7">No preview crashes in this view.</td></tr>';
    document.getElementById('pendingCrash').textContent=readCrashes().filter(r=>(r.status||'pending')==='pending').length;
    document.getElementById('fixedCrash').textContent=readCrashes().filter(r=>r.status==='fixed').length;
    document.getElementById('fatalCrash').textContent=readCrashes().filter(r=>r.fatal).length;
    const today=new Date().toISOString().slice(0,10);document.getElementById('todayCrash').textContent=readCrashes().filter(r=>String(r.received_at).slice(0,10)===today).length;
    body.querySelectorAll('[data-fix]').forEach(btn=>btn.addEventListener('click',()=>{const all=readCrashes();const row=all.find(r=>r.id===btn.dataset.fix);if(row){row.status=row.status==='fixed'?'pending':'fixed';row.fixed_at=row.status==='fixed'?new Date().toISOString():null;writeCrashes(all);renderCrashes();renderStats();toast(row.status==='fixed'?'Crash marked fixed.':'Crash reopened.')}}));
  }
  document.querySelectorAll('[data-crash-filter]').forEach(btn=>btn.addEventListener('click',()=>{crashFilter=btn.dataset.crashFilter;document.querySelectorAll('[data-crash-filter]').forEach(b=>b.classList.toggle('active',b===btn));renderCrashes()}));

  const previewReports=[
    {number:'+220 3XX XXX',reason:'Suspected spam',count:4,status:'pending'},
    {number:'+220 7XX XXX',reason:'Telemarketing',count:2,status:'pending'},
    {number:'+220 2XX XXX',reason:'Resolved false positive',count:1,status:'resolved'}
  ];
  function renderReports(){
    const q=(document.getElementById('reportSearch').value||'').toLowerCase();
    const rows=previewReports.filter(r=>(reportFilter==='all'||r.status===reportFilter)&&(!q||JSON.stringify(r).toLowerCase().includes(q)));
    document.getElementById('reportBody').innerHTML=rows.map((r,i)=>'<tr><td>'+r.number+'</td><td>'+r.reason+'</td><td>'+r.count+'</td><td><span class="tag '+(r.status==='resolved'?'green':'amber')+'">'+r.status+'</span></td><td><button class="ghost-btn" data-report="'+i+'">'+(r.status==='resolved'?'Reopen':'Resolve')+'</button></td></tr>').join('') || '<tr><td colspan="5">No reports match.</td></tr>';
    document.getElementById('reportBody').querySelectorAll('[data-report]').forEach(btn=>btn.addEventListener('click',()=>{previewReports[Number(btn.dataset.report)].status=previewReports[Number(btn.dataset.report)].status==='resolved'?'pending':'resolved';renderReports();toast('Preview report updated.');}));
  }
  document.getElementById('reportSearch').addEventListener('input',renderReports);
  document.querySelectorAll('[data-report-filter]').forEach(btn=>btn.addEventListener('click',()=>{reportFilter=btn.dataset.reportFilter;document.querySelectorAll('[data-report-filter]').forEach(b=>b.classList.toggle('active',b===btn));renderReports()}));

  function publishAnnouncement(){
    const c=cfg();
    c.announcementEnabled=true;
    c.announcementTitle=document.getElementById('annTitle').value;
    c.announcementMessage=document.getElementById('annMessage').value;
    c.announcementRevision=Number(document.getElementById('annRevision').value)||1;
    c.announcementButton=document.getElementById('annButton').value;
    saveCfg(c);
    document.getElementById('previewAnnouncementTitle').textContent=c.announcementTitle||'Your WHO message';
    document.getElementById('previewAnnouncementMessage').textContent=c.announcementMessage||'Write an announcement and see how it will look inside the app.';
    renderStats();
    toast('Announcement saved as a local preview.');
  }

  function copyConfig(){
    const text=JSON.stringify(readConfigFromUi(),null,2);
    navigator.clipboard?.writeText(text).then(()=>toast('Config JSON copied.')).catch(()=>{window.prompt('Copy WHO config JSON',text)});
  }
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  function toast(message){const el=document.getElementById('toast');el.textContent=message;el.style.display='block';clearTimeout(window.__whoToast);window.__whoToast=setTimeout(()=>el.style.display='none',2200)}

  document.getElementById('refreshButton').addEventListener('click',()=>{loadConfig();renderReports();renderCrashes();toast('Preview data refreshed.')});
  document.querySelectorAll('.side-nav button,.mobile-admin-nav button').forEach(()=>{});

  window.addPreviewCrash=addPreviewCrash;
  window.saveRelease=saveRelease;
  window.saveConfig=saveConfig;
  window.loadConfig=loadConfig;
  window.copyConfig=copyConfig;
  window.publishAnnouncement=publishAnnouncement;
  window.toast=toast;

  window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();deferredPrompt=e});
  document.getElementById('adminInstall').addEventListener('click',()=>{
    if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}else alert('Use the browser menu to install WHO Control when the install option is available.');
  });
  window.addEventListener('load',()=>{setTimeout(()=>boot.classList.add('hide'),450);loadConfig();renderReports();renderCrashes();if(location.hash) setPage(location.hash.slice(1));});
})();