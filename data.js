import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, deleteUser, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocs, setDoc, collection, query, where, orderBy, limit, runTransaction, serverTimestamp, Timestamp, onSnapshot } from 'firebase/firestore';
import { bookingId, bookingClosesAt, prepareCatalog, catalogForApp, bookingSnapshot } from './booking-model.js';
import { reservationDeadline, reservationVisible, watchDeadlines, tripDeadline } from './reservation-lifecycle.js';
import { firebaseConfig } from './firebase-config.js';
import { nameAccountEmail, loginIdentifierEmail, normalizeLoginIdentifier, isNameAccount, accountLabel } from './account-name.js';
export { accountLabel } from './account-name.js';

export const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const app = configured ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const adminProvisionApp = configured ? initializeApp(firebaseConfig, 'janu-admin-provision') : null;
const adminProvisionAuth = adminProvisionApp ? getAuth(adminProvisionApp) : null;
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
  const normalized = normalizeLoginIdentifier(value);
  const byName = register || !normalized.includes('@');
  if (register && /^\d{10,11}$/.test(normalized)) throw new Error('Cadastro por telefone é reservado ao acesso da agência. Escolha um nome de acesso.');
  const email = register ? await nameAccountEmail(normalized) : await loginIdentifierEmail(normalized);
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
    throw new Error('Não foi possível entrar. Confira seu nome, telefone ou e-mail e a senha.');
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
  const value = snap.docs.map(item => catalogForApp({ id: item.id, ...item.data() }));
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
  const firstName = String(input.firstName || '').trim(), lastName = String(input.lastName || '').trim();
  if (!validTripId(input.tripId) || !validCpf(cpf) || !/^\d{10,11}$/.test(phone) ||
      firstName.length < 2 || firstName.length > 60 || lastName.length < 2 || lastName.length > 80 ||
      !['pix', 'cartao'].includes(input.payment)) throw new Error('Confira nome, CPF, telefone e pagamento da reserva.');
  const id = input.id || bookingId();
  if (!/^JT-[A-F0-9]{10}$/.test(id)) throw new Error('Identificador da reserva inválido.');
  const tripRef = doc(db, 'trip_inventory', input.tripId);
  const bookingRef = doc(db, 'bookings', id);
  let booking;
  try {
    await runTransaction(db, async tx => {
      const existing = await tx.get(bookingRef);
      if (existing.exists()) {
        if (existing.data().uid !== user.uid) throw new Error('Não foi possível recuperar esta reserva.');
        booking = existing.data();
        return;
      }
      const catalogSnap = await tx.get(doc(db, 'trip_catalog', input.tripId));
      const snapshot = bookingSnapshot(catalogSnap.data(), input);
      const tripSnap = await tx.get(tripRef);
      const trip = tripSnap.data();
      if (trip && !trip.demo && !trip.enabled) throw new Error('As reservas desta viagem estão pausadas. Fale com a Janu.');
      const seatsHeld = Boolean(trip?.enabled && !trip.demo);
      if (seatsHeld && trip.capacity - trip.reserved < snapshot.seats) throw new Error('Não há vagas suficientes para essa quantidade.');
      booking = {
        id, uid: user.uid, tripId: input.tripId, firstName, lastName, cpf, cpfLast4: cpf.slice(-4), phone,
        ...snapshot, expiresAt: Timestamp.fromDate(bookingClosesAt(catalogSnap.data())), payment: input.payment, seatsHeld, status: 'pending',
        createdAt: new Date().toISOString(), createdAtServer: serverTimestamp(),
      };
      tx.set(bookingRef, booking);
      if (seatsHeld) tx.update(tripRef, { reserved: trip.reserved + snapshot.seats, lastBookingId: id });
    });
  } catch (error) {
    if (error.code === 'permission-denied') throw new Error('Não foi possível salvar. Atualize a página, confira os dados e tente novamente.');
    if (['unavailable', 'deadline-exceeded'].includes(error.code)) throw new Error('Não conseguimos confirmar o salvamento. Confira sua conexão e tente novamente; o mesmo pedido não será duplicado.');
    throw error;
  }
  invalidateTripCache(input.tripId);
  return { booking };
}

