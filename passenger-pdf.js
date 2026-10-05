import { PDFDocument, StandardFonts, PageSizes, rgb } from 'pdf-lib';
import { PASSENGER_HEADERS, passengerCells, passengerSummary } from './passenger-list.js';

const MARGIN = 36;
const WIDTHS = [25, 180, 96, 112, 46, 64];
const INK = rgb(.09, .17, .26);
const BLUE = rgb(.07, .31, .56);
const MUTED = rgb(.32, .38, .44);
const LINE = rgb(.78, .82, .86);

export async function createPassengerPdf(list) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Relação de passageiros - ${list.title}`);
  pdf.setAuthor('Janu Turismo');
  pdf.setCreator('Janu Turismo');
  pdf.setCreationDate(new Date(list.generatedAt));
  pdf.setModificationDate(new Date(list.generatedAt));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const supported = new Set(font.getCharacterSet());
  const printable = value => [...String(value).normalize('NFC')].map(char => {
    if (supported.has(char.codePointAt(0))) return char;
    if (/[\u2010-\u2015]/.test(char)) return '-';
    const plain = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return [...plain].every(letter => supported.has(letter.codePointAt(0))) ? plain : '?';
  }).join('');
  const wrap = (value, size, face, width) => {
    const lines = [];
    let line = '';
    for (const word of printable(value).split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (face.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const char of word) {
        if (face.widthOfTextAtSize(line + char, size) > width && line) { lines.push(line); line = ''; }
        line += char;
      }
    }
    if (line || !lines.length) lines.push(line);
    return lines;
  };
  let page, cursor;
  const newPage = () => {
    const continuation = pdf.getPageCount() > 0;
    page = pdf.addPage(PageSizes.A4);
    cursor = page.getHeight() - MARGIN;
    const line = (value, size, face = font, color = INK) => {
      for (const text of wrap(value, size, face, 523)) {
        page.drawText(text, { x: MARGIN, y: cursor - size, size, font: face, color });
        cursor -= size + 8;
      }
    };
    line(continuation ? 'JANU TURISMO - Relação de passageiros' : 'JANU TURISMO', 11, bold, BLUE);
    if (!continuation) line('Relação de passageiros', 20, bold);
    line(list.title, 14, bold);
    line(`Data da viagem: ${list.date}`, 11);
    if (!continuation) {
      line(passengerSummary(list), 10, bold);
      line('Organizada por embarque e nome. Cada linha identifica o responsável pela reserva.', 8.5, font, MUTED);
    }
    cursor -= 5;
    page.drawRectangle({ x: MARGIN, y: cursor - 25, width: 523, height: 25, color: rgb(.93, .95, .97), borderColor: LINE, borderWidth: .6 });
    let x = MARGIN;
    PASSENGER_HEADERS.forEach((label, index) => {
      const width = bold.widthOfTextAtSize(printable(label), 9);
      page.drawText(printable(label), { x: index === 0 || index === 4 ? x + (WIDTHS[index] - width) / 2 : x + 6, y: cursor - 16, size: 9, font: bold, color: INK });
      x += WIDTHS[index];
    });
    cursor -= 25;
  };
  newPage();
  if (!list.rows.length) {
    page.drawText('Nenhum passageiro com reserva ativa nesta viagem.', { x: MARGIN + 6, y: cursor - 20, size: 11, font, color: MUTED });
  }
  list.rows.forEach((row, index) => {
    const cells = passengerCells(row, index).map((value, column) => wrap(value, 10, font, WIDTHS[column] - 12));
    const height = Math.max(28, Math.max(...cells.map(lines => lines.length)) * 13 + 14);
    if (cursor - height < 54) newPage();
    let x = MARGIN;
    cells.forEach((lines, column) => {
      page.drawRectangle({ x, y: cursor - height, width: WIDTHS[column], height, borderColor: LINE, borderWidth: .5 });
      lines.forEach((text, line) => {
        const width = font.widthOfTextAtSize(text, 10);
        page.drawText(text, { x: column === 0 || column === 4 ? x + (WIDTHS[column] - width) / 2 : x + 6, y: cursor - 17 - line * 13, size: 10, font, color: INK });
      });
      x += WIDTHS[column];
    });
    cursor -= height;
  });
  pdf.getPages().forEach((sheet, index, pages) => {
    sheet.drawLine({ start: { x: MARGIN, y: 41 }, end: { x: MARGIN + 523, y: 41 }, color: LINE, thickness: .5 });
    sheet.drawText(printable(`Emitida em ${list.generatedLabel} - Janu Turismo`), { x: MARGIN, y: 27, size: 8, font, color: MUTED });
    const label = `Página ${index + 1} de ${pages.length}`;
    sheet.drawText(label, { x: MARGIN + 523 - font.widthOfTextAtSize(label, 8), y: 27, size: 8, font, color: MUTED });
  });
  return pdf.save();
}
