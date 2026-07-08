// =============================================================
// ORVAX · Life OS — SectionHeader
// =============================================================
import React from 'react';

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function SectionHeader({ title, subtitle, right }: Props) {
  return (
    <div className="flex items-end justify-between mb-2.5 px-1">
      <div>
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-200">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[9px] font-mono tracking-widest text-zinc-500 dark:text-zinc-500 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}
