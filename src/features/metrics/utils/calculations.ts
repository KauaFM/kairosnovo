import type { Variation, ChartDataPoint } from '../types/metrics.types';

export function calcVariation(current: number, previous: number): Variation {
  if (previous === 0) return { value: 0, direction: 'neutral' };
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return {
    value: Math.abs(rounded),
    direction: rounded > 0.5 ? 'up' : rounded < -0.5 ? 'down' : 'neutral',
  };
}

export function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function lastN<T>(arr: T[], n: number): T[] {
  return arr.slice(Math.max(0, arr.length - n));
}

export function extractValues(points: ChartDataPoint[]): number[] {
  return points.map((p) => p.value);
}

// Recharts theme helper — returns colors for axis, grid, tooltips
export function getChartColors(isDark: boolean) {
  return {
    grid: isDark ? 'rgba(255,255,255,0.055)' : '#E5E5E5',
    axis: isDark ? 'rgba(255,255,255,0.24)' : '#A3A3A3',
    tick: isDark ? 'rgba(255,255,255,0.50)' : '#525252',
    tooltipBg: isDark ? '#1A1A1A' : '#FFFFFF',
    tooltipBorder: isDark ? 'rgba(255,255,255,0.055)' : '#E5E5E5',
    reference: isDark ? 'rgba(255,255,255,0.10)' : '#E5E5E5',
  };
}

// Tailwind class helpers for dynamic accent colors
export const BORDER_LEFT_CLASS: Record<string, string> = {
  '#00E676': 'border-l-[#00E676]',
  '#FFB300': 'border-l-[#FFB300]',
  '#E53935': 'border-l-[#E53935]',
};

export const TEXT_ACCENT_CLASS: Record<string, string> = {
  '#00E676': 'text-[#00E676]',
  '#FFB300': 'text-[#FFB300]',
  '#E53935': 'text-[#E53935]',
};
