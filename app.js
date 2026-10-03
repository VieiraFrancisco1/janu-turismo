import { cearaDate, tripDeadline, reservationDeadline, watchDeadlines } from './reservation-lifecycle.js';
import { bookingId } from './booking-model.js';
import { photoCarouselMarkup, explorePhotosMarkup, initPhotoGallery } from './photo-gallery.js';
import { initScrollGuide } from './scroll-guide.js';
import { PASSEIOS_SEED, adaptarPasseioParaApp, parcelasDisponiveis } from './catalogo.js';
import { configured, authReady, currentUser, login, loginWithGoogle, resetPassword, logout, accountLabel, getCatalog, getTrips, watchTrips, createBooking, getBooking, myBookings, watchBooking, watchMyBookings, adminGet, adminSetCapacity, adminSetStatus, adminSaveTrip, adminManualBooking, adminDeleteBooking, adminCreatePhoneAccount, adminSetCurrentPassword, isProvisionedAdminAccount, adminAccess } from './data.js';

const WHATSAPP_NUMBER = '5588988737924';

const AGENCY_INFO = {
  instagram: 'https://www.instagram.com/januturismo_/',
  instagramHandle: '@januturismo_',
  registry: {
    value: '67.223.094/0001-39',
    verified: false, // [CONFIRMAR] se é CNPJ, registro Cadastur ou outra identificação.
  },
};
let inventory = {};
let inventoryReady = false;
let lastBooking = null;

let TRIPS = PASSEIOS_SEED.map(adaptarPasseioParaApp);

const app = document.querySelector('#app');
const starterTrips = TRIPS.map(trip => ({ ...trip, published: trip.published !== false }));
TRIPS = starterTrips.map(normalizeTrip);
let filter = 'Todos';
let query = '';
let disposeDetailPhotos = () => {};
let disposeBookings = () => {};
let disposeAdminExpiry = () => {};
let disposeTripExpiry = () => {};
let disposeInventory = () => {};
let adminActiveTab = 'trips';
let adminOpenTrip = '';

const paths = {
  arrowLeft: '<path d="m15 18-6-6 6-6"/>',
  arrowRight: '<path d="m9 18 6-6-6-6"/>',
  arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/>',
  bag: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  whatsapp: '<path d="M20.5 11.7a8.5 8.5 0 0 1-12.4 7.5L3 20.5l1.4-5A8.5 8.5 0 1 1 20.5 11.7Z"/><path d="M8.5 8.5c.1 2.8 3.2 6.3 6.7 6.9l1.1-1.5-2.2-1.2-1.1.9a8 8 0 0 1-2.7-2.7l.9-1.1-1.2-2.2-1.5.9Z"/>',
  share: '<path d="M12 16V3m0 0L8 7m4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M7 21v-3m10 3v-3M7 7h3m4 0h3"/>',
  coffee: '<path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Zm13 1h2a2 2 0 0 1 0 4h-2M7 3v3m4-3v3m4-3v3"/>',
  car: '<path d="m5 11 2-5h10l2 5M4 11h16v8H4v-8Zm0 4h16M7 19v2m10-2v2"/><circle cx="7" cy="14" r=".6"/><circle cx="17" cy="14" r=".6"/>',
  bed: '<rect x="3" y="10" width="18" height="9" rx="2"/><path d="M3 19v2m18-2v2M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M3 14h18"/>',
  meal: '<path d="M4 3v8m3-8v8m3-8v8M7 11v10M17 3v18m0-18c3 3 3 7 0 9"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3v4Zm9-4v12"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3-7 8-7s8 3 8 7"/>',
  money: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01M18 15h.01"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>',
  document: '<path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h8"/>',
  shield: '<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Z"/><path d="m8 12 3 3 5-6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
};

function icon(name, size = 24) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function waLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function previewSeats(id) {
  const counts = [12, 8, 15, 10, 6];
  return counts[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % counts.length];
}

function tripAvailability(id) {
  const trip = TRIPS.find(item => item.id === id);
  const state = inventory[id];

  if (!trip) return { key: 'unknown', text: 'Consulte vagas', soldOut: false };
  if (isTripPast(trip) || trip.status === 'encerrado') return { key: 'closed', text: 'Encerrado', soldOut: true };
  if (trip.dateTbc === true || trip.status === 'data-a-confirmar') return { key: 'date-pending', text: 'Data a confirmar', soldOut: false };
  if (trip.status === 'esgotado') return { key: 'sold-out', text: 'Esgotado', soldOut: true };

  if (!inventoryReady || !state || state.demo) {
    if (trip.publicVacancyStatus === 'last-spots') return { key: 'last-spots', text: 'Últimas vagas', soldOut: false };
    return { key: 'open', text: 'Vagas disponíveis', soldOut: false };
  }

  if (!state.enabled) return { key: 'preparing', text: 'Reservas pausadas', soldOut: true };
  if (state.available <= 0) return { key: 'sold-out', text: 'Esgotado', soldOut: true };
  if (state.publicVacancyStatus === 'last-spots') {
    return { key: 'last-spots', text: 'Últimas vagas', soldOut: false };
  }
  return { key: 'open', text: 'Vagas disponíveis', soldOut: false };
}

function seatsText(id) {
  return tripAvailability(id).text;
}

function tripMinimumToConfirm(trip) {
  const value = trip?.minToConfirm ?? trip?.minimoParaConfirmar ?? 0;
  const minimum = Number(value);
  return Number.isFinite(minimum) && minimum > 0 ? minimum : 0;
}

function minimumProgressMarkup(trip) {
  const minimum = tripMinimumToConfirm(trip);
  if (!Number.isFinite(minimum) || minimum <= 0) return '';
  const occupied = Number.isFinite(Number(trip.vagasOcupadas)) ? Number(trip.vagasOcupadas) : 0;
  const missing = Math.max(0, minimum - occupied);
  const progress = Math.min(100, Math.round((occupied / minimum) * 100));
  return `<div class="minimum-progress" data-minimum-progress="${trip.id}" data-minimum="${minimum}">
    <div class="minimum-progress-copy"><strong>${missing > 0 ? `Faltam ${missing} ${missing === 1 ? 'pessoa' : 'pessoas'} para confirmar a saída` : 'Mínimo de passageiros atingido'}</strong><span>${occupied} de ${minimum}</span></div>
    <div class="minimum-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${minimum}" aria-valuenow="${Math.min(occupied, minimum)}"><span style="width:${progress}%"></span></div>
  </div>`;
}

function updateAvailabilityUI() {
  document.querySelectorAll('[data-seats]').forEach(el => {
    const status = tripAvailability(el.dataset.seats);
    el.textContent = status.text;
    [...el.classList].filter(name => name.startsWith('status-')).forEach(name => el.classList.remove(name));
    el.classList.add(`status-${status.key}`);
  });

  document.querySelectorAll('[data-hero-offer]').forEach(el => {
    const trip = TRIPS.find(item => item.id === el.dataset.heroOffer);
    if (!trip) return;
    el.textContent = `A partir de ${money(trip.price)}`;
  });

  document.querySelectorAll('[data-hero-vacancies]').forEach(el => {
    const trip = TRIPS.find(item => item.id === el.dataset.heroVacancies);
    if (!trip) return;
    const status = tripAvailability(trip.id);
    [...el.classList].filter(name => name.startsWith('status-')).forEach(name => el.classList.remove(name));
    el.classList.add(`status-${status.key}`);
    if (['open', 'last-spots', 'sold-out', 'closed', 'date-pending', 'preparing'].includes(status.key)) {
      el.textContent = status.text;
      el.classList.remove('is-demo');
      return;
    }
    el.textContent = 'Consulte vagas';
    el.classList.add('is-demo');
  });

  document.querySelectorAll('[data-reservation-count]').forEach(el => {
    const state = inventory[el.dataset.reservationCount];
    if (!inventoryReady || !state || state.demo) {
      el.textContent = 'Quantidade de reservas a confirmar';
    } else {
      const count = Number(state.reserved || 0);
      el.textContent = `${count} ${count === 1 ? 'reserva registrada' : 'reservas registradas'}`;
    }
  });

  document.querySelectorAll('[data-low-stock-warning]').forEach(el => {
    const status = tripAvailability(el.dataset.lowStockWarning);
    const show = status.key === 'last-spots';
    el.hidden = !show;
    if (show) el.textContent = 'Últimas vagas. Garanta sua reserva enquanto ainda há disponibilidade.';
  });

  document.querySelectorAll('[data-minimum-progress]').forEach(holder => {
    const trip = TRIPS.find(item => item.id === holder.dataset.minimumProgress);
    const minimum = Number(holder.dataset.minimum || tripMinimumToConfirm(trip));
    if (!trip || !minimum) return;
    const state = inventory[trip.id];
    const occupied = inventoryReady && state && !state.demo
      ? Number(state.reserved || 0)
      : Number(trip.vagasOcupadas || 0);
    const missing = Math.max(0, minimum - occupied);
    const progress = Math.min(100, Math.round((occupied / minimum) * 100));
    const strong = holder.querySelector('strong');
    const count = holder.querySelector('.minimum-progress-copy span');
    const bar = holder.querySelector('.minimum-progress-bar');
    const fill = bar?.querySelector('span');
    if (strong) strong.textContent = missing > 0
      ? `Faltam ${missing} ${missing === 1 ? 'pessoa' : 'pessoas'} para confirmar a saída`
      : 'Mínimo de passageiros atingido';
    if (count) count.textContent = `${occupied} de ${minimum}`;
    if (bar) bar.setAttribute('aria-valuenow', String(Math.min(occupied, minimum)));
    if (fill) fill.style.width = `${progress}%`;
  });

  const reserve = document.querySelector('#whatsapp-reserve');
  if (reserve) {
    const tripId = reserve.dataset.trip;
    const status = tripAvailability(tripId);
    reserve.disabled = status.soldOut || reserve.dataset.saving === 'true';
    const label = reserve.querySelector('span');
    if (label && reserve.dataset.saving !== 'true') label.textContent = status.soldOut ? (status.key === 'preparing' ? 'Pausada' : 'Esgotado') : 'Reservar';
    document.querySelectorAll('[data-waitlist]').forEach(link => {
      link.hidden = !status.soldOut;
    });
    const form = document.querySelector('#trip-booking-config');
    if (form) form.classList.toggle('is-sold-out', status.soldOut);
  }
}

function refreshInventory() {
  disposeInventory();
  disposeInventory = () => {};
  const ids = TRIPS.map(trip => trip.id);
  if (!ids.length) {
    inventory = {};
    inventoryReady = true;
    updateAvailabilityUI();
    return;
  }
  try {
    disposeInventory = watchTrips(ids, trips => {
      inventory = Object.fromEntries(trips.map(trip => [trip.id, trip]));
      inventoryReady = true;
      updateAvailabilityUI();
    }, () => {
      inventoryReady = false;
      updateAvailabilityUI();
    });
  } catch {
    inventoryReady = false;
    updateAvailabilityUI();
  }
}

