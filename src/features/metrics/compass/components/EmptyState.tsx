// Compass — Intelligent Empty State
import { AlertCircle } from 'lucide-react';
import { useLang } from '../../../../i18n/LanguageContext';

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  cta?: string;
  onAction?: () => void;
  pillarName?: string;
}

export function EmptyState({ title, subtitle, cta, onAction, pillarName }: EmptyStateProps) {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 flex items-center justify-center mb-4 opacity-50">
        <AlertCircle className="w-5 h-5 text-zinc-400" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
        {title || t('compass.noDataIn', { name: pillarName || t('compass.thisPillar') })}
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-500 max-w-[260px] leading-relaxed mb-4">
        {subtitle || t('compass.emptySubtitle')}
      </p>
      {cta && onAction && (
        <button
          onClick={onAction}
          className="h-8 px-4 rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase
            bg-zinc-900 dark:bg-white text-white dark:text-zinc-900
            hover:scale-[1.03] active:scale-95 transition-all"
        >
          {cta}
        </button>
      )}
    </div>
  );
}
