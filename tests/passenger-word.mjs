import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { inspectPassengerWord, fillPassengerWord } from '../passenger-word.js';
import { buildTripPassengers, normalizePassenger, passengerRecordGroups, passengerWordIssues } from '../passenger-records.js';
import { mountPassengerWord } from '../passenger-word-ui.js';

const dom = new JSDOM('<body></body>', { url: 'https://example.invalid/#/reservas/teste-viagem' });
globalThis.document = dom.window.document;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.XMLSerializer = dom.window.XMLSerializer;
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const xmlText = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cell = text => `<w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>${xmlText(text)}</w:t></w:r></w:p></w:tc>`;
const row = values => `<w:tr>${values.map(cell).join('')}</w:tr>`;
function template({ headers = ['Nº', 'Nome completo', 'CPF', 'Cidade', 'Restrição alimentar'], filled = false, strict = false, blank = true } = {}) {
  const document = `<w:document xmlns:w="${strict ? 'http://purl.oclc.org/ooxml/wordprocessingml/main' : W}"><w:body><w:p><w:r><w:t>LOCAL DA VIAGEM</w:t></w:r></w:p><w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/></w:tblPr><w:tblGrid>${headers.map(() => '<w:gridCol w:w="1800"/>').join('')}</w:tblGrid>${row(headers)}${blank ? row(headers.map((_, index) => filled && index === 1 ? 'Nome já existente' : '')) : ''}</w:tbl><w:p><w:r><w:t>Instruções originais do estabelecimento</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`;
  return zipSync({
    '[Content_Types].xml': strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    'word/document.xml': strToU8(document),
    'word/header1.xml': strToU8('<original-header/>'),
    'word/styles.xml': strToU8('<original-styles/>'),
    'word/media/logo.png': new Uint8Array([1, 2, 3, 4]),
  });
}
const trip = { id: 'teste-viagem', title: 'Guaramiranga', date: '10 de dezembro' };
const booking = { id: 'JT-0000000001', tripId: trip.id, firstName: 'Áurea', lastName: 'Conceição', cpf: '52998224725', phone: '88999999999', boarding: 'Madalena', seats: 2, status: 'pending' };
const people = () => buildTripPassengers(trip.id, [booking]);

test('Word reconhece colunas, expande uma linha por pessoa e preserva o modelo e outras partes', () => {
  const bytes = template();
  const model = inspectPassengerWord(bytes, 'modelo.docx');
  assert.deepEqual(model.tables[0].columns.map(column => column.field), ['number', 'name', 'cpf', 'city', 'extra:restricaoalimentar']);
  const records = people();
  records[0].city = 'Boa Viagem'; records[0].extra.restricaoalimentar = 'Não';
  records[1].name = 'João & <Conceição>'; records[1].city = 'Quixadá'; records[1].cpf = '11144477735'; records[1].extra.restricaoalimentar = 'Vegetariano';
  const output = unzipSync(fillPassengerWord(model, model.tables[0], records));
  const source = unzipSync(bytes);
  for (const path of ['word/header1.xml', 'word/styles.xml', 'word/media/logo.png', '[Content_Types].xml']) assert.deepEqual(output[path], source[path]);
  const document = new DOMParser().parseFromString(strFromU8(output['word/document.xml']), 'application/xml');
  assert.equal(document.getElementsByTagName('parsererror').length, 0);
  assert.equal(document.getElementsByTagNameNS(W, 'tr').length, 3);
  assert.equal(document.getElementsByTagNameNS(W, 'tblHeader').length, 1);
  const text = document.documentElement.textContent;
  for (const value of ['LOCAL DA VIAGEM', 'Áurea Conceição', '529.982.247-25', 'João & <Conceição>', '111.444.777-35', 'Quixadá', 'Vegetariano', 'Instruções originais']) assert(text.includes(value));
  assert.equal(document.getElementsByTagName('Conceição').length, 0);
});

test('Cada acompanhante tem seus próprios dados; CPF do responsável e embarque não viram CPF ou cidade dos demais', () => {
  const rows = people();
  assert.equal(rows.length, 2); assert.equal(rows[0].cpf, booking.cpf);
  assert.equal(rows[0].city, ''); assert.equal(rows[1].name, ''); assert.equal(rows[1].cpf, '');
  assert.equal(buildTripPassengers(trip.id, [booking, { ...booking, id: 'JT-0000000002', status: 'cancelled' }, { ...booking, id: 'JT-0000000003', tripId: 'outra' }]).length, 2);
  const saved = [{ bookingId: booking.id, tripId: trip.id, people: [{ name: 'Áurea Conceição', city: 'Boa Viagem', cpf: booking.cpf, extraFields: '{"restricaoalimentar":"Não"}' }, { name: 'João', cpf: '11144477735', city: 'Quixadá' }] }];
  const restored = buildTripPassengers(trip.id, [booking], saved);
  assert.equal(restored[1].city, 'Quixadá'); assert.equal(restored[0].extra.restricaoalimentar, 'Não');
  assert.equal(passengerWordIssues(restored, [{ field: 'name' }, { field: 'cpf' }, { field: 'city' }]).length, 0);
  assert.throws(() => normalizePassenger({ cpf: '11111111111' }), /CPF/);
  assert.throws(() => normalizePassenger({ birthDate: '2020-02-31' }), /nascimento/);
  assert.throws(() => normalizePassenger({ state: 'Ceará' }), /UF|longa/);
  assert.equal(passengerRecordGroups(restored)[0].people.length, 2);
});

