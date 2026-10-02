import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocs, setDoc, collection, query, where, orderBy, limit, runTransaction } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';
import { nameAccountEmail, isNameAccount, accountLabel } from './account-name.js';
export { accountLabel } from './account-name.js';

export const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const app = configured ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
export const authReady = auth ? new Promise(resolve => onAuthStateChanged(auth, resolve, resolve)) : Promise.resolve(null);
export const currentUser = () => auth?.currentUser;

const CACHE_TTL_MS = 60_000;
let catalogCache = { value: null, expiresAt: 0 };
const tripCache = new Map();

function fresh(entry) {
  return entry && entry.expiresAt > Date.now();
}
function invalidateCatalogCache() {
  catalogCache = { value: null, expiresAt: 0 };
}
function invalidateTripCache(id = null) {
  if (id) tripCache.delete(id);
  else tripCache.clear();
}

const validTripId = id => /^[a-z0-9-]{3,45}$/.test(id || '');
function requireSetup() { if (!configured) throw new Error('Firebase ainda não configurado. Abra o README da pasta do projeto.'); }
function requireUser() { requireSetup(); if (!auth.currentUser) throw new Error('Entre na sua conta para continuar.'); return auth.currentUser; }
function digits(value) { return String(value ?? '').replace(/\D/g, ''); }
function validCpf(value) {
  if (value.length !== 11 || /^(\d)\1{10}$/.test(value)) return false;
  return [9, 10].every(length => {
    const sum = [...value.slice(0, length)].reduce((total, digit, i) => total + Number(digit) * (length + 1 - i), 0);
    const check = sum * 10 % 11;
    return Number(value[length]) === (check === 10 ? 0 : check);
  });
}
export async function login(identifier, password, register = false, name = '') {
  requireSetup();
  const value = String(identifier || '').trim();
  const byName = register || !value.includes('@');
  const email = byName ? await nameAccountEmail(value) : value;
  const fn = register ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
  try {
    const user = (await fn(auth, email.trim(), password)).user;
    if (register) await updateProfile(user, { displayName: name.trim().slice(0, 80) });
    await setDoc(doc(db, 'profiles', user.uid), { email: user.email.toLowerCase(), name: (user.displayName || name.trim() || accountLabel(user)).slice(0, 80) });
    return user;
  }
  catch (error) {
    if (error.code === 'auth/email-already-in-use') throw new Error(byName ? 'Este nome já tem conta. Entre ou escolha outro nome de acesso.' : 'Este e-mail já tem conta. Escolha Entrar.');
    if (error.code === 'auth/weak-password') throw new Error('Use uma senha com pelo menos 6 caracteres.');
    if (error.code === 'auth/invalid-email') throw new Error('Confira o endereço de e-mail.');
    if (error.code === 'permission-denied') throw new Error('Conta criada, mas o perfil não pôde ser salvo. Atualize e entre novamente.');
    if (error.code === 'auth/too-many-requests') throw new Error('Muitas tentativas. Aguarde um pouco e tente novamente.');
    throw new Error('Não foi possível entrar. Confira seu nome ou e-mail e a senha.');
  }
}
export async function resetPassword(email) {
  requireSetup();
  const value = String(email || '').trim();
  if (!value) throw new Error('Informe seu e-mail para recuperar a senha.');
  if (!value.includes('@') || isNameAccount({ email: value })) throw new Error('Contas criadas com nome não têm recuperação por e-mail. Fale com a Janu para obter ajuda.');
  try {
    await sendPasswordResetEmail(auth, value);
  } catch (error) {
    if (error.code === 'auth/invalid-email') throw new Error('Confira o endereço de e-mail.');
    if (error.code === 'auth/too-many-requests') throw new Error('Muitas tentativas. Aguarde um pouco e tente novamente.');
    throw new Error('Não foi possível enviar o e-mail de recuperação agora.');
  }
}

export async function loginWithGoogle() {
  requireSetup();
  try {
    const provider = new GoogleAuthProvider();
    const user = (await signInWithPopup(auth, provider)).user;
    await setDoc(doc(db, 'profiles', user.uid), {
      email: String(user.email || '').toLowerCase(),
      name: (user.displayName || user.email?.split('@')[0] || 'Cliente').slice(0, 80),
    });
    return user;
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') throw new Error('Login com Google cancelado.');
    if (error.code === 'auth/popup-blocked') throw new Error('O navegador bloqueou a janela do Google. Libere pop-ups e tente novamente.');
    if (error.code === 'auth/operation-not-allowed') throw new Error('Entrar com Google ainda não está ativado no Firebase.');
    throw new Error('Não foi possível entrar com Google agora.');
  }
}

