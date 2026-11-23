/**
 * Recurring personal events (death anniversaries / giỗ, birthdays, …) on the
 * solar or Vietnamese lunar calendar, and the unified reminder list.
 *
 * Lunar-event rules (common Vietnamese practice):
 *  - An anniversary is observed every lunar year on the same day of the same
 *    (regular, non-leap) month — also when the person died in a leap month.
 *  - If the day is 30 and that month only has 29 days this year, it is
 *    observed on the 29th (the last day of the month).
 *  - "Giỗ đầu" (first anniversary) is 1 lunar year after death; the count is
 *    lunar year − death lunar year.
 */
import { addDays, dayOfWeek, daysInMonth, formatISO, parseISO, type ISODate } from '../date';
import { getLeapMonth, isoToLunar, lunarMonthLength, lunarToSolar } from '../lunar/vietnamese-lunar';
import { vnHolidaysForLunarYear } from '../lunar/vietnamese-holidays';
import { importantLiturgicalDays, type LiturgicalDay } from '../liturgical/liturgical';
import { predictCycles } from '../cycle/cycle';
import type { AppData, PersonalEvent } from '../model';

export interface EventOccurrence {
  event: PersonalEvent;
  date: ISODate;
  /** 1 = first anniversary / 1st birthday, etc. undefined if the origin year is unknown */
  count?: number;
}

export function occurrencesInRange(event: PersonalEvent, from: ISODate, to: ISODate): EventOccurrence[] {
  const out: EventOccurrence[] = [];
  const [fy] = parseISO(from);
  const [ty] = parseISO(to);
  if (event.calendar === 'solar') {
    for (let y = fy; y <= ty; y++) {
      const d = Math.min(event.day, daysInMonth(y, event.month));
      const date = formatISO(y, event.month, d);
      if (date < from || date > to) continue;
      if (event.year && y <= event.year) continue; // the original date itself is not an anniversary
      out.push({ event, date, count: event.year ? y - event.year : undefined });
    }
  } else {
    for (let ly = fy - 1; ly <= ty + 1; ly++) {
      const len = lunarMonthLength(event.month, ly, false);
      const day = Math.min(event.day, len || 29);
      const date = lunarToSolar(day, event.month, ly, false);
      if (!date || date < from || date > to) continue;
      if (event.year && ly <= event.year) continue;
      out.push({ event, date, count: event.year ? ly - event.year : undefined });
    }
  }
  return out;
}

/** Lunar date (day, month, lunar year, leap) of a solar date — used when the user enters a solar date of death. */
export function lunarFieldsFromSolar(iso: ISODate): { day: number; month: number; year: number; leapMonth: boolean } {
  const l = isoToLunar(iso);
  return { day: l.day, month: l.month, year: l.year, leapMonth: l.leap };
}

// ---------------------------------------------------------------------------
// Unified reminders
// ---------------------------------------------------------------------------

export type ReminderSource = 'event' | 'liturgical' | 'lunar' | 'period' | 'fertile' | 'ovulation' | 'pill' | 'bbt';

export interface Reminder {
  id: string;
  source: ReminderSource;
  /** date of the thing being reminded about */
  date: ISODate;
  /** when to notify (date + HH:MM local) */
  remindOn: ISODate;
  remindTime: string;
  daysBefore: number;
  title: { en: string; vi: string };
  detail?: { en: string; vi: string };
  /** optional extra data for UI (colour, etc.) */
  color?: string;
  liturgical?: LiturgicalDay;
}

const L = (en: string, vi: string) => ({ en, vi });