function authPanel(title = 'Entre para continuar') {
  return `<div class="auth-panel" data-auth-mode="login">
    <div class="auth-tabs" aria-label="Acesso à conta">
      <button class="auth-tab is-active" type="button" data-auth-tab="login" aria-pressed="true">Entrar</button>
      <button class="auth-tab" type="button" data-auth-tab="register" aria-pressed="false">Criar conta</button>
    </div>
    <h2 class="auth-heading">${escapeHtml(title)}</h2>
    <p class="auth-description">Entre para acompanhar suas reservas em qualquer aparelho.</p>
    <form class="auth-form">
      <label class="register-name" hidden>Nome<input name="name" autocomplete="username" minlength="2" maxlength="80" placeholder="Escolha seu nome de acesso" disabled /></label>
      <label class="login-identifier" data-login-only>Nome, telefone ou e-mail<input name="email" autocomplete="username" maxlength="254" placeholder="Seu nome, telefone ou e-mail" required /></label>
      <label>Senha<input type="password" name="password" autocomplete="current-password" minlength="6" placeholder="Sua senha" required /></label>
      <button class="forgot-password" type="button" data-login-only>Esqueci minha senha</button>
      <p class="form-error" role="alert" hidden></p>
      <button class="auth-submit" type="submit">Entrar</button>
    </form>
    <div class="auth-or" data-login-only><span>ou</span></div>
    <button class="google-login" type="button" data-login-only><span class="google-mark" aria-hidden="true">G</span> Entrar com Google</button>
    <button class="auth-switch" type="button">Ainda não tem conta? <strong>Criar conta</strong></button>
  </div>`;
}
function bindAuth(container, onSuccess) {
  const panel = container.querySelector('.auth-panel');
  const form = container.querySelector('.auth-form');
  const nameField = form.querySelector('.register-name');
  const nameInput = nameField.querySelector('input');
  const password = form.querySelector('[name="password"]');
  const error = form.querySelector('.form-error');
  const switchButton = panel.querySelector('.auth-switch');
  const resetButton = panel.querySelector('.forgot-password');
  const googleButton = panel.querySelector('.google-login');
  const title = panel.querySelector('.auth-heading').textContent;

  function setMode(mode) {
    const register = mode === 'register';
    panel.dataset.authMode = mode;
    nameField.hidden = !register;
    nameInput.disabled = !register;
    nameInput.required = register;
    form.elements.email.disabled = register;
    form.elements.email.required = !register;
    password.autocomplete = register ? 'new-password' : 'current-password';
    password.value = '';
    error.hidden = true;
    panel.querySelector('.auth-heading').textContent = register ? 'Crie sua conta' : title;
    panel.querySelector('.auth-description').textContent = register
      ? 'Escolha um nome único e uma senha para acompanhar suas reservas.'
      : 'Entre para acompanhar suas reservas em qualquer aparelho.';
    form.querySelector('.auth-submit').textContent = register ? 'Criar conta' : 'Entrar';
    switchButton.innerHTML = register ? 'Já tem conta? <strong>Entrar</strong>' : 'Ainda não tem conta? <strong>Criar conta</strong>';
    panel.querySelectorAll('[data-login-only]').forEach(element => { element.hidden = register; });
    panel.querySelectorAll('[data-auth-tab]').forEach(button => {
      const active = button.dataset.authTab === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  panel.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.authTab)));
  switchButton.addEventListener('click', () => setMode(panel.dataset.authMode === 'login' ? 'register' : 'login'));

  resetButton?.addEventListener('click', async () => {
    const email = String(form.elements.email.value || '').trim();
    error.hidden = true;
    if (!email.includes('@')) {
      error.textContent = 'Para contas com e-mail, digite-o acima. Contas criadas com nome não têm recuperação por e-mail; fale com a Janu para obter ajuda.';
      error.hidden = false;
      form.elements.email.focus();
      return;
    }
    resetButton.disabled = true;
    try {
      await resetPassword(email);
      showToast('Enviamos o link de recuperação para seu e-mail.');
    } catch (problem) {
      error.textContent = problem.message;
      error.hidden = false;
    } finally {
      resetButton.disabled = false;
    }
  });

  googleButton?.addEventListener('click', async () => {
    error.hidden = true;
    const buttons = panel.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);
    try {
      await loginWithGoogle();
      onSuccess();
    } catch (problem) {
      error.textContent = problem.message;
      error.hidden = false;
    } finally {
      buttons.forEach(button => button.disabled = false);
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const register = panel.dataset.authMode === 'register';
    if (register && !nameInput.value.trim()) { nameInput.focus(); return; }
    const buttons = panel.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);
    error.hidden = true;
    try {
      const data = new FormData(form);
      await login(String(register ? data.get('name') : data.get('email')), String(data.get('password')), register, String(data.get('name') || ''));
      onSuccess();
    } catch (problem) {
      error.textContent = problem.message;
      error.hidden = false;
    } finally { buttons.forEach(button => button.disabled = false); }
  });
}
function tripName(id) { return TRIPS.find(trip => trip.id === id)?.title || 'Viagem'; }
function fares(trip) {
  return Array.isArray(trip.fareOptions) && trip.fareOptions.length ? trip.fareOptions : [
    { label: trip.priceNote || 'Individual', amount: trip.price, seats: 1 },
    ...(trip.couplePrice ? [{ label: trip.coupleNote || 'Casal (2 pessoas)', amount: trip.couplePrice, seats: 2 }] : []),
  ];
}
function formatTripDisplayDate(startDate, endDate) {
  const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  if (!valid(startDate)) return '';
  const start = new Date(`${startDate}T12:00:00`);
  const endValue = valid(endDate) ? endDate : startDate;
  const end = new Date(`${endValue}T12:00:00`);
  const month = date => new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);

  if (startDate === endValue) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(start);
  }
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${String(start.getDate()).padStart(2, '0')} e ${String(end.getDate()).padStart(2, '0')} de ${month(end)}`;
  }
  return `${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(start)} a ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(end)}`;
}

function normalizeTrip(trip) {
  const startDate = String(trip.startDate || trip.dataInicio || '');
  const endDate = String(trip.endDate || trip.dataFim || startDate || '');
  const minToConfirm = trip.minToConfirm ?? trip.minimoParaConfirmar ?? null;
  const dateTbc = trip.dateTbc === true || trip.status === 'data-a-confirmar';
  const generatedDate = formatTripDisplayDate(startDate, endDate);

  return {
    ...trip,
    startDate,
    endDate,
    minToConfirm: minToConfirm === '' ? null : minToConfirm,
    dateTbc,
    date: String(trip.date || generatedDate || 'Data a confirmar'),
    image: trip.images?.[0] || trip.image || './assets/logo-janu.webp',
    boarding: Array.isArray(trip.boarding) ? trip.boarding : [],
    includes: Array.isArray(trip.includes) ? trip.includes : [],
    stops: Array.isArray(trip.stops) ? trip.stops : [],
    published: trip.published !== false,
    special: trip.special === true,
    specialUntil: String(trip.specialUntil || ''),
  };
}

function todayIso() { return cearaDate(); }

function isSpecialActive(trip) {
  if (!trip.published || !trip.special) return false;
  if (!trip.specialUntil) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trip.specialUntil)) return true;
  return trip.specialUntil >= todayIso();
}
async function loadCatalog() {
  if (!configured) return;
  try {
    const stored = await getCatalog();
    const lookup = new Map(stored.map(trip => [trip.id, trip]));
    TRIPS = starterTrips.map(trip => normalizeTrip({ ...trip, ...lookup.get(trip.id) }));
    TRIPS.push(...stored.filter(trip => !starterTrips.some(base => base.id === trip.id)).map(normalizeTrip));
    trackTripExpiry();
    render();
  } catch (error) { showToast('Não foi possível carregar as viagens da agência.'); }
}

function header() {
  return `<header class="site-header wrap">
    <button class="header-menu-button" type="button" data-menu-toggle aria-label="Abrir menu">${icon('menu', 25)}</button>
    <a class="brand" href="#/" aria-label="Janu Turismo — início"><img src="./assets/logo-janu.webp" alt="Janu Turismo — Levando você aos melhores destinos" /></a>
    <a class="profile-link profile-icon-only" href="#/perfil" aria-label="${currentUser() ? 'Abrir meu perfil' : 'Fazer login'}">${icon('user', 24)}</a>
  </header>
  <div class="side-menu-backdrop" data-menu-backdrop hidden></div>
  <aside class="side-menu" data-side-menu aria-hidden="true" aria-label="Menu">
    <div class="side-menu-head">
      <img src="./assets/logo-janu.webp" alt="Janu Turismo" />
      <button type="button" data-menu-close aria-label="Fechar menu">${icon('close', 23)}</button>
    </div>
    <nav class="side-menu-links">
      <button type="button" data-info-open="depoimentos"><strong>💬 Depoimentos</strong><span>Veja feedbacks de clientes</span>${icon('arrowRight', 19)}</button>
      <button type="button" data-info-open="politicas"><strong>📋 Políticas</strong><span>Reserva e cancelamento</span>${icon('arrowRight', 19)}</button>
      <button type="button" data-info-open="pagamento"><strong>💳 Formas de pagamento</strong><span>Pix, cartão e condições</span>${icon('arrowRight', 19)}</button>
    </nav>
  </aside>
  <section class="info-screen" data-info-screen hidden aria-modal="true" role="dialog"></section>`;
}

function bottomNav(active) {
  const items = [['home', 'Início', '#/', 'home'], ['bag', 'Viagens', '#/viagens', 'trips'], ['ticket', 'Reservas', '#/reservas', 'bookings'], ['whatsapp', 'Contato', '#/contato', 'contact']];
  return `<nav class="bottom-nav" aria-label="Navegação principal"><div class="bottom-nav-inner">${items.map(([glyph, label, url, key]) => `<a href="${url}" class="nav-item ${active === key ? 'active' : ''}" ${active === key ? 'aria-current="page"' : ''}>${icon(glyph, 26)}<span>${label}</span></a>`).join('')}</div></nav>`;
}

const FILTER_OPTIONS = ['Todos', 'Bate e volta', 'Com hospedagem', 'Parques', 'Praia', 'Serra'];

function tripStartDate(trip) {
  const value = String(trip.startDate || trip.dataInicio || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function tripEndDate(trip) {
  const value = String(trip.endDate || trip.dataFim || tripStartDate(trip) || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function compareTripsByStartDate(a, b) {
  const dateA = tripStartDate(a) || '9999-12-31';
  const dateB = tripStartDate(b) || '9999-12-31';
  const byDate = dateA.localeCompare(dateB);
  return byDate || String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR');
}

function isTripPast(trip) {
  if (trip.status === 'encerrado') return true;
  const endDate = tripEndDate(trip);
  return Boolean(endDate && endDate < todayIso());
}

function upcomingTrips() {
  return TRIPS
    .filter(trip => trip.published && !isTripPast(trip))
    .sort(compareTripsByStartDate);
}

function trackTripExpiry() {
  disposeTripExpiry();
  let visible = upcomingTrips().map(trip => trip.id).join('|');
  disposeTripExpiry = watchDeadlines(TRIPS.map(tripDeadline), () => {
    const next = upcomingTrips().map(trip => trip.id).join('|');
    if (visible === next) return;
    visible = next;
    const detailId = location.hash.match(/^#\/viagem\/([^/]+)/)?.[1];
    if (detailId && !isTripPast(TRIPS.find(trip => trip.id === detailId) || {})) return;
    render();
  });
}

function tripHasAccommodation(trip) {
  const kind = `${trip.kind || ''} ${trip.duracao || ''}`.toLowerCase();
  const start = tripStartDate(trip);
  const end = tripEndDate(trip);
  return Boolean(trip.hospedagem) || kind.includes('hospedagem') || Boolean(start && end && start !== end);
}

function tripBoardingCities(trip) {
  const direct = Array.isArray(trip.boarding) ? trip.boarding : [];
  const fareCities = fares(trip).map(fare => fare.boardingCity).filter(Boolean);
  return [...new Set([...direct, ...fareCities].map(city => String(city).trim()).filter(Boolean))];
}

function tripMatchesFilter(trip, selected = filter) {
  if (selected === 'Todos') return true;
  const category = `${trip.categoria || ''} ${trip.category || ''}`.toLowerCase();
  const kind = `${trip.kind || ''} ${trip.duracao || ''}`.toLowerCase();

  if (selected === 'Bate e volta') return kind.includes('bate e volta') && !tripHasAccommodation(trip);
  if (selected === 'Com hospedagem') return tripHasAccommodation(trip);
  if (selected === 'Parques') return category.includes('parque');
  if (selected === 'Praia') return category.includes('praia');
  if (selected === 'Serra') return category.includes('serra');
  return true;
}

function filterChips() {
  return `<div class="filter-strip"><div class="filters discovery-filters" role="group" aria-label="Filtrar viagens">${FILTER_OPTIONS.map(name => `<button type="button" data-filter="${escapeHtml(name)}" class="${name === filter ? 'selected' : ''}" aria-pressed="${name === filter}">${escapeHtml(name)}</button>`).join('')}</div><button class="filter-scroll-hint" type="button" aria-label="Ver mais categorias" hidden>${icon('arrowRight', 22)}</button></div>`;
}

function bindFilterHint() {
  const strip = app.querySelector('.filter-strip');
  if (!strip) return;
  const row = strip.querySelector('.filters');
  const hint = strip.querySelector('.filter-scroll-hint');
  const update = () => { hint.hidden = row.scrollWidth - row.clientWidth - row.scrollLeft <= 6; };
  row.addEventListener('scroll', update, { passive: true });
  hint.addEventListener('click', () => row.scrollBy({ left: row.clientWidth * .65, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
  const resize = new ResizeObserver(update);
  resize.observe(row);
  const observer = new MutationObserver(() => {
    if (!strip.isConnected) { resize.disconnect(); observer.disconnect(); }
  });
  observer.observe(app, { childList: true });
  update();
}

function boardingSummary(trip) {
  const places = tripBoardingCities(trip);
  if (!places.length) return 'Embarque a confirmar';
  if (places.length <= 2) return places.join(' · ');
  return `${places.slice(0, 2).join(' · ')} +${places.length - 2}`;
}

function bindImageSkeletons(root = app) {
  root.querySelectorAll('.image-skeleton img').forEach(img => {
    const holder = img.closest('.image-skeleton');
    const reveal = () => holder?.classList.add('is-loaded');
    if (img.complete) reveal();
    else {
      img.addEventListener('load', reveal, { once: true });
      img.addEventListener('error', reveal, { once: true });
    }
  });
}

function trustBand() {
  const registry = AGENCY_INFO.registry.verified
    ? `<span class="trust-registry">Cadastur · ${escapeHtml(AGENCY_INFO.registry.value)}</span>`
    : '';
  return `<section class="trust-band" aria-label="Canais oficiais da Janu Turismo">
    <span class="trust-official">${icon('check', 17)} Atendimento oficial</span>
    ${registry}
    <a href="${AGENCY_INFO.instagram}" target="_blank" rel="noopener noreferrer">${AGENCY_INFO.instagramHandle}</a>
    <a href="${waLink('Olá, Janu Turismo! Vim pelo site. Gostaria de falar com a equipe.')}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
  </section>`;
}

function siteFooter({ compact = false } = {}) {
  return `<footer class="site-footer ${compact ? 'site-footer-compact' : ''}">
    <div class="footer-brand"><img src="./assets/logo-janu.webp" alt="Janu Turismo" loading="lazy" decoding="async" /><p>Viagens e passeios saindo do interior do Ceará.</p></div>
    <nav class="footer-links" aria-label="Informações da Janu Turismo">
      <a href="${AGENCY_INFO.instagram}" target="_blank" rel="noopener noreferrer">${icon('instagram', 20)}<span>Instagram</span></a>
      <a href="${waLink('Olá, Janu Turismo! Vim pelo site e gostaria de atendimento.')}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 20)}<span>WhatsApp</span></a>
      <a href="#/politicas/reservas">${icon('document', 20)}<span>Políticas de<br>reservas</span></a>
      <a href="#/politicas/privacidade">${icon('shield', 20)}<span>Política de<br>privacidade</span></a>
    </nav>
    <small>© ${new Date().getFullYear()} Janu Turismo. Todos os direitos reservados.</small>
  </footer>`;
}

function cardIncludedItems(trip) {
  const labels = new Map([
    ['bus', 'Transporte'],
    ['bed', 'Hospedagem'],
    ['coffee', 'Refeições'],
    ['meal', 'Refeições'],
  ]);
  const found = [];
  for (const [glyph] of trip.includes || []) {
    const label = labels.get(glyph);
    if (!label || found.some(item => item.label === label)) continue;
    found.push({ glyph: glyph === 'coffee' ? 'meal' : glyph, label });
  }
  return found.slice(0, 3);
}

function tripCard(trip, { special = false } = {}) {
  const included = cardIncludedItems(trip);
  return `<a class="trip-card ${special ? 'trip-card-special' : ''}" href="#/viagem/${encodeURIComponent(trip.id)}" aria-label="Ver detalhes de ${escapeHtml(trip.title)}">
    <div class="trip-photo-link image-skeleton"><img src="${trip.image}" alt="${escapeHtml(trip.imageAlt || trip.title)}" loading="lazy" decoding="async" />${special ? '<span class="special-ribbon">Especial</span>' : ''}<span class="photo-chip">${escapeHtml(trip.category)}</span></div>
    <div class="trip-card-body">
      <div class="trip-card-top"><span class="trip-kind">${escapeHtml(trip.kind)}</span><span class="trip-status" data-seats="${trip.id}">${seatsText(trip.id)}</span></div>
      <h3>${escapeHtml(trip.title)}</h3>
      ${trip.subtitle ? `<p class="trip-subtitle">${escapeHtml(trip.subtitle)}</p>` : ''}
      <p class="trip-date">${icon('calendar', 17)}<span>${escapeHtml(trip.date)}${trip.duracao ? ` · ${escapeHtml(trip.duracao)}` : ''}</span></p>
      <p class="trip-boarding">${icon('pin', 16)}<span>${escapeHtml(boardingSummary(trip))}</span></p>
      ${included.length ? `<div class="trip-included" aria-label="Principais itens inclusos">${included.map(item => `<span title="${escapeHtml(item.label)}">${icon(item.glyph, 16)} ${escapeHtml(item.label)}</span>`).join('')}</div>` : ''}
      <div class="trip-card-footer"><p class="trip-price"><small>A partir de</small><strong>${money(trip.price)}</strong><em>por pessoa</em></p></div>
    </div>
  </a>`;
}

function heroMarkup(trips) {
  if (!trips.length) {
    return `<section class="hero" aria-label="Conheça as viagens da Janu Turismo">
      <img src="./assets/lagoa-do-paraiso.webp" alt="Águas azuis e paisagem de praia" fetchpriority="high" />
      <div class="hero-shade"></div>
      <div class="hero-copy"><span class="hero-eyebrow">Janu Turismo <i></i> Ceará</span><h1>Viajar é viver <em>mais histórias.</em></h1><p>Descubra passeios para sair da rotina e aproveitar cada momento.</p><a class="hero-cta" href="#/viagens">Explorar viagens ${icon('arrowRight', 18)}</a></div>
    </section>`;
  }

  const slides = trips.slice(0, 5);
  const multiple = slides.length > 1;
  return `<section class="hero hero-carousel home-banner" role="region" aria-roledescription="carrossel" aria-label="Viagens em destaque">
    <h1 class="sr-only">Janu Turismo — viagens em destaque</h1>
    <div class="hero-track">${slides.map((trip, index) => `<article class="hero-slide" role="group" aria-roledescription="slide" aria-label="${index + 1} de ${slides.length}" aria-hidden="${index !== 0}">
      <img src="${trip.image}" alt="${escapeHtml(trip.imageAlt || trip.title)}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'} />
      <div class="hero-shade"></div>
      <div class="hero-copy">
        <span class="hero-eyebrow">${escapeHtml(trip.category)} <i></i> ${escapeHtml(trip.date)}</span>
        <h2>${escapeHtml(trip.title)}</h2>
        ${trip.subtitle ? `<p class="hero-subtitle">${escapeHtml(trip.subtitle)}</p>` : ''}
        <div class="hero-info-row">
          <p class="hero-offer" data-hero-offer="${trip.id}">A partir de ${money(trip.price)}</p>
          <p class="hero-vacancies" data-hero-vacancies="${trip.id}">Vagas a confirmar</p>
        </div>
        <a class="hero-cta" href="#/viagem/${encodeURIComponent(trip.id)}"><span>Conferir</span> ${icon('arrowRight', 18)}</a>
      </div>
    </article>`).join('')}</div>
    ${multiple ? `<button class="hero-arrow hero-arrow-prev" type="button" data-hero-prev aria-label="Viagem anterior">${icon('arrowLeft', 22)}</button>
    <button class="hero-arrow hero-arrow-next" type="button" data-hero-next aria-label="Próxima viagem">${icon('arrowRight', 22)}</button>
    <div class="hero-dots" aria-label="Escolher viagem">${slides.map((trip, index) => `<button type="button" data-hero-dot="${index}" class="${index === 0 ? 'active' : ''}" aria-label="Mostrar ${escapeHtml(trip.title)}" aria-pressed="${index === 0}"></button>`).join('')}</div>` : ''}
  </section>`;
}

function bindHero() {
  const hero = app.querySelector('.hero-carousel');
  if (!hero) return;

  const track = hero.querySelector('.hero-track');
  const slides = [...hero.querySelectorAll('.hero-slide')];
  const dots = [...hero.querySelectorAll('[data-hero-dot]')];
  const prev = hero.querySelector('[data-hero-prev]');
  const next = hero.querySelector('[data-hero-next]');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let current = 0;
  let touchStart = null;
  let autoplayTimer = null;
  let resumeTimer = null;

  const show = nextIndex => {
    if (!slides.length) return;
    current = (nextIndex + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    slides.forEach((slide, index) => {
      const active = index === current;
      slide.setAttribute('aria-hidden', String(!active));
      slide.querySelectorAll('a, button').forEach(control => {
        if (active) control.removeAttribute('tabindex');
        else control.setAttribute('tabindex', '-1');
      });
    });
    dots.forEach((dot, index) => {
      const active = index === current;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-pressed', String(active));
    });
  };

  const stopAutoplay = () => {
    if (autoplayTimer) clearInterval(autoplayTimer);
    autoplayTimer = null;
  };

  const startAutoplay = () => {
    stopAutoplay();
    if (reducedMotion || slides.length <= 1) return;
    autoplayTimer = setInterval(() => show(current + 1), 4000);
  };

  const pauseTemporarily = () => {
    stopAutoplay();
    if (resumeTimer) clearTimeout(resumeTimer);
    if (!reducedMotion && slides.length > 1) {
      resumeTimer = setTimeout(startAutoplay, 8000);
    }
  };

  dots.forEach(dot => dot.addEventListener('click', () => {
    show(Number(dot.dataset.heroDot));
    pauseTemporarily();
  }));
  prev?.addEventListener('click', () => { show(current - 1); pauseTemporarily(); });
  next?.addEventListener('click', () => { show(current + 1); pauseTemporarily(); });

  hero.addEventListener('mouseenter', stopAutoplay);
  hero.addEventListener('mouseleave', startAutoplay);
  hero.addEventListener('focusin', stopAutoplay);
  hero.addEventListener('focusout', event => {
    if (!hero.contains(event.relatedTarget)) startAutoplay();
  });

  hero.addEventListener('touchstart', event => {
    touchStart = event.changedTouches[0]?.clientX ?? null;
    pauseTemporarily();
  }, { passive: true });
  hero.addEventListener('touchend', event => {
    if (touchStart === null) return;
    const end = event.changedTouches[0]?.clientX ?? touchStart;
    const delta = end - touchStart;
    if (Math.abs(delta) >= 45) show(current + (delta < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });

  show(0);
  startAutoplay();
}

function visibleHomeTrips() {
  return upcomingTrips();
}

function bindDiscoveryControls({ home = false } = {}) {
  app.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    if (home) renderHome();
    else updateList();
  }));

}

function renderHome() {
  const publishedTrips = upcomingTrips();
  const shownTrips = visibleHomeTrips();
  const specialTrips = publishedTrips.filter(isSpecialActive);
  const heroTrips = (specialTrips.length ? specialTrips : publishedTrips).filter(trip => trip.image).slice(0, specialTrips.length ? 5 : 3);
  const regularTrips = shownTrips.filter(trip => !isSpecialActive(trip));

  const upcomingSection = regularTrips.length ? `<section class="featured" aria-labelledby="featured-title">
      <div class="section-heading"><div><span class="section-kicker">DESTINOS PARA VOCÊ</span><h2 id="featured-title">Próximas viagens</h2></div><a href="#/viagens">Ver todas ${icon('arrowRight', 18)}</a></div>
      <div class="trip-grid home-trip-grid">${regularTrips.map(trip => tripCard(trip)).join('')}</div>
    </section>` : `<section class="featured"><div class="empty-state"><h2>Nenhuma viagem encontrada</h2><p>Troque o tipo de passeio para ver outras opções.</p></div></section>`;

  app.innerHTML = `${header()}<main class="wrap page home-page" id="main">
    ${heroMarkup(heroTrips)}
    ${upcomingSection}
    ${siteFooter()}
  </main>${bottomNav('home')}`;
  document.title = 'Janu Turismo | Próximas viagens';
  bindHero();
  bindDiscoveryControls({ home: true });
  bindImageSkeletons();
  refreshInventory();
}

function filteredTrips() {
  const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return upcomingTrips().filter(trip => {
    const text = `${trip.title} ${trip.subtitle} ${trip.category} ${trip.kind}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return tripMatchesFilter(trip) && text.includes(normalized);
  });
}

