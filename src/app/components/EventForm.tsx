import { useMemo, useState } from 'react';
import { newId, todayISO, type ISODate } from '../../shared/date';
import { lunarFieldsFromSolar, occurrencesInRange } from '../../shared/events/events';
import type { EventKind, PersonalEvent } from '../../shared/model';
import { yearCanChi } from '../../shared/lunar/vietnamese-lunar';
import { useStore } from '../state/store';
import { Field, Modal, Toggle } from './ui';

const KINDS: EventKind[] = ['death_anniversary', 'birthday', 'wedding', 'name_day', 'memorial', 'other'];

export function newEventDraft(date?: ISODate, kind: EventKind = 'death_anniversary'): PersonalEvent {
  const d = date ?? todayISO();
  const [y, m, day] = d.split('-').map(Number);
  if (kind === 'death_anniversary') {
    const l = lunarFieldsFromSolar(d);
    return { id: newId('e_'), kind, title: '', personName: '', calendar: 'lunar', day: l.day, month: l.month, year: l.year, leapMonth: l.leapMonth, remindDays: [7, 1, 0], remindTime: '08:00', notes: '', enabled: true };
  }
  return { id: newId('e_'), kind, title: '', personName: '', calendar: 'solar', day, month: m, year: y, leapMonth: false, remindDays: [1, 0], remindTime: '08:00', notes: '', enabled: true };
}

export function EventForm({ initial, onClose }: { initial: PersonalEvent; onClose: () => void }) {
  const { data, update, t, today } = useStore();
  const [ev, setEv] = useState<PersonalEvent>(initial);
  const [solarSource, setSolarSource] = useState<ISODate>('');
  const [remindText, setRemindText] = useState(initial.remindDays.join(', '));
  const isNew = !data.events.some((e) => e.id === initial.id);
  const set = <K extends keyof PersonalEvent>(k: K, v: PersonalEvent[K]) => setEv((e) => ({ ...e, [k]: v }));

  const next = useMemo(() => {
    const [y] = today.split('-').map(Number);
    return occurrencesInRange({ ...ev, enabled: true }, today, `${y + 2}-12-31`)[0];
  }, [ev, today]);

  const applySolar = (iso: ISODate) => {
    setSolarSource(iso);
    if (!iso) return;
    if (ev.calendar === 'lunar') {
      const l = lunarFieldsFromSolar(iso);
      setEv((e) => ({ ...e, day: l.day, month: l.month, year: l.year, leapMonth: l.leapMonth }));
    } else {
      const [y, m, d] = iso.split('-').map(Number);
      setEv((e) => ({ ...e, day: d, month: m, year: y }));
    }
  };

  const save = () => {
    const remindDays = remindText
      .split(/[,\s]+/)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 60);
    const final = { ...ev, title: ev.title.trim() || ev.personName.trim() || t(`events.kind.${ev.kind}` as const), remindDays };
    update((d) => {
      const i = d.events.findIndex((e) => e.id === final.id);
      if (i >= 0) d.events[i] = final;
      else d.events.push(final);
    });
    onClose();
  };

  const remove = () => {
    update((d) => {
      d.events = d.events.filter((e) => e.id !== ev.id);
    });
    onClose();
  };

  const maxDay = ev.calendar === 'lunar' ? 30 : 31;

  return (
    <Modal
      title={isNew ? t('events.new') : t('common.edit')}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button className="btn danger" onClick={remove}>
              {t('common.delete')}
            </button>
          )}
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn primary" onClick={save}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <Field label={t('events.kind')}>
        <select
          value={ev.kind}
          onChange={(e) => {
            const kind = e.target.value as EventKind;
            setEv((x) => ({ ...x, kind, calendar: kind === 'death_anniversary' ? 'lunar' : x.calendar }));
          }}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`events.kind.${k}` as const)}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid2">
        <Field label={t('events.title')}>
          <input value={ev.title} onChange={(e) => set('title', e.target.value)} placeholder={ev.kind === 'death_anniversary' ? 'Ông Nội, Bà Ngoại…' : ''} />
        </Field>
        <Field label={t('events.person')}>
          <input value={ev.personName} onChange={(e) => set('personName', e.target.value)} placeholder={ev.kind === 'name_day' ? 'Maria, Giuse…' : ''} />
        </Field>
      </div>
      <Field label={t('events.calendar')}>
        <div className="seg">
          {(['lunar', 'solar'] as const).map((c) => (
            <button key={c} type="button" className={ev.calendar === c ? 'seg-btn on' : 'seg-btn'} onClick={() => set('calendar', c)}>
              {c === 'lunar' ? t('events.lunarCal') : t('events.solar')}
            </button>
          ))}
        </div>
      </Field>
      <Field label={ev.kind === 'death_anniversary' ? t('events.dateOfDeath') : t('cycle.start')}>
        <input type="date" value={solarSource} onChange={(e) => applySolar(e.target.value)} />
      </Field>
      <div className="grid3">
        <Field label={ev.calendar === 'lunar' ? t('events.lunarDay') : 'Day'}>
          <input type="number" min={1} max={maxDay} value={ev.day} onChange={(e) => set('day', Math.max(1, Math.min(maxDay, Number(e.target.value) || 1)))} />
        </Field>
        <Field label={ev.calendar === 'lunar' ? t('events.lunarMonth') : 'Month'}>
          <input type="number" min={1} max={12} value={ev.month} onChange={(e) => set('month', Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
        </Field>
        <Field label={t('events.year')}>
          <input type="number" min={1800} max={2200} value={ev.year ?? ''} onChange={(e) => set('year', e.target.value ? Number(e.target.value) : undefined)} />
        </Field>
      </div>
      {ev.calendar === 'lunar' && (
        <>
          {ev.year && <p className="muted small">{ev.year} = {yearCanChi(ev.year)}</p>}
          <Toggle checked={ev.leapMonth} onChange={(v) => set('leapMonth', v)} label={t('events.leap')} />
        </>
      )}
      <div className="grid2">
        <Field label={t('events.remindDays')}>
          <input value={remindText} onChange={(e) => setRemindText(e.target.value)} placeholder="7, 1, 0" />
        </Field>
        <Field label={t('events.remindTime')}>
          <input type="time" value={ev.remindTime} onChange={(e) => set('remindTime', e.target.value)} />
        </Field>
      </div>
      <Field label={t('common.notes')}>
        <textarea rows={2} value={ev.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
      <Toggle checked={ev.enabled} onChange={(v) => set('enabled', v)} label={t('common.enabled')} />
      {next && <p className="hint">{t('events.nextOn', { date: next.date })}</p>}
    </Modal>
  );
}
