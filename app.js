(() => {
  const boot = document.getElementById('boot');
  const screens = [...document.querySelectorAll('.screen-section[data-screen]')];
  const navItems = [...document.querySelectorAll('[data-view]')];

  function setView(view) {
    const target = screens.some((s) => s.dataset.screen === view) ? view : 'home';
    screens.forEach((screen) => screen.classList.remove('view-enter'));
    void document.body.offsetWidth;
    screens.forEach((screen) => screen.classList.toggle('active', screen.dataset.screen === target));
    const activeScreen = screens.find((screen) => screen.dataset.screen === target);
    if (activeScreen) activeScreen.classList.add('view-enter');
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

  function setBootProgress(value, status) {
    const bar = document.getElementById('bootProgressBar');
    const percent = document.getElementById('bootPercent');
    const label = document.getElementById('bootStatus');
    const safe = Math.max(0, Math.min(100, Math.round(value)));
    if (bar) bar.style.width = safe + '%';
    if (percent) percent.textContent = safe + '%';
    if (label && status) label.textContent = status;
  }

  function startBootProgress() {
    setBootProgress(8, 'Preparing WHO…');
    const steps = [
      [28, 'Loading interface…'],
      [52, 'Preparing phone tools…'],
      [74, 'Connecting WHO features…'],
      [92, 'Finishing setup…']
    ];
    let i = 0;
    const tick = () => {
      if (i >= steps.length) return;
      const [value, status] = steps[i++];
      setBootProgress(value, status);
      setTimeout(tick, 190);
    };
    setTimeout(tick, 140);
  }

  startBootProgress();

  window.addEventListener('DOMContentLoaded', () => {
    setBootProgress(58, 'Interface ready…');
  });

  window.addEventListener('load', () => {
    setBootProgress(100, 'WHO is ready.');
    setTimeout(() => boot.classList.add('hide'), 430);
    setTimeout(readView, 60);
    initBetaWelcome();
    initBetaFeedback();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    }).catch(() => {});
  }
})();