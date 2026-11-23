/**
 * Menstrual cycle statistics and predictions (calendar method).
 *
 * - Cycle length = days between consecutive period starts.
 * - Predicted ovulation = next period start − luteal phase (default 14 days).
 * - Fertile window = ovulation − 5 … ovulation + 1.
 *
 * These are estimates for personal tracking, not medical advice or contraception.
 */
import { addDays, diffDays, isoToEpoch, type ISODate } from '../date';

export interface Period {
  id: string;
  start: ISODate;
  /** inclusive; undefined while the period is ongoing */
  end?: ISODate;
  notes?: string;
}

export interface CycleSettings {
  defaultCycleLength: number;
  defaultPeriodLength: number;
  lutealPhase: number;
  /** compute averages from history instead of using the defaults */
  useAverage: boolean;
  /** number of most recent cycles to average */
  averageOver: number;
}

export const DEFAULT_CYCLE_SETTINGS: CycleSettings = {
  defaultCycleLength: 28,
  defaultPeriodLength: 5,
  lutealPhase: 14,
  useAverage: true,
  averageOver: 6,
};

export const MIN_VALID_CYCLE = 15;
export const MAX_VALID_CYCLE = 60;

export interface CycleRecord {
  start: ISODate;
  /** days until next period start (undefined for the current cycle) */
  length?: number;
  periodLength?: number;
}

export interface CycleStats {
  cycles: CycleRecord[];
  averageCycle: number;
  averagePeriod: number;
  shortestCycle?: number;
  longestCycle?: number;
  /** cycle-to-cycle variation (max − min) of the averaged cycles */
  variation?: number;
}

export function sortPeriods(periods: Period[]): Period[] {
  return [...periods].sort((a, b) => a.start.localeCompare(b.start));
}

export function periodLength(p: Period): number | undefined {
  return p.end ? diffDays(p.start, p.end) + 1 : undefined;
}

export function cycleStats(periods: Period[], settings: CycleSettings = DEFAULT_CYCLE_SETTINGS): CycleStats {
  const sorted = sortPeriods(periods);
  const cycles: CycleRecord[] = sorted.map((p, i) => ({
    start: p.start,
    length: i < sorted.length - 1 ? diffDays(p.start, sorted[i + 1].start) : undefined,
    periodLength: periodLength(p),
  }));
  const valid = cycles
    .map((c) => c.length)
    .filter((n): n is number => n !== undefined && n >= MIN_VALID_CYCLE && n <= MAX_VALID_CYCLE)
    .slice(-settings.averageOver);
  const periodLens = cycles
    .map((c) => c.periodLength)
    .filter((n): n is number => n !== undefined && n > 0 && n <= 15)
    .slice(-settings.averageOver);
  const avg = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) / xs.length);
  const useAvg = settings.useAverage;
  return {
    cycles,
    averageCycle: useAvg && valid.length ? avg(valid) : settings.defaultCycleLength,
    averagePeriod: useAvg && periodLens.length ? avg(periodLens) : settings.defaultPeriodLength,
    shortestCycle: valid.length ? Math.min(...valid) : undefined,
    longestCycle: valid.length ? Math.max(...valid) : undefined,
    variation: valid.length > 1 ? Math.max(...valid) - Math.min(...valid) : undefined,
  };
}

export type FertilityLevel = 'low' | 'medium' | 'high' | 'peak';

export interface DayCycleInfo {
  /** logged period day */
  period: boolean;
  /** predicted (future) period day */
  predictedPeriod: boolean;
  fertile: boolean;
  ovulation: boolean;
  fertility: FertilityLevel;
  /** 1-based day of current cycle, if known */
  cycleDay?: number;
}

export interface PredictedCycle {
  start: ISODate;
  periodEnd: ISODate;
  ovulation: ISODate;
  fertileStart: ISODate;
  fertileEnd: ISODate;
  predicted: boolean;
}

/**
 * Cycles (past, with actual next start, and future predictions) whose
 * ovulation/fertile windows cover the range.
 */
export function predictCycles(periods: Period[], until: ISODate, settings: CycleSettings = DEFAULT_CYCLE_SETTINGS): PredictedCycle[] {
  const sorted = sortPeriods(periods);
  if (!sorted.length) return [];
  const stats = cycleStats(sorted, settings);
  const out: PredictedCycle[] = [];
  const window = (start: ISODate, nextStart: ISODate, periodLen: number, predicted: boolean): PredictedCycle => {
    const ovulation = addDays(nextStart, -settings.lutealPhase);
    return {
      start,
      periodEnd: addDays(start, periodLen - 1),
      ovulation,
      fertileStart: addDays(ovulation, -5),
      fertileEnd: addDays(ovulation, 1),
      predicted,
    };
  };
  for (let i = 0; i < sorted.length - 1; i++) {
    const len = diffDays(sorted[i].start, sorted[i + 1].start);
    if (len < MIN_VALID_CYCLE || len > MAX_VALID_CYCLE) continue;
    out.push(window(sorted[i].start, sorted[i + 1].start, periodLength(sorted[i]) ?? stats.averagePeriod, false));
  }
  let start = sorted[sorted.length - 1].start;
  const lastLen = periodLength(sorted[sorted.length - 1]) ?? stats.averagePeriod;
  let guard = 0;
  while (start <= until && guard++ < 60) {
    const next = addDays(start, stats.averageCycle);
    out.push(window(start, next, start === sorted[sorted.length - 1].start ? lastLen : stats.averagePeriod, start !== sorted[sorted.length - 1].start));
    start = next;
  }
  return out;
}

