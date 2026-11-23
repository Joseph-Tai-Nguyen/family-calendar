import { useMemo, useState } from 'react';
import { addDays, diffDays, formatISO, isISODate, parseISO, type ISODate } from '../../shared/date';
import { buildReminders, eventTitle, occurrencesInRange } from '../../shared/events/events';
import { COLOR_HEX, importantLiturgicalDays, SEASON_TITLES, type LiturgicalDay } from '../../shared/liturgical/liturgical';
import { getLeapMonth, isoToLunar, lunarDetails, lunarMonthLabelVi, lunarMonthLength, lunarToSolar, yearCanChi } from '../../shared/lunar/vietnamese-lunar';
import { vnHolidaysForLunarYear } from '../../shared/lunar/vietnamese-holidays';
import type { PersonalEvent } from '../../shared/model';
import { useStore } from '../state/store';
import { Card, Field, Tabs, Toggle } from '../components/ui';
import { EventForm, newEventDraft } from '../components/EventForm';
import { EVENT_ICON } from './CalendarPage';

type Tab = 'upcoming' | 'mine' | 'liturgical' | 'lunar' | 'convert';

export function EventsPage() {
  const { t } = useStore();
  const [tab, setTab] = useState<Tab>('upcoming');
  return (
    <div className="page">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'upcoming', label: t('events.upcoming') },
          { id: 'mine', label: t('events.mine') },
          { id: 'liturgical', label: t('events.liturgical') },
          { id: 'lunar', label: t('events.lunarHolidays') },
          { id: 'convert', label: t('events.converter') },
        ]}
      />
      {tab === 'upcoming' && <Upcoming />}
      {tab === 'mine' && <MyEvents />}
      {tab === 'liturgical' && <LiturgicalYear />}
      {tab === 'lunar' && <LunarHolidays />}
      {tab === 'convert' && <Converter />}
    </div>
  );
}

const SOURCE_ICON: Record<string, string> = {
  event: '📌',
  liturgical: '✝️',
  lunar: '🏮',
  period: '🩸',
  fertile: '🌱',
  ovulation: '🌸',
  pill: '💊',
  bbt: '🌡',
};

