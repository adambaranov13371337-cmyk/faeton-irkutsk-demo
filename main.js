(() => {
  'use strict';

  const page = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const menu = document.getElementById('mobile-menu');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const dialogOrigins = new Map();

  function setMenu(open) {
    if (!menu || !menuToggle) return;
    menu.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    page.classList.toggle('menu-open', open);
  }

  if (menu && menuToggle) {
    menuToggle.setAttribute('aria-controls', menu.id);
    setMenu(false);
    menuToggle.addEventListener('click', () => setMenu(menu.hidden));
    menu.addEventListener('click', event => {
      if (event.target.closest('a[href]:not([data-open])')) setMenu(false);
    });
    const closeOutsideMenu = event => {
      if (!menu.hidden && !menu.contains(event.target) && !menuToggle.contains(event.target)) {
        setMenu(false);
      }
    };
    document.addEventListener('pointerdown', closeOutsideMenu);
    document.addEventListener('focusin', closeOutsideMenu);
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || menu.hidden || dialogOrigins.size) return;
      event.preventDefault();
      setMenu(false);
      menuToggle.focus({ preventScroll: true });
    });
    window.addEventListener('resize', () => {
      if (!menu.hidden && !menuToggle.getClientRects().length) setMenu(false);
    }, { passive: true });
  }

  function openDialog(dialog, trigger) {
    if (!dialog || typeof dialog.showModal !== 'function' || dialog.open) return;
    if (dialog.id === 'enrol') {
      const origin = trigger.closest('dialog');
      const subject = origin?.querySelector('h2')?.textContent || '';
      const context = {
        'course-b': 'обучение на категорию B',
        'restore': 'курс восстановления навыков',
        'theory': 'теорию в классе или онлайн',
        'practice': 'практические занятия',
        'payment': 'рассрочку'
      }[origin?.id];
      dialog.querySelector('.section-mark').textContent = context ? subject : 'Первое занятие';
      dialog.querySelector('h2').textContent = context ? 'Связаться со школой' : 'Записаться на занятие';
      dialog.querySelector('h2 + p').textContent = context
        ? 'Позвоните администратору или задайте вопрос в WhatsApp.'
        : 'Первое занятие в «Фаэтоне» бесплатное. Выберите удобный способ связи с администратором.';
      const message = context ? 'Здравствуйте! Хочу уточнить ' + context + ' в автошколе «Фаэтон».'
        : 'Здравствуйте! Хочу записаться на первое бесплатное занятие в автошколе «Фаэтон».';
      dialog.querySelector('a[href*="wa.me"]').href = 'https://wa.me/79149269522?text=' + encodeURIComponent(message);
    }
    const fromMenu = menu && !menu.hidden && menu.contains(trigger);
    if (fromMenu) setMenu(false);
    dialogOrigins.set(dialog, fromMenu ? menuToggle : trigger);
    dialog.showModal();
    page.classList.add('has-dialog');
  }

  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open]');
    if (opener) {
      const dialog = document.getElementById(opener.dataset.open);
      if (dialog?.tagName === 'DIALOG' && typeof dialog.showModal === 'function') {
        event.preventDefault();
        openDialog(dialog, opener);
      }
      return;
    }
    const closeButton = event.target.closest('[data-close]');
    const dialog = closeButton?.closest('dialog');
    if (dialog?.open) dialog.close();
  });

  for (const dialog of document.querySelectorAll('dialog')) {
    let downOnBackdrop = false;
    const onBackdrop = event => {
      if (event.target !== dialog) return false;
      const rect = dialog.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX >= rect.right ||
             event.clientY < rect.top || event.clientY >= rect.bottom;
    };
    dialog.addEventListener('pointerdown', event => {
      downOnBackdrop = event.isPrimary && event.button === 0 && onBackdrop(event);
    });
    dialog.addEventListener('pointercancel', () => { downOnBackdrop = false; });
    dialog.addEventListener('click', event => {
      if (downOnBackdrop && onBackdrop(event) && dialog.open) dialog.close();
      downOnBackdrop = false;
    });
    dialog.addEventListener('close', () => {
      if (dialog.open) return;
      downOnBackdrop = false;
      const origin = dialogOrigins.get(dialog);
      dialogOrigins.delete(dialog);
      const remaining = [...dialogOrigins.keys()].filter(item => item.open);
      page.classList.toggle('has-dialog', remaining.length > 0);
      const top = remaining[remaining.length - 1];
      if (origin?.isConnected && origin.getClientRects().length && (!top || top.contains(origin))) {
        origin.focus({ preventScroll: true });
      }
    });
  }

  const reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reducedMotion.matches && reveals.length) {
    const show = element => {
      element.classList.add('is-visible');
      watcher.unobserve(element);
    };
    const watcher = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) show(entry.target);
    }, { threshold: 0 });
    for (const element of reveals) {
      element.classList.add('will-reveal');
      watcher.observe(element);
    }
    document.addEventListener('focusin', event => {
      const element = event.target.closest('.will-reveal:not(.is-visible)');
      if (element) show(element);
    });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) reveals.forEach(show);
    });
  }

  let tracked = null;
  let frame = 0;
  let clientX = 0;
  let clientY = 0;
  function stopTracking() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (tracked) {
      tracked.classList.remove('is-tracking');
      tracked.style.removeProperty('--spot-x');
      tracked.style.removeProperty('--spot-y');
      tracked = null;
    }
  }
  function paintSpotlight() {
    frame = 0;
    const rect = tracked.getBoundingClientRect();
    tracked.style.setProperty('--spot-x', (clientX - rect.left) + 'px');
    tracked.style.setProperty('--spot-y', (clientY - rect.top) + 'px');
    tracked.classList.add('is-tracking');
  }
  for (const card of document.querySelectorAll('[data-spotlight]')) {
    card.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches) return;
      if (tracked !== card) {
        stopTracking();
        tracked = card;
      }
      clientX = event.clientX;
      clientY = event.clientY;
      if (!frame) frame = requestAnimationFrame(paintSpotlight);
    }, { passive: true });
    card.addEventListener('pointerleave', () => { if (tracked === card) stopTracking(); });
  }
  reducedMotion.addEventListener('change', stopTracking);
  finePointer.addEventListener('change', stopTracking);
  window.addEventListener('blur', stopTracking);

  const quote = document.getElementById('lesson-quote');
  if (quote) {
    const decrease = quote.querySelector('button[data-step="-1"]');
    const increase = quote.querySelector('button[data-step="1"]');
    const countOutput = quote.querySelector('output[data-qty]');
    const costOutput = quote.querySelector('output[data-cost]');
    const maxLessons = 28;
    const hoursPerLesson = 2;
    const hourlyRate = 1200;
    const rubles = new Intl.NumberFormat('ru-RU', {
      style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
    });
    let count = 1;

    function updateQuote(step) {
      count = Math.max(1, Math.min(maxLessons, count + step));
      countOutput.value = String(count);
      costOutput.value = rubles.format(count * hoursPerLesson * hourlyRate);
      decrease.disabled = count === 1;
      increase.disabled = count === maxLessons;
    }

    decrease.addEventListener('click', () => updateQuote(-1));
    increase.addEventListener('click', () => updateQuote(1));
    updateQuote(0);
  }
})();
