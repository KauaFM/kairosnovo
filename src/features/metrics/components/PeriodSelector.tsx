import type { Period } from '../types/metrics.types';
import { PERIOD_LABELS } from '../types/metrics.types';

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
}

const PERIODS: Period[] = ['week', 'month', '3m', '6m', 'year'];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-neutral-100 dark:bg-white/[0.04] p-0.5">
      {PERIODS.map((p) => {
        const active = value === p;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 ${
              active
                ? 'bg-[#00E676] text-neutral-900 shadow-sm'
                : 'text-neutral-500 dark:text-white/40 hover:text-neutral-700 dark:hover:text-white/60'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}
