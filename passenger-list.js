const text = value => String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export const PASSENGER_HEADERS = ['Nº', 'Responsável', 'Telefone', 'Embarque', 'Pessoas', 'Pagamento'];

function phoneLabel(value) {
  const original = text(value);
  let digits = original.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return original || 'Não informado';
}

export function buildPassengerList(trip, bookings, generatedAt = new Date()) {
  const rows = bookings
    .filter(booking => booking.tripId === trip.id && ['pending', 'confirmed'].includes(booking.status))
    .map(booking => ({
      id: text(booking.id),
      name: [text(booking.firstName), text(booking.lastName)].filter(Boolean).join(' ') || 'Nome não informado',
      phone: phoneLabel(booking.phone),
      boarding: text(booking.boarding) || 'A combinar',
      seats: Math.max(1, Math.trunc(Number(booking.seats) || 1)),
      status: booking.status,
      statusLabel: booking.status === 'confirmed' ? 'Pago' : 'Pendente',
    }))
    .sort((a, b) => a.boarding.localeCompare(b.boarding, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id));
  const title = text(trip.title) || text(trip.id) || 'Viagem';
  const slug = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'viagem';
  const dateSuffix = /^\d{4}-\d{2}-\d{2}$/.test(trip.startDate || '') ? `-${trip.startDate}` : '';
  const created = new Date(generatedAt);
  return {
    tripId: trip.id, title, date: text(trip.date) || 'Data a confirmar', rows,
    passengers: rows.reduce((sum, row) => sum + row.seats, 0),
    paid: rows.filter(row => row.status === 'confirmed').length,
    pending: rows.filter(row => row.status === 'pending').length,
    generatedAt: created.toISOString(),
    generatedLabel: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', dateStyle: 'short', timeStyle: 'short' }).format(created),
    filename: `passageiros-${slug}${dateSuffix}.pdf`,
  };
}

export function passengerCells(row, index) {
  return [String(index + 1), row.name, row.phone, row.boarding, String(row.seats), row.statusLabel];
}

export function passengerSummary(list) {
  return `${list.passengers} ${list.passengers === 1 ? 'pessoa' : 'pessoas'} - ${list.rows.length} ${list.rows.length === 1 ? 'reserva' : 'reservas'} - ${list.paid} ${list.paid === 1 ? 'paga' : 'pagas'} - ${list.pending} ${list.pending === 1 ? 'pendente' : 'pendentes'}`;
}

export function passengerPrintMarkup(list) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Passageiros - ${escape(list.title)} | Janu Turismo</title>
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #172b42; font: 10.5pt Arial, sans-serif; background: #eef2f6; }
      .toolbar { position: sticky; top: 0; display: flex; justify-content: center; gap: 10px; padding: 12px; background: #fff; border-bottom: 1px solid #ccd4dc; }
      button { padding: 10px 18px; border: 0; border-radius: 7px; background: #135ba0; color: #fff; font: bold 16px Arial, sans-serif; cursor: pointer; }
      main { max-width: 210mm; margin: 16px auto; padding: 12mm; background: #fff; }
      .brand { color: #124f8e; font-weight: bold; }
      h1 { margin: 10px 0; font-size: 20pt; }
      h2 { margin: 0 0 8px; font-size: 14pt; overflow-wrap: anywhere; }
      p { margin: 6px 0; }
      .totals { margin: 12px 0 5px; font-weight: bold; }
      .note, footer { font-size: 9pt; color: #526171; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 14px; }
      th, td { padding: 7px 5px; border: 1px solid #cad2da; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
      th { background: #eef2f6; font-size: 9.5pt; }
      th:nth-child(1), td:nth-child(1), th:nth-child(5), td:nth-child(5) { text-align: center; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      footer { margin-top: 16px; border-top: 1px solid #cad2da; padding-top: 8px; }
      @media print { body { background: #fff; } .toolbar { display: none; } main { margin: 0; padding: 0; max-width: none; } }
    </style></head><body><div class="toolbar"><button type="button" data-print-list>Imprimir</button></div><main>
    <div class="brand">JANU TURISMO</div><h1>Relação de passageiros</h1><h2>${escape(list.title)}</h2><p>Data da viagem: ${escape(list.date)}</p>
    <p class="totals">${passengerSummary(list)}</p>
    <p class="note">Organizada por embarque e nome. Cada linha identifica o responsável pela reserva.</p>
    <table><colgroup>${[25, 180, 96, 112, 46, 64].map(width => `<col style="width:${width / 523 * 100}%">`).join('')}</colgroup>
      <thead><tr>${PASSENGER_HEADERS.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead>
      <tbody>${list.rows.length ? list.rows.map((row, index) => `<tr>${passengerCells(row, index).map(value => `<td>${escape(value)}</td>`).join('')}</tr>`).join('') : '<tr><td colspan="6">Nenhum passageiro com reserva ativa nesta viagem.</td></tr>'}</tbody>
    </table><footer>Emitida em ${escape(list.generatedLabel)} · Janu Turismo</footer></main></body></html>`;
}

export function openPassengerPrintWindow() {
  const target = window.open('', '_blank');
  if (!target) throw new Error('Não foi possível abrir a impressão. Use Baixar PDF.');
  target.opener = null;
  target.document.open();
  target.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Preparando relação | Janu Turismo</title></head><body><p>Preparando a relação de passageiros…</p></body></html>');
  target.document.close();
  return target;
}

export function printPassengerList(target, list) {
  if (target.closed) return;
  target.document.open();
  target.document.write(passengerPrintMarkup(list));
  target.document.close();
  const print = () => { if (!target.closed) { target.focus(); target.print(); } };
  target.document.querySelector('[data-print-list]').addEventListener('click', print);
  target.setTimeout(print, 200);
}

export async function downloadPassengerList(list) {
  const { createPassengerPdf } = await import('./passenger-pdf.js');
  const bytes = await createPassengerPdf(list);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = list.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
