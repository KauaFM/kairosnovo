// =============================================================
// ORVAX · Life OS — Finance Mock Data
// Dados mock para sistema de inteligência financeira.
// =============================================================
import type { FinanceIntelData, FinanceRadarAxis, FinanceSeriesPoint, FinanceCategoryItem, FinanceCorrelation } from './financeTypes';
import type { TimelineBlock } from '../components/charts/primitives/ExecutionTimeline';

export const FINANCE_ACCENT = '#EAB308'; // amber/gold

const snapshot = { score: 72, trend7d: +3, sparkline7d: [68, 69, 70, 71, 72, 73, 72] };

const radar: FinanceRadarAxis[] = [
  { axis: 'Poupança',      current: 65, previous: 58 },
  { axis: 'Controle',      current: 58, previous: 62 },
  { axis: 'Consistência',  current: 78, previous: 74 },
  { axis: 'Investimento',  current: 45, previous: 42 },
  { axis: 'Redução dívida',current: 72, previous: 70 },
];

function buildIncomeSeries(days = 30): FinanceSeriesPoint[] {
  const out: FinanceSeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const inc = Math.round(180 + Math.sin((i + 2) / 3.3) * 60 + ((i * 7 + 2) % 5) * 20);
    const exp = Math.round(140 + Math.sin((i + 5) / 3.3) * 50 + ((i * 3 + 1) % 5) * 15);
    out.push({ date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, income: inc, expense: exp });
  }
  return out;
}

function buildHeatmap(days = 90) {
  const out: { date: string; level: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const wave = Math.sin((i + 3) / 5);
    const level = Math.max(0, Math.min(4, wave > 0.3 ? 3 : wave > -0.2 ? 2 : 1 + ((i * 7 + 3) % 5 > 3 ? 1 : 0)));
    out.push({ date: d.toISOString().slice(0, 10), level });
  }
  return out;
}

const totalExpense = 4970;
const categories: FinanceCategoryItem[] = [
  { label: 'Moradia',      value: 2400, pct: Math.round(2400 / totalExpense * 100), color: '#ef4444' },
  { label: 'Alimentação',  value: 1150, pct: Math.round(1150 / totalExpense * 100), color: '#f97316' },
  { label: 'Transporte',   value: 620,  pct: Math.round(620 / totalExpense * 100),  color: '#3b82f6' },
  { label: 'Saúde',        value: 420,  pct: Math.round(420 / totalExpense * 100),  color: FINANCE_ACCENT },
  { label: 'Lazer',        value: 380,  pct: Math.round(380 / totalExpense * 100),  color: '#8b5cf6' },
];

const aiPatterns: string[] = [
  'Gastos com alimentação aumentaram 18% esta semana',
  'Sua taxa de poupança subiu de 15% para 22% no último mês',
  'Gasto em lazer dobrou nos finais de semana',
];

function buildCorrelation(xL: string, yL: string, n: number, rT: number, seed: number): FinanceCorrelation {
  const data: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const noise = ((seed * (i + 1) * 7) % 100) / 100 - 0.5;
    const x = 2 + ((i / n) * 6) + noise * 1.5;
    const y = rT > 0 ? 20 + x * 10 + noise * 15 : 80 - x * 6 + noise * 15;
    data.push({ x: Math.round(x * 10) / 10, y: Math.round(y) });
  }
  const mx = data.reduce((s, d) => s + d.x, 0) / n;
  const my = data.reduce((s, d) => s + d.y, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  data.forEach(d => { const dx = d.x - mx; const dy = d.y - my; num += dx * dy; dx2 += dx * dx; dy2 += dy * dy; });
  const pearson = Math.round((num / (Math.sqrt(dx2 * dy2) || 1)) * 100) / 100;
  return { xLabel: xL, yLabel: yL, data, pearson };
}

const correlations: FinanceCorrelation[] = [
  buildCorrelation('Dias sem gastar', 'Taxa de poupança', 20, 0.82, 41),
  buildCorrelation('Gastos com lazer', 'Ansiedade', 20, -0.58, 67),
  buildCorrelation('Receita variável', 'Score financeiro', 20, 0.45, 83),
];

const timeline24h: TimelineBlock[] = [
  { start: 7,   end: 8,   label: 'Café',       tone: 'neutral',    meta: '1h · R$ 12' },
  { start: 8,   end: 12,  label: 'Trabalho',   tone: 'productive', meta: '4h · renda ativa' },
  { start: 12,  end: 13,  label: 'Almoço',     tone: 'drain',      meta: '1h · R$ 35' },
  { start: 13,  end: 17,  label: 'Trabalho',   tone: 'productive', meta: '4h · renda ativa' },
  { start: 17,  end: 18,  label: 'Lanche',     tone: 'drain',      meta: '1h · R$ 18' },
  { start: 18,  end: 19,  label: 'Compras',    tone: 'drain',      meta: '1h · R$ 85 alimentação' },
  { start: 19,  end: 20,  label: 'Jantar casa',tone: 'productive', meta: '1h · economia' },
  { start: 20,  end: 22,  label: 'Streaming',  tone: 'drain',      meta: '2h · assinatura R$ 30/mês' },
];

export const FINANCE_MOCK: FinanceIntelData = {
  snapshot,
  radar,
  incomeSeries30d: buildIncomeSeries(30),
  heatmap90d: buildHeatmap(90),
  categories,
  balance: 10450.20,
  totalIncome: 8200,
  totalExpense: totalExpense,
  savingsRate: 0.22,
  correlations,
  aiPatterns,
  timeline24h,
};
