/**
 * Tabular (Google Sheets / Excel) representation of AppData.
 * One tab per table; first row is the header. All cells are strings.
 * The same tables are used for the Google Sheet, the .xlsx backup and the Worker.
 */
import { emptyData, DEFAULT_SETTINGS, mergeDefaults, SCHEMA_VERSION, type AppData, type DailyLog, type PersonalEvent, type Settings, type WorldClock } from './model';
import type { Period } from './cycle/cycle';
import { isISODate } from './date';

export const TABLES = {
  meta: ['key', 'value'],
  settings: ['key', 'value'],
  periods: ['id', 'start', 'end', 'notes'],
  logs: ['date', 'flow', 'symptoms', 'moods', 'mucus', 'temperature', 'weight', 'intercourse', 'pill', 'ovulationTest', 'pregnancyTest', 'notes'],
  events: ['id', 'kind', 'title', 'personName', 'calendar', 'day', 'month', 'year', 'leapMonth', 'remindDays', 'remindTime', 'notes', 'enabled'],
  clocks: ['id', 'label', 'timeZone', 'order', 'home'],
} as const;

export type TableName = keyof typeof TABLES;
export const TABLE_NAMES = Object.keys(TABLES) as TableName[];
export type Rows = string[][];
export type Tables = Record<TableName, Rows>;

const s = (v: unknown): string => (v === undefined || v === null ? '' : String(v));
const b = (v: boolean): string => (v ? 'TRUE' : 'FALSE');
const toBool = (v: string | undefined): boolean => /^(true|1|yes|x)$/i.test((v ?? '').trim());
const toNum = (v: string | undefined): number | undefined => {
  if (v === undefined || v.trim() === '') return undefined;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};
const list = (v: string | undefined): string[] =>
  (v ?? '')
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean);

export function toTables(data: AppData): Tables {
  const settingsRows = Object.entries(data.settings).map(([k, v]) => [k, JSON.stringify(v)]);
  return {
    meta: [
      [...TABLES.meta],
      ['schemaVersion', String(SCHEMA_VERSION)],
      ['updatedAt', data.meta.updatedAt],
    ],
    settings: [[...TABLES.settings], ...settingsRows],
    periods: [[...TABLES.periods], ...data.periods.map((p) => [p.id, p.start, s(p.end), s(p.notes)])],
    logs: [
      [...TABLES.logs],
      ...Object.values(data.logs)
        .sort((x, y) => x.date.localeCompare(y.date))
        .map((l) => [
          l.date,
          l.flow,
          l.symptoms.join(','),
          l.moods.join(','),
          l.mucus,
          s(l.temperature),
          s(l.weight),
          l.intercourse,
          b(l.pill),
          l.ovulationTest,
          l.pregnancyTest,
          l.notes,
        ]),
    ],
    events: [
      [...TABLES.events],
      ...data.events.map((e) => [
        e.id,
        e.kind,
        e.title,
        e.personName,
        e.calendar,
        String(e.day),
        String(e.month),
        s(e.year),
        b(e.leapMonth),
        e.remindDays.join(','),
        e.remindTime,
        e.notes,
        b(e.enabled),
      ]),
    ],
    clocks: [
      [...TABLES.clocks],
      ...data.clocks.map((c) => [c.id, c.label, c.timeZone, String(c.order), b(c.home)]),
    ],
  };
}

/** Map rows to objects keyed by header (tolerates re-ordered or extra columns). */
function records(rows: Rows | undefined): Record<string, string>[] {
  if (!rows || rows.length < 1) return [];
  const header = rows[0].map((h) => s(h).trim());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => (o[h] = s(r[i])));
    return o;
  });
}

