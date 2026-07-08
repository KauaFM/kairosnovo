// =============================================================
// ORVAX · YearProjection — banner reutilizado em todos os forms.
// "Em 1 ano você estará em…" — diferencial absoluto do sistema.
// O texto é computado pelo form pai (porque depende dos inputs).
// =============================================================
import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

export type ProjectionIntent = 'positive' | 'warning' | 'neutral';

interface Props {
  text: string;
  intent?: ProjectionIntent;
  hint?: string;            // ex.: "se manter 5d/sem"
  className?: string;
}

const TONES: Record<ProjectionIntent, string> = {
  positive:
    'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200',
  warning:
    'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200',
  neutral:
    'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300',
};

export function YearProjection({ text, intent = 'neutral', hint, className }: Props) {
  return (
    <div className={[
      'rounded-2xl border p-3.5 flex items-start gap-3 transition-colors',
      TONES[intent],
      className || '',
    ].join(' ')}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-white/70 dark:bg-black/20">
        <Sparkles size={13} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-mono tracking-[0.22em] uppercase opacity-70 mb-1 flex items-center gap-1">
          Em 1 ano você estará em
          <ArrowRight size={9} strokeWidth={2.4} />
        </p>
        <p className="text-[12.5px] leading-relaxed font-medium">
          {text}
        </p>
        {hint && (
          <p className="mt-1 text-[10px] font-mono tracking-wide opacity-60">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
