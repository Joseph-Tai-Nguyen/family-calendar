/**
 * Minimal .xlsx (Office Open XML) writer/reader for backups, built on fflate.
 * Writes one worksheet per table with inline strings; reads shared or inline
 * strings, numbers and booleans from any reasonably standard workbook
 * (Excel, Google Sheets, LibreOffice exports).
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { TABLE_NAMES, type Rows, type Tables } from '../../shared/schema';

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // strip characters that are illegal in XML 1.0
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function colName(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? 'A';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function sheetXml(rows: Rows): string {
  const body = rows
    .map((row, r) => {
      const cells = row
        .map((v, c) => {
          if (v === '') return '';
          const style = r === 0 ? ' s="1"' : '';
          return `<c r="${colName(c)}${r + 1}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
        })
        .join('');
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<sheetData>${body}</sheetData></worksheet>`
  );
}

export function writeXlsx(tables: Tables): Uint8Array {
  const names = TABLE_NAMES;
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        names
          .map(
            (_, i) =>
              `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
          )
          .join('') +
        '</Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    ),
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
        '</sheets></workbook>',
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        names
          .map(
            (_, i) =>
              `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
          )
          .join('') +
        `<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        '</Relationships>',
    ),
    'xl/styles.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
        '</styleSheet>',
    ),
  };
  names.forEach((n, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(tables[n]))));
  return zipSync(files, { level: 6 });
}

function parse(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

const all = (node: Document | Element, tag: string) => Array.from(node.getElementsByTagNameNS('*', tag));

export function readXlsx(bytes: Uint8Array): Partial<Tables> {
  const zip = unzipSync(bytes);
  const text = (path: string) => (zip[path] ? strFromU8(zip[path]) : '');
  const shared = text('xl/sharedStrings.xml')
    ? all(parse(text('xl/sharedStrings.xml')), 'si').map((si) => all(si, 't').map((t) => t.textContent ?? '').join(''))
    : [];
  const rels = new Map<string, string>();
  for (const rel of all(parse(text('xl/_rels/workbook.xml.rels')), 'Relationship')) {
    const target = rel.getAttribute('Target') ?? '';
    rels.set(rel.getAttribute('Id') ?? '', target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  }
  const out: Partial<Tables> = {};
  for (const sheet of all(parse(text('xl/workbook.xml')), 'sheet')) {
    const name = sheet.getAttribute('name') as keyof Tables;
    if (!TABLE_NAMES.includes(name)) continue;
    const rid =
      sheet.getAttribute('r:id') ??
      sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ??
      '';
    const path = rels.get(rid);
    if (!path || !zip[path]) continue;
    const rows: Rows = [];
    for (const row of all(parse(text(path)), 'row')) {
      const r = Number(row.getAttribute('r') ?? rows.length + 1) - 1;
      const values: string[] = [];
      let next = 0;
      for (const c of all(row, 'c')) {
        const ref = c.getAttribute('r');
        const ci = ref ? colIndex(ref) : next;
        next = ci + 1;
        const t = c.getAttribute('t');
        const v = all(c, 'v')[0]?.textContent ?? '';
        let value: string;
        if (t === 's') value = shared[Number(v)] ?? '';
        else if (t === 'inlineStr') value = all(c, 't').map((x) => x.textContent ?? '').join('');
        else if (t === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
        else value = v;
        values[ci] = value;
      }
      rows[r] = Array.from(values, (x) => x ?? '');
    }
    out[name] = Array.from(rows, (x) => x ?? []);
  }
  return out;
}
