// =============================================================
// ORVAX · Life OS — StatRow
// Linha densa: label / valor / hint opcional.
// =============================================================
import React from 'react';

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
};

export function StatRow({ label, value, hint, accent }: Props) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-b-0 border-zinc-200/50 dark:border-white/5">
      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span className="text-[12px] font-mono font-semibold" style={{ color: accent }}>
        {value} {hint && <span className="opacity-60 font-normal ml-1">{hint}</span>}
      </span>
    </div>
  );
}
