import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';
import {
  BarChart3, Brain, Activity, Users, Zap, Smile,
  TrendingUp, Rocket, Compass, ArrowUpRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DomainKey, Period } from '../types/metrics.types';
import { OVERVIEW_DATA, MIND_DATA, PRODUCTIVITY_DATA } from '../data/mockData';
import { PeriodSelector } from '../components/PeriodSelector';
import { KPIBadge } from '../components/KPIBadge';
import { SparkLine } from '../components/SparkLine';
import { RingProgress } from '../components/RingProgress';

const DOMAIN_ICONS: Record<DomainKey, LucideIcon> = {
  mind: Brain,
  body: Activity,
  relationships: Users,
  productivity: Zap,
  wellbeing: Smile,
  growth: TrendingUp,
  career: Rocket,
  spirituality: Compass,
};

const FEATURED_KEYS: DomainKey[] = ['mind', 'productivity'];

const FEATURED_CHART_DATA: Record<string, { label: string; value: number }[]> = {
  mind: MIND_DATA.deepWorkByDay,
  productivity: PRODUCTIVITY_DATA.antiProcScore.slice(-7),
};

const SUMMARY_KPIS = [
  { label: 'Deep Work', value: '14,2h', accent: '#00E676' },
  { label: 'Score', value: '78', accent: '#00E676' },
  { label: 'Bem-Estar', value: '71', accent: '#FFB300' },
  { label: 'OKRs', value: '64%', accent: '#00E676' },
];

const GLOBAL_SPARK = [60, 63, 65, 68, 70, 71, 72];

interface MetricsOverviewProps {
  period: Period;
  onPeriodChange: (p: Period) => void;
  onDomainClick: (key: DomainKey) => void;
  isDark: boolean;
}

export function MetricsOverview({ period, onPeriodChange, onDomainClick, isDark }: MetricsOverviewProps) {
  const featured = OVERVIEW_DATA.filter((d) => FEATURED_KEYS.includes(d.config.key));
  const grid = OVERVIEW_DATA.filter((d) => !FEATURED_KEYS.includes(d.config.key));

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* ── Header ───────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-[#00E676]" />
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white/90">Dashboard</h1>
        </div>
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>

      {/* ── Hero: Global Score ────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/[0.06] bg-gradient-to-br from-white via-white to-neutral-50/80 dark:from-[#1a1a1a] dark:via-[#161616] dark:to-[#111] p-4">
        {/* Glow accent */}
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#00E676]/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-4 bottom-0 h-14 w-14 rounded-full bg-[#00E676]/5 blur-xl" />

        <div className="relative flex items-center gap-4">
          <RingProgress value={72} size={72} label="72" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-neutral-900 dark:text-white/90">Score Global</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-white/30">
              Performance geral
            </p>
            <div className="mt-1">
              <KPIBadge variation={{ value: 8.2, direction: 'up' }} />
            </div>
          </div>
          <div className="w-24 shrink-0">
            <SparkLine data={GLOBAL_SPARK} color="#00E676" height={40} />
          </div>
        </div>
      </div>

      {/* ── Quick Stats Strip ────────────── */}
      <div className="grid grid-cols-4 gap-1.5">
        {SUMMARY_KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-white/[0.055] bg-white dark:bg-[#161616] px-2 py-2.5 text-center"
          >
            {/* Top accent bar */}
            <div
              className="absolute inset-x-0 top-0 h-[2px]"
              style={{ backgroundColor: kpi.accent, opacity: 0.6 }}
            />
            <p className="text-sm font-extrabold text-neutral-900 dark:text-white/90">{kpi.value}</p>
            <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-neutral-400 dark:text-white/30">
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Featured Domain Cards ────────── */}
      {featured.map((d) => {
        const Icon = DOMAIN_ICONS[d.config.key];
        const chartData = FEATURED_CHART_DATA[d.config.key] ?? [];
        const gradId = `feat-${d.config.key}`;

        return (
          <button
            key={d.config.key}
            onClick={() => onDomainClick(d.config.key)}
            className="group relative w-full overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/[0.06] bg-white dark:bg-[#161616] p-4 text-left transition-all duration-200 hover:border-[#00E676]/50 dark:hover:border-[#00E676]/30 hover:shadow-md dark:hover:shadow-[#00E676]/5 active:scale-[0.99]"
          >
            <ArrowUpRight
              size={14}
              className="absolute right-3 top-3 text-neutral-300 dark:text-white/15 opacity-0 group-hover:opacity-100 transition-opacity"
            />

            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00E676]/10">
                <Icon size={16} className="text-[#00E676]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/40">
                  {d.config.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold text-neutral-900 dark:text-white/90 leading-none">
                    {d.kpiFormatted}
                  </span>
                  <KPIBadge variation={d.variation} />
                </div>
              </div>
              <span className="shrink-0 text-[9px] text-neutral-400 dark:text-white/20">
                {d.config.kpiLabel}
              </span>
            </div>

            {/* Embedded area chart */}
            <div className="h-16 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00E676" stopOpacity={isDark ? 0.25 : 0.15} />
                      <stop offset="100%" stopColor="#00E676" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#00E676"
                    fill={`url(#${gradId})`}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </button>
        );
      })}

      {/* ── Domain Grid (2 cols) ─────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        {grid.map((d) => {
          const Icon = DOMAIN_ICONS[d.config.key];
          const isWarning = d.config.accentColor === '#FFB300';
          return (
            <button
              key={d.config.key}
              onClick={() => onDomainClick(d.config.key)}
              className="group relative overflow-hidden rounded-xl border border-neutral-200 dark:border-white/[0.055] bg-white dark:bg-[#161616] p-3 text-left transition-all duration-200 hover:border-[#00E676]/40 dark:hover:border-[#00E676]/25 hover:shadow-md dark:hover:shadow-[#00E676]/5 active:scale-[0.98]"
            >
              {/* Left accent bar */}
              <div
                className="absolute left-0 inset-y-0 w-[3px]"
                style={{ backgroundColor: d.config.accentColor }}
              />

              <ArrowUpRight
                size={12}
                className="absolute right-2.5 top-2.5 text-neutral-300 dark:text-white/15 opacity-0 group-hover:opacity-100 transition-opacity"
              />

              <div className="mb-1.5 flex items-center gap-1.5 pl-1">
                <Icon
                  size={13}
                  className={isWarning ? 'text-[#FFB300]' : 'text-neutral-500 dark:text-white/50'}
                />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/40">
                  {d.config.name}
                </span>
              </div>

              <p className="pl-1 text-xl font-extrabold text-neutral-900 dark:text-white/90 leading-none">
                {d.kpiFormatted}
              </p>
              <p className="pl-1 mt-0.5 text-[9px] text-neutral-400 dark:text-white/[0.22]">
                {d.config.kpiLabel}
              </p>

              <div className="mt-2 flex items-center justify-between pl-1">
                <KPIBadge variation={d.variation} />
                <div className="w-16">
                  <SparkLine data={d.sparkData} color={d.config.accentColor} height={22} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
