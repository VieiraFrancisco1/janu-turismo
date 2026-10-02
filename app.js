import { PASSEIOS_SEED, adaptarPasseioParaApp } from './catalogo.js';
import { configured, authReady, currentUser, login, logout, getCatalog, getTrips, createBooking, getBooking, myBookings, adminGet, adminSetCapacity, adminSetStatus, adminSaveTrip, adminManualBooking } from './data.js';

const WHATSAPP_NUMBER = '5588988737924';
const SAMPLE_SEATS = { guaramiranga: 24, 'sitio-do-bosco': 20, jericoacoara: 32 };
let inventory = {};
let inventoryReady = false;
let lastBooking = null;

let TRIPS = PASSEIOS_SEED.map(adaptarPasseioParaApp);

const app = document.querySelector('#app');
const starterTrips = TRIPS.map(trip => ({ ...trip, published: trip.published !== false }));
TRIPS = starterTrips.map(normalizeTrip);
let filter = 'Todas';
let query = '';

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
  card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
};

function icon(name, size = 24) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

function waLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function seatsText(id) {
  const state = inventory[id];
  if (!inventoryReady || !state || state.demo) return 'Vagas a confirmar';
  if (!state.enabled) return 'Reservas em preparação';
  return state.available > 0 ? `${state.available} ${state.available === 1 ? 'vaga disponível' : 'vagas disponíveis'}` : 'Vagas esgotadas';
}

async function refreshInventory() {
  try {
    inventory = Object.fromEntries((await getTrips(TRIPS.map(trip => trip.id))).map(trip => [trip.id, trip]));
    inventoryReady = true;
  } catch { inventoryReady = false; }
  document.querySelectorAll('[data-seats]').forEach(el => { el.textContent = seatsText(el.dataset.seats); });
  const reserve = document.querySelector('#reserve');
  if (reserve) {
    const tripId = reserve.dataset.trip;
    const state = inventory[tripId];
    reserve.disabled = !inventoryReady || !state || state.demo || !state.enabled || state.available === 0;
  }
}

function authPanel(title = 'Entre para continuar') {
  return `<div class="auth-panel" data-auth-mode="login"><div class="auth-tabs" aria-label="Acesso à conta"><button class="auth-tab is-active" type="button" data-auth-tab="login" aria-pressed="true">Entrar</button><button class="auth-tab" type="button" data-auth-tab="register" aria-pressed="false">Criar conta</button></div><h2 class="auth-heading">${escapeHtml(title)}</h2><p class="auth-description">Entre para acompanhar suas reservas em qualquer aparelho.</p><form class="auth-form"><label class="register-name" hidden>Nome<input name="name" autocomplete="name" maxlength="80" placeholder="Seu nome" disabled /></label><label>E-mail<input type="email" name="email" autocomplete="email" placeholder="seu@email.com" required /></label><label>Senha<input type="password" name="password" autocomplete="current-password" minlength="6" placeholder="Sua senha" required /></label><p class="form-error" role="alert" hidden></p><button class="auth-submit" type="submit">Entrar</button></form><button class="auth-switch" type="button">Ainda não tem conta? <strong>Criar conta</strong></button></div>`;
}

function bindAuth(container, onSuccess) {
  const panel = container.querySelector('.auth-panel');
  const form = container.querySelector('.auth-form');
  const nameField = form.querySelector('.register-name');
  const nameInput = nameField.querySelector('input');
  const password = form.querySelector('[name="password"]');
  const error = form.querySelector('.form-error');
  const switchButton = panel.querySelector('.auth-switch');
  const title = panel.querySelector('.auth-heading').textContent;
  function setMode(mode) {
    const register = mode === 'register';
    panel.dataset.authMode = mode;
    nameField.hidden = !register;
    nameInput.disabled = !register;
    nameInput.required = register;
    password.autocomplete = register ? 'new-password' : 'current-password';
    password.value = '';
    error.hidden = true;
    panel.querySelector('.auth-heading').textContent = register ? 'Crie sua conta' : title;
    panel.querySelector('.auth-description').textContent = register
      ? 'Cadastre seus dados para fazer reservas e consultá-las depois.'
      : 'Entre para acompanhar suas reservas em qualquer aparelho.';
    form.querySelector('.auth-submit').textContent = register ? 'Criar conta' : 'Entrar';
    switchButton.innerHTML = register ? 'Já tem conta? <strong>Entrar</strong>' : 'Ainda não tem conta? <strong>Criar conta</strong>';
    panel.querySelectorAll('[data-auth-tab]').forEach(button => {
      const active = button.dataset.authTab === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  panel.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.authTab)));
  switchButton.addEventListener('click', () => setMode(panel.dataset.authMode === 'login' ? 'register' : 'login'));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const register = panel.dataset.authMode === 'register';
    if (register && !nameInput.value.trim()) { nameInput.focus(); return; }
    const buttons = panel.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);
    error.hidden = true;
    try {
      const data = new FormData(form);
      await login(String(data.get('email')), String(data.get('password')), register, String(data.get('name') || ''));
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
function normalizeTrip(trip) {
  return { ...trip, image: trip.images?.[0] || trip.image || './assets/logo-janu.png',
    boarding: Array.isArray(trip.boarding) ? trip.boarding : [],
    includes: Array.isArray(trip.includes) ? trip.includes : [],
    stops: Array.isArray(trip.stops) ? trip.stops : [],
    published: trip.published !== false, special: trip.special === true, specialUntil: String(trip.specialUntil || '') };
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
    render();
  } catch (error) { showToast('Não foi possível carregar as viagens da agência.'); }
}

