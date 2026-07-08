// =============================================================
// Compass — PillarData types
// Adapted from Lovable data-engine, but for REAL data consumption.
// =============================================================

import type { CompassPillarSlug } from './pillars';

export type AxisValue = { key: string; label: string; value: number; raw?: string };
export type DayPoint = { day: string; value: number; month?: string; year?: number };
export type ExecutionBlock = { hour: number; activity: string; type: 'produtivo' | 'distracao' | 'neutro' };
export type HeatCell = { day: number; hour: number; intensity: number; date?: string };
export type ScatterPoint = { x: number; y: number };
export type SankeyLink = { source: string; target: string; value: number };
export type Milestone = { date: string; title: string; impact: number; icon?: string };

export type PillarStatus = 'critico' | 'atencao' | 'saudavel';

export interface PillarData {
  config: PillarConfig;
  score: number;
  scorePrev: number;
  delta7: number;
  status: PillarStatus;
  sparkline: number[];

  axesNow: AxisValue[];
  axesPast: AxisValue[];

  today: ExecutionBlock[];
  todayInsight: string;
  productiveHours: number;
  distractionHours: number;
  peakHour: number;
  troughHour: number;
  recurringDistraction: { activity: string; hours: number; daysAffected: number } | null;

  week: DayPoint[];
  weekHeat: HeatCell[];
  weekInsight: string;
  weekConsistency: number;

  problem: { title: string; detail: string; cause: string };
  actions: { title: string; why: string; when: string }[];

  evolution30: DayPoint[];
  evolutionYear: DayPoint[]; // 12 months aggregation
  yearDensity: { date: string; count: number }[]; // 365 days for GitHub-style heatmap
  lifetimeMilestones: Milestone[];
  
  scatter: ScatterPoint[];
  scatterCorrelation: number;

  sankey: { nodes: string[]; links: SankeyLink[] };

  prediction: { positive: string; negative: string; trend: number; projected30: number };
  truth: string;

  /** True when most data came from real sources */
  hasRealData: boolean;
  /** True when empty (no data at all) */
  isEmpty: boolean;
}

export interface PillarConfig {
  slug: CompassPillarSlug;
  name: string;
  tagline: string;
  axes: { key: string; label: string; inverted?: boolean }[];
  activities: { key: string; label: string; type: 'produtivo' | 'distracao' | 'neutro' }[];
  impacts: string[];
  keyHabit: string;
  priority: string;
  correlation: { x: string; y: string; label: string };
}

export interface GlobalMetrics {
  scoreAvg: number;
  scoreAvgPrev: number;
  delta7: number;
  critical: number;
  rising: number;
  balance: { key: string; label: string; value: number; valuePast: number }[];
  streak: number;
  consistency: number;
  activeDays: number;
  xpTotal: number;
  xpWeek: number;
  multiYear: { label: string; value: number; year: number }[];
  multiYearGrowthPct: number;
  yearMap: { day: number; intensity: number }[];
  yearExecutedDays: number;
  yearStreak: number;
  hasRealData: boolean;
}
