/**
 * Vietnamese lunisolar calendar (Âm lịch).
 *
 * Astronomical algorithm by Hồ Ngọc Đức (based on Jean Meeus, "Astronomical
 * Algorithms"), computed for the Vietnamese time zone UTC+7. Vietnamese and
 * Chinese calendars occasionally differ (e.g. Tết 1985, 2007) because China
 * uses UTC+8 — always use tz = 7 for Vietnamese dates.
 */
import { formatISO, parseISO, type ISODate } from '../date';

export const VN_TIMEZONE = 7;
const PI = Math.PI;

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  /** true if this is the leap (nhuận) month */
  leap: boolean;
  /** Julian day number of the solar date */
  jd: number;
}

export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  if (jd < 2299161) jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  return jd;
}

export function jdToDate(jd: number): [number, number, number] {
  let b: number;
  let c: number;
  if (jd > 2299160) {
    const a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = b * 100 + d - 4800 + Math.floor(m / 10);
  return [day, month, year];
}

export function jdFromISO(iso: ISODate): number {
  const [y, m, d] = parseISO(iso);
  return jdFromDate(d, m, y);
}

export function jdToISO(jd: number): ISODate {
  const [d, m, y] = jdToDate(jd);
  return formatISO(y, m, d);
}

/** Julian date (fractional) of the k-th new moon after 1900-01-01. */
function newMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltaT =
    T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + C1 - deltaT;
}

/** Sun's ecliptic longitude in radians, normalized to [0, 2π). */
export function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr;
  L -= PI * 2 * Math.floor(L / (PI * 2));
  return L;
}

function getNewMoonDay(k: number, tz: number): number {
  return Math.floor(newMoon(k) + 0.5 + tz / 24);
}

/** Sector 0..11 of the sun longitude at local midnight starting the day. */
function getSunLongitudeSector(dayNumber: number, tz: number): number {
  return Math.floor((sunLongitude(dayNumber - 0.5 - tz / 24) / PI) * 6);
}

/** Day number of the first day of lunar month 11 (the month containing the winter solstice). */
function getLunarMonth11(yy: number, tz: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, tz);
  if (getSunLongitudeSector(nm, tz) >= 9) nm = getNewMoonDay(k - 1, tz);
  return nm;
}

/** Offset (in months after month 11) of the leap month in the year starting at a11. */
function getLeapMonthOffset(a11: number, tz: number): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last: number;
  let i = 1;
  let arc = getSunLongitudeSector(getNewMoonDay(k + i, tz), tz);
  do {
    last = arc;
    i++;
    arc = getSunLongitudeSector(getNewMoonDay(k + i, tz), tz);
  } while (arc !== last && i < 14);
  return i - 1;
}

export function solarToLunar(dd: number, mm: number, yy: number, tz = VN_TIMEZONE): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, tz);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k, tz);
  let a11 = getLunarMonth11(yy, tz);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, tz);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, tz);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let leap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, tz);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) leap = true;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap, jd: dayNumber };
}

export function isoToLunar(iso: ISODate, tz = VN_TIMEZONE): LunarDate {
  const [y, m, d] = parseISO(iso);
  return solarToLunar(d, m, y, tz);
}

/**
 * Convert a lunar date to a solar ISO date. Returns null when the requested
 * leap month does not exist in that lunar year.
 */
export function lunarToSolar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  leap = false,
  tz = VN_TIMEZONE,
): ISODate | null {
  let a11: number;
  let b11: number;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, tz);
    b11 = getLunarMonth11(lunarYear, tz);
  } else {
    a11 = getLunarMonth11(lunarYear, tz);
    b11 = getLunarMonth11(lunarYear + 1, tz);
  }
  const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunarMonth - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, tz);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (leap && lunarMonth !== leapMonth) return null;
    if (leap || off >= leapOff) off += 1;
  } else if (leap) {
    return null;
  }
  const monthStart = getNewMoonDay(k + off, tz);
  return jdToISO(monthStart + lunarDay - 1);
}

/** Leap month number (1..12) of the given lunar year, or 0 if none. */
export function getLeapMonth(lunarYear: number, tz = VN_TIMEZONE): number {
  for (let m = 1; m <= 12; m++) {
    if (lunarToSolar(1, m, lunarYear, true, tz)) return m;
  }
  return 0;
}

/** 29 or 30. */
export function lunarMonthLength(lunarMonth: number, lunarYear: number, leap = false, tz = VN_TIMEZONE): number {
  const first = lunarToSolar(1, lunarMonth, lunarYear, leap, tz);
  if (!first) return 0;
  const day30 = solarFromJd(jdFromISO(first) + 29, tz);
  return day30.day === 30 ? 30 : 29;
}

function solarFromJd(jd: number, tz: number): LunarDate {
  const [d, m, y] = jdToDate(jd);
  return solarToLunar(d, m, y, tz);
}

