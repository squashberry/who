(() => {
  const menuButton = document.getElementById('mobileMenuButton');
  const mobileMenu = document.getElementById('mobileMenu');

  if (menuButton && mobileMenu) {
    const closeMenu = () => {
      menuButton.classList.remove('open');
      menuButton.setAttribute('aria-expanded','false');
      mobileMenu.hidden = true;
    };
    const setMenuOpen = (open) => {
      if (open) {
        menuButton.classList.add('open');
        menuButton.setAttribute('aria-expanded','true');
        menuButton.setAttribute('aria-label','Close menu');
        mobileMenu.hidden = false;
        document.documentElement.style.overflow = 'hidden';
      } else {
        menuButton.classList.remove('open');
        menuButton.setAttribute('aria-expanded','false');
        menuButton.setAttribute('aria-label','Open menu');
        mobileMenu.hidden = true;
        document.documentElement.style.overflow = '';
      }
    };

    const closeMenu = () => setMenuOpen(false);

    menuButton.addEventListener('click', () => {
      setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
    });

    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeMenu();
    });

    document.addEventListener('pointerdown', e => {
      if (mobileMenu.hidden) return;
      if (!mobileMenu.contains(e.target) && !menuButton.contains(e.target)) closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1000) closeMenu();
    });
  }

  const form = document.getElementById('lookupForm');
  const hint = document.getElementById('lookupHint');
  if (form) {
    form.addEventListener('submit', event => {
      const input = document.getElementById('phoneNumber');
      const country = document.getElementById('country');
      const raw = (input?.value || '').trim();
      const digits = raw.replace(/[^0-9+]/g,'');
      if (!digits || digits.replace(/[^0-9]/g,'').length < 5) {
        event.preventDefault();
        if (hint) hint.textContent = 'Enter a full phone number first.';
        return;
      }
      if (input) input.value = digits;
      form.querySelector('button').textContent = 'Checking…';
      if (country) form.querySelector('input[name="country"]')?.setAttribute('value', country.value);
    });
  }

  const demoButton = document.getElementById('demoSearch');
  const demoInput = document.getElementById('demoNumber');
  const demoState = document.getElementById('demoState');
  const demoResult = document.getElementById('demoResult');
  if (demoButton && demoInput && demoState && demoResult) {
    const runDemo = () => {
      const value = demoInput.value.trim();
      if (value.replace(/[^0-9]/g,'').length < 5) {
        demoState.textContent = 'Enter a phone number to continue.';
        demoResult.hidden = true;
        return;
      }
      demoState.textContent = 'WHO is preparing the web lookup for this number…';
      demoResult.hidden = true;
      window.setTimeout(() => {
        demoState.textContent = '';
        demoResult.hidden = false;
      }, 520);
    };
    demoButton.addEventListener('click', runDemo);
    demoInput.addEventListener('keydown', e => { if (e.key === 'Enter') runDemo(); });
  }

  const sections = [...document.querySelectorAll('section[id]')];
  const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
  const onScroll = () => {
    const y = window.scrollY + 110;
    let current = '';
    for (const section of sections) if (section.offsetTop <= y) current = section.id;
    navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === '#' + current));
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
})();