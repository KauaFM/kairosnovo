import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionCard({ title, children, action, className = '' }: SectionCardProps) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 dark:border-white/[0.055] bg-white dark:bg-[#161616] p-4 shadow-sm dark:shadow-none ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white/90">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
