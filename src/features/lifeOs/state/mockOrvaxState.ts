// =============================================================
// ORVAX · Life OS — mockOrvaxState
// ÚNICA FONTE DA VERDADE para todo o app. Overview, Deep Dives,
// gauges, heatmaps e listas de transações leem DAQUI — garantindo
// que "R$ 10.450,20" na tela de métricas bata com "R$ 10.450,20"
// no Deep Dive de Finanças.
//
// Design: mock determinístico. Zero dependência de Supabase.
// Quando a API real voltar dados, basta preferir `snapshot ?? mockOrvaxState.finance.snapshot`.
//
// Cor oficial de destaque do sistema: #00D9C0 (Cobalt-Esmeralda).
// =============================================================
import type {
  PillarKey,
  FinanceSnapshot,
  Transaction,
  FinancialGoal,
  SeriesPoint,
} from '../types';

// -----------------------------------------------------------------
// helpers mock
// -----------------------------------------------------------------
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

// gera série temporal de N dias com ruído determinístico
function mockSeries(days: number, base: number, amp: number, seed = 1): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const wave = Math.sin((i + seed) / 3.3) * amp;
    const drift = (days - i) * (amp / days);
    out.push({ d: daysAgo(i), v: Math.max(0, Math.round(base + wave + drift)) });
  }
  return out;
}

// heatmap 365 dias (nível 0..4)
function mockHeatmap(days: number, seed = 1): Array<{ d: string; c: number; net: number }> {
  const out: Array<{ d: string; c: number; net: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const dow = new Date(daysAgo(i) + 'T12:00:00').getDay();
    const wave = Math.sin((i + seed) / 4.5);
    const base = wave > 0.35 ? 3 : wave > 0 ? 2 : wave > -0.4 ? 1 : 0;
    const weekendPenalty = (dow === 0 || dow === 6) ? -1 : 0;
    const jitter = ((i * 7 + seed) % 11 > 8) ? 1 : 0;
    const c = Math.max(0, Math.min(4, base + weekendPenalty + jitter));
    out.push({ d: daysAgo(i), c, net: c * 120 });
  }
  return out;
}

// contagem de dias ativos + streak atual a partir do heatmap
function streakOf(heat: Array<{ c: number }>) {
  let s = 0;
  for (let i = heat.length - 1; i >= 0; i--) {
    if (heat[i].c > 0) s++; else break;
  }
  return s;
}

// -----------------------------------------------------------------
// série multi-ano (36 meses · 2024-01 → 2026-12) — usada em todos
// os pilares pra gráfico de "Progresso Multianual"
// -----------------------------------------------------------------
export interface MultiYearPoint { key: string; label: string; year: number; month: number; v: number; }
function mockMultiYear(start: number, baseGrowth: number, wobbleAmp = 50): MultiYearPoint[] {
  const out: MultiYearPoint[] = [];
  const years = [2024, 2025, 2026];
  years.forEach((y, yi) => {
    for (let m = 0; m < 12; m++) {
      const i = yi * 12 + m;
      const growth  = baseGrowth * i;
      const wobble  = Math.round(Math.sin(i / 1.9) * wobbleAmp);
      const v = Math.max(0, start + growth + wobble);
      const mm = String(m + 1).padStart(2, '0');
      out.push({ key: `${y}-${mm}`, label: `${y}`, year: y, month: m, v });
    }
  });
  return out;
}

// =================================================================
// FINANCE · fonte da verdade para FinanceDeepDive + Overview
// =================================================================
const financeIncome  = mockSeries(30, 180, 60, 2);
const financeExpense = mockSeries(30, 140, 50, 5);
const financeByDay: SeriesPoint[] = financeIncome.map((p, i) => ({
  d: p.d,
  v: p.v - (financeExpense[i]?.v ?? 0),
}));
const financeHeat = mockHeatmap(365, 3);
const totalIncome  = financeIncome.reduce((s, p) => s + p.v, 0) * 10;   // R$
const totalExpense = financeExpense.reduce((s, p) => s + p.v, 0) * 10;
const BALANCE      = 10_450.20;   // R$ 10.450,20 — número oficial
const savingsRate  = Math.max(0, (totalIncome - totalExpense) / Math.max(1, totalIncome));

const financeSnapshot: FinanceSnapshot = {
  totalIncome,
  totalExpense,
  balance:       BALANCE,
  savingsRate,
  avgDaily:      Math.round((totalIncome - totalExpense) / 30),
  topCategories: [
    { category: 'Moradia',     total: 2_400, count: 2 },
    { category: 'Alimentação', total: 1_150, count: 12 },
    { category: 'Transporte',  total:   620, count: 8 },
    { category: 'Saúde',       total:   420, count: 3 },
    { category: 'Lazer',       total:   380, count: 5 },
    { category: 'Educação',    total:   260, count: 2 },
  ],
  byDay:         financeByDay,
  incomeSeries:  financeIncome,
  expenseSeries: financeExpense,
  heatmap:       financeHeat,
  streakDays:    streakOf(financeHeat),
  bestWeekday:   { weekday: 4, label: 'QUI', total: 980 },
  txCount:       42,
  periodDays:    30,
  deltaPct:      0.08,  // +8% vs período anterior
};

