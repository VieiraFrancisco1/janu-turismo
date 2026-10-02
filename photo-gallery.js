const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const svg = path => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const previousIcon = svg('<path d="m15 18-6-6 6-6"/>');
const nextIcon = svg('<path d="m9 18 6-6-6-6"/>');
const pauseIcon = svg('<path d="M8 5v14M16 5v14"/>');
const playIcon = svg('<path d="m9 5 10 7-10 7V5Z"/>');

export function photoCarouselMarkup(images, title) {
  const multiple = images.length > 1;
  return `<div class="detail-photo-carousel" role="region" aria-roledescription="carrossel" aria-label="Fotos de ${escape(title)}">
    <div class="detail-photo-track">${images.map((source, index) => `<div class="detail-photo-slide" aria-hidden="${index !== 0}"><img class="detail-cover" src="${escape(source)}" alt="${escape(title)} — foto ${index + 1}" ${index ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" /></div>`).join('')}</div>
    ${multiple ? `<span class="detail-photo-count" aria-hidden="true">1 / ${images.length}</span><button class="detail-photo-pause" type="button" aria-label="Pausar troca automática de fotos" aria-pressed="false">${pauseIcon}</button><button class="detail-photo-prev" type="button" aria-label="Foto anterior">${previousIcon}</button><button class="detail-photo-next" type="button" aria-label="Próxima foto">${nextIcon}</button>` : ''}
  </div>`;
}

export function explorePhotosMarkup() {
  return `<button class="explore-photos" type="button">${svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 16 5-5 4 4 4-5 5 6"/>')}<span>Explorar fotos</span></button>`;
}

export function initPhotoGallery(hero, images, title) {
  const carousel = hero.querySelector('.detail-photo-carousel');
  const slides = [...carousel.querySelectorAll('.detail-photo-slide')];
  const track = carousel.querySelector('.detail-photo-track');
  const pause = carousel.querySelector('.detail-photo-pause');
  const explore = hero.querySelector('.explore-photos');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dialog = document.createElement('dialog');
  dialog.className = 'photo-viewer';
  dialog.setAttribute('aria-labelledby', 'photo-viewer-title');
  dialog.innerHTML = `<div class="photo-viewer-shell"><header class="photo-viewer-head"><div><small>FOTOS DA VIAGEM</small><h2 id="photo-viewer-title">${escape(title)}</h2></div><button class="photo-viewer-close" type="button" aria-label="Fechar fotos">${svg('<path d="m6 6 12 12M18 6 6 18"/>')}</button></header><div class="photo-viewer-stage"><img alt="" /><button class="photo-viewer-prev" type="button" aria-label="Foto anterior" ${images.length === 1 ? 'hidden' : ''}>${previousIcon}</button><button class="photo-viewer-next" type="button" aria-label="Próxima foto" ${images.length === 1 ? 'hidden' : ''}>${nextIcon}</button></div><div class="photo-viewer-footer"><span class="photo-viewer-count" aria-live="polite"></span><div class="photo-viewer-thumbnails">${images.map((source, index) => `<button type="button" data-photo-index="${index}" aria-label="Ver foto ${index + 1}" aria-pressed="${index === 0}"><img src="${escape(source)}" alt="" loading="lazy" decoding="async" /></button>`).join('')}</div></div></div>`;
  document.body.append(dialog);
  const viewerImage = dialog.querySelector('.photo-viewer-stage img');
  let current = 0;
  let timer;
  let resumeTimer;
  let manuallyPaused = false;
  let hovered = false;
  let disposed = false;
  let touchStart;
  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => {
    stop();
    if (disposed || images.length <= 1 || reduced.matches || manuallyPaused || hovered || dialog.open || document.hidden || carousel.contains(document.activeElement)) return;
    timer = setInterval(() => show(current + 1), 5000);
  };
  const temporarilyPause = () => { stop(); clearTimeout(resumeTimer); resumeTimer = setTimeout(start, 8000); };
  function show(index) {
    current = (index + images.length) % images.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    slides.forEach((slide, i) => slide.setAttribute('aria-hidden', String(i !== current)));
    const count = carousel.querySelector('.detail-photo-count');
    if (count) count.textContent = `${current + 1} / ${images.length}`;
    if (dialog.open) {
      viewerImage.src = images[current];
      viewerImage.alt = `${title} — foto ${current + 1}`;
      dialog.querySelector('.photo-viewer-count').textContent = `${current + 1} de ${images.length}`;
      dialog.querySelectorAll('[data-photo-index]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.photoIndex) === current)));
      dialog.querySelector(`[data-photo-index="${current}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  }
  const move = direction => { show(current + direction); temporarilyPause(); };
  carousel.querySelector('.detail-photo-prev')?.addEventListener('click', () => move(-1));
  carousel.querySelector('.detail-photo-next')?.addEventListener('click', () => move(1));
  pause?.addEventListener('click', () => {
    manuallyPaused = !manuallyPaused;
    pause.setAttribute('aria-pressed', String(manuallyPaused));
    pause.setAttribute('aria-label', manuallyPaused ? 'Continuar troca automática de fotos' : 'Pausar troca automática de fotos');
    pause.innerHTML = manuallyPaused ? playIcon : pauseIcon;
    start();
  });
  carousel.addEventListener('mouseenter', () => { hovered = true; stop(); });
  carousel.addEventListener('mouseleave', () => { hovered = false; start(); });
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', () => queueMicrotask(start));
  const onVisibility = () => document.hidden ? stop() : start();
  const onMotion = () => { if (pause) pause.hidden = reduced.matches; start(); };
  document.addEventListener('visibilitychange', onVisibility);
  reduced.addEventListener('change', onMotion);
  const swipe = element => {
    element.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || event.target.closest('button')) return;
      touchStart = { x: event.clientX, y: event.clientY };
      temporarilyPause();
    });
    element.addEventListener('pointerup', event => {
      if (!touchStart) return;
      const dx = event.clientX - touchStart.x;
      const dy = event.clientY - touchStart.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
      touchStart = null;
    });
    element.addEventListener('pointercancel', () => { touchStart = null; });
  };
  swipe(carousel);
  swipe(dialog.querySelector('.photo-viewer-stage'));
  explore.addEventListener('click', () => {
    stop();
    dialog.showModal();
    document.body.classList.add('photo-viewer-open');
    show(current);
    dialog.querySelector('.photo-viewer-close').focus();
  });
  dialog.querySelector('.photo-viewer-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { document.body.classList.remove('photo-viewer-open'); if (!disposed && explore.isConnected) explore.focus(); start(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
  });
  dialog.querySelector('.photo-viewer-prev').addEventListener('click', () => move(-1));
  dialog.querySelector('.photo-viewer-next').addEventListener('click', () => move(1));
  dialog.querySelectorAll('[data-photo-index]').forEach(button => button.addEventListener('click', () => show(Number(button.dataset.photoIndex))));
  show(0);
  onMotion();
  return () => {
    disposed = true;
    stop();
    clearTimeout(resumeTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    reduced.removeEventListener('change', onMotion);
    if (dialog.open) dialog.close();
    dialog.remove();
    document.body.classList.remove('photo-viewer-open');
  };
}
