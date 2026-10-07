import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { cleanText, fieldKey, passengerWordValue } from './passenger-records.js';

export const MAX_WORD_BYTES = 10 * 1024 * 1024;
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const STRICT_W = 'http://purl.oclc.org/ooxml/wordprocessingml/main';
const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const aliases = {
  name: ['nome', 'nomecompleto', 'nomedopassageiro', 'nomecompletodopassageiro', 'passageiro', 'nomeesobrenome', 'nomesobrenome'],
  cpf: ['cpf', 'numerodocpf', 'cpfpassageiro', 'cpfdopassageiro'],
  city: ['cidade', 'municipio', 'cidadederesidencia', 'municipioderesidencia', 'cidadeorigem', 'cidadedeorigem', 'residencia'],
  state: ['uf', 'estado'], rg: ['rg', 'identidade', 'registrogeral', 'numerodorg', 'documentodeidentidade'],
  birthDate: ['nascimento', 'datadenascimento', 'datanascimento', 'dtnascimento', 'datanasc', 'dtnasc'],
  phone: ['telefone', 'celular', 'contato', 'fone', 'whatsapp'],
  address: ['endereco', 'enderecocompleto'], nationality: ['nacionalidade'],
  number: ['n', 'no', 'num', 'numero', 'ordem', 'sequencia'],
  boarding: ['embarque', 'localdeembarque', 'cidadeembarque', 'cidadedeembarque'],
  payment: ['pagamento', 'situacaodopagamento', 'statusdopagamento'], bookingId: ['reserva', 'codigodareserva'],
};
const aliasMap = new Map(Object.entries(aliases).flatMap(([field, names]) => names.map(name => [name, field])));
const children = (node, name) => Array.from(node.childNodes).filter(child => child.nodeType === 1 && child.localName === name && [W, STRICT_W].includes(child.namespaceURI));
const descendants = (node, name) => Array.from(node.getElementsByTagNameNS(node.ownerDocument?.documentElement.namespaceURI || node.documentElement.namespaceURI, name));
const textOf = node => descendants(node, 't').map(text => text.textContent).join(' ').trim();
const cellsOf = row => children(row, 'tc');
const rowsOf = table => children(table, 'tr');
const hasMerge = node => descendants(node, 'gridSpan').some(span => Number(span.getAttributeNS(span.namespaceURI, 'val')) > 1) || descendants(node, 'vMerge').length > 0;