function header() {
  return `<header class="site-header wrap">
    <a class="brand" href="#/" aria-label="Janu Turismo — início"><img src="./assets/logo-janu.png" alt="Janu Turismo — Levando você aos melhores destinos" /></a>
    <a class="profile-link" href="#/perfil" aria-label="${currentUser() ? 'Abrir meu perfil' : 'Fazer login'}">${icon('user', 23)}<span>${escapeHtml(currentUser()?.displayName?.split(' ')[0] || (currentUser() ? currentUser().email.split('@')[0] : 'Login'))}</span></a>
  </header>`;
}

function bottomNav(active) {
  const items = [['home', 'Início', '#/', 'home'], ['bag', 'Viagens', '#/viagens', 'trips'], ['ticket', 'Reservas', '#/reservas', 'bookings'], ['whatsapp', 'Contato', '#/contato', 'contact']];
  return `<nav class="bottom-nav" aria-label="Navegação principal"><div class="bottom-nav-inner">${items.map(([glyph, label, url, key]) => `<a href="${url}" class="nav-item ${active === key ? 'active' : ''}" ${active === key ? 'aria-current="page"' : ''}>${icon(glyph, 26)}<span>${label}</span></a>`).join('')}</div></nav>`;
}

function tripCard(trip, { special = false } = {}) {
  return `<article class="trip-card ${special ? 'trip-card-special' : ''}">
    <a class="trip-photo-link" href="#/viagem/${encodeURIComponent(trip.id)}" aria-label="Ver ${escapeHtml(trip.title)}"><img src="${trip.image}" alt="${escapeHtml(trip.imageAlt || trip.title)}" loading="lazy" />${special ? '<span class="special-ribbon">Especial</span>' : ''}<span class="photo-chip">${escapeHtml(trip.category)}</span></a>
    <div class="trip-card-body">
      <div class="trip-card-top"><span>${escapeHtml(trip.kind)}</span><span aria-hidden="true">${icon('arrowUpRight', 17)}</span></div>
      <h3><a href="#/viagem/${encodeURIComponent(trip.id)}">${escapeHtml(trip.title)}</a></h3>
      ${trip.subtitle ? `<p class="trip-subtitle">${escapeHtml(trip.subtitle)}</p>` : ''}
      <p class="trip-date">${icon('calendar', 17)}<span>${escapeHtml(trip.date)}</span></p>
      <p class="seats-line" data-seats="${trip.id}">${seatsText(trip.id)}</p>
      <div class="trip-card-footer"><p class="trip-price"><small>A partir de</small><strong>${money(trip.price)}</strong></p><a class="trip-details-link" href="#/viagem/${encodeURIComponent(trip.id)}" aria-label="Ver detalhes de ${escapeHtml(trip.title)}">${icon('arrowRight', 20)}</a></div>
    </div>
  </article>`;
}

function renderHome() {
  const publishedTrips = TRIPS.filter(trip => trip.published);
  const specialTrips = publishedTrips.filter(isSpecialActive);
  const regularTrips = publishedTrips.filter(trip => !isSpecialActive(trip));
  const specialSection = specialTrips.length ? `<section class="special-events" aria-labelledby="special-title">
      <div class="special-heading"><div><span class="special-kicker">EVENTO ESPECIAL</span><h2 id="special-title">Viagens em destaque</h2><p>Experiências especiais por tempo limitado.</p></div></div>
      <div class="trip-grid special-trip-grid">${specialTrips.map(trip => tripCard(trip, { special: true })).join('')}</div>
    </section>` : '';
  const upcomingSection = regularTrips.length ? `<section class="featured" aria-labelledby="featured-title">
      <div class="section-heading"><div><span class="section-kicker">DESTINOS PARA VOCÊ</span><h2 id="featured-title">Próximas viagens</h2></div><a href="#/viagens">Ver todas ${icon('arrowRight', 18)}</a></div>
      <div class="trip-grid home-trip-grid">${regularTrips.map(trip => tripCard(trip)).join('')}</div>
    </section>` : '';
  app.innerHTML = `${header()}<main class="wrap page home-page" id="main">
    <section class="hero" aria-label="Conheça as viagens da Janu Turismo">
      <img src="./assets/lagoa-do-paraiso.webp" alt="Águas azuis e paisagem de praia" fetchpriority="high" />
      <div class="hero-shade"></div>
      <div class="hero-copy"><span class="hero-eyebrow">Janu Turismo <i></i> Ceará</span><h1>Viajar é viver <em>mais histórias.</em></h1><p>Descubra passeios para sair da rotina e aproveitar cada momento.</p><a class="hero-cta" href="#/viagens">Explorar viagens ${icon('arrowRight', 18)}</a></div>
      <span class="hero-index">01 / 03</span>
    </section>
    ${specialSection}
    ${upcomingSection}
  </main>${bottomNav('home')}`;
  document.title = 'Janu Turismo | Próximas viagens';
  refreshInventory();
}

