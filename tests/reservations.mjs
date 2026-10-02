import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import * as firestore from 'firebase/firestore';
import { prepareCatalog, bookingClosesAt } from '../booking-model.js';
const rules = (await fs.readFile(new URL('../firestore.rules.template', import.meta.url), 'utf8')).replaceAll('__ADMIN_UID__', 'agency');
const environment = await initializeTestEnvironment({ projectId: 'demo-janu', firestore: { rules, host: '127.0.0.1', port: 8080 } });
const { doc, setDoc, getDoc, getDocs, collection, Timestamp, serverTimestamp, updateDoc, runTransaction } = firestore;
const trip = prepareCatalog({ id: 'teste-viagem', title: 'Viagem de teste', date: '10 de dezembro', startDate: '2099-12-10', endDate: '2099-12-10', published: true, dateTbc: false, status: 'aberto', price: 380, images: [], boarding: ['Tauá'], fareOptions: [{ label: 'Individual', amount: 380, seats: 1 }, { label: 'Casal', amount: 800, seats: 2 }] });
const customer = environment.authenticatedContext('customer', { email: 'customer@example.invalid' }).firestore();
const other = environment.authenticatedContext('other', { email: 'other@example.invalid' }).firestore();
const agency = environment.authenticatedContext('agency').firestore();
const anonymous = environment.unauthenticatedContext().firestore();
async function dataModule(db, uid) {
  const context = vm.createContext({ console, crypto, TextEncoder, setTimeout, clearTimeout, Date });
  const files = new Map();
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
  const auth = { currentUser: { uid } };
  // O SDK rejeita objetos plain de outro realm; adapta somente protótipos do harness.
  const plain = value => Array.isArray(value) ? value.map(plain) : value && value.constructor?.name === 'Object' ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, plain(child)])) : value;
  const modules = {
    'firebase/app': synthetic({ initializeApp: () => ({}) }),
    'firebase/auth': synthetic(Object.fromEntries(['getAuth', 'onAuthStateChanged', 'createUserWithEmailAndPassword', 'signInWithEmailAndPassword', 'signOut', 'updateProfile', 'sendPasswordResetEmail', 'GoogleAuthProvider', 'signInWithPopup'].map(key => [key, key === 'getAuth' ? () => auth : key === 'onAuthStateChanged' ? (_, callback) => callback(auth.currentUser) : () => {}]))),
    'firebase/firestore': synthetic({ ...firestore, getFirestore: () => db,
      setDoc: (ref, data, ...rest) => firestore.setDoc(ref, plain(data), ...rest),
      runTransaction: (database, callback) => firestore.runTransaction(database, tx => callback({
        get: tx.get.bind(tx), set: (ref, data) => tx.set(ref, plain(data)), update: (ref, data) => tx.update(ref, plain(data)),
      })),
    }),
    './firebase-config.js': synthetic({ firebaseConfig: { apiKey: 'test', projectId: 'demo-janu', appId: 'test' } }),
  };
  async function file(name) {
    if (!files.has(name)) files.set(name, new vm.SourceTextModule(await fs.readFile(new URL(`../${name}`, import.meta.url), 'utf8'), { context }));
    return files.get(name);
  }
  const module = await file('data.js');
  await module.link(async path => modules[path] || file(path.replace('./', '')));
  await module.evaluate();
  return module.namespace;
}
const input = { id: 'JT-0000000001', tripId: trip.id, firstName: 'Cliente', lastName: 'Teste', cpf: '52998224725', phone: '88999999999', fareIndex: 1, quantity: 2, expectedUnitPriceCents: 80000, expectedFareSeats: 2, payment: 'pix', boarding: 'Tauá' };
async function seed(fields = {}) {
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'trip_catalog', trip.id), { ...trip, ...fields, bookingClosesAt: Timestamp.fromDate(bookingClosesAt({ ...trip, ...fields })) });
  });
}
async function inventory(fields) {
  await environment.withSecurityRulesDisabled(async context => setDoc(doc(context.firestore(), 'trip_inventory', trip.id), fields));
}
try {
  await environment.clearFirestore(); await seed();
  const client = await dataModule(customer, 'customer');
  const admin = await dataModule(agency, 'agency');
  const saved = (await client.createBooking(input)).booking;
  assert.equal(saved.totalCents, 160000); assert.equal(saved.seats, 4); assert.equal(saved.seatsHeld, false);
  assert.equal((await getDoc(doc(customer, 'bookings', saved.id))).data().tripTitle, trip.title);
  await client.createBooking(input); assert.equal((await client.myBookings()).length, 1);
  await assertFails(getDoc(doc(other, 'bookings', saved.id)));
  await assertFails(getDoc(doc(anonymous, 'bookings', saved.id)));
  await assertFails(getDocs(collection(customer, 'bookings')));
  await assertFails(updateDoc(doc(customer, 'bookings', saved.id), { status: 'confirmed' }));
  const fake = { ...saved, id: 'JT-0000000002', totalCents: 1, createdAtServer: serverTimestamp() };
  await assertFails(setDoc(doc(customer, 'bookings', fake.id), fake));
  await assertFails(setDoc(doc(customer, 'bookings', fake.id), { ...fake, totalCents: saved.totalCents, uid: 'other' }));
  await assertFails(setDoc(doc(customer, 'bookings', fake.id), { ...fake, totalCents: saved.totalCents, source: 'whatsapp' }));
  await assert.rejects(client.createBooking({ ...input, id: 'JT-0000000003', expectedUnitPriceCents: 1 }), /atualizada/);
  await assert.rejects(client.createBooking({ ...input, id: 'JT-0000000003', boarding: 'Cidade falsa' }), /embarque/);
  await assert.rejects(client.createBooking({ ...input, id: 'JT-0000000003', quantity: 6 }), /10 passageiros/);
  await assert.rejects(client.createBooking({ ...input, id: 'JT-0000000003', cpf: '11111111111' }), /Confira/);
  await assert.rejects(admin.adminSetStatus({ id: saved.id, status: 'confirmed' }), /capacidade real/);
  await inventory({ capacity: 10, reserved: 0, enabled: true, demo: false });
  await admin.adminSetStatus({ id: saved.id, status: 'confirmed' });
  assert.equal((await getDoc(doc(customer, 'trip_inventory', trip.id))).data().reserved, 4);
  await admin.adminSetStatus({ id: saved.id, status: 'confirmed' });
  assert.equal((await getDoc(doc(customer, 'trip_inventory', trip.id))).data().reserved, 4);
  await admin.adminSetStatus({ id: saved.id, status: 'cancelled' });
  await admin.adminSetStatus({ id: saved.id, status: 'cancelled' });
  assert.equal((await getDoc(doc(customer, 'trip_inventory', trip.id))).data().reserved, 0);
  await assert.rejects(admin.adminSetStatus({ id: saved.id, status: 'confirmed' }), /alteração/);
  await inventory({ capacity: 2, reserved: 0, enabled: true, demo: false });
  const bookings = await Promise.allSettled(['JT-0000000004', 'JT-0000000005'].map(id => client.createBooking({ ...input, id, quantity: 1 })));
  assert.equal(bookings.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal((await getDoc(doc(customer, 'trip_inventory', trip.id))).data().reserved, 2);
  const successful = bookings.find(item => item.status === 'fulfilled').value.booking;
  await client.createBooking({ ...input, id: successful.id, quantity: 1 });
  assert.equal((await getDoc(doc(customer, 'trip_inventory', trip.id))).data().reserved, 2);
  await assertFails(updateDoc(doc(customer, 'trip_inventory', trip.id), { reserved: 0 }));
  await inventory({ capacity: 10, reserved: 0, enabled: false, demo: false });
  await assert.rejects(client.createBooking({ ...input, id: 'JT-0000000006' }), /pausadas/);
  await seed({ status: 'esgotado' });
  await assert.rejects(client.createBooking({ ...input, id: 'JT-0000000006' }), /novas reservas/);
  await seed({ startDate: '2020-01-01', endDate: '2020-01-01' });
  await assert.rejects(client.createBooking({ ...input, id: 'JT-0000000006' }), /novas reservas/);
  await seed();
  await inventory({ capacity: 0, reserved: 0, enabled: false, demo: true });
  const unheld = (await client.createBooking({ ...input, id: 'JT-0000000007' })).booking;
  await admin.adminSetStatus({ id: unheld.id, status: 'cancelled' });
  assert.equal((await getDoc(doc(customer, 'trip_inventory', trip.id))).data().reserved, 0);
  await assertFails(setDoc(doc(customer, 'trip_catalog', trip.id), trip));
  assert.ok((await admin.adminGet([trip.id])).bookings.length >= 3);
  await admin.adminSaveTrip({ ...trip, includes: [['bus', 'Transporte']], stops: [['Primeira parada', 'Entrada inclusa']], images: ['./assets/lagoinha.webp'] });
  const updatedCatalog = (await admin.getCatalog()).find(item => item.id === trip.id);
  assert.deepEqual(Array.from(updatedCatalog.includes[0]), ['bus', 'Transporte']);
  assert.equal((await getDoc(doc(customer, 'trip_catalog', trip.id))).data().includes[0].label, 'Transporte');
  console.log('PASS: salvamento, preço validado, privacidade, repetição segura, limite simultâneo e confirmação/cancelamento.');
} finally {
  await environment.cleanup();
}
