const THREE = window.THREE;
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

const state = {
  progress: 0,
  targetX: 0,
  targetY: 0,
  dragX: 0,
  dragY: 0,
  mode: 'caller',
  motionAllowed: !window.matchMedia('(prefers-reduced-motion: reduce)').matches
};

const boot = document.getElementById('boot');
const bootFill = document.getElementById('bootFill');
const bootPercent = document.getElementById('bootPercent');
const bootStatus = document.getElementById('bootStatus');
const enterButton = document.getElementById('enterButton');
const skipButton = document.getElementById('skipButton');
const fallback = document.getElementById('webglFallback');
const world = document.getElementById('world');

const introSeen = localStorage.getItem('who_intro_seen') === '1';
const stages = [
  [12, 'INITIALIZING WHO CORE…'],
  [36, 'LOADING COMMUNICATION ENGINE…'],
  [58, 'PREPARING SIGNAL LAYERS…'],
  [78, 'CHECKING RELAY SUBSYSTEM…'],
  [92, 'SYNCING LAUNCH STATE…'],
  [100, 'WHO ONLINE.']
];

let scene;
let camera;
let renderer;
let phone;
let screenMesh;
let screenTexture;
let screenCanvas;
let screenContext;
let particleField;
let animationFrame = 0;
let frameCounter = 0;
let destroyed = false;
let currentMode = '';
let threeStarted = false;
let heroRing = null;
const networkNodes = [];

function setBootProgress(value, text) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  bootFill.style.width = safe + '%';
  bootPercent.textContent = safe + '%';
  bootStatus.textContent = text;
}

function bootTimeline() {
  const scale = introSeen ? 0.28 : 1;
  let cursor = 0;
  for (const [value, text] of stages) {
    window.setTimeout(() => setBootProgress(value, text), cursor);
    cursor += Math.round((introSeen ? 90 : 190) * scale);
  }
  window.setTimeout(() => {
    enterButton.disabled = false;
    enterButton.classList.add('is-ready');
    if (introSeen) {
      enterButton.querySelector('.boot-enter-label').textContent = 'ENTER WHO';
    }
  }, cursor + 60);

  if (introSeen) {
    boot.style.opacity = '0';
    window.setTimeout(() => {
      boot.style.opacity = '';
    }, 20);
  }
}