function filteredTrips() {
  const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return TRIPS.filter(trip => {
    if (!trip.published) return false;
    const categoryMatches = filter === 'Todas' || trip.category === filter;
    const text = `${trip.title} ${trip.subtitle} ${trip.category}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return categoryMatches && text.includes(normalized);
  });
}

function updateList() {
  const grid = app.querySelector('#all-trips');
  if (!grid) return;
  const found = filteredTrips();
  grid.innerHTML = found.length ? found.map(tripCard).join('') : `<div class="empty-state"><h2>Nenhuma viagem encontrada</h2><p>Tente buscar outro destino ou escolha “Todas”.</p></div>`;
  app.querySelectorAll('[data-filter]').forEach(button => {
    button.classList.toggle('selected', button.dataset.filter === filter);
    button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
  });
}

function renderTrips() {
  app.innerHTML = `${header()}<main class="wrap page trips-page" id="main">
    <div class="list-intro"><h1>Viagens</h1><p>Escolha seu próximo destino</p></div>
    <label class="search-box">${icon('search', 23)}<span class="sr-only">Buscar destino</span><input id="search" type="search" autocomplete="off" placeholder="Buscar destino" aria-label="Buscar destino" /></label>
    <div class="filters" role="group" aria-label="Filtrar viagens">${['Todas', ...new Set(TRIPS.filter(t => t.published).map(t => t.category))].map(name => `<button type="button" data-filter="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}</div>
    <div id="all-trips" class="trip-grid" aria-live="polite"></div>
  </main>${bottomNav('trips')}`;
  app.querySelector('#search').value = query;
  app.querySelector('#search').addEventListener('input', event => { query = event.target.value; updateList(); });
  app.querySelector('.filters').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (button) { filter = button.dataset.filter; updateList(); }
  });
  updateList();
  document.title = 'Viagens | Janu Turismo';
  refreshInventory();
}

function detailSections(trip) {
  return `<div class="detail-lead"><p>${trip.blurb}</p></div>
    <section class="detail-section"><h2>Valores da viagem</h2><div class="price-options">${fares(trip).map(fare => `<div><span>${escapeHtml(fare.label)}${fare.boardingCity ? ` · saída ${escapeHtml(fare.boardingCity)}` : ''}</span><strong>${money(fare.amount)}</strong></div>`).join('')}</div><p class="section-note">O valor final e o pagamento são confirmados pela agência.</p></section>
    <section class="detail-section"><h2>Horários</h2><div class="pending-info">${icon('calendar', 22)}<span>${trip.startTime ? `Saída: ${escapeHtml(trip.startTime)}` : 'Saída: a confirmar'} · ${trip.arrivalTime ? `Chegada: ${escapeHtml(trip.arrivalTime)}` : 'Chegada: a confirmar'}</span></div></section>
    ${trip.includes.length ? `<section class="detail-section"><h2>O que está incluso</h2><ul class="includes-list">${trip.includes.map(([glyph, label]) => `<li>${icon(paths[glyph] ? glyph : 'check', 24)}<span>${escapeHtml(label)}</span></li>`).join('')}</ul></section>` : ''}
    ${trip.stops.length ? `<section class="detail-section"><h2>Roteiro do passeio</h2><ol class="stops-list">${trip.stops.map(([name, note], index) => `<li><span class="stop-number">${String(index + 1).padStart(2, '0')}</span><span><strong>${escapeHtml(name)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ''}</span></li>`).join('')}</ol></section>` : ''}
    ${trip.notice ? `<p class="notice">${escapeHtml(trip.notice)}</p>` : ''}
    <section class="detail-section"><h2>Embarque</h2>${trip.boarding.length ? `<div class="boarding-options">${trip.boarding.map(place => `<span>${icon('pin', 17)} ${escapeHtml(place)}</span>`).join('')}</div>` : `<div class="pending-info">${icon('pin', 22)}<span>Local de embarque a confirmar com a agência.</span></div>`}</section>
    ${trip.payment?.length ? `<p class="payment-info">Formas de pagamento: ${trip.payment.map(escapeHtml).join(' ou ')}.</p>` : ''}`;
}

function renderDetail(id) {
  const trip = TRIPS.find(item => item.id === id);
  if (!trip || !trip.published) { location.hash = '#/viagens'; return; }
  const boardingField = trip.boarding.length
    ? `<select name="boarding"><option value="">A combinar</option>${trip.boarding.map(place => `<option value="${escapeHtml(place)}">${escapeHtml(place)}</option>`).join('')}</select>`
    : '<input name="boarding" maxlength="80" placeholder="A combinar com a agência" />';
  app.innerHTML = `<header class="detail-header wrap"><a href="#/viagens" aria-label="Voltar às viagens">${icon('arrowLeft', 26)}</a><span>Detalhes da viagem</span><button type="button" id="share" aria-label="Compartilhar viagem">${icon('share', 25)}</button></header>
    <main class="wrap detail-page" id="main"><div class="detail-hero"><img class="detail-cover" src="${trip.image}" alt="${escapeHtml(trip.imageAlt || trip.title)}" /><div class="detail-hero-shade"></div><div class="detail-hero-text"><span>${escapeHtml(trip.kind)}</span><h1>${escapeHtml(trip.title)}</h1><p>${icon('calendar', 19)} ${escapeHtml(trip.date)}</p></div></div>
      <div class="detail-body">${trip.images?.length > 1 ? `<div class="detail-gallery">${trip.images.map((src, i) => `<button type="button" data-gallery="${i}" aria-label="Ver foto ${i + 1}"><img src="${src}" alt="Foto ${i + 1} de ${escapeHtml(trip.title)}" /></button>`).join('')}</div>` : ''}<div class="availability-panel">${icon('ticket', 22)}<div><strong data-seats="${trip.id}">${seatsText(trip.id)}</strong><small>As vagas são atualizadas quando uma reserva é concluída.</small></div></div>${detailSections(trip)}<a class="inline-contact" href="${waLink(`Olá, Janu Turismo! Tenho uma dúvida sobre ${trip.title}.`)}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 21)} Qualquer dúvida? Fale com a Janu</a></div></main>
    <div class="booking-bar"><div class="booking-inner"><div><small>A partir de</small><strong>${money(trip.price)}</strong><span>por pessoa</span></div><button type="button" id="reserve" data-trip="${trip.id}" disabled>${icon('ticket', 24)}<span>Fazer reserva</span></button></div></div>
    <dialog id="auth-dialog" aria-label="Acessar conta"><button class="auth-close" type="button" aria-label="Fechar">${icon('close', 22)}</button>${authPanel('Entre para reservar')}</dialog>
    <dialog id="reserve-dialog" aria-labelledby="reserve-title"><form id="reservation-form"><div class="dialog-heading"><div><span class="section-kicker">Janu Turismo</span><h2 id="reserve-title">Sua reserva</h2></div><button type="button" id="close-dialog" aria-label="Fechar">${icon('close', 22)}</button></div><p>${escapeHtml(trip.title)} • ${escapeHtml(trip.date)}</p>
      <div class="form-grid"><label>Nome<input name="firstName" required autocomplete="given-name" maxlength="60" placeholder="Seu nome" /></label><label>Sobrenome<input name="lastName" required autocomplete="family-name" maxlength="80" placeholder="Seu sobrenome" /></label></div>
      <label>CPF<input name="cpf" required inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" /></label>
      <label>Telefone com DDD<input name="phone" type="tel" required autocomplete="tel" inputmode="tel" maxlength="16" placeholder="(88) 99999-9999" /></label>
      <label>Valor / modalidade<select name="fare" required>${fares(trip).map((fare, index) => `<option value="${index}">${escapeHtml(fare.label)} · ${money(fare.amount)}${fare.seats > 1 ? ` / ${fare.seats} pessoas` : ''}${fare.boardingCity ? ` · ${escapeHtml(fare.boardingCity)}` : ''}</option>`).join('')}</select></label>
      <div class="form-grid"><label>Passageiros<input name="seats" type="number" min="1" max="10" value="1" required inputmode="numeric" /></label><label>Pagamento<select name="payment" required><option value="">Escolha</option>${(trip.payment?.length ? trip.payment : ['Pix', 'Cartão']).map(method => `<option value="${/cart[aã]o/i.test(method) ? 'cartao' : 'pix'}">${escapeHtml(method)}</option>`).join('')}</select></label></div>
      <label>Embarque desejado${boardingField}</label>
      <p class="dialog-note">Escolher Pix ou cartão não efetua o pagamento. A Janu confirmará os detalhes com você.</p>
      <label class="privacy-check"><input type="checkbox" name="consent" required /><span>Autorizo o uso dos meus dados para esta reserva e o contato da Janu Turismo.</span></label>
      <p id="form-error" class="form-error" role="alert" hidden></p><button class="dialog-submit" type="submit">Confirmar reserva ${icon('arrowRight', 19)}</button>
    </form></dialog>`;
  app.querySelector('#share').addEventListener('click', () => shareTrip(trip));
  app.querySelectorAll('[data-gallery]').forEach(button => button.onclick = () => { app.querySelector('.detail-cover').src = trip.images[Number(button.dataset.gallery)]; });
  const dialog = app.querySelector('#reserve-dialog');
  const authDialog = app.querySelector('#auth-dialog');
  const fareSelect = dialog.querySelector('[name="fare"]');
  const seatInput = dialog.querySelector('[name="seats"]');
  fareSelect.addEventListener('change', () => { const fare = fares(trip)[Number(fareSelect.value)]; seatInput.value = fare.seats || 1; seatInput.readOnly = fare.seats > 1; if (fare.boardingCity) dialog.querySelector('[name="boarding"]').value = fare.boardingCity; });
  app.querySelector('#reserve').addEventListener('click', async () => {
    await authReady;
    if (currentUser()) dialog.showModal(); else authDialog.showModal();
  });
  authDialog.querySelector('.auth-close').addEventListener('click', () => authDialog.close());
  bindAuth(authDialog, () => { authDialog.close(); dialog.showModal(); });
  app.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  app.querySelector('#reservation-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    const data = new FormData(event.target);
    const chosenFare = fares(trip)[Number(data.get('fare'))];
    const body = { tripId: trip.id, firstName: String(data.get('firstName')).trim(), lastName: String(data.get('lastName')).trim(), cpf: String(data.get('cpf')), phone: String(data.get('phone')), seats: Number(data.get('seats')), fareLabel: chosenFare.label, payment: String(data.get('payment')), boarding: String(data.get('boarding')).trim(), consent: data.get('consent') === 'on' };
    const errorEl = app.querySelector('#form-error');
    const submit = event.target.querySelector('button[type="submit"]');
    errorEl.hidden = true;
    if (chosenFare.boardingCity && body.boarding !== chosenFare.boardingCity) { errorEl.textContent = `Selecione o embarque em ${chosenFare.boardingCity} para este valor.`; errorEl.hidden = false; return; }
    if (!validCpfClient(body.cpf)) { errorEl.textContent = 'Confira o CPF informado.'; errorEl.hidden = false; return; }
    const state = inventory[trip.id];
    if (!inventoryReady || !state || state.demo || !state.enabled) { errorEl.textContent = 'Esta viagem ainda não está liberada para reservas.'; errorEl.hidden = false; return; }
    submit.disabled = true;
    submit.textContent = 'Registrando reserva…';
    try {
      const payload = await createBooking(body);
      lastBooking = { ...payload, token: payload.booking.id, cpf: body.cpf.replace(/\D/g, '') };
      dialog.close();
      location.hash = `#/reserva/${payload.booking.id}`;
    } catch (error) {
      errorEl.textContent = error.message; errorEl.hidden = false;
      submit.disabled = false; submit.innerHTML = `Confirmar reserva ${icon('arrowRight', 19)}`;
      refreshInventory();
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
  const url = `${location.origin}${location.pathname}#/viagem/${trip.id}`;
  try {
    if (navigator.share) await navigator.share({ title: `${trip.title} | Janu Turismo`, url });
    else { await navigator.clipboard.writeText(url); showToast('Link da viagem copiado'); }
  } catch (error) {
    if (error.name !== 'AbortError') showToast('Não foi possível compartilhar o link');
  }
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function renderContact() {
  const greeting = waLink('Olá, Janu Turismo! Vim pelo site e gostaria de saber mais sobre as próximas viagens.');
  app.innerHTML = `${header()}<main class="wrap page contact-page" id="main"><h1>Fale com a Janu</h1><p>Qualquer dúvida sobre viagens ou sobre a sua reserva? Nossa equipe pode ajudar.</p><a class="contact-button" href="${greeting}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 26)} Entrar em contato ${icon('arrowUpRight', 19)}</a><a class="back-to-trips" href="#/viagens">Ver próximas viagens ${icon('arrowRight', 18)}</a></main>${bottomNav('contact')}`;
  document.title = 'Contato | Janu Turismo';
}

function paymentLabel(value) { return value === 'pix' ? 'Pix' : value === 'cartao' ? 'Cartão' : 'A combinar'; }
function statusLabel(value) { return value === 'confirmed' ? 'Confirmada pela Janu' : value === 'cancelled' ? 'Cancelada' : 'Aguardando confirmação da Janu'; }

function bookingContent(booking, token, demo = false) {
  const trip = TRIPS.find(item => item.id === booking.tripId);
  const name = `${booking.firstName} ${booking.lastName}`;
  const recentCpf = lastBooking?.token === token ? lastBooking.cpf : null;
  const message = `Olá, Janu Turismo! Fiz uma reserva pelo site e gostaria de confirmar os detalhes.\n\nReserva: ${booking.id}\nViagem: ${trip?.title || 'Viagem'}\nData: ${trip?.date || 'A confirmar'}\nNome: ${name}\nCPF: ${recentCpf || `final ${booking.cpfLast4}`}\nTelefone: ${booking.phone}\nPassageiros: ${booking.seats}\nEmbarque: ${booking.boarding || 'a combinar'}\nPagamento escolhido: ${paymentLabel(booking.payment)}\n\nPodem confirmar minha reserva?`;
  return `<div class="confirmation-card ${demo ? 'preview-card' : ''}">
    <span class="confirmation-icon">${icon(demo ? 'user' : 'check', 30)}</span>
    <span class="section-kicker">${demo ? 'EXEMPLO DE RESERVA' : 'RESERVA REGISTRADA'}</span>
    <h1>${demo ? 'Veja como ficará sua reserva' : 'Sua viagem começa aqui!'}</h1>
    <p>${demo ? 'Esta é uma visualização. Nenhuma vaga foi reservada e seus dados não foram enviados.' : 'Seus lugares foram separados. A Janu Turismo confirmará os detalhes e o pagamento com você.'}</p>
    <div class="booking-reference"><span>Número da reserva</span><strong>${escapeHtml(booking.id)}</strong></div>
    <div class="booking-summary">
      <div><span>Destino</span><strong>${escapeHtml(trip?.title || 'Viagem')}</strong></div>
      <div><span>Data</span><strong>${escapeHtml(trip?.date || 'A confirmar')}</strong></div>
      <div><span>Passageiro responsável</span><strong>${escapeHtml(name)}</strong></div>
      <div><span>CPF</span><strong>***.***.***-${escapeHtml(booking.cpfLast4)}</strong></div>
      <div><span>Telefone</span><strong>${escapeHtml(booking.phone)}</strong></div>
      <div><span>Passageiros</span><strong>${booking.seats}</strong></div>
      ${booking.fareLabel ? `<div><span>Modalidade</span><strong>${escapeHtml(booking.fareLabel)}</strong></div>` : ''}
      <div><span>Pagamento escolhido</span><strong>${paymentLabel(booking.payment)}</strong></div>
      <div><span>Embarque</span><strong>${escapeHtml(booking.boarding || 'A combinar')}</strong></div>
    </div>
    <p class="booking-status">${icon('calendar', 18)} ${demo ? 'Demonstração · vagas fictícias' : statusLabel(booking.status)}</p>
    ${!demo ? `<a class="contact-button full-button" href="${waLink(booking.status === 'cancelled' ? `Olá, Janu Turismo! Tenho uma dúvida sobre a reserva ${booking.id}.` : message)}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 24)} ${booking.status === 'cancelled' ? 'Falar sobre esta reserva' : 'Enviar reserva para a Janu'} ${icon('arrowUpRight', 18)}</a><button class="copy-link" id="copy-booking" type="button">${icon('copy', 18)} Copiar link da reserva</button>` : '<p class="preview-explain">Para ativar reservas reais, a agência deve cadastrar as vagas e conectar o Firebase.</p>'}
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
    bindAuth(view, () => renderConfirmation(token));
    return;
  }
  try {
    const { booking } = lastBooking?.token === token && lastBooking.booking.uid === currentUser().uid ? lastBooking : await getBooking(token);
    if (!view.isConnected) return;
    view.innerHTML = bookingContent(booking, token);
    view.querySelector('#copy-booking').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(location.href); showToast('Link copiado'); }
      catch { showToast('Não foi possível copiar o link'); }
    });
  } catch (error) { view.innerHTML = `<div class="empty-state"><h2>Não conseguimos abrir a reserva</h2><p>${escapeHtml(error.message)}</p></div>`; }
  document.title = 'Minha reserva | Janu Turismo';
}

async function renderMyReservations() {
  app.innerHTML = `${header()}<main class="wrap page booking-page" id="main"><div class="bookings-intro"><span class="section-kicker">SUAS VIAGENS</span><h1>Minhas reservas</h1><p>Entre na sua conta para acompanhar suas reservas em qualquer aparelho.</p></div><div id="bookings-list" class="bookings-list"></div><a class="inline-contact" href="${waLink('Olá, Janu Turismo! Tenho uma dúvida sobre minha reserva.')}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 22)} Qualquer dúvida? Entrar em contato</a></main>${bottomNav('bookings')}`;
  document.title = 'Minhas reservas | Janu Turismo';
  const list = app.querySelector('#bookings-list');
  await authReady;
  if (!currentUser()) {
    list.innerHTML = authPanel('Acesse suas reservas');
    bindAuth(list, renderMyReservations);
    return;
  }
  list.innerHTML = `<p class="signed-account">Conta: ${escapeHtml(currentUser().email)} <button id="sign-out" type="button">Sair</button></p>`;
  list.querySelector('#sign-out').addEventListener('click', async () => { await logout(); renderMyReservations(); });
  const resultsHolder = document.createElement('div');
  list.append(resultsHolder);
  resultsHolder.innerHTML = '<p class="loading-state">Carregando suas reservas…</p>';
  try {
    const bookings = await myBookings();
    if (!resultsHolder.isConnected) return;
    resultsHolder.innerHTML = bookings.length ? bookings.map(booking => `<a class="my-booking-card" href="#/reserva/${booking.id}"><img src="${TRIPS.find(trip => trip.id === booking.tripId)?.image || './assets/logo-janu.png'}" alt="" /><span><small>${escapeHtml(booking.id)} · ${escapeHtml(statusLabel(booking.status))}</small><strong>${escapeHtml(tripName(booking.tripId))}</strong><em>${booking.seats} ${booking.seats === 1 ? 'passageiro' : 'passageiros'}</em></span>${icon('arrowRight', 20)}</a>`).join('') : `<div class="empty-reservations">${icon('ticket', 38)}<h2>Nenhuma reserva por aqui</h2><p>Escolha um destino e faça sua primeira reserva.</p><a href="#/viagens">Explorar viagens ${icon('arrowRight', 18)}</a></div>`;
  } catch (error) { resultsHolder.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`; }
}

async function adminFetch(method = 'GET', body) {
  if (method === 'GET') return adminGet(TRIPS.map(trip => trip.id));
  if (method === 'PUT') return adminSetCapacity(body);
  return adminSetStatus(body);
}

function renderProfile() {
  app.innerHTML = `${header()}<main class="wrap page booking-page" id="main"><div class="bookings-intro"><span class="section-kicker">SUA CONTA</span><h1>Meu perfil</h1></div><div id="profile-content"></div></main>${bottomNav('bookings')}`;
  const holder = app.querySelector('#profile-content');
  authReady.then(async () => {
    if (!holder.isConnected) return;
    if (!currentUser()) { holder.innerHTML = authPanel('Entre ou crie sua conta'); bindAuth(holder, renderProfile); return; }
    holder.innerHTML = `<div class="profile-card">${icon('user', 34)}<h2>${escapeHtml(currentUser().displayName || currentUser().email.split('@')[0])}</h2><p>${escapeHtml(currentUser().email)}</p><a href="#/reservas">Minhas reservas ${icon('arrowRight', 18)}</a><div id="agency-link"></div><button id="profile-logout" type="button">Sair da conta</button></div>`;
    holder.querySelector('#profile-logout').addEventListener('click', async () => { await logout(); renderProfile(); });
    try { await adminFetch(); if (holder.isConnected) holder.querySelector('#agency-link').innerHTML = '<a href="#/gestao">Área da Janu Turismo →</a>'; } catch { /* conta de cliente */ }
  });
}

const lines = value => String(value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
function fareRow(fare = { label: '', amount: '', seats: 1 }) {
  return `<div class="fare-row" data-fare-row><input name="fareLabel" aria-label="Nome da opção" placeholder="Individual, casal, criança" maxlength="80" value="${escapeHtml(fare.label)}" required /><input name="fareAmount" aria-label="Valor em reais" type="number" min="0" step="0.01" placeholder="Valor R$" value="${fare.amount}" required /><input name="fareSeats" aria-label="Pessoas na opção" type="number" min="1" max="10" value="${fare.seats || 1}" required /><input name="fareCity" aria-label="Embarque desta opção" placeholder="Cidade opcional" maxlength="80" value="${escapeHtml(fare.boardingCity || '')}" /><button type="button" data-remove-fare aria-label="Remover opção">×</button></div>`;
}
function tripEditor(trip = null) {
  const editing = Boolean(trip);
  const t = trip || { title: '', subtitle: '', category: 'Praia', kind: 'Bate e volta', date: '', price: 0, boarding: [], includes: [], stops: [], payment: ['Pix', 'Cartão'], images: [], published: false, special: false, specialUntil: '' };
  return `<form id="trip-editor" class="admin-editor"><h2>${editing ? 'Editar viagem' : 'Adicionar viagem'}</h2><p>Preencha os dados que se aplicam a este passeio. Horários e itens opcionais podem ficar vazios.</p>
    <div class="form-grid"><label>Destino / nome<input name="title" value="${escapeHtml(t.title)}" maxlength="100" required /></label><label>Chamada curta<input name="subtitle" value="${escapeHtml(t.subtitle || '')}" maxlength="100" placeholder="Ex.: Natal de Luz" /></label></div>
    <div class="form-grid"><label>Tipo<select name="kind">${['Bate e volta', 'Viagem com hospedagem', 'Passeio', 'Excursão'].map(kind => `<option ${kind === t.kind ? 'selected' : ''}>${kind}</option>`).join('')}</select></label><label>Categoria<input name="category" value="${escapeHtml(t.category || 'Praia')}" maxlength="40" placeholder="Praia, Serra, Parque..." required /></label></div>
    <label>Data exibida<input name="date" value="${escapeHtml(t.date || '')}" placeholder="Ex.: 19 e 20 de dezembro" maxlength="80" required /></label>
    <div class="form-grid"><label>Horário de saída (opcional)<input name="startTime" value="${escapeHtml(t.startTime || '')}" placeholder="Ex.: 04h30" maxlength="60" /></label><label>Horário de chegada (opcional)<input name="arrivalTime" value="${escapeHtml(t.arrivalTime || '')}" placeholder="Ex.: 22h" maxlength="60" /></label></div>
    <label>Descrição curta<textarea name="blurb" rows="2" maxlength="400">${escapeHtml(t.blurb || '')}</textarea></label>
    <fieldset><legend>Valores e modalidades</legend><p>Informe cada valor anunciado. “Pessoas” indica quantas vagas a modalidade usa.</p><div id="fare-rows">${fares(t).map(fareRow).join('')}</div><button type="button" id="add-fare">+ Adicionar valor</button></fieldset>
    <div class="form-grid"><label>Incluído no pacote (um por linha)<textarea name="includes" rows="5" placeholder="Transporte ida e volta&#10;Café da manhã">${escapeHtml(t.includes.map(item => item[1]).join('\n'))}</textarea></label><label>Roteiro / locais visitados (um por linha)<textarea name="stops" rows="5" placeholder="Lagoa do Paraíso&#10;Praia do Preá">${escapeHtml(t.stops.map(item => item[0]).join('\n'))}</textarea></label></div>
    <label>Cidades de embarque (uma por linha)<textarea name="boarding" rows="3" placeholder="Boa Viagem&#10;Pedra Branca">${escapeHtml(t.boarding.join('\n'))}</textarea></label>
    <label>Avisos, entradas pagas à parte e atividades opcionais<textarea name="notice" rows="3" placeholder="Ex.: Entrada no parque não inclusa">${escapeHtml(t.notice || '')}</textarea></label>
    <label>Formas e condições de pagamento<textarea name="payment" rows="2" placeholder="Pix&#10;Cartão (com acréscimo)">${escapeHtml((t.payment || []).join('\n'))}</textarea></label>
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
    const data = { id, title: String(d.get('title')).trim(), subtitle: String(d.get('subtitle')).trim(), category: String(d.get('category')).trim(), kind: String(d.get('kind')), date: String(d.get('date')).trim(), startTime: String(d.get('startTime')).trim(), arrivalTime: String(d.get('arrivalTime')).trim(), blurb: String(d.get('blurb')).trim(),
      price: options[0].amount, priceNote: options[0].label, fareOptions: options, includes: lines(d.get('includes')).map(item => ['check', item]), stops: lines(d.get('stops')).map(item => [item, '']), boarding: lines(d.get('boarding')), notice: String(d.get('notice')).trim(), payment: lines(d.get('payment')), images, image: trip?.image || './assets/logo-janu.png', published: d.get('published') === 'on', special: d.get('special') === 'on', specialUntil: String(d.get('specialUntil') || '') };
    const button = form.querySelector('[type="submit"]'); button.disabled = true;
    try { await adminSaveTrip(data); await loadCatalog(); await loadAdmin(); showToast('Viagem salva. Configure e libere as vagas.'); }
    catch (error) { const warning = form.querySelector('#trip-error'); warning.textContent = error.message; warning.hidden = false; button.disabled = false; }
  });
}

