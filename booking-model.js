import { tripDeadline } from './reservation-lifecycle.js';

export function bookingId() {
  return `JT-${Array.from(crypto.getRandomValues(new Uint8Array(5)), n => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function bookingClosesAt(trip) {
  return new Date(tripDeadline(trip) || 0);
}

export function prepareCatalog(trip) {
  return {
    ...trip,
    includes: (trip.includes || []).map(item => Array.isArray(item) ? { icon: item[0], label: item[1] } : item),
    stops: (trip.stops || []).map(item => Array.isArray(item) ? { title: item[0], note: item[1] } : item),
    fareOptions: (trip.fareOptions || [{ label: trip.priceNote || 'Individual', amount: trip.price, seats: 1 }]).map(fare => ({
      ...fare, amountCents: Math.round(Number(fare.amount) * 100), seats: Number(fare.seats || 1),
    })),
  };
}

export function catalogForApp(trip) {
  return {
    ...trip,
    includes: (trip.includes || []).map(item => Array.isArray(item) ? item : [item.icon || 'check', item.label || '']),
    stops: (trip.stops || []).map(item => Array.isArray(item) ? item : [item.title || '', item.note || '']),
  };
}

export function bookingSnapshot(trip, input) {
  const fareIndex = Number(input.fareIndex), quantity = Number(input.quantity);
  const fare = trip?.fareOptions?.[fareIndex];
  if (!trip?.published || trip.dateTbc || ['encerrado', 'esgotado', 'data-a-confirmar'].includes(trip.status) || bookingClosesAt(trip) <= new Date()) {
    throw new Error('Esta viagem não está recebendo novas reservas.');
  }
  if (!Number.isInteger(fareIndex) || fareIndex < 0 || !fare || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 ||
      !Number.isInteger(fare.amountCents) || fare.amountCents < 0 || !Number.isInteger(fare.seats) || fare.seats < 1 || fare.seats * quantity > 10) {
    throw new Error('Escolha uma opção válida para até 10 passageiros.');
  }
  if (fare.amountCents !== input.expectedUnitPriceCents || fare.seats !== input.expectedFareSeats) {
    throw new Error('A opção de preço foi atualizada. Atualize a página e confira o valor antes de reservar.');
  }
  const boarding = String(input.boarding || '').trim();
  if (!boarding || boarding.length > 80 || (trip.boarding?.length && !trip.boarding.includes(boarding)) || (fare.boardingCity && fare.boardingCity !== boarding)) {
    throw new Error('Escolha uma cidade de embarque válida para esta opção.');
  }
  return {
    tripTitle: trip.title, tripDate: trip.date, tripStartDate: trip.startDate, tripEndDate: trip.endDate || trip.startDate,
    fareIndex, fareLabel: fare.label, fareSeats: fare.seats,
    quantity, seats: fare.seats * quantity, unitPriceCents: fare.amountCents,
    totalCents: fare.amountCents * quantity, boarding,
  };
}
