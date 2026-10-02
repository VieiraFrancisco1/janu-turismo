const DAY = 86400000;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function cearaDate(now = Date.now()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now));
  const value = type => parts.find(part => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function afterTripDate(date) {
  return datePattern.test(date || '') ? new Date(`${date}T00:00:00-03:00`).getTime() + DAY : null;
}

export function tripDeadline(trip = {}) {
  return afterTripDate(trip.endDate || trip.dataFim || trip.startDate || trip.dataInicio);
}

export function reservationDeadline(booking, trips = []) {
  if (booking.expiresAt?.toMillis) return booking.expiresAt.toMillis();
  if (typeof booking.expiresAt === 'number') return booking.expiresAt;
  const trip = trips.find(item => item.id === booking.tripId);
  return afterTripDate(booking.tripEndDate || trip?.endDate || trip?.dataFim || booking.tripStartDate || trip?.startDate || trip?.dataInicio);
}

export function reservationVisible(booking, trips = [], now = Date.now()) {
  const deadline = reservationDeadline(booking, trips);
  return deadline === null || now < deadline;
}

// Reavalia no prazo exato e ao retomar uma aba suspensa pelo navegador.
export function watchDeadlines(deadlines, onChange) {
  let timer;
  let disposed = false;
  const schedule = () => {
    clearTimeout(timer);
    const future = deadlines.filter(value => Number.isFinite(value) && value > Date.now());
    if (future.length) timer = setTimeout(refresh, Math.min(Math.min(...future) - Date.now() + 5, 2147483647));
  };
  const refresh = () => { if (!disposed) { onChange(); schedule(); } };
  const visibility = () => { if (!document.hidden) refresh(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', visibility);
  if (typeof window !== 'undefined') window.addEventListener('focus', refresh);
  schedule();
  return () => {
    disposed = true; clearTimeout(timer);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', visibility);
    if (typeof window !== 'undefined') window.removeEventListener('focus', refresh);
  };
}
