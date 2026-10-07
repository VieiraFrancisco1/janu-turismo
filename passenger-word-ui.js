import { inspectPassengerWord, fillPassengerWord, downloadPassengerWord, MAX_WORD_BYTES } from './passenger-word.js';
import { WORD_FIELDS, PERSONAL_FIELDS, buildTripPassengers, passengerWordValue, passengerWordIssues, passengerRecordGroups, normalizePassenger } from './passenger-records.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const signature = snapshot => JSON.stringify(snapshot.bookings.filter(booking => booking.tripId === snapshot.trip.id && ['pending', 'confirmed'].includes(booking.status)).map(booking => [booking.id, booking.seats, booking.status, booking.boarding]).sort((a, b) => a[0].localeCompare(b[0])));
const labelFor = (field, columns) => WORD_FIELDS.find(item => item[0] === field)?.[1] || columns.find(column => column.field === field)?.label || 'Informação';

export function mountPassengerWord(root, { getSnapshot, saveRecords, onClose, onDownload }) {
  let active = true, busy = false, revision = 0, snapshot, people = [], model, table, columns = [];
  const dirty = new Map();
  root.innerHTML = `<div class="word-panel-heading"><h3>Preencher Word da viagem</h3><button type="button" data-word-close>Fechar</button></div>
    <p>Envie o modelo recebido pelo local da viagem. Confira os dados e baixe o Word preenchido.</p>
    <label class="word-file-label">1. Enviar modelo Word (.docx)<input type="file" data-word-file accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" /></label>
    <p class="word-file-hint">Até 10 MB. O modelo precisa ter uma tabela de passageiros. Para arquivos .doc, salve uma cópia em .docx no Word.</p>
    <p data-word-message role="status" aria-live="polite"></p>
    <div data-word-content hidden></div>`;
  const message = root.querySelector('[data-word-message]');
  const fileInput = root.querySelector('[data-word-file]');
  const content = root.querySelector('[data-word-content]');
  const alive = () => active && root.isConnected;
  const tell = (value, error = false) => { if (alive()) { message.textContent = value; message.classList.toggle('is-error', error); } };
  root.querySelector('[data-word-close]').addEventListener('click', () => { if (!busy) onClose(); });
  const fields = () => [...new Set(['name', ...columns.map(column => column.field).filter(field => PERSONAL_FIELDS.includes(field) || field.startsWith('extra:'))])];

  function validPeople() {
    const cpfs = new Set();
    for (let index = 0; index < people.length; index++) {
      try { normalizePassenger(people[index]); }
      catch (error) { return `Passageiro ${index + 1}: ${error.message}`; }
      const cpf = String(people[index].cpf || '').replace(/\D/g, '');
      if (cpf && cpfs.has(cpf)) return `Passageiro ${index + 1}: este CPF já está em outro passageiro da lista.`;
      if (cpf) cpfs.add(cpf);
    }
    return '';
  }

  function updateStatus() {
    if (!model || !alive()) return;
    const issues = passengerWordIssues(people, columns);
    const invalid = validPeople();
    const status = content.querySelector('[data-word-status]');
    const blankControl = content.querySelector('[data-word-blank-control]');
    const allowBlank = content.querySelector('[data-word-allow-blank]');
    blankControl.hidden = !issues.length;
    status.textContent = invalid || (issues.length ? `${issues.length} ${issues.length === 1 ? 'campo faltando' : 'campos faltando'}. Complete abaixo. Campos vazios ficam em branco no Word.` : `${people.length} ${people.length === 1 ? 'passageiro pronto' : 'passageiros prontos'} para preencher o Word.`);
    status.classList.toggle('is-error', Boolean(invalid));
    content.querySelector('[data-word-download]').disabled = busy || table.filled || !people.length || Boolean(invalid) || (issues.length > 0 && !allowBlank.checked);
    content.querySelector('[data-word-save]').disabled = busy || table.filled || !people.length || Boolean(invalid);
    content.querySelectorAll('[data-person-field]').forEach(input => {
      const person = people[Number(input.dataset.personIndex)];
      input.classList.toggle('word-missing', !passengerWordValue(person, input.dataset.personField, Number(input.dataset.personIndex)) && columns.some(column => column.field === input.dataset.personField));
    });
  }

  function renderPeople() {
    const personFields = fields();
    content.querySelector('[data-word-people]').innerHTML = people.map((person, index) => `<fieldset class="word-person"><legend>Passageiro ${index + 1}${person.name ? ` — ${escape(person.name)}` : ' — completar nome'}</legend>
      <p>${person.slot === 0 ? 'Responsável pela reserva' : `Acompanhante de ${escape(person.responsible)}`} · ${escape(person.boarding || 'Embarque a combinar')}</p>
      <div class="word-fields">${personFields.map(field => {
        const type = field === 'birthDate' ? 'date' : field === 'phone' ? 'tel' : 'text';
        const value = field.startsWith('extra:') ? person.extra?.[field.slice(6)] : person[field];
        const maxlength = { name: 140, cpf: 14, city: 80, state: 2, rg: 30, phone: 20, address: 200, nationality: 60 }[field] || 200;
        return `<label>${escape(labelFor(field, columns))}<input type="${type}" data-person-index="${index}" data-person-field="${escape(field)}" value="${escape(value)}" maxlength="${maxlength}" ${field === 'cpf' ? 'inputmode="numeric" placeholder="000.000.000-00"' : ''} autocomplete="off" /></label>`;
      }).join('')}</div></fieldset>`).join('') || '<p>Esta viagem ainda não tem passageiros com reserva ativa.</p>';
    content.querySelectorAll('[data-person-field]').forEach(input => input.addEventListener('input', () => {
      const person = people[Number(input.dataset.personIndex)], field = input.dataset.personField;
      if (field.startsWith('extra:')) person.extra[field.slice(6)] = input.value;
      else person[field] = input.value;
      const key = `${person.bookingId}/${person.slot}`;
      if (!dirty.has(key)) dirty.set(key, new Set());
      dirty.get(key).add(field);
      // Requer nova conferência se um campo voltar a ficar em branco.
      content.querySelector('[data-word-allow-blank]').checked = false;
      tell(''); updateStatus();
    }));
    updateStatus();
  }

  function renderTable() {
    table = model.tables[Number(content.querySelector('[data-word-table]')?.value ?? model.selected)];
    columns = table.columns.map(column => ({ ...column }));
    const controls = content.querySelector('[data-word-mapping]');
    controls.innerHTML = `<summary>Colunas do modelo</summary><p>As colunas foram reconhecidas automaticamente. Ajuste se necessário.</p><div class="word-fields">${columns.map((column, index) => `<label>${escape(column.label)}<select data-word-column="${index}">
      ${WORD_FIELDS.map(([field, label]) => `<option value="${field}" ${column.field === field ? 'selected' : ''}>${label}</option>`).join('')}
      <option value="extra:${escape(column.field.startsWith('extra:') ? column.field.slice(6) : `coluna${index + 1}`)}" ${column.field.startsWith('extra:') ? 'selected' : ''}>Preencher este campo</option>
      <option value="ignore">Deixar coluna em branco</option></select></label>`).join('')}</div>`;
    controls.querySelectorAll('[data-word-column]').forEach(select => select.addEventListener('change', () => {
      columns[Number(select.dataset.wordColumn)].field = select.value;
      content.querySelector('[data-word-allow-blank]').checked = false;
      renderPeople();
    }));
    const notice = content.querySelector('[data-word-template-error]');
    notice.hidden = !table.filled;
    notice.textContent = table.filled ? 'Esta tabela já tem nomes preenchidos. Envie o modelo com as linhas em branco para preservar os dados do arquivo original.' : '';
    renderPeople();
    if (table.filled) { content.querySelector('[data-word-download]').disabled = true; content.querySelector('[data-word-save]').disabled = true; }
  }

  function renderContent() {
    content.innerHTML = `<p class="word-model-name">Modelo: <strong>${escape(model.filename)}</strong></p>
      <label ${model.tables.length === 1 ? 'hidden' : ''}>Tabela de passageiros<select data-word-table>${model.tables.map((item, index) => `<option value="${index}" ${index === model.selected ? 'selected' : ''}>${escape(item.title)}</option>`).join('')}</select></label>
      <p data-word-template-error class="is-error" role="alert" hidden></p>
      <details class="word-mapping" data-word-mapping></details>
      <h4>2. Conferir passageiros</h4><p>Uma linha para cada pessoa. Cidade de residência é diferente do local de embarque.</p>
      <p data-word-status role="status" aria-live="polite"></p><div data-word-people></div>
      <label class="word-blank-control" data-word-blank-control hidden><input type="checkbox" data-word-allow-blank /> Conferi e quero baixar com os campos vazios em branco.</label>
      <div class="word-actions"><button type="button" data-word-save>Salvar dados</button><button type="button" data-word-download>Salvar e baixar Word</button></div>
      <p class="word-file-hint">Os dados ficam salvos para as próximas listas desta viagem. O Word gerado contém os passageiros ativos, pagos e pendentes.</p>`;
    content.hidden = false;
    content.querySelector('[data-word-table]').addEventListener('change', renderTable);
    content.querySelector('[data-word-allow-blank]').addEventListener('change', updateStatus);
    content.querySelector('[data-word-save]').addEventListener('click', () => save(false));
    content.querySelector('[data-word-download]').addEventListener('click', () => save(true));
    renderTable();
  }

  async function save(download) {
    const button = content.querySelector(download ? '[data-word-download]' : '[data-word-save]');
    if (busy || button.disabled || table.filled) return;
    busy = true;
    root.querySelectorAll('button, input, select').forEach(control => { control.disabled = true; });
    tell(download ? 'Salvando e preparando o Word…' : 'Salvando os dados…');
    try {
      const groups = passengerRecordGroups(people.map(person => ({ ...person, extraFields: JSON.stringify(person.extra) })));
      const latest = await getSnapshot();
      if (!alive()) return;
      if (signature(latest) !== signature(snapshot)) throw new Error('As reservas mudaram. Envie o modelo novamente para atualizar a lista antes de baixar. Os dados digitados dos passageiros que continuam na viagem serão mantidos.');
      await saveRecords({ tripId: snapshot.trip.id, groups });
      dirty.clear();
      if (!alive()) return;
      if (download) {
        const fresh = await getSnapshot();
        if (!alive()) return;
        if (signature(fresh) !== signature(snapshot)) throw new Error('Os dados foram salvos, mas as reservas mudaram. Envie o modelo novamente para atualizar os passageiros antes de baixar.');
        const freshPeople = buildTripPassengers(fresh.trip.id, fresh.bookings, fresh.records);
        downloadPassengerWord(fillPassengerWord(model, table, freshPeople, columns), fresh.trip);
        tell('Word preenchido e baixado.'); onDownload?.();
      } else tell('Dados dos passageiros salvos.');
    } catch (error) { tell(error.message || 'Não foi possível preparar o Word. Tente novamente.', true); }
    finally {
      busy = false;
      if (alive()) { root.querySelectorAll('button, input, select').forEach(control => { control.disabled = false; }); updateStatus(); }
    }
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file || busy) return;
    const thisRevision = ++revision;
    content.hidden = true; tell('Lendo o modelo e buscando os passageiros…');
    try {
      if (file.size > MAX_WORD_BYTES) throw new Error('Envie um Word .docx de até 10 MB.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const nextModel = inspectPassengerWord(bytes, file.name);
      const nextSnapshot = await getSnapshot();
      if (!alive() || thisRevision !== revision) return;
      model = nextModel; snapshot = nextSnapshot;
      const drafts = new Map(people.map(person => [`${person.bookingId}/${person.slot}`, person]));
      people = buildTripPassengers(snapshot.trip.id, snapshot.bookings, snapshot.records).map(person => {
        const key = `${person.bookingId}/${person.slot}`, draft = drafts.get(key);
        if (draft) for (const field of dirty.get(key) || []) {
          if (field.startsWith('extra:')) person.extra[field.slice(6)] = draft.extra[field.slice(6)];
          else person[field] = draft[field];
        }
        return person;
      });
      renderContent(); tell('Modelo lido. Confira os passageiros abaixo.');
    } catch (error) { if (thisRevision === revision) tell(error.message || 'Não foi possível ler o modelo. Tente novamente.', true); }
    finally { if (alive() && thisRevision === revision) fileInput.value = ''; }
  });
  return () => { active = false; revision++; root.replaceChildren(); };
}