function createScreenCanvas() {
  screenCanvas = document.createElement('canvas');
  screenCanvas.width = 640;
  screenCanvas.height = 1200;
  screenContext = screenCanvas.getContext('2d');
  screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = 4;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function text(ctx, value, x, y, size, color, weight = 700, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Inter, Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

function card(ctx, x, y, w, h, fill = 'rgba(255,255,255,.05)', stroke = 'rgba(166,239,255,.11)') {
  roundRect(ctx, x, y, w, h, 28);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawScreen(mode, phase = 0) {
  if (!screenContext) return;
  currentMode = mode;
  const ctx = screenContext;
  const w = screenCanvas.width;
  const h = screenCanvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#061018';
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * .65, h * .2, 0, w * .65, h * .2, 500);
  glow.addColorStop(0, 'rgba(66,184,255,.26)');
  glow.addColorStop(1, 'rgba(66,184,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  text(ctx, 'WHO', 40, 74, 30, '#a6efff', 950);
  text(ctx, mode.toUpperCase(), w - 40, 70, 15, '#5f7280', 900, 'right');
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  ctx.fillRect(40, 102, w - 80, 2);

  if (mode === 'caller') drawCaller(ctx, w, h);
  if (mode === 'messages') drawMessages(ctx, w, h);
  if (mode === 'relay') drawRelay(ctx, w, h);
  if (mode === 'network') drawNetwork(ctx, w, h);
  if (mode === 'backup') drawBackup(ctx, w, h);

  if (state.motionAllowed) {
    const y = 120 + ((phase * 0.55) % (h - 160));
    const gradient = ctx.createLinearGradient(0, y - 24, 0, y + 24);
    gradient.addColorStop(0, 'rgba(166,239,255,0)');
    gradient.addColorStop(.5, 'rgba(166,239,255,.12)');
    gradient.addColorStop(1, 'rgba(166,239,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y - 24, w, 48);

    ctx.strokeStyle = 'rgba(166,239,255,.10)';
    ctx.lineWidth = 2;
    const signalY = 185 + Math.sin(phase * .04) * 12;
    ctx.beginPath();
    ctx.moveTo(40, signalY);
    ctx.lineTo(w - 40, signalY);
    ctx.stroke();
  }

  screenTexture.needsUpdate = true;
}

function drawCaller(ctx, w, h) {
  text(ctx, 'INCOMING CALL', 40, 170, 16, '#738894', 850);
  text(ctx, '+220 700 1245', 40, 240, 40, '#f4fbff', 900);
  text(ctx, 'UNKNOWN CALLER', 40, 277, 18, '#7d8e99', 700);
  card(ctx, 40, 335, w - 80, 300, 'rgba(66,184,255,.065)');
  text(ctx, 'SIGNAL FOUND', 70, 390, 13, '#42b8ff', 900);
  text(ctx, 'Possible business', 70, 436, 25, '#f6fbff', 850);
  text(ctx, 'Caller intelligence', 70, 470, 16, '#8fa0ab', 600);
  text(ctx, 'CONFIDENCE', 70, 535, 11, '#647781', 900);
  text(ctx, '91%', 70, 583, 42, '#7dffbd', 900);
  roundRect(ctx, 70, 610, 230, 10, 5);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fill();
  roundRect(ctx, 70, 610, 208, 10, 5);
  ctx.fillStyle = '#7dffbd';
  ctx.fill();
  card(ctx, 40, 678, w - 80, 145);
  text(ctx, 'WHO RECOMMENDS', 70, 725, 12, '#647781', 900);
  text(ctx, 'Answer with caution', 70, 772, 25, '#fff', 850);
  text(ctx, 'Context is a signal, not proof.', 70, 805, 13, '#83949f', 600);
  text(ctx, 'ANSWER', 86, 948, 14, '#7dffbd', 900);
  text(ctx, 'IGNORE', w / 2, 948, 14, '#a6efff', 900, 'center');
  text(ctx, 'BLOCK', w - 86, 948, 14, '#ff9198', 900, 'right');
}

function drawMessages(ctx, w, h) {
  text(ctx, 'INBOX / 27', 40, 170, 15, '#748894', 850);
  const rows = [
    ['Alex', 'Where are you?', '#a6efff'],
    ['Bank', 'Transaction confirmed', '#7dffbd'],
    ['Unknown', 'Claim your prize now', '#ff9198'],
    ['Mama', 'Call me when you can', '#a6efff']
  ];
  rows.forEach((row, index) => {
    const y = 225 + index * 155;
    card(ctx, 40, y, w - 80, 125);
    text(ctx, row[0], 70, y + 40, 22, '#f6fbff', 850);
    text(ctx, row[1], 70, y + 74, 16, '#81929e', 600);
    text(ctx, index === 2 ? 'SPAM' : index === 1 ? 'TRANSACTION' : 'PERSONAL', w - 70, y + 40, 10, row[2], 900, 'right');
  });
  text(ctx, 'WHO SORTED THE NOISE', w / 2, h - 85, 12, '#637681', 900, 'center');
}

function drawRelay(ctx, w, h) {
  text(ctx, 'RELAY SESSION', 40, 170, 15, '#748894', 850);
  drawNode(ctx, 110, 330, 'HOST');
  drawNode(ctx, w - 110, 330, 'RECEIVER');
  ctx.strokeStyle = '#42b8ff';
  ctx.lineWidth = 8;
  ctx.globalAlpha = .75;
  ctx.beginPath();
  ctx.moveTo(155, 330);
  ctx.quadraticCurveTo(w / 2, 245, w - 155, 330);
  ctx.stroke();
  ctx.globalAlpha = 1;
  text(ctx, 'PAIRING CREDENTIAL', w / 2, 470, 11, '#627581', 900, 'center');
  text(ctx, '8K7P-42', w / 2, 530, 46, '#f6fbff', 950, 'center');
  text(ctx, 'fresh session / explicit pairing', w / 2, 568, 14, '#83949f', 600, 'center');
  card(ctx, 65, 675, w - 130, 210, 'rgba(125,255,189,.04)', 'rgba(125,255,189,.13)');
  text(ctx, 'SESSION STATE', 95, 720, 12, '#61747e', 900);
  text(ctx, 'CONNECTED', 95, 770, 32, '#7dffbd', 900);
  text(ctx, 'Traffic path active through Relay.', 95, 805, 14, '#8798a2', 600);
}

function drawNode(ctx, x, y, label) {
  ctx.beginPath();
  ctx.arc(x, y, 58, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(66,184,255,.08)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(166,239,255,.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, '●', x, y + 12, 34, '#a6efff', 900, 'center');
  text(ctx, label, x, y + 104, 11, '#71828d', 900, 'center');
}

function drawNetwork(ctx, w, h) {
  text(ctx, 'WHO NETWORK', 40, 170, 15, '#748894', 850);
  text(ctx, 'PROTECTED PATH', 40, 240, 32, '#f6fbff', 900);
  text(ctx, 'Endpoint', 40, 330, 12, '#647781', 900);
  text(ctx, 'WHO / GAMBIA', 40, 372, 23, '#a6efff', 850);
  text(ctx, 'Latency', 40, 445, 12, '#647781', 900);
  text(ctx, '42 ms', 40, 490, 28, '#7dffbd', 900);
  text(ctx, 'Status', 40, 565, 12, '#647781', 900);
  text(ctx, 'PROTECTED', 40, 610, 28, '#7dffbd', 900);
  card(ctx, 40, 690, w - 80, 250, 'rgba(66,184,255,.045)');
  const points = [0,1,2,3,4,5,6,7].map((i) => [70 + i * 70, 760 + Math.sin(i * .9) * 55]);
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = '#42b8ff';
  ctx.lineWidth = 5;
  ctx.stroke();
  points.forEach(([x,y]) => { ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fillStyle='#a6efff'; ctx.fill(); });
  text(ctx, 'visibility without pretending to be anonymous', w / 2, 890, 11, '#667985', 700, 'center');
}

function drawBackup(ctx, w, h) {
  text(ctx, 'BACKUP CONTROL', 40, 170, 15, '#748894', 850);
  text(ctx, 'YOUR DATA', 40, 235, 36, '#f6fbff', 900);
  const rows = [['Contacts', '412', '#a6efff'], ['Settings', '63', '#7dffbd'], ['Preferences', '28', '#a6efff']];
  rows.forEach((row, i) => {
    const y = 315 + i * 105;
    text(ctx, row[0], 45, y, 16, '#82939e', 700);
    text(ctx, row[1], w - 45, y, 18, row[2], 900, 'right');
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fillRect(45, y + 25, w - 90, 1);
  });
  card(ctx, 40, 680, w - 80, 210, 'rgba(125,255,189,.04)', 'rgba(125,255,189,.13)');
  text(ctx, 'DESTINATION', 70, 725, 11, '#637681', 900);
  text(ctx, 'GOOGLE DRIVE', 70, 770, 27, '#a6efff', 900);
  text(ctx, 'user authorized / restore on demand', 70, 810, 13, '#80919c', 600);
}

function initThree() {
  try {
    if (!THREE) throw new Error('Three.js runtime unavailable.');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? 1.2 : 1.7));
    renderer.domElement.id = 'world';
    world.replaceWith(renderer.domElement);
    world.remove();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, .1, 100);
    camera.position.set(0, .15, 7.35);

    const ambient = new THREE.HemisphereLight(0x9edfff, 0x020609, 1.4);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xbceeff, 3);
    key.position.set(3, 5, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0x168dff, 18, 16);
    rim.position.set(-3, -1, 3);
    scene.add(rim);

    phone = new THREE.Group();
    scene.add(phone);

    const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x101a21, metalness: .72, roughness: .19, clearcoat: .5, clearcoatRoughness: .16 });
    const edgeMat = new THREE.MeshPhysicalMaterial({ color: 0x203844, metalness: .92, roughness: .18, clearcoat: .4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.72, 3.42, .22, 6, 6, 2), bodyMat);
    phone.add(body);

    const edge = new THREE.Mesh(new THREE.BoxGeometry(1.63, 3.33, .08, 6, 6, 2), edgeMat);
    edge.position.z = -.03;
    phone.add(edge);

    createScreenCanvas();
    drawScreen('caller');
    screenMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.47, 3.01, .055, 6, 6, 1),
      new THREE.MeshBasicMaterial({ map: screenTexture, transparent: true })
    );
    screenMesh.position.z = .13;
    phone.add(screenMesh);

    const cameraBump = new THREE.Mesh(
      new THREE.BoxGeometry(.72, .13, .05, 4, 2, 2),
      new THREE.MeshBasicMaterial({ color: 0x010305 })
    );
    cameraBump.position.set(0, 1.43, .17);
    phone.add(cameraBump);

    [-1, 1].forEach((side) => {
      const button = new THREE.Mesh(new THREE.BoxGeometry(.05, .42, .12), edgeMat);
      button.position.set(side * .9, .72, 0);
      phone.add(button);
    });

    heroRing = new THREE.Mesh(
      new THREE.RingGeometry(1.95, 2.08, 64),
      new THREE.MeshBasicMaterial({ color: 0x52c8ff, transparent: true, opacity: .12, side: THREE.DoubleSide })
    );
    heroRing.rotation.x = Math.PI / 2;
    heroRing.position.z = -1.0;
    phone.add(heroRing);

    networkNodes.length = 0;
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });

    renderer.domElement.style.visibility = 'hidden';
    return true;
  } catch (error) {
    console.warn('WHO 3D scene unavailable:', error);
    fallback.hidden = false;
    return false;
  }
}

