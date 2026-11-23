import { useState } from 'react';
import { emptyLog, isLogEmpty, MOODS, SYMPTOMS, type DailyLog } from '../../shared/model';
import type { ISODate } from '../../shared/date';
import { label } from '../i18n';
import { useStore } from '../state/store';
import { Chips, Field, Modal, Toggle } from './ui';

const FLOWS = ['spotting', 'light', 'medium', 'heavy'] as const;
const MUCUS = ['dry', 'sticky', 'creamy', 'watery', 'egg_white'] as const;

export function DayEditor({ date, onClose }: { date: ISODate; onClose: () => void }) {
  const { data, update, t, lang } = useStore();
  const [log, setLog] = useState<DailyLog>(() => structuredClone(data.logs[date] ?? emptyLog(date)));
  const set = <K extends keyof DailyLog>(k: K, v: DailyLog[K]) => setLog((l) => ({ ...l, [k]: v }));
  const lbl = (k: string) => label(lang, k);
  const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')));

  const save = () => {
    update((d) => {
      if (isLogEmpty(log)) delete d.logs[date];
      else d.logs[date] = log;
    });
    onClose();
  };

  return (
    <Modal
      title={`${t('cal.logDay')} · ${date}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn primary" onClick={save}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <Field label={t('log.flow')}>
        <Chips options={FLOWS} value={log.flow ? [log.flow] : []} multi={false} labelOf={lbl} onChange={(v) => set('flow', (v[0] ?? '') as DailyLog['flow'])} />
      </Field>
      <Field label={t('log.symptoms')}>
        <Chips options={SYMPTOMS} value={log.symptoms} labelOf={lbl} onChange={(v) => set('symptoms', v)} />
      </Field>
      <Field label={t('log.moods')}>
        <Chips options={MOODS} value={log.moods} labelOf={lbl} onChange={(v) => set('moods', v)} />
      </Field>
      <Field label={t('log.mucus')}>
        <Chips options={MUCUS} value={log.mucus ? [log.mucus] : []} multi={false} labelOf={lbl} onChange={(v) => set('mucus', (v[0] ?? '') as DailyLog['mucus'])} />
      </Field>
      <div className="grid2">
        <Field label={t('log.temperature')}>
          <input type="number" step="0.01" min="34" max="42" inputMode="decimal" value={log.temperature ?? ''} onChange={(e) => set('temperature', num(e.target.value))} />
        </Field>
        <Field label={t('log.weight')}>
          <input type="number" step="0.1" min="20" max="300" inputMode="decimal" value={log.weight ?? ''} onChange={(e) => set('weight', num(e.target.value))} />
        </Field>
      </div>
      <Field label={t('log.intercourse')}>
        <Chips options={['protected', 'unprotected']} value={log.intercourse ? [log.intercourse] : []} multi={false} labelOf={lbl} onChange={(v) => set('intercourse', (v[0] ?? '') as DailyLog['intercourse'])} />
      </Field>
      <div className="grid2">
        <Field label={t('log.ovulationTest')}>
          <Chips options={['negative', 'positive']} value={log.ovulationTest ? [log.ovulationTest] : []} multi={false} labelOf={lbl} onChange={(v) => set('ovulationTest', (v[0] ?? '') as DailyLog['ovulationTest'])} />
        </Field>
        <Field label={t('log.pregnancyTest')}>
          <Chips options={['negative', 'positive']} value={log.pregnancyTest ? [log.pregnancyTest] : []} multi={false} labelOf={lbl} onChange={(v) => set('pregnancyTest', (v[0] ?? '') as DailyLog['pregnancyTest'])} />
        </Field>
      </div>
      <Toggle checked={log.pill} onChange={(v) => set('pill', v)} label={t('log.pill')} />
      <Field label={t('common.notes')}>
        <textarea rows={3} value={log.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
    </Modal>
  );
}
