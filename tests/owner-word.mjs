import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import * as fflate from 'fflate';

async function waitFor(check) {
  for (let index = 0; index < 100; index++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  assert.fail('O fluxo da página não concluiu.');
}
async function appFixture(role, hash) {
  const dom = new JSDOM('<body><div id="app"></div><div id="toast"></div></body>', { url: `https://example.invalid/${hash}` });
  const { window } = dom;
  window.scrollTo = () => {}; window.HTMLElement.prototype.scrollIntoView = () => {};
  const context = vm.createContext({ window, document: window.document, location: window.location, navigator: window.navigator, DOMParser: window.DOMParser, XMLSerializer: window.XMLSerializer, URL, Blob, Uint8Array, TextEncoder, TextDecoder, crypto, console, Date, Intl, setTimeout: (callback, delay) => { const timer = setTimeout(callback, delay); timer.unref(); return timer; }, clearTimeout, requestAnimationFrame: callback => setTimeout(callback, 0), matchMedia: () => ({ matches: false }) });
  const catalog = { id: 'guaramiranga', title: 'Guaramiranga', date: '10 de dezembro', startDate: '2099-12-10', endDate: '2099-12-10' };
  const inventory = { id: catalog.id, capacity: 20, reserved: 2, available: 18, demo: false, enabled: true };
  const bookings = [{ id: 'JT-0000000001', tripId: catalog.id, firstName: 'Cliente', lastName: 'Teste', cpf: '52998224725', cpfLast4: '4725', phone: '88999999999', boarding: 'Boa Viagem', seats: 2, status: 'pending', payment: 'pix' }];
  let adminReads = 0, personalReads = 0;
  const user = role === 'anonymous' ? null : { uid: role, email: role === 'primary' ? '0vieira.francisco0@gmail.com' : `${role}@example.invalid` };
  const synthetic = values => new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }, { context });
  const noWrite = async () => { throw new Error('O teste não autoriza modificar reservas.'); };
  const data = {
    configured: true, authReady: Promise.resolve(user), currentUser: () => user,
    adminAccess: async () => ({ owner: role === 'owner', primary: role === 'primary' }),
    accountLabel: () => 'Conta de teste', getCatalog: async () => [], getTrips: async () => [inventory],
    watchTrips: (_, callback) => { callback([inventory]); return () => {}; },
    watchMyBookings: callback => { callback([]); return () => {}; },
    adminGet: async () => { adminReads++; assert(['owner', 'primary'].includes(role)); return { trips: [inventory], bookings, catalog: [catalog] }; },
    adminGetPassengerRecords: async id => { personalReads++; assert.equal(id, catalog.id); assert(['owner', 'primary'].includes(role)); return []; },
    adminSavePassengerRecords: noWrite, isProvisionedAdminAccount: async () => true,
    ...Object.fromEntries(['login','loginWithGoogle','resetPassword','logout','createBooking','getBooking','myBookings','watchBooking','adminSetCapacity','adminSetStatus','adminSaveTrip','adminManualBooking','adminDeleteBooking','adminCreatePhoneAccount','adminSetCurrentPassword'].map(key => [key, noWrite])),
  };
  const external = { './data.js': synthetic(data), './scroll-guide.js': synthetic({ initScrollGuide: () => {} }), 'fflate': synthetic(fflate) };
  const modules = new Map();
  async function getModule(name) {
    if (!modules.has(name)) {
      const source = await fs.readFile(new URL(`../${name}`, import.meta.url), 'utf8');
      modules.set(name, new vm.SourceTextModule(source, { context, identifier: name, importModuleDynamically: async specifier => {
        const child = await getModule(specifier.replace('./', ''));
        if (child.status === 'unlinked') await child.link(linker);
        if (child.status === 'linked') await child.evaluate();
        return child;
      } }));
    }
    return modules.get(name);
  }
  const linker = async specifier => external[specifier] || getModule(specifier.replace('./', ''));
  const app = await getModule('app.js'); await app.link(linker); await app.evaluate();
  return { window, document: window.document, reads: () => ({ adminReads, personalReads }), close: () => window.close() };
}
for (const role of ['owner', 'primary', 'customer', 'anonymous']) {
  const route = role === 'primary' ? '#/gestao/reservas/guaramiranga' : '#/reservas/guaramiranga';
  const ui = await appFixture(role, route);
  try {
    if (['owner', 'primary'].includes(role)) {
      await waitFor(() => ui.document.querySelector('[data-word-open]'));
      const main = ui.document.querySelector('main');
      if (role === 'owner') { assert(main.classList.contains('owner-control')); assert(main.firstElementChild.classList.contains('admin-reservations-back')); }
      assert(ui.document.querySelector('[data-passenger-export="pdf"]')); assert(ui.document.querySelector('[data-passenger-export="print"]'));
      const open = ui.document.querySelector('[data-word-open]'); open.click();
      await waitFor(() => ui.document.querySelector('[data-word-file]'));
      assert.equal(open.getAttribute('aria-expanded'), 'true');
      const xml = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Nome</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>CPF</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p/></w:tc><w:tc><w:p/></w:tc></w:tr></w:tbl></w:body></w:document>';
      const bytes = fflate.zipSync({ '[Content_Types].xml': fflate.strToU8('<Types/>'), 'word/document.xml': fflate.strToU8(xml) });
      const input = ui.document.querySelector('[data-word-file]');
      Object.defineProperty(input, 'files', { value: [{ name: 'modelo.docx', size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }] });
      input.dispatchEvent(new ui.window.Event('change'));
      await waitFor(() => ui.document.querySelectorAll('.word-person').length === 2);
      assert.equal(ui.reads().personalReads, 1);
      assert.equal(ui.document.querySelector('[data-person-index="1"][data-person-field="cpf"]').value, '');
      ui.document.querySelector('[data-word-close]').click(); assert.equal(open.getAttribute('aria-expanded'), 'false');
      open.click(); assert.equal(ui.document.querySelector('#trip-word-panel').hidden, false);
      ui.window.location.hash = '#/reservas'; await waitFor(() => !ui.document.querySelector('[data-word-file]'));
    } else {
      await waitFor(() => ui.document.querySelector(role === 'customer' ? '.empty-reservations' : '.auth-form'));
      assert.equal(ui.document.querySelector('[data-word-open]'), null);
      assert.deepEqual(ui.reads(), { adminReads: 0, personalReads: 0 });
    }
    console.log(`PASS: Word na conta ${role}, rotas, isolamento e carregamento do modelo.`);
  } finally { ui.close(); }
}