export function eventTitle(o: EventOccurrence): { en: string; vi: string } {
  const e = o.event;
  const who = e.personName ? ` — ${e.personName}` : '';
  switch (e.kind) {
    case 'death_anniversary':
      return L(
        `Death anniversary${o.count ? ` (${ordinal(o.count)})` : ''}: ${e.title}${who}`,
        `${o.count === 1 ? 'Giỗ đầu' : o.count === 2 ? 'Giỗ hết (giỗ thứ 2)' : `Giỗ${o.count ? ` lần ${o.count}` : ''}`}: ${e.title}${who}`,
      );
    case 'birthday':
      return L(`Birthday${o.count ? ` (${o.count})` : ''}: ${e.title}`, `Sinh nhật${o.count ? ` (${o.count} tuổi)` : ''}: ${e.title}`);
    case 'wedding':
      return L(`Wedding anniversary${o.count ? ` (${o.count} yrs)` : ''}: ${e.title}`, `Kỷ niệm ngày cưới${o.count ? ` (${o.count} năm)` : ''}: ${e.title}`);
    case 'name_day':
      return L(`Name day (patron saint): ${e.title}${who}`, `Lễ bổn mạng: ${e.title}${who}`);
    case 'memorial':
      return L(`Memorial: ${e.title}${who}`, `Tưởng niệm: ${e.title}${who}`);
    default:
      return L(e.title, e.title);
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * All reminders whose notify date falls in [from, to]. Looks ahead far enough
 * to include events up to `maxLead` days after `to`.
 */
export function buildReminders(data: AppData, from: ISODate, to: ISODate, opts: { includeCycle?: boolean } = {}): Reminder[] {
  const st = data.settings;
  const r = st.reminders;
  const maxLead = 31;
  const horizon = addDays(to, maxLead);
  const out: Reminder[] = [];
  const push = (rem: Omit<Reminder, 'remindOn'>) => {
    const remindOn = addDays(rem.date, -rem.daysBefore);
    if (remindOn >= from && remindOn <= to) out.push({ ...rem, remindOn });
  };

  for (const ev of data.events) {
    if (!ev.enabled) continue;
    for (const o of occurrencesInRange(ev, from, horizon)) {
      const days = ev.remindDays.length ? ev.remindDays : [0];
      for (const d of days) {
        push({
          id: `ev:${ev.id}:${o.date}:${d}`,
          source: 'event',
          date: o.date,
          remindTime: ev.remindTime || r.time,
          daysBefore: d,
          title: eventTitle(o),
          detail: ev.calendar === 'lunar' ? L(`Lunar ${ev.day}/${ev.month}`, `Âm lịch ${ev.day}/${ev.month}`) : undefined,
        });
      }
    }
  }

  if (r.liturgical.enabled) {
    for (const day of importantLiturgicalDays(from, addDays(to, r.liturgical.daysBefore), r.liturgical, st.liturgical)) {
      // Every Sunday is a day of obligation; only call it out for weekday holy days.
      const obligation = day.holyDayOfObligation && dayOfWeek(day.date) !== 0;
      push({
        id: `lit:${day.date}`,
        source: 'liturgical',
        date: day.date,
        remindTime: r.time,
        daysBefore: r.liturgical.daysBefore,
        title: day.principal.title,
        detail: L(
          [obligation && 'Holy day of obligation', day.fasting === 'fast_and_abstinence' && 'Fast and abstinence'].filter(Boolean).join(' · '),
          [obligation && 'Lễ buộc',day.fasting === 'fast_and_abstinence' && 'Ăn chay và kiêng thịt'].filter(Boolean).join(' · '),
        ),
        color: day.color,
        liturgical: day,
      });
    }
  }

  if (r.lunar.enabled) {
    // Iterate lunar years (cheap: a few conversions per year) instead of every solar day.
    const [fy] = parseISO(from);
    const [ty] = parseISO(to);
    for (let ly = fy - 1; ly <= ty + 1; ly++) {
      const items: { key: string; date: ISODate; en: string; vi: string }[] = [];
      for (const h of vnHolidaysForLunarYear(ly)) {
        if (h.category === 'traditional' && !r.lunar.holidays) continue;
        if (h.category === 'catholic_tet' && !r.lunar.catholicTet) continue;
        items.push(h);
      }
      const leap = r.lunar.mung1 || r.lunar.ram ? getLeapMonth(ly) : 0;
      for (let m = 1; m <= 12; m++) {
        for (const isLeap of leap === m ? [false, true] : [false]) {
          const suffix = isLeap ? ' (nhuận)' : '';
          if (r.lunar.mung1 && !(m === 1 && !isLeap)) {
            const date = lunarToSolar(1, m, ly, isLeap);
            if (date) items.push({ key: `mung1_${m}${isLeap ? 'L' : ''}`, date, en: `First day of lunar month ${m}${suffix}`, vi: `Mùng Một tháng ${m}${suffix}` });
          }
          if (r.lunar.ram && !(!isLeap && [1, 7, 8].includes(m))) {
            const date = lunarToSolar(15, m, ly, isLeap);
            if (date) items.push({ key: `ram_${m}${isLeap ? 'L' : ''}`, date, en: `Full moon of lunar month ${m}${suffix}`, vi: `Rằm tháng ${m}${suffix}` });
          }
        }
      }
      for (const h of items) {
        push({
          id: `lunar:${h.key}:${h.date}`,
          source: 'lunar',
          date: h.date,
          remindTime: r.time,
          daysBefore: r.lunar.daysBefore,
          title: L(h.en, h.vi),
        });
      }
    }
  }

  if (opts.includeCycle !== false && data.periods.length && !st.cycle.pregnancyMode) {
    const cycles = predictCycles(data.periods, horizon, st.cycle).filter((c) => c.predicted);
    for (const c of cycles) {
      if (r.period.enabled) push({ id: `period:${c.start}`, source: 'period', date: c.start, remindTime: r.time, daysBefore: r.period.daysBefore, title: L('Period expected', 'Dự kiến có kinh') });
      if (r.fertile.enabled) push({ id: `fertile:${c.fertileStart}`, source: 'fertile', date: c.fertileStart, remindTime: r.time, daysBefore: r.fertile.daysBefore, title: L('Fertile window begins', 'Bắt đầu thời kỳ dễ thụ thai') });
      if (r.ovulation.enabled) push({ id: `ovulation:${c.ovulation}`, source: 'ovulation', date: c.ovulation, remindTime: r.time, daysBefore: r.ovulation.daysBefore, title: L('Ovulation day (estimated)', 'Ngày rụng trứng (ước tính)') });
    }
  }

  if (opts.includeCycle !== false) {
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (r.pill.enabled) push({ id: `pill:${d}`, source: 'pill', date: d, remindTime: r.pill.time, daysBefore: 0, title: L('Take your pill', 'Uống thuốc') });
      if (r.bbt.enabled) push({ id: `bbt:${d}`, source: 'bbt', date: d, remindTime: r.bbt.time, daysBefore: 0, title: L('Record basal body temperature', 'Ghi nhiệt độ cơ thể') });
    }
  }

  return out.sort((a, b) => (a.remindOn + a.remindTime).localeCompare(b.remindOn + b.remindTime) || a.date.localeCompare(b.date));
}

/** Upcoming dated items (not notify dates) for the "Upcoming" list. */
export function upcomingEvents(data: AppData, from: ISODate, days: number): EventOccurrence[] {
  const to = addDays(from, days);
  return data.events
    .filter((e) => e.enabled)
    .flatMap((e) => occurrencesInRange(e, from, to))
    .sort((a, b) => a.date.localeCompare(b.date));
}
