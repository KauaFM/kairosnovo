// =============================================================
// ORVAX · Life OS — Mind Mock Data
// Dados realistas e determinísticos para a área Mente.
// Estrutura preparada para substituição por Supabase fetch.
// =============================================================
import type {
  MindData, RadarAxis, ScoreSeriesPoint, HeatmapCell,
  DonutSlice, CorrelationPair,
} from './mindTypes';
import type { SankeyNode, SankeyLink } from '../components/charts/primitives/Sankey';
import type { TimelineBlock } from '../components/charts/primitives/ExecutionTimeline';

// ─── Accent ─────────────────────────────────────────────────
export const MIND_ACCENT = '#06B6D4'; // cyan-500

// ─── Tela 1 · Snapshot ─────────────────────────────────────
const snapshot = {
  score: 68,
  trend7d: -8,
  sparkline7d: [74, 72, 71, 68, 65, 70, 68],
};

// ─── Tela 2 · Radar ────────────────────────────────────────
const radar: RadarAxis[] = [
  { axis: 'Foco',               current: 62, previous: 75 },
  { axis: 'Calma',              current: 48, previous: 56 },
  { axis: 'Clareza',            current: 71, previous: 68 },
  { axis: 'Estabilidade',       current: 65, previous: 70 },
  { axis: 'Energia Cognitiva',  current: 58, previous: 64 },
];

// ─── Tela 2 · Score series 30d ──────────────────────────────
function buildScoreSeries(days = 30): ScoreSeriesPoint[] {
  const out: ScoreSeriesPoint[] = [];
  const base = 72;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const wave = Math.sin((i + 3) / 4.5) * 6;
    const drift = -(days - i) * 0.15;
    const jitter = ((i * 7 + 2) % 5) * 0.8;
    const score = Math.max(30, Math.min(95, Math.round(base + wave + drift + jitter)));
    out.push({
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      score,
      avg: 0,
    });
  }
  // Compute 7-day moving average
  for (let i = 0; i < out.length; i++) {
    const window = out.slice(Math.max(0, i - 6), i + 1);
    out[i].avg = Math.round(window.reduce((s, p) => s + p.score, 0) / window.length);
  }
  return out;
}

// ─── Tela 2 · Heatmap 90d ──────────────────────────────────
function buildHeatmap(days = 90): HeatmapCell[] {
  const out: HeatmapCell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const wave = Math.sin((i + 5) / 6.5);
    const dow = d.getDay();
    const weekendPenalty = (dow === 0 || dow === 6) ? -1 : 0;
    const base = wave > 0.4 ? 3 : wave > 0 ? 2 : wave > -0.4 ? 1 : 0;
    const jitter = ((i * 7 + 3) % 11 > 8) ? 1 : 0;
    const level = Math.max(0, Math.min(4, base + weekendPenalty + jitter));
    out.push({ date: d.toISOString().slice(0, 10), level });
  }
  return out;
}

// ─── Tela 2 · Donut ─────────────────────────────────────────
const donut: DonutSlice[] = [
  { label: 'Foco profundo',  value: 32, color: MIND_ACCENT },
  { label: 'Distração',      value: 42, color: '#f43f5e' },
  { label: 'Descanso',       value: 26, color: '#71717a' },
];

// ─── Tela 2 · Padrões IA ───────────────────────────────────
const patterns: string[] = [
  'Seu foco cai drasticamente após uso de redes sociais',
  'Você tem melhor desempenho cognitivo após estudar pela manhã',
  'Seu humor e clareza mental dependem diretamente do sono',
];

// ─── Tela 3 · Sankey ───────────────────────────────────────
const sankeyNodes: SankeyNode[][] = [
  [{ id: 'time-block', label: 'Tempo livre' }],
  [
    { id: 'social',  label: 'Redes sociais' },
    { id: 'study',   label: 'Estudo' },
    { id: 'rest',    label: 'Descanso' },
    { id: 'project', label: 'Projeto' },
  ],
  [
    { id: 'lost', label: 'Foco perdido' },
    { id: 'gain', label: 'Foco ganho' },
  ],
];

