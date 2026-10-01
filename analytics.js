(() => {
  'use strict';

  const API_BASE = 'https://who-api.who-fe3.workers.dev';
  const VISITOR_KEY = 'who-web-visitor-id-v1';
  const SESSION_KEY = 'who-web-session-id-v1';

  const THEME_KEY = 'who-theme-preference-v1';

  function safeThemePreference(value) {
    return value === 'dark' || value === 'system' || value === 'light' ? value : 'light';
  }

  function readThemePreference() {
    try {
      return safeThemePreference(localStorage.getItem(THEME_KEY) || 'light');
    } catch (_) {
      return 'light';
    }
  }

  let themePreference = readThemePreference();
  const themeMedia = window.matchMedia?.('(prefers-color-scheme: dark)') || null;

  function resolvedTheme() {
    return themePreference === 'system'
      ? (themeMedia?.matches ? 'dark' : 'light')
      : themePreference;
  }

  function updateThemeMeta(theme) {
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = theme === 'dark' ? '#060812' : '#f5f8fc';

    let schemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (!schemeMeta) {
      schemeMeta = document.createElement('meta');
      schemeMeta.name = 'color-scheme';
      document.head.appendChild(schemeMeta);
    }
    schemeMeta.content = theme;
    document.documentElement.style.colorScheme = theme;
  }

  function themeLabel(preference) {
    if (preference === 'dark') return {icon:'☾', label:'Dark'};
    if (preference === 'system') return {icon:'◐', label:'System'};
    return {icon:'☀', label:'Light'};
  }

  function updateThemeControls() {
    const info = themeLabel(themePreference);
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const icon = button.querySelector('.theme-icon');
      const label = button.querySelector('.theme-label');
      if (icon) icon.textContent = info.icon;
      if (label) label.textContent = info.label;
      button.title = 'Theme: ' + info.label + ' · click to switch';
      button.setAttribute('aria-label', 'Theme: ' + info.label + '. Click to switch.');
      button.dataset.themePreference = themePreference;
    });
  }

  function applyTheme() {
    const theme = resolvedTheme();
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme-preference', themePreference);
    updateThemeMeta(theme);
    updateThemeControls();
  }

  function saveThemePreference(next) {
    themePreference = safeThemePreference(next);
    try {
      localStorage.setItem(THEME_KEY, themePreference);
    } catch (_) {}
    applyTheme();
  }

  function cycleTheme() {
    const next = themePreference === 'light'
      ? 'dark'
      : themePreference === 'dark'
        ? 'system'
        : 'light';
    saveThemePreference(next);
  }

  function injectThemeControl() {
    const host = document.querySelector('.top-actions') || document.querySelector('.top nav');
    if (!host || host.querySelector('[data-theme-toggle]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-control';
    button.setAttribute('data-theme-toggle', '');
    button.innerHTML = '<span class="theme-icon" aria-hidden="true"></span><span class="theme-label"></span>';
    button.addEventListener('click', cycleTheme);

    const cta = host.querySelector('.top-cta, a.cta');
    if (cta) host.insertBefore(button, cta);
    else host.appendChild(button);
  }

  function initTheme() {
    injectThemeControl();
    applyTheme();

    if (themeMedia) {
      const onSystemThemeChange = () => {
        if (themePreference === 'system') applyTheme();
      };
      if (typeof themeMedia.addEventListener === 'function') {
        themeMedia.addEventListener('change', onSystemThemeChange);
      } else if (typeof themeMedia.addListener === 'function') {
        themeMedia.addListener(onSystemThemeChange);
      }
    }
  }

  initTheme();

  function makeId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return 'w-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  function getStored(storage, key) {
    try {
      return storage.getItem(key) || '';
    } catch (_) {
      return '';
    }
  }

  function setStored(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch (_) {}
  }

  let visitorId = getStored(localStorage, VISITOR_KEY);
  if (!visitorId) {
    visitorId = makeId();
    setStored(localStorage, VISITOR_KEY, visitorId);
  }

  let sessionId = getStored(sessionStorage, SESSION_KEY);
  if (!sessionId) {
    sessionId = makeId();
    setStored(sessionStorage, SESSION_KEY, sessionId);
  }

  function referrerHost() {
    try {
      return document.referrer ? new URL(document.referrer).hostname.slice(0, 120) : '';
    } catch (_) {
      return '';
    }
  }

  function platform() {
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
    if (/windows/i.test(ua)) return 'windows';
    if (/mac os x/i.test(ua)) return 'macos';
    if (/linux/i.test(ua)) return 'linux';
    return 'other';
  }

  function send(eventType, data = {}) {
    const payload = JSON.stringify({
      eventType,
      visitorId,
      sessionId,
      path: data.path || (location.pathname + location.hash),
      title: document.title.slice(0, 180),
      referrerHost: referrerHost(),
      platform: platform(),
      source: data.source || 'website',
      metadata: data.metadata || {}
    });

    const url = API_BASE + '/analytics/collect';

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], {type: 'text/plain;charset=UTF-8'});
        if (navigator.sendBeacon(url, blob)) return;
      }
    } catch (_) {}

    fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {'Content-Type': 'text/plain;charset=UTF-8'},
      body: payload,
      keepalive: true
    }).catch(() => {});
  }

  function pageView(path) {
    send('page_view', {path});
  }

  function downloadStart(version = '') {
    send('download_start', {
      source: 'website',
      metadata: {
        version: String(version || '').slice(0, 40)
      }
    });
  }

  window.WHOAnalytics = {
    pageView,
    downloadStart,
    getVisitorId: () => visitorId,
    getSessionId: () => sessionId
  };

  pageView(location.pathname + location.hash);
})();