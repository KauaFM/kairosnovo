// =============================================================
// ORVAX · AIInsight — banner de insight automático.
// Storytelling + correlação + ação.
// Layout · ícone IA · narrativa principal · linha de causa · CTA.
// =============================================================
import React from 'react';
import { Brain, ArrowRight, AlertTriangle, Sparkles } from 'lucide-react';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

export type InsightTone = 'positive' | 'neutral' | 'warning';

interface Props {
  /** narrativa principal · interpretação do dado em linguagem humana */
  story: string;
  /** correlação detectada · ex: "sono < 6h → foco -32%" */
  correlation?: string;
  /** ação concreta sugerida · ex: "Durma 1h mais cedo hoje" */
  action: string;
  /** ação click (opcional) · se omitido, é só visual */
  onAction?: () => void;
  tone?: InsightTone;
  /** label do CTA · default "Aplicar agora" */
  actionLabel?: string;
}

const TONES: Record<InsightTone, { wrap: string; chip: string; ico: React.ReactNode }> = {
  positive: {
    wrap: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50',
    chip: 'bg-emerald-500 text-white',
    ico:  <Sparkles size={14} strokeWidth={2.4} />,
  },
  neutral: {
    wrap: 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800',
    chip: 'bg-zinc-700 dark:bg-zinc-200 text-white dark:text-zinc-900',
    ico:  <Brain size={14} strokeWidth={2.4} />,
  },
  warning: {
    wrap: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50',
    chip: 'bg-amber-500 text-white',
    ico:  <AlertTriangle size={14} strokeWidth={2.4} />,
  },
};

export function AIInsight({
  story, correlation, action, onAction, tone = 'neutral', actionLabel = 'Aplicar agora',
}: Props) {
  const t = TONES[tone];

  return (
    <div className={[
      'rounded-2xl border p-4',
      t.wrap,
    ].join(' ')}>
      {/* Header chip "IA · INSIGHT" */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className={[
          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
          t.chip,
        ].join(' ')}>
          {t.ico}
        </div>
        <p className={`text-[9px] font-mono tracking-[0.24em] uppercase ${T_LABEL}`}>
          IA · Insight do dia
        </p>
      </div>

      {/* Story principal · narrativa */}
      <p className={`text-[14px] leading-relaxed font-semibold ${T_STRONG}`}>
        {story}
      </p>

      {/* Correlação detectada · linha mono */}
      {correlation && (
        <div className="mt-2.5 flex items-center gap-2 pt-2.5 border-t border-current/10">
          <span className={`text-[9px] font-mono tracking-widest uppercase ${T_MUTED}`}>
            padrão
          </span>
          <span className={`text-[11px] font-mono tabular-nums ${T_LABEL}`}>
            {correlation}
          </span>
        </div>
      )}

      {/* CTA de ação */}
      <button
        type="button"
        onClick={onAction}
        className={[
          'mt-3 group w-full flex items-center justify-between gap-2',
          'h-11 px-4 rounded-xl text-left',
          'bg-white dark:bg-zinc-900',
          'border border-zinc-200 dark:border-zinc-800',
          'hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
          'transition-all duration-200',
          'active:scale-[0.99]',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className={`text-[9px] font-mono tracking-[0.22em] uppercase ${T_LABEL}`}>
            ação
          </span>
          <span className={`text-[12.5px] font-semibold ${T_STRONG} truncate`}>
            {action}
          </span>
        </span>
        <span className={[
          'flex items-center gap-1 shrink-0',
          'text-[10px] font-mono tracking-wider uppercase',
          'text-emerald-600 dark:text-emerald-400 font-bold',
          'group-hover:translate-x-0.5 transition-transform',
        ].join(' ')}>
          {actionLabel}
          <ArrowRight size={12} strokeWidth={2.4} />
        </span>
      </button>
    </div>
  );
}
