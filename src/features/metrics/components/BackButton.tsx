import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

export function BackButton({ onClick, label = 'Voltar' }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-white/50 hover:text-neutral-900 dark:hover:text-white/90 transition-colors"
    >
      <ArrowLeft size={16} />
      <span>{label}</span>
    </button>
  );
}
