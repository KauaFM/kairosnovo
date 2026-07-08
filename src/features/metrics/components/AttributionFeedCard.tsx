import { useEffect, useState, useCallback } from 'react';
import { Activity, CheckSquare, Flame, Target, Zap, Trophy } from 'lucide-react';
// @ts-expect-error JS module
import { getXpFeed } from '../../../services/db';
import { useRealtimeSync } from '../../../hooks/useRealtimeSync';

// ============================================================
// ORVAX — Attribution Feed Card
// Mostra de ONDE veio cada ganho de XP nas métricas.
// Fonte: xp_log enriquecido com título de tasks/habits/goals.
// ============================================================

interface FeedItem {
  id: string;
  source: 'task_done' | 'habit_done' | 'goal_progress' | 'goal_complete' | string;
  source_id: string | null;
  title: string;
  area: string;
  pillar: string | null;
  amount: number;
  detail: string | null;
  created_at: string;
}

interface Props {
  isDark?: boolean;
  limit?: number;
}

function relTime(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function iconFor(source: string) {
  switch (source) {
    case 'task_done':      return CheckSquare;
    case 'habit_done':     return Flame;
    case 'goal_progress':  return Target;
    case 'goal_complete':  return Trophy;
    default:               return Zap;
  }
}

function labelFor(source: string): string {
  switch (source) {
    case 'task_done':     return 'TAREFA';
    case 'habit_done':    return 'HÁBITO';
    case 'goal_progress': return 'META +';
    case 'goal_complete': return 'META ✓';
    default:              return 'SISTEMA';
  }
}

export function AttributionFeedCard({ limit = 15 }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscribeToOrvaxAgenda } = useRealtimeSync();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await getXpFeed(limit);
      setItems(rows || []);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
    const unsub = subscribeToOrvaxAgenda(() => load());
    return () => { unsub?.(); };
  }, [load, subscribeToOrvaxAgenda]);

  const totalXP = items.reduce((sum, it) => sum + (it.amount || 0), 0);

  return (
    <div className="rounded-[28px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/80 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={12} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
            <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-zinc-400/80 dark:text-zinc-500/80">
              Atribuição · De onde veio
            </span>
          </div>
          <span className="text-[8px] font-mono font-bold text-zinc-600 dark:text-zinc-300 tabular-nums">
            +{totalXP} XP
          </span>
        </div>
        <p className="mt-1 text-[8px] font-mono text-zinc-300 dark:text-zinc-700 uppercase tracking-wider">
          Últimas {limit} atividades que moveram suas métricas
        </p>
      </div>

      {/* Feed */}
      <div className="px-5 py-3">
        {loading ? (
          <div className="text-[8px] font-mono text-zinc-300 dark:text-zinc-700 py-4 text-center">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="text-[8px] font-mono text-zinc-300 dark:text-zinc-700 py-6 text-center">
            — Ainda sem atividade registrada —
          </div>
        ) : (
          <ul className="flex flex-col">
            {items.map((it, idx) => {
              const Icon = iconFor(it.source);
              const isLast = idx === items.length - 1;
              return (
                <li
                  key={it.id}
                  className={`flex items-center gap-3 py-2.5 ${!isLast ? 'border-b border-zinc-100/80 dark:border-zinc-800/40' : ''}`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/60">
                    <Icon size={11} strokeWidth={1.8} className="text-zinc-500 dark:text-zinc-400" />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[6px] font-mono font-bold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500 px-1 py-[1px] rounded border border-zinc-200/70 dark:border-zinc-800/70">
                        {labelFor(it.source)}
                      </span>
                      {it.pillar && (
                        <span className="text-[6px] font-mono uppercase tracking-wider text-zinc-300 dark:text-zinc-600">
                          · {it.pillar}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {it.title}
                    </p>
                    {it.detail && (
                      <p className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
                        {it.detail}
                      </p>
                    )}
                  </div>

                  {/* Right rail */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                    <span className="text-[11px] font-outfit font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
                      +{it.amount}
                      <span className="text-[7px] font-mono font-normal text-zinc-300 dark:text-zinc-600 ml-0.5">XP</span>
                    </span>
                    <span className="text-[7px] font-mono text-zinc-300 dark:text-zinc-700 tabular-nums">
                      {relTime(it.created_at)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
        <span className="text-[7px] font-mono text-zinc-300 dark:text-zinc-700 tracking-wider uppercase">
          Fonte: xp_log · audit trail ORVAX
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-pulse" />
          <span className="text-[7px] font-mono text-zinc-300 dark:text-zinc-700 tracking-wider">LIVE</span>
        </div>
      </div>
    </div>
  );
}
