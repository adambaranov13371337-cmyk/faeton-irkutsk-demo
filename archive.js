(() => {
  const archive = document.querySelector('.archive');
  const frame = archive.querySelector('.archive-frame');
  const controls = archive.querySelector('.film-controls');
  const toggle = controls.querySelector('#toggle-photo');
  const caption = document.getElementById('slide-title');
  const viewer = document.getElementById('photo-view');
  const photo = document.getElementById('slide-photo');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const slides = [
    { title: 'Учебный Renault школы', file: 'hero', mobile: 'hero-mobile', alt: 'Серебристый Renault с фирменной оклейкой автошколы', source: 'practice/autodrom/' },
    { title: 'Компьютерный класс на Ржанова', file: 'classroom', alt: 'Компьютеры и учебные столы в классе на Ржанова', source: 'address/rzhanova/' },
    { title: 'Практикум в учебном классе', file: 'theory', alt: 'Преподаватель помогает ученице за письменным столом', source: 'theory/team/' }
  ];
  let active = 0;
  let intent = 0;
  let generation = 0;
  let automatic = !motion.matches;
  let hovered = false;
  let inView = false;
  let timer;

  function schedule() {
    clearTimeout(timer);
    if (automatic && inView && !hovered && !document.hidden && !document.querySelector('dialog[open]')) {
      timer = setTimeout(() => select(1), 9500);
    }
  }
  function setAutomatic(enabled) {
    automatic = enabled;
    toggle.classList.toggle('paused', !enabled);
    toggle.setAttribute('aria-label', enabled ? 'Приостановить смену фото' : 'Включить смену фото');
    toggle.title = toggle.getAttribute('aria-label');
    schedule();
  }
  async function select(direction, manual = false) {
    if (manual) setAutomatic(false);
    clearTimeout(timer);
    intent = (intent + direction + slides.length) % slides.length;
    const index = intent;
    const ticket = ++generation;
    const slide = slides[index];
    const url = 'assets/' + slide.file + '.webp';
    const preview = new Image();
    preview.src = url;
    try { await preview.decode(); }
    catch {
      if (ticket === generation) { intent = active; schedule(); }
      return;
    }
    if (ticket !== generation) return;
    active = index;
    document.getElementById('slide-small').srcset = 'assets/' + (slide.mobile || slide.file) + '.webp';
    photo.src = url;
    photo.alt = slide.alt;
    frame.href = url;
    caption.textContent = slide.title;
    document.getElementById('frame-count').textContent = String(active + 1).padStart(2, '0') + ' / 03';
    frame.classList.remove('frame-change');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (generation === ticket) frame.classList.add('frame-change');
    }));
    if (manual) archive.querySelector('[role="status"]').textContent = slide.title;
    schedule();
  }
  frame.addEventListener('click', () => {
    const slide = slides[active];
    const full = document.getElementById('full-photo');
    full.src = 'assets/' + slide.file + '.webp';
    full.alt = slide.alt;
    document.getElementById('photo-source').href = 'https://faeton-irk.ru/' + slide.source;
    document.getElementById('photo-title').textContent = slide.title;
    clearTimeout(timer);
  });
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.className = 'icons';
  archive.append(status);
  controls.hidden = false;
  document.getElementById('prev-photo').onclick = () => select(-1, true);
  document.getElementById('next-photo').onclick = () => select(1, true);
  toggle.onclick = () => setAutomatic(!automatic);
  archive.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') { hovered = true; schedule(); }
  });
  archive.addEventListener('pointerleave', () => { hovered = false; schedule(); });
  archive.addEventListener('focusin', event => {
    if (event.target.matches(':focus-visible') && !archive.contains(event.relatedTarget)) setAutomatic(false);
  });
  archive.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    select(event.key === 'ArrowLeft' ? -1 : 1, true);
  });
  new MutationObserver(schedule).observe(document.body, { subtree:true, attributes:true, attributeFilter:['open'] });
  viewer.addEventListener('close', schedule);
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', () => setAutomatic(!motion.matches));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; schedule(); }, { threshold:.55 }).observe(archive);
  } else { inView = true; }
  setAutomatic(automatic);

  let pending = false;
  function showProgress() {
    const length = document.documentElement.scrollHeight - window.innerHeight;
    document.body.style.setProperty('--progress', length > 0 ? Math.min(1, Math.max(0, scrollY / length)) : 0);
    pending = false;
  }
  addEventListener('scroll', () => {
    if (!pending) { pending = true; requestAnimationFrame(showProgress); }
  }, { passive:true });
  addEventListener('resize', showProgress);
  showProgress();
})();
