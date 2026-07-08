// =============================================================
// ORVAX · Life OS — Mind Intelligence System · Types
// Tipagem completa para dados, engine e UI.
// Preparado para integração com Supabase (trocar mock por fetch).
// =============================================================

// ─── Tela 1 · Snapshot ──────────────────────────────────────

export interface MindScoreData {
  score: number;             // 0-100
  trend7d: number;           // variação % (ex: -8)
  sparkline7d: number[];     // 7 valores diários
}

// ─── Tela 2 · Análise ───────────────────────────────────────

export interface RadarAxis {
  axis: string;
  current: number;           // 0-100
  previous: number;          // 0-100 (7d atrás)
}

export interface ScoreSeriesPoint {
  date: string;              // DD/MM
  score: number;
  avg: number;               // média móvel 7d
}

export interface HeatmapCell {
  date: string;              // YYYY-MM-DD
  level: number;             // 0-4 (0=vazio, 4=excelente)
}

export interface DonutSlice {
  label: string;
  value: number;             // horas ou %
  color: string;
}

// ─── Tela 3 · Profundidade ──────────────────────────────────

export interface CorrelationPair {
  xLabel: string;
  yLabel: string;
  data: Array<{ x: number; y: number }>;
  pearson: number;           // -1 a 1
}

export interface PredictionItem {
  metric: string;
  delta: number;             // ex: -12 (%)
  direction: 'up' | 'down';
  days: number;              // horizonte
}

// ─── Engine · Diagnóstico ───────────────────────────────────

export type MindStatus = 'critical' | 'declining' | 'stable' | 'improving' | 'excellent';

export interface Driver {
  factor: string;            // "Uso de redes sociais"
  impact: number;            // -24 (% de impacto)
  metric: string;            // "foco"
  tone: 'positive' | 'negative';
  icon: string;              // lucide icon name
}

export interface PriorityAction {
  problem: string;           // "Distração"
  problemDetail: string;     // "65% do tempo livre é distração"
  action: string;            // "Reduzir redes sociais por 1h"
  actionIcon: string;        // lucide icon name
}

export interface Action {
  label: string;
  icon: string;              // lucide icon name
  urgency: 'high' | 'medium' | 'low';
}

export interface TimePattern {
  startHour: number;
  endHour: number;
  type: 'peak_focus' | 'focus_loss' | 'neutral';
  description: string;       // "Pico de foco"
}

export interface MindDiagnosis {
  // O que está acontecendo
  status: MindStatus;
  headline: string;

  // Por que está acontecendo
  rootCause: string;
  drivers: Driver[];

  // O que vai acontecer
  predictions: PredictionItem[];
  predictionNarrative: string;

  // O que fazer agora
  priority: PriorityAction;
  actions: Action[];

  // Storytelling por tela
  snapshotStory: string;
  snapshotDiagnosis: string;
  analysisInsights: Record<string, string>;  // chave = bloco (radar, progress, heatmap, donut, patterns)
  depthNarrative: string;

  // Padrões detectados
  timePatterns: TimePattern[];
  topCorrelations: CorrelationPair[];        // top 2 por |pearson|
}

// ─── Dados completos do módulo Mente ────────────────────────

export interface MindData {
  // Tela 1
  snapshot: MindScoreData;

  // Tela 2
  radar: RadarAxis[];
  scoreSeries30d: ScoreSeriesPoint[];
  heatmap90d: HeatmapCell[];
  donut: DonutSlice[];
  patterns: string[];

  // Tela 3
  sankeyNodes: import('../components/charts/primitives/Sankey').SankeyNode[][];
  sankeyLinks: import('../components/charts/primitives/Sankey').SankeyLink[];
  timeline24h: import('../components/charts/primitives/ExecutionTimeline').TimelineBlock[];
  correlations: CorrelationPair[];
}
