import { describe, expect, it } from 'vitest';
import { cycleCalendar, cycleStats, cycleStatus, predictCycles, pregnancyInfo, type Period } from '../src/shared/cycle/cycle';

const periods: Period[] = [
  { id: 'a', start: '2026-07-01', end: '2026-07-05' },
  { id: 'b', start: '2026-07-29', end: '2026-08-02' },
  { id: 'c', start: '2026-08-28', end: '2026-09-01' },
  { id: 'd', start: '2026-09-26', end: '2026-09-30' },
];

describe('cycle predictions', () => {
  it('computes averages', () => {
    const s = cycleStats(periods);
    expect(s.cycles.map((c) => c.length)).toEqual([28, 30, 29, undefined]);
    expect(s.averageCycle).toBe(29);
    expect(s.averagePeriod).toBe(5);
    expect(s.shortestCycle).toBe(28);
    expect(s.longestCycle).toBe(30);
  });

  it('uses defaults when averaging is off', () => {
    expect(cycleStats(periods, { defaultCycleLength: 30, defaultPeriodLength: 4, lutealPhase: 14, useAverage: false, averageOver: 6 }).averageCycle).toBe(30);
  });

  it('predicts next period, ovulation and fertile window', () => {
    const next = predictCycles(periods, '2026-11-30').filter((c) => c.predicted);
    expect(next[0].start).toBe('2026-10-25');
    const current = predictCycles(periods, '2026-10-01').find((c) => c.start === '2026-09-26')!;
    expect(current.ovulation).toBe('2026-10-11'); // 2026-10-25 - 14
    expect(current.fertileStart).toBe('2026-10-06');
    expect(current.fertileEnd).toBe('2026-10-12');
  });

  it('builds a day map', () => {
    const map = cycleCalendar(periods, '2026-09-20', '2026-10-31');
    expect(map.get('2026-09-27')?.period).toBe(true);
    expect(map.get('2026-10-11')?.ovulation).toBe(true);
    expect(map.get('2026-10-25')?.predictedPeriod).toBe(true);
    expect(map.get('2026-09-30')?.cycleDay).toBe(5);
  });

  it('status and lateness', () => {
    const st = cycleStatus(periods, '2026-10-28');
    expect(st.lateByDays).toBe(3);
    expect(st.cycleDay).toBe(33);
  });

  it('pregnancy', () => {
    const p = pregnancyInfo('2026-03-01', '2026-11-23');
    expect(p.dueDate).toBe('2026-12-06');
    expect(p.weeks).toBe(38);
    expect(p.trimester).toBe(3);
  });
});