// ---------------------------------------------------------------------------
// Can Chi (Heavenly stems / Earthly branches), solar terms, auspicious hours
// ---------------------------------------------------------------------------

export const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
export const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
export const ZODIAC_EN = ['Rat', 'Buffalo', 'Tiger', 'Cat', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];

export const SOLAR_TERMS_VI = [
  'Xuân phân', 'Thanh minh', 'Cốc vũ', 'Lập hạ', 'Tiểu mãn', 'Mang chủng',
  'Hạ chí', 'Tiểu thử', 'Đại thử', 'Lập thu', 'Xử thử', 'Bạch lộ',
  'Thu phân', 'Hàn lộ', 'Sương giáng', 'Lập đông', 'Tiểu tuyết', 'Đại tuyết',
  'Đông chí', 'Tiểu hàn', 'Đại hàn', 'Lập xuân', 'Vũ thủy', 'Kinh trập',
];
export const SOLAR_TERMS_EN = [
  'Spring Equinox', 'Clear and Bright', 'Grain Rain', 'Start of Summer', 'Grain Full', 'Grain in Ear',
  'Summer Solstice', 'Minor Heat', 'Major Heat', 'Start of Autumn', 'End of Heat', 'White Dew',
  'Autumn Equinox', 'Cold Dew', 'Frost Descent', 'Start of Winter', 'Minor Snow', 'Major Snow',
  'Winter Solstice', 'Minor Cold', 'Major Cold', 'Start of Spring', 'Rain Water', 'Awakening of Insects',
];

const GIO_HOANG_DAO = ['110100101100', '001101001011', '110011010010', '101100110100', '001011001101', '010010110011'];

export const LUNAR_MONTH_NAMES_VI = [
  'Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười Một', 'Chạp',
];

export function yearCanChi(lunarYear: number): string {
  return `${CAN[(lunarYear + 6) % 10]} ${CHI[(lunarYear + 8) % 12]}`;
}

export function yearZodiac(lunarYear: number): string {
  return ZODIAC_EN[(lunarYear + 8) % 12];
}

export function monthCanChi(lunarMonth: number, lunarYear: number): string {
  return `${CAN[(lunarYear * 12 + lunarMonth + 3) % 10]} ${CHI[(lunarMonth + 1) % 12]}`;
}

export function dayCanChi(jd: number): string {
  return `${CAN[(jd + 9) % 10]} ${CHI[(jd + 1) % 12]}`;
}

/** Index 0..23 into SOLAR_TERMS_* for the given day. */
export function solarTermIndex(jd: number, tz = VN_TIMEZONE): number {
  return Math.floor((sunLongitude(jd - 0.5 - tz / 24) / PI) * 12);
}

/** True if a new solar term starts on this day. */
export function isSolarTermStart(jd: number, tz = VN_TIMEZONE): boolean {
  return solarTermIndex(jd, tz) !== solarTermIndex(jd - 1, tz);
}

export interface HourInfo {
  chi: string;
  /** e.g. "23-1" */
  range: string;
}

/** Auspicious hours (giờ hoàng đạo) for a day. */
export function auspiciousHours(jd: number): HourInfo[] {
  const pattern = GIO_HOANG_DAO[((jd + 1) % 12) % 6];
  const out: HourInfo[] = [];
  for (let i = 0; i < 12; i++) {
    if (pattern[i] === '1') {
      out.push({ chi: CHI[i], range: `${(i * 2 + 23) % 24}-${(i * 2 + 1) % 24}` });
    }
  }
  return out;
}

export function lunarDayLabel(day: number): string {
  return day <= 10 ? `Mùng ${day}` : String(day);
}

export function lunarMonthLabelVi(month: number, leap: boolean): string {
  return `Tháng ${LUNAR_MONTH_NAMES_VI[month - 1]}${leap ? ' (nhuận)' : ''}`;
}

export interface LunarDayDetails {
  lunar: LunarDate;
  dayCanChi: string;
  monthCanChi: string;
  yearCanChi: string;
  zodiac: string;
  solarTerm: { vi: string; en: string; startsToday: boolean };
  auspiciousHours: HourInfo[];
  monthLength: number;
}

export function lunarDetails(iso: ISODate): LunarDayDetails {
  const lunar = isoToLunar(iso);
  const term = solarTermIndex(lunar.jd);
  return {
    lunar,
    dayCanChi: dayCanChi(lunar.jd),
    monthCanChi: monthCanChi(lunar.month, lunar.year) + (lunar.leap ? ' (nhuận)' : ''),
    yearCanChi: yearCanChi(lunar.year),
    zodiac: yearZodiac(lunar.year),
    solarTerm: { vi: SOLAR_TERMS_VI[term], en: SOLAR_TERMS_EN[term], startsToday: isSolarTermStart(lunar.jd) },
    auspiciousHours: auspiciousHours(lunar.jd),
    monthLength: lunarMonthLength(lunar.month, lunar.year, lunar.leap),
  };
}