function updateList() {
  const grid = app.querySelector('#all-trips');
  if (!grid) return;
  const found = filteredTrips();
  grid.innerHTML = found.length ? found.map(tripCard).join('') : `<div class="empty-state"><h2>Nenhuma viagem encontrada</h2><p>Tente outra busca ou tipo de passeio.</p></div>`;
  app.querySelectorAll('[data-filter]').forEach(button => {
    button.classList.toggle('selected', button.dataset.filter === filter);
    button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
  });
  bindImageSkeletons(grid);
}

function renderTrips() {
  app.innerHTML = `${header()}<main class="wrap page trips-page" id="main">
    <div class="list-intro"><h1>Viagens <svg class="title-umbrella" viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path fill="currentColor" d="M2 12a10 10 0 0 1 20 0c-2-2-4-2-6 0-2-2-6-2-8 0-2-2-4-2-6 0Z"/><path d="M12 1v1m0 10v10a3 3 0 0 0 6 0"/></svg></h1></div>
    <label class="search-box">${icon('search', 23)}<span class="sr-only">Buscar destino</span><input id="search" type="search" autocomplete="off" placeholder="Buscar destino" aria-label="Buscar destino" /></label>
    <div class="trips-discovery">${filterChips()}</div>
    <div id="all-trips" class="trip-grid" aria-live="polite"></div>
    ${siteFooter({ compact: true })}
  </main>${bottomNav('trips')}`;
  app.querySelector('#search').value = query;
  app.querySelector('#search').addEventListener('input', event => { query = event.target.value; updateList(); });
  bindDiscoveryControls();
  bindFilterHint();
  updateList();
  document.title = 'Viagens | Janu Turismo';
  refreshInventory();
}

function optionPeopleCount(fare, quantity) {
  return Math.max(1, Number(fare?.seats || 1)) * Math.max(1, Number(quantity || 1));
}

function bookingTotal(fare, quantity) {
  const units = Math.max(1, Number(quantity || 1));
  const people = optionPeopleCount(fare, units);
  const amount = Number(fare?.amount || 0);
  return Number(fare?.seats || 1) > 1 ? amount * units : amount * people;
}

function daysUntilTrip(trip, today = new Date()) {
  const startDate = tripStartDate(trip);
  if (!startDate) return Number.POSITIVE_INFINITY;
  const start = new Date(`${startDate}T12:00:00`);
  const reference = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return Math.ceil((start - reference) / 86400000);
}

function configuredPixInstallments(trip, fare) {
  if (Array.isArray(trip.pixMax) && trip.pixMax.length) {
    const days = daysUntilTrip(trip);
    const rule = [...trip.pixMax]
      .sort((a, b) => b.daysMin - a.daysMin)
      .find(item => days >= item.daysMin);
    return Math.max(1, Number(rule?.maxInstallments || 1));
  }
  if (trip.pagamento?.pix) return Math.max(1, parcelasDisponiveis(trip, fare, new Date()));
  return null;
}

function paymentCalculatorMarkup(trip, fare, quantity) {
  const total = bookingTotal(fare, quantity);
  const parts = [];
  const pixMax = configuredPixInstallments(trip, fare);

  if (pixMax) {
    parts.push(`<div class="payment-calc-option"><strong>Pix</strong><span>${pixMax > 1 ? `em até ${pixMax}x de ${money(total / pixMax)}` : money(total)}</span></div>`);
  } else if ((trip.payment || []).some(method => /pix/i.test(method))) {
    parts.push('<div class="payment-calc-option"><strong>Pix</strong><span>Condições confirmadas pela Janu</span></div>');
  }

  const legacyCard = trip.pagamento?.cartao || {};
  const cardMax = Number(trip.cardMax ?? legacyCard.maxParcelas ?? 0);
  const rawSurcharge = trip.cardSurchargePercent ?? legacyCard.acrescimoPercentual;
  const surchargeKnown = rawSurcharge !== null && rawSurcharge !== undefined && rawSurcharge !== '' && Number.isFinite(Number(rawSurcharge));
  const hasCard = cardMax > 0 || trip.cardSurchargePercent != null || trip.pagamento?.cartao || (trip.payment || []).some(method => /cart[aã]o/i.test(method));

  if (hasCard) {
    if (surchargeKnown) {
      const surcharge = Number(rawSurcharge);
      const adjusted = total * (1 + surcharge / 100);
      parts.push(`<div class="payment-calc-option"><strong>Cartão</strong><span>${cardMax > 1 ? `até ${cardMax}x de ${money(adjusted / cardMax)} · ` : ''}${surcharge}% de acréscimo · total ${money(adjusted)}</span></div>`);
    } else {
      parts.push(`<div class="payment-calc-option"><strong>Cartão</strong><span>${cardMax > 1 ? `até ${cardMax}x · ` : ''}acréscimo a confirmar com a Janu</span></div>`);
    }
  }

  if (trip.paymentNote) {
    parts.push(`<p class="payment-note">${escapeHtml(trip.paymentNote)}</p>`);
  }

  return parts.length ? parts.join('') : '<div class="payment-calc-option"><strong>Pagamento</strong><span>Condições confirmadas pela Janu</span></div>';
}

function detailSections(trip) {
  const included = trip.incluso || (trip.includes || []).map(item => item[1]);
  const notIncluded = trip.naoIncluso || [];
  const route = trip.roteiro || (trip.stops || []).map(item => item[0]);

  return `<div class="detail-lead">${trip.blurb ? `<p>${escapeHtml(trip.blurb)}</p>` : ''}</div>
    <div class="package-grid">
      <section class="detail-section package-column"><h2>O que está incluso</h2>${included.length ? `<ul class="package-list package-list-included">${included.map(label => `<li>${icon('check', 19)}<span>${escapeHtml(label)}</span></li>`).join('')}</ul>` : '<p class="section-note">Itens inclusos não informados.</p>'}</section>
      <section class="detail-section package-column"><h2>Não incluso</h2>${notIncluded.length ? `<ul class="package-list package-list-not-included">${notIncluded.map(label => `<li>${icon('close', 18)}<span>${escapeHtml(label)}</span></li>`).join('')}</ul>` : '<p class="section-note">Não informado no anúncio.</p>'}</section>
    </div>
    ${route.length ? `<section class="detail-section"><h2>Roteiro do passeio</h2><ol class="stops-list">${route.map((name, index) => `<li><span class="stop-number">${String(index + 1).padStart(2, '0')}</span><span><strong>${escapeHtml(name)}</strong></span></li>`).join('')}</ol></section>` : ''}
    <section class="detail-section"><h2>Embarques</h2>${tripBoardingCities(trip).length ? `<div class="boarding-options">${tripBoardingCities(trip).map(place => `<span>${icon('pin', 17)} ${escapeHtml(place)}</span>`).join('')}</div>` : `<div class="pending-info">${icon('pin', 22)}<span>Cidades de embarque a confirmar com a agência.</span></div>`}</section>
    <section class="detail-section policy-summary" id="policy-summary"><span class="section-kicker">ANTES DE RESERVAR</span><h2>Resumo das políticas</h2><ul><li>Reserva efetivada mediante pagamento parcial no ato.</li><li>O restante deve ser quitado até 48h antes do passeio.</li><li>Pagamento por Pix ou cartão; não aceitamos dinheiro em espécie nem pagamento no momento do embarque.</li><li>Vagas são limitadas e a disponibilidade final é confirmada pela Janu.</li></ul><div class="policy-summary-links"><a href="#/politicas">Política de reservas</a><a href="#/politicas">Política de cancelamento</a></div></section>`;
}

