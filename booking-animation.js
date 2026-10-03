const VIDEO = './assets/reservando-janu-20261003.mp4';
let preparedVideo;

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function createVideo() {
  const video = document.createElement('video');
  video.className = 'booking-animation-preload';
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.disablePictureInPicture = true;
  video.setAttribute('aria-hidden', 'true');
  video.src = VIDEO;
  document.body.append(video);
  video.load();
  return video;
}

function discardVideo(video) {
  video.pause();
  video.removeAttribute('src');
  video.load();
  video.remove();
}

export function prepareBookingAnimation() {
  if (reducedMotion()) return () => {};
  preparedVideo ||= createVideo();
  const video = preparedVideo;
  return () => {
    if (preparedVideo !== video) return;
    preparedVideo = null;
    discardVideo(video);
  };
}

export function startBookingAnimation() {
  if (reducedMotion()) {
    if (preparedVideo) discardVideo(preparedVideo);
    preparedVideo = null;
    return { finished: Promise.resolve(), close() {} };
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'booking-animation';
  dialog.setAttribute('aria-label', 'Reservando sua viagem');
  dialog.setAttribute('aria-busy', 'true');
  dialog.innerHTML = '<p class="sr-only" role="status">Salvando sua reserva…</p>';
  const video = preparedVideo || createVideo();
  preparedVideo = null;
  video.classList.remove('booking-animation-preload');
  dialog.prepend(video);
  let closed = false;
  let playbackFinished = false;
  let fallbackTimer;
  let resolvePlayback;
  const finished = new Promise(resolve => { resolvePlayback = resolve; });
  const finishPlayback = () => {
    playbackFinished = true;
    clearTimeout(fallbackTimer);
    resolvePlayback();
  };
  const close = () => {
    if (closed) return;
    closed = true;
    finishPlayback();
    window.removeEventListener('hashchange', close);
    if (dialog.open) dialog.close();
    discardVideo(video);
    dialog.remove();
    document.body.classList.remove('booking-animation-open');
  };
  dialog.addEventListener('cancel', event => event.preventDefault());
  dialog.addEventListener('close', close, { once: true });
  const showPlayback = () => {
    if (closed || playbackFinished || dialog.open || video.readyState < 2 || video.paused) return;
    try {
      // A tela só abre quando já existe um quadro do vídeo e a reprodução começou.
      dialog.showModal();
      document.body.classList.add('booking-animation-open');
      clearTimeout(fallbackTimer);
      const durationMs = Number.isFinite(video.duration) ? video.duration * 1000 : 4000;
      fallbackTimer = setTimeout(close, Math.max(6000, durationMs + 2000));
    } catch {
      close();
    }
  };
  video.addEventListener('playing', showPlayback);
  video.addEventListener('ended', finishPlayback, { once: true });
  video.addEventListener('error', close, { once: true });
  document.body.append(dialog);
  window.addEventListener('hashchange', close, { once: true });
  try {
    if (reducedMotion() || video.error) {
      close();
    } else {
      // Durante o carregamento, mantém o formulário visível e salva em paralelo.
      fallbackTimer = setTimeout(close, 4000);
      if (video.currentTime !== 0) video.currentTime = 0;
      video.play()?.then(showPlayback, close);
    }
  } catch {
    close();
  }
  return { finished, close };
}
