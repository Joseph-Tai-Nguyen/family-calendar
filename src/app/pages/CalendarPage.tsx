import { useMemo, useState } from 'react';
import { dayOfWeek, diffDays, monthMatrix, parseISO, type ISODate } from '../../shared/date';
import { cycleCalendar, cycleStats, cycleStatus, pregnancyInfo, type DayCycleInfo } from '../../shared/cycle/cycle';
import { COLOR_HEX, getLiturgicalDay } from '../../shared/liturgical/liturgical';
import { isoToLunar, lunarDetails, lunarMonthLabelVi } from '../../shared/lunar/vietnamese-lunar';
import { vnHolidaysOn } from '../../shared/lunar/vietnamese-holidays';
import { eventTitle, occurrencesInRange, type EventOccurrence } from '../../shared/events/events';
import type { EventKind } from '../../shared/model';
import { label, locale, WEEKDAY_SHORT } from '../i18n';
import { useStore } from '../state/store';
import { endPeriod, periodOn, removePeriod, startPeriod } from '../state/periods';
import { DayEditor } from '../components/DayEditor';
import { EventForm, newEventDraft } from '../components/EventForm';
import type { PersonalEvent } from '../../shared/model';

export const EVENT_ICON: Record<EventKind, string> = {
  death_anniversary: '🕯️',
  birthday: '🎂',
  wedding: '💍',
  name_day: '✝️',
  memorial: '🌹',
  other: '⭐',
};

