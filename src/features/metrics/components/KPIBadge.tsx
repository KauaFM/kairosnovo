import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { Variation } from '../types/metrics.types';
import { fmtVariation } from '../utils/formatters';

interface KPIBadgeProps {
  variation: Variation;
  size?: 'sm' | 'md';
}

export function KPIBadge({ variation, size = 'sm' }: KPIBadgeProps) {
  const iconSize = size === 'sm' ? 12 : 14;
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  if (variation.direction === 'neutral') {
    return (
      <span className={`inline-flex items-center gap-0.5 ${textSize} font-semibold text-neutral-500 dark:text-white/50`}>
        <Minus size={iconSize} />
        <span>0%</span>
      </span>
    );
  }

  const isUp = variation.direction === 'up';

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${textSize} font-semibold ${
        isUp ? 'text-[#00E676]' : 'text-[#E53935]'
      }`}
    >
      {isUp ? <ArrowUp size={iconSize} /> : <ArrowDown size={iconSize} />}
      <span>{fmtVariation(variation.value)}</span>
    </span>
  );
}