function renderDetail(id) {
  const trip = TRIPS.find(item => item.id === id);
  if (!trip || !trip.published || isTripPast(trip)) { location.hash = '#/viagens'; return; }

  const fareOptions = fares(trip);
  const galleryImages = [...new Set([trip.image, ...(trip.images || [])].filter(Boolean))];
  const detailBoardingCities = tripBoardingCities(trip);
  const boardingField = detailBoardingCities.length
    ? `<select name="boarding" required><option value="">Escolha o embarque</option>${detailBoardingCities.map(place => `<option value="${escapeHtml(place)}">${escapeHtml(place)}</option>`).join('')}</select>`
    : '<input name="boarding" maxlength="80" placeholder="Cidade de embarque" required />';

  app.innerHTML = `<header class="detail-header wrap"><a href="#/viagens" aria-label="Voltar às viagens">${icon('arrowLeft', 26)}</a><span>Detalhes da viagem</span><button type="button" id="share" aria-label="Compartilhar viagem">${icon('share', 25)}</button></header>
    <main class="wrap detail-page detail-page-whatsapp" id="main">
      <div class="detail-hero">${photoCarouselMarkup(galleryImages, trip.title)}<div class="detail-hero-shade"></div><div class="detail-hero-text"><span>${escapeHtml(trip.kind)}</span><h1>${escapeHtml(trip.title)}</h1><p>${icon('calendar', 19)} ${escapeHtml(trip.date)}${trip.duracao ? ` · ${escapeHtml(trip.duracao)}` : ''}</p></div>${explorePhotosMarkup()}</div>
      <div class="detail-body">
        <div class="availability-panel">${icon('ticket', 22)}<div><strong data-seats="${trip.id}">${seatsText(trip.id)}</strong><small data-reservation-count="${trip.id}">Quantidade de reservas a confirmar</small></div></div>
        <div class="low-stock-warning" data-low-stock-warning="${trip.id}" hidden></div>
        ${minimumProgressMarkup(trip)}

        <section class="booking-config-section" aria-labelledby="booking-config-title">
          <div class="booking-config-heading"><span class="section-kicker">MONTE SUA RESERVA</span><h2 id="booking-config-title">🎟️ Escolha sua opção</h2><p>Preencha seus dados e finalize. A reserva ficará salva na sua conta e no painel da Janu.</p></div>
          <form id="trip-booking-config">
            <label>Opção de preço<select name="fare" required>${fareOptions.map((fare, index) => `<option value="${index}">${escapeHtml(fare.label)} · ${money(fare.amount)}${fare.seats > 1 ? ` · ${fare.seats} pessoas` : ''}</option>`).join('')}</select></label>
            <div class="booking-config-grid">
              <label>Quantidade<input name="quantity" type="number" min="1" max="10" value="1" inputmode="numeric" required /></label>
              <label>Embarque${boardingField}</label>
            </div>
            <p class="people-count" data-people-count></p>
            ${trip.regraCrianca ? `<div class="child-rule">${icon('user', 20)}<div><strong>👶 Regra para crianças</strong><span>${escapeHtml(trip.regraCrianca)}</span></div></div>` : ''}
            <div class="booking-rule-note"><strong>📌 Regra da reserva</strong><span>Ao finalizar, seu pedido fica salvo como <b>Pendente</b>. A Janu confirma a disponibilidade e orienta o pagamento pelo WhatsApp.</span></div>
            <div class="booking-form-title">👤 Seus dados</div>
            <div class="booking-config-grid booking-person-grid">
              <label>Nome<input name="firstName" type="text" minlength="2" maxlength="60" autocomplete="given-name" required /></label>
              <label>Sobrenome<input name="lastName" type="text" minlength="2" maxlength="80" autocomplete="family-name" required /></label>
            </div>
            <div class="booking-config-grid booking-person-grid">
              <label>CPF<input name="cpf" type="text" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" required /></label>
              <label>Telefone<input name="phone" type="tel" inputmode="tel" maxlength="16" placeholder="(88) 99999-9999" required /></label>
            </div>
            <div class="booking-total-card"><div class="booking-total-heading"><span>${icon('money', 18)} Valor total</span><strong data-config-total>${money(fareOptions[0]?.amount || 0)}</strong></div><small>O valor considera a opção e a quantidade escolhidas.</small></div>
            <div class="payment-calculator"><h3>💳 Formas de pagamento</h3><div data-payment-calculator></div><label class="payment-choice">Como pretende pagar?<select name="payment" required><option value="pix">Pix</option><option value="cartao">Cartão</option></select></label></div>
            <p class="form-error booking-form-error" role="alert" hidden></p>
            <a class="waitlist-cta" data-waitlist hidden href="${waLink(`Olá! Quero entrar na lista de espera do passeio ${trip.title} (${trip.date}). Podem me avisar se surgir vaga?`)}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 21)} Entrar na lista de espera</a>
          </form>
        </section>

        ${detailSections(trip)}
      </div>
      
    </main>
    <div class="booking-bar whatsapp-booking-bar"><div class="booking-inner"><div><small>Total</small><strong data-booking-total>${money(fareOptions[0]?.amount || 0)}</strong><span data-booking-people></span></div><button type="submit" form="trip-booking-config" id="whatsapp-reserve" data-trip="${trip.id}">${icon('ticket', 23)}<span>Reservar</span></button></div></div>`;

  app.querySelector('#share').addEventListener('click', () => shareTrip(trip));
  disposeDetailPhotos = initPhotoGallery(app.querySelector('.detail-hero'), galleryImages, trip.title);

  const form = app.querySelector('#trip-booking-config');
  const fareSelect = form.querySelector('[name="fare"]');
  const quantityInput = form.querySelector('[name="quantity"]');
  const totalInside = form.querySelector('[data-config-total]');
  const totalBar = app.querySelector('[data-booking-total]');
  const peopleInside = form.querySelector('[data-people-count]');
  const peopleBar = app.querySelector('[data-booking-people]');
  const paymentBox = form.querySelector('[data-payment-calculator]');

  const updateBookingSummary = () => {
    const fare = fareOptions[Number(fareSelect.value)] || fareOptions[0];
    const quantity = Math.max(1, Number(quantityInput.value || 1));
    const people = optionPeopleCount(fare, quantity);
    const total = bookingTotal(fare, quantity);
    const peopleText = `${people} ${people === 1 ? 'pessoa' : 'pessoas'}`;
    totalInside.textContent = money(total);
    totalBar.textContent = money(total);
    peopleInside.textContent = `${quantity} ${quantity === 1 ? 'opção' : 'opções'} · ${peopleText}`;
    peopleBar.textContent = peopleText;
    paymentBox.innerHTML = paymentCalculatorMarkup(trip, fare, quantity);

    if (fare.boardingCity) {
      const boarding = form.querySelector('[name="boarding"]');
      if (boarding?.tagName === 'SELECT') boarding.value = fare.boardingCity;
    }
  };

  fareSelect.addEventListener('change', updateBookingSummary);
  quantityInput.addEventListener('input', updateBookingSummary);
  updateBookingSummary();
  let submitting = false;
  let authOpen = false;
  let operationId;
  const userName = currentUser()?.displayName?.trim().split(/\s+/) || [];
  if (userName.length > 1) { form.elements.firstName.value = userName.shift(); form.elements.lastName.value = userName.join(' '); }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || authOpen || tripAvailability(trip.id).soldOut) return;
    if (!form.reportValidity()) return;

    await authReady;
    if (submitting || authOpen || !form.isConnected) return;
    if (!currentUser()) {
      authOpen = true;
      openBookingAuth(() => { if (form.isConnected) form.requestSubmit(); }, () => { authOpen = false; });
      return;
    }

    const fare = fareOptions[Number(fareSelect.value)] || fareOptions[0];
    const quantity = Math.max(1, Number(quantityInput.value || 1));
    const people = optionPeopleCount(fare, quantity);
    const data = new FormData(form);
    const cpf = String(data.get('cpf') || '');
    const warning = form.querySelector('.booking-form-error');

    if (!validCpfClient(cpf)) {
      warning.textContent = 'Confira o CPF informado.';
      warning.hidden = false;
      form.elements.cpf.focus();
      return;
    }

    const button = app.querySelector('#whatsapp-reserve');
    submitting = true;
    button.disabled = true;
    button.dataset.saving = 'true';
    button.setAttribute('aria-busy', 'true');
    button.querySelector('span').textContent = 'Salvando…';
    warning.hidden = true;
    const pendingKey = `janu-pending-booking:${currentUser().uid}:${trip.id}`;
    try { operationId ||= sessionStorage.getItem(pendingKey); } catch {}
    operationId ||= bookingId();
    try { sessionStorage.setItem(pendingKey, operationId); } catch {}

    try {
      const { booking } = await createBooking({
        id: operationId,
        fareIndex: Number(fareSelect.value), quantity,
        expectedUnitPriceCents: Math.round(fare.amount * 100), expectedFareSeats: Number(fare.seats || 1),
        tripId: trip.id,
        firstName: String(data.get('firstName') || '').trim(),
        lastName: String(data.get('lastName') || '').trim(),
        cpf,
        phone: String(data.get('phone') || ''),
        seats: people,
        payment: String(data.get('payment') || 'pix'),
        boarding: String(data.get('boarding') || '').trim(),
        fareLabel: fare.label,
      });

      try { sessionStorage.removeItem(pendingKey); } catch {}
      if (!form.isConnected) return;
      lastBooking = { booking, token: booking.id };
      showToast('Reserva salva na sua conta.');
      location.hash = `#/reserva/${booking.id}`;
    } catch (error) {
      if (!form.isConnected) return;
      warning.textContent = error.message;
      warning.hidden = false;
      warning.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      submitting = false;
      button.dataset.saving = 'false';
      button.removeAttribute('aria-busy');
      updateAvailabilityUI();
    }
  });

  document.title = `${trip.title} | Janu Turismo`;
  refreshInventory();
}
function validCpfClient(value) {
  const cpf = String(value).replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  return [9, 10].every(length => {
    const sum = [...cpf.slice(0, length)].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const check = sum * 10 % 11;
    return Number(cpf[length]) === (check === 10 ? 0 : check);
  });
}

async function shareTrip(trip) {
  const url = `${location.origin}${location.pathname}#/viagem/${encodeURIComponent(trip.id)}`;
  const text = `${trip.title} · ${trip.date} · a partir de ${money(trip.price)}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: `${trip.title} | Janu Turismo`, text, url });
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      showToast('Informações da viagem copiadas');
    }
  } catch (error) {
    if (error.name !== 'AbortError') showToast('Não foi possível compartilhar a viagem');
  }
}

function closeSideMenu() {
  const menu = document.querySelector('[data-side-menu]');
  const backdrop = document.querySelector('[data-menu-backdrop]');
  if (menu) {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
  }
  if (backdrop) backdrop.hidden = true;
  document.body.classList.remove('menu-open');
}

function openSideMenu() {
  const menu = document.querySelector('[data-side-menu]');
  const backdrop = document.querySelector('[data-menu-backdrop]');
  if (!menu || !backdrop) return;
  menu.classList.add('is-open');
  menu.setAttribute('aria-hidden', 'false');
  backdrop.hidden = false;
  document.body.classList.add('menu-open');
}

function closeInfoScreen() {
  const screen = document.querySelector('[data-info-screen]');
  if (!screen) return;
  screen.hidden = true;
  screen.innerHTML = '';
  document.body.classList.remove('info-open');
}

function openInfoScreen(type) {
  closeSideMenu();
  const screen = document.querySelector('[data-info-screen]');
  if (!screen) return;

  if (type === 'depoimentos') {
    screen.innerHTML = `<div class="info-screen-shell">
      <div class="info-screen-head"><div><span>JANU TURISMO</span><h2>💬 Depoimentos</h2></div><button type="button" data-info-close aria-label="Fechar">${icon('close', 25)}</button></div>
      <div class="info-screen-body feedback-panel-screen">
        <div class="feedback-toolbar"><button type="button" data-feedback-zoom aria-pressed="false">Ampliar para ler</button><span>Toque na imagem para ampliar.</span></div>
        <div class="feedback-panel-frame"><button type="button" class="feedback-panel-image" aria-label="Ampliar painel de depoimentos"><img src="./assets/depoimentos-painel.jpg" width="888" height="1536" alt="Feedbacks dos viajantes da Janu Turismo: fotos e relatos de Beach Park, Praia das Fontes, passeios em grupo, passeios de barco, Canoa Quebrada, Guaramiranga e Mundaú." /></button></div>
      </div>
    </div>`;
  } else if (type === 'politicas') {
    screen.innerHTML = `<div class="info-screen-shell">
      <div class="info-screen-head"><div><span>ANTES DE RESERVAR</span><h2>📋 Políticas</h2></div><button type="button" data-info-close aria-label="Fechar">${icon('close', 25)}</button></div>
      <div class="info-screen-body info-text-screen">
        <section><h3>🧾 Reservas e pagamento</h3><p>A reserva é efetivada mediante pagamento parcial no ato. O restante deve ser quitado até 48 horas antes do passeio. Pagamento por Pix ou cartão. Não aceitamos dinheiro em espécie nem pagamento no embarque. As vagas são limitadas.</p></section>
        <section><h3>↩️ Cancelamento pelo cliente</h3><p>Até 7 dias antes: reembolso de 50% do valor pago, descontados custos operacionais e despesas não recuperáveis. Até 48 horas antes: multa de 20% do valor total e nova data conforme disponibilidade. Por doença, com aviso de 48 horas e atestado: nova data ou reembolso conforme análise. Com 24 horas de antecedência ou em caso de não comparecimento: não reembolsável.</p><div class="info-warning"><strong>[CONFIRMAR]</strong> As regras de 7 dias e 48 horas se sobrepõem e ainda precisam ter o intervalo exato definido pela Janu.</div></section>
        <section><h3>🚌 Cancelamento pela Janu</h3><p>Em caso de adiamento ou de o mínimo de reservas não ser atingido: remarcação, crédito válido por 6 meses ou reembolso integral, em até 30 dias úteis. Despesas antecipadas comprovadas podem ser descontadas. No cartão, considera-se o valor efetivamente recebido, sem as taxas da operadora.</p></section>
      </div>
    </div>`;
  } else if (type === 'pagamento') {
    screen.innerHTML = `<div class="info-screen-shell">
      <div class="info-screen-head"><div><span>RESERVA</span><h2>💳 Formas de pagamento</h2></div><button type="button" data-info-close aria-label="Fechar">${icon('close', 25)}</button></div>
      <div class="info-screen-body info-text-screen">
        <section class="payment-info-card"><h3>💠 Pix</h3><p>As condições e o número de parcelas são mostrados na página de cada viagem.</p></section>
        <section class="payment-info-card"><h3>💳 Cartão</h3><p>Parcelamento e eventual acréscimo variam conforme o passeio e aparecem antes da reserva.</p></section>
        <section><p>Não aceitamos dinheiro em espécie nem pagamento no momento do embarque.</p></section>
      </div>
    </div>`;
  } else { return; }

  const zoomButton = screen.querySelector('[data-feedback-zoom]');
  const imageButton = screen.querySelector('.feedback-panel-image');
  const toggleZoom = () => {
    const enlarged = screen.classList.toggle('feedback-enlarged');
    zoomButton.setAttribute('aria-pressed', String(enlarged));
    zoomButton.textContent = enlarged ? 'Ver imagem inteira' : 'Ampliar para ler';
    imageButton.setAttribute('aria-label', enlarged ? 'Ver painel de depoimentos inteiro' : 'Ampliar painel de depoimentos');
  };
  zoomButton?.addEventListener('click', toggleZoom);
  imageButton?.addEventListener('click', toggleZoom);
  screen.classList.remove('feedback-enlarged');
  screen.scrollTop = 0;
  screen.hidden = false;
  document.body.classList.add('info-open');
  screen.querySelector('[data-info-close]')?.addEventListener('click', closeInfoScreen);
}

function bindHeaderMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const close = document.querySelector('[data-menu-close]');
  const backdrop = document.querySelector('[data-menu-backdrop]');
  toggle?.addEventListener('click', openSideMenu);
  close?.addEventListener('click', closeSideMenu);
  backdrop?.addEventListener('click', closeSideMenu);
  document.querySelectorAll('[data-info-open]').forEach(button => {
    button.addEventListener('click', () => openInfoScreen(button.dataset.infoOpen));
  });
}

function openBookingAuth(onSuccess, onClose = () => {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'booking-auth-dialog';
  dialog.innerHTML = `<button class="auth-close" type="button" aria-label="Fechar">${icon('close', 23)}</button>${authPanel('Entre para salvar sua reserva')}`;
  document.body.appendChild(dialog);
  dialog.querySelector('.auth-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { dialog.remove(); onClose(); }, { once: true });
  bindAuth(dialog, () => {
    dialog.close();
    onClose();
    onSuccess();
  });
  dialog.showModal();
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function renderPolicies() {
  app.innerHTML = `${header()}<main class="wrap page policies-route" id="main">
    <div class="policies-intro"><span class="section-kicker">INFORMAÇÕES IMPORTANTES</span><h1>Políticas da Janu Turismo</h1><p>Leia as condições de reserva, cancelamento e privacidade antes de concluir sua viagem.</p></div>

    <nav class="policies-nav" aria-label="Seções das políticas">
      <button type="button" data-policy-target="policy-reservas">Reservas e pagamento</button>
      <button type="button" data-policy-target="policy-cancelamento">Cancelamento</button>
      <button type="button" data-policy-target="policy-privacidade">Privacidade</button>
    </nav>

    <section class="policy-route-card" id="policy-reservas">
      <h2>Reservas e pagamento</h2>
      <ul>
        <li>A reserva é efetivada mediante pagamento parcial no ato.</li>
        <li>O restante deve ser quitado até 48 horas antes do passeio.</li>
        <li>As formas de pagamento aceitas são Pix ou cartão.</li>
        <li>Não aceitamos dinheiro em espécie.</li>
        <li>Não aceitamos pagamento no momento do embarque.</li>
        <li>As vagas são limitadas e dependem de disponibilidade.</li>
      </ul>
    </section>

    <section class="policy-route-card" id="policy-cancelamento">
      <h2>Cancelamento</h2>
      <h3>Pedido do cliente</h3>
      <ul>
        <li>Até 7 dias antes: reembolso de 50% do valor pago, descontados custos operacionais e despesas não recuperáveis.</li>
        <li>Até 48 horas antes: multa de 20% do valor total e possibilidade de nova data, conforme disponibilidade.</li>
        <li>Por doença, com aviso prévio de 48 horas e atestado médico: possibilidade de nova data ou reembolso, conforme análise.</li>
        <li>24 horas antes ou em caso de não comparecimento: não reembolsável.</li>
      </ul>
      <div class="policy-route-warning"><strong>[CONFIRMAR]</strong> As regras de “até 7 dias” e “até 48 horas” se sobrepõem. <!-- TODO: confirmar com a Janu Turismo o intervalo exato de aplicação de cada regra. --> Até essa definição, a Janu deve confirmar qual condição se aplica ao caso.</div>

      <h3>Iniciativa da Janu Turismo</h3>
      <ul>
        <li>Em caso de adiamento ou de o mínimo de reservas não ser atingido: remarcação, crédito válido por 6 meses ou reembolso integral.</li>
        <li>O reembolso pode ocorrer em até 30 dias úteis.</li>
        <li>Despesas antecipadas comprovadas podem ser descontadas quando aplicável.</li>
        <li>No cartão, considera-se o valor efetivamente recebido pela Janu Turismo, sem as taxas cobradas pela operadora.</li>
      </ul>
    </section>

    <section class="policy-route-card" id="policy-privacidade">
      <h2>Privacidade e proteção de dados</h2>
      <p>A Janu Turismo coleta apenas os dados necessários para identificação, contato, organização da viagem e gestão das reservas.</p>
      <h3>Dados que podem ser coletados</h3>
      <ul>
        <li>Nome e sobrenome.</li>
        <li>E-mail.</li>
        <li>Telefone.</li>
        <li>CPF, quando necessário para a reserva.</li>
        <li>Viagem escolhida, quantidade de passageiros, embarque e forma de pagamento.</li>
      </ul>
      <h3>Para que os dados são usados</h3>
      <ul>
        <li>Registrar e localizar reservas.</li>
        <li>Entrar em contato sobre a viagem, pagamento, embarque ou alterações do passeio.</li>
        <li>Organizar a lista de passageiros e o atendimento da agência.</li>
      </ul>
      <p>Para solicitar correção ou exclusão de dados pessoais, entre em contato com a Janu Turismo pelo WhatsApp <a href="${waLink('Olá, Janu Turismo! Gostaria de solicitar correção ou exclusão dos meus dados pessoais.')}" target="_blank" rel="noopener noreferrer">(88) 98873-7924</a>.</p>
    </section>

    
  </main>${bottomNav('contact')}`;
  app.querySelectorAll('[data-policy-target]').forEach(button => {
    button.addEventListener('click', () => {
      app.querySelector(`#${button.dataset.policyTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  document.title = 'Políticas | Janu Turismo';
}

