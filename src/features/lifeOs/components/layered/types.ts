// =============================================================
// ORVAX · PillarLayered — Tipos canônicos
//
// Contrato genérico que TODO pilar (Mente, Saúde, Financeiro, etc)
// precisa entregar pra ser consumido pelo PillarLayered.
//
// Adicionar pilar = 1 arquivo de config + 1 entrada no registry.
// =============================================================
import type { TimelineBlock } from '../charts/primitives/ExecutionTimeline';
import type { SankeyNode, SankeyLink } from '../charts/primitives/Sankey';

// ─── Status comum a todos os pilares ─────────────────────────
export type PillarStatus =
  | 'critical' | 'declining' | 'stable' | 'improving' | 'excellent';

// ─── Identidade · Config estática ────────────────────────────
export interface PillarLayeredConfig {
  /** chave do pilar · matches PillarKey */
  key:        string;
  /** "Mente", "Saúde", "Financeiro" — usado em headers */
  label:      string;
  /** lowercase · "mente", "saúde" — usado em subtitles */
  shortLabel: string;
  /** lucide-react icon name · ex: "Brain", "Heart", "Wallet" */
  icon:       string;
  /** subtítulo do mini radar · ex: "foco · calma · clareza · estabilidade · energia cognitiva" */
  internalAxesSubtitle: string;
  /** subtítulo do execution map · ex: "treino · sono · alimentação · descanso" */
  timelineSubtitle:     string;
  /** regex de métricas onde subir é bom (usado pra colorir Previsão) */
  positiveDirectionMatcher: RegExp;
  /** Áreas que esse pilar impacta · texto puro · sem chart */
  impacts:    PillarImpact[];
  /** Frase final do bloco de impactos · "Subir esse pilar puxa..." */
  impactsNarrative?: string;
}

export interface PillarImpact {
  label:    string;
  sub:      string;
  strength: 'forte' | 'média' | 'fraca';
}

// ─── Dados normalizados · Shape comum ────────────────────────
export interface PillarLayeredData {
  snapshot:    { score: number; trend7d: number; sparkline7d: number[] };
  radar:       PillarRadarAxis[];
  series30d:   PillarSeriesPoint[];
  heatmap90d:  Array<{ date: string; level: number }>;
  timeline24h: TimelineBlock[];
  correlations: PillarCorrelation[];
  /** opcional · só Mente tem hoje */
  sankey?: { nodes: SankeyNode[][]; links: SankeyLink[] };
}

export interface PillarRadarAxis {
  axis:     string;
  current:  number;
  previous: number;
}

export interface PillarSeriesPoint {
  date:  string;
  value: number;
  avg:   number;
}

export interface PillarCorrelation {
  xLabel:  string;
  yLabel:  string;
  data:    Array<{ x: number; y: number }>;
  pearson: number;
}

// ─── Diagnose · Output do engine ─────────────────────────────
export interface PillarLayeredDiagnosis {
  status:    PillarStatus;
  headline:  string;
  rootCause: string;

  // Storytelling tela 1
  snapshotStory:     string;
  snapshotDiagnosis: string;

  // Tela 1 · problema + ações
  priority: {
    problem:       string;
    problemDetail: string;
    action:        string;
    actionIcon:    string;
  };
  actions: Array<{ label: string; icon: string; urgency: 'high'|'medium'|'low' }>;

  // Tela 2 · previsão + storytelling profundo
  predictions: Array<{
    metric:    string;
    delta:     number;
    direction: 'up' | 'down';
    days:      number;
  }>;
  predictionNarrative: string;
  depthNarrative:      string;

  // Top 2 correlações por |pearson|
  topCorrelations: PillarCorrelation[];
}

// ─── Bundle · o que registry retorna por pilar ───────────────
export interface PillarLayeredBundle {
  config:    PillarLayeredConfig;
  data:      PillarLayeredData;
  diagnosis: PillarLayeredDiagnosis;
}
