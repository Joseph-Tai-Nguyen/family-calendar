import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LITURGICAL_OPTIONS,
  baptismOfTheLord,
  easterSunday,
  epiphanyDate,
  firstSundayOfAdvent,
  getLiturgicalDay,
  holyFamily,
  importantLiturgicalDays,
  type LiturgicalOptions,
} from '../src/shared/liturgical/liturgical';

const CA = DEFAULT_LITURGICAL_OPTIONS;
const VN: LiturgicalOptions = { ...CA, region: 'VN' };
const GEN_THURSDAY: LiturgicalOptions = { region: 'GENERAL', epiphanySunday: false, ascensionSunday: false, corpusChristiSunday: false };

describe('liturgical calendar', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2038, '2038-04-25'],
  ])('Easter %i', (y, iso) => expect(easterSunday(y)).toBe(iso));

  it('Advent, Epiphany, Baptism, Holy Family', () => {
    expect(firstSundayOfAdvent(2025)).toBe('2025-11-30');
    expect(firstSundayOfAdvent(2026)).toBe('2026-11-29');
    expect(epiphanyDate(2026, CA)).toBe('2026-01-04');
    expect(baptismOfTheLord(2026, CA)).toBe('2026-01-11');
    expect(baptismOfTheLord(2024, CA)).toBe('2024-01-08'); // Epiphany Jan 7 -> Monday
    expect(epiphanyDate(2026, GEN_THURSDAY)).toBe('2026-01-06');
    expect(holyFamily(2022)).toBe('2022-12-30');
    expect(holyFamily(2026)).toBe('2026-12-27');
  });

  it('key days of 2026', () => {
    expect(getLiturgicalDay('2026-02-18', CA).principal.key).toBe('ash_wednesday');
    expect(getLiturgicalDay('2026-02-18', CA).fasting).toBe('fast_and_abstinence');
    expect(getLiturgicalDay('2026-03-29', CA).principal.key).toBe('palm_sunday');
    expect(getLiturgicalDay('2026-04-03', CA).principal.key).toBe('good_friday');
    expect(getLiturgicalDay('2026-04-05', CA).principal.key).toBe('easter');
    expect(getLiturgicalDay('2026-05-17', CA).principal.key).toBe('ascension');
    expect(getLiturgicalDay('2026-05-14', GEN_THURSDAY).principal.key).toBe('ascension');
    expect(getLiturgicalDay('2026-05-24', CA).principal.key).toBe('pentecost');
    expect(getLiturgicalDay('2026-11-22', CA).principal.key).toBe('christ_the_king');
    expect(getLiturgicalDay('2026-12-08', CA).principal.key).toBe('immaculate_conception');
    expect(getLiturgicalDay('2026-12-25', CA).principal.key).toBe('christmas');
  });

  it('seasons, colours, weeks and cycles', () => {
    const d = getLiturgicalDay('2026-11-15', CA);
    expect(d.season).toBe('ordinary');
    expect(d.week).toBe(33);
    expect(d.color).toBe('green');
    expect(d.sundayCycle).toBe('A');
    expect(d.weekdayCycle).toBe('II');
    expect(getLiturgicalDay('2026-01-18', CA).principal.title.en).toBe('2nd Sunday of Ordinary Time');
    const adv = getLiturgicalDay('2026-11-29', CA);
    expect(adv.season).toBe('advent');
    expect(adv.sundayCycle).toBe('B');
    expect(adv.weekdayCycle).toBe('I');
    expect(getLiturgicalDay('2026-12-13', CA).color).toBe('rose'); // Gaudete
    expect(getLiturgicalDay('2026-03-15', CA).color).toBe('rose'); // Laetare
  });

  it('transfers', () => {
    // Immaculate Conception on the 2nd Sunday of Advent 2024 -> Monday
    expect(getLiturgicalDay('2024-12-08', CA).principal.rank).toBe('sunday');
    expect(getLiturgicalDay('2024-12-09', CA).principal.key).toBe('immaculate_conception');
    // Annunciation 2024 in Holy Week -> Monday after Divine Mercy Sunday
    expect(getLiturgicalDay('2024-04-08', CA).principal.key).toBe('annunciation');
    // St Joseph 2035 (Mar 19 is Monday of Holy Week) -> Saturday before Palm Sunday
    expect(getLiturgicalDay('2035-03-17', CA).principal.key).toBe('joseph');
  });

  it('regional proper: Vietnamese Martyrs', () => {
    expect(getLiturgicalDay('2026-11-24', CA).principal).toMatchObject({ key: 'vietnamese_martyrs', rank: 'memorial' });
    expect(getLiturgicalDay('2026-11-24', VN).principal).toMatchObject({ key: 'vietnamese_martyrs', rank: 'solemnity' });
    // 2024-11-24 is Christ the King; in VN the solemnity moves to Monday
    expect(getLiturgicalDay('2024-11-24', VN).principal.key).toBe('christ_the_king');
    expect(getLiturgicalDay('2024-11-25', VN).principal.key).toBe('vietnamese_martyrs');
  });

  it('holy days of obligation by region', () => {
    expect(getLiturgicalDay('2026-08-15', CA).holyDayOfObligation).toBe(false);
    expect(getLiturgicalDay('2026-08-15', VN).holyDayOfObligation).toBe(true);
    expect(getLiturgicalDay('2026-01-01', CA).holyDayOfObligation).toBe(true);
  });

  it('important-day filter', () => {
    const days = importantLiturgicalDays('2026-01-01', '2026-12-31', {
      solemnities: true, feasts: false, memorials: false, sundays: false, obligations: false, fastDays: false,
    }, CA);
    const keys = days.map((d) => d.principal.key);
    expect(keys).toEqual(expect.arrayContaining(['mary_mother_of_god', 'epiphany', 'joseph', 'easter', 'pentecost', 'assumption', 'all_saints', 'christmas']));
    expect(keys).not.toContain('stephen');
  });
});