const sankeyLinks: SankeyLink[] = [
  { source: 'time-block', target: 'social',  value: 4.2 },
  { source: 'time-block', target: 'study',   value: 2.5 },
  { source: 'time-block', target: 'rest',    value: 2.0 },
  { source: 'time-block', target: 'project', value: 3.5 },
  { source: 'social',  target: 'lost', value: 4.0, drain: true },
  { source: 'rest',    target: 'gain', value: 1.8 },
  { source: 'study',   target: 'gain', value: 2.5 },
  { source: 'project', target: 'gain', value: 3.5 },
  { source: 'social',  target: 'gain', value: 0.2 },
];

// ─── Tela 3 · Timeline 24h ─────────────────────────────────
const timeline24h: TimelineBlock[] = [
  { start: 6.5,  end: 7,    label: 'Despertar',   tone: 'productive', meta: '30m · meditação' },
  { start: 7,    end: 8.5,  label: 'Treino',       tone: 'productive', meta: '1h30 · força' },
  { start: 9,    end: 12,   label: 'Deep Work',    tone: 'productive', meta: '3h · projeto Atlas' },
  { start: 12,   end: 13,   label: 'Almoço',       tone: 'neutral',    meta: '1h' },
  { start: 13,   end: 14.5, label: 'Redes',        tone: 'drain',      meta: '1h30 · scroll' },
  { start: 14.5, end: 17,   label: 'Estudo',       tone: 'productive', meta: '2h30 · leitura' },
  { start: 17,   end: 19,   label: 'Família',      tone: 'productive', meta: '2h · presença' },
  { start: 19,   end: 20,   label: 'Jantar',       tone: 'neutral',    meta: '1h' },
  { start: 20,   end: 22,   label: 'Streaming',    tone: 'drain',      meta: '2h · série' },
  { start: 22,   end: 23,   label: 'Sono prep',    tone: 'productive', meta: '1h · journaling' },
];

// ─── Tela 3 · Correlações ───────────────────────────────────
function buildCorrelation(
  xLabel: string, yLabel: string, n: number, rTarget: number, seed: number
): CorrelationPair {
  const data: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const noise = ((seed * (i + 1) * 7) % 100) / 100 - 0.5;
    const x = 3 + ((i / n) * 7) + noise * 2;
    const y = rTarget > 0
      ? 40 + x * 5 + noise * 15
      : 90 - x * 4 + noise * 15;
    data.push({ x: Math.round(x * 10) / 10, y: Math.round(y) });
  }

  // Compute actual Pearson r
  const meanX = data.reduce((s, d) => s + d.x, 0) / n;
  const meanY = data.reduce((s, d) => s + d.y, 0) / n;
  let num = 0, denX = 0, denY = 0;
  data.forEach(d => {
    const dx = d.x - meanX;
    const dy = d.y - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  });
  const pearson = Math.round((num / (Math.sqrt(denX * denY) || 1)) * 100) / 100;

  return { xLabel, yLabel, data, pearson };
}

const correlations: CorrelationPair[] = [
  buildCorrelation('Horas de sono', 'Score de foco', 20, 0.78, 42),
  buildCorrelation('Tempo em redes (h)', 'Ansiedade', 20, -0.65, 73),
  buildCorrelation('Exercício (min)', 'Clareza mental', 20, 0.55, 19),
];

// ─── Export completo ────────────────────────────────────────
export const MIND_MOCK: MindData = {
  snapshot,
  radar,
  scoreSeries30d: buildScoreSeries(30),
  heatmap90d: buildHeatmap(90),
  donut,
  patterns,
  sankeyNodes,
  sankeyLinks,
  timeline24h,
  correlations,
};
