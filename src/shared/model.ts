/** Application data model shared by the web app and the Worker. */
import type { ISODate } from './date';
import { DEFAULT_CYCLE_SETTINGS, type CycleSettings, type Period } from './cycle/cycle';
import { DEFAULT_LITURGICAL_OPTIONS, type ImportantDayFilter, type LiturgicalOptions } from './liturgical/liturgical';

export const SCHEMA_VERSION = 1;

export type Flow = '' | 'spotting' | 'light' | 'medium' | 'heavy';
export type Mucus = '' | 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg_white';
export type Intercourse = '' | 'protected' | 'unprotected';
export type TestResult = '' | 'negative' | 'positive';

export const SYMPTOMS = [
  'cramps', 'headache', 'backache', 'bloating', 'breast_tenderness', 'acne', 'fatigue', 'nausea',
  'cravings', 'insomnia', 'dizziness', 'diarrhea', 'constipation', 'hot_flashes', 'joint_pain', 'pelvic_pain',
] as const;
export const MOODS = [
  'happy', 'calm', 'energetic', 'loving', 'sensitive', 'sad', 'anxious', 'irritable', 'angry', 'stressed', 'tired', 'mood_swings',
] as const;

export interface DailyLog {
  date: ISODate;
  flow: Flow;
  symptoms: string[];
  moods: string[];
  mucus: Mucus;
  /** basal body temperature, °C */
  temperature?: number;
  /** kg */
  weight?: number;
  intercourse: Intercourse;
  pill: boolean;
  ovulationTest: TestResult;
  pregnancyTest: TestResult;
  notes: string;
}

export type EventKind = 'death_anniversary' | 'birthday' | 'wedding' | 'name_day' | 'memorial' | 'other';

export interface PersonalEvent {
  id: string;
  kind: EventKind;
  title: string;
  /** e.g. the deceased's name for a giỗ */
  personName: string;
  calendar: 'lunar' | 'solar';
  day: number;
  month: number;
  /** original year (death year, birth year…) to count anniversaries; lunar year for lunar events */
  year?: number;
  /** lunar only: the original date was in a leap month (observed in the regular month) */
  leapMonth: boolean;
  /** days before the event to remind, e.g. [7, 1, 0] */
  remindDays: number[];
  /** HH:MM local time for the reminder */
  remindTime: string;
  notes: string;
  enabled: boolean;
}

export interface WorldClock {
  id: string;
  label: string;
  timeZone: string;
  order: number;
  home: boolean;
}

export interface ReminderToggle {
  enabled: boolean;
  daysBefore: number;
}

export interface Settings {
  language: 'en' | 'vi';
  theme: 'rose' | 'lavender' | 'mint' | 'ocean';
  colorMode: 'auto' | 'light' | 'dark';
  weekStart: 0 | 1;
  showLunar: boolean;
  showLiturgical: boolean;
  showVnHolidays: boolean;
  showCycle: boolean;
  cycle: CycleSettings & {
    showFertile: boolean;
    showOvulation: boolean;
    pregnancyMode: boolean;
    pregnancyLmp?: ISODate;
  };
  liturgical: LiturgicalOptions;
  reminders: {
    /** default HH:MM for reminders */
    time: string;
    period: ReminderToggle;
    fertile: ReminderToggle;
    ovulation: ReminderToggle;
    pill: { enabled: boolean; time: string };
    bbt: { enabled: boolean; time: string };
    liturgical: ReminderToggle & ImportantDayFilter;
    lunar: ReminderToggle & { mung1: boolean; ram: boolean; holidays: boolean; catholicTet: boolean };
  };
  feed: { includeCycle: boolean; includeLiturgical: boolean; includeVnHolidays: boolean };
  timeBuddy: { hour12: boolean; workStart: number; workEnd: number };
}

export interface AppData {
  meta: { schemaVersion: number; updatedAt: string };
  settings: Settings;
  periods: Period[];
  logs: Record<ISODate, DailyLog>;
  events: PersonalEvent[];
  clocks: WorldClock[];
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  theme: 'rose',
  colorMode: 'auto',
  weekStart: 0,
  showLunar: true,
  showLiturgical: true,
  showVnHolidays: true,
  showCycle: true,
  cycle: { ...DEFAULT_CYCLE_SETTINGS, showFertile: true, showOvulation: true, pregnancyMode: false },
  liturgical: { ...DEFAULT_LITURGICAL_OPTIONS },
  reminders: {
    time: '08:00',
    period: { enabled: true, daysBefore: 2 },
    fertile: { enabled: false, daysBefore: 1 },
    ovulation: { enabled: false, daysBefore: 0 },
    pill: { enabled: false, time: '21:00' },
    bbt: { enabled: false, time: '06:30' },
    liturgical: {
      enabled: true,
      daysBefore: 1,
      solemnities: true,
      feasts: false,
      memorials: false,
      sundays: false,
      obligations: true,
      fastDays: true,
    },
    lunar: { enabled: true, daysBefore: 1, mung1: false, ram: false, holidays: true, catholicTet: true },
  },
  feed: { includeCycle: false, includeLiturgical: true, includeVnHolidays: true },
  timeBuddy: { hour12: true, workStart: 9, workEnd: 17 },
};

export function emptyLog(date: ISODate): DailyLog {
  return {
    date,
    flow: '',
    symptoms: [],
    moods: [],
    mucus: '',
    intercourse: '',
    pill: false,
    ovulationTest: '',
    pregnancyTest: '',
    notes: '',
  };
}

export function isLogEmpty(l: DailyLog): boolean {
  return (
    !l.flow &&
    !l.symptoms.length &&
    !l.moods.length &&
    !l.mucus &&
    l.temperature === undefined &&
    l.weight === undefined &&
    !l.intercourse &&
    !l.pill &&
    !l.ovulationTest &&
    !l.pregnancyTest &&
    !l.notes.trim()
  );
}

export function defaultClocks(localZone: string): WorldClock[] {
  const zones = [localZone, 'Asia/Ho_Chi_Minh', 'Europe/Rome', 'UTC'].filter((z, i, a) => a.indexOf(z) === i);
  return zones.map((tz, i) => ({
    id: `clk_${i}`,
    label: tz === 'Asia/Ho_Chi_Minh' ? 'Sài Gòn' : tz === 'Europe/Rome' ? 'Rome' : tz.split('/').pop()!.replace(/_/g, ' '),
    timeZone: tz,
    order: i,
    home: i === 0,
  }));
}

export function emptyData(localZone = 'UTC'): AppData {
  return {
    meta: { schemaVersion: SCHEMA_VERSION, updatedAt: '' },
    settings: structuredClone(DEFAULT_SETTINGS),
    periods: [],
    logs: {},
    events: [],
    clocks: defaultClocks(localZone),
  };
}

type Plain = Record<string, unknown>;

function isPlain(v: unknown): v is Plain {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Deep-merge stored settings over defaults so newly added settings get default values. */
export function mergeDefaults<T>(defaults: T, stored: unknown): T {
  if (!isPlain(defaults) || !isPlain(stored)) return (stored === undefined ? defaults : (stored as T));
  const out: Plain = { ...defaults };
  for (const [k, v] of Object.entries(stored)) {
    out[k] = k in (defaults as Plain) ? mergeDefaults((defaults as Plain)[k], v) : v;
  }
  return out as T;
}
