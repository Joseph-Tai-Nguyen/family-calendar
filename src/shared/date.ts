/**
 * Timezone-free civil-date helpers. All calendar logic works on ISO date strings
 * ("YYYY-MM-DD") and integer "epoch days" so that results never depend on the
 * runtime's local timezone (browser vs. Cloudflare Worker).
 */
export type ISODate = string;

const MS_PER_DAY = 86_400_000;

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatISO(y: number, m: number, d: number): ISODate {
  return `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`;
}

export function parseISO(iso: ISODate): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = parseISO(value);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function toEpochDay(y: number, m: number, d: number): number {
  const dt = new Date(0);
  dt.setUTCFullYear(y, m - 1, d);
  dt.setUTCHours(0, 0, 0, 0);
  return Math.round(dt.getTime() / MS_PER_DAY);
}

export function isoToEpoch(iso: ISODate): number {
  const [y, m, d] = parseISO(iso);
  return toEpochDay(y, m, d);
}

export function epochToISO(n: number): ISODate {
  const dt = new Date(n * MS_PER_DAY);
  return formatISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(iso: ISODate, n: number): ISODate {
  return epochToISO(isoToEpoch(iso) + n);
}

/** Number of days from `a` to `b` (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return isoToEpoch(b) - isoToEpoch(a);
}

/** 0 = Sunday ... 6 = Saturday */
export function dayOfWeek(iso: ISODate): number {
  // 1970-01-01 was a Thursday (4)
  return (((isoToEpoch(iso) + 4) % 7) + 7) % 7;
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

/** Today's civil date in the runtime's local timezone (or a given IANA zone). */
export function todayISO(timeZone?: string): ISODate {
  const now = new Date();
  if (!timeZone) return formatISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts;
}

export function minISO(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}

export function maxISO(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

/** Inclusive list of dates from start to end. */
export function dateRange(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let n = isoToEpoch(start), e = isoToEpoch(end); n <= e; n++) out.push(epochToISO(n));
  return out;
}

/** 6x7 grid of dates covering the month, starting on `weekStart` (0 = Sunday, 1 = Monday). */
export function monthMatrix(y: number, m: number, weekStart: 0 | 1 = 0): ISODate[][] {
  const first = formatISO(y, m, 1);
  const offset = (dayOfWeek(first) - weekStart + 7) % 7;
  let cursor = addDays(first, -offset);
  const rows: ISODate[][] = [];
  for (let r = 0; r < 6; r++) {
    const row: ISODate[] = [];
    for (let c = 0; c < 7; c++) {
      row.push(cursor);
      cursor = addDays(cursor, 1);
    }
    rows.push(row);
  }
  return rows;
}

/** Sunday on or before the date. */
export function sundayOnOrBefore(iso: ISODate): ISODate {
  return addDays(iso, -dayOfWeek(iso));
}

/** Sunday strictly after the date. */
export function sundayAfter(iso: ISODate): ISODate {
  return addDays(iso, 7 - dayOfWeek(iso));
}

export function newId(prefix = ''): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += b.toString(36).padStart(2, '0');
  return prefix + s.slice(0, 14);
}