function renderContact() {
  const greeting = waLink('Olá, Janu Turismo! Vim pelo site e gostaria de saber mais sobre as próximas viagens.');
  app.innerHTML = `${header()}<main class="wrap page contact-page" id="main">
    <div class="contact-panel"><span class="section-kicker">ATENDIMENTO OFICIAL</span><h1>Fale com a Janu</h1><p>Tem dúvidas sobre viagens ou reservas? Nossa equipe pode ajudar.</p></div>
    <div class="contact-channels">
      <a class="contact-channel contact-whatsapp" href="${greeting}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 25)}<span><strong>WhatsApp</strong><small>Converse com nossa equipe</small></span>${icon('arrowUpRight', 19)}</a>
      <a class="contact-channel contact-instagram" href="${AGENCY_INFO.instagram}" target="_blank" rel="noopener noreferrer">${icon('instagram', 25)}<span><strong>Instagram</strong><small>${AGENCY_INFO.instagramHandle}</small></span>${icon('arrowUpRight', 19)}</a>
    </div><a class="back-to-trips" href="#/viagens">Ver próximas viagens ${icon('arrowRight', 18)}</a>
  </main>${bottomNav('contact')}`;
  document.title = 'Contato | Janu Turismo';
}

function paymentLabel(value) { return value === 'pix' ? 'Pix' : value === 'cartao' ? 'Cartão' : 'A combinar'; }
function statusLabel(value) { return value === 'confirmed' ? 'Confirmada' : value === 'cancelled' ? 'Cancelada' : 'Aguardando confirmação'; }
function paymentStatusLabel(value) { return value === 'confirmed' ? 'Pago' : value === 'cancelled' ? 'Cancelado' : 'Pendente'; }

