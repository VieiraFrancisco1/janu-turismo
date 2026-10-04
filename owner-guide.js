// O tutorial usa os mesmos cards do painel com uma reserva de exemplo.
// Todos os cliques ficam neste diálogo; ele não chama o banco nem o WhatsApp.
const openedAccounts = new Set();
let closeActiveTutorial;
const storageKey = ownerId => `janu:owner-tutorial:v1:${ownerId}`;

function alreadySeen(ownerId) {
  if (openedAccounts.has(ownerId)) return true;
  try { return Boolean(window.localStorage.getItem(storageKey(ownerId))); }
  catch { return false; }
}

export function initOwnerGuide(options) {
  const button = options.root.querySelector('[data-owner-guide]');
  const open = () => openOwnerTutorial(options);
  button?.addEventListener('click', open);
  if (options.ownerId && !alreadySeen(options.ownerId) && !closeActiveTutorial) open();
  // O guia continua aberto quando a lista de reservas é atualizada.
  return () => button?.removeEventListener('click', open);
}

export function openOwnerTutorial({ ownerId, renderTrips, renderTrip }) {
  closeActiveTutorial?.(false);
  const previousFocus = document.activeElement;
  const startHash = location.hash;
  const dialog = document.createElement('dialog');
  dialog.className = 'owner-guide owner-control';
  dialog.setAttribute('aria-label', 'Tutorial do controle de reservas');
  dialog.innerHTML = `<header class="owner-guide-top"><div><strong>Tutorial da Janu</strong><span>Treine com uma reserva de exemplo</span></div><button type="button" data-guide-exit>Continuar depois</button></header>
    <div class="owner-guide-stage"></div>
    <div class="owner-guide-spotlight" aria-hidden="true"></div>
    <section class="owner-guide-hint" aria-live="polite" aria-atomic="true"><svg class="owner-guide-arrow" viewBox="0 0 32 34" aria-hidden="true"><path d="M16 32V3M5 14 16 3l11 11"/></svg><span class="owner-guide-progress"></span><h2 id="owner-guide-title"></h2><p id="owner-guide-text"></p><strong class="owner-guide-instruction">Toque no botão destacado.</strong></section>`;
  const stage = dialog.querySelector('.owner-guide-stage');
  const spotlight = dialog.querySelector('.owner-guide-spotlight');
  const hint = dialog.querySelector('.owner-guide-hint');
  const exit = dialog.querySelector('[data-guide-exit]');
  let stepIndex = 0;
  let target;
  let frame;
  let closed = false;
  let resizeObserver;

  const welcome = (finished = false) => {
    stage.innerHTML = `<section class="owner-guide-welcome"><span class="section-kicker">${finished ? 'VOCÊ CONCLUIU O TUTORIAL' : 'VAMOS APRENDER JUNTAS'}</span><h1>${finished ? 'Pronto! Você já conhece o painel.' : 'Um passo de cada vez'}</h1><p>${finished ? 'Para rever as explicações, toque em “Como usar o painel” sempre que precisar.' : 'Siga a seta e toque no botão indicado. Vamos praticar com uma reserva de exemplo.'}</p><button type="button" ${finished ? 'data-guide-finish' : 'data-guide-start'}>${finished ? 'Concluir tutorial' : 'Começar tutorial'}</button></section>`;
  };
  const overview = () => { stage.innerHTML = `<h1>Escolha a viagem</h1><p class="owner-demo-label">Viagem de exemplo para praticar</p><div class="admin-reservation-trips">${renderTrips()}</div>`; };
  const detail = (status = 'pending') => { stage.innerHTML = renderTrip(status); };
  const steps = [
    { target: '[data-guide-start]', title: 'Vamos conhecer o painel', text: 'Você vai aprender a encontrar clientes, confirmar pagamentos e organizar a viagem.', prepare: welcome, action: overview },
    { target: '[data-guide="trip"]', title: '1. Abra a viagem', text: 'Cada card é uma viagem. Toque em “Ver clientes” para abrir as reservas dela.', action: () => detail() },
    { target: '[data-guide="clients"]', title: '2. Veja os clientes', text: 'Aqui estão as vagas da viagem. Este botão leva direto à lista de clientes e pagamentos.', action() {} },
    { target: '[data-action="confirmed"]', title: '3. Confirme um pagamento', text: 'Recebeu o pagamento deste cliente? Toque em “Marcar como pago”. O card fica verde.', action: () => detail('confirmed') },
    { target: '[data-action="pending"]', title: '4. Corrija se precisar', text: 'Marcou como pago por engano? Este botão devolve a reserva para pendente. O card fica amarelo.', action: () => detail() },
    { target: '[data-guide="whatsapp"]', title: '5. Converse com o cliente', text: 'Este botão abre o WhatsApp do cliente para combinar pagamento e detalhes. Toque para conhecer a função.', action() {} },
    { target: '[data-add-passenger]', title: '6. Inclua um passageiro', text: 'Uma pessoa reservou pelo WhatsApp? Use este botão para preencher os dados e incluir a reserva na viagem.', action: () => { stage.querySelector('#trip-manual-booking').hidden = false; } },
    { target: '[data-close-passenger]', title: 'Feche o formulário', text: 'Depois de preencher os dados, “Salvar passageiro” registra a reserva. Para sair sem salvar, toque em “Fechar formulário”.', action: () => { stage.querySelector('#trip-manual-booking').hidden = true; } },
    { target: '[data-guide="vacancies"]', title: '7. Organize as vagas', text: 'Toque aqui para informar o total de lugares da viagem e escolher o aviso que aparece no site.', action: () => { stage.querySelector('.admin-vacancy-details').open = true; } },
    { target: '[data-guide="save-vacancies"]', scope: '[data-capacity-control]', title: 'Salve a quantidade de vagas', text: 'Depois de mudar o total de lugares, toque em “Salvar vagas”. Vamos praticar o clique neste exemplo.', action: () => { stage.querySelector('.admin-vacancy-details').open = false; } },
    { target: '[data-guide="other-actions"]', title: '8. Outras opções da reserva', text: 'As opções menos usadas ficam separadas. Abra aqui para encontrar “Excluir reserva”.', action: () => { stage.querySelector('.admin-other-actions').open = true; } },
    { target: '[data-delete-booking]', title: 'Excluir uma reserva', text: 'Este botão apaga a reserva e libera as vagas. No painel, você confirma antes de excluir. Agora treine com o exemplo.', action: () => {
      stage.querySelector('.admin-trip-clients').innerHTML = '<p class="empty-state compact-empty">Reserva de exemplo excluída.</p>';
      stage.querySelector('.admin-payment-summary').innerHTML = '<span class="admin-payment-summary-pending">0 pendentes</span>';
      const metrics = stage.querySelectorAll('.admin-seat-metrics strong');
      metrics[1].textContent = '0'; metrics[2].textContent = '40';
    } },
    { target: '[data-guide="back"]', title: '9. Volte para as viagens', text: 'Use este botão para escolher outra viagem e abrir os clientes dela.', action: () => welcome(true) },
    { target: '[data-guide-finish]', title: 'Tudo pronto', text: 'No painel, use a busca para achar um cliente. “Pendentes” e “Pagos” ajudam a separar os pagamentos.', action: () => close(true) },
  ];

  function position() {
    frame = null;
    if (closed || !target?.isConnected) return;
    const bounds = dialog.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const viewWidth = bounds.width || window.innerWidth;
    const viewHeight = window.visualViewport?.height || bounds.height || window.innerHeight;
    const x = Math.max(6, rect.left - 5);
    const y = Math.max(0, rect.top - 5);
    const width = Math.max(1, Math.min(rect.width + 10, viewWidth - x - 6));
    spotlight.style.left = `${x}px`;
    spotlight.style.top = `${y}px`;
    spotlight.style.width = `${width}px`;
    spotlight.style.height = `${rect.height + 10}px`;
    const hintWidth = Math.min(380, viewWidth - 28);
    hint.style.width = `${hintWidth}px`;
    const left = Math.max(14, Math.min(rect.left + rect.width / 2 - hintWidth / 2, viewWidth - hintWidth - 14));
    const hintHeight = hint.getBoundingClientRect().height;
    const below = rect.bottom + hintHeight + 26 <= viewHeight - 12;
    const top = below ? rect.bottom + 26 : Math.max(78, rect.top - hintHeight - 26);
    hint.style.left = `${left}px`;
    hint.style.top = `${Math.min(top, Math.max(12, viewHeight - hintHeight - 12))}px`;
    hint.classList.toggle('is-above', !below);
    hint.style.setProperty('--arrow-left', `${Math.max(20, Math.min(hintWidth - 44, rect.left + rect.width / 2 - left - 16))}px`);
  }
  function schedule() { if (!closed && !frame) frame = requestAnimationFrame(position); }
  function updateStep() {
    if (closed) return;
    const step = steps[stepIndex];
    target?.removeAttribute('aria-describedby');
    target = stage.querySelector(step.target);
    if (!target) { close(false); return; }
    hint.querySelector('.owner-guide-progress').textContent = `Passo ${stepIndex + 1} de ${steps.length}`;
    hint.querySelector('h2').textContent = step.title;
    hint.querySelector('p').textContent = step.text;
    target.setAttribute('aria-describedby', 'owner-guide-title owner-guide-text');
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
    target.focus({ preventScroll: true });
    schedule();
  }
  function close(completed = false, remember = true) {
    if (closed) return;
    closed = true;
    if (ownerId && remember) {
      try { window.localStorage.setItem(storageKey(ownerId), completed ? 'done' : 'later'); } catch { /* mantém a lembrança nesta sessão */ }
    }
    if (frame) cancelAnimationFrame(frame);
    resizeObserver?.disconnect();
    window.removeEventListener('resize', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
    window.removeEventListener('hashchange', onNavigate);
    if (dialog.open) dialog.close();
    dialog.remove();
    document.body.classList.remove('owner-guide-open');
    if (closeActiveTutorial === close) closeActiveTutorial = undefined;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function onNavigate() { if (location.hash !== startHash) close(false, false); }
  dialog.addEventListener('click', event => {
    const clicked = event.target.closest('button, a, summary');
    if (!clicked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (clicked === exit) { close(false); return; }
    if (clicked !== target) return;
    steps[stepIndex].action();
    if (closed) return;
    stepIndex++;
    updateStep();
  }, true);
  dialog.addEventListener('submit', event => { event.preventDefault(); event.stopImmediatePropagation(); }, true);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(false); });
  dialog.addEventListener('close', () => close(false));
  dialog.addEventListener('scroll', schedule, true);
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const scope = steps[stepIndex].scope && stage.querySelector(steps[stepIndex].scope);
    const controls = scope ? [...scope.querySelectorAll('input, select, button')].filter(el => !el.disabled && el.type !== 'hidden') : [target];
    controls.push(exit);
    const index = controls.indexOf(document.activeElement);
    const next = (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    event.preventDefault(); controls[next].focus({ preventScroll: true });
  });
  document.body.append(dialog);
  document.body.classList.add('owner-guide-open');
  closeActiveTutorial = close;
  if (ownerId) openedAccounts.add(ownerId);
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.addEventListener('hashchange', onNavigate);
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(stage); resizeObserver.observe(hint);
  }
  steps[0].prepare();
  dialog.showModal();
  updateStep();
  return close;
}
