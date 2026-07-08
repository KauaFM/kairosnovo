// =============================================================
// ORVAX · Life OS — Card primitive
// Superfícies suaves: rounded-2xl, borda tênue, sombra leve.
// Nada de linha reta agressiva — pílulas e blocos orgânicos.
// =============================================================
import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'xl' | 'none';
  elevated?: boolean;
  /** cartão principal ganha radius ainda maior + sombra */
  hero?: boolean;
  as?: keyof JSX.IntrinsicElements;
  onClick?: () => void;
};

const PAD: Record<NonNullable<Props['padding']>, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-5',
  xl:   'p-6',
};

export function Card({
  children, className = '', padding = 'md', elevated, hero, as, onClick,
}: Props) {
  const Comp: any = as || (onClick ? 'button' : 'div');
  return (
    <Comp
      onClick={onClick}
      className={[
        hero ? 'rounded-3xl' : 'rounded-2xl',
        'border transition-all duration-300',
        'bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm',
        'border-zinc-200/70 dark:border-white/10',
        'text-zinc-900 dark:text-zinc-100',
        elevated || hero ? 'shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)]' : '',
        onClick ? 'hover:border-zinc-400/80 dark:hover:border-white/25 hover:-translate-y-[1px] text-left w-full' : '',
        PAD[padding],
        className,
      ].join(' ')}
    >
      {children}
    </Comp>
  );
}