/** Next predicted period start strictly after `today`'s cycle start. */
export function nextPeriodStart(periods: Period[], today: ISODate, settings: CycleSettings = DEFAULT_CYCLE_SETTINGS): ISODate | undefined {
  const sorted = sortPeriods(periods);
  if (!sorted.length) return undefined;
  const { averageCycle } = cycleStats(sorted, settings);
  const last = sorted[sorted.length - 1].start;
  let next = addDays(last, averageCycle);
  // If late, the prediction stays at the overdue date (the app shows "late by N days").
  if (next < today && diffDays(next, today) < averageCycle) return next;
  while (next < today) next = addDays(next, averageCycle);
  return next;
}

export interface CycleStatus {
  cycleDay?: number;
  nextPeriod?: ISODate;
  daysUntilNextPeriod?: number;
  lateByDays?: number;
  nextOvulation?: ISODate;
  inPeriod: boolean;
  fertileToday: boolean;
}

export function cycleStatus(periods: Period[], today: ISODate, settings: CycleSettings = DEFAULT_CYCLE_SETTINGS): CycleStatus {
  const sorted = sortPeriods(periods).filter((p) => p.start <= today);
  if (!sorted.length) return { inPeriod: false, fertileToday: false };
  const stats = cycleStats(sorted, settings);
  const last = sorted[sorted.length - 1];
  const cycleDay = diffDays(last.start, today) + 1;
  const expectedNext = addDays(last.start, stats.averageCycle);
  const late = diffDays(expectedNext, today);
  const lastEnd = last.end ?? addDays(last.start, stats.averagePeriod - 1);
  const map = cycleCalendar(sorted, today, today, settings);
  const nextOv = predictCycles(sorted, addDays(today, 90), settings).find((c) => c.ovulation >= today)?.ovulation;
  return {
    cycleDay,
    nextPeriod: expectedNext,
    daysUntilNextPeriod: late <= 0 ? -late : 0,
    lateByDays: late > 0 ? late : undefined,
    nextOvulation: nextOv,
    inPeriod: today <= lastEnd,
    fertileToday: map.get(today)?.fertile ?? false,
  };
}

/** Per-day cycle information for a date range. */
export function cycleCalendar(
  periods: Period[],
  from: ISODate,
  to: ISODate,
  settings: CycleSettings = DEFAULT_CYCLE_SETTINGS,
  today?: ISODate,
): Map<ISODate, DayCycleInfo> {
  const map = new Map<ISODate, DayCycleInfo>();
  const sorted = sortPeriods(periods);
  const stats = cycleStats(sorted, settings);
  const get = (d: ISODate): DayCycleInfo => {
    let v = map.get(d);
    if (!v) {
      v = { period: false, predictedPeriod: false, fertile: false, ovulation: false, fertility: 'low' };
      map.set(d, v);
    }
    return v;
  };
  const inRange = (d: ISODate) => d >= from && d <= to;
  const fromN = isoToEpoch(from);
  const toN = isoToEpoch(to);

  for (const p of sorted) {
    const end = p.end ?? addDays(p.start, stats.averagePeriod - 1);
    for (let d = p.start; d <= end; d = addDays(d, 1)) {
      if (!inRange(d)) continue;
      const info = get(d);
      if (p.end || !today || d <= today) info.period = true;
      else info.predictedPeriod = true;
    }
  }
  for (const c of predictCycles(sorted, to, settings)) {
    if (c.predicted) {
      for (let d = c.start; d <= c.periodEnd; d = addDays(d, 1)) if (inRange(d)) get(d).predictedPeriod = true;
    }
    for (let d = c.fertileStart; d <= c.fertileEnd; d = addDays(d, 1)) {
      if (!inRange(d)) continue;
      const info = get(d);
      if (info.period) continue;
      info.fertile = true;
      const off = diffDays(c.ovulation, d);
      info.fertility = off === 0 ? 'peak' : off >= -2 && off <= 0 ? 'high' : off === 1 ? 'high' : 'medium';
      if (off === 0) info.ovulation = true;
    }
  }
  // cycle day numbers
  if (sorted.length) {
    let idx = 0;
    for (let n = fromN; n <= toN; n++) {
      const d = addDays(from, n - fromN);
      while (idx + 1 < sorted.length && sorted[idx + 1].start <= d) idx++;
      if (sorted[idx].start <= d) {
        const cd = diffDays(sorted[idx].start, d) + 1;
        if (cd <= MAX_VALID_CYCLE) get(d).cycleDay = cd;
      }
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Pregnancy mode
// ---------------------------------------------------------------------------

export interface PregnancyInfo {
  dueDate: ISODate;
  weeks: number;
  days: number;
  trimester: 1 | 2 | 3;
  daysToGo: number;
}

/** Naegele's rule: due date = LMP + 280 days. */
export function pregnancyInfo(lmp: ISODate, today: ISODate): PregnancyInfo {
  const elapsed = Math.max(0, diffDays(lmp, today));
  const weeks = Math.floor(elapsed / 7);
  const dueDate = addDays(lmp, 280);
  return {
    dueDate,
    weeks,
    days: elapsed % 7,
    trimester: weeks < 13 ? 1 : weeks < 27 ? 2 : 3,
    daysToGo: diffDays(today, dueDate),
  };
}
