// =============================================================
// ORVAX · Life OS — Finance Intelligence System · Types
// =============================================================

export interface FinanceScoreData {
  score: number;
  trend7d: number;
  sparkline7d: number[];
}

export interface FinanceRadarAxis {
  axis: string;
  current: number;
  previous: number;
}

export interface FinanceSeriesPoint {
  date: string;
  income: number;
  expense: number;
}

export interface FinanceCategoryItem {
  label: string;
  value: number;
  pct: number;
  color: string;
}

export interface FinanceCorrelation {
  xLabel: string;
  yLabel: string;
  data: Array<{ x: number; y: number }>;
  pearson: number;
}

export type FinanceStatus = 'critical' | 'declining' | 'stable' | 'improving' | 'excellent';

export interface FinanceDriver {
  factor: string;
  impact: number;
  metric: string;
  tone: 'positive' | 'negative';
  icon: string;
}

export interface FinancePriority {
  problem: string;
  problemDetail: string;
  action: string;
  actionIcon: string;
}

export interface FinanceAction {
  label: string;
  icon: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface FinancePrediction {
  metric: string;
  delta: number;
  direction: 'up' | 'down';
  days: number;
}

export interface FinancePattern {
  type: 'spending_spike' | 'savings_streak' | 'category_alert';
  description: string;
}

export interface FinanceDiagnosis {
  status: FinanceStatus;
  headline: string;
  rootCause: string;
  drivers: FinanceDriver[];
  predictions: FinancePrediction[];
  predictionNarrative: string;
  priority: FinancePriority;
  actions: FinanceAction[];
  snapshotStory: string;
  snapshotDiagnosis: string;
  analysisInsights: Record<string, string>;
  depthNarrative: string;
  patterns: FinancePattern[];
  topCorrelations: FinanceCorrelation[];
}

export interface FinanceIntelData {
  snapshot: FinanceScoreData;
  radar: FinanceRadarAxis[];
  incomeSeries30d: FinanceSeriesPoint[];
  heatmap90d: Array<{ date: string; level: number }>;
  categories: FinanceCategoryItem[];
  balance: number;
  totalIncome: number;
  totalExpense: number;
  savingsRate: number;
  correlations: FinanceCorrelation[];
  aiPatterns: string[];
  timeline24h: import('../components/charts/primitives/ExecutionTimeline').TimelineBlock[];
}
