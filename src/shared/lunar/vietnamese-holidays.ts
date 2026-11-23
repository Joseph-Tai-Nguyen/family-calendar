/**
 * Traditional Vietnamese observances on the lunar calendar, plus the
 * Tết Masses customary in the Catholic Church in Vietnam.
 */
import type { ISODate } from '../date';
import { isoToLunar, lunarMonthLength, lunarToSolar } from './vietnamese-lunar';

export type VnHolidayCategory = 'traditional' | 'catholic_tet' | 'monthly';

export interface VnHolidayDef {
  key: string;
  month: number;
  /** day of the lunar month, or 'last' for the last day of the month (29 or 30) */
  day: number | 'last';
  vi: string;
  en: string;
  category: VnHolidayCategory;
}

export const VN_LUNAR_HOLIDAYS: VnHolidayDef[] = [
  { key: 'tet_1', month: 1, day: 1, vi: 'Tết Nguyên Đán (Mùng 1 Tết)', en: 'Lunar New Year (Tết), day 1', category: 'traditional' },
  { key: 'tet_2', month: 1, day: 2, vi: 'Mùng 2 Tết', en: 'Tết, day 2', category: 'traditional' },
  { key: 'tet_3', month: 1, day: 3, vi: 'Mùng 3 Tết', en: 'Tết, day 3', category: 'traditional' },
  { key: 'tet_mass_1', month: 1, day: 1, vi: 'Thánh lễ cầu bình an năm mới', en: 'Mass for peace in the New Year', category: 'catholic_tet' },
  { key: 'tet_mass_2', month: 1, day: 2, vi: 'Thánh lễ kính nhớ ông bà tổ tiên', en: 'Mass in memory of ancestors and parents', category: 'catholic_tet' },
  { key: 'tet_mass_3', month: 1, day: 3, vi: 'Thánh lễ thánh hóa công ăn việc làm', en: 'Mass for the sanctification of work', category: 'catholic_tet' },
  { key: 'nguyen_tieu', month: 1, day: 15, vi: 'Tết Nguyên Tiêu (Rằm tháng Giêng)', en: 'Lantern Festival (first full moon)', category: 'traditional' },
  { key: 'han_thuc', month: 3, day: 3, vi: 'Tết Hàn Thực', en: 'Cold Food Festival', category: 'traditional' },
  { key: 'hung_vuong', month: 3, day: 10, vi: 'Giỗ Tổ Hùng Vương', en: 'Hùng Kings Commemoration', category: 'traditional' },
  { key: 'phat_dan', month: 4, day: 15, vi: 'Lễ Phật Đản', en: "Buddha's Birthday", category: 'traditional' },
  { key: 'doan_ngo', month: 5, day: 5, vi: 'Tết Đoan Ngọ', en: 'Mid-year Festival (Đoan Ngọ)', category: 'traditional' },
  { key: 'vu_lan', month: 7, day: 15, vi: 'Lễ Vu Lan (Rằm tháng Bảy)', en: 'Vu Lan / Ghost Festival', category: 'traditional' },
  { key: 'trung_thu', month: 8, day: 15, vi: 'Tết Trung Thu', en: 'Mid-Autumn Festival', category: 'traditional' },
  { key: 'trung_cuu', month: 9, day: 9, vi: 'Tết Trùng Cửu', en: 'Double Ninth Festival', category: 'traditional' },
  { key: 'thuong_tan', month: 10, day: 10, vi: 'Tết Thường Tân (Song Thập)', en: 'New Rice Festival', category: 'traditional' },
  { key: 'ong_tao', month: 12, day: 23, vi: 'Ông Công Ông Táo', en: 'Kitchen Gods Day', category: 'traditional' },
  { key: 'giao_thua', month: 12, day: 'last', vi: 'Giao Thừa (Tất Niên)', en: "Lunar New Year's Eve", category: 'traditional' },
];

export interface VnHolidayOccurrence {
  date: ISODate;
  key: string;
  vi: string;
  en: string;
  category: VnHolidayCategory;
}

/** Observances (incl. optional mùng 1 / rằm markers) that fall on a solar date. */
export function vnHolidaysOn(iso: ISODate, opts: { monthly?: boolean; catholicTet?: boolean } = {}): VnHolidayOccurrence[] {
  const l = isoToLunar(iso);
  const out: VnHolidayOccurrence[] = [];
  if (!l.leap) {
    for (const h of VN_LUNAR_HOLIDAYS) {
      if (h.category === 'catholic_tet' && opts.catholicTet === false) continue;
      if (h.month !== l.month) continue;
      const day = h.day === 'last' ? lunarMonthLength(l.month, l.year) : h.day;
      if (day === l.day) out.push({ date: iso, key: h.key, vi: h.vi, en: h.en, category: h.category });
    }
  }
  if (opts.monthly) {
    if (l.day === 1 && !(l.month === 1 && !l.leap)) {
      out.push({ date: iso, key: 'mung_1', vi: 'Mùng Một (đầu tháng âm lịch)', en: 'First day of lunar month', category: 'monthly' });
    }
    if (l.day === 15 && !out.some((o) => o.category === 'traditional')) {
      out.push({ date: iso, key: 'ram', vi: 'Ngày Rằm', en: 'Full moon (15th)', category: 'monthly' });
    }
  }
  return out;
}

/** All observances for a lunar year expressed as solar dates. */
export function vnHolidaysForLunarYear(lunarYear: number): VnHolidayOccurrence[] {
  const out: VnHolidayOccurrence[] = [];
  for (const h of VN_LUNAR_HOLIDAYS) {
    const day = h.day === 'last' ? lunarMonthLength(h.month, lunarYear) : h.day;
    const date = lunarToSolar(day, h.month, lunarYear, false);
    if (date) out.push({ date, key: h.key, vi: h.vi, en: h.en, category: h.category });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
