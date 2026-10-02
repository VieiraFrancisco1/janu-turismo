// Um único guia acompanha o contêiner visível, inclusive nas telas de informações.
export function initScrollGuide() {
  const arrow = document.createElement('button');
  arrow.className = 'scroll-guide-arrow';
  arrow.type = 'button';
  arrow.hidden = true;
  arrow.setAttribute('aria-label', 'Rolar para ver mais conteúdo');
  arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v16m-7-6 7 7 7-7"/></svg>';
  const track = document.createElement('div');
  track.className = 'scroll-guide-track';
  track.hidden = true;
  track.innerHTML = '<div class="scroll-guide-thumb" role="slider" tabindex="0" aria-label="Posição da rolagem" aria-valuemin="0" aria-valuemax="100" aria-orientation="vertical"><svg viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path fill="currentColor" d="M2 12a10 10 0 0 1 20 0c-2-2-4-2-6 0-2-2-6-2-8 0-2-2-4-2-6 0Z"/><path d="M12 2V1m0 11v10a3 3 0 0 0 6 0"/></svg></div>';
  document.body.append(arrow, track);
  const thumb = track.firstElementChild;
  let idle = true;
  let timer;
  let frame;
  let dragging = false;
  let dragOffset = 14;

  function activeContainer() {
    const dialog = document.querySelector('dialog[open]');
    if (dialog) return dialog;
    const screen = document.querySelector('[data-info-screen]:not([hidden])');
    if (screen) return screen;
    if (document.body.classList.contains('menu-open')) return document.querySelector('.side-menu');
    return document.scrollingElement;
  }

  function metrics() {
    const target = activeContainer();
    const page = target === document.scrollingElement;
    const height = page ? (window.visualViewport?.height || window.innerHeight) : target.clientHeight;
    const max = Math.max(0, target.scrollHeight - height);
    return { target, page, height, max, top: target.scrollTop };
  }

  function update() {
    frame = null;
    const { target, page, max, top } = metrics();
    if (!target) return;
    const more = max - top > 8;
    arrow.hidden = !more || !idle || dragging;
    track.hidden = max <= 8;
    const viewport = window.visualViewport?.height || window.innerHeight;
    const header = page ? document.querySelector('.site-header') : target.querySelector('.info-screen-head');
    const nav = page ? document.querySelector('.bottom-nav') : null;
    const start = Math.max(8, header?.getBoundingClientRect().bottom || 8) + 6;
    const end = nav ? Math.min(viewport, nav.getBoundingClientRect().top) - 8 : viewport - 8;
    const length = Math.max(40, end - start);
    track.style.top = `${start}px`;
    track.style.height = `${length}px`;
    const fraction = max ? Math.max(0, Math.min(1, top / max)) : 0;
    thumb.style.transform = `translateY(${fraction * (length - 28)}px)`;
    thumb.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
  }

  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function interaction() {
    idle = false;
    arrow.hidden = true;
    clearTimeout(timer);
    timer = setTimeout(() => { idle = true; schedule(); }, 3000);
    schedule();
  }
  function scrollTo(target, top, smooth = false) {
    const behavior = smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant';
    target.scrollTo({ top, behavior });
  }
  arrow.addEventListener('click', () => {
    interaction();
    const { target, top, height } = metrics();
    scrollTo(target, top + height * .75, true);
  });
  function dragTo(event) {
    const { target, max } = metrics();
    const rect = track.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientY - rect.top - dragOffset) / (rect.height - 28)));
    scrollTo(target, fraction * max);
    interaction();
  }
  track.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    dragOffset = event.target.closest('.scroll-guide-thumb') ? event.clientY - thumb.getBoundingClientRect().top : 14;
    track.setPointerCapture(event.pointerId);
    dragTo(event);
  });
  track.addEventListener('pointermove', event => { if (dragging) dragTo(event); });
  const endDrag = () => { dragging = false; interaction(); };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  thumb.addEventListener('keydown', event => {
    const { target, top, height, max } = metrics();
    const positions = { ArrowDown: top + 80, ArrowUp: top - 80, PageDown: top + height * .75, PageUp: top - height * .75, Home: 0, End: max };
    if (!(event.key in positions)) return;
    event.preventDefault();
    interaction();
    scrollTo(target, positions[event.key]);
  });
  for (const event of ['pointerdown', 'wheel', 'keydown', 'scroll']) {
    document.addEventListener(event, e => {
      // A seta precisa continuar no DOM até o clique terminar.
      if (event === 'pointerdown' && arrow.contains(e.target)) return;
      if (event === 'keydown' && arrow.contains(e.target) && ['Enter', ' '].includes(e.key)) return;
      interaction();
    }, { capture: true, passive: true });
  }
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app'), { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'open', 'class'] });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true });
  new ResizeObserver(schedule).observe(document.querySelector('#app'));
  document.addEventListener('load', schedule, true);
  schedule();
}
