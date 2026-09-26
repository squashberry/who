(() => {
  'use strict';

  const API_BASE = 'https://who-api.who-fe3.workers.dev';
  const VISITOR_KEY = 'who-web-visitor-id-v1';
  const SESSION_KEY = 'who-web-session-id-v1';

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