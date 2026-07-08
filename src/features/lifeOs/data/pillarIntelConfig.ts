// =============================================================
// ORVAX · Life OS — Pillar Intelligence Config
// Config-driven data for each remaining pillar.
// =============================================================
import type { PillarIntelData, PillarRadarAxis, PillarSeriesPoint, PillarDistItem, PillarCorrelation } from './pillarIntelTypes';
import type { TimelineBlock } from '../components/charts/primitives/ExecutionTimeline';
import type { PillarKey } from '../types';

export interface PillarIntelConfig {
  key: PillarKey;
  label: string;
  accent: string;
  icon: string;           // lucide icon name
  statusLabels: Record<string, string>;
  radarAxes: string[];
  mainSeriesLabel: string;
  secondarySeriesLabel: string;
  distLabel: string;
  headerSub: string;
  footerQuote: string;
}

// ─── Helpers ────────────────────────────────────────────────
function buildSeries(days: number, base: number, amp: number, seed: number): PillarSeriesPoint[] {
  const out: PillarSeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const wave = Math.sin((i + seed) / 3.5) * amp;
    const jitter = ((i * seed + 3) % 7) * (amp / 10);
    const value = Math.max(0, Math.round(base + wave + jitter));
    out.push({ date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, value, avg: 0 });
  }
  for (let i = 0; i < out.length; i++) {
    const w = out.slice(Math.max(0, i - 6), i + 1);
    out[i].avg = Math.round(w.reduce((s, p) => s + p.value, 0) / w.length);
  }
  return out;
}

function buildHeatmap(days: number, seed: number) {
  const out: { date: string; level: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const isRest = d.getDay() === 0;
    const wave = Math.sin((i + seed) / 5.5);
    const base = wave > 0.3 ? 3 : wave > -0.2 ? 2 : 1;
    const level = isRest ? Math.max(0, base - 2) : Math.min(4, base + ((i * seed + 5) % 7 > 4 ? 1 : 0));
    out.push({ date: d.toISOString().slice(0, 10), level });
  }
  return out;
}

function buildCorr(xL: string, yL: string, n: number, rT: number, seed: number): PillarCorrelation {
  const data: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const noise = ((seed * (i + 1) * 7) % 100) / 100 - 0.5;
    const x = 3 + ((i / n) * 6) + noise * 1.5;
    const y = rT > 0 ? 25 + x * 9 + noise * 12 : 80 - x * 5 + noise * 12;
    data.push({ x: Math.round(x * 10) / 10, y: Math.round(y) });
  }
  const mx = data.reduce((s, d) => s + d.x, 0) / n;
  const my = data.reduce((s, d) => s + d.y, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  data.forEach(d => { const dx = d.x - mx; const dy = d.y - my; num += dx * dy; dx2 += dx * dx; dy2 += dy * dy; });
  const pearson = Math.round((num / (Math.sqrt(dx2 * dy2) || 1)) * 100) / 100;
  return { xLabel: xL, yLabel: yL, data, pearson };
}

function buildRadar(axes: string[], seed: number): PillarRadarAxis[] {
  return axes.map((axis, i) => {
    const base = 50 + ((seed * (i + 1) * 13) % 40);
    const prev = base + ((seed * (i + 2) * 7) % 20) - 10;
    return { axis, current: Math.min(95, base), previous: Math.min(95, prev) };
  });
}

