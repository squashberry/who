(() => {
  const boot = document.getElementById('boot');
  const installBtns = [document.getElementById('installBtn'), document.getElementById('installBtnLarge')].filter(Boolean);
  let deferredPrompt = null;

  const screens = [...document.querySelectorAll('.screen-section[data-screen]')];
  const navItems = [...document.querySelectorAll('[data-view]')];

  function setView(view) {
    const target = screens.some((s) => s.dataset.screen === view) ? view : 'home';
    screens.forEach((screen) => screen.classList.toggle('active', screen.dataset.screen === target));
    navItems.forEach((item) => item.classList.toggle('active', item.dataset.view === target));
    if (location.hash !== '#' + target) {
      history.replaceState(null, '', '#' + target);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.title = target === 'home' ? 'WHO — Your phone, understood.' : 'WHO — ' + target.charAt(0).toUpperCase() + target.slice(1);
  }

  function readView() {
    const raw = location.hash.replace('#', '').trim();
    setView(raw || 'home');
  }

  navItems.forEach((item) => {
    item.addEventListener('click', (event) => {
      const view = item.dataset.view;
      if (!view) return;
      event.preventDefault();
      setView(view);
    });
  });

  window.addEventListener('hashchange', readView);

  function showInstallHelp() {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && !window.matchMedia('(display-mode: standalone)').matches) {
      alert('To install WHO on iPhone/iPad: tap Share, then choose “Add to Home Screen”.');
      return;
    }
    if (!deferredPrompt) {
      alert('WHO is already installed, or your browser is not showing the install prompt yet. On supported browsers, open the browser menu and choose “Install” or “Add to Home screen”.');
      return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(() => {
      deferredPrompt = null;
    });
  }

  installBtns.forEach((btn) => btn.addEventListener('click', showInstallHelp));
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });

  window.addEventListener('load', () => {
    setTimeout(() => boot.classList.add('hide'), 520);
    setTimeout(readView, 20);
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();