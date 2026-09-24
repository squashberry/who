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


  function initBetaWelcome() {
    const popup = document.getElementById('betaWelcome');
    if (!popup) return;

    const seen = localStorage.getItem('who_beta_welcome_seen') === '1';

    function closeBeta() {
      popup.classList.remove('show');
      popup.setAttribute('aria-hidden', 'true');
      localStorage.setItem('who_beta_welcome_seen', '1');
    }

    popup.querySelectorAll('[data-beta-close]').forEach((element) => {
      element.addEventListener('click', closeBeta);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && popup.classList.contains('show')) {
        closeBeta();
      }
    });

    if (!seen) {
      setTimeout(() => {
        popup.classList.add('show');
        popup.setAttribute('aria-hidden', 'false');
      }, 1050);
    }
  }

  function initBetaFeedback() {
    const grid = document.getElementById('homeFeedbackGrid');
    const empty = document.getElementById('homeFeedbackEmpty');
    if (!grid || !empty) return;

    fetch('data/approved-feedback.json', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : [])
      .then((list) => {
        const approved = (Array.isArray(list) ? list : [])
          .filter((item) => item && item.approved === true)
          .slice(-3)
          .reverse();

        if (!approved.length) {
          empty.style.display = 'block';
          return;
        }

        empty.style.display = 'none';
        grid.innerHTML = approved.map((item) => {
          const rating = Math.max(1, Math.min(5, Number(item.rating) || 5));
          const name = String(item.name || 'WHO Beta Tester')
            .replace(/[&<>"]/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[character]));
          const title = String(item.title || 'Beta feedback')
            .replace(/[&<>"]/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[character]));
          const message = String(item.message || '')
            .replace(/[&<>"]/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[character]));
          const platform = String(item.platform || 'WHO')
            .replace(/[&<>"]/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[character]));
          const version = String(item.version || '1.0.0')
            .replace(/[&<>"]/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[character]));

          return '<article class="home-review">' +
            '<div class="home-review-top"><span class="home-review-name">' + name + '</span><span class="home-review-stars">' + '★'.repeat(rating) + '</span></div>' +
            '<div class="home-review-title">' + title + '</div>' +
            '<div class="home-review-text">' + message + '</div>' +
            '<div class="home-review-meta"><span>' + platform + '</span><span>Beta ' + version + '</span></div>' +
            '</article>';
        }).join('');
      })
      .catch(() => {
        empty.style.display = 'block';
      });
  }

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
    initBetaWelcome();
    initBetaFeedback();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();