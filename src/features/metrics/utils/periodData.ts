import type { Period, ChartDataPoint, StackedDataPoint } from '../types/metrics.types';

/* ═══════════════════════════════════════════════════════ */
/*  PERIOD-AWARE DATA GENERATION                          */
/*  Generates different chart data & KPIs per period      */
/* ═══════════════════════════════════════════════════════ */

/* ── Deterministic PRNG ── */
function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ── Period configurations ── */
interface PeriodConfig {
  points: number;
  labelFn: (i: number, total: number) => string;
  heroTitle: string;
  kpiScale: number;       // multiplier vs monthly base
  variationScale: number; // how variation changes
}

function getPeriodConfig(period: Period): PeriodConfig {
  const now = new Date();

  switch (period) {
    case 'week':
      return {
        points: 7,
        labelFn: (i) => {
          const d = new Date(now);
          d.setDate(d.getDate() - 6 + i);
          return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        },
        heroTitle: '7D',
        kpiScale: 0.25,
        variationScale: 0.6,
      };
    case 'month':
      return {
        points: 30,
        labelFn: (i) => {
          const d = new Date(now);
          d.setDate(d.getDate() - 29 + i);
          return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        },
        heroTitle: '30D',
        kpiScale: 1,
        variationScale: 1,
      };
    case '3m':
      return {
        points: 12,
        labelFn: (i) => `S${i + 1}`,
        heroTitle: '12 Semanas',
        kpiScale: 3,
        variationScale: 1.4,
      };
    case '6m':
      return {
        points: 24,
        labelFn: (i) => {
          const d = new Date(now);
          d.setMonth(d.getMonth() - 6);
          d.setDate(d.getDate() + i * 7);
          return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        },
        heroTitle: '6 Meses',
        kpiScale: 6,
        variationScale: 1.8,
      };
    case 'year':
      return {
        points: 12,
        labelFn: (i) => {
          const d = new Date(now);
          d.setMonth(d.getMonth() - 11 + i);
          return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        },
        heroTitle: '12 Meses',
        kpiScale: 12,
        variationScale: 2.5,
      };
  }
}

/* ── Generate chart data points for a given period ── */
export function genPeriodDaily(
  base: number,
  variance: number,
  period: Period,
  seed: number,
  trend = 0,
): ChartDataPoint[] {
  const cfg = getPeriodConfig(period);
  const rng = createRng(seed + periodSeedOffset(period));
  return Array.from({ length: cfg.points }, (_, i) => ({
    label: cfg.labelFn(i, cfg.points),
    value: Math.max(0, Math.round((base + (trend * i) / cfg.points + (rng() - 0.5) * 2 * variance) * 10) / 10),
  }));
}

/* ── Generate weekly bar data ── */
export function genPeriodWeekly(
  base: number,
  variance: number,
  period: Period,
  seed: number,
): ChartDataPoint[] {
  const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
  const rng = createRng(seed + periodSeedOffset(period));

  if (period === 'week' || period === 'month') {
    return DAYS.map((label) => ({
      label,
      value: Math.max(0, Math.round((base + (rng() - 0.5) * 2 * variance) * 10) / 10),
    }));
  }

  // For longer periods, show weekly averages
  const cfg = getPeriodConfig(period);
  return Array.from({ length: Math.min(cfg.points, 12) }, (_, i) => ({
    label: cfg.labelFn(i, cfg.points),
    value: Math.max(0, Math.round((base + (rng() - 0.5) * 2 * variance) * 10) / 10),
  }));
}

/* ── Generate stacked data (e.g., sleep, productive vs idle) ── */
export function genPeriodStacked(
  keys: string[],
  bases: number[],
  variances: number[],
  period: Period,
  seed: number,
): StackedDataPoint[] {
  const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
  const rng = createRng(seed + periodSeedOffset(period));

  const labels = period === 'week' || period === 'month'
    ? DAYS
    : Array.from({ length: getPeriodConfig(period).points }, (_, i) => getPeriodConfig(period).labelFn(i, getPeriodConfig(period).points));

  return labels.map((label) => {
    const point: StackedDataPoint = { label };
    keys.forEach((key, ki) => {
      (point as any)[key] = Math.max(0, Math.round((bases[ki] + (rng() - 0.5) * 2 * variances[ki]) * 10) / 10);
    });
    return point;
  });
}

/* ── Scale a KPI value based on period (vs monthly base) ── */
export function scaleKpi(monthlyValue: number, period: Period): number {
  const rng = createRng(Math.round(monthlyValue * 100));
  const jitter = 1 + (rng() - 0.5) * 0.08; // ±4% natural variation

  switch (period) {
    case 'week': return Math.round(monthlyValue * 0.25 * jitter * 10) / 10;
    case 'month': return monthlyValue;
    case '3m': return Math.round(monthlyValue * 3 * jitter * 10) / 10;
    case '6m': return Math.round(monthlyValue * 6 * jitter * 10) / 10;
    case 'year': return Math.round(monthlyValue * 12 * jitter * 10) / 10;
  }
}

/* ── Scale variation based on period ── */
export function scaleVariation(baseVariation: number, period: Period): number {
  switch (period) {
    case 'week': return Math.round(baseVariation * 0.6 * 10) / 10;
    case 'month': return baseVariation;
    case '3m': return Math.round(baseVariation * 1.4 * 10) / 10;
    case '6m': return Math.round(baseVariation * 1.8 * 10) / 10;
    case 'year': return Math.round(baseVariation * 2.5 * 10) / 10;
  }
}

/* ── Hero chart subtitle ── */
export function periodLabel(period: Period): string {
  return getPeriodConfig(period).heroTitle;
}

/* ── Period comparison label ── */
export function periodCompareLabel(period: Period): string {
  switch (period) {
    case 'week': return 'vs semana anterior';
    case 'month': return 'vs mes anterior';
    case '3m': return 'vs trimestre anterior';
    case '6m': return 'vs semestre anterior';
    case 'year': return 'vs ano anterior';
  }
}

/* ── Internal: offset seed by period so different periods produce different data ── */
function periodSeedOffset(period: Period): number {
  switch (period) {
    case 'week': return 100;
    case 'month': return 200;
    case '3m': return 300;
    case '6m': return 400;
    case 'year': return 500;
  }
}
