import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckSquare, FileText, Clock, Zap, CalendarDays, TrendingUp } from 'lucide-react';
import { getTasks, getDailyStats, getUserNotes } from '../../../services/db';
import { toLocalDateStr } from '../../../utils/dateUtils';
import { useRealtimeSync } from '../../../hooks/useRealtimeSync';

interface Task {
  id: string;
  title: string;
  category: string;
  state: string | null;
  time_start?: string;
  scheduled_date: string;
}

interface Note {
  id: string;
  content: string;
  pinned: boolean;
  updated_at: string;
}

interface DailyStats {
  tasks_completed: number;
  tasks_total: number;
  focus_minutes: number;
}

interface VaultData {
  dailyStats: DailyStats;
  todayTasks: Task[];
  weekTasks: Task[];
  recentNotes: Note[];
}

interface Props {
  isDark: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  FOCO: 'text-zinc-400 dark:text-zinc-500',
  TREINO: 'text-zinc-400 dark:text-zinc-500',
  ESTUDO: 'text-zinc-400 dark:text-zinc-500',
  SOCIAL: 'text-zinc-400 dark:text-zinc-500',
  SISTEMA: 'text-zinc-400 dark:text-zinc-500',
};

function StateTag({ state }: { state: string | null }) {
  if (state === 'done') {
    return (
      <span className="flex items-center gap-1 text-[7px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        <span className="w-1.5 h-1.5 rounded-sm bg-zinc-800 dark:bg-zinc-200 inline-block" />
        Feito
      </span>
    );
  }
  if (state === 'failed') {
    return (
      <span className="flex items-center gap-1 text-[7px] font-mono font-bold uppercase tracking-wider text-zinc-300 dark:text-zinc-700">
        <span className="w-1.5 h-1.5 rounded-sm border border-zinc-300 dark:border-zinc-700 inline-block" />
        Falhou
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[7px] font-mono font-bold uppercase tracking-wider text-zinc-300 dark:text-zinc-700">
      <span className="w-1.5 h-1.5 rounded-sm border border-zinc-300 dark:border-zinc-700 inline-block" />
      Pendente
    </span>
  );
}

export function VaultMetricsCard({ isDark }: Props) {
  const [data, setData] = useState<VaultData>({
    dailyStats: { tasks_completed: 0, tasks_total: 0, focus_minutes: 0 },
    todayTasks: [],
    weekTasks: [],
    recentNotes: [],
  });
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef<(() => void)[]>([]);
  const { subscribeToOrvaxAgenda, subscribeToMediaVault } = useRealtimeSync();

  const fetchVaultMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const today = toLocalDateStr();

      // Start of week (Monday)
      const todayDate = new Date();
      const startOfWeek = new Date(todayDate);
      startOfWeek.setDate(todayDate.getDate() - todayDate.getDay() + (todayDate.getDay() === 0 ? -6 : 1));
      const startStr = toLocalDateStr(startOfWeek);
      const endStr = toLocalDateStr(new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000));

      const [allTasks, dailyStats, notes] = await Promise.all([
        getTasks(),
        getDailyStats(),
        getUserNotes(),
      ]);

      const todayTasks = (allTasks || []).filter((t: Task) => t.scheduled_date === today);
      const weekTasks = (allTasks || []).filter(
        (t: Task) => t.scheduled_date >= startStr && t.scheduled_date <= endStr
      );

      setData({
        dailyStats: dailyStats || { tasks_completed: 0, tasks_total: 0, focus_minutes: 0 },
        todayTasks,
        weekTasks,
        recentNotes: (notes || []).slice(0, 3),
      });
    } catch (err) {
      console.error('VaultMetricsCard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVaultMetrics();

    const unsub1 = subscribeToOrvaxAgenda(() => fetchVaultMetrics());
    const unsub2 = subscribeToMediaVault(() => fetchVaultMetrics());

    if (unsub1) unsubscribeRef.current.push(unsub1);
    if (unsub2) unsubscribeRef.current.push(unsub2);

    return () => {
      unsubscribeRef.current.forEach((u) => u?.());
      unsubscribeRef.current = [];
    };
  }, [fetchVaultMetrics, subscribeToOrvaxAgenda, subscribeToMediaVault]);

  const { dailyStats, todayTasks, weekTasks, recentNotes } = data;

  const weekDone = weekTasks.filter((t) => t.state === 'done').length;
  const weekRate = weekTasks.length > 0 ? Math.round((weekDone / weekTasks.length) * 100) : 0;
  const todayDone = todayTasks.filter((t) => t.state === 'done').length;
  const focusH = Math.floor((dailyStats.focus_minutes || 0) / 60);
  const focusM = (dailyStats.focus_minutes || 0) % 60;

  return (
    <div className="rounded-[28px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/80 overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays size={12} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
            <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-zinc-400/80 dark:text-zinc-500/80">
              Cofre — Hoje
            </span>
          </div>
          <span className="text-[7px] font-mono text-zinc-300 dark:text-zinc-700 tracking-wider uppercase">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
          </span>
        </div>
      </div>

      {/* Stat pills */}
      <div className="px-5 py-4 grid grid-cols-3 gap-3 border-b border-zinc-100 dark:border-zinc-800/50">
        {/* Tasks hoje */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <CheckSquare size={9} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
            <span className="text-[7px] font-mono uppercase tracking-wider text-zinc-300 dark:text-zinc-700">Hoje</span>
          </div>
          <span className="text-[22px] font-outfit font-black text-zinc-900 dark:text-zinc-100 leading-none tabular-nums">
            {todayDone}
            <span className="text-[13px] font-outfit font-normal text-zinc-300 dark:text-zinc-700">/{todayTasks.length}</span>
          </span>
          <span className="text-[7px] font-mono text-zinc-300 dark:text-zinc-700 uppercase tracking-wider">tarefas</span>
        </div>

        {/* Semana */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <TrendingUp size={9} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
            <span className="text-[7px] font-mono uppercase tracking-wider text-zinc-300 dark:text-zinc-700">Semana</span>
          </div>
          <span className="text-[22px] font-outfit font-black text-zinc-900 dark:text-zinc-100 leading-none tabular-nums">
            {weekRate}
            <span className="text-[13px] font-outfit font-normal text-zinc-300 dark:text-zinc-700">%</span>
          </span>
          <span className="text-[7px] font-mono text-zinc-300 dark:text-zinc-700 uppercase tracking-wider">{weekDone}/{weekTasks.length} feitas</span>
        </div>

        {/* Focus */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Clock size={9} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
            <span className="text-[7px] font-mono uppercase tracking-wider text-zinc-300 dark:text-zinc-700">Foco</span>
          </div>
          <span className="text-[22px] font-outfit font-black text-zinc-900 dark:text-zinc-100 leading-none tabular-nums">
            {focusH > 0 ? `${focusH}h` : `${focusM}`}
            <span className="text-[13px] font-outfit font-normal text-zinc-300 dark:text-zinc-700">{focusH > 0 ? `${focusM}m` : 'm'}</span>
          </span>
          <span className="text-[7px] font-mono text-zinc-300 dark:text-zinc-700 uppercase tracking-wider">hoje</span>
        </div>
      </div>

      {/* Week rate bar */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[7px] font-mono uppercase tracking-wider text-zinc-300 dark:text-zinc-700">Taxa semanal</span>
          <span className="text-[8px] font-mono font-bold text-zinc-500 dark:text-zinc-400 tabular-nums">{weekRate}%</span>
        </div>
        <div className="w-full h-[3px] rounded-full bg-zinc-100 dark:bg-zinc-800/80">
          <div
            className="h-full rounded-full bg-zinc-800 dark:bg-zinc-200 transition-all duration-700"
            style={{ width: `${weekRate}%` }}
          />
        </div>
      </div>

      {/* Today's task list */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Zap size={9} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-[7px] font-mono uppercase tracking-wider text-zinc-300 dark:text-zinc-700">Tarefas de Hoje</span>
        </div>

        {loading ? (
          <div className="text-[8px] font-mono text-zinc-300 dark:text-zinc-700 py-2">Carregando...</div>
        ) : todayTasks.length === 0 ? (
          <div className="text-[8px] font-mono text-zinc-300 dark:text-zinc-700 py-2 text-center">
            — Nenhuma tarefa para hoje —
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {todayTasks.map((task, idx) => (
              <div
                key={task.id}
                className={`flex items-center justify-between py-2 ${idx < todayTasks.length - 1 ? 'border-b border-zinc-100/80 dark:border-zinc-800/40' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${
                      task.state === 'done'
                        ? 'bg-zinc-800 dark:bg-zinc-200'
                        : 'border border-zinc-300 dark:border-zinc-700'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-mono font-bold truncate ${
                      task.state === 'done'
                        ? 'text-zinc-300 dark:text-zinc-700 line-through'
                        : 'text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {task.time_start && (
                    <span className="text-[7px] font-mono text-zinc-300 dark:text-zinc-700 tabular-nums">
                      {task.time_start.substring(0, 5)}
                    </span>
                  )}
                  <span className="text-[6px] font-mono font-bold uppercase tracking-[0.12em] text-zinc-300 dark:text-zinc-700 px-1 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-800/60">
                    {task.category || 'SISTEMA'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes summary */}
      {recentNotes.length > 0 && (
        <div className="px-5 pb-4 pt-0 border-t border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-1.5 mb-2 pt-3">
            <FileText size={9} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
            <span className="text-[7px] font-mono uppercase tracking-wider text-zinc-300 dark:text-zinc-700">Notas Recentes</span>
          </div>
          {recentNotes.map((note) => (
            <div key={note.id} className="py-1.5 border-b border-zinc-100/80 dark:border-zinc-800/40 last:border-0">
              <p className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 line-clamp-1 leading-snug">
                {note.content?.substring(0, 80) || '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
        <span className="text-[7px] font-mono text-zinc-300 dark:text-zinc-700 tracking-wider uppercase">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-pulse" />
          <span className="text-[7px] font-mono text-zinc-300 dark:text-zinc-700 tracking-wider">SYNC ATIVO</span>
        </div>
      </div>
    </div>
  );
}
