// =============================================================
// ORVAX · Life OS — Universal Pillar Intelligence · Types
// Tipos genéricos para todos os pilares não-especializados.
// =============================================================
import type { TimelineBlock } from '../components/charts/primitives/ExecutionTimeline';

export interface PillarScoreData {
  score: number;
  trend7d: number;
  sparkline7d: number[];
}

export interface PillarRadarAxis {
  axis: string;
  current: number;
  previous: number;
}

export interface PillarSeriesPoint {
  date: string;
  value: number;
  avg: number;
}

export interface PillarDistItem {
  label: string;
  value: number;
  color: string;
}

export interface PillarCorrelation {
  xLabel: string;
  yLabel: string;
  data: Array<{ x: number; y: number }>;
  pearson: number;
}

export type PillarStatus = 'critical' | 'declining' | 'stable' | 'improving' | 'excellent';

export interface PillarDriver {
  factor: string;
  impact: number;
  metric: string;
  tone: 'positive' | 'negative';
  icon: string;
}

export interface PillarPriority {
  problem: string;
  problemDetail: string;
  action: string;
  actionIcon: string;
}

export interface PillarAction {
  label: string;
  icon: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface PillarPrediction {
  metric: string;
  delta: number;
  direction: 'up' | 'down';
  days: number;
}

export interface PillarPattern {
  type: 'peak' | 'alert' | 'streak';
  description: string;
}

export interface PillarDiagnosis {
  status: PillarStatus;
  headline: string;
  rootCause: string;
  drivers: PillarDriver[];
  predictions: PillarPrediction[];
  predictionNarrative: string;
  priority: PillarPriority;
  actions: PillarAction[];
  snapshotStory: string;
  snapshotDiagnosis: string;
  analysisInsights: Record<string, string>;
  depthNarrative: string;
  patterns: PillarPattern[];
  topCorrelations: PillarCorrelation[];
}

export interface PillarIntelData {
  snapshot: PillarScoreData;
  radar: PillarRadarAxis[];
  mainSeries30d: PillarSeriesPoint[];
  secondarySeries30d: PillarSeriesPoint[];
  heatmap90d: Array<{ date: string; level: number }>;
  distribution: PillarDistItem[];
  correlations: PillarCorrelation[];
  aiPatterns: string[];
  timeline24h: TimelineBlock[];
}