export async function getBooking(id) {
  requireUser();
  const snap = await getDoc(doc(db, 'bookings', id));
  if (!snap.exists()) throw new Error('Reserva não encontrada.');
  if (snap.data().uid !== currentUser().uid) throw new Error('Esta reserva pertence a outra conta.');
  if (!reservationVisible(snap.data(), await getCatalog())) throw new Error('Esta viagem já terminou e a reserva saiu das listas.');
  return { booking: snap.data() };
}
export async function myBookings() {
  const user = requireUser();
  const snap = await getDocs(query(collection(db, 'bookings'), where('uid', '==', user.uid)));
  const catalog = await getCatalog();
  return snap.docs.map(doc => doc.data()).filter(item => reservationVisible(item, catalog)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
function reservationStream(ref, extract, onChange, onError) {
  let records = null, catalog = null, disposed = false, stopClock = () => {};
  const emit = () => {
    if (disposed || records === null || catalog === null) return;
    onChange(records.filter(item => reservationVisible(item, catalog)));
  };
  const schedule = () => {
    stopClock();
    if (records && catalog) stopClock = watchDeadlines(records.map(item => reservationDeadline(item, catalog)), emit);
    emit();
  };
  getCatalog().then(items => { if (!disposed) { catalog = items; schedule(); } }).catch(() => { if (!disposed) onError(new Error('Não conseguimos conferir as datas das reservas. Tente novamente.')); });
  const stopSnapshot = onSnapshot(ref, snap => { records = extract(snap); schedule(); }, () => {
    if (!disposed) onError(new Error('Não conseguimos atualizar suas reservas. Confira a conexão e tente novamente.'));
  });
  return () => { disposed = true; stopSnapshot(); stopClock(); };
}
export function watchBooking(id, onChange, onError) {
  const user = requireUser();
  return reservationStream(doc(db, 'bookings', id), snap => snap.exists() && snap.data().uid === user.uid ? [snap.data()] : [], items => {
    if (!items.length) { onError(new Error('Esta reserva foi apagada ou a viagem já terminou.')); return; }
    onChange(items[0]);
  }, onError);
}
export function watchMyBookings(onChange, onError) {
  const user = requireUser();
  return reservationStream(query(collection(db, 'bookings'), where('uid', '==', user.uid)), snap => snap.docs.map(item => item.data()), items => {
    onChange(items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
  }, onError);
}

export async function isProvisionedAdminAccount() {
  const user = requireUser();
  const snap = await getDoc(doc(db, 'admin_users', user.uid));
  return snap.exists();
}

export async function adminCreatePhoneAccount({ phone, password }) {
  const creator = requireUser();
  const normalizedPhone = String(phone || '').replace(/\D/g, '');
  if (normalizedPhone.length < 10 || normalizedPhone.length > 11) throw new Error('Confira o número de telefone com DDD.');
  if (String(password || '').length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  const email = await nameAccountEmail(normalizedPhone);
  let createdUser = null;
  try {
    createdUser = (await createUserWithEmailAndPassword(adminProvisionAuth, email, String(password))).user;
    await updateProfile(createdUser, { displayName: 'Janu Turismo' });
    await setDoc(doc(db, 'admin_users', createdUser.uid), {
      phone: normalizedPhone,
      name: 'Janu Turismo',
      createdBy: creator.uid,
      createdAt: serverTimestamp(),
    });
    await signOut(adminProvisionAuth);
    return { uid: createdUser.uid, phone: normalizedPhone };
  } catch (error) {
    if (createdUser) {
      try { await deleteUser(createdUser); } catch { /* evita esconder o erro principal */ }
    }
    try { await signOut(adminProvisionAuth); } catch { /* noop */ }
    if (error.code === 'auth/email-already-in-use') throw new Error('Esse telefone já possui uma conta. Use o login normal.');
    if (error.code === 'auth/weak-password') throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    if (error.code === 'permission-denied') throw new Error('Somente a conta principal da agência pode criar o acesso administrativo.');
    throw new Error('Não foi possível criar o acesso da Janu agora.');
  }
}

export async function adminGet(ids = []) {
  requireUser();
  const [trips, snap, catalog] = await Promise.all([getTrips(ids), getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))), getCatalog()]);
  return { trips: trips.filter(item => { const deadline = tripDeadline(catalog.find(trip => trip.id === item.id) || {}); return deadline === null || Date.now() < deadline; }), bookings: snap.docs.map(doc => doc.data()).filter(item => reservationVisible(item, catalog)), catalog };
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
      !Array.isArray(trip.images) || trip.images.length > 4 || trip.images.some(image => typeof image !== 'string' || image.length > 160000 || (!image.startsWith('data:image/jpeg;base64,') && !/^\.\/assets\/[a-zA-Z0-9_-]+\.(webp|png|jpe?g)$/.test(image)))) throw new Error('Confira os dados e fotos da viagem.');
  const { id, ...fields } = prepareCatalog(trip);
  fields.bookingClosesAt = Timestamp.fromDate(bookingClosesAt(trip));
  await setDoc(doc(db, 'trip_catalog', id), fields);
  invalidateCatalogCache();
}
export async function adminManualBooking(input) {
  const admin = requireUser();
  const cpf = digits(input.cpf), phone = digits(input.phone), seats = Number(input.seats);
  if (!validTripId(input.tripId) || !validCpf(cpf) || !/^\d{10,11}$/.test(phone) ||
      !Number.isInteger(seats) || seats < 1 || seats > 10 || !input.firstName?.trim() || !input.lastName?.trim()) throw new Error('Confira os dados do passageiro.');
  let linkedUid = '';
  const identifier = String(input.identifier || input.email || '').trim();
  if (identifier) {
    const email = identifier.includes('@') ? identifier.toLowerCase() : await nameAccountEmail(identifier);
    const profiles = await getDocs(query(collection(db, 'profiles'), where('email', '==', email), limit(1)));
    if (!profiles.empty) linkedUid = profiles.docs[0].id;
  }
  const id = `JT-${Array.from(crypto.getRandomValues(new Uint8Array(5)), n => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  const ref = doc(db, 'trip_inventory', input.tripId);
  const booking = { id, uid: linkedUid, tripId: input.tripId, firstName: input.firstName.trim(), lastName: input.lastName.trim(),
    cpf, cpfLast4: cpf.slice(-4), phone, seats, payment: 'a_combinar', boarding: (input.boarding || '').trim(),
    status: 'pending', seatsHeld: true, createdAt: new Date().toISOString(), createdAtServer: serverTimestamp(), source: 'whatsapp' };
  await runTransaction(db, async tx => {
    const catalog = await tx.get(doc(db, 'trip_catalog', input.tripId));
    if (!catalog.exists() || !catalog.data().published || bookingClosesAt(catalog.data()) <= new Date()) throw new Error('Esta viagem não recebe novas reservas.');
    booking.tripTitle = catalog.data().title; booking.tripDate = catalog.data().date;
    booking.tripStartDate = catalog.data().startDate; booking.tripEndDate = catalog.data().endDate || catalog.data().startDate;
    booking.expiresAt = Timestamp.fromDate(bookingClosesAt(catalog.data()));
    const trip = await tx.get(ref);
    if (!trip.exists() || trip.data().demo || !trip.data().enabled || trip.data().capacity - trip.data().reserved < seats) throw new Error('Não há vagas suficientes. Ajuste a capacidade antes de adicionar.');
    tx.set(doc(db, 'bookings', id), booking);
    tx.update(ref, { reserved: trip.data().reserved + seats });
  });
  invalidateTripCache(input.tripId);
  return { booking, linked: Boolean(linkedUid) };
}
export async function adminSetStatus({ id, status }) {
  requireUser();
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) throw new Error('Status inválido.');
  const bookingRef = doc(db, 'bookings', id);
  await runTransaction(db, async tx => {
    const snap = await tx.get(bookingRef);
    if (!snap.exists()) throw new Error('Reserva não encontrada.');
    const booking = snap.data();
    if (booking.status === status) return;
    if (booking.status === 'cancelled'
      || (status === 'confirmed' && booking.status !== 'pending')
      || (status === 'pending' && booking.status !== 'confirmed')) throw new Error('Esta reserva não pode receber essa alteração.');

    // Pago <-> pendente muda apenas o estado do pagamento; as vagas continuam ocupadas.
    // Cancelar continua liberando vagas quando elas estavam separadas.
    const held = booking.seatsHeld !== false;
    const tripRef = doc(db, 'trip_inventory', booking.tripId);
    if ((status === 'cancelled' && held) || (status === 'confirmed' && !held)) {
      const trip = await tx.get(tripRef);
      const inventory = trip.data();
      if (!inventory || inventory.demo) throw new Error('Configure a capacidade real da viagem antes de confirmar.');
      const reserved = inventory.reserved + (status === 'confirmed' ? booking.seats : -booking.seats);
      if (reserved < 0 || reserved > inventory.capacity) throw new Error('Confira a capacidade: não há vagas suficientes ou o controle está inconsistente.');
      tx.update(tripRef, { reserved });
    }
    tx.update(bookingRef, { status, seatsHeld: status !== 'cancelled', updatedAt: serverTimestamp() });
  });
  invalidateTripCache();
}

export async function adminDeleteBooking(id) {
  requireUser();
  if (!/^JT-[A-F0-9]{10}$/.test(id)) throw new Error('Reserva inválida.');
  const bookingRef = doc(db, 'bookings', id);
  await runTransaction(db, async tx => {
    const snapshot = await tx.get(bookingRef);
    if (!snapshot.exists()) return;
    const booking = snapshot.data();
    if (booking.status !== 'cancelled' && booking.seatsHeld !== false) {
      const tripRef = doc(db, 'trip_inventory', booking.tripId);
      const snapshot = await tx.get(tripRef);
      if (!snapshot.exists() || snapshot.data().reserved < booking.seats) throw new Error('Confira as vagas da viagem antes de apagar a reserva.');
      tx.update(tripRef, { reserved: snapshot.data().reserved - booking.seats });
    }
    tx.delete(bookingRef);
  });
  invalidateTripCache();
}
