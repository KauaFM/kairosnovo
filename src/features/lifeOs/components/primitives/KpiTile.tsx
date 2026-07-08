// =============================================================
// ORVAX · Life OS — KpiTile
// Bloco de número grande + delta + sparkline opcional.
// Padrão MONO: quando não vier accent, usa tinta do tema.
// =============================================================
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './Card';
import type { SeriesPoint } from '../../types';

type Props = {
  label: string;
  value: string | number;
  deltaPct?: number | null;
  /** Opcional. Se omitido, fica monocromático (ink). */
  accent?: string;
  series?: SeriesPoint[];
  hint?: string;
  big?: boolean;
};

export function KpiTile({ label, value, deltaPct, accent, series, hint, big }: Props) {
  const valueStyle = accent ? { color: accent } : undefined;
  const valueClass = [
    'font-mono font-bold leading-none',
    big ? 'text-3xl' : 'text-xl',
    accent ? '' : 'text-zinc-900 dark:text-zinc-50',
  ].join(' ');

  return (
    <Card padding="md" elevated className="flex flex-col gap-2">
      <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <div className="flex items-baseline justify-between">
        <span className={valueClass} style={valueStyle}>
          {value}
        </span>
        {deltaPct != null && <DeltaBadge pct={deltaPct} />}
      </div>
      {series && <MiniSpark series={series} color={accent} />}
      {hint && <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-500">{hint}</span>}
    </Card>
  );
}

function DeltaBadge({ pct }: { pct: number }) {
  const Arrow = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const color = pct > 0 ? '#22c55e' : pct < 0 ? '#ef4444' : '#a3a3a3';
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium" style={{ color }}>
      <Arrow size={12} strokeWidth={2.5} />
      {Math.abs(pct)}%
    </span>
  );
}

/** Gera path SVG suavizado (Catmull-Rom → cubic Bezier). */
function smoothPath(pts: Array<[number, number]>): string {
  if (!pts.length) return '';
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  const d: string[] = [`M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`);
  }
  return d.join(' ');
}

function MiniSpark({ series, color }: { series: SeriesPoint[]; color?: string }) {
  if (!series?.length) return null;
  const w = 120, h = 28;
  const max = Math.max(...series.map((p) => p.v), 1);
  const min = Math.min(...series.map((p) => p.v), 0);
  const span = Math.max(1, max - min);
  const step = w / Math.max(series.length - 1, 1);
  // path suave via Catmull-Rom → Bezier (sem quinas)
  const pointsArr = series.map((p, i) => [
    i * step,
    h - ((p.v - min) / span) * (h - 2) - 1,
  ] as [number, number]);
  const d = smoothPath(pointsArr);
  const stroke = color || 'currentColor';
  return (
    <svg
      width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      className={[
        'block',
        color ? '' : 'text-zinc-700 dark:text-zinc-300',
      ].join(' ')}
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeOpacity={color ? 1 : 0.85}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