export function CalendarPage() {
  const { data, update, t, lang, today } = useStore();
  const st = data.settings;
  const [cursor, setCursor] = useState(() => today.slice(0, 7));
  const [selected, setSelected] = useState<ISODate>(today);
  const [editingDay, setEditingDay] = useState<ISODate | null>(null);
  const [editingEvent, setEditingEvent] = useState<PersonalEvent | null>(null);

  const [y, m] = cursor.split('-').map(Number);
  const weeks = useMemo(() => monthMatrix(y, m, st.weekStart), [y, m, st.weekStart]);
  const first = weeks[0][0];
  const last = weeks[5][6];

  const cycleMap = useMemo(() => {
    if (!st.showCycle) return new Map<ISODate, DayCycleInfo>();
    const map = cycleCalendar(data.periods, first, last, st.cycle, today);
    if (st.cycle.pregnancyMode) {
      // Pregnancy mode: keep logged periods, drop predictions and fertility windows.
      for (const info of map.values()) {
        info.predictedPeriod = info.fertile = info.ovulation = false;
        info.cycleDay = undefined;
      }
    }
    return map;
  }, [data.periods, first, last, st.cycle, st.showCycle, today]);
  const occurrences = useMemo(() => {
    const map = new Map<ISODate, EventOccurrence[]>();
    for (const e of data.events) {
      if (!e.enabled) continue;
      for (const o of occurrencesInRange(e, first, last)) map.set(o.date, [...(map.get(o.date) ?? []), o]);
    }
    return map;
  }, [data.events, first, last]);

  const stats = useMemo(() => cycleStats(data.periods, st.cycle), [data.periods, st.cycle]);
  const status = useMemo(() => cycleStatus(data.periods, today, st.cycle), [data.periods, today, st.cycle]);

  const move = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setCursor(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  };
  const goToday = () => {
    setCursor(today.slice(0, 7));
    setSelected(today);
  };

  const monthTitle = new Intl.DateTimeFormat(locale(lang), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, 1));
  const lunarFirst = isoToLunar(`${cursor}-15`);
  const weekdays = Array.from({ length: 7 }, (_, i) => WEEKDAY_SHORT[lang][(i + st.weekStart) % 7]);

  return (
    <div className="page calendar-page">
      <StatusBanner status={status} hasData={data.periods.length > 0} />

      <div className="month-nav">
        <button className="icon-btn" onClick={() => move(-1)} aria-label="Previous month">
          ‹
        </button>
        <div className="month-title">
          <h2>{monthTitle}</h2>
          {st.showLunar && (
            <span className="muted small">
              {lunarMonthLabelVi(lunarFirst.month, lunarFirst.leap)} · {lunarDetails(`${cursor}-15`).yearCanChi}
            </span>
          )}
        </div>
        <button className="icon-btn" onClick={() => move(1)} aria-label="Next month">
          ›
        </button>
        <button className="btn small ghost" onClick={goToday}>
          {t('common.today')}
        </button>
      </div>

      <div className="month-grid" role="grid">
        {weekdays.map((w, i) => (
          <div key={i} className={`weekday ${(i + st.weekStart) % 7 === 0 ? 'sun' : ''}`} role="columnheader">
            {w}
          </div>
        ))}
        {weeks.flat().map((d) => {
          const inMonth = d.slice(0, 7) === cursor;
          const info = cycleMap.get(d);
          const lunar = st.showLunar ? isoToLunar(d) : null;
          const lit = st.showLiturgical ? getLiturgicalDay(d, st.liturgical) : null;
          const litMark = lit && ['solemnity', 'feast', 'triduum', 'sunday'].includes(lit.principal.rank) || lit?.principal.key === 'ash_wednesday';
          const vn = st.showVnHolidays ? vnHolidaysOn(d, { catholicTet: false }) : [];
          const occ = occurrences.get(d) ?? [];
          const log = data.logs[d];
          const cls = [
            'day',
            inMonth ? '' : 'out',
            d === today ? 'today' : '',
            d === selected ? 'selected' : '',
            info?.period ? 'period' : '',
            info?.predictedPeriod ? 'predicted' : '',
            info?.fertile && st.cycle.showFertile ? 'fertile' : '',
            info?.ovulation && st.cycle.showOvulation ? 'ovulation' : '',
            dayOfWeek(d) === 0 ? 'sun' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button key={d} className={cls} onClick={() => setSelected(d)} onDoubleClick={() => setEditingDay(d)} role="gridcell" aria-selected={d === selected}>
              <span className="solar">{Number(d.slice(8))}</span>
              {lunar && <span className={`lunar ${lunar.day === 1 || lunar.day === 15 ? 'strong' : ''}`}>{lunar.day === 1 ? `${lunar.day}/${lunar.month}${lunar.leap ? 'N' : ''}` : lunar.day}</span>}
              <span className="marks">
                {litMark && <i className="lit-dot" style={{ background: COLOR_HEX[lit!.color] }} title={lit!.principal.title[lang]} />}
                {vn.length > 0 && <i className="vn-mark" title={vn.map((h) => h[lang]).join(', ')}>🏮</i>}
                {occ.slice(0, 2).map((o) => (
                  <i key={o.event.id} title={eventTitle(o)[lang]}>
                    {EVENT_ICON[o.event.kind]}
                  </i>
                ))}
                {log && (log.notes || log.symptoms.length || log.moods.length) ? <i className="log-dot" /> : null}
                {log?.intercourse && <i className="small-mark">♥</i>}
              </span>
            </button>
          );
        })}
      </div>

      <Legend />

      <DayPanel
        date={selected}
        stats={stats}
        cycleInfo={cycleMap.get(selected)}
        occurrences={occurrences.get(selected) ?? occurrencesFor(data.events, selected)}
        onLog={() => setEditingDay(selected)}
        onAddEvent={() => setEditingEvent(newEventDraft(selected))}
        onEditEvent={(e) => setEditingEvent(e)}
        onStart={() => update((d) => startPeriod(d, selected, today))}
        onEnd={() => update((d) => endPeriod(d, selected))}
        onRemove={(id) => update((d) => removePeriod(d, id))}
      />

      {editingDay && <DayEditor date={editingDay} onClose={() => setEditingDay(null)} />}
      {editingEvent && <EventForm initial={editingEvent} onClose={() => setEditingEvent(null)} />}
    </div>
  );
}

function occurrencesFor(events: PersonalEvent[], date: ISODate): EventOccurrence[] {
  return events.filter((e) => e.enabled).flatMap((e) => occurrencesInRange(e, date, date));
}