// ─── CONFIGS ────────────────────────────────────────────────
export const PILLAR_INTEL_CONFIGS: Record<string, PillarIntelConfig> = {
  career: {
    key: 'career', label: 'Carreira', accent: '#3B82F6', icon: 'Briefcase',
    statusLabels: { critical: 'CRÍTICO', declining: 'EM QUEDA', stable: 'ESTÁVEL', improving: 'EVOLUINDO', excellent: 'EXCELENTE' },
    radarAxes: ['Entregas', 'Networking', 'Habilidades', 'Visibilidade', 'Planejamento'],
    mainSeriesLabel: 'Entregas', secondarySeriesLabel: 'Meta projetada',
    distLabel: 'Áreas de foco', headerSub: 'projetos · entregas · crescimento',
    footerQuote: '· carreira é construção diária ·',
  },
  relationships: {
    key: 'relationships', label: 'Relacionamentos', accent: '#F43F5E', icon: 'Heart',
    statusLabels: { critical: 'ISOLADO', declining: 'DISTANTE', stable: 'ESTÁVEL', improving: 'CONECTANDO', excellent: 'FORTE' },
    radarAxes: ['Família', 'Amigos', 'Parceria', 'Novas conexões', 'Qualidade'],
    mainSeriesLabel: 'Interações', secondarySeriesLabel: 'Tempo de qualidade',
    distLabel: 'Tipos de conexão', headerSub: 'família · amigos · parceria · conexões',
    footerQuote: '· relações são o maior ativo ·',
  },
  productivity: {
    key: 'productivity', label: 'Produtividade', accent: '#F97316', icon: 'Zap',
    statusLabels: { critical: 'PARADO', declining: 'PERDENDO FOCO', stable: 'ESTÁVEL', improving: 'ACELERANDO', excellent: 'MÁXIMA' },
    radarAxes: ['Deep Work', 'Tarefas', 'Foco', 'Energia', 'Organização'],
    mainSeriesLabel: 'Horas produtivas', secondarySeriesLabel: 'Distração',
    distLabel: 'Blocos de tempo', headerSub: 'deep work · tarefas · execução',
    footerQuote: '· produtividade é energia direcionada ·',
  },
  wellbeing: {
    key: 'wellbeing', label: 'Bem-estar', accent: '#14B8A6', icon: 'Smile',
    statusLabels: { critical: 'CRÍTICO', declining: 'INSTÁVEL', stable: 'ESTÁVEL', improving: 'MELHORANDO', excellent: 'PLENO' },
    radarAxes: ['Humor', 'Ansiedade', 'Meditação', 'Pausas', 'Sono emocional'],
    mainSeriesLabel: 'Score emocional', secondarySeriesLabel: 'Nível de estresse',
    distLabel: 'Fontes de bem-estar', headerSub: 'meditação · pausas · humor · ansiedade',
    footerQuote: '· equilíbrio interno é a base ·',
  },
  environment: {
    key: 'environment', label: 'Ambiente', accent: '#84CC16', icon: 'Home',
    statusLabels: { critical: 'CAÓTICO', declining: 'DESORGANIZADO', stable: 'ESTÁVEL', improving: 'ORGANIZANDO', excellent: 'OTIMIZADO' },
    radarAxes: ['Organização', 'Limpeza', 'Setup', 'Ergonomia', 'Rotina'],
    mainSeriesLabel: 'Rotinas executadas', secondarySeriesLabel: 'Acúmulo pendente',
    distLabel: 'Áreas do ambiente', headerSub: 'casa · setup · organização · rotina',
    footerQuote: '· ambiente reflete a mente ·',
  },
  leisure: {
    key: 'leisure', label: 'Lazer', accent: '#0EA5E9', icon: 'Gamepad2',
    statusLabels: { critical: 'ESGOTADO', declining: 'SEM PAUSA', stable: 'ESTÁVEL', improving: 'EQUILIBRANDO', excellent: 'SAUDÁVEL' },
    radarAxes: ['Hobbies', 'Esportes', 'Social', 'Criatividade', 'Descanso'],
    mainSeriesLabel: 'Momentos de lazer', secondarySeriesLabel: 'Trabalho invadindo',
    distLabel: 'Tipos de lazer', headerSub: 'hobbies · esportes · criatividade · descanso',
    footerQuote: '· descanso é produtividade ·',
  },
  meaning: {
    key: 'meaning', label: 'Sentido', accent: '#D97706', icon: 'Compass',
    statusLabels: { critical: 'DESCONECTADO', declining: 'DISPERSO', stable: 'ESTÁVEL', improving: 'APROFUNDANDO', excellent: 'ALINHADO' },
    radarAxes: ['Propósito', 'Reflexão', 'Gratidão', 'Impacto', 'Presença'],
    mainSeriesLabel: 'Reflexões', secondarySeriesLabel: 'Dispersão',
    distLabel: 'Dimensões de sentido', headerSub: 'propósito · reflexão · presença · impacto',
    footerQuote: '· viver com intenção ·',
  },
};

