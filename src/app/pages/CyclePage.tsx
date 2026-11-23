import { useMemo, useState } from 'react';
import { addDays, newId, type ISODate } from '../../shared/date';
import { cycleStats, cycleStatus, periodLength, pregnancyInfo, sortPeriods } from '../../shared/cycle/cycle';
import { label } from '../i18n';
import { useStore } from '../state/store';
import { BarChart, Card, Field, LineChart, Toggle } from '../components/ui';

export function CyclePage() {
  const { data, update, t, lang, today } = useStore();
  const st = data.settings.cycle;
  const stats = useMemo(() => cycleStats(data.periods, st), [data.periods, st]);
  const status = useMemo(() => cycleStatus(data.periods, today, st), [data.periods, today, st]);
  const [start, setStart] = useState<ISODate>('');
  const [end, setEnd] = useState<ISODate>('');
  const [editing, setEditing] = useState<string | null>(null);

  const sorted = sortPeriods(data.periods);
  const lastPeriod = sorted[sorted.length - 1];
  const cycles = stats.cycles.filter((c) => c.length !== undefined).slice(-12);

  const logs = Object.values(data.logs).sort((a, b) => a.date.localeCompare(b.date));
  const since = addDays(today, -120);
  const weights = logs.filter((l) => l.weight !== undefined).slice(-30).map((l) => ({ label: l.date.slice(5), value: l.weight! }));
  const temps = logs.filter((l) => l.temperature !== undefined && l.date >= since).map((l) => ({ label: l.date.slice(5), value: l.temperature! }));
  const symptomCounts = new Map<string, number>();
  for (const l of logs) for (const s of l.symptoms) symptomCounts.set(s, (symptomCounts.get(s) ?? 0) + 1);
  const topSymptoms = [...symptomCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const addPast = () => {
    if (!start) return;
    update((d) => {
      d.periods.push({ id: newId('p_'), start, end: end && end >= start ? end : undefined });
      d.periods = sortPeriods(d.periods);
    });
    setStart('');
    setEnd('');
  };

  const preg = st.pregnancyMode && st.pregnancyLmp ? pregnancyInfo(st.pregnancyLmp, today) : null;

  return (
    <div className="page">
      {preg && (
        <Card title={`🤰 ${t('cycle.pregnancy')}`}>
          <div className="stat-grid">
            <Stat label={lang === 'vi' ? 'Tuổi thai' : 'Gestational age'} value={`${preg.weeks}w ${preg.days}d`} />
            <Stat label={lang === 'vi' ? 'Dự sinh' : 'Due date'} value={preg.dueDate} />
            <Stat label={lang === 'vi' ? 'Tam cá nguyệt' : 'Trimester'} value={String(preg.trimester)} />
            <Stat label={lang === 'vi' ? 'Còn lại' : 'Days to go'} value={String(Math.max(0, preg.daysToGo))} />
          </div>
          <div className="progress">
            <div style={{ width: `${Math.min(100, ((preg.weeks * 7 + preg.days) / 280) * 100)}%` }} />
          </div>
        </Card>
      )}

      <Card title={t('cycle.title')}>
        <div className="stat-grid">
          <Stat label={t('cycle.avgCycle')} value={`${stats.averageCycle} ${t('common.days')}`} />
          <Stat label={t('cycle.avgPeriod')} value={`${stats.averagePeriod} ${t('common.days')}`} />
          <Stat label={t('cycle.lastPeriod')} value={lastPeriod?.start ?? '—'} />
          <Stat label={t('cycle.nextPeriod')} value={status.nextPeriod ?? '—'} />
          <Stat label={t('cycle.nextOvulation')} value={status.nextOvulation ?? '—'} />
          <Stat label={t('cycle.variation')} value={stats.variation !== undefined ? `±${Math.round(stats.variation / 2)} ${t('common.days')}` : '—'} />
        </div>
        {stats.variation !== undefined && stats.variation > 7 && (
          <p className="warn small">
            {lang === 'vi'
              ? 'Chu kỳ của bạn dao động nhiều hơn 7 ngày — dự đoán có thể kém chính xác.'
              : 'Your cycle varies by more than 7 days — predictions may be less accurate.'}
          </p>
        )}
        <p className="muted small">{t('cycle.disclaimer')}</p>
      </Card>

      <div className="two-col">
        <Card title={t('cycle.length')}>
          <BarChart data={cycles.map((c) => ({ label: c.start.slice(5), value: c.length! }))} average={stats.averageCycle} />
        </Card>
        <Card title={t('cycle.periodLength')}>
          <BarChart
            data={stats.cycles
              .filter((c) => c.periodLength)
              .slice(-12)
              .map((c) => ({ label: c.start.slice(5), value: c.periodLength! }))}
            average={stats.averagePeriod}
          />
        </Card>
        <Card title={t('cycle.temperature')}>
          <LineChart points={temps} unit="°" />
        </Card>
        <Card title={t('cycle.weight')}>
          <LineChart points={weights} unit="kg" />
        </Card>
      </div>

      {topSymptoms.length > 0 && (
        <Card title={t('cycle.symptoms')}>
          <BarChart data={topSymptoms.map(([k, v]) => ({ label: label(lang, k).slice(0, 8), value: v }))} />
        </Card>
      )}

      <Card title={t('cycle.addPast')}>
        <div className="grid3 align-end">
          <Field label={t('cycle.start')}>
            <input type="date" value={start} max={today} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label={t('cycle.end')}>
            <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <button className="btn primary" onClick={addPast} disabled={!start}>
            {t('common.add')}
          </button>
        </div>
      </Card>

      <Card title={t('cycle.history')}>
        {!sorted.length && <p className="muted">{t('cal.noData')}</p>}
        <table className="table">
          <thead>
            <tr>
              <th>{t('cycle.start')}</th>
              <th>{t('cycle.end')}</th>
              <th>{t('cycle.periodLength')}</th>
              <th>{t('cycle.length')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {[...stats.cycles].reverse().map((c) => {
              const p = sorted.find((x) => x.start === c.start)!;
              const isEditing = editing === p.id;
              return (
                <tr key={p.id}>
                  <td>
                    {isEditing ? (
                      <input type="date" value={p.start} onChange={(e) => e.target.value && update((d) => void (d.periods.find((x) => x.id === p.id)!.start = e.target.value))} />
                    ) : (
                      p.start
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="date" value={p.end ?? ''} min={p.start} onChange={(e) => update((d) => void (d.periods.find((x) => x.id === p.id)!.end = e.target.value || undefined))} />
                    ) : (
                      p.end ?? <span className="muted">{t('cycle.ongoing')}</span>
                    )}
                  </td>
                  <td>{periodLength(p) ?? '—'}</td>
                  <td>{c.length ?? '—'}</td>
                  <td className="row-actions">
                    <button className="icon-btn" onClick={() => setEditing(isEditing ? null : p.id)} aria-label={t('common.edit')}>
                      {isEditing ? '✓' : '✎'}
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={t('common.delete')}
                      onClick={() => window.confirm(`${t('common.delete')} ${p.start}?`) && update((d) => void (d.periods = d.periods.filter((x) => x.id !== p.id)))}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card title={t('cycle.pregnancy')}>
        <Toggle
          checked={st.pregnancyMode}
          onChange={(v) => update((d) => void ((d.settings.cycle.pregnancyMode = v), v && !d.settings.cycle.pregnancyLmp && (d.settings.cycle.pregnancyLmp = lastPeriod?.start)))}
          label={lang === 'vi' ? 'Chế độ mang thai (tắt dự đoán kinh nguyệt)' : 'Pregnancy mode (pauses period predictions)'}
        />
        {st.pregnancyMode && (
          <Field label={lang === 'vi' ? 'Ngày đầu kỳ kinh cuối (LMP)' : 'First day of last period (LMP)'}>
            <input type="date" value={st.pregnancyLmp ?? ''} max={today} onChange={(e) => update((d) => void (d.settings.cycle.pregnancyLmp = e.target.value || undefined))} />
          </Field>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