function StatusBanner({ status, hasData }: { status: ReturnType<typeof cycleStatus>; hasData: boolean }) {
  const { data, t, today } = useStore();
  const c = data.settings.cycle;
  if (!data.settings.showCycle) return null;
  if (c.pregnancyMode && c.pregnancyLmp) {
    const p = pregnancyInfo(c.pregnancyLmp, today);
    return (
      <div className="status-banner pregnancy">
        <strong>🤰 {t('cycle.pregnancy')}</strong>
        <span>{t('cal.pregnancy', { w: p.weeks, d: p.days, date: p.dueDate })}</span>
      </div>
    );
  }
  if (!hasData) return <div className="status-banner muted">{t('cal.noData')}</div>;
  let main: string;
  if (status.inPeriod) main = t('cal.inPeriod', { n: status.cycleDay ?? 1 });
  else if (status.lateByDays) main = t('cal.late', { n: status.lateByDays });
  else if (status.daysUntilNextPeriod === 0) main = t('cal.periodToday');
  else main = t('cal.periodIn', { n: status.daysUntilNextPeriod ?? '?' });
  return (
    <div className={`status-banner ${status.inPeriod ? 'in-period' : status.lateByDays ? 'late' : ''}`}>
      <div className="big">{main}</div>
      <div className="small">
        {t('cal.cycleDay')} {status.cycleDay} · {status.fertileToday ? t('cal.chanceHigh') : t('cal.chanceLow')}
        {status.nextOvulation && ` · ${t('cal.ovulation')} ${status.nextOvulation.slice(5)}`}
      </div>
    </div>
  );
}

function Legend() {
  const { t } = useStore();
  return (
    <div className="legend">
      <span>
        <i className="sw period" /> {t('cal.period')}
      </span>
      <span>
        <i className="sw predicted" /> {t('cal.predicted')}
      </span>
      <span>
        <i className="sw fertile" /> {t('cal.fertile')}
      </span>
      <span>
        <i className="sw ovulation" /> {t('cal.ovulation')}
      </span>
      <span>🏮 {t('events.lunarHolidays')}</span>
      <span>🕯️ Giỗ</span>
    </div>
  );
}