let dragging = false;
let lastPointer = { x: 0, y: 0 };

function onPointerMove(event) {
  if (dragging) {
    const dx = (event.clientX - lastPointer.x) * .006;
    const dy = (event.clientY - lastPointer.y) * .006;
    state.dragY += dx;
    state.dragX += dy;
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
    return;
  }
  state.targetY = (event.clientX / window.innerWidth - .5) * .22;
  state.targetX = (event.clientY / window.innerHeight - .5) * .14;
}

function onPointerDown(event) {
  if (event.pointerType === 'mouse' || event.pointerType === 'touch' || event.pointerType === 'pen') {
    dragging = true;
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
  }
}
function onPointerUp() { dragging = false; }

function createParticles() {
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const count = lowPower ? 80 : 160;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - .5) * 11;
    positions[i * 3 + 1] = (Math.random() - .5) * 8;
    positions[i * 3 + 2] = (Math.random() - .5) * 9 - 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleField = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0x5ccaff, size: lowPower ? .035 : .05, transparent: true, opacity: .32 })
  );
  scene.add(particleField);
}

function resize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.position.z = window.innerWidth < 680 ? 8.2 : 7.35;
  camera.position.y = window.innerWidth < 680 ? .2 : .15;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setMode(mode) {
  if (!phone || currentMode === mode) return;
  drawScreen(mode);
}