function parseXml(source) {
  if (source.length > 8 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('O modelo contém um formato XML que não pode ser preenchido.');
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (document.getElementsByTagName('parsererror').length || ![W, STRICT_W].includes(document.documentElement.namespaceURI) || document.documentElement.localName !== 'document') throw new Error('Não foi possível ler o conteúdo deste Word. Salve uma nova cópia em .docx.');
  return document;
}

function unpackWord(bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_WORD_BYTES) throw new Error('Envie um arquivo Word .docx de até 10 MB.');
  let total = 0, count = 0;
  let files;
  try {
    files = unzipSync(bytes, { filter(file) {
      total += file.originalSize; count++;
      if (count > 2000 || file.originalSize > 12 * 1024 * 1024 || total > 40 * 1024 * 1024) throw new Error('O modelo Word é muito grande.');
      return true;
    } });
  } catch { throw new Error('Não foi possível abrir este arquivo. Envie um Word .docx válido de até 10 MB.'); }
  if (!files['[Content_Types].xml'] || !files['word/document.xml']) throw new Error('Este arquivo não é um modelo Word .docx.');
  if (Object.keys(files).some(name => /vbaProject|embeddings\/|activeX\//i.test(name)) || /macroEnabled/i.test(strFromU8(files['[Content_Types].xml']))) throw new Error('Envie uma cópia .docx sem macros ou arquivos incorporados.');
  return files;
}

function isEmptyTemplateRow(row) {
  return cellsOf(row).every(cell => {
    const value = cleanText(textOf(cell));
    return !value || /^[\d.\s_\-–—]*$/.test(value) || /^\{\{?[^{}]+\}?\}$/.test(value) || /^\[.*\]$/.test(value);
  });
}

export function inspectPassengerWord(bytes, filename = 'modelo.docx') {
  if (!/\.docx$/i.test(filename)) throw new Error('Use o formato .docx. Se o arquivo termina em .doc, abra no Word e escolha Salvar como → Documento do Word (.docx).');
  const files = unpackWord(bytes);
  const document = parseXml(strFromU8(files['word/document.xml']));
  const tables = descendants(document, 'tbl').filter(table => !isNestedTable(table));
  const candidates = tables.map((table, tableIndex) => {
    const rows = rowsOf(table);
    let candidate;
    rows.slice(0, 10).forEach((row, headerIndex) => {
      const cells = cellsOf(row);
      if (cells.length < 2 || cells.length > 20 || hasMerge(row)) return;
      const columns = cells.map((cell, index) => {
        const label = cleanText(textOf(cell)).slice(0, 80) || `Coluna ${index + 1}`;
        return { label, field: aliasMap.get(fieldKey(label)) || `extra:${fieldKey(label) || `coluna${index + 1}`}` };
      });
      const known = columns.filter(column => !column.field.startsWith('extra:')).length;
      const score = known + (columns.some(column => column.field === 'name') ? 10 : 0);
      if (known >= 2 && (!candidate || score > candidate.score)) candidate = { tableIndex, headerIndex, columns, score };
    });
    return candidate;
  }).filter(Boolean);
  if (!candidates.length) throw new Error('Não encontrei uma tabela de passageiros no modelo. Use um Word com colunas como Nome, CPF e Cidade. Envie este modelo para ajustarmos o reconhecimento.');
  for (const candidate of candidates) {
    const rows = rowsOf(tables[candidate.tableIndex]);
    const body = [];
    for (const row of rows.slice(candidate.headerIndex + 1)) {
      if (cellsOf(row).length !== candidate.columns.length || hasMerge(row)) break;
      if (!isEmptyTemplateRow(row)) break;
      body.push(row);
    }
    const next = rows[candidate.headerIndex + 1];
    candidate.filled = Boolean(next && cellsOf(next).length === candidate.columns.length && !hasMerge(next) && !isEmptyTemplateRow(next));
    candidate.blankRows = body.length;
    candidate.title = candidate.columns.map(column => column.label).join(' · ');
  }
  return { bytes, filename, tables: candidates, selected: candidates.reduce((best, item, index) => item.score > candidates[best].score ? index : best, 0) };
}

function isNestedTable(table) {
  for (let parent = table.parentNode; parent; parent = parent.parentNode) if (parent.localName === 'tbl' && [W, STRICT_W].includes(parent.namespaceURI)) return true;
  return false;
}

function wordElement(document, name) {
  return document.createElementNS(document.documentElement.namespaceURI, `${document.documentElement.prefix || 'w'}:${name}`);
}

function replaceCell(cell, value) {
  const document = cell.ownerDocument;
  const firstParagraph = descendants(cell, 'p')[0];
  const firstRun = firstParagraph && descendants(firstParagraph, 'r')[0];
  const paragraph = wordElement(document, 'p');
  const run = wordElement(document, 'r');
  const paragraphProps = firstParagraph && children(firstParagraph, 'pPr')[0];
  const runProps = firstRun && children(firstRun, 'rPr')[0];
  if (paragraphProps) paragraph.appendChild(paragraphProps.cloneNode(true));
  if (runProps) run.appendChild(runProps.cloneNode(true));
  const text = wordElement(document, 't');
  text.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
  text.textContent = value;
  run.appendChild(text); paragraph.appendChild(run);
  for (const child of Array.from(cell.childNodes)) if (child.nodeType !== 1 || child.localName !== 'tcPr') cell.removeChild(child);
  cell.appendChild(paragraph);
}

export function fillPassengerWord(model, table, people, columns = table.columns) {
  if (table.filled) throw new Error('Este modelo já tem passageiros preenchidos. Envie uma cópia com a tabela em branco.');
  if (!people.length) throw new Error('Esta viagem ainda não tem passageiros com reserva ativa.');
  if (people.length > 500 || columns.length !== table.columns.length || columns.some(column => !column.field)) throw new Error('Confira a tabela e os passageiros antes de baixar.');
  const files = unpackWord(model.bytes);
  const document = parseXml(strFromU8(files['word/document.xml']));
  const tables = descendants(document, 'tbl').filter(table => !isNestedTable(table));
  const target = tables[table.tableIndex];
  const rows = rowsOf(target);
  const header = rows[table.headerIndex];
  const blanks = rows.slice(table.headerIndex + 1, table.headerIndex + 1 + table.blankRows);
  const prototype = (blanks[0] || header).cloneNode(true);
  for (const marker of descendants(prototype, 'tblHeader')) marker.remove();
  for (const height of descendants(prototype, 'trHeight')) height.remove();
  let rowProps = children(prototype, 'trPr')[0];
  if (!rowProps) { rowProps = wordElement(document, 'trPr'); prototype.insertBefore(rowProps, prototype.firstChild); }
  if (!children(rowProps, 'cantSplit').length) rowProps.appendChild(wordElement(document, 'cantSplit'));
  // Campos e marcadores da linha vazia não devem ser duplicados no documento final.
  for (const bookmark of [...descendants(prototype, 'bookmarkStart'), ...descendants(prototype, 'bookmarkEnd')]) bookmark.remove();
  if (!blanks.length) {
    for (const style of [...descendants(prototype, 'b'), ...descendants(prototype, 'shd')]) style.remove();
  }
  const anchor = blanks[0] || header.nextSibling;
  people.forEach((person, index) => {
    const row = prototype.cloneNode(true);
    cellsOf(row).forEach((cell, columnIndex) => replaceCell(cell, passengerWordValue(person, columns[columnIndex].field, index)));
    target.insertBefore(row, anchor);
  });
  blanks.forEach(row => row.remove());
  let headerProps = children(header, 'trPr')[0];
  if (!headerProps) { headerProps = wordElement(document, 'trPr'); header.insertBefore(headerProps, header.firstChild); }
  if (!children(headerProps, 'tblHeader').length) headerProps.appendChild(wordElement(document, 'tblHeader'));
  files['word/document.xml'] = strToU8(new XMLSerializer().serializeToString(document));
  return zipSync(files, { level: 6 });
}

export function downloadPassengerWord(bytes, trip) {
  const slug = fieldKey(trip.title).slice(0, 70) || trip.id;
  const blob = new Blob([bytes], { type: MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `passageiros-${slug}.docx`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