function Upcoming() {
  const { data, lang, today, t } = useStore();
  const [days, setDays] = useState(60);
  // Group by the date of the item itself (not the notify date); dedupe multiple lead times.
  const items = useMemo(() => {
    const seen = new Set<string>();
    return buildReminders(data, today, addDays(today, days))
      .filter((r) => r.source !== 'pill' && r.source !== 'bbt')
      .filter((r) => r.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((r) => {
        const k = `${r.source}|${r.date}|${r.title.en}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  }, [data, today, days]);

  return (
    <Card
      title={t('events.upcoming')}
      actions={
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Range">
          {[30, 60, 90, 180, 365].map((n) => (
            <option key={n} value={n}>
              {n} {t('common.days')}
            </option>
          ))}
        </select>
      }
    >
      <ul className="agenda">
        {items.map((r) => {
          const inDays = diffDays(today, r.date);
          return (
            <li key={r.id} style={r.color ? { borderLeftColor: COLOR_HEX[r.color as keyof typeof COLOR_HEX] } : undefined}>
              <div className="agenda-date">
                <strong>{r.date.slice(5)}</strong>
                <span className="muted small">{inDays === 0 ? t('common.today') : `+${inDays}`}</span>
              </div>
              <div>
                <div>
                  {SOURCE_ICON[r.source]} {r.title[lang]}
                </div>
                {r.detail?.[lang] && <div className="muted small">{r.detail[lang]}</div>}
              </div>
            </li>
          );
        })}
        {!items.length && <li className="muted">—</li>}
      </ul>
    </Card>
  );
}

function MyEvents() {
  const { data, t, lang, today } = useStore();
  const [editing, setEditing] = useState<PersonalEvent | null>(null);
  const [y] = parseISO(today);
  const rows = data.events
    .map((e) => ({ e, next: occurrencesInRange({ ...e, enabled: true }, today, formatISO(y + 2, 12, 31))[0] }))
    .sort((a, b) => (a.next?.date ?? '9999').localeCompare(b.next?.date ?? '9999'));
  return (
    <Card
      title={t('events.mine')}
      actions={
        <>
          <button className="btn small" onClick={() => setEditing(newEventDraft(undefined, 'birthday'))}>
            🎂 +
          </button>
          <button className="btn small primary" onClick={() => setEditing(newEventDraft(undefined, 'death_anniversary'))}>
            🕯️ {lang === 'vi' ? 'Thêm ngày giỗ' : 'Add giỗ'}
          </button>
        </>
      }
    >
      {!rows.length && <p className="muted">{t('events.empty')}</p>}
      <ul className="event-cards">
        {rows.map(({ e, next }) => (
          <li key={e.id} className={e.enabled ? '' : 'disabled'}>
            <button className="event-card" onClick={() => setEditing(e)}>
              <span className="event-icon">{EVENT_ICON[e.kind]}</span>
              <span className="event-main">
                <strong>{next ? eventTitle(next)[lang] : e.title}</strong>
                <span className="muted small">
                  {e.calendar === 'lunar'
                    ? `${lang === 'vi' ? 'Âm lịch' : 'Lunar'} ${e.day}/${e.month}${e.leapMonth ? ' (nhuận)' : ''}${e.year ? ` · ${e.year} ${yearCanChi(e.year)}` : ''}`
                    : `${e.day}/${e.month}${e.year ? `/${e.year}` : ''}`}
                  {' · '}
                  {t(`events.kind.${e.kind}` as const)}
                </span>
              </span>
              {next && (
                <span className="event-next">
                  <strong>{next.date}</strong>
                  <span className="muted small">+{diffDays(today, next.date)} {t('common.days')}</span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {editing && <EventForm initial={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function LiturgicalYear() {
  const { data, lang, today, t } = useStore();
  const [year, setYear] = useState(parseISO(today)[0]);
  const [filter, setFilter] = useState({ solemnities: true, feasts: true, memorials: false, sundays: true, obligations: true, fastDays: true });
  const days = useMemo(
    () => importantLiturgicalDays(formatISO(year, 1, 1), formatISO(year, 12, 31), filter, data.settings.liturgical),
    [year, filter, data.settings.liturgical],
  );
  const groups: { season: string; days: LiturgicalDay[] }[] = [];
  for (const d of days) {
    const key = `${d.season}`;
    if (!groups.length || groups[groups.length - 1].season !== key) groups.push({ season: key, days: [] });
    groups[groups.length - 1].days.push(d);
  }
  return (
    <Card
      title={`${t('events.liturgical')} ${year}`}
      actions={
        <div className="seg">
          <button className="seg-btn" onClick={() => setYear(year - 1)}>
            ‹
          </button>
          <button className="seg-btn" onClick={() => setYear(year + 1)}>
            ›
          </button>
        </div>
      }
    >
      <div className="filter-row">
        {(['solemnities', 'feasts', 'memorials', 'sundays'] as const).map((k) => (
          <Toggle key={k} checked={filter[k]} onChange={(v) => setFilter({ ...filter, [k]: v })} label={t(`events.filter.${k}` as const)} />
        ))}
      </div>
      {groups.map((g, i) => (
        <div key={i} className="season-group">
          <h4>{SEASON_TITLES[g.season as keyof typeof SEASON_TITLES][lang]}</h4>
          <ul className="agenda">
            {g.days.map((d) => (
              <li key={d.date} style={{ borderLeftColor: COLOR_HEX[d.color] }} className={d.date === today ? 'today' : d.date < today ? 'past' : ''}>
                <div className="agenda-date">
                  <strong>{d.date.slice(5)}</strong>
                  <span className="muted small">{new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-CA', { weekday: 'short', timeZone: 'UTC' }).format(Date.parse(d.date))}</span>
                </div>
                <div>
                  <div>{d.principal.title[lang]}</div>
                  <div className="muted small">
                    {rankLabel(d.principal.rank, lang)}
                    {d.holyDayOfObligation && new Date(d.date).getUTCDay() !== 0 && ` · ${t('cal.obligation')}`}
                    {d.fasting === 'fast_and_abstinence' && ` · ${t('cal.fast')}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  );
}

function rankLabel(rank: string, lang: 'en' | 'vi'): string {
  const m: Record<string, [string, string]> = {
    triduum: ['Paschal Triduum', 'Tam Nhật Vượt Qua'],
    solemnity: ['Solemnity', 'Lễ trọng'],
    sunday: ['Sunday', 'Chúa Nhật'],
    feast: ['Feast', 'Lễ kính'],
    memorial: ['Memorial', 'Lễ nhớ'],
    optional_memorial: ['Optional memorial', 'Lễ nhớ tự do'],
    commemoration: ['Commemoration', 'Tưởng niệm'],
    weekday: ['Weekday', 'Ngày thường'],
  };
  return (m[rank] ?? [rank, rank])[lang === 'vi' ? 1 : 0];
}

function LunarHolidays() {
  const { lang, today } = useStore();
  const [ly, setLy] = useState(isoToLunar(today).year);
  const items = vnHolidaysForLunarYear(ly);
  const leap = getLeapMonth(ly);
  return (
    <Card
      title={`${lang === 'vi' ? 'Năm' : 'Lunar year'} ${yearCanChi(ly)} (${ly})`}
      actions={
        <div className="seg">
          <button className="seg-btn" onClick={() => setLy(ly - 1)}>
            ‹
          </button>
          <button className="seg-btn" onClick={() => setLy(ly + 1)}>
            ›
          </button>
        </div>
      }
    >
      <p className="muted small">
        {lang === 'vi' ? 'Tháng nhuận' : 'Leap month'}: {leap ? lunarMonthLabelVi(leap, true) : lang === 'vi' ? 'không có' : 'none'}
      </p>
      <ul className="agenda">
        {items.map((h) => {
          const l = isoToLunar(h.date);
          return (
            <li key={h.key} className={h.date < today ? 'past' : ''}>
              <div className="agenda-date">
                <strong>{h.date}</strong>
                <span className="muted small">
                  {l.day}/{l.month} ÂL
                </span>
              </div>
              <div>
                {h.category === 'catholic_tet' ? '✝️' : '🏮'} {lang === 'vi' ? h.vi : h.en}
                {lang !== 'vi' && <div className="muted small">{h.vi}</div>}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Converter() {
  const { t, lang, today } = useStore();
  const [solar, setSolar] = useState<ISODate>(today);
  const tl = isoToLunar(today);
  const [lunar, setLunar] = useState({ day: tl.day, month: tl.month, year: tl.year, leap: false });
  const ld = isISODate(solar) ? lunarDetails(solar) : null;
  const monthLen = lunarMonthLength(lunar.month, lunar.year, lunar.leap);
  const back = lunar.day <= monthLen ? lunarToSolar(lunar.day, lunar.month, lunar.year, lunar.leap) : null;
  return (
    <div className="two-col">
      <Card title={t('events.solarToLunar')}>
        <Field label={t('events.solar')}>
          <input type="date" value={solar} onChange={(e) => setSolar(e.target.value)} />
        </Field>
        {ld && (
          <div className="convert-result">
            <div className="big">
              {ld.lunar.day}/{ld.lunar.month}
              {ld.lunar.leap ? ' (nhuận)' : ''}/{ld.lunar.year}
            </div>
            <div>
              {lunarMonthLabelVi(ld.lunar.month, ld.lunar.leap)} · {ld.yearCanChi}
            </div>
            <div className="muted small">
              Ngày {ld.dayCanChi} · Tháng {ld.monthCanChi} · {lang === 'vi' ? ld.solarTerm.vi : ld.solarTerm.en}
            </div>
          </div>
        )}
      </Card>
      <Card title={t('events.lunarToSolar')}>
        <div className="grid3">
          <Field label={t('events.lunarDay')}>
            <input type="number" min={1} max={30} value={lunar.day} onChange={(e) => setLunar({ ...lunar, day: Number(e.target.value) || 1 })} />
          </Field>
          <Field label={t('events.lunarMonth')}>
            <input type="number" min={1} max={12} value={lunar.month} onChange={(e) => setLunar({ ...lunar, month: Number(e.target.value) || 1 })} />
          </Field>
          <Field label="Năm / Year">
            <input type="number" min={1900} max={2199} value={lunar.year} onChange={(e) => setLunar({ ...lunar, year: Number(e.target.value) || tl.year })} />
          </Field>
        </div>
        <Toggle checked={lunar.leap} onChange={(v) => setLunar({ ...lunar, leap: v })} label={lang === 'vi' ? 'Tháng nhuận' : 'Leap month'} />
        <div className="convert-result">
          {back ? (
            <div className="big">
              {new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-CA', { dateStyle: 'full', timeZone: 'UTC' }).format(Date.parse(back))}
            </div>
          ) : (
            <div className="warn">
              {monthLen === 0
                ? lang === 'vi' ? 'Năm này không có tháng nhuận đó.' : 'That leap month does not exist in this year.'
                : lang === 'vi' ? `Tháng này chỉ có ${monthLen} ngày.` : `This lunar month only has ${monthLen} days.`}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