function DayPanel(props: {
  date: ISODate;
  stats: ReturnType<typeof cycleStats>;
  cycleInfo?: DayCycleInfo;
  occurrences: EventOccurrence[];
  onLog: () => void;
  onAddEvent: () => void;
  onEditEvent: (e: PersonalEvent) => void;
  onStart: () => void;
  onEnd: () => void;
  onRemove: (id: string) => void;
}) {
  const { data, t, lang, today } = useStore();
  const { date, stats, cycleInfo } = props;
  const st = data.settings;
  const ld = lunarDetails(date);
  const lit = getLiturgicalDay(date, st.liturgical);
  const vn = vnHolidaysOn(date, { catholicTet: true, monthly: true });
  const log = data.logs[date];
  const period = periodOn(data.periods, date, stats.averagePeriod);
  const [yy, mm, dd] = parseISO(date);
  const heading = new Intl.DateTimeFormat(locale(lang), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(yy, mm - 1, dd));
  const rel = diffDays(today, date);

  return (
    <section className="day-panel card">
      <header className="card-head">
        <h3>
          {heading}
          {rel !== 0 && <span className="muted small"> ({rel > 0 ? `+${rel}` : rel} {t('common.days')})</span>}
        </h3>
      </header>

      {st.showCycle && (
        <div className="actions-row">
          {!period ? (
            <button className="btn primary" onClick={props.onStart}>
              🩸 {t('cal.periodStarts')}
            </button>
          ) : (
            <>
              <button className="btn" onClick={props.onEnd}>
                {t('cal.periodEnds')}
              </button>
              <button className="btn ghost" onClick={() => props.onRemove(period.id)}>
                {t('cal.removePeriod')}
              </button>
            </>
          )}
          {!period && data.periods.some((p) => p.start <= date && diffDays(p.start, date) < 15) && (
            <button className="btn" onClick={props.onEnd}>
              {t('cal.periodEnds')}
            </button>
          )}
          <button className="btn" onClick={props.onLog}>
            📝 {t('cal.logDay')}
          </button>
          <button className="btn" onClick={props.onAddEvent}>
            ➕ {t('cal.addEvent')}
          </button>
        </div>
      )}
      {!st.showCycle && (
        <div className="actions-row">
          <button className="btn" onClick={props.onAddEvent}>
            ➕ {t('cal.addEvent')}
          </button>
        </div>
      )}

      {st.showCycle && cycleInfo && (cycleInfo.cycleDay || cycleInfo.fertile || cycleInfo.predictedPeriod) && (
        <p className="info-line">
          {cycleInfo.cycleDay && (
            <span className="pill">
              {t('cal.cycleDay')} {cycleInfo.cycleDay}
            </span>
          )}
          {cycleInfo.period && <span className="pill period">{t('cal.period')}</span>}
          {cycleInfo.predictedPeriod && <span className="pill predicted">{t('cal.predicted')}</span>}
          {cycleInfo.fertile && <span className="pill fertile">{t('cal.fertile')}</span>}
          {cycleInfo.ovulation && <span className="pill ovulation">{t('cal.ovulation')}</span>}
        </p>
      )}

      {props.occurrences.length > 0 && (
        <ul className="event-list">
          {props.occurrences.map((o) => (
            <li key={o.event.id}>
              <button className="link" onClick={() => props.onEditEvent(o.event)}>
                {EVENT_ICON[o.event.kind]} {eventTitle(o)[lang]}
              </button>
            </li>
          ))}
        </ul>
      )}

      {log && (
        <div className="log-summary">
          {log.flow && <span className="pill period">{label(lang, log.flow)}</span>}
          {[...log.symptoms, ...log.moods].map((s) => (
            <span key={s} className="pill">
              {label(lang, s)}
            </span>
          ))}
          {log.temperature !== undefined && <span className="pill">🌡 {log.temperature}°C</span>}
          {log.weight !== undefined && <span className="pill">⚖ {log.weight} kg</span>}
          {log.pill && <span className="pill">💊</span>}
          {log.intercourse && <span className="pill">♥ {label(lang, log.intercourse)}</span>}
          {log.ovulationTest && <span className="pill">OPK {label(lang, log.ovulationTest)}</span>}
          {log.pregnancyTest && <span className="pill">HCG {label(lang, log.pregnancyTest)}</span>}
          {log.notes && <p className="notes">{log.notes}</p>}
        </div>
      )}

      {st.showLiturgical && (
        <div className="lit-block" style={{ borderLeftColor: COLOR_HEX[lit.color] }}>
          <div className="lit-title">
            <i className="lit-dot big" style={{ background: COLOR_HEX[lit.color] }} /> {lit.principal.title[lang]}
          </div>
          <div className="muted small">
            {lit.seasonTitle[lang]} · {lang === 'vi' ? 'Năm' : 'Year'} {lit.sundayCycle} / {lit.weekdayCycle}
            {lit.holyDayOfObligation && dayOfWeek(date) !== 0 && <strong> · {t('cal.obligation')}</strong>}
            {lit.fasting === 'fast_and_abstinence' && <strong> · {t('cal.fast')}</strong>}
            {lit.fasting === 'abstinence' && <> · {t('cal.abstinence')}</>}
          </div>
          {lit.others.length > 0 && <div className="small">{lit.others.map((o) => o.title[lang]).join(' · ')}</div>}
        </div>
      )}

      {st.showLunar && (
        <div className="lunar-block">
          <div className="lunar-big">
            <span className="lunar-day">{ld.lunar.day}</span>
            <div>
              <div>
                {lunarMonthLabelVi(ld.lunar.month, ld.lunar.leap)} · {ld.yearCanChi} ({ld.zodiac})
              </div>
              <div className="muted small">
                Ngày {ld.dayCanChi} · Tháng {ld.monthCanChi} · {ld.monthLength === 30 ? 'Tháng đủ' : 'Tháng thiếu'}
              </div>
            </div>
          </div>
          <div className="small">
            {t('cal.solarTerm')}: {lang === 'vi' ? ld.solarTerm.vi : `${ld.solarTerm.en} (${ld.solarTerm.vi})`}
            {ld.solarTerm.startsToday && ' ★'}
          </div>
          <div className="small muted">
            {t('cal.auspicious')}: {ld.auspiciousHours.map((h) => `${h.chi} (${h.range})`).join(', ')}
          </div>
          {vn.length > 0 && (
            <ul className="vn-list">
              {vn.map((h) => (
                <li key={h.key}>
                  {h.category === 'catholic_tet' ? '✝️' : '🏮'} {lang === 'vi' ? h.vi : `${h.en} — ${h.vi}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