export async function logout() { if (auth) await signOut(auth); }

export async function getCatalog() {
  requireSetup();
  if (fresh(catalogCache)) return catalogCache.value.map(item => ({ ...item }));
  const snap = await getDocs(collection(db, 'trip_catalog'));
  const value = snap.docs.map(item => ({ id: item.id, ...item.data() }));
  catalogCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value.map(item => ({ ...item }));
}
export async function getTrips(ids = []) {
  requireSetup();
  const uniqueIds = [...new Set(ids)];
  const missing = uniqueIds.filter(id => !fresh(tripCache.get(id)));

  if (missing.length) {
    const snapshots = await Promise.all(missing.map(id => getDoc(doc(db, 'trip_inventory', id))));
    snapshots.forEach((snap, i) => {
      const id = missing[i];
      const data = snap.exists() ? snap.data() : { capacity: 0, reserved: 0, enabled: false, demo: true };
      tripCache.set(id, {
        value: { id, ...data, available: data.capacity - data.reserved },
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    });
  }

  return ids.map(id => ({ ...(tripCache.get(id)?.value || { id, capacity: 0, reserved: 0, enabled: false, demo: true, available: 0 }) }));
}

export async function createBooking(input) {
  const user = requireUser();
  const cpf = digits(input.cpf), phone = digits(input.phone);
  const seats = Number(input.seats);
  if (!validTripId(input.tripId) || !validCpf(cpf) || phone.length < 10 || phone.length > 11 ||
      !Number.isInteger(seats) || seats < 1 || seats > 10 || !['pix', 'cartao'].includes(input.payment) ||
      !input.firstName?.trim() || !input.lastName?.trim()) throw new Error('Confira os dados da reserva.');
  const id = `JT-${Array.from(crypto.getRandomValues(new Uint8Array(5)), n => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  const tripRef = doc(db, 'trip_inventory', input.tripId);
  const bookingRef = doc(db, 'bookings', id);
  const booking = {
    id, uid: user.uid, tripId: input.tripId,
    firstName: input.firstName.trim(), lastName: input.lastName.trim(), cpf, cpfLast4: cpf.slice(-4), phone,
    seats, payment: input.payment, boarding: (input.boarding || '').trim(),
    status: 'pending', createdAt: new Date().toISOString(),
  };
  if (input.fareLabel) booking.fareLabel = String(input.fareLabel).slice(0, 80);
  try {
    await runTransaction(db, async tx => {
      const tripSnap = await tx.get(tripRef);
      const trip = tripSnap.data();
      if (!trip?.enabled || trip.demo || trip.capacity - trip.reserved < seats) throw new Error('Viagem não liberada ou sem vagas suficientes.');
      tx.set(bookingRef, booking);
      tx.update(tripRef, { reserved: trip.reserved + seats, lastBookingId: id });
    });
  } catch (error) {
    if (error.code === 'permission-denied') throw new Error('Não foi possível reservar. Atualize a página e confira as vagas.');
    throw error;
  }
  invalidateTripCache(input.tripId);
  return { booking };
}

export async function getBooking(id) {
  requireUser();
  const snap = await getDoc(doc(db, 'bookings', id));
  if (!snap.exists()) throw new Error('Reserva não encontrada.');
  return { booking: snap.data() };
}
export async function myBookings() {
  const user = requireUser();
  const snap = await getDocs(query(collection(db, 'bookings'), where('uid', '==', user.uid), limit(100)));
  return snap.docs.map(doc => doc.data()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function adminGet(ids = []) {
  requireUser();
  const [trips, snap, catalog] = await Promise.all([getTrips(ids), getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(150))), getCatalog()]);
  return { trips, bookings: snap.docs.map(doc => doc.data()), catalog };
}
export async function adminSetCapacity({ tripId, capacity, enabled }) {
  requireUser();
  if (!validTripId(tripId) || !Number.isInteger(capacity) || capacity < 0 || capacity > 500) throw new Error('Capacidade inválida.');
  const ref = doc(db, 'trip_inventory', tripId);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const reserved = snap.exists() ? snap.data().reserved : 0;
    if (capacity < reserved) throw new Error('A capacidade não pode ser menor que os lugares reservados.');
    if (snap.exists()) tx.update(ref, { capacity, demo: false, enabled: Boolean(enabled) });
    else tx.set(ref, { capacity, reserved: 0, demo: false, enabled: Boolean(enabled) });
  });
  invalidateTripCache(tripId);
}
export async function adminSaveTrip(trip) {
  requireUser();
  if (!validTripId(trip.id) || !trip.title?.trim() || trip.title.length > 100 || !Number.isFinite(trip.price) || trip.price < 0 ||
      (trip.specialUntil && !/^\d{4}-\d{2}-\d{2}$/.test(trip.specialUntil)) ||
      (trip.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(trip.startDate)) ||
      (trip.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(trip.endDate)) ||
      (trip.startDate && trip.endDate && trip.endDate < trip.startDate) ||
      (trip.minToConfirm != null && (!Number.isInteger(trip.minToConfirm) || trip.minToConfirm < 1 || trip.minToConfirm > 500)) ||
      (trip.cardMax != null && (!Number.isInteger(trip.cardMax) || trip.cardMax < 1 || trip.cardMax > 24)) ||
      (trip.cardSurchargePercent != null && (!Number.isFinite(trip.cardSurchargePercent) || trip.cardSurchargePercent < 0 || trip.cardSurchargePercent > 100)) ||
      (trip.pixMax != null && (!Array.isArray(trip.pixMax) || trip.pixMax.length > 12 || trip.pixMax.some(rule => !Number.isInteger(rule.daysMin) || rule.daysMin < 0 || rule.daysMin > 730 || !Number.isInteger(rule.maxInstallments) || rule.maxInstallments < 1 || rule.maxInstallments > 24))) ||
      !Array.isArray(trip.images) || trip.images.length > 4 || trip.images.some(image => !image.startsWith('data:image/jpeg;base64,') || image.length > 160000)) throw new Error('Confira os dados e fotos da viagem.');
  const { id, ...fields } = trip;
  await setDoc(doc(db, 'trip_catalog', id), fields);
  invalidateCatalogCache();
}
export async function adminManualBooking(input) {
  const admin = requireUser();
  const cpf = digits(input.cpf), phone = digits(input.phone), seats = Number(input.seats);
  if (!validTripId(input.tripId) || !validCpf(cpf) || !/^\d{10,11}$/.test(phone) ||
      !Number.isInteger(seats) || seats < 1 || seats > 10 || !input.firstName?.trim() || !input.lastName?.trim()) throw new Error('Confira os dados do passageiro.');
  let linkedUid = '';
  if (input.email?.trim()) {
    const profiles = await getDocs(query(collection(db, 'profiles'), where('email', '==', input.email.trim().toLowerCase()), limit(1)));
    if (!profiles.empty) linkedUid = profiles.docs[0].id;
  }
  const id = `JT-${Array.from(crypto.getRandomValues(new Uint8Array(5)), n => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  const ref = doc(db, 'trip_inventory', input.tripId);
  const booking = { id, uid: linkedUid, tripId: input.tripId, firstName: input.firstName.trim(), lastName: input.lastName.trim(),
    cpf, cpfLast4: cpf.slice(-4), phone, seats, payment: 'a_combinar', boarding: (input.boarding || '').trim(),
    status: 'pending', createdAt: new Date().toISOString(), source: 'whatsapp' };
  await runTransaction(db, async tx => {
    const trip = await tx.get(ref);
    if (!trip.exists() || trip.data().capacity - trip.data().reserved < seats) throw new Error('Não há vagas suficientes. Ajuste a capacidade antes de adicionar.');
    tx.set(doc(db, 'bookings', id), booking);
    tx.update(ref, { reserved: trip.data().reserved + seats });
  });
  invalidateTripCache(input.tripId);
  return { booking, linked: Boolean(linkedUid) };
}
export async function adminSetStatus({ id, status }) {
  requireUser();
  if (!['confirmed', 'cancelled'].includes(status)) throw new Error('Status inválido.');
  const bookingRef = doc(db, 'bookings', id);
  await runTransaction(db, async tx => {
    const snap = await tx.get(bookingRef);
    if (!snap.exists()) throw new Error('Reserva não encontrada.');
    const booking = snap.data();
    if (status === 'confirmed' && booking.status !== 'pending') throw new Error('Reserva não está pendente.');
    if (status === 'cancelled' && booking.status === 'cancelled') throw new Error('Reserva já foi cancelada.');
    if (status === 'cancelled') {
      const tripRef = doc(db, 'trip_inventory', booking.tripId);
      const trip = await tx.get(tripRef);
      tx.update(tripRef, { reserved: trip.data().reserved - booking.seats });
    }
    tx.update(bookingRef, { status });
  });
  invalidateTripCache();
}
