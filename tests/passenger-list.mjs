import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { buildPassengerList, passengerPrintMarkup, passengerSummary } from '../passenger-list.js';
import { createPassengerPdf } from '../passenger-pdf.js';

const trip = { id: 'arajara', title: 'Arajara Park', date: '11 de outubro de 2026', startDate: '2026-10-11' };
const created = new Date('2026-10-05T12:34:00Z');
const booking = fields => ({ id: 'JT-TESTE', tripId: trip.id, firstName: 'João', lastName: 'Souza', phone: '5588900000000', boarding: 'Boa Viagem', seats: 1, status: 'pending', ...fields });

test('A relação contém somente as reservas ativas da viagem, ordenadas por embarque e nome', () => {
  const input = [
    booking({ id: 'PAGO', boarding: 'Tauá', seats: 2, status: 'confirmed' }),
    booking({ id: 'ANA', firstName: 'Ana', phone: '(88) 90000-0000' }),
    booking({ id: 'CANCELADA', status: 'cancelled', seats: 9 }),
    booking({ id: 'OUTRA-VIAGEM', tripId: 'jeri', seats: 8 }),
    booking({ id: 'INATIVA', status: 'rejected' }),
  ];
  const original = JSON.stringify(input);
  const list = buildPassengerList(trip, input, created);
  assert.deepEqual(list.rows.map(row => row.id), ['ANA', 'PAGO']);
  assert.equal(list.rows[0].phone, '(88) 90000-0000');
  assert.equal(list.passengers, 3);
  assert.equal(list.paid, 1);
  assert.equal(list.pending, 1);
  assert.equal(list.rows[1].statusLabel, 'Pago');
  assert.equal(list.generatedLabel, '05/10/2026, 09:34');
  assert.equal(list.filename, 'passageiros-arajara-park-2026-10-11.pdf');
  assert.equal(JSON.stringify(input), original, 'Exportar não altera reservas ou vagas');
});

test('A impressão preserva acentos e apresenta conteúdo de clientes como texto', () => {
  const list = buildPassengerList({ ...trip, title: 'Viagem <script>alert(1)</script>' }, [
    booking({ firstName: 'Áurea', lastName: 'Conceição', boarding: '<img src=x onerror=alert(1)>' }),
  ], created);
  const html = passengerPrintMarkup(list);
  assert(html.includes('Áurea Conceição'));
  assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert(!/<script\b|<img\b/i.test(html));
  assert(html.includes('@page { size: A4 portrait;'));
  assert(html.includes('table-header-group'));
  assert.equal(passengerSummary(list), '1 pessoa - 1 reserva - 0 pagas - 1 pendente');
});

test('PDF em A4 pagina a relação longa e mantém os dados da viagem', async () => {
  const list = buildPassengerList(trip, Array.from({ length: 60 }, (_, index) => booking({
    id: `JT-${index}`, firstName: 'Áurea', lastName: `Conceição da Silva ${index}`,
    seats: index % 2 + 1, status: index % 2 ? 'confirmed' : 'pending',
  })), created);
  const bytes = await createPassengerPdf(list);
  const pdf = await PDFDocument.load(bytes);
  assert(bytes.length > 3000);
  assert(pdf.getPageCount() >= 3);
  assert.equal(pdf.getTitle(), 'Relação de passageiros - Arajara Park');
  for (const page of pdf.getPages()) assert.deepEqual([page.getWidth(), page.getHeight()], PageSizes.A4);
  assert.equal(list.passengers, 90);
});

test('Relação vazia e nomes ou locais longos geram PDFs válidos', async () => {
  const empty = buildPassengerList(trip, [], created);
  const pdf = await PDFDocument.load(await createPassengerPdf(empty));
  assert.equal(pdf.getPageCount(), 1);
  assert.equal(empty.passengers, 0);
  assert(passengerPrintMarkup(empty).includes('Nenhum passageiro com reserva ativa'));
  const long = buildPassengerList({ ...trip, title: 'Excursão '.repeat(12) }, [booking({
    firstName: 'Maria '.repeat(10), lastName: 'Conceição '.repeat(8), boarding: 'Rodoviária municipal, ao lado da praça principal e próximo ao posto de combustível', phone: '',
  })], created);
  assert.equal((await PDFDocument.load(await createPassengerPdf(long))).getPageCount(), 1);
  assert.equal(long.rows[0].phone, 'Não informado');
});
