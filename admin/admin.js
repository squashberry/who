(() => {
  'use strict';

  const API_BASE = 'https://who-api.who-fe3.workers.dev';

  const boot = document.getElementById('adminBoot');
  const title = document.getElementById('pageTitle');
  const sub = document.getElementById('pageSub');
  const sections = [...document.querySelectorAll('.page')];
  const navButtons = [...document.querySelectorAll('[data-page]')];

  const meta = {
    overview:['Overview','Live WHO backend control and system status.'],
    users:['Users','Live account and device metrics from WHO D1.'],
    caller:['Caller intelligence','Live anonymized caller-intelligence metrics from Supabase.'],
    analytics:['Website analytics','Anonymous website traffic, page views and download conversion.'],
    reports:['Reports','The current Worker accepts reports but does not expose an admin queue.'],
    releases:['Releases','Versions and update gates stored in the live runtime config.'],
    remote:['Remote config','Live app behavior and copy from the WHO runtime_config row.'],
    announcements:['Announcements','Live announcement fields in the WHO runtime config.'],
    crashes:['Crashes','Live crash reports from the WHO D1 crash_reports table.'],
    feedback:['Feedback','The current Worker does not expose an admin feedback queue.'],
    audit:['Audit','The current Worker does not expose an admin audit-list route.']
  };

  const defaultConfig = {
    appVersion:'1.0.0',
    latestVersion:'1.0.0',
    minimumVersion:'1.0.0',
    forceUpdate:false,
    updateUrl:'https://squashberry.github.io/who/download.html',
    forceUpdateTitle:'WHO update required',
    forceUpdateMessage:'You need to update this app to continue using it.',
    forceUpdateButton:'Update WHO',
    softUpdateTitle:'A new WHO update is available',
    softUpdateMessage:'A newer version of WHO is available with improvements and fixes.',
    softUpdateButton:'Update now',
    softUpdateLaterButton:'Later',
    welcomeEnabled:true,
    welcomeRevision:1,
    welcomeTitle:'WHO Beta 1.0',
    welcomeMessage:'This is a WHO Beta 1.0 app created by Squashberry.',
    welcomeEmail:'squashberrypro@gmail.com',
    welcomeButtonText:'Continue',
    welcomeFeedbackButtonText:'Give feedback',
    welcomeFeedbackUrl:'https://squashberry.github.io/who/feedback.html',
    maintenanceEnabled:false,
    maintenanceTitle:'WHO is temporarily unavailable',
    maintenanceMessage:'WHO is undergoing maintenance. Please try again later.',
    announcementEnabled:false,
    announcementTitle:'',
    announcementMessage:'',
    crashReportUrl:''
  };

  let token = sessionStorage.getItem('who_admin_token') || '';
  let currentUser = null;
  let serverConfig = {...defaultConfig};
  let allCrashes = [];
  let crashFilter = 'pending';
  let deferredPrompt = null;
  let liveStats = null;
  let downloadStats = null;
  let downloadRange = 1;
  let websiteStats = null;
  let websiteRange = 1;

  function setAdminBootProgress(value, status) {
    const bar = document.getElementById('adminBootProgress');
    const percent = document.getElementById('adminBootPercent');
    const label = document.getElementById('adminBootStatus');
    const safe = Math.max(0, Math.min(100, Math.round(value)));
    if (bar) bar.style.width = safe + '%';
    if (percent) percent.textContent = safe + '%';
    if (label && status) label.textContent = status;
  }

  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    clearTimeout(window.__whoToast);
    window.__whoToast = setTimeout(() => {
      el.style.display = 'none';
    }, 2800);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[c]));
  }

  function extractConfig(payload) {
    const copy = {...payload};
    delete copy.success;
    delete copy.revision;
    delete copy.updatedAt;
    delete copy.error;
    return {...defaultConfig, ...copy};
  }

  async function apiFetch(path, options = {}) {
    const {
      method = 'GET',
      body,
      auth = true
    } = options;

    const headers = {
      Accept: 'application/json'
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (auth && token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    let response;

    try {
      response = await fetch(API_BASE + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store'
      });
    } catch (_) {
      const error = new Error('Unable to reach the WHO API.');
      error.status = 0;
      throw error;
    }

    let data = {};
    const raw = await response.text();

    if (raw.trim()) {
      try {
        data = JSON.parse(raw);
      } catch (_) {
        data = {};
      }
    }

    if (!response.ok) {
      if (response.status === 401 && auth && path !== '/admin/login') {
        token = '';
        sessionStorage.removeItem('who_admin_token');
        showAuthScreen(data.error || 'Authentication required.');
      }

      const error = new Error(data.error || ('WHO API error (' + response.status + ')'));
      error.status = response.status;
      throw error;
    }

    return data;
  }

  function showAuthScreen(message = '') {
    const root = document.getElementById('adminAuthRoot');
    const input = document.getElementById('adminPassword');
    const error = document.getElementById('adminAuthError');

    if (root) {
      root.classList.add('show');
      root.setAttribute('aria-hidden', 'false');
    }

    if (error) {
      error.textContent = message || '';
    }

    window.setTimeout(() => input?.focus(), 40);
  }

  function hideAuthScreen() {
    const root = document.getElementById('adminAuthRoot');
    const error = document.getElementById('adminAuthError');
    const input = document.getElementById('adminPassword');

    if (root) {
      root.classList.remove('show');
      root.setAttribute('aria-hidden', 'true');
    }

    if (error) {
      error.textContent = '';
    }

    if (input) {
      input.value = '';
    }
  }

  async function loginAdmin(password) {
    const button = document.getElementById('adminLoginButton');
    const error = document.getElementById('adminAuthError');

    if (button) {
      button.disabled = true;
      button.textContent = 'Unlocking…';
    }

    if (error) {
      error.textContent = '';
    }

    try {
      const result = await apiFetch('/admin/login', {
        method: 'POST',
        auth: false,
        body: {password}
      });

      token = String(result.accessToken || '');
      if (!token) {
        throw new Error('The WHO API did not return an admin session.');
      }

      sessionStorage.setItem('who_admin_token', token);
      currentUser = result.user || {
        displayName: 'Squashberry',
        role: 'admin'
      };

      hideAuthScreen();
      setAdminBootProgress(58, 'Admin session verified. Loading live data…');
      await refreshData();
      setAdminBootProgress(100, 'WHO Control is ready.');
      setApiState(true, 'Live WHO control center');
    } catch (error) {
      if (error.status === 401) {
        showAuthScreen('Incorrect password.');
      } else {
        showAuthScreen(error.message || 'Unable to sign in.');
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Unlock WHO Control';
      }
    }
  }

  async function logoutAdmin() {
    try {
      if (token) {
        await apiFetch('/admin/logout', {
          method: 'POST'
        });
      }
    } catch (_) {
      // Local logout still proceeds when the network is unavailable.
    }

    token = '';
    currentUser = null;
    sessionStorage.removeItem('who_admin_token');
    setApiState(false, 'Admin authentication required.');
    showAuthScreen('Admin session locked.');
  }

  function setApiState(connected, detail = '') {
    const chip = document.getElementById('apiChip');
    const badge = document.getElementById('connectionBadge');
    const surface = document.getElementById('adminSurfaceStatus');

    if (chip) {
      chip.innerHTML = '<i></i> ' + (connected ? 'API connected' : 'Authentication required');
      chip.classList.toggle('connected', connected);
    }

    if (badge) {
      badge.textContent = connected ? 'LIVE BACKEND' : 'AUTHENTICATION REQUIRED';
    }

    if (surface) {
      surface.textContent = connected ? (currentUser?.role || 'authorized') : 'Not authenticated';
    }

    if (detail) {
      const ov = document.getElementById('overviewMessage');
      if (ov) ov.textContent = detail;
    }
  }

  async function validateAdminSession() {
    if (!token) {
      setApiState(false, 'Admin authentication required.');
      showAuthScreen();
      return false;
    }

    try {
      const result = await apiFetch('/admin/session', {method:'GET'});
      currentUser = result.user || {
        displayName: 'Squashberry',
        role: 'admin'
      };
      hideAuthScreen();
      setApiState(true, 'Live WHO control center');
      await refreshData();
      return true;
    } catch (_) {
      token = '';
      currentUser = null;
      sessionStorage.removeItem('who_admin_token');
      setApiState(false, 'Admin authentication required.');
      showAuthScreen();
      return false;
    }
  }

  function setPage(page) {
    const chosen = sections.some((s) => s.dataset.section === page)
      ? page
      : 'overview';

    sections.forEach((s) => {
      s.classList.toggle('active', s.dataset.section === chosen);
    });

    navButtons.forEach((b) => {
      b.classList.toggle('active', b.dataset.page === chosen);
    });

    title.textContent = meta[chosen][0];

    if (currentUser) {
      sub.textContent = meta[chosen][1] + ' · ' +
        (currentUser.displayName || currentUser.email);
    } else {
      sub.textContent = meta[chosen][1];
    }

    if (location.hash !== '#' + chosen) {
      history.replaceState(null, '', '#' + chosen);
    }

    window.scrollTo({top:0, behavior:'auto'});
  }

  navButtons.forEach((button) => {
    button.addEventListener('click', () => setPage(button.dataset.page));
  });

  document.querySelectorAll('[data-jump]').forEach((button) => {
    button.addEventListener('click', () => setPage(button.dataset.jump));
  });

  function setToggle(id, value) {
    const el = document.getElementById(id);
    if (!el) return;

    el.classList.toggle('on', Boolean(value));
    el.setAttribute('aria-pressed', String(Boolean(value)));
  }

  function getToggle(id) {
    return document.getElementById(id)?.classList.contains('on') === true;
  }

  document.querySelectorAll('.toggle').forEach((el) => {
    el.addEventListener('click', () => {
      el.classList.toggle('on');
      el.setAttribute('aria-pressed', String(el.classList.contains('on')));
      updateAnnouncementPreview();
      renderStats();
    });
  });

  function applyConfigToUi(config) {
    document.getElementById('latestVersion').value = config.latestVersion || '';
    document.getElementById('minimumVersion').value = config.minimumVersion || '';
    document.getElementById('updateUrl').value = config.updateUrl || '';
    document.getElementById('forceTitle').value = config.forceUpdateTitle || '';
    document.getElementById('forceMessage').value = config.forceUpdateMessage || '';

    document.getElementById('welcomeTitle').value = config.welcomeTitle || '';
    document.getElementById('welcomeButton').value = config.welcomeButtonText || '';
    document.getElementById('welcomeMessage').value = config.welcomeMessage || '';

    document.getElementById('maintenanceTitle').value = config.maintenanceTitle || '';
    document.getElementById('maintenanceMessage').value = config.maintenanceMessage || '';

    document.getElementById('announcementTitle').value = config.announcementTitle || '';
    document.getElementById('announcementMessage').value = config.announcementMessage || '';

    document.getElementById('annTitle').value = config.announcementTitle || '';
    document.getElementById('annMessage').value = config.announcementMessage || '';
    document.getElementById('annButton').value = config.announcementButton || 'Continue';
    document.getElementById('annRevision').value = config.announcementRevision || 1;

    setToggle('forceToggle', config.forceUpdate);
    setToggle('welcomeToggle', config.welcomeEnabled);
    setToggle('maintenanceToggle', config.maintenanceEnabled);
    setToggle('announcementToggle', config.announcementEnabled);

    const releaseTag = document.querySelector('[data-section="releases"] .tag.blue');
    if (releaseTag) releaseTag.textContent = config.appVersion || config.latestVersion || '—';

    updateAnnouncementPreview();
    renderStats();
  }

  function readConfigFromUi() {
    return {
      ...serverConfig,
      latestVersion: document.getElementById('latestVersion').value.trim(),
      minimumVersion: document.getElementById('minimumVersion').value.trim(),
      updateUrl: document.getElementById('updateUrl').value.trim(),

      forceUpdate: getToggle('forceToggle'),
      forceUpdateTitle: document.getElementById('forceTitle').value,
      forceUpdateMessage: document.getElementById('forceMessage').value,

      welcomeEnabled: getToggle('welcomeToggle'),
      welcomeTitle: document.getElementById('welcomeTitle').value,
      welcomeButtonText: document.getElementById('welcomeButton').value,
      welcomeMessage: document.getElementById('welcomeMessage').value,

      maintenanceEnabled: getToggle('maintenanceToggle'),
      maintenanceTitle: document.getElementById('maintenanceTitle').value,
      maintenanceMessage: document.getElementById('maintenanceMessage').value,

      announcementEnabled: getToggle('announcementToggle'),
      announcementTitle: document.getElementById('announcementTitle').value,
      announcementMessage: document.getElementById('announcementMessage').value,
      announcementButton: document.getElementById('annButton').value,
      announcementRevision: Number(document.getElementById('annRevision').value) || 1
    };
  }

  async function loadConfig() {
    try {
      const result = await apiFetch('/admin/config', {method:'GET'});
      serverConfig = extractConfig(result);
      applyConfigToUi(serverConfig);
      toast(
        'Backend config loaded · revision ' +
        String(result.revision ?? '—')
      );
    } catch (error) {
      toast(error.message);
    }
  }

  async function saveServerConfig(nextConfig, successMessage) {
    try {
      const result = await apiFetch('/admin/config', {
        method:'PATCH',
        body:nextConfig
      });

      serverConfig = extractConfig(result);
      applyConfigToUi(serverConfig);
      toast(successMessage || 'WHO backend configuration saved.');
      return true;
    } catch (error) {
      return false;
    }
  }

  async function saveConfig() {
    await saveServerConfig(
      readConfigFromUi(),
      'Remote configuration saved to WHO.'
    );
  }

  async function saveRelease() {
    await saveServerConfig(
      readConfigFromUi(),
      'Release settings saved to WHO.'
    );
  }

  function updateAnnouncementPreview() {
    const titleValue =
      document.getElementById('annTitle')?.value.trim() || 'Your WHO message';

    const messageValue =
      document.getElementById('annMessage')?.value.trim() ||
      'Write an announcement and see how it will look inside the app.';

    const titleEl = document.getElementById('previewAnnouncementTitle');
    const messageEl = document.getElementById('previewAnnouncementMessage');

    if (titleEl) titleEl.textContent = titleValue;
    if (messageEl) messageEl.textContent = messageValue;
  }

  async function publishAnnouncement() {
    const nextConfig = {
      ...serverConfig,
      announcementEnabled: true,
      announcementTitle: document.getElementById('annTitle').value.trim(),
      announcementMessage: document.getElementById('annMessage').value,
      announcementRevision: Number(document.getElementById('annRevision').value) || 1,
      announcementButton: document.getElementById('annButton').value.trim() || 'Continue'
    };

    await saveServerConfig(
      nextConfig,
      'Announcement published to WHO.'
    );
  }

  function copyConfig() {
    const text = JSON.stringify(readConfigFromUi(), null, 2);

    navigator.clipboard?.writeText(text)
      .then(() => toast('Live config JSON copied.'))
      .catch(() => window.prompt('Copy WHO runtime config JSON', text));
  }

  function formatMetric(value) {
    const number = Number(value || 0);
    return new Intl.NumberFormat().format(number);
  }

  function renderMultiLineChart(svgId, series, lines, footerId) {
    const svg = document.getElementById(svgId);
    if (!svg) return;

    const width = 760;
    const height = 280;
    const pad = {top: 18, right: 20, bottom: 34, left: 38};
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    const pointsCount = series.length || 1;
    const allValues = [];

    lines.forEach((line) => {
      series.forEach((row) => {
        allValues.push(Number(row[line.key] || 0));
      });
    });

    const maxValue = Math.max(1, ...allValues);
    const stepX = pointsCount > 1 ? chartW / (pointsCount - 1) : chartW;

    const grid = [0, .25, .5, .75, 1].map((ratio) => {
      const y = pad.top + chartH * ratio;
      return '<line x1="' + pad.left + '" y1="' + y +
        '" x2="' + (width - pad.right) + '" y2="' + y +
        '" class="chart-grid-line"></line>';
    }).join('');

    const paths = lines.map((line) => {
      const d = series.map((row, index) => {
        const value = Number(row[line.key] || 0);
        const x = pad.left + stepX * index;
        const y = pad.top + chartH - (value / maxValue) * chartH;
        return (index === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
      }).join(' ');

      const dots = series.map((row, index) => {
        const value = Number(row[line.key] || 0);
        const x = pad.left + stepX * index;
        const y = pad.top + chartH - (value / maxValue) * chartH;
        return '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) +
          '" r="2.5" class="' + line.dotClass + '"></circle>';
      }).join('');

      return '<path d="' + d + '" class="' + line.pathClass + '"></path>' + dots;
    }).join('');

    const labels = series.map((row, index) => {
      if (index !== 0 && index !== series.length - 1 && index !== Math.floor(series.length / 2)) {
        return '';
      }
      const x = pad.left + stepX * index;
      const date = String(row.date || '').slice(5);
      return '<text x="' + x.toFixed(2) + '" y="' + (height - 10) +
        '" text-anchor="middle" class="chart-label">' + escapeHtml(date) + '</text>';
    }).join('');

    const legend = lines.map((line) =>
      '<span><i class="' + line.dotClass + '"></i>' + escapeHtml(line.label) + '</span>'
    ).join('');

    svg.innerHTML =
      grid +
      '<line x1="' + pad.left + '" y1="' + (height - pad.bottom) +
        '" x2="' + (width - pad.right) + '" y2="' + (height - pad.bottom) +
        '" class="chart-axis"></line>' +
      paths +
      labels;

    const footer = document.getElementById(footerId);
    if (footer) footer.innerHTML = '<div class="chart-legend">' + legend + '</div>';
  }

  function renderLiveStats() {
    const summary = liveStats?.summary || {};
    const series = Array.isArray(liveStats?.series) ? liveStats.series : [];

    const ids = {
      usersTotalStat: summary.usersTotal,
      usersTodayStat: summary.usersToday,
      devicesTotalStat: summary.devicesTotal,
      devicesTodayStat: summary.activeDevicesToday,
      callerNumbersTotalStat: summary.callerNumbersTotal,
      callerNumbersTodayStat: summary.callerNumbersToday,
      verifiedContactsStat: summary.verifiedContactsTotal,
      callerObservationsStat: summary.callerObservationsTotal,
      callerObservationsTodayStat: summary.callerObservationsToday,
      reportTotalStat: summary.reportsTotal,
      reportTodayStat: summary.reportsToday,
      crashStat: summary.crashesTotal
    };

    Object.keys(ids).forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = formatMetric(ids[id]);
    });

    const sub = {
      usersTodayStatSub: formatMetric(summary.usersToday) + ' new accounts today',
      callerObservationsTodayStatSub: formatMetric(summary.callerObservationsToday) + ' today',
      reportTodayStatSub: formatMetric(summary.reportsToday) + ' today',
      crashStatSub: formatMetric(summary.crashesToday) + ' today'
    };

    Object.entries(sub).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });

    const pageIds = {
      usersPageTotal: summary.usersTotal,
      usersPageToday: summary.usersToday,
      devicesPageTotal: summary.devicesTotal,
      devicesPageToday: summary.activeDevicesToday,
      callerPageNumbers: summary.callerNumbersTotal,
      callerPageToday: summary.callerNumbersToday,
      callerPageVerified: summary.verifiedContactsTotal,
      callerPageEvidence: summary.deviceEvidenceRows
    };

    Object.entries(pageIds).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = formatMetric(value);
    });

    renderMultiLineChart(
      'usersChart',
      series,
      [
        {key:'users', label:'Users', pathClass:'chart-line chart-line-blue', dotClass:'chart-dot chart-dot-blue'},
        {key:'devices', label:'Devices', pathClass:'chart-line chart-line-cyan', dotClass:'chart-dot chart-dot-cyan'}
      ],
      'usersChartFooter'
    );

    renderMultiLineChart(
      'callerChart',
      series,
      [
        {key:'callerNumbers', label:'Numbers', pathClass:'chart-line chart-line-green', dotClass:'chart-dot chart-dot-green'},
        {key:'callerObservations', label:'Observations', pathClass:'chart-line chart-line-blue', dotClass:'chart-dot chart-dot-blue'}
      ],
      'callerChartFooter'
    );

    renderMultiLineChart(
      'moderationChart',
      series,
      [
        {key:'reports', label:'Reports', pathClass:'chart-line chart-line-amber', dotClass:'chart-dot chart-dot-amber'},
        {key:'crashes', label:'Crashes', pathClass:'chart-line chart-line-red', dotClass:'chart-dot chart-dot-red'}
      ],
      'moderationChartFooter'
    );

    renderMultiLineChart(
      'usersPageChart',
      series,
      [
        {key:'users', label:'Users', pathClass:'chart-line chart-line-blue', dotClass:'chart-dot chart-dot-blue'},
        {key:'devices', label:'Devices', pathClass:'chart-line chart-line-cyan', dotClass:'chart-dot chart-dot-cyan'}
      ],
      null
    );

    renderDownloadChart();
    renderWebsiteAnalytics();

    renderMultiLineChart(
      'callerPageChart',
      series,
      [
        {key:'callerNumbers', label:'Numbers', pathClass:'chart-line chart-line-green', dotClass:'chart-dot chart-dot-green'},
        {key:'callerObservations', label:'Observations', pathClass:'chart-line chart-line-blue', dotClass:'chart-dot chart-dot-blue'}
      ],
      null
    );
  }


  function formatRangeLabel(days) {
    const labels = {1:'1 day',3:'3 days',7:'7 days',30:'1 month',180:'6 months',365:'1 year'};
    return labels[days] || (days + ' days');
  }

  function renderDownloadChart() {
    const summary = downloadStats?.summary || {};
    const series = Array.isArray(downloadStats?.series) ? downloadStats.series : [];
    const totalEl = document.getElementById('downloadTotalStat');
    const todayEl = document.getElementById('downloadTodayStat');
    if (totalEl) totalEl.textContent = formatMetric(summary.totalDownloads);
    if (todayEl) todayEl.textContent = formatMetric(summary.downloadsToday);

    const subtitle = document.getElementById('downloadChartSubtitle');
    if (subtitle) subtitle.textContent = 'Daily download starts · ' + formatRangeLabel(downloadRange);

    renderMultiLineChart(
      'downloadChart',
      series,
      [{key:'downloads', label:'Downloads', pathClass:'chart-line chart-line-blue', dotClass:'chart-dot chart-dot-blue'}],
      'downloadChartFooter'
    );

    const footer = document.getElementById('downloadChartFooter');
    if (footer) {
      footer.innerHTML =
        '<div class="chart-legend"><span><i class="chart-dot-blue"></i>' +
        formatMetric(summary.rangeTotal || 0) + ' starts in ' +
        escapeHtml(formatRangeLabel(downloadRange)) +
        '</span></div>';
    }
  }

  async function loadDownloadStats(days = downloadRange) {
    downloadRange = Number(days) || 1;
    try {
      const result = await apiFetch('/admin/download-stats?range=' + encodeURIComponent(downloadRange), {method:'GET'});
      downloadStats = result;
      renderDownloadChart();
    } catch (error) {
      downloadStats = null;
      renderDownloadChart();
      toast('Download metrics: ' + error.message);
    }
  }

  function renderWebsiteAnalytics() {
    const summary = websiteStats?.summary || {};
    const series = Array.isArray(websiteStats?.series) ? websiteStats.series : [];
    const values = {
      websiteVisitorsTotalStat: summary.visitorsTotal,
      websiteVisitorsTodayStat: summary.visitorsToday,
      websiteActiveVisitorsStat: summary.activeVisitors,
      websitePageViewsTodayStat: summary.pageViewsToday,
      analyticsVisitorsTotal: summary.visitorsTotal,
      analyticsVisitorsToday: summary.visitorsToday,
      analyticsPageViewsTotal: summary.pageViewsTotal,
      analyticsActiveVisitors: summary.activeVisitors,
      analyticsDownloadsTotal: summary.downloadsTotal,
      analyticsDownloadsToday: summary.downloadsToday
    };
    Object.entries(values).forEach(([id,value]) => {
      const el=document.getElementById(id);
      if(el) el.textContent=formatMetric(value);
    });
    const totalConversion=Number(summary.visitorsTotal)>0 ? (Number(summary.downloadsTotal||0)/Number(summary.visitorsTotal)*100) : 0;
    const todayConversion=Number(summary.visitorsToday)>0 ? (Number(summary.downloadsToday||0)/Number(summary.visitorsToday)*100) : 0;
    const ct=document.getElementById('analyticsConversionTotal');
    const cd=document.getElementById('analyticsConversionToday');
    if(ct) ct.textContent=totalConversion.toFixed(1)+'%';
    if(cd) cd.textContent=todayConversion.toFixed(1)+'%';
    const subtitle=document.getElementById('websiteChartSubtitle');
    if(subtitle) subtitle.textContent='Daily activity · '+formatRangeLabel(websiteRange);
    renderMultiLineChart('websiteAnalyticsChart',series,[
      {key:'visitors',label:'Visitors',pathClass:'chart-line chart-line-blue',dotClass:'chart-dot chart-dot-blue'},
      {key:'pageViews',label:'Page views',pathClass:'chart-line chart-line-cyan',dotClass:'chart-dot chart-dot-cyan'},
      {key:'downloads',label:'Downloads',pathClass:'chart-line chart-line-green',dotClass:'chart-dot chart-dot-green'}
    ],'websiteAnalyticsChartFooter');
    const footer=document.getElementById('websiteAnalyticsChartFooter');
    if(footer) footer.innerHTML='<div class="chart-legend"><span><i class="chart-dot-blue"></i>'+formatMetric(summary.rangeVisitors||0)+' visitors</span><span><i class="chart-dot-cyan"></i>'+formatMetric(summary.rangePageViews||0)+' page views</span><span><i class="chart-dot-green"></i>'+formatMetric(summary.rangeDownloads||0)+' downloads</span></div>';
    const pages=document.getElementById('websiteTopPages');
    const pageRows=Array.isArray(websiteStats?.topPages)?websiteStats.topPages:[];
    if(pages) pages.innerHTML=pageRows.length?pageRows.map(row=>'<div class="analytics-row"><span>'+escapeHtml(row.path||'/')+'</span><b>'+formatMetric(row.views||0)+'</b></div>').join(''):'<div class="analytics-row"><span>No page-view data yet.</span><b>0</b></div>';
    const sources=document.getElementById('websiteTrafficSources');
    const sourceRows=Array.isArray(websiteStats?.sources)?websiteStats.sources:[];
    if(sources) sources.innerHTML=sourceRows.length?sourceRows.map(row=>'<div class="analytics-row"><span>'+escapeHtml(row.source||'Direct')+'</span><b>'+formatMetric(row.visitors||0)+'</b></div>').join(''):'<div class="analytics-row"><span>Direct / unknown</span><b>0</b></div>';
  }

  async function loadWebsiteStats(days=websiteRange) {
    websiteRange=Number(days)||1;
    try {
      const result=await apiFetch('/admin/website-stats?range='+encodeURIComponent(websiteRange),{method:'GET'});
      websiteStats=result;
      renderWebsiteAnalytics();
    } catch (error) {
      websiteStats=null;
      renderWebsiteAnalytics();
      toast('Website analytics: '+error.message);
    }
  }

  function renderStats() {
    const appVersion = serverConfig.appVersion || serverConfig.latestVersion || '—';
    const force = Boolean(serverConfig.forceUpdate);
    const announcement = Boolean(serverConfig.announcementEnabled);

    const appVersionStat = document.getElementById('appVersionStat');
    const appVersionSub = document.getElementById('appVersionSub');
    const forceStat = document.getElementById('forceStat');
    const announceStat = document.getElementById('announceStat');
    const crashStat = document.getElementById('crashStat');
    const crashStatSub = document.getElementById('crashStatSub');

    if (appVersionStat) appVersionStat.textContent = appVersion;
    if (appVersionSub) appVersionSub.textContent =
      'Latest ' + (serverConfig.latestVersion || '—');
    if (forceStat) forceStat.textContent = force ? 'ON' : 'OFF';
    if (announceStat) announceStat.textContent = announcement ? 'ON' : 'OFF';
    if (crashStat) crashStat.textContent =
      liveStats ? formatMetric(liveStats.summary?.crashesTotal) : String(allCrashes.length);
    if (crashStatSub) crashStatSub.textContent =
      liveStats
        ? formatMetric(liveStats.summary?.crashesToday) + ' today'
        : (allCrashes.length ? 'Latest records loaded' : 'No crash records returned');

    renderLiveStats();
  }

  async function loadStats() {
    try {
      const result = await apiFetch('/admin/stats', {method:'GET'});
      liveStats = result;
      renderStats();
    } catch (error) {
      liveStats = null;
      renderStats();
      toast(error.message);
    }
  }

  function renderCrashStats() {
    const pending = allCrashes.filter((r) => (r.status || 'pending') === 'pending');
    const fixed = allCrashes.filter((r) => r.status === 'fixed');
    const fatal = allCrashes.filter((r) => Number(r.fatal) === 1 || r.fatal === true);

    const today = new Date().toISOString().slice(0, 10);
    const todayRows = allCrashes.filter((r) =>
      String(r.received_at || '').slice(0, 10) === today
    );

    document.getElementById('pendingCrash').textContent = String(pending.length);
    document.getElementById('fixedCrash').textContent = String(fixed.length);
    document.getElementById('fatalCrash').textContent = String(fatal.length);
    document.getElementById('todayCrash').textContent = String(todayRows.length);
  }

  function renderCrashes() {
    const body = document.getElementById('crashBody');
    if (!body) return;

    const rows = allCrashes.filter((row) => {
      const status = row.status || 'pending';
      return crashFilter === 'all' || status === crashFilter;
    });

    body.innerHTML = rows.length
      ? rows.map((row) => {
          const fatal = Number(row.fatal) === 1 || row.fatal === true;
          const status = row.status || 'pending';
          const when = row.received_at
            ? new Date(row.received_at).toLocaleString()
            : '—';

          return '<tr>' +
            '<td>' + escapeHtml(when) + '</td>' +
            '<td><span class="tag ' + (fatal ? 'red' : 'amber') + '">' +
              (fatal ? 'Fatal' : 'Non-fatal') +
            '</span></td>' +
            '<td>' + escapeHtml(row.app_version || '—') + '</td>' +
            '<td>' + escapeHtml(row.platform || '—') + '</td>' +
            '<td title="' + escapeHtml(row.error || '') + '">' +
              escapeHtml((row.error || row.stack || 'No error text').slice(0, 180)) +
            '</td>' +
            '<td><span class="tag ' + (status === 'fixed' ? 'green' : 'amber') + '">' +
              escapeHtml(status) +
            '</span></td>' +
            '<td><button class="ghost-btn" data-crash-action="' +
              escapeHtml(row.id) + '" data-crash-status="' + status + '">' +
              (status === 'fixed' ? 'Reopen' : 'Fix') +
            '</button></td>' +
            '</tr>';
        }).join('')
      : '<tr><td colspan="7">No real crash reports in this view.</td></tr>';

    body.querySelectorAll('[data-crash-action]').forEach((button) => {
      button.addEventListener('click', () =>
        updateCrash(
          button.dataset.crashAction,
          button.dataset.crashStatus === 'fixed' ? 'pending' : 'fixed'
        )
      );
    });

    renderCrashStats();
    renderStats();
  }

  async function loadCrashes() {
    try {
      const result = await apiFetch('/admin/crashes?limit=200', {method:'GET'});
      allCrashes = Array.isArray(result.reports) ? result.reports : [];
      renderCrashes();
    } catch (error) {
      toast(error.message);
      allCrashes = [];
      renderCrashes();
    }
  }

  async function updateCrash(crashId, status) {
    if (!crashId) return;

    let fixNote = '';

    if (status === 'fixed') {
      fixNote = window.prompt(
        'Optional fix note for this crash:',
        ''
      ) || '';
    }

    try {
      await apiFetch('/admin/crashes/' + encodeURIComponent(crashId), {
        method:'PATCH',
        body:{
          status,
          fixNote
        }
      });

      toast(status === 'fixed'
        ? 'Crash marked fixed.'
        : 'Crash reopened.'
      );

      await loadCrashes();
    } catch (error) {
      toast(error.message);
    }
  }

  function refreshAnnouncementInputs() {
    ['annTitle','annMessage','annButton','annRevision'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', updateAnnouncementPreview);
    });
  }

  async function refreshData() {
    setApiState(
      true,
      'Live WHO Control · loading live data'
    );

    setAdminBootProgress(72, 'Loading live WHO configuration…');

    await Promise.all([
      loadConfig(),
      loadCrashes(),
      loadStats(),
      loadDownloadStats(downloadRange),
      loadWebsiteStats(websiteRange)
    ]);

    setAdminBootProgress(90, 'Live backend data loaded.');
    setApiState(
      true,
      'Live WHO Control · backend connected'
    );
  }

  document.getElementById('adminLoginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.getElementById('adminPassword');
    const password = input?.value || '';
    if (!password) {
      showAuthScreen('Enter the admin password.');
      return;
    }
    await loginAdmin(password);
  });

  document.getElementById('adminLogout')?.addEventListener('click', async () => {
    await logoutAdmin();
  });

  document.getElementById('refreshButton')?.addEventListener('click', async () => {
    await refreshData();
    toast('Live backend data refreshed.');
  });

  document.getElementById('refreshCrashes')?.addEventListener('click', async () => {
    await loadCrashes();
    toast('Crash reports refreshed.');
  });


  document.querySelectorAll('[data-website-range]').forEach((button) => {
    button.addEventListener('click', async () => {
      websiteRange=Number(button.dataset.websiteRange)||1;
      document.querySelectorAll('[data-website-range]').forEach((b)=>b.classList.toggle('active',b===button));
      await loadWebsiteStats(websiteRange);
    });
  });

  document.querySelectorAll('[data-download-range]').forEach((button) => {
    button.addEventListener('click', async () => {
      downloadRange = Number(button.dataset.downloadRange) || 1;
      document.querySelectorAll('[data-download-range]').forEach((b) => {
        b.classList.toggle('active', b === button);
      });
      await loadDownloadStats(downloadRange);
    });
  });

  document.querySelectorAll('[data-crash-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      crashFilter = button.dataset.crashFilter;
      document.querySelectorAll('[data-crash-filter]').forEach((b) => {
        b.classList.toggle('active', b === button);
      });
      renderCrashes();
    });
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });

  document.getElementById('adminInstall')?.addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt = null;
    } else {
      alert('Use the browser menu to install WHO Control when the install option is available.');
    }
  });

  window.addEventListener('hashchange', () => {
    if (location.hash) setPage(location.hash.slice(1));
  });

  window.addEventListener('DOMContentLoaded', () => {
    setAdminBootProgress(22, 'Preparing WHO Control…');
    refreshAnnouncementInputs();

    setTimeout(() => setAdminBootProgress(40, 'Checking WHO session…'), 120);
  });

  window.addEventListener('load', async () => {
    setAdminBootProgress(55, 'Checking WHO Control session…');

    const authenticated = await validateAdminSession();

    if (authenticated && location.hash) {
      setPage(location.hash.slice(1));
    }

    setAdminBootProgress(
      authenticated ? 100 : 100,
      authenticated
        ? 'WHO Control is ready.'
        : 'Admin sign-in required.'
    );

    setTimeout(() => boot?.classList.add('hide'), 350);
  });


  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  window.saveRelease = saveRelease;
  window.saveConfig = saveConfig;
  window.loadConfig = loadConfig;
  window.copyConfig = copyConfig;
  window.publishAnnouncement = publishAnnouncement;
  window.toast = toast;
  window.updateCrash = updateCrash;

  setApiState(false, 'Admin authentication required.');
  renderStats();
  renderCrashStats();
  renderCrashes();
})();