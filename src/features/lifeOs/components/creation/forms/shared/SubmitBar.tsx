// =============================================================
// ORVAX · SubmitBar — CTA sticky para todos os forms.
// XP REMOVIDO · XP vem do agente WhatsApp, não do formulário.
// Forms ainda podem mostrar uma linha "bonus" como afirmação positiva.
// =============================================================
import React from 'react';
import { Check } from 'lucide-react';

interface Props {
  disabled: boolean;
  onSubmit: () => void;
  /** texto do botão · default "Registrar" */
  label?: string;
  /** linha de afirmação abaixo · ex: "Combo limpo · disciplina viva" */
  bonus?: string;
  /** legado · ignorado (XP foi removido do front) */
  xpPreview?: number;
}

export function SubmitBar({
  disabled, onSubmit, label = 'Registrar', bonus,
}: Props) {
  return (
    <div className="pt-2 sticky bottom-0 -mx-5 px-5 py-3
      bg-gradient-to-t from-white via-white to-white/0
      dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900/0">
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className={[
          'w-full h-12 rounded-2xl flex items-center justify-center gap-2',
          'text-[13px] font-bold tracking-wide uppercase',
          'transition-all duration-200',
          disabled
            ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:shadow-emerald-500/40 active:scale-[0.98]',
        ].join(' ')}
      >
        <Check size={15} strokeWidth={2.6} />
        {label}
      </button>
      {bonus && !disabled && (
        <p className="mt-2 text-center text-[10px] font-mono tracking-widest uppercase text-emerald-500">
          ✦ {bonus}
        </p>
      )}
    </div>
  );
}