function startThree() {
  if (threeStarted || !renderer) return;
  threeStarted = true;
  renderer.domElement.style.visibility = 'visible';
  animate();
}

function animate() {
  if (destroyed) return;
  animationFrame = requestAnimationFrame(animate);
  frameCounter += 1;

  const t = performance.now();
  const floatY = state.motionAllowed ? Math.sin(t * .00145) * .085 : 0;
  const floatX = state.motionAllowed ? Math.sin(t * .00073) * .045 : 0;
  const targetRotationX = state.dragX + state.targetX + state.progress * .02 + (state.motionAllowed ? Math.sin(t * .0009) * .014 : 0);
  const targetRotationY = state.dragY + state.targetY + .18 - state.progress * .24 + (state.motionAllowed ? Math.sin(t * .00065) * .02 : 0);
  const targetRotationZ = -0.08 + Math.sin(state.progress * Math.PI) * .035 + (state.motionAllowed ? Math.sin(t * .0011) * .014 : 0);
  const targetX = Math.sin(state.progress * Math.PI) * .48 + floatX;
  const targetY = .08 - state.progress * .16 + floatY;
  const targetZ = state.progress < .05 ? 0 : -state.progress * .9;
  const scale = 1 + state.progress * .08;

  if (phone) {
    phone.rotation.x += (targetRotationX - phone.rotation.x) * .075;
    phone.rotation.y += (targetRotationY - phone.rotation.y) * .075;
    phone.rotation.z += (targetRotationZ - phone.rotation.z) * .075;
    phone.position.x += (targetX - phone.position.x) * .055;
    phone.position.y += (targetY - phone.position.y) * .055;
    phone.position.z += (targetZ - phone.position.z) * .055;

    const nextScale = Math.max(scale, window.innerWidth < 680 ? 1.12 : 1);
    phone.scale.setScalar(phone.scale.x + (nextScale - phone.scale.x) * .05);
  }



  if (renderer && screenTexture && state.motionAllowed && frameCounter % 4 === 0) {
    drawScreen(currentMode || 'caller', t * .03);
  }

  renderer.render(scene, camera);
}

