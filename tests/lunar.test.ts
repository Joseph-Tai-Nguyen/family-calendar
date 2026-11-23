import { describe, expect, it } from 'vitest';
import { addDays } from '../src/shared/date';
import {
  dayCanChi,
  getLeapMonth,
  isoToLunar,
  jdFromISO,
  lunarMonthLength,
  lunarToSolar,
  yearCanChi,
} from '../src/shared/lunar/vietnamese-lunar';
import { vnHolidaysForLunarYear, vnHolidaysOn } from '../src/shared/lunar/vietnamese-holidays';

describe('Vietnamese lunar calendar', () => {
  it.each([
    ['2023-01-22', 2023],
    ['2024-02-10', 2024],
    ['2025-01-29', 2025],
    ['2026-02-17', 2026],
    ['2027-02-06', 2027],
  ])('Tết on %s', (iso, year) => {
    expect(isoToLunar(iso)).toMatchObject({ day: 1, month: 1, year, leap: false });
    expect(lunarToSolar(1, 1, year)).toBe(iso);
  });

  it('Tết 1985 differs from China (UTC+7 vs UTC+8)', () => {
    expect(lunarToSolar(1, 1, 1985)).toBe('1985-01-21');
    expect(lunarToSolar(1, 1, 1985, false, 8)).toBe('1985-02-20');
  });

  it('finds leap months', () => {
    expect(getLeapMonth(2023)).toBe(2);
    expect(getLeapMonth(2025)).toBe(6);
    expect(getLeapMonth(2024)).toBe(0);
    expect(isoToLunar('2023-03-22')).toMatchObject({ day: 1, month: 2, leap: true, year: 2023 });
    expect(lunarToSolar(1, 2, 2024, true)).toBeNull();
  });

  it('Mid-Autumn 2025 is Oct 6', () => {
    expect(lunarToSolar(15, 8, 2025)).toBe('2025-10-06');
  });

  it('round-trips every 5th day from 1950 to 2100', () => {
    for (let d = '1950-01-01'; d < '2100-12-31'; d = addDays(d, 5)) {
      const l = isoToLunar(d);
      expect(lunarToSolar(l.day, l.month, l.year, l.leap)).toBe(d);
      expect(l.day).toBeLessThanOrEqual(lunarMonthLength(l.month, l.year, l.leap));
    }
  });

  it('Can Chi', () => {
    expect(yearCanChi(2025)).toBe('Ất Tỵ');
    expect(yearCanChi(2026)).toBe('Bính Ngọ');
    // 2000-01-01 was a Mậu Ngọ day
    expect(dayCanChi(jdFromISO('2000-01-01'))).toBe('Mậu Ngọ');
  });

  it('holidays', () => {
    const y2026 = vnHolidaysForLunarYear(2026);
    expect(y2026.find((h) => h.key === 'tet_1')?.date).toBe('2026-02-17');
    expect(y2026.find((h) => h.key === 'giao_thua')?.date).toBe(addDays(lunarToSolar(1, 1, 2027)!, -1));
    expect(vnHolidaysOn('2025-10-06').map((h) => h.key)).toContain('trung_thu');
  });
});
