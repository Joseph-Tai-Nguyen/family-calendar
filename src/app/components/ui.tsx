/** Small shared UI primitives. */
import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((it) => (
        <button key={it.id} role="tab" aria-selected={value === it.id} className={value === it.id ? 'tab active' : 'tab'} onClick={() => onChange(it.id)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Chips({
  options,
  value,
  onChange,
  labelOf,
  multi = true,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  labelOf: (k: string) => string;
  multi?: boolean;
}) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            className={on ? 'chip on' : 'chip'}
            aria-pressed={on}
            onClick={() => onChange(multi ? (on ? value.filter((v) => v !== o) : [...value, o]) : on ? [] : [o])}
          >
            {labelOf(o)}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
      <span>{label}</span>
    </label>
  );
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function Card({ title, children, actions }: { title?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card-head">
          {title && <h3>{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------- charts (dependency-free SVG)

export function BarChart({ data, average, unit = '' }: { data: { label: string; value: number }[]; average?: number; unit?: string }) {
  if (!data.length) return <p className="muted">—</p>;
  const W = 320;
  const H = 140;
  const pad = 22;
  const max = Math.max(...data.map((d) => d.value), average ?? 0) * 1.15;
  const bw = (W - pad * 2) / data.length;
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img">
      {data.map((d, i) => (
        <g key={i}>
          <rect x={pad + i * bw + bw * 0.15} y={y(d.value)} width={bw * 0.7} height={H - pad - y(d.value)} rx={3} className="bar" />
          <text x={pad + i * bw + bw / 2} y={y(d.value) - 4} textAnchor="middle" className="chart-val">
            {d.value}
            {unit}
          </text>
          {data.length <= 12 && (
            <text x={pad + i * bw + bw / 2} y={H - 6} textAnchor="middle" className="chart-label">
              {d.label}
            </text>
          )}
        </g>
      ))}
      {average !== undefined && <line x1={pad} x2={W - pad} y1={y(average)} y2={y(average)} className="avg-line" />}
    </svg>
  );
}

export function LineChart({ points, unit = '' }: { points: { label: string; value: number }[]; unit?: string }) {
  if (points.length < 2) return <p className="muted">{points.length ? `${points[0].value}${unit}` : '—'}</p>;
  const W = 320;
  const H = 140;
  const pad = 24;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img">
      <path d={d} className="line" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={2.5} className="dot" />
      ))}
      <text x={4} y={y(max) + 4} className="chart-label">
        {max}
        {unit}
      </text>
      <text x={4} y={y(min) + 4} className="chart-label">
        {min}
        {unit}
      </text>
      <text x={pad} y={H - 4} className="chart-label">
        {points[0].label}
      </text>
      <text x={W - pad} y={H - 4} textAnchor="end" className="chart-label">
        {points[points.length - 1].label}
      </text>
    </svg>
  );
}