export function fromTables(tables: Partial<Tables>, localZone = 'UTC'): AppData {
  const data = emptyData(localZone);
  const meta = Object.fromEntries(records(tables.meta).map((r) => [r.key, r.value]));
  data.meta.updatedAt = meta.updatedAt ?? '';

  const storedSettings: Record<string, unknown> = {};
  for (const r of records(tables.settings)) {
    if (!r.key) continue;
    try {
      storedSettings[r.key] = JSON.parse(r.value);
    } catch {
      storedSettings[r.key] = r.value;
    }
  }
  data.settings = mergeDefaults<Settings>(structuredClone(DEFAULT_SETTINGS), storedSettings);

  data.periods = records(tables.periods)
    .filter((r) => isISODate(r.start))
    .map(
      (r): Period => ({
        id: r.id || `p_${r.start}`,
        start: r.start,
        end: isISODate(r.end) ? r.end : undefined,
        notes: r.notes || undefined,
      }),
    );

  data.logs = {};
  for (const r of records(tables.logs)) {
    if (!isISODate(r.date)) continue;
    const log: DailyLog = {
      date: r.date,
      flow: (r.flow as DailyLog['flow']) || '',
      symptoms: list(r.symptoms),
      moods: list(r.moods),
      mucus: (r.mucus as DailyLog['mucus']) || '',
      temperature: toNum(r.temperature),
      weight: toNum(r.weight),
      intercourse: (r.intercourse as DailyLog['intercourse']) || '',
      pill: toBool(r.pill),
      ovulationTest: (r.ovulationTest as DailyLog['ovulationTest']) || '',
      pregnancyTest: (r.pregnancyTest as DailyLog['pregnancyTest']) || '',
      notes: r.notes ?? '',
    };
    data.logs[r.date] = log;
  }

  data.events = records(tables.events)
    .filter((r) => r.title && toNum(r.day) && toNum(r.month))
    .map(
      (r): PersonalEvent => ({
        id: r.id || `e_${Math.random().toString(36).slice(2, 10)}`,
        kind: (r.kind as PersonalEvent['kind']) || 'other',
        title: r.title,
        personName: r.personName ?? '',
        calendar: r.calendar === 'lunar' ? 'lunar' : 'solar',
        day: toNum(r.day)!,
        month: toNum(r.month)!,
        year: toNum(r.year),
        leapMonth: toBool(r.leapMonth),
        remindDays: list(r.remindDays)
          .map(Number)
          .filter((n) => Number.isInteger(n) && n >= 0),
        remindTime: /^\d{1,2}:\d{2}$/.test(r.remindTime) ? r.remindTime : '08:00',
        notes: r.notes ?? '',
        enabled: r.enabled === '' ? true : toBool(r.enabled),
      }),
    );

  const clocks = records(tables.clocks)
    .filter((r) => r.timeZone)
    .map(
      (r, i): WorldClock => ({
        id: r.id || `clk_${i}`,
        label: r.label || r.timeZone,
        timeZone: r.timeZone,
        order: toNum(r.order) ?? i,
        home: toBool(r.home),
      }),
    )
    .sort((x, y) => x.order - y.order);
  if (clocks.length) data.clocks = clocks;

  return data;
}

/** Validates a client payload before the Worker writes it to the sheet. */
export function validateTables(input: unknown): Tables {
  if (typeof input !== 'object' || input === null) throw new Error('tables must be an object');
  const out = {} as Tables;
  for (const name of TABLE_NAMES) {
    const rows = (input as Record<string, unknown>)[name];
    if (!Array.isArray(rows)) throw new Error(`missing table ${name}`);
    if (rows.length > 20000) throw new Error(`table ${name} too large`);
    out[name] = rows.map((r) => {
      if (!Array.isArray(r)) throw new Error(`bad row in ${name}`);
      return r.map((c) => {
        const v = s(c);
        if (v.length > 5000) throw new Error(`cell too large in ${name}`);
        return v;
      });
    });
    const header = out[name][0] ?? [];
    if (header.join(',') !== TABLES[name].join(',')) throw new Error(`bad header in ${name}`);
  }
  return out;
}
