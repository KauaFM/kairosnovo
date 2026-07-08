import { Calendar, Activity, Plus } from 'lucide-react';

/* ── Types ──────────────────────────────────────── */
export interface GoalEntry {
  id: string;
  name: string;
  progress: number;       // 0-100
  deadline: string;       // ISO date
  lastActivity: string;   // human-readable
}

interface Props {
  goals: GoalEntry[];
  isDark: boolean;
  onAddGoal?: () => void;
}

/* ── Component ──────────────────────────────────── */
export function ProgressVectorMeta({ goals, onAddGoal }: Props) {
  /* ── Empty state ── */
  if (goals.length === 0) {
    return (
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={14} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Vetor de Progresso
            </span>
          </div>
          {onAddGoal && (
            <button
              onClick={onAddGoal}
              className="text-[9px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Adicione Metas
            </button>
          )}
        </div>

        <p className="text-sm font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase">
          Nenhuma meta definida
        </p>

        <div className="flex items-center gap-1.5 mt-3 text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
          <Calendar size={10} strokeWidth={1.6} />
          <span>Prazo: ---</span>
        </div>

        <div className="w-full h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 mt-3" />

        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums uppercase tracking-wider">
            Progresso: 0%
          </span>
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Ultima ativ: Recentemente
          </span>
        </div>
      </div>
    );
  }

  /* ── Populated state ── */
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={14} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Vetor de Progresso
          </span>
        </div>
        {onAddGoal && (
          <button
            onClick={onAddGoal}
            className="flex items-center gap-1 text-[9px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <Plus size={10} strokeWidth={2} />
            Nova Meta
          </button>
        )}
      </div>

      {/* Goal entries */}
      <div className="flex flex-col gap-4">
        {goals.map((goal, idx) => {
          const barColor =
            goal.progress >= 90
              ? 'bg-zinc-800 dark:bg-zinc-200'
              : goal.progress >= 60
                ? 'bg-zinc-600 dark:bg-zinc-400'
                : 'bg-zinc-400 dark:bg-zinc-500';

          return (
            <div
              key={goal.id}
              className={
                idx < goals.length - 1
                  ? 'border-b border-zinc-100 dark:border-zinc-800/60 pb-4'
                  : ''
              }
            >
              {/* Goal name */}
              <div className="flex items-start gap-2 mb-2">
                <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600 mt-[2px] shrink-0 tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <p className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 leading-snug">
                  {goal.name}
                </p>
              </div>

              {/* Deadline */}
              <div className="flex items-center gap-1.5 mb-2.5 ml-5 text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
                <Calendar size={10} strokeWidth={1.6} />
                <span>
                  Prazo:{' '}
                  {new Date(goal.deadline).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })}
                </span>
              </div>

              {/* Progress bar */}
              <div className="ml-5">
                <div className="w-full h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.min(100, goal.progress)}%` }}
                  />
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums uppercase tracking-wider">
                    Progresso: {goal.progress}%
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    Ultima ativ: {goal.lastActivity}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
