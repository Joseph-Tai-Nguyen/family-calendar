/**
 * iCalendar (RFC 5545) generation: all-day events with VALARM reminders.
 * Used for the .ics download (browser) and the subscribable feed (Worker).
 */
import { addDays, formatISO, parseISO, todayISO, type ISODate } from './date';
import { buildReminders, type Reminder } from './events/events';
import type { AppData } from './model';

export interface IcsEvent {
  uid: string;
  date: ISODate;
  summary: string;
  description?: string;
  /** minutes relative to the event's start (local midnight). Negative = before. */
  alarms: number[];
  categories?: string[];
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold lines to 75 octets (UTF-8 aware). */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let curLen = 0;
  for (const ch of line) {
    const len = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (curLen + len > limit) {
      out.push(cur);
      cur = '';
      curLen = 0;
    }
    cur += ch;
    curLen += len;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const compact = (iso: ISODate) => iso.replace(/-/g, '');

function duration(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  return `${sign}PT${Math.abs(minutes)}M`;
}

export function buildIcs(events: IcsEvent[], calName: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//family-calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calName)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      `DTEND;VALUE=DATE:${compact(addDays(e.date, 1))}`,
      `SUMMARY:${escapeText(e.summary)}`,
      'TRANSP:TRANSPARENT',
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.categories?.length) lines.push(`CATEGORIES:${e.categories.map(escapeText).join(',')}`);
    for (const m of [...new Set(e.alarms)]) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(e.summary)}`, `TRIGGER:${duration(m)}`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Convert the app's reminders into ICS events, grouping several reminders for
 * the same item into one VEVENT with multiple alarms.
 */
export function remindersToIcs(reminders: Reminder[], lang: 'en' | 'vi'): IcsEvent[] {
  const byKey = new Map<string, IcsEvent>();
  for (const r of reminders) {
    if (r.source === 'pill' || r.source === 'bbt') continue; // daily nags don't belong in a calendar feed
    const key = `${r.source}:${r.id.split(':').slice(0, -1).join(':') || r.id}:${r.date}`;
    const alarm = -r.daysBefore * 1440 + minutesOf(r.remindTime);
    const existing = byKey.get(key);
    if (existing) {
      existing.alarms.push(alarm);
      continue;
    }
    const detail = r.detail?.[lang];
    byKey.set(key, {
      uid: `${r.source}-${r.date}-${hash(key)}@family-calendar`,
      date: r.date,
      summary: r.title[lang],
      description: detail || undefined,
      alarms: [alarm],
      categories: [r.source],
    });
  }
  return [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** Build a full calendar (past 30 days to `years` ahead) from app data. */
export function buildCalendarFile(
  data: AppData,
  opts: { includeCycle: boolean; includeLiturgical: boolean; includeVnHolidays: boolean; years?: number; from?: ISODate },
): string {
  const from = opts.from ?? addDays(todayISO(), -30);
  const [y] = parseISO(from);
  const to = formatISO(y + (opts.years ?? 1), 12, 31);
  const settings = structuredClone(data.settings);
  settings.reminders.liturgical.enabled = settings.reminders.liturgical.enabled && opts.includeLiturgical;
  settings.reminders.lunar.enabled = settings.reminders.lunar.enabled && opts.includeVnHolidays;
  const reminders = buildReminders({ ...data, settings }, from, to, { includeCycle: opts.includeCycle });
  return buildIcs(remindersToIcs(reminders, settings.language), settings.language === 'vi' ? 'Lịch Gia Đình' : 'Family Calendar');
}