function renderAdmin() {
  app.innerHTML = `<main class="wrap admin-page"><a href="#/">${icon('arrowLeft', 20)} Voltar ao site</a><h1>Gestão de reservas</h1><p>Área da Janu Turismo</p><div id="admin-login">${authPanel('Entre com a conta da agência')}</div><div id="admin-content"></div></main>`;
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
  const { trips, bookings } = await adminFetch();
  const content = app.querySelector('#admin-content');
  if (!content) return;
  content.innerHTML = `<div class="admin-toolbar"><h2>Viagens e vagas</h2><button type="button" id="new-trip">+ Adicionar viagem</button></div><p>Defina a capacidade real antes de liberar reservas. Viagens desmarcadas ficam sem novos agendamentos.</p><div class="admin-trips">${trips.map(trip => `<form class="admin-trip" data-id="${trip.id}"><strong>${escapeHtml(tripName(trip.id))}</strong><span>${trip.reserved} reservadas · ${trip.available} restantes ${trip.demo ? '(vagas não configuradas)' : ''}</span><label>Total de vagas<input name="capacity" type="number" min="0" max="500" value="${trip.capacity}" required /></label><label class="admin-toggle"><input name="enabled" type="checkbox" ${trip.enabled ? 'checked' : ''} /> Liberar reservas</label><button type="submit">Salvar vagas</button><button type="button" data-edit="${escapeHtml(trip.id)}">Editar informações e fotos</button></form>`).join('')}</div><div id="admin-editor-slot"></div>
    <section class="manual-section"><h2>Adicionar reserva recebida pelo WhatsApp</h2><p>O passageiro ocupa as vagas imediatamente. Informe o e-mail usado no site para mostrar a reserva na conta dele.</p><form id="manual-booking" class="admin-editor"><label>Viagem<select name="tripId" required>${TRIPS.map(trip => `<option value="${escapeHtml(trip.id)}">${escapeHtml(trip.title)} · ${escapeHtml(trip.date)}</option>`).join('')}</select></label><div class="form-grid"><label>Nome<input name="firstName" required /></label><label>Sobrenome<input name="lastName" required /></label></div><div class="form-grid"><label>CPF<input name="cpf" inputmode="numeric" maxlength="14" required /></label><label>Telefone<input name="phone" type="tel" required /></label></div><div class="form-grid"><label>Quantidade de vagas<input name="seats" type="number" min="1" max="10" value="1" required /></label><label>Embarque<input name="boarding" placeholder="Cidade / local" maxlength="80" /></label></div><label>E-mail do cliente no site (opcional)<input name="email" type="email" placeholder="Para aparecer em Minhas reservas" /></label><button type="submit">Salvar passageiro e descontar vagas</button><p id="manual-error" class="form-error" hidden></p></form></section>
    <h2>Últimas reservas</h2><div class="admin-bookings">${bookings.length ? bookings.map(booking => `<article><strong>${escapeHtml(booking.id)} · ${escapeHtml(tripName(booking.tripId))}</strong><p>${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)} · CPF final ${escapeHtml(booking.cpfLast4)} · ${escapeHtml(booking.phone)}</p><p>${booking.seats} passageiros · ${booking.source === 'whatsapp' ? 'WhatsApp · ' : ''}${paymentLabel(booking.payment)} · ${escapeHtml(statusLabel(booking.status))}</p>${booking.status === 'pending' ? `<button data-action="confirmed" data-id="${booking.id}">Confirmar</button>` : ''}${booking.status !== 'cancelled' ? `<button data-action="cancelled" data-id="${booking.id}">Cancelar e liberar vagas</button>` : ''}</article>`).join('') : '<p>Nenhuma reserva registrada.</p>'}</div>`;
  content.querySelector('#new-trip').onclick = () => openTripEditor();
  content.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => openTripEditor(TRIPS.find(trip => trip.id === button.dataset.edit)));
  content.querySelector('#manual-booking').addEventListener('submit', async event => {
    event.preventDefault(); const form = event.target, d = new FormData(form), button = form.querySelector('[type="submit"]'); button.disabled = true;
    try {
      const result = await adminManualBooking(Object.fromEntries(d));
      await loadAdmin(); showToast(result.linked ? 'Reserva salva e vinculada à conta do cliente.' : 'Reserva salva. Cliente sem conta vinculada.');
    } catch (error) { const warning = form.querySelector('#manual-error'); warning.textContent = error.message; warning.hidden = false; button.disabled = false; }
  });
  content.querySelectorAll('.admin-trip').forEach(form => form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button'); button.disabled = true;
    try { await adminFetch('PUT', { tripId: form.dataset.id, capacity: Number(form.elements.capacity.value), enabled: form.elements.enabled.checked }); await loadAdmin(); showToast('Vagas atualizadas'); }
    catch (error) { showToast(error.message); button.disabled = false; }
  }));
  content.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try { await adminFetch('PATCH', { id: button.dataset.id, status: button.dataset.action }); await loadAdmin(); showToast('Reserva atualizada'); }
    catch (error) { showToast(error.message); button.disabled = false; }
  }));
}

function render() {
  const route = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/').filter(Boolean);
  if (route[0] === 'viagem' && route[1]) renderDetail(route[1]);
  else if (route[0] === 'reserva' && route[1]) renderConfirmation(route[1]);
  else if (route[0] === 'reserva-demo') renderConfirmation(null, true);
  else if (route[0] === 'reservas') renderMyReservations();
  else if (route[0] === 'perfil') renderProfile();
  else if (route[0] === 'gestao') renderAdmin();
  else if (route[0] === 'viagens') renderTrips();
  else if (route[0] === 'contato') renderContact();
  else renderHome();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

window.addEventListener('hashchange', render);
render();
authReady.then(() => { if (location.hash === '' || location.hash === '#/' || location.hash === '#/perfil') render(); });
loadCatalog();
