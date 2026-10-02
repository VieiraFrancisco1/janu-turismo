import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { initializeApp as initializeAdmin, cert } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getApps } from 'firebase/app';
import { doc, getDoc, terminate } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { authReady, createBooking, getBooking, myBookings } from '../data.js';
import { bookingId } from '../booking-model.js';
const credentials = JSON.parse(await fs.readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
assert.equal(credentials.project_id, 'janu-turismo-e747f');
initializeAdmin({ credential: cert(credentials), projectId: credentials.project_id });
const db = adminFirestore(), authAdmin = adminAuth();
const auth = getAuth(getApps()[0]), clientDb = getFirestore(getApps()[0]);
const uid = `verification-${randomBytes(8).toString('hex')}`;
const otherUid = `${uid}-other`;
const id = bookingId();
let userCreated = false, otherCreated = false;
try {
  const catalog = await db.collection('trip_catalog').get();
  let selected;
  for (const snapshot of catalog.docs) {
    const trip = snapshot.data();
    const inventory = await db.collection('trip_inventory').doc(snapshot.id).get();
    if (trip.published && !trip.dateTbc && !['encerrado', 'esgotado', 'data-a-confirmar'].includes(trip.status) && trip.bookingClosesAt.toMillis() > Date.now() && (!inventory.exists || inventory.data().demo)) {
      selected = { id: snapshot.id, ...trip }; break;
    }
  }
  if (!selected) { console.log('Sem viagem com vagas não configuradas para teste seguro em produção. Testes completos executados no emulador.'); process.exitCode = 0; }
  else {
    await authAdmin.createUser({ uid, displayName: 'Verificação automática' }); userCreated = true;
    await authReady;
    await signInWithCustomToken(auth, await authAdmin.createCustomToken(uid));
    const fare = selected.fareOptions[0];
    const input = { id, tripId: selected.id, firstName: 'Verificação', lastName: 'Automática', cpf: '52998224725', phone: '88900000000', fareIndex: 0, quantity: 1, expectedUnitPriceCents: fare.amountCents, expectedFareSeats: fare.seats, payment: 'pix', boarding: fare.boardingCity || selected.boarding[0] || 'A combinar' };
    let result;
    for (let attempt = 0; attempt < 12; attempt++) {
      try { result = await createBooking(input); break; }
      catch (error) {
        if (attempt === 11) throw error;
        console.log('Aguardando propagação das regras de reserva...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    assert.equal(result.booking.seatsHeld, false);
    assert.equal(result.booking.totalCents, fare.amountCents);
    await signOut(auth); await signInWithCustomToken(auth, await authAdmin.createCustomToken(uid));
    assert.equal((await getBooking(id)).booking.id, id);
    await createBooking(input);
    assert.equal((await myBookings()).filter(booking => booking.id === id).length, 1);
    await authAdmin.createUser({ uid: otherUid }); otherCreated = true;
    await signOut(auth); await signInWithCustomToken(auth, await authAdmin.createCustomToken(otherUid));
    await assert.rejects(getDoc(doc(clientDb, 'bookings', id)), error => error.code === 'permission-denied');
    const stored = await db.collection('bookings').doc(id).get();
    assert.equal(stored.data().uid, uid);
    console.log('PASS: reserva gravada no Firebase real, recuperada após novo login, sem duplicação e protegida contra outra conta.');
  }
} finally {
  // Remove somente o documento e as contas temporárias criados por este teste.
  await db.collection('bookings').doc(id).delete();
  if (userCreated) await authAdmin.deleteUser(uid);
  if (otherCreated) await authAdmin.deleteUser(otherUid);
  await signOut(auth); await terminate(clientDb);
  console.log('Dados temporários da verificação removidos; nenhuma vaga real foi descontada.');
}
