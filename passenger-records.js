// Dados individuais usados na relação Word. A reserva continua controlando vagas e pagamento.
export const WORD_FIELDS = [
  ['name', 'Nome completo'], ['cpf', 'CPF'], ['city', 'Cidade de residência'],
  ['state', 'UF'], ['rg', 'RG'], ['birthDate', 'Data de nascimento'],
  ['phone', 'Telefone'], ['address', 'Endereço'], ['nationality', 'Nacionalidade'],
  ['number', 'Número na lista'], ['boarding', 'Local de embarque'],
  ['payment', 'Situação do pagamento'], ['bookingId', 'Código da reserva'],
];
export const PERSONAL_FIELDS = ['name', 'cpf', 'city', 'state', 'rg', 'birthDate', 'phone', 'address', 'nationality'];
const limits = { name: 140, cpf: 11, city: 80, state: 2, rg: 30, birthDate: 10, phone: 15, address: 200, nationality: 60 };
export const cleanText = value => String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
export const fieldKey = value => cleanText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
const digits = value => String(value ?? '').replace(/\D/g, '');

export function validPassengerCpf(value) {
  const cpf = digits(value);
  return cpf.length === 11 && !/^(\d)\1{10}$/.test(cpf) && [9, 10].every(length => {
    const sum = [...cpf.slice(0, length)].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const check = sum * 10 % 11;
    return Number(cpf[length]) === (check === 10 ? 0 : check);
  });
}

export function readExtraFields(value) {
  try {
    const data = typeof value === 'string' ? JSON.parse(value) : value;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).slice(0, 20).map(([key, val]) => [fieldKey(key), cleanText(val).slice(0, 200)]).filter(([key]) => key));
  } catch { return {}; }
}

export function normalizePassenger(person = {}) {
  const result = Object.fromEntries(PERSONAL_FIELDS.map(key => [key, cleanText(person[key])]));
  result.cpf = digits(result.cpf);
  result.phone = digits(result.phone);
  result.state = result.state.toUpperCase();
  for (const key of PERSONAL_FIELDS) if (result[key].length > limits[key]) throw new Error(`Confira ${WORD_FIELDS.find(item => item[0] === key)[1].toLowerCase()}: informação muito longa.`);
  if (result.cpf && !validPassengerCpf(result.cpf)) throw new Error('Confira o CPF do passageiro.');
  if (result.phone && !/^\d{10,15}$/.test(result.phone)) throw new Error('Confira o telefone do passageiro.');
  if (result.state && !/^[A-Z]{2}$/.test(result.state)) throw new Error('Informe a UF com duas letras, como CE.');
  if (result.birthDate) {
    const date = new Date(`${result.birthDate}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result.birthDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== result.birthDate || result.birthDate > new Date().toISOString().slice(0, 10)) throw new Error('Confira a data de nascimento do passageiro.');
  }
  result.extraFields = JSON.stringify(readExtraFields(person.extraFields ?? person.extra));
  if (result.extraFields.length > 4000) throw new Error('Os campos adicionais estão muito longos.');
  return result;
}

export function buildTripPassengers(tripId, bookings, records = []) {
  const saved = new Map(records.filter(record => record.tripId === tripId).map(record => [record.bookingId, record]));
  const active = bookings.filter(booking => booking.tripId === tripId && ['pending', 'confirmed'].includes(booking.status)).slice().sort((a, b) => cleanText(a.boarding).localeCompare(cleanText(b.boarding), 'pt-BR') || cleanText(`${a.firstName} ${a.lastName}`).localeCompare(cleanText(`${b.firstName} ${b.lastName}`), 'pt-BR') || a.id.localeCompare(b.id));
  return active.flatMap(booking => {
    const seats = Math.min(10, Math.max(1, Math.trunc(Number(booking.seats) || 1)));
    const record = saved.get(booking.id);
    return Array.from({ length: seats }, (_, slot) => {
      const original = slot === 0 ? { name: cleanText(`${booking.firstName || ''} ${booking.lastName || ''}`), cpf: booking.cpf || '', phone: booking.phone || '', city: booking.city || '' } : {};
      const person = { ...Object.fromEntries(PERSONAL_FIELDS.map(key => [key, ''])), ...original, ...(record?.people?.[slot] || {}) };
      return { ...person, extra: readExtraFields(person.extraFields), bookingId: booking.id, slot, responsible: cleanText(`${booking.firstName || ''} ${booking.lastName || ''}`), boarding: cleanText(booking.boarding), payment: booking.status === 'confirmed' ? 'Pago' : 'Pendente' };
    });
  });
}

export function passengerWordValue(person, field, index) {
  if (field === 'ignore') return '';
  if (field === 'number') return String(index + 1);
  if (field.startsWith('extra:')) return cleanText(person.extra?.[field.slice(6)]);
  const value = cleanText(person[field]);
  if (field === 'cpf' && /^\d{11}$/.test(value)) return value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  if (field === 'birthDate' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('/');
  return value;
}

export function passengerWordIssues(people, columns) {
  const fields = [...new Set(columns.map(column => column.field).filter(field => field !== 'ignore'))];
  const missing = [];
  people.forEach((person, index) => fields.forEach(field => {
    if (!passengerWordValue(person, field, index)) missing.push({ index, field });
  }));
  return missing;
}

export function passengerRecordGroups(people) {
  const groups = new Map();
  for (const person of people) {
    if (!groups.has(person.bookingId)) groups.set(person.bookingId, []);
    groups.get(person.bookingId)[person.slot] = normalizePassenger(person);
  }
  return [...groups].map(([bookingId, persons]) => ({ bookingId, people: persons }));
}
