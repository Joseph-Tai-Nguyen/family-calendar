import { useEffect, useMemo, useState } from 'react';
import { newId, pad2, todayISO } from '../../shared/date';
import { searchCities, type City } from '../../shared/time/cities';
import {
  allTimeZones,
  formatDate,
  formatDateTime,
  formatDiff,
  formatOffset,
  formatTime,
  hourKind,
  isDST,
  nextTransition,
  offsetMinutes,
  zoneAbbreviation,
  zonedParts,
  zonedTimeToUtc,
} from '../../shared/time/timezones';
import type { WorldClock } from '../../shared/model';
import { locale } from '../i18n';
import { copyText, downloadBlob } from '../lib/browser';
import { useStore } from '../state/store';
import { Card, Field, Tabs, Toggle } from '../components/ui';

type Tab = 'clocks' | 'planner' | 'converter';

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function useClocks() {
  const { data, update } = useStore();
  const clocks = [...data.clocks].sort((a, b) => a.order - b.order);
  const home = clocks.find((c) => c.home) ?? clocks[0];
  const save = (fn: (list: WorldClock[]) => WorldClock[]) =>
    update((d) => {
      d.clocks = fn([...d.clocks].sort((a, b) => a.order - b.order)).map((c, i) => ({ ...c, order: i }));
      if (d.clocks.length && !d.clocks.some((c) => c.home)) d.clocks[0].home = true;
    });
  return { clocks, home, save };
}

export function TimeBuddyPage() {
  const { t, data, update } = useStore();
  const [tab, setTab] = useState<Tab>('clocks');
  return (
    <div className="page">
      <div className="tabs-row">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'clocks', label: t('time.clocks') },
            { id: 'planner', label: t('time.planner') },
            { id: 'converter', label: t('time.converter') },
          ]}
        />
        <Toggle checked={!data.settings.timeBuddy.hour12} onChange={(v) => update((d) => void (d.settings.timeBuddy.hour12 = !v))} label="24h" />
      </div>
      {tab === 'clocks' && <Clocks />}
      {tab === 'planner' && <Planner />}
      {tab === 'converter' && <Converter />}
    </div>
  );
}