function bookingContent(booking, token, demo = false) {
  const trip = TRIPS.find(item => item.id === booking.tripId);
  const title = booking.tripTitle || trip?.title || 'Viagem';
  const date = booking.tripDate || trip?.date || 'A confirmar';
  const name = `${booking.firstName} ${booking.lastName}`;
  const total = Number.isInteger(booking.totalCents) ? money(booking.totalCents / 100) : null;
  const confirmed = booking.status === 'confirmed', cancelled = booking.status === 'cancelled';
  const heading = confirmed ? 'Reserva confirmada' : cancelled ? 'Reserva cancelada' : 'Reserva recebida';
  const description = confirmed ? 'A Janu confirmou seu pagamento e a disponibilidade. Sua reserva está garantida.'
    : cancelled ? 'Esta reserva foi cancelada. Para verificar uma nova data ou esclarecer dúvidas, fale com a Janu.'
    : booking.seatsHeld ? 'Sua reserva está salva e os lugares foram separados. Fale com a Janu para combinar o pagamento e concluir a confirmação.'
    : 'Sua reserva já está salva na sua conta. Agora, fale com a Janu para confirmar a disponibilidade e combinar o pagamento.';
  const message = `Olá, Janu Turismo! Gostaria de ${cancelled ? 'falar sobre' : confirmed ? 'verificar os detalhes da' : 'dar continuidade à'} minha reserva.\n\nViagem: ${title}\nData: ${date}\nResponsável: ${name}\nPassageiros: ${booking.seats}\nOpção: ${booking.fareLabel || 'A combinar'}\nEmbarque: ${booking.boarding || 'A combinar'}${total ? `\nValor do pacote: ${total}` : ''}\nPagamento escolhido: ${paymentLabel(booking.payment)}\nStatus: ${statusLabel(booking.status)}${!cancelled && !confirmed ? '\n\nPodem confirmar a disponibilidade e me orientar sobre o pagamento?' : ''}`;
  return `<div class="confirmation-card booking-state-${escapeHtml(booking.status)} ${demo ? 'preview-card' : ''}">
    <span class="confirmation-icon">${icon(cancelled ? 'close' : 'check', 30)}</span>
    <span class="section-kicker">${demo ? 'EXEMPLO DE RESERVA' : 'JANU TURISMO'}</span>
    <h1>${demo ? 'Veja como ficará sua reserva' : heading}</h1>
    <p>${demo ? 'Esta é uma visualização. Nenhuma vaga foi reservada.' : description}</p>
    <p class="booking-status" role="status">${icon('calendar', 18)} ${demo ? 'Demonstração' : statusLabel(booking.status)}</p>
    <div class="booking-summary">
      <div><span>Destino</span><strong>${escapeHtml(title)}</strong></div>
      <div><span>Data</span><strong>${escapeHtml(date)}</strong></div>
      <div><span>Responsável</span><strong>${escapeHtml(name)}</strong></div>
      <div><span>Passageiros</span><strong>${booking.seats}</strong></div>
      <div><span>Telefone</span><strong>${escapeHtml(booking.phone)}</strong></div>
      <div><span>CPF</span><strong>***.***.***-${escapeHtml(booking.cpfLast4)}</strong></div>
      <div><span>Opção escolhida</span><strong>${escapeHtml(booking.fareLabel || 'A combinar')}${booking.quantity ? ` · ${booking.quantity} ${booking.quantity === 1 ? 'unidade' : 'unidades'}` : ''}</strong></div>
      <div><span>Embarque</span><strong>${escapeHtml(booking.boarding || 'A combinar')}</strong></div>
    </div>
    ${total ? `<section class="reservation-payment-card booking-payment-${escapeHtml(booking.status)}">
      <div class="reservation-payment-head"><span>Pagamento</span><strong class="payment-state-badge ${confirmed ? 'is-paid' : cancelled ? 'is-cancelled' : 'is-pending'}">${paymentStatusLabel(booking.status)}</strong></div>
      <div class="reservation-payment-row"><span>Valor do pacote</span><strong>${total}</strong></div>
      <div class="reservation-payment-row"><span>Forma de pagamento</span><strong>${paymentLabel(booking.payment)}</strong></div>
      ${booking.payment === 'cartao' ? '<small class="reservation-payment-note">Eventuais acréscimos do cartão são confirmados pela Janu.</small>' : ''}
      <p>${confirmed ? 'Pagamento confirmado pela Janu Turismo. Sua reserva está paga.' : cancelled ? 'Esta reserva foi cancelada. Entre em contato com a Janu se precisar de ajuda.' : 'Para seguir com seu pagamento, entre em contato com a Janu pelo WhatsApp.'}</p>
    </section>` : ''}
    ${!demo ? `<a class="contact-button full-button payment-whatsapp-button" href="${waLink(message)}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 23)} ${cancelled || confirmed ? 'Falar com a Janu' : 'Continuar pagamento no WhatsApp'} ${icon('arrowUpRight', 18)}</a><button class="copy-link" id="copy-booking" type="button">${icon('copy', 18)} Copiar link da reserva</button>` : ''}
    <a class="text-link" href="#/reservas">Ver minhas reservas ${icon('arrowRight', 18)}</a>
  </div>`;
}

function renderBookingShell() {
  app.innerHTML = `${header()}<main class="wrap page booking-page" id="main"><div id="booking-view" class="booking-container"><p class="loading-state">Carregando reserva…</p></div></main>${bottomNav('bookings')}`;
}

async function renderConfirmation(token, demo = false) {
  renderBookingShell();
  const view = app.querySelector('#booking-view');
  if (demo) {
    if (!lastBooking?.demo) { location.hash = '#/viagens'; return; }
    view.innerHTML = bookingContent(lastBooking.booking, null, true);
    return;
  }
  if (!/^JT-[A-F0-9]{10}$/.test(token)) { view.innerHTML = '<p class="empty-state">Link de reserva inválido.</p>'; return; }
  await authReady;
  if (!currentUser()) {
    view.innerHTML = authPanel('Entre para ver sua reserva');
    bindAuth(view, render);
    return;
  }
  const showBooking = booking => {
    if (!view.isConnected) return;
    view.innerHTML = bookingContent(booking, token);
    view.querySelector('#copy-booking').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(location.href); showToast('Link copiado'); }
      catch { showToast('Não foi possível copiar o link'); }
    });
  };
  const showError = error => {
    if (!view.isConnected) return;
    view.innerHTML = `<div class="empty-state"><h2>Não conseguimos abrir a reserva</h2><p>${escapeHtml(error.message)}</p><button type="button" id="retry-reservation">Tentar novamente</button><a href="#/reservas">Minhas reservas</a></div>`;
    view.querySelector('#retry-reservation').onclick = () => render();
  };
  if (!view.isConnected) return;
  try { disposeBookings = watchBooking(token, showBooking, showError); }
  catch (error) { showError(error); }
  document.title = 'Minha reserva | Janu Turismo';
}

async function renderMyReservations() {
  app.innerHTML = `${header()}<main class="wrap page booking-page" id="main"><div class="bookings-intro"><span class="section-kicker">SUAS VIAGENS</span><h1>Minhas reservas</h1><p>Entre na sua conta para acompanhar suas reservas em qualquer aparelho.</p></div><div id="bookings-list" class="bookings-list"></div><a class="inline-contact" href="${waLink('Olá, Janu Turismo! Tenho uma dúvida sobre minha reserva.')}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 22)} Qualquer dúvida? Entrar em contato</a></main>${bottomNav('bookings')}`;
  document.title = 'Minhas reservas | Janu Turismo';
  const list = app.querySelector('#bookings-list');
  await authReady;
  if (!list.isConnected) return;
  if (!currentUser()) {
    list.closest('main').classList.add('profile-page', 'reservations-login-page');
    list.innerHTML = authPanel('Acesse suas reservas');
    bindAuth(list, render);
    return;
  }
  const access = await adminAccess().catch(() => null);
  if (!list.isConnected) return;
  if (access?.owner && !access.primary) {
    renderAdmin({ reservationsTab: true });
    return;
  }
  list.innerHTML = `<p class="signed-account">Conta: ${escapeHtml(accountLabel(currentUser()))} <button id="sign-out" type="button">Sair</button></p>`;
  list.querySelector('#sign-out').addEventListener('click', async () => { await logout(); render(); });
  const resultsHolder = document.createElement('div');
  list.append(resultsHolder);
  resultsHolder.innerHTML = '<p class="loading-state">Carregando suas reservas…</p>';
  list.closest('main').querySelector('.bookings-intro > p').textContent = 'Suas reservas e confirmações, sempre à mão.';
  const showBookings = bookings => {
    if (!resultsHolder.isConnected) return;
    resultsHolder.innerHTML = bookings.length ? bookings.map(booking => `<a class="my-booking-card booking-state-${escapeHtml(booking.status)}" href="#/reserva/${booking.id}"><img src="${TRIPS.find(trip => trip.id === booking.tripId)?.image || './assets/logo-janu.webp'}" alt="" /><span><small>Pagamento ${escapeHtml(paymentStatusLabel(booking.status).toLowerCase())}</small><strong>${escapeHtml(booking.tripTitle || tripName(booking.tripId))}</strong><em>${escapeHtml(booking.tripDate || '')} · ${booking.seats} ${booking.seats === 1 ? 'passageiro' : 'passageiros'}</em>${Number.isInteger(booking.totalCents) ? `<b class="my-booking-total">${money(booking.totalCents / 100)}</b>` : ''}</span>${icon('arrowRight', 20)}</a>`).join('') : `<div class="empty-reservations">${icon('ticket', 38)}<h2>Nenhuma reserva por aqui</h2><p>Escolha um destino e faça sua primeira reserva.</p><a href="#/viagens">Explorar viagens ${icon('arrowRight', 18)}</a></div>`;
  };
  const showError = error => {
    if (!resultsHolder.isConnected) return;
    resultsHolder.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p><button type="button" id="retry-bookings">Tentar novamente</button>`;
    resultsHolder.querySelector('#retry-bookings').onclick = () => render();
  };
  try { disposeBookings = watchMyBookings(showBookings, showError); } catch (error) { showError(error); }

}

async function adminFetch(method = 'GET', body) {
  if (method === 'GET') return adminGet(TRIPS.map(trip => trip.id));
  if (method === 'PUT') return adminSetCapacity(body);
  return adminSetStatus(body);
}

function renderProfile() {
  app.innerHTML = `${header()}<main class="wrap page booking-page profile-page" id="main"><div class="bookings-intro"><span class="section-kicker">SUA CONTA</span><h1>Meu perfil</h1></div><div id="profile-content"></div></main>${bottomNav('')}`;
  document.title = 'Meu perfil | Janu Turismo';
  const holder = app.querySelector('#profile-content');
  authReady.then(async () => {
    if (!holder.isConnected) return;
    if (!currentUser()) {
      holder.innerHTML = authPanel('Entre ou crie sua conta');
      bindAuth(holder, async () => {
        try {
          const access = await adminAccess();
          if (!holder.isConnected) return;
          if (access.owner && !access.primary) { location.hash = '#/reservas'; return; }
          await adminFetch();
          if (holder.isConnected) location.hash = '#/gestao';
        }
        catch { if (holder.isConnected) renderProfile(); }
      });
      return;
    }
    const access = await adminAccess().catch(() => null);
    if (!holder.isConnected) return;
    const ownerOnly = access?.owner && !access.primary;
    if (access && !ownerOnly) {
      try { await adminFetch(); if (holder.isConnected) location.hash = '#/gestao'; return; } catch { /* conta sem acesso à gestão */ }
    }
    if (!holder.isConnected) return;
    holder.innerHTML = `<div class="profile-card">${icon('user', 34)}<h2>${escapeHtml(currentUser().displayName || accountLabel(currentUser()))}</h2><p>${escapeHtml(accountLabel(currentUser()))}</p><a href="#/reservas">${ownerOnly ? 'Controle de reservas' : 'Minhas reservas'} ${icon('arrowRight', 18)}</a><div id="agency-link"></div><button id="profile-logout" type="button">Sair da conta</button></div>`;
    holder.querySelector('#profile-logout').addEventListener('click', async () => { await logout(); render(); });
  });
}

const lines = value => String(value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
function pixRulesToText(trip) {
  if (!Array.isArray(trip?.pixMax)) return '';
  return trip.pixMax
    .slice()
    .sort((a, b) => b.daysMin - a.daysMin)
    .map(rule => `${rule.daysMin}=${rule.maxInstallments}`)
    .join('\n');
}
function parsePixRules(value) {
  const rows = lines(value);
  if (!rows.length) return [];
  return rows.map(row => {
    const match = row.match(/^(\d{1,3})\s*[=:]\s*(\d{1,2})$/);
    if (!match) throw new Error('Faixa Pix inválida. Use o formato 60=5, uma regra por linha.');
    return { daysMin: Number(match[1]), maxInstallments: Number(match[2]) };
  }).sort((a, b) => b.daysMin - a.daysMin);
}
function fareRow(fare = { label: '', amount: '', seats: 1 }) {
  return `<div class="fare-row" data-fare-row><input name="fareLabel" aria-label="Nome da opção" placeholder="Individual, casal, criança" maxlength="80" value="${escapeHtml(fare.label)}" required /><input name="fareAmount" aria-label="Valor em reais" type="number" min="0" step="0.01" placeholder="Valor R$" value="${fare.amount}" required /><input name="fareSeats" aria-label="Pessoas na opção" type="number" min="1" max="10" value="${fare.seats || 1}" required /><input name="fareCity" aria-label="Embarque desta opção" placeholder="Cidade opcional" maxlength="80" value="${escapeHtml(fare.boardingCity || '')}" /><button type="button" data-remove-fare aria-label="Remover opção">×</button></div>`;
}
function tripEditor(trip = null) {
  const editing = Boolean(trip);
  const t = trip || { title: '', subtitle: '', category: 'Praia', kind: 'Bate e volta', date: '', startDate: '', endDate: '', price: 0, boarding: [], includes: [], stops: [], payment: ['Pix', 'Cartão'], images: [], published: false, special: false, specialUntil: '', status: 'aberto', minToConfirm: '', dateTbc: false };
  return `<form id="trip-editor" class="admin-editor"><h2>${editing ? 'Editar viagem' : 'Adicionar viagem'}</h2><p>Preencha os dados que se aplicam a este passeio. Horários e itens opcionais podem ficar vazios.</p>
    <div class="form-grid"><label>Destino / nome<input name="title" value="${escapeHtml(t.title)}" maxlength="100" required /></label><label>Chamada curta<input name="subtitle" value="${escapeHtml(t.subtitle || '')}" maxlength="100" placeholder="Ex.: Natal de Luz" /></label></div>
    <div class="form-grid"><label>Tipo<select name="kind">${['Bate e volta', 'Viagem com hospedagem', 'Passeio', 'Excursão'].map(kind => `<option ${kind === t.kind ? 'selected' : ''}>${kind}</option>`).join('')}</select></label><label>Categoria<input name="category" value="${escapeHtml(t.category || 'Praia')}" maxlength="40" placeholder="Praia, Serra, Parque..." required /></label></div>
    <div class="form-grid"><label>Data de início<input name="startDate" type="date" value="${escapeHtml(t.startDate || t.dataInicio || '')}" /></label><label>Data de fim<input name="endDate" type="date" value="${escapeHtml(t.endDate || t.dataFim || '')}" /></label></div>
    <label>Data exibida <small class="field-help">Opcional. Se ficar vazia, o site gera automaticamente pelas datas acima.</small><input name="date" value="${escapeHtml(t.date || '')}" placeholder="Ex.: 19 e 20 de dezembro" maxlength="80" /></label>
    <div class="form-grid"><label>Status<select name="status">${[['aberto','Aberto'],['vagas-limitadas','Vagas limitadas'],['esgotado','Esgotado'],['encerrado','Encerrado']].map(([value,label]) => `<option value="${value}" ${value === (t.status === 'data-a-confirmar' ? 'aberto' : (t.status || 'aberto')) ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Mínimo para confirmar saída (opcional)<input name="minToConfirm" type="number" min="1" max="500" value="${escapeHtml(t.minToConfirm ?? t.minimoParaConfirmar ?? '')}" placeholder="Ex.: 30" /></label></div>
    <label class="admin-toggle"><input name="dateTbc" type="checkbox" ${t.dateTbc || t.status === 'data-a-confirmar' ? 'checked' : ''} /> Data a confirmar</label>
    <div class="form-grid"><label>Horário de saída (opcional)<input name="startTime" value="${escapeHtml(t.startTime || '')}" placeholder="Ex.: 04h30" maxlength="60" /></label><label>Horário de chegada (opcional)<input name="arrivalTime" value="${escapeHtml(t.arrivalTime || '')}" placeholder="Ex.: 22h" maxlength="60" /></label></div>
    <label>Descrição curta<textarea name="blurb" rows="2" maxlength="400">${escapeHtml(t.blurb || '')}</textarea></label>
    <fieldset><legend>Valores e modalidades</legend><p>Informe cada valor anunciado. “Pessoas” indica quantas vagas a modalidade usa.</p><div id="fare-rows">${fares(t).map(fareRow).join('')}</div><button type="button" id="add-fare">+ Adicionar valor</button></fieldset>
    <div class="form-grid"><label>Incluído no pacote (um por linha)<textarea name="includes" rows="5" placeholder="Transporte ida e volta&#10;Café da manhã">${escapeHtml(t.includes.map(item => item[1]).join('\n'))}</textarea></label><label>Roteiro / locais visitados (um por linha)<textarea name="stops" rows="5" placeholder="Lagoa do Paraíso&#10;Praia do Preá">${escapeHtml(t.stops.map(item => item[0]).join('\n'))}</textarea></label></div>
    <label>Cidades de embarque (uma por linha)<textarea name="boarding" rows="3" placeholder="Boa Viagem&#10;Pedra Branca">${escapeHtml(t.boarding.join('\n'))}</textarea></label>
    <label>Avisos, entradas pagas à parte e atividades opcionais<textarea name="notice" rows="3" placeholder="Ex.: Entrada no parque não inclusa">${escapeHtml(t.notice || '')}</textarea></label>
    <label>Formas e condições de pagamento<textarea name="payment" rows="2" placeholder="Pix&#10;Cartão (com acréscimo)">${escapeHtml((t.payment || []).join('\n'))}</textarea></label>
    <fieldset class="payment-admin-box"><legend>Parcelamento (opcional)</legend>
      <p>As faixas de dias ainda são <strong>[CONFIRMAR]</strong>. Você pode ajustar sem mexer no layout.</p>
      <label>Pix por dias até a viagem <small class="field-help">Uma regra por linha. Ex.: 60=5 significa 60 dias ou mais → até 5x.</small><textarea name="pixMax" rows="4" placeholder="60=5&#10;30=3&#10;0=1">${escapeHtml(pixRulesToText(t))}</textarea></label>
      <div class="form-grid"><label>Máximo de parcelas no cartão<input name="cardMax" type="number" min="1" max="24" value="${escapeHtml(t.cardMax ?? '')}" placeholder="Ex.: 12" /></label><label>Acréscimo do cartão (%)<input name="cardSurchargePercent" type="number" min="0" max="100" step="0.01" value="${escapeHtml(t.cardSurchargePercent ?? '')}" placeholder="[CONFIRMAR]" /></label></div>
      <label>Nota de pagamento (opcional)<input name="paymentNote" maxlength="180" value="${escapeHtml(t.paymentNote || '')}" placeholder="Ex.: Reserva efetivada com a primeira parcela." /></label>
    </fieldset>
    <fieldset><legend>Fotos da viagem</legend><p>Até 4 fotos. As imagens são reduzidas antes de salvar.</p><div id="photo-preview" class="photo-preview"></div><label>Selecionar fotos do celular<input id="trip-photos" type="file" accept="image/*" multiple /></label></fieldset>
    <fieldset class="special-admin-box"><legend>Destaque na página inicial</legend><p>Use para datas únicas, como Dia das Crianças, Dia das Mães, Natal ou outras excursões especiais.</p><label class="admin-toggle"><input name="special" type="checkbox" ${t.special ? 'checked' : ''} /> Evento especial</label><label>Destacar até (opcional)<input name="specialUntil" type="date" value="${escapeHtml(t.specialUntil || '')}" /></label><small>Depois desta data, o destaque some automaticamente. Se a viagem continuar publicada, ela permanece entre as viagens normais.</small></fieldset>
    <label class="admin-toggle"><input name="published" type="checkbox" ${t.published ? 'checked' : ''} /> Mostrar no site</label>
    <button type="submit">Salvar viagem</button><button type="button" id="cancel-trip-edit">Fechar editor</button><p class="form-error" id="trip-error" hidden></p></form>`;
}
async function compressPhoto(file) {
  if (!file.type.startsWith('image/')) throw new Error('Selecione uma foto válida.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    let scale = Math.min(1, 1000 / Math.max(img.width, img.height));
    for (let attempt = 0; attempt < 8; attempt++) {
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const result = canvas.toDataURL('image/jpeg', Math.max(.34, .72 - attempt * .055));
      if (result.length < 150000) return result;
      scale *= .78;
    }
    throw new Error('A foto ficou grande demais. Tente outra imagem.');
  } finally { URL.revokeObjectURL(url); }
}
function openTripEditor(trip = null) {
  const holder = app.querySelector('#admin-editor-slot');
  holder.innerHTML = tripEditor(trip);
  holder.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const form = holder.querySelector('form');
  const images = [...(trip?.images || [])];
  const drawPhotos = () => {
    form.querySelector('#photo-preview').innerHTML = images.map((src, i) => `<div><img src="${src}" alt="Foto ${i + 1}" /><button type="button" data-photo="${i}" aria-label="Remover foto ${i + 1}">×</button></div>`).join('');
    form.querySelectorAll('[data-photo]').forEach(button => button.onclick = () => { images.splice(Number(button.dataset.photo), 1); drawPhotos(); });
  };
  drawPhotos();
  form.querySelector('#trip-photos').addEventListener('change', async event => {
    try { for (const file of event.target.files) { if (images.length >= 4) throw new Error('Limite de 4 fotos por viagem.'); images.push(await compressPhoto(file)); } drawPhotos(); }
    catch (error) { showToast(error.message); }
    event.target.value = '';
  });
  form.querySelector('#add-fare').onclick = () => form.querySelector('#fare-rows').insertAdjacentHTML('beforeend', fareRow());
  form.querySelector('#fare-rows').onclick = event => { if (event.target.matches('[data-remove-fare]') && form.querySelectorAll('[data-fare-row]').length > 1) event.target.closest('[data-fare-row]').remove(); };
  form.querySelector('#cancel-trip-edit').onclick = () => { holder.innerHTML = ''; };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const d = new FormData(form);
    const options = [...form.querySelectorAll('[data-fare-row]')].map(row => ({ label: row.querySelector('[name="fareLabel"]').value.trim(), amount: Number(row.querySelector('[name="fareAmount"]').value), seats: Number(row.querySelector('[name="fareSeats"]').value), boardingCity: row.querySelector('[name="fareCity"]').value.trim() }));
    const id = trip?.id || `${String(d.get('title')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 35)}-${Date.now().toString(36)}`;
    const startDate = String(d.get('startDate') || '');
    const endDate = String(d.get('endDate') || startDate || '');
    const typedDate = String(d.get('date') || '').trim();
    let pixMax;
    try { pixMax = parsePixRules(d.get('pixMax')); }
    catch (error) { const warning = form.querySelector('#trip-error'); warning.textContent = error.message; warning.hidden = false; return; }
    const data = { id, title: String(d.get('title')).trim(), subtitle: String(d.get('subtitle')).trim(), category: String(d.get('category')).trim(), kind: String(d.get('kind')), startDate, endDate, date: typedDate || formatTripDisplayDate(startDate, endDate) || 'Data a confirmar', startTime: String(d.get('startTime')).trim(), arrivalTime: String(d.get('arrivalTime')).trim(), blurb: String(d.get('blurb')).trim(),
      price: options[0].amount, priceNote: options[0].label, fareOptions: options, includes: lines(d.get('includes')).map(item => ['check', item]), stops: lines(d.get('stops')).map(item => [item, '']), boarding: lines(d.get('boarding')), notice: String(d.get('notice')).trim(), payment: lines(d.get('payment')), pixMax, cardMax: d.get('cardMax') ? Number(d.get('cardMax')) : null, cardSurchargePercent: d.get('cardSurchargePercent') !== '' ? Number(d.get('cardSurchargePercent')) : null, paymentNote: String(d.get('paymentNote') || '').trim(), images, image: trip?.image || './assets/logo-janu.webp', status: String(d.get('status') || 'aberto'), minToConfirm: d.get('minToConfirm') ? Number(d.get('minToConfirm')) : null, dateTbc: d.get('dateTbc') === 'on', published: d.get('published') === 'on', special: d.get('special') === 'on', specialUntil: String(d.get('specialUntil') || '') };
    const button = form.querySelector('[type="submit"]'); button.disabled = true;
    try { await adminSaveTrip(data); await loadCatalog(); await loadAdmin(); showToast('Viagem salva. Configure e libere as vagas.'); }
    catch (error) { const warning = form.querySelector('#trip-error'); warning.textContent = error.message; warning.hidden = false; button.disabled = false; }
  });
}

function phoneForWhatsApp(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function balanceChargeLink(booking) {
  const trip = TRIPS.find(item => item.id === booking.tripId);
  const phone = phoneForWhatsApp(booking.phone);
  const message = `Olá, ${booking.firstName}! Aqui é da Janu Turismo. Vamos conversar sobre sua reserva ${booking.id} para ${booking.tripTitle || trip?.title || 'a viagem'} (${booking.tripDate || trip?.date || 'data a confirmar'})${Number.isInteger(booking.totalCents) ? `, no valor de ${money(booking.totalCents / 100)}` : ''}. Podemos combinar os próximos passos?`;
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : '#';
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function passengerCsv(tripId, bookings) {
  const trip = TRIPS.find(item => item.id === tripId);
  const rows = bookings
    .filter(booking => booking.tripId === tripId && booking.status !== 'cancelled')
    .sort((a, b) => String(a.boarding || '').localeCompare(String(b.boarding || ''), 'pt-BR') || String(a.firstName || '').localeCompare(String(b.firstName || ''), 'pt-BR'));

  return [
    ['Viagem', 'Data', 'Embarque', 'Reserva', 'Nome', 'Telefone', 'CPF final', 'Passageiros', 'Pagamento', 'Status'],
    ...rows.map(booking => [
      trip?.title || tripId,
      trip?.date || '',
      booking.boarding || 'A combinar',
      booking.id,
      `${booking.firstName} ${booking.lastName}`,
      booking.phone,
      booking.cpfLast4,
      booking.seats,
      paymentLabel(booking.payment),
      statusLabel(booking.status),
    ]),
  ].map(row => row.map(csvCell).join(',')).join('\n');
}

function downloadTextFile(filename, content, type = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\ufeff', content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function passengerGroupsMarkup(bookings) {
  const active = bookings.filter(booking => booking.status !== 'cancelled');
  const tripIds = [...new Set(active.map(booking => booking.tripId))]
    .sort((a, b) => compareTripsByStartDate(TRIPS.find(item => item.id === a) || {}, TRIPS.find(item => item.id === b) || {}));

  if (!tripIds.length) return '<p class="empty-state">Nenhum passageiro ativo para listar.</p>';

  return tripIds.map(tripId => {
    const trip = TRIPS.find(item => item.id === tripId);
    const tripBookings = active.filter(booking => booking.tripId === tripId);
    const boardings = [...new Set(tripBookings.map(booking => booking.boarding || 'A combinar'))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const slug = String(trip?.title || tripId).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    return `<section class="passenger-trip-card">
      <div class="passenger-trip-head">
        <div><strong>${escapeHtml(trip?.title || tripId)}</strong><span>${escapeHtml(trip?.date || 'Data a confirmar')} · ${tripBookings.reduce((sum, booking) => sum + Number(booking.seats || 0), 0)} passageiros</span></div>
        <div class="passenger-actions">
          <button type="button" data-copy-passengers="${escapeHtml(tripId)}">Copiar lista</button>
          <button type="button" data-download-passengers="${escapeHtml(tripId)}" data-file-name="${escapeHtml(slug || tripId)}">Baixar CSV</button>
        </div>
      </div>
      <div class="boarding-groups">
        ${boardings.map(boarding => {
          const group = tripBookings.filter(booking => (booking.boarding || 'A combinar') === boarding);
          return `<div class="boarding-group"><h4>${icon('pin', 17)} ${escapeHtml(boarding)} <span>${group.reduce((sum, booking) => sum + Number(booking.seats || 0), 0)}</span></h4>
            <div class="passenger-list">${group.map(booking => `<div class="passenger-row"><span><strong>${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)}</strong><small>${escapeHtml(booking.phone)} · CPF final ${escapeHtml(booking.cpfLast4)} · ${booking.seats} ${booking.seats === 1 ? 'vaga' : 'vagas'}</small></span><a href="${balanceChargeLink(booking)}" target="_blank" rel="noopener noreferrer">Falar com o cliente</a></div>`).join('')}</div>
          </div>`;
        }).join('')}
      </div>
    </section>`;
  }).join('');
}

function adminReservationsByTripMarkup(trips, bookings, detailRoute = '#/gestao/reservas') {
  const sortedTrips = [...trips].sort((a, b) => compareTripsByStartDate(TRIPS.find(item => item.id === a.id) || {}, TRIPS.find(item => item.id === b.id) || {}));
  if (!sortedTrips.length) return '<p class="empty-state">Nenhuma viagem disponível para gerenciar reservas.</p>';

  return sortedTrips.map(trip => {
    const catalogTrip = TRIPS.find(item => item.id === trip.id);
    const tripBookings = bookings.filter(booking => booking.tripId === trip.id && booking.status !== 'cancelled');
    const paidCount = tripBookings.filter(booking => booking.status === 'confirmed').length;
    const pendingCount = tripBookings.filter(booking => booking.status === 'pending').length;
    return `<a class="admin-reservation-trip-link" href="${detailRoute}/${encodeURIComponent(trip.id)}">
      <span class="admin-reservation-trip-main">
        <small>${escapeHtml(catalogTrip?.date || 'Data a confirmar')}</small>
        <strong>${escapeHtml(tripName(trip.id))}</strong>
        <span>${tripBookings.length} ${tripBookings.length === 1 ? 'cliente com reserva' : 'clientes com reserva'}</span>
      </span>
      <span class="admin-reservation-trip-status">
        <small class="admin-payment-summary-paid">${paidCount} ${paidCount === 1 ? 'pago' : 'pagos'}</small>
        <small class="admin-payment-summary-pending">${pendingCount} ${pendingCount === 1 ? 'pendente' : 'pendentes'}</small>
        ${icon('arrowRight', 20)}
      </span>
    </a>`;
  }).join('');
}

function adminTripReservationsMarkup(trip, bookings, backRoute = '#/gestao') {
  const catalogTrip = TRIPS.find(item => item.id === trip.id);
  const tripBookings = bookings.filter(booking => booking.tripId === trip.id);
  const activeBookings = tripBookings.filter(booking => booking.status !== 'cancelled');
  const paidCount = activeBookings.filter(booking => booking.status === 'confirmed').length;
  const pendingCount = activeBookings.filter(booking => booking.status === 'pending').length;
  const filled = trip.demo ? activeBookings.reduce((sum, booking) => sum + Number(booking.seats || 0), 0) : trip.reserved;
  const publicVacancyStatus = trip.demo ? (catalogTrip?.publicVacancyStatus || 'available') : (trip.publicVacancyStatus || 'available');

  return `<section class="admin-trip-reservations-page">
    <a class="admin-reservations-back" href="${backRoute}">${icon('arrowLeft', 18)} Voltar para Reservas por viagem</a>
    <div class="admin-trip-reservations-heading">
      <div>
        <span class="section-kicker">RESERVAS</span>
        <h2>${escapeHtml(tripName(trip.id))}</h2>
        <p>${escapeHtml(catalogTrip?.date || 'Data a confirmar')}</p>
      </div>
      <button class="admin-add-passenger-button" type="button" data-add-passenger>+ Adicionar passageiro</button>
    </div>
    <form id="trip-manual-booking" class="admin-editor admin-trip-add-passenger" hidden>
      <input name="tripId" type="hidden" value="${escapeHtml(trip.id)}" />
      <div class="admin-trip-add-passenger-head">
        <div><strong>Adicionar passageiro</strong><small>Reserva manual para esta viagem</small></div>
        <button type="button" class="admin-trip-add-passenger-close" data-close-passenger aria-label="Fechar">×</button>
      </div>
      <div class="form-grid"><label>Nome<input name="firstName" required /></label><label>Sobrenome<input name="lastName" required /></label></div>
      <div class="form-grid"><label>CPF<input name="cpf" inputmode="numeric" maxlength="14" required /></label><label>Telefone<input name="phone" type="tel" required /></label></div>
      <div class="form-grid"><label>Quantidade de vagas<input name="seats" type="number" min="1" max="10" value="1" required /></label><label>Embarque<input name="boarding" placeholder="Cidade / local" maxlength="80" /></label></div>
      <label>Nome de acesso ou e-mail do cliente (opcional)<input name="identifier" type="text" placeholder="Para aparecer em Minhas reservas" /></label>
      <button type="submit">Salvar passageiro</button>
      <p class="form-error" hidden></p>
    </form>
    <div class="admin-seat-metrics">
      <div><span>Total de vagas</span><strong>${trip.demo ? '—' : trip.capacity}</strong></div>
      <div><span>Preenchidas</span><strong>${filled}</strong></div>
      <div><span>Faltam</span><strong>${trip.demo ? '—' : trip.available}</strong></div>
    </div>
    <form class="admin-vacancy-control" data-capacity-control data-id="${escapeHtml(trip.id)}">
      <div>
        <span class="section-kicker">CONTROLE INTERNO</span>
        <strong>Vagas da viagem</strong>
        <small>O número é visível somente na gestão. No site público aparece apenas o aviso escolhido abaixo.</small>
      </div>
      <label>Total de vagas
        <input name="capacity" type="number" min="1" max="500" value="${trip.demo ? '' : trip.capacity}" placeholder="Ex.: 40" required />
      </label>
      <label>Aviso no site
        <select name="publicVacancyStatus">
          <option value="available" ${publicVacancyStatus !== 'last-spots' ? 'selected' : ''}>Vagas disponíveis</option>
          <option value="last-spots" ${publicVacancyStatus === 'last-spots' ? 'selected' : ''}>Últimas vagas</option>
        </select>
      </label>
      <button type="submit">Salvar controle de vagas</button>
      <p class="form-error" hidden></p>
    </form>
    <div class="admin-payment-summary">
      <span class="admin-payment-summary-paid">${paidCount} ${paidCount === 1 ? 'pago' : 'pagos'}</span>
      <span class="admin-payment-summary-pending">${pendingCount} ${pendingCount === 1 ? 'pendente' : 'pendentes'}</span>
    </div>
    <div class="admin-trip-clients">
      ${tripBookings.length ? tripBookings.map(booking => {
        const paid = booking.status === 'confirmed';
        const pending = booking.status === 'pending';
        const cancelled = booking.status === 'cancelled';
        return `<article class="admin-reservation-person booking-state-${escapeHtml(booking.status)}">
          <div class="admin-reservation-person-head">
            <div><strong>${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)}</strong><small>${escapeHtml(booking.id)}</small></div>
            <span class="admin-payment-badge ${paid ? 'is-paid' : cancelled ? 'is-cancelled' : 'is-pending'}">${paymentStatusLabel(booking.status)}</span>
          </div>
          <p>${booking.seats} ${booking.seats === 1 ? 'passageiro' : 'passageiros'} · ${paymentLabel(booking.payment)}${Number.isInteger(booking.totalCents) ? ` · ${money(booking.totalCents / 100)}` : ''}</p>
          <p>${escapeHtml(booking.phone)} · Embarque: ${escapeHtml(booking.boarding || 'A combinar')}</p>
          <div class="admin-reservation-actions admin-client-actions">
            <button class="admin-paid-button" type="button" data-action="confirmed" data-id="${escapeHtml(booking.id)}" ${paid || cancelled ? 'disabled' : ''}>Marcar pago</button>
            <button class="admin-pending-button" type="button" data-action="pending" data-id="${escapeHtml(booking.id)}" ${pending || cancelled ? 'disabled' : ''}>Marcar pendente</button>
            <a class="admin-balance-button" href="${balanceChargeLink(booking)}" target="_blank" rel="noopener noreferrer">Chamar no WhatsApp</a>
            <button class="admin-delete-button" type="button" data-delete-booking="${escapeHtml(booking.id)}">Excluir</button>
          </div>
        </article>`;
      }).join('') : '<p class="empty-state compact-empty">Ainda não há clientes com reserva nessa viagem.</p>'}
    </div>
  </section>`;
}

function renderAdmin({ reservationsTab = false } = {}) {
  app.innerHTML = `${reservationsTab ? header() : ''}<main class="wrap admin-page ${reservationsTab ? 'page' : ''}" id="main">${reservationsTab ? '' : `<a href="#/">${icon('arrowLeft', 20)} Voltar ao site</a>`}<h1>${reservationsTab ? 'Controle de reservas' : 'Gestão de reservas'}</h1><p>Área da Janu Turismo</p><div id="admin-login" ${reservationsTab ? 'hidden' : ''}>${authPanel('Entre com a conta da agência')}</div><div id="admin-content"><p class="loading-state">Carregando o controle de reservas…</p></div></main>${reservationsTab ? bottomNav('bookings') : ''}`;
  document.title = `${reservationsTab ? 'Controle de reservas' : 'Gestão de reservas'} | Janu Turismo`;
  if (reservationsTab) bindHeaderMenu();
  bindAuth(app.querySelector('#admin-login'), async () => {
    try { await loadAdmin(); app.querySelector('#admin-login').hidden = true; }
    catch { showToast('Esta conta não tem acesso à gestão.'); }
  });
  authReady.then(async () => {
    if (!currentUser() || !app.querySelector('#admin-content')) return;
    try { await loadAdmin(); app.querySelector('#admin-login').hidden = true; } catch { /* cliente comum */ }
  });
}

async function loadAdmin() {
  const content = app.querySelector('#admin-content');
  if (!content) return;
  const { trips, bookings } = await adminFetch();
  if (!content.isConnected) return;
  disposeAdminExpiry();
  let visibleBookings = bookings.map(booking => booking.id).join('|');
  disposeAdminExpiry = watchDeadlines(bookings.map(booking => reservationDeadline(booking, TRIPS)), () => {
    const next = bookings.filter(booking => { const deadline = reservationDeadline(booking, TRIPS); return deadline === null || Date.now() < deadline; }).map(booking => booking.id).join('|');
    if (next !== visibleBookings && content.isConnected) { visibleBookings = next; loadAdmin().catch(() => showToast('Não foi possível atualizar as reservas.')); }
  });
  const provisionedAdmin = await isProvisionedAdminAccount().catch(() => true);
  const isPrimaryAdmin = String(currentUser()?.email || '').toLowerCase() === '0vieira.francisco0@gmail.com';
  const access = await adminAccess().catch(() => ({ primary: isPrimaryAdmin, owner: !isPrimaryAdmin }));
  if (!content.isConnected) return;
  const ownerOnly = access.owner && !access.primary;
  if (ownerOnly) adminActiveTab = 'bookings';
  const accessSetup = (!provisionedAdmin && isPrimaryAdmin) ? `<section class="admin-access-setup">
    <div><span class="section-kicker">ACESSOS ADMINISTRATIVOS</span><h2>Configurar acessos da Janu</h2><p>Defina aqui as credenciais administrativas. As senhas são enviadas diretamente ao Firebase e não ficam salvas no código do site.</p></div>
    <form id="admin-access-form">
      <label>E-mail administrativo<input name="adminEmail" type="email" value="0vieira.francisco0@gmail.com" readonly /></label>
      <label>Senha do e-mail<input name="adminPassword" type="password" minlength="6" autocomplete="new-password" placeholder="Senha da conta administrativa" required /></label>
      <label>Repita a senha do e-mail<input name="adminPasswordConfirm" type="password" minlength="6" autocomplete="new-password" placeholder="Repita a senha" required /></label>
      <label>Telefone da dona<input name="phone" type="tel" value="88 8873-7924" readonly /></label>
      <label>Senha da dona<input name="ownerPassword" type="password" minlength="6" autocomplete="new-password" placeholder="Senha da dona da Janu" required /></label>
      <label>Repita a senha da dona<input name="ownerPasswordConfirm" type="password" minlength="6" autocomplete="new-password" placeholder="Repita a senha" required /></label>
      <p class="form-error" role="alert" hidden></p>
      <button type="submit">Salvar acessos administrativos</button>
    </form>
    <small>Depois disso, o e-mail e o telefone entram pela mesma tela de login e são enviados direto para a gestão.</small>
  </section>` : '';
  const route = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/').filter(Boolean);
  const reservationsTab = route[0] === 'reservas';
  const backRoute = reservationsTab ? '#/reservas' : '#/gestao';
  const detailRoute = reservationsTab ? '#/reservas' : '#/gestao/reservas';
  const selectedTripId = reservationsTab ? route[1] : route[0] === 'gestao' && route[1] === 'reservas' ? route[2] : '';
  if (ownerOnly && route[0] === 'gestao') {
    location.hash = selectedTripId ? `#/reservas/${encodeURIComponent(selectedTripId)}` : '#/reservas';
    return;
  }
  const selectedTrip = selectedTripId ? trips.find(trip => trip.id === selectedTripId) : null;

  if (selectedTripId) {
    adminActiveTab = 'bookings';
    content.innerHTML = selectedTrip
      ? adminTripReservationsMarkup(selectedTrip, bookings, backRoute)
      : `<section class="admin-trip-reservations-page"><a class="admin-reservations-back" href="${backRoute}">${icon('arrowLeft', 18)} Voltar para Reservas por viagem</a><p class="empty-state">Essa viagem não foi encontrada ou já saiu da gestão.</p></section>`;
  } else if (ownerOnly) {
    content.innerHTML = `<section class="admin-reservations-overview admin-owner-reservations">
      <span class="section-kicker">GESTÃO DA JANU</span>
      <h2>Reservas por viagem</h2>
      <p>Escolha uma viagem para ver os clientes, pagamentos e vagas atualizadas.</p>
      <div class="admin-reservation-trips">${adminReservationsByTripMarkup(trips, bookings, detailRoute)}</div>
    </section>`;
  } else {
    content.innerHTML = `${accessSetup}<div class="admin-management-tabs" role="tablist" aria-label="Gestão">
      <button type="button" data-admin-tab="trips" class="${adminActiveTab === 'trips' ? 'is-active' : ''}">Viagens e vagas</button>
      <button type="button" data-admin-tab="bookings" class="${adminActiveTab === 'bookings' ? 'is-active' : ''}">Reservas</button>
    </div>
    <div class="admin-tab-panel" data-admin-panel="trips" ${adminActiveTab === 'trips' ? '' : 'hidden'}>
      <div class="admin-toolbar"><h2>Viagens e vagas</h2><button type="button" id="refresh-admin">Atualizar</button></div>
      <p>Defina a capacidade real de cada viagem e controle se as reservas estão liberadas.</p>
      <div class="admin-trips">${[...trips].sort((a,b) => compareTripsByStartDate(TRIPS.find(item => item.id === a.id) || {}, TRIPS.find(item => item.id === b.id) || {})).map(trip => {
        const catalogTrip = TRIPS.find(item => item.id === trip.id);
        const ended = catalogTrip && isTripPast(catalogTrip);
        return `<form class="admin-trip ${ended ? 'admin-trip-ended' : ''}" data-id="${trip.id}">
          <div class="admin-trip-title"><strong>${escapeHtml(tripName(trip.id))}</strong>${ended ? '<span class="admin-ended-badge">Encerrada</span>' : ''}</div>
          <span>${catalogTrip?.startDate ? `${escapeHtml(catalogTrip.date)} · ` : ''}${trip.reserved} reservas · ${trip.demo ? 'vagas ainda não configuradas' : `${trip.available} restantes`}</span>
          <label>Total de vagas<input name="capacity" type="number" min="0" max="500" value="${trip.capacity}" required /></label>
          <label>Aviso público<select name="publicVacancyStatus"><option value="available" ${trip.publicVacancyStatus !== 'last-spots' ? 'selected' : ''}>Vagas disponíveis</option><option value="last-spots" ${trip.publicVacancyStatus === 'last-spots' ? 'selected' : ''}>Últimas vagas</option></select></label>
          <label class="admin-toggle"><input name="enabled" type="checkbox" ${trip.enabled ? 'checked' : ''} /> Liberar reservas</label>
          <button type="submit">Salvar vagas</button>
          <button type="button" data-edit="${escapeHtml(trip.id)}">Editar informações e fotos</button>
        </form>`;
      }).join('')}</div>
      <div id="admin-editor-slot"></div>
      <section class="manual-section">
        <h2>Adicionar reserva recebida pelo WhatsApp</h2>
        <p>O passageiro ocupa as vagas imediatamente. Informe o nome de acesso ou e-mail usado no site para vincular à conta dele.</p>
        <form id="manual-booking" class="admin-editor">
          <label>Viagem<select name="tripId" required>${upcomingTrips().map(trip => `<option value="${escapeHtml(trip.id)}">${escapeHtml(trip.title)} · ${escapeHtml(trip.date)}</option>`).join('')}</select></label>
          <div class="form-grid"><label>Nome<input name="firstName" required /></label><label>Sobrenome<input name="lastName" required /></label></div>
          <div class="form-grid"><label>CPF<input name="cpf" inputmode="numeric" maxlength="14" required /></label><label>Telefone<input name="phone" type="tel" required /></label></div>
          <div class="form-grid"><label>Quantidade de vagas<input name="seats" type="number" min="1" max="10" value="1" required /></label><label>Embarque<input name="boarding" placeholder="Cidade / local" maxlength="80" /></label></div>
          <label>Nome de acesso ou e-mail do cliente (opcional)<input name="identifier" type="text" placeholder="Para aparecer em Minhas reservas" /></label>
          <button type="submit">Salvar passageiro e descontar vagas</button>
          <p id="manual-error" class="form-error" hidden></p>
        </form>
      </section>
    </div>
    <div class="admin-tab-panel" data-admin-panel="bookings" ${adminActiveTab === 'bookings' ? '' : 'hidden'}>
      <section class="admin-reservations-overview">
        <h2>Reservas por viagem</h2>
        <p>Escolha uma viagem para abrir uma tela separada apenas com os clientes daquela viagem.</p>
        <div class="admin-reservation-trips">${adminReservationsByTripMarkup(trips, bookings)}</div>
      </section>
    </div>`;
  }
  const addPassengerButton = content.querySelector('[data-add-passenger]');
  const tripPassengerForm = content.querySelector('#trip-manual-booking');
  addPassengerButton?.addEventListener('click', () => {
    if (!tripPassengerForm) return;
    tripPassengerForm.hidden = !tripPassengerForm.hidden;
    if (!tripPassengerForm.hidden) tripPassengerForm.elements.firstName?.focus();
  });
  tripPassengerForm?.querySelector('[data-close-passenger]')?.addEventListener('click', () => {
    tripPassengerForm.hidden = true;
  });
  tripPassengerForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const warning = form.querySelector('.form-error');
    button.disabled = true;
    warning.hidden = true;
    try {
      const result = await adminManualBooking(Object.fromEntries(new FormData(form)));
      showToast(result.linked ? 'Passageiro adicionado e vinculado à conta do cliente.' : 'Passageiro adicionado à viagem.');
      await loadAdmin();
    } catch (error) {
      warning.textContent = error.message;
      warning.hidden = false;
      button.disabled = false;
    }
  });

  content.querySelectorAll('[data-capacity-control]').forEach(form => form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    const warning = form.querySelector('.form-error');
    button.disabled = true;
    warning.hidden = true;
    try {
      await adminFetch('PUT', {
        tripId: form.dataset.id,
        capacity: Number(form.elements.capacity.value),
        enabled: true,
        publicVacancyStatus: form.elements.publicVacancyStatus.value,
      });
      await loadAdmin();
      showToast('Controle de vagas atualizado.');
    } catch (error) {
      warning.textContent = error.message;
      warning.hidden = false;
      button.disabled = false;
    }
  }));

  const adminAccessForm = content.querySelector('#admin-access-form');
  adminAccessForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const error = form.querySelector('.form-error');
    const submit = form.querySelector('[type="submit"]');
    const adminPassword = String(form.elements.adminPassword.value || '');
    const adminPasswordConfirm = String(form.elements.adminPasswordConfirm.value || '');
    const ownerPassword = String(form.elements.ownerPassword.value || '');
    const ownerPasswordConfirm = String(form.elements.ownerPasswordConfirm.value || '');
    error.hidden = true;
    if (adminPassword !== adminPasswordConfirm) {
      error.textContent = 'As senhas do e-mail administrativo não são iguais.';
      error.hidden = false;
      form.elements.adminPasswordConfirm.focus();
      return;
    }
    if (ownerPassword !== ownerPasswordConfirm) {
      error.textContent = 'As senhas da conta da dona não são iguais.';
      error.hidden = false;
      form.elements.ownerPasswordConfirm.focus();
      return;
    }
    submit.disabled = true;
    try {
      await adminSetCurrentPassword(adminPassword);
      await adminCreatePhoneAccount({ phone: form.elements.phone.value, password: ownerPassword });
      form.reset();
      showToast('Os dois acessos administrativos foram configurados.');
      content.querySelector('.admin-access-setup')?.remove();
    } catch (problem) {
      error.textContent = problem.message;
      error.hidden = false;
      submit.disabled = false;
    }
  });
  content.querySelectorAll('[data-admin-tab]').forEach(button => button.addEventListener('click', () => {
    adminActiveTab = button.dataset.adminTab;
    content.querySelectorAll('[data-admin-tab]').forEach(item => item.classList.toggle('is-active', item === button));
    content.querySelectorAll('[data-admin-panel]').forEach(panel => { panel.hidden = panel.dataset.adminPanel !== adminActiveTab; });
  }));
  content.querySelector('#refresh-admin')?.addEventListener('click', async event => { event.target.disabled = true; try { await loadAdmin(); } catch { showToast('Não foi possível atualizar. Tente novamente.'); event.target.disabled = false; } });
  content.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => openTripEditor(TRIPS.find(trip => trip.id === button.dataset.edit)));
  content.querySelector('#manual-booking')?.addEventListener('submit', async event => {
    event.preventDefault(); const form = event.target, d = new FormData(form), button = form.querySelector('[type="submit"]'); button.disabled = true;
    try {
      const result = await adminManualBooking(Object.fromEntries(d));
      await loadAdmin(); showToast(result.linked ? 'Reserva salva e vinculada à conta do cliente.' : 'Reserva salva. Cliente sem conta vinculada.');
    } catch (error) { const warning = form.querySelector('#manual-error'); warning.textContent = error.message; warning.hidden = false; button.disabled = false; }
  });
  content.querySelectorAll('.admin-trip').forEach(form => form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button'); button.disabled = true;
    try { await adminFetch('PUT', { tripId: form.dataset.id, capacity: Number(form.elements.capacity.value), enabled: form.elements.enabled.checked, publicVacancyStatus: form.elements.publicVacancyStatus?.value || 'available' }); await loadAdmin(); showToast('Vagas atualizadas'); }
    catch (error) { showToast(error.message); button.disabled = false; }
  }));
  content.querySelectorAll('[data-delete-booking]').forEach(button => button.addEventListener('click', async () => {
    if (!confirm('Apagar esta reserva de todas as contas? Os lugares separados serão liberados. Esta ação não pode ser desfeita.')) return;
    button.disabled = true;
    try { await adminDeleteBooking(button.dataset.deleteBooking); await loadAdmin(); showToast('Reserva apagada de todas as contas.'); }
    catch (error) { showToast(error.message); button.disabled = false; }
  }));
  content.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', async () => {
    const action = button.dataset.action;
    const message = action === 'confirmed' ? 'Marcar este pagamento como pago e confirmar a reserva?'
      : action === 'pending' ? 'Voltar este pagamento para pendente? A reserva continuará ocupando as vagas.'
      : 'Cancelar esta reserva e liberar os lugares que estavam separados?';
    if (!confirm(message)) return;
    if (button.closest('[data-admin-panel="bookings"]')) adminActiveTab = 'bookings';
    button.disabled = true;
    try {
      await adminFetch('PATCH', { id: button.dataset.id, status: action });
      await loadAdmin();
      showToast(action === 'confirmed' ? 'Pagamento marcado como pago.' : action === 'pending' ? 'Pagamento marcado como pendente.' : 'Reserva cancelada.');
    } catch (error) { showToast(error.message); button.disabled = false; }
  }));
}

