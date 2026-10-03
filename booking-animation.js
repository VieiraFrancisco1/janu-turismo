const VIDEO = './assets/reservando-janu-20261003.mp4';
const POSTER = './assets/reservando-janu-20261003.jpg';

export function startBookingAnimation() {
  const dialog = document.createElement('dialog');
  dialog.className = 'booking-animation';
  dialog.setAttribute('aria-label', 'Reservando sua viagem');
  dialog.setAttribute('aria-busy', 'true');
  dialog.innerHTML = `<video src="${VIDEO}" poster="${POSTER}" muted playsinline preload="auto" disablepictureinpicture aria-hidden="true"></video><p class="sr-only" role="status">Salvando sua reserva…</p>`;
  const video = dialog.querySelector('video');
  video.muted = true;
  let closed = false;
  let fallbackTimer;
  let resolvePlayback;
  const finished = new Promise(resolve => { resolvePlayback = resolve; });
  const finishPlayback = () => {
    clearTimeout(fallbackTimer);
    resolvePlayback();
  };
  const close = () => {
    if (closed) return;
    closed = true;
    finishPlayback();
    window.removeEventListener('hashchange', close);
    video.pause();
    if (dialog.open) dialog.close();
    dialog.remove();
    document.body.classList.remove('booking-animation-open');
  };
  dialog.addEventListener('cancel', event => event.preventDefault());
  dialog.addEventListener('close', close, { once: true });
  video.addEventListener('ended', finishPlayback, { once: true });
  video.addEventListener('error', finishPlayback, { once: true });
  document.body.append(dialog);
  window.addEventListener('hashchange', close, { once: true });
  try {
    dialog.showModal();
    document.body.classList.add('booking-animation-open');
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finishPlayback();
    } else {
      // O salvamento segue em paralelo; uma falha no vídeo não segura a reserva.
      fallbackTimer = setTimeout(finishPlayback, 6000);
      video.play()?.catch(finishPlayback);
    }
  } catch {
    close();
  }
  return { finished, close };
}