// ─── DATA BUILDERS ──────────────────────────────────────────

interface PillarDataSeed {
  score: number; trend: number; spark: number[];
  seriesBase: number; seriesAmp: number; seriesSeed: number;
  secondaryBase: number; secondaryAmp: number; secondarySeed: number;
  heatSeed: number;
  dist: PillarDistItem[];
  corrPairs: Array<[string, string, number, number]>;
  patterns: string[];
  timeline: TimelineBlock[];
}

const SEEDS: Record<string, PillarDataSeed> = {
  career: {
    score: 74, trend: -2, spark: [78, 77, 76, 75, 74, 73, 74],
    seriesBase: 4, seriesAmp: 2, seriesSeed: 17, secondaryBase: 5, secondaryAmp: 1.5, secondarySeed: 19, heatSeed: 17,
    dist: [
      { label: 'Projetos', value: 45, color: '#3B82F6' },
      { label: 'Networking', value: 25, color: '#60a5fa' },
      { label: 'Estudos', value: 20, color: '#93c5fd' },
      { label: 'Mentoria', value: 10, color: '#bfdbfe' },
    ],
    corrPairs: [['Entregas semanais', 'Visibilidade', 0.68, 41], ['Deep work (h)', 'Qualidade entregas', 0.74, 53]],
    patterns: ['Suas entregas caíram 15% nas últimas 2 semanas', 'Networking está abaixo da média — 0 eventos no mês', 'Maior produtividade às terças e quintas'],
    timeline: [
      { start: 8, end: 10, label: 'Deep work', tone: 'productive', meta: '2h · foco total' },
      { start: 10, end: 12, label: 'Reuniões', tone: 'neutral', meta: '2h · alinhamento' },
      { start: 13, end: 15, label: 'Execução', tone: 'productive', meta: '2h · entregas' },
      { start: 15, end: 17, label: 'Slack/Email', tone: 'drain', meta: '2h · reativo' },
      { start: 17, end: 18, label: 'Planejamento', tone: 'productive', meta: '1h · próximo dia' },
    ],
  },
  relationships: {
    score: 62, trend: +5, spark: [55, 57, 58, 59, 60, 61, 62],
    seriesBase: 3, seriesAmp: 2, seriesSeed: 19, secondaryBase: 2, secondaryAmp: 1.5, secondarySeed: 23, heatSeed: 19,
    dist: [
      { label: 'Família', value: 40, color: '#F43F5E' },
      { label: 'Amigos', value: 30, color: '#fb7185' },
      { label: 'Parceria', value: 20, color: '#fda4af' },
      { label: 'Novos', value: 10, color: '#fecdd3' },
    ],
    corrPairs: [['Tempo com família', 'Score emocional', 0.72, 61], ['Isolamento (dias)', 'Ansiedade', -0.65, 73]],
    patterns: ['Tempo com família aumentou 30% esta semana', 'Você não encontrou amigos há 12 dias', 'Padrão: mais conexões nos fins de semana'],
    timeline: [
      { start: 7, end: 8, label: 'Café c/ parceira', tone: 'productive', meta: '1h · qualidade' },
      { start: 12, end: 13, label: 'Almoço c/ colega', tone: 'productive', meta: '1h · networking' },
      { start: 18, end: 19, label: 'Ligação família', tone: 'productive', meta: '1h · conexão' },
      { start: 19, end: 21, label: 'Sozinho', tone: 'drain', meta: '2h · isolamento' },
      { start: 21, end: 22, label: 'Jantar c/ parceira', tone: 'productive', meta: '1h · presença' },
    ],
  },
  productivity: {
    score: 81, trend: +18, spark: [62, 65, 68, 72, 75, 78, 81],
    seriesBase: 5, seriesAmp: 2, seriesSeed: 23, secondaryBase: 3, secondaryAmp: 2, secondarySeed: 29, heatSeed: 23,
    dist: [
      { label: 'Deep Work', value: 45, color: '#F97316' },
      { label: 'Tarefas', value: 30, color: '#fb923c' },
      { label: 'Planejamento', value: 15, color: '#fdba74' },
      { label: 'Admin', value: 10, color: '#fed7aa' },
    ],
    corrPairs: [['Horas de sono', 'Produtividade', 0.78, 37], ['Tempo em redes', 'Foco', -0.71, 49]],
    patterns: ['Deep work aumentou 40% nos últimos 14 dias', '5 dias consecutivos acima de 6h produtivas', 'Maior foco entre 8h-12h — proteja esse bloco'],
    timeline: [
      { start: 6, end: 8, label: 'Deep work', tone: 'productive', meta: '2h · código' },
      { start: 8, end: 10, label: 'Tarefas', tone: 'productive', meta: '2h · entregas' },
      { start: 10, end: 10.5, label: 'Redes sociais', tone: 'drain', meta: '30m · distração' },
      { start: 10.5, end: 12, label: 'Deep work', tone: 'productive', meta: '1h30 · escrita' },
      { start: 13, end: 15, label: 'Reuniões', tone: 'neutral', meta: '2h · alinhamento' },
      { start: 15, end: 17, label: 'Execução', tone: 'productive', meta: '2h · finalização' },
      { start: 17, end: 18, label: 'Slack/notif.', tone: 'drain', meta: '1h · reativo' },
    ],
  },
  wellbeing: {
    score: 58, trend: 0, spark: [59, 58, 57, 58, 59, 58, 58],
    seriesBase: 6, seriesAmp: 1.5, seriesSeed: 29, secondaryBase: 4, secondaryAmp: 2, secondarySeed: 31, heatSeed: 29,
    dist: [
      { label: 'Meditação', value: 30, color: '#14B8A6' },
      { label: 'Pausas', value: 25, color: '#2dd4bf' },
      { label: 'Exercício leve', value: 25, color: '#5eead4' },
      { label: 'Journaling', value: 20, color: '#99f6e4' },
    ],
    corrPairs: [['Minutos meditação', 'Nível ansiedade', -0.68, 53], ['Pausas no dia', 'Energia', 0.62, 67]],
    patterns: ['Ansiedade estável há 2 semanas — sem picos', 'Meditação feita apenas 3 de 7 dias', 'Pausas durante trabalho abaixo de 2 por dia'],
    timeline: [
      { start: 6, end: 6.5, label: 'Meditação', tone: 'productive', meta: '30m · mindfulness' },
      { start: 8, end: 12, label: 'Trabalho', tone: 'neutral', meta: '4h · sem pausa' },
      { start: 12, end: 12.5, label: 'Pausa', tone: 'productive', meta: '30m · respiração' },
      { start: 12.5, end: 17, label: 'Trabalho', tone: 'neutral', meta: '4h30 · sem pausa' },
      { start: 17, end: 18, label: 'Caminhada', tone: 'productive', meta: '1h · descompressão' },
      { start: 20, end: 22, label: 'Scroll/TV', tone: 'drain', meta: '2h · passivo' },
    ],
  },
  environment: {
    score: 66, trend: +4, spark: [60, 62, 63, 64, 65, 66, 66],
    seriesBase: 3, seriesAmp: 1.5, seriesSeed: 31, secondaryBase: 2, secondaryAmp: 1, secondarySeed: 37, heatSeed: 31,
    dist: [
      { label: 'Organização', value: 35, color: '#84CC16' },
      { label: 'Limpeza', value: 30, color: '#a3e635' },
      { label: 'Setup', value: 20, color: '#bef264' },
      { label: 'Manutenção', value: 15, color: '#d9f99d' },
    ],
    corrPairs: [['Organização mesa', 'Foco', 0.58, 71], ['Tarefas acumuladas', 'Estresse', -0.52, 83]],
    patterns: ['Setup de trabalho otimizado há 5 dias', 'Acúmulo de limpeza no fim de semana', '3 tarefas de manutenção pendentes'],
    timeline: [
      { start: 6.5, end: 7, label: 'Arrumar cama', tone: 'productive', meta: '30m · rotina' },
      { start: 7, end: 7.5, label: 'Organizar mesa', tone: 'productive', meta: '30m · setup' },
      { start: 12, end: 12.5, label: 'Louça', tone: 'productive', meta: '30m · manutenção' },
      { start: 18, end: 19, label: 'Limpeza rápida', tone: 'productive', meta: '1h · semanal' },
      { start: 20, end: 22, label: 'Sofá', tone: 'drain', meta: '2h · acúmulo visual' },
    ],
  },
  leisure: {
    score: 45, trend: -6, spark: [55, 52, 50, 48, 47, 46, 45],
    seriesBase: 2, seriesAmp: 1.5, seriesSeed: 37, secondaryBase: 4, secondaryAmp: 2, secondarySeed: 41, heatSeed: 37,
    dist: [
      { label: 'Games', value: 35, color: '#0EA5E9' },
      { label: 'Leitura', value: 25, color: '#38bdf8' },
      { label: 'Esportes', value: 25, color: '#7dd3fc' },
      { label: 'Social', value: 15, color: '#bae6fd' },
    ],
    corrPairs: [['Horas de lazer', 'Burnout', -0.74, 43], ['Variedade lazer', 'Satisfação geral', 0.61, 57]],
    patterns: ['Lazer caiu 35% nas últimas 3 semanas', 'Trabalho invadiu 4 fins de semana seguidos', 'Nenhum esporte praticado em 10 dias'],
    timeline: [
      { start: 6, end: 18, label: 'Trabalho contínuo', tone: 'drain', meta: '12h · sem lazer' },
      { start: 18, end: 19, label: 'Jantar rápido', tone: 'neutral', meta: '1h' },
      { start: 19, end: 20, label: 'Game', tone: 'productive', meta: '1h · descompressão' },
      { start: 20, end: 22, label: 'Netflix', tone: 'neutral', meta: '2h · passivo' },
    ],
  },
  meaning: {
    score: 70, trend: +9, spark: [58, 61, 63, 65, 67, 69, 70],
    seriesBase: 2, seriesAmp: 1, seriesSeed: 41, secondaryBase: 3, secondaryAmp: 1.5, secondarySeed: 43, heatSeed: 41,
    dist: [
      { label: 'Reflexão', value: 35, color: '#D97706' },
      { label: 'Gratidão', value: 25, color: '#f59e0b' },
      { label: 'Propósito', value: 25, color: '#fbbf24' },
      { label: 'Impacto', value: 15, color: '#fcd34d' },
    ],
    corrPairs: [['Reflexões semanais', 'Clareza mental', 0.76, 89], ['Journaling (min)', 'Ansiedade', -0.59, 97]],
    patterns: ['Journaling feito 5 de 7 dias — consistência alta', 'Reflexões mais profundas nas manhãs (6h-7h)', 'Gratidão registrada aumentou 40% este mês'],
    timeline: [
      { start: 6, end: 6.5, label: 'Journaling', tone: 'productive', meta: '30m · reflexão matinal' },
      { start: 6.5, end: 7, label: 'Gratidão', tone: 'productive', meta: '30m · 3 itens' },
      { start: 12, end: 12.5, label: 'Pausa contemplativa', tone: 'productive', meta: '30m · presença' },
      { start: 21, end: 21.5, label: 'Review do dia', tone: 'productive', meta: '30m · aprendizados' },
      { start: 21.5, end: 22, label: 'Leitura filosófica', tone: 'productive', meta: '30m · profundidade' },
    ],
  },
};

// ─── DATA GENERATOR ─────────────────────────────────────────
export function buildPillarIntelData(pillarKey: string): PillarIntelData {
  const seed = SEEDS[pillarKey];
  if (!seed) throw new Error(`No seed for pillar: ${pillarKey}`);
  return {
    snapshot: { score: seed.score, trend7d: seed.trend, sparkline7d: seed.spark },
    radar: buildRadar(PILLAR_INTEL_CONFIGS[pillarKey].radarAxes, seed.seriesSeed),
    mainSeries30d: buildSeries(30, seed.seriesBase, seed.seriesAmp, seed.seriesSeed),
    secondarySeries30d: buildSeries(30, seed.secondaryBase, seed.secondaryAmp, seed.secondarySeed),
    heatmap90d: buildHeatmap(90, seed.heatSeed),
    distribution: seed.dist,
    correlations: seed.corrPairs.map(([x, y, r, s]) => buildCorr(x, y, 20, r, s)),
    aiPatterns: seed.patterns,
    timeline24h: seed.timeline,
  };
}