function render() {
  disposeAdminExpiry();
  disposeAdminExpiry = () => {};
  disposeInventory();
  disposeInventory = () => {};
  disposeBookings();
  disposeBookings = () => {};
  document.querySelectorAll('.booking-auth-dialog').forEach(dialog => { dialog.close(); dialog.remove(); });
  disposeDetailPhotos();
  disposeDetailPhotos = () => {};
  const route = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/').filter(Boolean);
  if (route[0] === 'viagem' && route[1]) renderDetail(route[1]);
  else if (route[0] === 'reserva' && route[1]) renderConfirmation(route[1]);
  else if (route[0] === 'reserva-demo') renderConfirmation(null, true);
  else if (route[0] === 'reservas') renderMyReservations();
  else if (route[0] === 'perfil') renderProfile();
  else if (route[0] === 'gestao') renderAdmin();
  else if (route[0] === 'viagens') renderTrips();
  else if (route[0] === 'contato') renderContact();
  else if (route[0] === 'politicas') renderPolicies();
  else renderHome();
  bindHeaderMenu();
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (route[0] === 'politicas' && ['reservas', 'privacidade'].includes(route[1])) {
    requestAnimationFrame(() => document.querySelector(`#policy-${route[1]}`)?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }
}

initScrollGuide();
trackTripExpiry();
window.addEventListener('hashchange', render);
render();
authReady.then(() => { if (location.hash === '' || location.hash === '#/' || location.hash === '#/perfil') render(); });
loadCatalog();
