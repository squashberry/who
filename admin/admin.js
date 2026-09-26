(() => {
  'use strict';

  const API_BASE = 'https://who-api.who-fe3.workers.dev';
  const SESSION_KEY = 'who-control.session-token';

  const boot = document.getElementById('adminBoot');
  const title = document.getElementById('pageTitle');
  const sub = document.getElementById('pageSub');
  const sections = [...document.querySelectorAll('.page')];
  const navButtons = [...document.querySelectorAll('[data-page]')];

  const meta = {
    overview:['Overview','Live WHO backend control and system status.'],
    users:['Users','Live account and device metrics from WHO D1.'],
    caller:['Caller intelligence','Live anonymized caller-intelligence metrics from Supabase.'],
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

  let token = sessionStorage.getItem(SESSION_KEY) || '';
  let currentUser = null;
  let serverConfig = {...defaultConfig};
  let allCrashes = [];
  let crashFilter = 'pending';
  let deferredPrompt = null;
  let authBusy = false;
  let liveStats = null;

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
      headers.Authorization = 'Bearer ' + token;
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
      const error = new Error(data.error || ('WHO API error (' + response.status + ')'));
      error.status = response.status;
      throw error;
    }

    return data;
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

  function showAuth(step = 'request', message = '') {
    const root = document.getElementById('adminAuthRoot');
    const requestStep = document.getElementById('authStepRequest');
    const verifyStep = document.getElementById('authStepVerify');
    const error = document.getElementById('authError');

    if (!root) return;

    root.classList.add('show');
    root.setAttribute('aria-hidden', 'false');

    if (requestStep) requestStep.hidden = step !== 'request';
    if (verifyStep) verifyStep.hidden = step !== 'verify';
    if (error) error.textContent = message || '';

    const target = step === 'verify'
      ? document.getElementById('authCode')
      : document.getElementById('authEmail');

    setTimeout(() => target?.focus(), 50);
  }

  function hideAuth() {
    const root = document.getElementById('adminAuthRoot');
    if (!root) return;
    root.classList.remove('show');
    root.setAttribute('aria-hidden', 'true');
  }

  function setAuthError(message) {
    const error = document.getElementById('authError');
    if (error) error.textContent = message || '';
  }

  function setAuthBusy(value) {
    authBusy = value;

    const send = document.getElementById('authSendCode');
    const verify = document.getElementById('authVerifyCode');

    if (send) {
      send.disabled = value;
      send.textContent = value ? 'Sending…' : 'Send verification code';
    }

    if (verify) {
      verify.disabled = value;
      verify.textContent = value ? 'Verifying…' : 'Verify & enter';
    }
  }

  function readAuthForm() {
    return {
      name: document.getElementById('authName')?.value.trim() || '',
      email: document.getElementById('authEmail')?.value.trim().toLowerCase() || '',
      phoneNumber: document.getElementById('authPhone')?.value.trim() || ''
    };
  }

  function validateAuthForm(values) {
    if (values.name.length < 2) return 'Enter your WHO account name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return 'Enter a valid email address.';
    if (values.phoneNumber.replace(/\D/g, '').length < 7) return 'Enter a valid phone number.';
    return '';
  }

  async function requestAuthCode() {
    if (authBusy) return;

    const values = readAuthForm();
    const validation = validateAuthForm(values);

    if (validation) {
      setAuthError(validation);
      return;
    }

    setAuthBusy(true);
    setAuthError('');

    try {
      await apiFetch('/auth/request-code', {
        method: 'POST',
        auth: false,
        body: values
      });

      const echo = document.getElementById('authEmailEcho');
      if (echo) echo.textContent = values.email;

      toast('Verification code sent.');
      showAuth('verify');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function verifyAuthCode() {
    if (authBusy) return;

    const values = readAuthForm();
    const code = document.getElementById('authCode')?.value.trim() || '';

    const validation = validateAuthForm(values);

    if (validation) {
      setAuthError(validation);
      showAuth('request', validation);
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setAuthError('Enter the 6-digit verification code.');
      return;
    }

    setAuthBusy(true);
    setAuthError('');

    try {
      const result = await apiFetch('/auth/verify-code', {
        method: 'POST',
        auth: false,
        body: {
          ...values,
          code
        }
      });

      const accessToken =
        String(result.accessToken || result.sessionToken || result.token || '');

      if (!accessToken) {
        throw new Error('WHO account was verified, but no session token was returned.');
      }

      token = accessToken;
      sessionStorage.setItem(SESSION_KEY, token);

      await validateAdminSession();

      toast('WHO Control authenticated.');
    } catch (error) {
      sessionStorage.removeItem(SESSION_KEY);
      token = '';
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function validateAdminSession() {
    if (!token) {
      throw new Error('Authentication required.');
    }

    const result = await apiFetch('/me', {method:'GET'});

    const user = result.user || {};
    const role = String(user.role || '').toLowerCase();

    if (role !== 'admin' && role !== 'moderator') {
      const error = new Error('This WHO account does not have administrator access.');
      error.status = 403;
      throw error;
    }

    currentUser = user;

    hideAuth();
    setApiState(
      true,
      'Authenticated as ' +
        (user.displayName || user.name || user.email || 'WHO administrator') +
        ' · ' + role
    );

    const authIntro = document.getElementById('authIntro');
    if (authIntro) {
      authIntro.textContent = 'Authenticated.';
    }

    const pageSub = document.getElementById('pageSub');
    if (pageSub && location.hash === '') {
      pageSub.textContent =
        'Authenticated as ' +
        (user.displayName || user.name || user.email) +
        ' · ' + role;
    }

    await refreshData();
  }

  async function signOut(showLogin = true) {
    token = '';
    currentUser = null;
    serverConfig = {...defaultConfig};
    allCrashes = [];

    sessionStorage.removeItem(SESSION_KEY);

    setApiState(false);
    renderStats();

    if (showLogin) {
      showAuth('request', 'Signed out of WHO Control.');
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
    if (!token) {
      showAuth();
      return;
    }

    try {
      const result = await apiFetch('/admin/config', {method:'GET'});
      serverConfig = extractConfig(result);
      applyConfigToUi(serverConfig);
      toast(
        'Backend config loaded · revision ' +
        String(result.revision ?? '—')
      );
    } catch (error) {
      if (error.status === 401) {
        await signOut(false);
        showAuth('request', 'Your WHO session expired. Please sign in again.');
        return;
      }

      if (error.status === 403) {
        await signOut(false);
        showAuth('request', 'This WHO account is not authorized for the control panel.');
        return;
      }

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
      if (error.status === 401) {
        await signOut(false);
        showAuth('request', 'Your WHO session expired. Please sign in again.');
      } else {
        toast(error.message);
      }

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
    if (!token) return;

    try {
      const result = await apiFetch('/admin/stats', {method:'GET'});
      liveStats = result;
      renderStats();
    } catch (error) {
      if (error.status === 401) {
        await signOut(false);
        showAuth('request', 'Your WHO session expired. Please sign in again.');
        return;
      }

      if (error.status === 403) {
        await signOut(false);
        showAuth('request', 'This WHO account is not authorized for live statistics.');
        return;
      }

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
    if (!token) return;

    try {
      const result = await apiFetch('/admin/crashes?limit=200', {method:'GET'});
      allCrashes = Array.isArray(result.reports) ? result.reports : [];
      renderCrashes();
    } catch (error) {
      if (error.status === 401) {
        await signOut(false);
        showAuth('request', 'Your WHO session expired. Please sign in again.');
        return;
      }

      if (error.status === 403) {
        await signOut(false);
        showAuth('request', 'This WHO account is not authorized for crash management.');
        return;
      }

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
      if (error.status === 401) {
        await signOut(false);
        showAuth('request', 'Your WHO session expired. Please sign in again.');
        return;
      }

      toast(error.message);
    }
  }

  function refreshAnnouncementInputs() {
    ['annTitle','annMessage','annButton','annRevision'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', updateAnnouncementPreview);
    });
  }

  async function refreshData() {
    if (!token) return;

    setApiState(
      true,
      'Authenticated as ' +
      (currentUser?.displayName || currentUser?.email || 'WHO administrator') +
      ' · loading live data'
    );

    setAdminBootProgress(72, 'Loading live WHO configuration…');

    await Promise.all([
      loadConfig(),
      loadCrashes(),
      loadStats()
    ]);

    setAdminBootProgress(90, 'Live backend data loaded.');
    setApiState(
      true,
      'Authenticated as ' +
      (currentUser?.displayName || currentUser?.email || 'WHO administrator') +
      ' · ' + (currentUser?.role || 'authorized')
    );
  }

  document.getElementById('authSendCode')?.addEventListener('click', requestAuthCode);
  document.getElementById('authVerifyCode')?.addEventListener('click', verifyAuthCode);

  document.getElementById('authBack')?.addEventListener('click', () => {
    setAuthError('');
    showAuth('request');
  });

  document.getElementById('authCode')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') verifyAuthCode();
  });

  document.getElementById('authEmail')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') requestAuthCode();
  });

  document.getElementById('refreshButton')?.addEventListener('click', async () => {
    if (!token) {
      showAuth();
      return;
    }

    await refreshData();
    toast('Live backend data refreshed.');
  });

  document.getElementById('refreshCrashes')?.addEventListener('click', async () => {
    await loadCrashes();
    toast('Crash reports refreshed.');
  });

  document.getElementById('adminSignOut')?.addEventListener('click', async () => {
    await signOut(true);
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
    setAdminBootProgress(55, 'Authenticating control center…');

    try {
      if (token) {
        await validateAdminSession();
      } else {
        showAuth('request');
      }

      if (location.hash) {
        setPage(location.hash.slice(1));
      }

      setAdminBootProgress(100, token ? 'WHO Control is ready.' : 'Sign in to continue.');
    } catch (error) {
      token = '';
      currentUser = null;
      sessionStorage.removeItem(SESSION_KEY);

      setApiState(false);
      showAuth(
        'request',
        error.status === 403
          ? 'This WHO account does not have administrator access.'
          : error.message
      );

      setAdminBootProgress(100, 'Administrator sign-in required.');
    }

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

  setApiState(Boolean(token));
  renderStats();
  renderCrashStats();
  renderCrashes();
})();