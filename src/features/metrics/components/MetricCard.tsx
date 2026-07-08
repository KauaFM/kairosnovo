import { ArrowUpRight, Brain, Activity, Users, Zap, Smile, TrendingUp, Rocket, Compass } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DomainKey, Variation } from '../types/metrics.types';
import { KPIBadge } from './KPIBadge';
import { SparkLine } from './SparkLine';
import { BORDER_LEFT_CLASS } from '../utils/calculations';

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

interface MetricCardProps {
  domainKey: DomainKey;
  domainName: string;
  accentColor: string;
  kpiLabel: string;
  kpiFormatted: string;
  variation: Variation;
  sparkData: number[];
  onClick: () => void;
}

export function MetricCard({
  domainKey,
  domainName,
  accentColor,
  kpiLabel,
  kpiFormatted,
  variation,
  sparkData,
  onClick,
}: MetricCardProps) {
  const Icon = DOMAIN_ICONS[domainKey];
  const borderClass = BORDER_LEFT_CLASS[accentColor] ?? 'border-l-[#00E676]';

  return (
    <button
      onClick={onClick}
      className={`group relative w-full rounded-xl border border-neutral-200 dark:border-white/[0.055] bg-white dark:bg-[#161616] p-3.5 text-left shadow-sm dark:shadow-none border-l-[3px] ${borderClass} transition-all duration-150 hover:bg-neutral-50 dark:hover:bg-[#1C1C1C] hover:border-[#00E676] dark:hover:border-[#00E676] active:scale-[0.98]`}
    >
      {/* Arrow indicator */}
      <ArrowUpRight
        size={14}
        className="absolute right-3 top-3 text-neutral-400 dark:text-white/[0.24] opacity-0 group-hover:opacity-100 transition-opacity"
      />

      {/* Domain label */}
      <div className="mb-2 flex items-center gap-1.5">
        <Icon size={14} className="text-neutral-500 dark:text-white/50" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/50">
          {domainName}
        </span>
      </div>

      {/* KPI value */}
      <p className="text-2xl font-extrabold text-neutral-900 dark:text-white/90 leading-none">
        {kpiFormatted}
      </p>
      <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-white/[0.24]">
        {kpiLabel}
      </p>

      {/* Variation badge */}
      <div className="mt-2">
        <KPIBadge variation={variation} />
      </div>

      {/* Sparkline */}
      <div className="mt-2">
        <SparkLine data={sparkData} color={accentColor} height={28} />
      </div>
    </button>
  );
}
