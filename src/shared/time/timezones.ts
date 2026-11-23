/**
 * Time-zone math using only the built-in Intl API (IANA tz database shipped
 * with the browser / V8). No tz data is bundled.
 */

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday */
  weekday: number;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    partsFormatters.set(timeZone, f);
  }
  return f;
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function isValidTimeZone(timeZone: string): boolean {
  try {
    partsFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function zonedParts(instant: Date | number, timeZone: string): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(typeof instant === 'number' ? new Date(instant) : instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
  };
}

/** UTC offset in minutes (e.g. +420 for Asia/Ho_Chi_Minh) at the instant. */
export function offsetMinutes(instant: Date | number, timeZone: string): number {
  const ms = typeof instant === 'number' ? instant : instant.getTime();
  const p = zonedParts(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/**
 * Convert a wall-clock time in a zone to a UTC instant (ms). For times inside
 * a DST gap the result is shifted forward; for ambiguous times the earlier
 * offset is used.
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  const local = Date.UTC(year, month - 1, day, hour, minute);
  let guess = local - offsetMinutes(local, timeZone) * 60000;
  const off2 = offsetMinutes(guess, timeZone);
  guess = local - off2 * 60000;
  return guess;
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/** Difference label between two zones, e.g. "+12h", "−5:30". */
export function formatDiff(minutes: number): string {
  if (minutes === 0) return '±0h';
  const sign = minutes < 0 ? '−' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m ? `${sign}${h}:${String(m).padStart(2, '0')}` : `${sign}${h}h`;
}

export function isDST(instant: Date | number, timeZone: string): boolean {
  const ms = typeof instant === 'number' ? instant : instant.getTime();
  const y = new Date(ms).getUTCFullYear();
  const jan = offsetMinutes(Date.UTC(y, 0, 1), timeZone);
  const jul = offsetMinutes(Date.UTC(y, 6, 1), timeZone);
  if (jan === jul) return false;
  return offsetMinutes(ms, timeZone) === Math.max(jan, jul);
}

export function zoneAbbreviation(instant: Date | number, timeZone: string, locale = 'en-US'): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' }).formatToParts(
      typeof instant === 'number' ? new Date(instant) : instant,
    );
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

export interface DstTransition {
  /** UTC ms of the transition */
  at: number;
  fromOffset: number;
  toOffset: number;
}

/** Next DST/offset change within ~13 months, found by hourly bisection of day steps. */
export function nextTransition(from: number, timeZone: string): DstTransition | undefined {
  const DAY = 86_400_000;
  let prev = offsetMinutes(from, timeZone);
  for (let t = from + DAY; t < from + 400 * DAY; t += DAY) {
    const cur = offsetMinutes(t, timeZone);
    if (cur !== prev) {
      let lo = t - DAY;
      let hi = t;
      while (hi - lo > 60_000) {
        const mid = Math.floor((lo + hi) / 2);
        if (offsetMinutes(mid, timeZone) === prev) lo = mid;
        else hi = mid;
      }
      return { at: hi, fromOffset: prev, toOffset: cur };
    }
    prev = cur;
  }
  return undefined;
}

export function formatTime(instant: number, timeZone: string, hour12: boolean, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit', hour12 }).format(instant);
}

export function formatDate(instant: number, timeZone: string, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, { timeZone, weekday: 'short', month: 'short', day: 'numeric' }).format(instant);
}

export function formatDateTime(instant: number, timeZone: string, hour12: boolean, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12,
  }).format(instant);
}

/** All IANA zones known to the runtime (falls back to the curated city list). */
export function allTimeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  try {
    if (intl.supportedValuesOf) return intl.supportedValuesOf('timeZone');
  } catch {
    /* ignore */
  }
  return [];
}

export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export type HourKind = 'night' | 'edge' | 'work';

/** Classify a local hour for the planner's day/night colouring. */
export function hourKind(hour: number, workStart = 9, workEnd = 17): HourKind {
  if (hour >= workStart && hour < workEnd) return 'work';
  if (hour >= 7 && hour < 22) return 'edge';
  return 'night';
}