const financeTransactions: Transaction[] = [
  { id: 't1', user_id: 'mock', amount:  1200, type: 'income',  category: 'Salário',     description: 'Freelance · Projeto Atlas',  date: daysAgo(2) },
  { id: 't2', user_id: 'mock', amount:   420, type: 'expense', category: 'Alimentação', description: 'Compras da semana',           date: daysAgo(3) },
  { id: 't3', user_id: 'mock', amount:   180, type: 'expense', category: 'Transporte',  description: 'Combustível',                 date: daysAgo(5) },
  { id: 't4', user_id: 'mock', amount:   650, type: 'income',  category: 'Dividendos',  description: 'Carteira ações · mensal',     date: daysAgo(7) },
  { id: 't5', user_id: 'mock', amount:    89, type: 'expense', category: 'Assinaturas', description: 'Streaming · música',          date: daysAgo(9) },
  { id: 't6', user_id: 'mock', amount:  2400, type: 'expense', category: 'Moradia',     description: 'Aluguel',                     date: daysAgo(11) },
  { id: 't7', user_id: 'mock', amount:   320, type: 'income',  category: 'Reembolso',   description: 'Ajuste plano saúde',          date: daysAgo(14) },
  { id: 't8', user_id: 'mock', amount:   140, type: 'expense', category: 'Lazer',       description: 'Cinema + jantar',             date: daysAgo(17) },
];

const financeGoals: FinancialGoal[] = [
  { id: 'g1', user_id: 'mock', title: 'Reserva de emergência', target_amount: 30_000, current_amount: 18_400, deadline: '2026-12-31' },
  { id: 'g2', user_id: 'mock', title: 'Trocar setup home office', target_amount: 8_000, current_amount: 5_200, deadline: '2026-09-30' },
];

// =================================================================
// PILAR · registro comum para todos os 10 pilares
// =================================================================
export interface PillarState {
  /** número principal formatado (Big Number) */
  display:      string;
  /** rótulo curto abaixo do número */
  unit:         string;
  /** Δ % comparado ao período anterior */
  delta:        number;
  /** série curta (14 pontos) — sparkline do overview */
  sparkline:    number[];
  /** 7 últimos pontos para o radar (sum) + 7 anteriores */
  radarWeek:    { current: number; previous: number };
  /** 365 dias de execução, nível 0..4 */
  heat365:      Array<{ d: string; c: number }>;
  /** Progresso Multianual — 36 meses */
  multiYear:    MultiYearPoint[];
  /** streak atual em dias */
  streak:       number;
  /** consistência % (0..100) */
  consistency:  number;
}

// -----------------------------------------------------------------
// builder determinístico por pilar
// -----------------------------------------------------------------
function buildPillar(opts: {
  display: string; unit: string; delta: number;
  sparkline: number[]; multiYearStart: number; multiYearGrowth: number;
  seed: number;
}): PillarState {
  const heat = mockHeatmap(365, opts.seed);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const activeDays = heat.filter(d => d.c > 0).length;
  return {
    display:   opts.display,
    unit:      opts.unit,
    delta:     opts.delta,
    sparkline: opts.sparkline,
    radarWeek: {
      current:  sum(opts.sparkline.slice(-7)),
      previous: sum(opts.sparkline.slice(0, 7)),
    },
    heat365:   heat.map(h => ({ d: h.d, c: h.c })),
    multiYear: mockMultiYear(opts.multiYearStart, opts.multiYearGrowth),
    streak:    streakOf(heat),
    consistency: Math.round((activeDays / 365) * 100),
  };
}

// =================================================================
// STATE GLOBAL
// =================================================================
export interface OrvaxState {
  user: {
    name:         string;
    xpTotal:      number;
    xpWeekDelta:  number;
    level:        number;
    notifications:number;
  };
  global: {
    scoreGlobal:  number;
    scoreDelta:   number;
    streak:       number;       // dias consecutivos ativos
    consistency:  number;       // % últimos 7 dias
    activeDays7:  number;       // dos últimos 7, quantos ativos
  };
  multiYear: MultiYearPoint[];
  heat365:   Array<{ d: string; c: number }>;
  finance: {
    display:       string;     // "R$ 10.450,20"
    unit:          string;
    delta:         number;
    snapshot:      FinanceSnapshot;
    transactions:  Transaction[];
    goals:         FinancialGoal[];
    sparkline:     number[];
    multiYear:     MultiYearPoint[];
    heat365:       Array<{ d: string; c: number }>;
    streak:        number;
    consistency:   number;
    radarWeek:     { current: number; previous: number };
  };
  pillars: Record<Exclude<PillarKey, 'finance'>, PillarState>;
}