test('Word rejeita arquivos incompatíveis e modelos já preenchidos, e suporta tabela sem linhas e XML Strict', () => {
  assert.throws(() => inspectPassengerWord(template(), 'modelo.doc'), /\.docx/);
  assert.throws(() => inspectPassengerWord(new Uint8Array([1, 2, 3]), 'modelo.docx'), /válido/);
  assert.throws(() => inspectPassengerWord(template({ headers: ['campo desconhecido', 'outro campo'] }), 'modelo.docx'), /tabela/);
  const filled = inspectPassengerWord(template({ filled: true }), 'modelo.docx');
  assert.throws(() => fillPassengerWord(filled, filled.tables[0], people()), /já tem/);
  const strict = inspectPassengerWord(template({ strict: true, blank: false, headers: ['Nome', 'CPF'] }), 'modelo.docx');
  const output = strFromU8(unzipSync(fillPassengerWord(strict, strict.tables[0], people()))['word/document.xml']);
  assert(output.includes('Áurea Conceição'));
  const badPackage = unzipSync(template());
  badPackage['word/document.xml'] = strToU8(`<!DOCTYPE test [<!ENTITY leak SYSTEM "file:///etc/passwd">]><w:document xmlns:w="${W}"/>`);
  assert.throws(() => inspectPassengerWord(zipSync(badPackage), 'modelo.docx'), /XML/);
  badPackage['word/vbaProject.bin'] = new Uint8Array([1]);
  assert.throws(() => inspectPassengerWord(zipSync(badPackage), 'modelo.docx'), /macros/);
});

async function until(check) {
  for (let i = 0; i < 100; i++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  assert.fail('A operação não terminou no teste.');
}
function uiFixture() {
  const root = document.createElement('section'); document.body.appendChild(root);
  let bookings = [structuredClone(booking)], records = [], saves = 0, downloads = 0;
  const dispose = mountPassengerWord(root, {
    getSnapshot: async () => ({ trip, bookings: structuredClone(bookings), records: structuredClone(records) }),
    saveRecords: async ({ tripId, groups }) => { saves++; records = groups.map(group => ({ ...group, tripId })); },
    onClose: () => {}, onDownload: () => { downloads++; },
  });
  return { root, dispose, saves: () => saves, downloads: () => downloads, changeBookings: value => { bookings = value; } };
}
async function upload(ui, bytes = template({ headers: ['Nome', 'CPF', 'Cidade'] }), filename = 'modelo.docx') {
  const input = ui.root.querySelector('[data-word-file]');
  Object.defineProperty(input, 'files', { configurable: true, value: [{ name: filename, size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }] });
  input.dispatchEvent(new dom.window.Event('change'));
  await until(() => /Modelo lido|\.docx|Não foi possível|não encontrei/i.test(ui.root.querySelector('[data-word-message]').textContent));
}
function edit(ui, index, field, value) {
  const input = ui.root.querySelector(`[data-person-index="${index}"][data-person-field="${field}"]`);
  input.value = value; input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
}

test('Fluxo da dona confere dados ausentes, bloqueia CPF repetido, salva e baixa um DOCX real uma única vez', async () => {
  const ui = uiFixture();
  const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL;
  const originalTimeout = globalThis.setTimeout;
  let output;
  URL.createObjectURL = blob => { output = blob; return 'blob:test'; }; URL.revokeObjectURL = () => {};
  dom.window.HTMLAnchorElement.prototype.click = function () {};
  globalThis.setTimeout = (callback, delay) => { const timer = originalTimeout(callback, delay); if (delay >= 60_000) timer.unref(); return timer; };
  try {
    await upload(ui);
    assert.equal(ui.root.querySelectorAll('.word-person').length, 2);
    const download = ui.root.querySelector('[data-word-download]');
    assert.equal(download.disabled, true);
    edit(ui, 0, 'city', 'Boa Viagem'); edit(ui, 1, 'name', 'João da Silva'); edit(ui, 1, 'city', 'Quixadá'); edit(ui, 1, 'cpf', booking.cpf);
    assert.equal(download.disabled, true); assert(ui.root.querySelector('[data-word-status]').textContent.includes('já está'));
    edit(ui, 1, 'cpf', '11144477735'); assert.equal(download.disabled, false);
    download.click(); download.click();
    await until(() => ui.downloads() === 1);
    assert.equal(ui.saves(), 1);
    const files = unzipSync(new Uint8Array(await output.arrayBuffer()));
    const document = new DOMParser().parseFromString(strFromU8(files['word/document.xml']), 'application/xml');
    assert(document.documentElement.textContent.includes('Quixadá')); assert(document.documentElement.textContent.includes('111.444.777-35'));
    await upload(ui);
    assert.equal(ui.root.querySelector('[data-person-index="1"][data-person-field="name"]').value, 'João da Silva');
    assert.equal(ui.root.querySelector('[data-word-download]').disabled, false);
  } finally { ui.dispose(); ui.root.remove(); URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke; globalThis.setTimeout = originalTimeout; }
});

test('Conferência explícita permite campos em branco, mas reservas alteradas impedem gerar uma lista desatualizada', async () => {
  const ui = uiFixture();
  try {
    await upload(ui);
    const allow = ui.root.querySelector('[data-word-allow-blank]'); allow.checked = true; allow.dispatchEvent(new dom.window.Event('change'));
    const download = ui.root.querySelector('[data-word-download]'); assert.equal(download.disabled, false);
    ui.changeBookings([{ ...booking, status: 'cancelled' }]); download.click();
    await until(() => ui.root.querySelector('[data-word-message]').textContent.includes('As reservas mudaram'));
    assert.equal(ui.downloads(), 0); assert.equal(ui.saves(), 0);
    await upload(ui, template(), 'antigo.doc');
    assert(ui.root.querySelector('[data-word-message]').textContent.includes('Salvar como'));
  } finally { ui.dispose(); ui.root.remove(); }
});
