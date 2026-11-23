/** Period logging operations (mutate an AppData draft). */
import { addDays, diffDays, newId, type ISODate } from '../../shared/date';
import { cycleStats, sortPeriods, type Period } from '../../shared/cycle/cycle';
import type { AppData } from '../../shared/model';

export function periodOn(periods: Period[], date: ISODate, avgPeriod: number): Period | undefined {
  return periods.find((p) => date >= p.start && date <= (p.end ?? addDays(p.start, avgPeriod - 1)));
}

/** Mark `date` as the first day of a period (moves an adjacent period's start earlier if close). */
export function startPeriod(d: AppData, date: ISODate, today: ISODate) {
  const { averagePeriod } = cycleStats(d.periods, d.settings.cycle);
  if (periodOn(d.periods, date, averagePeriod)) return;
  const soon = sortPeriods(d.periods).find((p) => p.start > date && diffDays(date, p.start) <= 7);
  if (soon) {
    soon.start = date;
    return;
  }
  const end = addDays(date, averagePeriod - 1);
  d.periods.push({ id: newId('p_'), start: date, end: end < today ? end : undefined });
  d.periods = sortPeriods(d.periods);
}

/** Mark `date` as the last day of the most recent period that started before it. */
export function endPeriod(d: AppData, date: ISODate) {
  const p = sortPeriods(d.periods)
    .filter((x) => x.start <= date && diffDays(x.start, date) < 15)
    .pop();
  if (p) p.end = date;
}

export function removePeriod(d: AppData, id: string) {
  d.periods = d.periods.filter((p) => p.id !== id);
}