function CitySearch({ onPick }: { onPick: (c: City) => void }) {
  const { t } = useStore();
  const [q, setQ] = useState('');
  const zones = useMemo(() => allTimeZones(), []);
  const results = q.trim() ? searchCities(q, zones, 12) : [];
  return (
    <div className="city-search">
      <input type="search" value={q} placeholder={`🔍 ${t('time.addCity')}`} onChange={(e) => setQ(e.target.value)} aria-label={t('time.addCity')} />
      {results.length > 0 && (
        <ul className="city-results" role="listbox">
          {results.map((c) => (
            <li key={`${c.name}-${c.tz}`}>
              <button
                onClick={() => {
                  onPick(c);
                  setQ('');
                }}
              >
                <strong>{c.name}</strong> <span className="muted small">{c.country} · {c.tz} · {formatOffset(offsetMinutes(Date.now(), c.tz))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Clocks() {
  const { t, data, lang } = useStore();
  const hour12 = data.settings.timeBuddy.hour12;
  const now = useNow();
  const { clocks, home, save } = useClocks();
  const loc = locale(lang);
  const homeOffset = home ? offsetMinutes(now, home.timeZone) : 0;
  // DST look-ahead scans up to 400 days — recompute hourly, not every tick.
  const zoneKey = clocks.map((c) => c.timeZone).join('|');
  const hourBucket = Math.floor(now / 3_600_000);
  const transitions = useMemo(
    () => new Map(zoneKey.split('|').map((tz) => [tz, tz ? nextTransition(hourBucket * 3_600_000, tz) : undefined])),
    [zoneKey, hourBucket],
  );

  const add = (c: City) => save((list) => [...list, { id: newId('clk_'), label: c.name, timeZone: c.tz, order: list.length, home: !list.length }]);
  const move = (id: string, delta: number) =>
    save((list) => {
      const i = list.findIndex((c) => c.id === id);
      const j = i + delta;
      if (j < 0 || j >= list.length) return list;
      [list[i], list[j]] = [list[j], list[i]];
      return list;
    });

  return (
    <Card>
      <CitySearch onPick={add} />
      <ul className="clock-list">
        {clocks.map((c) => {
          const off = offsetMinutes(now, c.timeZone);
          const p = zonedParts(now, c.timeZone);
          const kind = hourKind(p.hour, data.settings.timeBuddy.workStart, data.settings.timeBuddy.workEnd);
          const tr = transitions.get(c.timeZone);
          return (
            <li key={c.id} className={`clock ${kind}`}>
              <div className="clock-main">
                <input
                  className="clock-label"
                  value={c.label}
                  aria-label="Label"
                  onChange={(e) => save((list) => list.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)))}
                />
                <div className="muted small">
                  {c.home && <span className="badge">🏠 {t('time.home')}</span>} {zoneAbbreviation(now, c.timeZone)} · {formatOffset(off)}
                  {isDST(now, c.timeZone) && <span className="badge">{t('time.dst')}</span>}
                  {tr && <span> · {t('time.nextChange', { date: formatDate(tr.at, c.timeZone, loc) })} ({formatDiff(tr.toOffset - tr.fromOffset)})</span>}
                </div>
              </div>
              <div className="clock-time">
                <div className="time-big">{formatTime(now, c.timeZone, hour12, loc)}</div>
                <div className="muted small">
                  {formatDate(now, c.timeZone, loc)} · {c.home ? '—' : formatDiff(off - homeOffset)}
                </div>
              </div>
              <div className="clock-actions">
                {!c.home && (
                  <button className="icon-btn" title={t('time.setHome')} onClick={() => save((list) => list.map((x) => ({ ...x, home: x.id === c.id })))}>
                    🏠
                  </button>
                )}
                <button className="icon-btn" onClick={() => move(c.id, -1)} aria-label="Up">
                  ↑
                </button>
                <button className="icon-btn" onClick={() => move(c.id, 1)} aria-label="Down">
                  ↓
                </button>
                <button className="icon-btn" onClick={() => save((list) => list.filter((x) => x.id !== c.id))} aria-label={t('common.delete')}>
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Planner() {
  const { t, data, lang } = useStore();
  const { clocks, home } = useClocks();
  const hour12 = data.settings.timeBuddy.hour12;
  const { workStart, workEnd } = data.settings.timeBuddy;
  const loc = locale(lang);
  const now = useNow(30_000);
  const homeZone = home?.timeZone ?? 'UTC';
  const [date, setDate] = useState(() => todayISO(homeZone));
  const [slot, setSlot] = useState(() => {
    const p = zonedParts(Date.now(), homeZone);
    return p.hour * 2 + (p.minute >= 30 ? 1 : 0);
  });
  const [copied, setCopied] = useState(false);

  const [y, m, d] = date.split('-').map(Number);
  const base = zonedTimeToUtc(y, m, d, 0, 0, homeZone);
  const hours = Array.from({ length: 24 }, (_, h) => base + h * 3_600_000);
  const selected = base + slot * 1_800_000;
  const nowCol = now >= base && now < base + 86_400_000 ? Math.floor((now - base) / 3_600_000) : -1;

  const summary = clocks.map((c) => `${c.label}: ${formatDateTime(selected, c.timeZone, hour12, loc)} (${zoneAbbreviation(selected, c.timeZone)})`).join('\n');

  const exportIcs = () => {
    const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//family-calendar//time-buddy//EN',
      'BEGIN:VEVENT',
      `UID:${newId('tb_')}@family-calendar`,
      `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(selected)}`,
      `DTEND:${stamp(selected + 3_600_000)}`,
      'SUMMARY:Meeting',
      `DESCRIPTION:${summary.replace(/\n/g, '\\n').replace(/,/g, '\\,')}`,
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n');
    downloadBlob(ics, 'meeting.ics', 'text/calendar');
  };

  return (
    <Card>
      <div className="planner-head">
        <Field label={`${t('time.home')}: ${home?.label ?? homeZone}`}>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </Field>
        <div className="planner-selected">
          <div className="muted small">{t('time.selected')}</div>
          <strong>{formatDateTime(selected, homeZone, hour12, loc)}</strong>
        </div>
        <div className="actions-row">
          <button
            className="btn small"
            onClick={async () => {
              setCopied(await copyText(summary));
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? t('common.copied') : `📋 ${t('time.copyTimes')}`}
          </button>
          <button className="btn small" onClick={exportIcs}>
            📅 .ics
          </button>
        </div>
      </div>
      <input
        className="planner-slider"
        type="range"
        min={0}
        max={47}
        value={slot}
        onChange={(e) => setSlot(Number(e.target.value))}
        aria-label={t('time.selected')}
      />
      <p className="muted small">{t('time.dragHint')}</p>
      <div className="planner" style={{ ['--sel' as string]: slot / 2 }}>
        {clocks.map((c) => {
          const selParts = zonedParts(selected, c.timeZone);
          return (
            <div key={c.id} className="planner-row">
              <div className="planner-label">
                <strong>{c.label}</strong>
                <span className="muted small">
                  {formatTime(selected, c.timeZone, hour12, loc)} · {pad2(selParts.day)}/{pad2(selParts.month)}
                </span>
              </div>
              <div className="planner-cells">
                {hours.map((ms, i) => {
                  const p = zonedParts(ms, c.timeZone);
                  const kind = hourKind(p.hour, workStart, workEnd);
                  const newDay = p.hour === 0 || (i === 0 && c.timeZone !== homeZone);
                  const h12 = p.hour % 12 || 12;
                  return (
                    <button
                      key={i}
                      className={`cell ${kind} ${Math.floor(slot / 2) === i ? 'sel' : ''} ${nowCol === i ? 'now' : ''} ${p.hour === 0 ? 'midnight' : ''}`}
                      onClick={() => setSlot(i * 2)}
                      title={formatDateTime(ms, c.timeZone, hour12, loc)}
                    >
                      {newDay && p.hour === 0 ? (
                        <span className="cell-date">{new Intl.DateTimeFormat(loc, { timeZone: c.timeZone, month: 'short', day: 'numeric' }).format(ms)}</span>
                      ) : (
                        <>
                          <span>{hour12 ? h12 : p.hour}</span>
                          {p.minute ? <sup>{pad2(p.minute)}</sup> : null}
                          {hour12 && <small>{p.hour < 12 ? 'am' : 'pm'}</small>}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span>
          <i className="sw work" /> {lang === 'vi' ? 'Giờ làm việc' : 'Working hours'} ({workStart}–{workEnd})
        </span>
        <span>
          <i className="sw edge" /> {lang === 'vi' ? 'Sáng/tối' : 'Morning/evening'}
        </span>
        <span>
          <i className="sw night" /> {lang === 'vi' ? 'Đêm' : 'Night'}
        </span>
      </div>
    </Card>
  );
}

function Converter() {
  const { t, data, lang } = useStore();
  const { clocks, home } = useClocks();
  const hour12 = data.settings.timeBuddy.hour12;
  const loc = locale(lang);
  const zones = useMemo(() => allTimeZones(), []);
  const [from, setFrom] = useState(home?.timeZone ?? 'UTC');
  const [value, setValue] = useState(() => {
    const p = zonedParts(Date.now(), home?.timeZone ?? 'UTC');
    return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
  });
  const [extra, setExtra] = useState<City[]>([]);
  const [ymd, hm] = value.split('T');
  const [y, mo, d] = (ymd ?? '').split('-').map(Number);
  const [h, mi] = (hm ?? '').split(':').map(Number);
  const valid = [y, mo, d, h, mi].every((n) => Number.isFinite(n));
  const instant = valid ? zonedTimeToUtc(y, mo, d, h, mi, from) : Date.now();
  const fromOff = offsetMinutes(instant, from);
  const targets = [...clocks.map((c) => ({ label: c.label, tz: c.timeZone })), ...extra.map((c) => ({ label: c.name, tz: c.tz }))];
  const zoneOptions = [...new Set([...clocks.map((c) => c.timeZone), ...zones])];

  return (
    <Card>
      <div className="grid2">
        <Field label={t('time.dateTime')}>
          <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label={t('time.from')}>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {zoneOptions.map((z) => (
              <option key={z} value={z}>
                {clocks.find((c) => c.timeZone === z)?.label ?? z} ({formatOffset(offsetMinutes(instant, z))})
              </option>
            ))}
          </select>
        </Field>
      </div>
      <button className="btn small ghost" onClick={() => {
        const p = zonedParts(Date.now(), from);
        setValue(`${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`);
      }}>
        {t('time.now')}
      </button>
      <table className="table convert-table">
        <thead>
          <tr>
            <th />
            <th>{t('time.dateTime')}</th>
            <th>{t('time.difference')}</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((x, i) => (
            <tr key={`${x.tz}-${i}`}>
              <td>
                <strong>{x.label}</strong>
                <div className="muted small">{zoneAbbreviation(instant, x.tz)} · {formatOffset(offsetMinutes(instant, x.tz))}</div>
              </td>
              <td>{formatDateTime(instant, x.tz, hour12, loc)}</td>
              <td>{formatDiff(offsetMinutes(instant, x.tz) - fromOff)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <CitySearch onPick={(c) => setExtra((e) => [...e, c])} />
      <p className="muted small">UTC: {new Date(instant).toISOString().replace('.000', '')}</p>
    </Card>
  );
}
