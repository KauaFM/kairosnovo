import type {
  DomainConfig, DomainOverviewData, ChartDataPoint, StackedDataPoint,
  MindDetailData, BodyDetailData, RelationshipsDetailData, ProductivityDetailData,
  WellbeingDetailData, GrowthDetailData, CareerDetailData, SpiritualityDetailData,
  AllDomainsData, Variation,
} from '../types/metrics.types';

// ── Deterministic pseudo-random ─────────────────────────
let _s = 42;
function rand(): number {
  _s = (_s * 16807) % 2147483647;
  return (_s - 1) / 2147483646;
}
function r(base: number, variance: number): number {
  return Math.round((base + (rand() - 0.5) * 2 * variance) * 10) / 10;
}

// ── Generators ──────────────────────────────────────────
const DAYS_7 = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const WEEKS_12 = Array.from({ length: 12 }, (_, i) => `S${i + 1}`);
const DAYS_30 = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - 29 + i);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
});
const HOURS_24 = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`);

function genDaily(base: number, variance: number, trend = 0): ChartDataPoint[] {
  return DAYS_30.map((label, i) => ({
    label,
    value: Math.max(0, r(base + (trend * i) / 30, variance)),
  }));
}

function genWeekly7(base: number, variance: number): ChartDataPoint[] {
  return DAYS_7.map((label) => ({ label, value: Math.max(0, r(base, variance)) }));
}

function genWeekly12(base: number, variance: number, trend = 0): ChartDataPoint[] {
  return WEEKS_12.map((label, i) => ({
    label,
    value: Math.max(0, r(base + (trend * i) / 12, variance)),
  }));
}

function variation(v: number, dir: 'up' | 'down' | 'neutral'): Variation {
  return { value: v, direction: dir };
}

// ── Domain Configs ──────────────────────────────────────
export const DOMAIN_CONFIGS: DomainConfig[] = [
  { key: 'mind', name: 'Mente', accentColor: '#00E676', kpiLabel: 'Horas de Deep Work', kpiUnit: 'h' },
  { key: 'body', name: 'Corpo', accentColor: '#00E676', kpiLabel: 'Score Consistência', kpiUnit: 'pts' },
  { key: 'relationships', name: 'Relacionamentos', accentColor: '#00E676', kpiLabel: 'Tempo de Qualidade', kpiUnit: 'h' },
  { key: 'productivity', name: 'Produtividade', accentColor: '#00E676', kpiLabel: 'Score Antiprocrastinação', kpiUnit: 'pts' },
  { key: 'wellbeing', name: 'Bem-Estar', accentColor: '#FFB300', kpiLabel: 'Índice Bem-Estar', kpiUnit: 'pts' },
  { key: 'growth', name: 'Crescimento', accentColor: '#00E676', kpiLabel: 'OKRs Concluídos', kpiUnit: '%' },
  { key: 'career', name: 'Carreira', accentColor: '#00E676', kpiLabel: 'Horas Alto Impacto', kpiUnit: 'h' },
  { key: 'spirituality', name: 'Sentido', accentColor: '#FFB300', kpiLabel: 'Min. Contemplativos', kpiUnit: 'min' },
];

// ── Overview Data ───────────────────────────────────────
export const OVERVIEW_DATA: DomainOverviewData[] = [
  { config: DOMAIN_CONFIGS[0], kpiValue: 14.2, kpiFormatted: '14,2h', variation: variation(12.5, 'up'), sparkData: [8, 10, 9, 12, 11, 13, 14.2] },
  { config: DOMAIN_CONFIGS[1], kpiValue: 82, kpiFormatted: '82', variation: variation(5.2, 'up'), sparkData: [70, 72, 75, 78, 79, 80, 82] },
  { config: DOMAIN_CONFIGS[2], kpiValue: 8.5, kpiFormatted: '8,5h', variation: variation(3.8, 'up'), sparkData: [6, 7, 6.5, 7.5, 8, 8.2, 8.5] },
  { config: DOMAIN_CONFIGS[3], kpiValue: 78, kpiFormatted: '78', variation: variation(8.3, 'up'), sparkData: [62, 65, 68, 70, 72, 75, 78] },
  { config: DOMAIN_CONFIGS[4], kpiValue: 71, kpiFormatted: '71', variation: variation(2.1, 'down'), sparkData: [74, 73, 72, 70, 71, 70, 71] },
  { config: DOMAIN_CONFIGS[5], kpiValue: 64, kpiFormatted: '64%', variation: variation(15.0, 'up'), sparkData: [42, 48, 52, 55, 58, 61, 64] },
  { config: DOMAIN_CONFIGS[6], kpiValue: 22.5, kpiFormatted: '22,5h', variation: variation(6.1, 'up'), sparkData: [18, 19, 20, 21, 20.5, 22, 22.5] },
  { config: DOMAIN_CONFIGS[7], kpiValue: 145, kpiFormatted: '145min', variation: variation(18.4, 'up'), sparkData: [90, 100, 110, 120, 125, 135, 145] },
];

// ── Mind Detail ─────────────────────────────────────────
export const MIND_DATA: MindDetailData = {
  deepWorkByDay: genWeekly7(2.0, 0.8),
  dispersionIndex: genWeekly12(45, 10, -15),
  retentionRate: genWeekly12(68, 8, 10),
  cognitiveLoad: genDaily(6.5, 1.5),
  coursesCompleted: 7,
  coursesStarted: 12,
  studySessions: 48,
  avgStudyDurationMin: 42,
  weeklyDeepWorkHours: 14.2,
  variation: variation(12.5, 'up'),
};

// ── Body Detail ─────────────────────────────────────────
export const BODY_DATA: BodyDetailData = {
  sleepData: DAYS_7.map((label) => ({
    label,
    deep: r(2.0, 0.4),
    rem: r(1.8, 0.3),
    light: r(3.5, 0.5),
  })) as unknown as StackedDataPoint[],
  energyLevel: genDaily(7, 1.5),
  workoutStreak: 14,
  trainingLoad: genWeekly12(65, 10, 8),
  weeklyFrequency: genWeekly12(4.2, 0.8),
  hydration: genWeekly7(2.2, 0.5),
  consistencyScore: 82,
  variation: variation(5.2, 'up'),
};

// ── Relationships Detail ────────────────────────────────
export const RELATIONSHIPS_DATA: RelationshipsDetailData = {
  qualityTimeHours: genWeekly12(8, 2.5),
  conflictIndex: genWeekly12(3.5, 1.5, -1),
  newConnections: 4,
  maintainedConnections: 12,
  satisfactionScore: genWeekly12(7.5, 1),
  weeklyQualityHours: 8.5,
  variation: variation(3.8, 'up'),
};

// ── Productivity Detail ─────────────────────────────────
export const PRODUCTIVITY_DATA: ProductivityDetailData = {
  antiProcScore: genDaily(72, 12, 8),
  taskCompletionRate: genWeekly12(78, 8, 5),
  productiveVsIdle: DAYS_7.map((label) => ({
    label,
    productive: r(6.5, 1.2),
    idle: r(2.5, 0.8),
  })) as unknown as StackedDataPoint[],
  backlogAccumulation: genWeekly12(15, 5, -3),
  taskBreakdown: [
    { category: 'Trabalho', completed: 24, pending: 6, overdue: 2 },
    { category: 'Pessoal', completed: 12, pending: 4, overdue: 1 },
    { category: 'Estudo', completed: 8, pending: 3, overdue: 0 },
    { category: 'Saúde', completed: 7, pending: 2, overdue: 0 },
    { category: 'Projetos', completed: 5, pending: 5, overdue: 3 },
  ],
  pomodoroCompleted: 32,
  pomodoroPlanned: 40,
  score: 78,
  variation: variation(8.3, 'up'),
};

// ── Wellbeing Detail ────────────────────────────────────
export const WELLBEING_DATA: WellbeingDetailData = {
  moodDaily: genDaily(7, 1.5),
  stressByHour: HOURS_24.map((label) => ({
    label,
    value: r(label >= '08h' && label <= '18h' ? 5.5 : 3, 1.5),
  })),
  recoveryIndex: 68,
  dayClassification: { good: 18, neutral: 8, difficult: 4 },
  leisureHours: genWeekly12(6, 2),
  wellbeingScore: 71,
  variation: variation(2.1, 'down'),
};

// ── Growth Detail ───────────────────────────────────────
export const GROWTH_DATA: GrowthDetailData = {
  habitStreaks: [
    { name: 'Leitura', streak: 21, consistency: 92 },
    { name: 'Exercício', streak: 14, consistency: 85 },
    { name: 'Meditação', streak: 30, consistency: 96 },
    { name: 'Journaling', streak: 8, consistency: 72 },
    { name: 'Estudo', streak: 5, consistency: 65 },
  ],
  okrCompletion: [
    { name: 'Dominar React/TS', progress: 78, target: 100 },
    { name: 'Ler 24 livros', progress: 16, target: 24 },
    { name: 'Certificação AWS', progress: 45, target: 100 },
    { name: 'Portfolio 5 projetos', progress: 3, target: 5 },
  ],
  skillRadar: [
    { skill: 'Frontend', current: 85, previous: 72 },
    { skill: 'Backend', current: 68, previous: 60 },
    { skill: 'Liderança', current: 55, previous: 48 },
    { skill: 'Comunicação', current: 72, previous: 65 },
    { skill: 'Estratégia', current: 60, previous: 52 },
    { skill: 'Foco', current: 78, previous: 68 },
  ],
  perfectDays: 12,
  totalDays: 30,
  growthRate: 14.2,
  variation: variation(15.0, 'up'),
};

// ── Career Detail ───────────────────────────────────────
export const CAREER_DATA: CareerDetailData = {
  highImpactHours: genWeekly12(22, 4, 3),
  lowImpactHours: genWeekly12(12, 3, -2),
  milestones: [
    { name: 'Promoção a Tech Lead', date: '2026-01-15', completed: true },
    { name: 'Lançamento do Produto v2', date: '2026-03-01', completed: true },
    { name: 'Talk em Conferência', date: '2026-06-20', completed: false },
    { name: 'Mentoria 5 devs', date: '2026-09-01', completed: false },
  ],
  timeDistribution: [
    { project: 'Produto Principal', hours: 12, color: '#00E676' },
    { project: 'Mentoria', hours: 4, color: '#00BCD4' },
    { project: 'Estratégia', hours: 3, color: '#FFB300' },
    { project: 'Operacional', hours: 2, color: '#737373' },
    { project: 'Admin', hours: 1.5, color: '#E53935' },
  ],
  alignmentScore: genWeekly12(7.5, 1, 0.8),
  weeklyHighImpactHours: 22.5,
  variation: variation(6.1, 'up'),
};

// ── Spirituality Detail ─────────────────────────────────
export const SPIRITUALITY_DATA: SpiritualityDetailData = {
  meditationMinutes: genWeekly12(18, 5, 3),
  valueAlignment: genWeekly12(3.8, 0.6, 0.3),
  clarityDays: 22,
  totalDays: 30,
  gratitudeEntries: genWeekly12(5, 1.5),
  innerPeace: genDaily(7, 1.2, 0.8),
  practiceDistribution: [
    { type: 'Meditação', minutes: 65, color: '#00E676' },
    { type: 'Reflexão', minutes: 35, color: '#00BCD4' },
    { type: 'Journaling', minutes: 25, color: '#FFB300' },
    { type: 'Oração', minutes: 20, color: '#9C27B0' },
  ],
  weeklyMinutes: 145,
  variation: variation(18.4, 'up'),
};

// ── Aggregate ───────────────────────────────────────────
export const ALL_DOMAINS_DATA: AllDomainsData = {
  mind: MIND_DATA,
  body: BODY_DATA,
  relationships: RELATIONSHIPS_DATA,
  productivity: PRODUCTIVITY_DATA,
  wellbeing: WELLBEING_DATA,
  growth: GROWTH_DATA,
  career: CAREER_DATA,
  spirituality: SPIRITUALITY_DATA,
};
