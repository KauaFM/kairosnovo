// =============================================================
// ORVAX · Life OS — Body Intelligence System · Types
// =============================================================

export interface BodyScoreData {
  score: number;             // 0-100
  trend7d: number;           // variação %
  sparkline7d: number[];     // 7 valores diários
}

export interface BodyRadarAxis {
  axis: string;
  current: number;
  previous: number;
}

export interface WorkoutDay {
  date: string;
  type: string;              // "Força", "Cardio", "HIIT", "Descanso ativo"
  duration: number;          // minutos
  intensity: number;         // 1-10
}

export interface SleepEntry {
  date: string;
  hours: number;
  quality: number;           // 1-10
}

export interface BodySeriesPoint {
  date: string;
  value: number;
  avg: number;
}

export interface NutritionSummary {
  label: string;
  value: number;             // %
  color: string;
}

export interface BodyCorrelation {
  xLabel: string;
  yLabel: string;
  data: Array<{ x: number; y: number }>;
  pearson: number;
}

export type BodyStatus = 'critical' | 'declining' | 'stable' | 'improving' | 'excellent';

export interface BodyDriver {
  factor: string;
  impact: number;
  metric: string;
  tone: 'positive' | 'negative';
  icon: string;
}

export interface BodyPriority {
  problem: string;
  problemDetail: string;
  action: string;
  actionIcon: string;
}

export interface BodyAction {
  label: string;
  icon: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface BodyTimePattern {
  type: 'peak_performance' | 'recovery_needed' | 'streak';
  description: string;
}

export interface BodyPrediction {
  metric: string;
  delta: number;
  direction: 'up' | 'down';
  days: number;
}

export interface BodyDiagnosis {
  status: BodyStatus;
  headline: string;
  rootCause: string;
  drivers: BodyDriver[];
  predictions: BodyPrediction[];
  predictionNarrative: string;
  priority: BodyPriority;
  actions: BodyAction[];
  snapshotStory: string;
  snapshotDiagnosis: string;
  analysisInsights: Record<string, string>;
  depthNarrative: string;
  patterns: BodyTimePattern[];
  topCorrelations: BodyCorrelation[];
}

export interface BodyData {
  snapshot: BodyScoreData;
  radar: BodyRadarAxis[];
  workoutSeries30d: BodySeriesPoint[];
  sleepSeries30d: BodySeriesPoint[];
  heatmap90d: Array<{ date: string; level: number }>;
  nutrition: NutritionSummary[];
  workoutLog: WorkoutDay[];
  sleepLog: SleepEntry[];
  correlations: BodyCorrelation[];
  timeline24h: import('../components/charts/primitives/ExecutionTimeline').TimelineBlock[];
}