// ----- agregado global consolidado -----
const globalHeat = mockHeatmap(365, 1);
const globalMulti = mockMultiYear(1200, 28, 80);

// -----------------------------------------------------------------
// export final · fonte da verdade
// -----------------------------------------------------------------
export const mockOrvaxState: OrvaxState = {
  user: {
    name:          'Felipe',
    xpTotal:       2_450,
    xpWeekDelta:   120,
    level:         14,
    notifications: 3,
  },
  global: {
    scoreGlobal: 2_450,
    scoreDelta:  120,
    streak:      streakOf(globalHeat),
    consistency: 78,
    activeDays7: 5,
  },
  multiYear: globalMulti,
  heat365:   globalHeat.map(h => ({ d: h.d, c: h.c })),

  finance: {
    display:      'R$ 10.450,20',
    unit:         'saldo · 30d',
    delta:        +8,
    snapshot:     financeSnapshot,
    transactions: financeTransactions,
    goals:        financeGoals,
    sparkline:    [10,12,11,14,13,15,16,15,17,19,18,20,22,24],
    multiYear:    mockMultiYear(4_200, 180, 240),
    heat365:      financeHeat.map(h => ({ d: h.d, c: h.c })),
    streak:       financeSnapshot.streakDays,
    consistency:  82,
    radarWeek:    { current: 140, previous: 118 },
  },

  pillars: {
    health:        buildPillar({ display: '14d Treino',     unit: 'treinos · 30d',      delta: +12, sparkline: [ 4, 5, 5, 6, 5, 7, 7, 8, 7, 9, 8,10, 9,11], multiYearStart: 320, multiYearGrowth: 6,  seed: 11 }),
    mind:          buildPillar({ display: '25h Estudo',     unit: 'leitura · estudos',  delta:  +7, sparkline: [ 6, 7, 5, 8, 7, 9, 8,10, 9,11,10,12,11,13], multiYearStart: 280, multiYearGrowth: 7,  seed: 13 }),
    career:        buildPillar({ display: '87%',            unit: 'metas entregues',    delta:  -2, sparkline: [18,19,17,20,18,19,17,18,17,16,17,15,16,15], multiYearStart: 460, multiYearGrowth: 5,  seed: 17 }),
    relationships: buildPillar({ display: '38',             unit: 'interações',         delta:  +5, sparkline: [ 5, 7, 6, 8, 6, 9, 7,10, 8, 9, 7,10, 8,11], multiYearStart: 200, multiYearGrowth: 4,  seed: 19 }),
    productivity:  buildPillar({ display: '14.2h Deep',     unit: 'deep work · 7d',     delta: +18, sparkline: [12,14,13,16,15,18,17,20,19,22,24,26,28,30], multiYearStart: 380, multiYearGrowth: 12, seed: 23 }),
    wellbeing:     buildPillar({ display: '6.4',            unit: 'score humor',        delta:   0, sparkline: [ 7, 8, 7, 8, 7, 8, 7, 8, 7, 8, 8, 7, 8, 8], multiYearStart: 220, multiYearGrowth: 3,  seed: 29 }),
    environment:   buildPillar({ display: '12',             unit: 'rotinas · casa',     delta:  +4, sparkline: [ 3, 4, 4, 5, 4, 6, 5, 6, 6, 7, 7, 8, 7, 9], multiYearStart: 140, multiYearGrowth: 3,  seed: 31 }),
    leisure:       buildPillar({ display: '9',              unit: 'momentos livres',    delta:  -6, sparkline: [14,13,15,12,13,11,12,10,11, 9,10, 8, 9, 7], multiYearStart: 240, multiYearGrowth: 2,  seed: 37 }),
    meaning:       buildPillar({ display: '18',             unit: 'reflexões',          delta:  +9, sparkline: [ 6, 8, 7, 9, 8,10, 9,11,10,12,11,13,12,14], multiYearStart: 160, multiYearGrowth: 4,  seed: 41 }),
  },
};

// -----------------------------------------------------------------
// helper universal · lê um pilar por key (incluindo finance)
// -----------------------------------------------------------------
export function getPillarState(key: PillarKey): PillarState {
  if (key === 'finance') {
    const f = mockOrvaxState.finance;
    return {
      display:     f.display,
      unit:        f.unit,
      delta:       f.delta,
      sparkline:   f.sparkline,
      radarWeek:   f.radarWeek,
      heat365:     f.heat365,
      multiYear:   f.multiYear,
      streak:      f.streak,
      consistency: f.consistency,
    };
  }
  return mockOrvaxState.pillars[key];
}

// cor oficial de destaque do sistema
export const ORVAX_ACCENT = '#10B981';