function connectScroll() {
  if (!gsap || !ScrollTrigger) return;
  const experience = document.querySelector('.experience');
  if (!experience) return;

  ScrollTrigger.create({
    trigger: experience,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      state.progress = self.progress;
      if (self.progress < .18) setMode('caller');
      else if (self.progress < .39) setMode('messages');
      else if (self.progress < .60) setMode('relay');
      else if (self.progress < .81) setMode('network');
      else setMode('backup');
    }
  });

  document.querySelectorAll('.story-row').forEach((story) => {
    ScrollTrigger.create({
      trigger: story,
      start: 'top 68%',
      end: 'bottom 34%',
      onEnter: () => gsap.to(story, { opacity: 1, y: 0, duration: .65, overwrite: true }),
      onLeave: () => gsap.to(story, { opacity: .42, y: -8, duration: .4, overwrite: true }),
      onEnterBack: () => gsap.to(story, { opacity: 1, y: 0, duration: .45, overwrite: true }),
      onLeaveBack: () => gsap.to(story, { opacity: .35, y: 16, duration: .4, overwrite: true })
    });
    gsap.set(story, { opacity: .35, y: 16 });
  });

  gsap.from('.signal-grid article', {
    y: 40, opacity: 0, stagger: .08, duration: .8, ease: 'power3.out',
    scrollTrigger: { trigger: '.signals-section', start: 'top 72%' }
  });
  gsap.from('.experience-intro > *', {
    y: 60, opacity: 0, stagger: .12, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: '.experience-intro', start: 'top 72%' }
  });
  gsap.from('.field-card', {
    x: 60, opacity: 0, duration: .8, ease: 'power3.out',
    scrollTrigger: { trigger: '.field-section', start: 'top 68%' }
  });
}

function initMobileMenu() {
  const button = document.getElementById('mobileMenuButton');
  const menu = document.getElementById('mobileMenu');
  if (!button || !menu) return;

  const close = () => {
    button.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open navigation');
    menu.classList.remove('is-open');
    menu.hidden = true;
  };

  const open = () => {
    button.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', 'Close navigation');
    menu.hidden = false;
    menu.classList.add('is-open');
  };

  button.addEventListener('click', () => button.getAttribute('aria-expanded') === 'true' ? close() : open());
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 680) close();
  });
}

function revealSite() {
  if (!gsap) return;
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.fromTo('.topbar', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: .65 })
    .fromTo('.hero-copy > *', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: .65, stagger: .055 }, '-=.3')
    .fromTo('.hero-product-caption', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .65 }, '-=.42');
}

function connectSmoothActions() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: state.motionAllowed ? 'smooth' : 'auto' });
    });
  });
}

function unlock() {
  localStorage.setItem('who_intro_seen', '1');
  document.body.style.overflow = '';

  const finish = () => {
    boot.classList.add('is-leaving');
    boot.setAttribute('aria-hidden', 'true');
    startThree();
    revealSite();
  };

  if (gsap && state.motionAllowed) {
    gsap.timeline({ onComplete: finish })
      .to('.boot-word', { opacity: 0, y: -18, duration: .38, ease: 'power2.in' })
      .to('.boot-rule', { scaleX: 0, transformOrigin: '50% 50%', duration: .32, ease: 'power2.in' }, '<')
      .to('.boot-corner, .boot-actions', { opacity: 0, duration: .24 }, '<');
  } else {
    finish();
  }
}

function initBoot() {
  document.body.style.overflow = 'hidden';
  bootTimeline();
  enterButton.addEventListener('click', unlock);
  skipButton.addEventListener('click', unlock);
}

function init() {
  const hasAnimationRuntime = Boolean(gsap && ScrollTrigger);
  if (!hasAnimationRuntime) fallback.hidden = false;
  initThree();
  if (hasAnimationRuntime) connectScroll();
  connectSmoothActions();
  initMobileMenu();
  initBoot();
  if (ScrollTrigger) ScrollTrigger.refresh();
}

window.addEventListener('load', init);
