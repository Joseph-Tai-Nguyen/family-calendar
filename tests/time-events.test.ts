import { describe, expect, it } from 'vitest';
import { formatDiff, isDST, nextTransition, offsetMinutes, zonedTimeToUtc } from '../src/shared/time/timezones';
import { searchCities } from '../src/shared/time/cities';
import { buildReminders, occurrencesInRange } from '../src/shared/events/events';
import { emptyData, type PersonalEvent } from '../src/shared/model';
import { fromTables, toTables, validateTables } from '../src/shared/schema';
import { buildCalendarFile } from '../src/shared/ics';

describe('time zones', () => {
  it('offsets', () => {
    expect(offsetMinutes(Date.UTC(2026, 0, 15), 'America/Toronto')).toBe(-300);
    expect(offsetMinutes(Date.UTC(2026, 6, 15), 'America/Toronto')).toBe(-240);
    expect(offsetMinutes(Date.UTC(2026, 6, 15), 'Asia/Ho_Chi_Minh')).toBe(420);
    expect(offsetMinutes(Date.UTC(2026, 6, 15), 'Asia/Kolkata')).toBe(330);
    expect(isDST(Date.UTC(2026, 6, 15), 'America/Toronto')).toBe(true);
    expect(isDST(Date.UTC(2026, 6, 15), 'Asia/Ho_Chi_Minh')).toBe(false);
  });

  it('wall time to UTC', () => {
    expect(new Date(zonedTimeToUtc(2026, 1, 15, 9, 0, 'America/Toronto')).toISOString()).toBe('2026-01-15T14:00:00.000Z');
    expect(new Date(zonedTimeToUtc(2026, 11, 24, 7, 30, 'Asia/Ho_Chi_Minh')).toISOString()).toBe('2026-11-24T00:30:00.000Z');
  });

  it('next DST transition', () => {
    const t = nextTransition(Date.UTC(2026, 9, 1), 'America/Toronto');
    expect(new Date(t!.at).toISOString()).toBe('2026-11-01T06:00:00.000Z');
    expect(formatDiff(t!.toOffset - t!.fromOffset)).toBe('−1h');
  });

  it('city search is accent-insensitive', () => {
    expect(searchCities('sai gon')[0].tz).toBe('Asia/Ho_Chi_Minh');
    expect(searchCities('Hà Nội')[0].name).toBe('Hanoi');
  });
});

const gio: PersonalEvent = {
  id: 'g1', kind: 'death_anniversary', title: 'Ông Nội', personName: '', calendar: 'lunar',
  day: 30, month: 12, year: 2023, leapMonth: false, remindDays: [7, 1], remindTime: '09:00', notes: '', enabled: true,
};

describe('events and reminders', () => {
  it('lunar 30th falls back to 29th when the month is short', () => {
    const occ = occurrencesInRange(gio, '2025-01-01', '2027-12-31');
    // Lunar 12/2024 has 29 days -> 29/12 Giáp Thìn = 2025-01-28; 12/2025 has 30 days -> 2026-02-16
    expect(occ.map((o) => o.date)).toEqual(['2025-01-28', '2026-02-16', '2027-02-05']);
    expect(occ.map((o) => o.count)).toEqual([1, 2, 3]);
  });

  it('solar Feb 29 birthday in a common year', () => {
    const bday: PersonalEvent = { ...gio, kind: 'birthday', calendar: 'solar', day: 29, month: 2, year: 2000 };
    expect(occurrencesInRange(bday, '2027-01-01', '2027-12-31')[0].date).toBe('2027-02-28');
  });

  it('builds reminders including liturgical days', () => {
    const data = emptyData('America/Toronto');
    data.events.push(gio);
    const rem = buildReminders(data, '2026-11-20', '2026-12-31');
    const ids = rem.map((r) => r.id);
    expect(ids).toContain('lit:2026-12-25');
    expect(rem.find((r) => r.id === 'lit:2026-12-25')?.remindOn).toBe('2026-12-24');
  });

  it('sheet tables round-trip', () => {
    const data = emptyData('America/Toronto');
    data.events.push(gio);
    data.periods.push({ id: 'p1', start: '2026-11-01', end: '2026-11-05' });
    data.logs['2026-11-02'] = { date: '2026-11-02', flow: 'heavy', symptoms: ['cramps'], moods: ['tired'], mucus: '', temperature: 36.6, intercourse: '', pill: true, ovulationTest: '', pregnancyTest: '', notes: 'a, "b"' };
    data.settings.language = 'vi';
    const tables = validateTables(JSON.parse(JSON.stringify(toTables(data))));
    const back = fromTables(tables, 'America/Toronto');
    expect(back.events).toEqual(data.events);
    expect(back.periods).toEqual([{ id: 'p1', start: '2026-11-01', end: '2026-11-05', notes: undefined }]);
    expect(back.logs['2026-11-02']).toEqual(data.logs['2026-11-02']);
    expect(back.settings.language).toBe('vi');
    expect(back.clocks).toEqual(data.clocks);
  });

  it('ics output', () => {
    const data = emptyData('America/Toronto');
    data.events.push(gio);
    const ics = buildCalendarFile(data, { includeCycle: false, includeLiturgical: true, includeVnHolidays: true, from: '2026-11-01' });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261225');
    expect(ics).toContain('TRIGGER:-PT');
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
