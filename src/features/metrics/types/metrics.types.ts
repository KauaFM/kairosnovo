import type { LucideIcon } from 'lucide-react';

// ── Period ──────────────────────────────────────────────
export type Period = 'week' | 'month' | '3m' | '6m' | 'year';

export const PERIOD_LABELS: Record<Period, string> = {
  week: 'SEM',
  month: 'MÊS',
  '3m': '3M',
  '6m': '6M',
  year: 'ANO',
};

// ── Domains ─────────────────────────────────────────────
export type DomainKey =
  | 'mind'
  | 'body'
  | 'relationships'
  | 'productivity'
  | 'wellbeing'
  | 'growth'
  | 'career'
  | 'spirituality';

export interface DomainConfig {
  key: DomainKey;
  name: string;
  accentColor: string;
  kpiLabel: string;
  kpiUnit: string;
}

// ── Variation ───────────────────────────────────────────
export interface Variation {
  value: number;
  direction: 'up' | 'down' | 'neutral';
}

// ── Chart Data ──────────────────────────────────────────
export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface StackedDataPoint {
  label: string;
  [key: string]: string | number;
}

// ── Overview ────────────────────────────────────────────
export interface DomainOverviewData {
  config: DomainConfig;
  kpiValue: number;
  kpiFormatted: string;
  variation: Variation;
  sparkData: number[];
}

// ── Goals ────────────────────────────────────────────────
export type GoalFrequency = 'daily' | 'weekly' | 'monthly';
export type GoalPriority = 'high' | 'medium' | 'low';

export interface Goal {
  id: string;
  name: string;
  targetValue: number;
  targetUnit: string;
  currentValue: number;
  deadline: string;
  frequency: GoalFrequency;
  priority: GoalPriority;
  actionPlan: string;
  domainKey: DomainKey;
  createdAt: string;
}

export interface GoalFormData {
  name: string;
  targetValue: number;
  targetUnit: string;
  deadline: string;
  frequency: GoalFrequency;
  priority: GoalPriority;
  actionPlan: string;
  domainKey: DomainKey;
}

// ── Domain Detail Data ──────────────────────────────────

export interface MindDetailData {
  deepWorkByDay: ChartDataPoint[];
  dispersionIndex: ChartDataPoint[];
  retentionRate: ChartDataPoint[];
  cognitiveLoad: ChartDataPoint[];
  coursesCompleted: number;
  coursesStarted: number;
  studySessions: number;
  avgStudyDurationMin: number;
  weeklyDeepWorkHours: number;
  variation: Variation;
}

export interface BodyDetailData {
  sleepData: StackedDataPoint[];
  energyLevel: ChartDataPoint[];
  workoutStreak: number;
  trainingLoad: ChartDataPoint[];
  weeklyFrequency: ChartDataPoint[];
  hydration: ChartDataPoint[];
  consistencyScore: number;
  variation: Variation;
}

export interface RelationshipsDetailData {
  qualityTimeHours: ChartDataPoint[];
  conflictIndex: ChartDataPoint[];
  newConnections: number;
  maintainedConnections: number;
  satisfactionScore: ChartDataPoint[];
  weeklyQualityHours: number;
  variation: Variation;
}

export interface ProductivityDetailData {
  antiProcScore: ChartDataPoint[];
  taskCompletionRate: ChartDataPoint[];
  productiveVsIdle: StackedDataPoint[];
  backlogAccumulation: ChartDataPoint[];
  taskBreakdown: { category: string; completed: number; pending: number; overdue: number }[];
  pomodoroCompleted: number;
  pomodoroPlanned: number;
  score: number;
  variation: Variation;
}

export interface WellbeingDetailData {
  moodDaily: ChartDataPoint[];
  stressByHour: ChartDataPoint[];
  recoveryIndex: number;
  dayClassification: { good: number; neutral: number; difficult: number };
  leisureHours: ChartDataPoint[];
  wellbeingScore: number;
  variation: Variation;
}

export interface GrowthDetailData {
  habitStreaks: { name: string; streak: number; consistency: number }[];
  okrCompletion: { name: string; progress: number; target: number }[];
  skillRadar: { skill: string; current: number; previous: number }[];
  perfectDays: number;
  totalDays: number;
  growthRate: number;
  variation: Variation;
}

export interface CareerDetailData {
  highImpactHours: ChartDataPoint[];
  lowImpactHours: ChartDataPoint[];
  milestones: { name: string; date: string; completed: boolean }[];
  timeDistribution: { project: string; hours: number; color: string }[];
  alignmentScore: ChartDataPoint[];
  weeklyHighImpactHours: number;
  variation: Variation;
}

export interface SpiritualityDetailData {
  meditationMinutes: ChartDataPoint[];
  valueAlignment: ChartDataPoint[];
  clarityDays: number;
  totalDays: number;
  gratitudeEntries: ChartDataPoint[];
  innerPeace: ChartDataPoint[];
  practiceDistribution: { type: string; minutes: number; color: string }[];
  weeklyMinutes: number;
  variation: Variation;
}

// ── Aggregate ───────────────────────────────────────────
export interface AllDomainsData {
  mind: MindDetailData;
  body: BodyDetailData;
  relationships: RelationshipsDetailData;
  productivity: ProductivityDetailData;
  wellbeing: WellbeingDetailData;
  growth: GrowthDetailData;
  career: CareerDetailData;
  spirituality: SpiritualityDetailData;
}

// ── Detail page shared props ────────────────────────────
export interface DetailPageProps {
  isDark: boolean;
  onBack: () => void;
  onCreateGoal: (domainKey: DomainKey) => void;
}
