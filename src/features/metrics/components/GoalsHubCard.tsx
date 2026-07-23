import { useState, useEffect, useCallback, useRef } from 'react';
import { Target, Plus, Trash2, ChevronUp, ChevronDown, Calendar, Flame, CheckCircle2, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
// @ts-expect-error — db.js não é TS
import { getUserGoals, createGoal, updateGoalCurrentValue, deleteGoal } from '../../../services/db';
import { confirmDialog, alertDialog } from '../../../lib/dialog';
import { QuickCreateMeta } from './QuickCreateMeta';
import type { GoalPayload } from './QuickCreateMeta';
import { supabase } from '../../../lib/supabase';

/* ─────────────────────────────────────────────────────────────
 * TYPES
 * ───────────────────────────────────────────────────────────── */
interface Goal {
  id: string;
  title: string;
  progress: number;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  deadline: string | null;
  status: string;
  created_at: string;
}

/* Formata número sem zeros sobrando (1.0 → "1", 1.5 → "1.5") */
const fmt = (n: number) => {
  if (n == null || isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
};

/* Incremento sugerido baseado no alvo — 10% do target, arredondado */
const suggestStep = (target: number | null): number => {
  if (!target || target <= 0) return 1;
  const step = target / 10;
  if (step >= 100) return Math.round(step / 10) * 10;
  if (step >= 10) return Math.round(step);
  if (step >= 1) return Math.round(step * 2) / 2; // 0.5
  return Math.round(step * 10) / 10; // 0.1
};

interface Props {
  isDark: boolean;
}

/* ─────────────────────────────────────────────────────────────
 * HELPERS
 * ───────────────────────────────────────────────────────────── */
function getDaysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline + 'T12:00:00').getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function getStatusInfo(progress: number, daysLeft: number | null) {
  if (progress >= 100) return { label: 'CONCLUÍDA', icon: CheckCircle2, color: 'text-zinc-500 dark:text-zinc-400', bar: 'bg-zinc-800 dark:bg-zinc-200' };
  if (daysLeft !== null && daysLeft < 0) return { label: 'ATRASADA', icon: AlertTriangle, color: 'text-zinc-500', bar: 'bg-zinc-400 dark:bg-zinc-600' };
  if (progress >= 70) return { label: 'NO CAMINHO', icon: TrendingUp, color: 'text-zinc-500 dark:text-zinc-400', bar: 'bg-zinc-700 dark:bg-zinc-300' };
  if (progress >= 40) return { label: 'EM RISCO', icon: Clock, color: 'text-zinc-400 dark:text-zinc-500', bar: 'bg-zinc-500 dark:bg-zinc-500' };
  return { label: 'INICIANDO', icon: Flame, color: 'text-zinc-400 dark:text-zinc-600', bar: 'bg-zinc-300 dark:bg-zinc-700' };
}

/* ─────────────────────────────────────────────────────────────
 * GOAL CARD ROW
 * ───────────────────────────────────────────────────────────── */
function GoalRow({
  goal,
  onValueChange,
  onDelete,
}: {
  goal: Goal;
  onValueChange: (id: string, newValue: number) => void;
  onDelete: (id: string) => void;
}) {
  const daysLeft = getDaysRemaining(goal.deadline);
  const { label, icon: StatusIcon, color, bar } = getStatusInfo(goal.progress, daysLeft);

  const target = goal.target_value ?? 100;
  const current = goal.current_value ?? 0;
  const unit = goal.unit || '%';
  const step = suggestStep(target);
  const hasUnit = !!goal.unit && goal.unit !== '%';

  const increment = () => onValueChange(goal.id, Math.min(target, current + step));
  const decrement = () => onValueChange(goal.id, Math.max(0, current - step));

  return (
    <div className="py-4 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
      {/* Top row: title + delete */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[11px] font-mono font-bold text-zinc-800 dark:text-zinc-200 leading-snug flex-1">
          {goal.title}
        </p>
        <button
          onClick={() => onDelete(goal.id)}
          className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-zinc-300 dark:text-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-90"
        >
          <Trash2 size={11} strokeWidth={1.8} />
        </button>
      </div>

      {/* Deadline + status */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex items-center gap-1 ${color}`}>
          <StatusIcon size={9} strokeWidth={1.8} />
          <span className="text-[7px] font-mono font-bold uppercase tracking-wider">{label}</span>
        </div>
        {goal.deadline && (
          <div className="flex items-center gap-1 text-zinc-300 dark:text-zinc-700">
            <Calendar size={9} strokeWidth={1.6} />
            <span className="text-[7px] font-mono tabular-nums">
              {new Date(goal.deadline + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              {daysLeft !== null && (
                <span className="ml-1">
                  ({daysLeft > 0 ? `${daysLeft}d` : daysLeft === 0 ? 'hoje' : `${Math.abs(daysLeft)}d atrás`})
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar}`}
          style={{ width: `${Math.min(100, goal.progress)}%` }}
        />
      </div>

      {/* Progress controls — agora mostra valor CONCRETO */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-outfit font-black text-zinc-800 dark:text-zinc-200 tabular-nums leading-none">
            {fmt(current)}<span className="opacity-40"> / {fmt(target)} {hasUnit ? unit : ''}</span>
          </span>
          <span className="text-[7px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-widest mt-1">
            {goal.progress}% concluído{hasUnit ? ` · passo +${fmt(step)} ${unit}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={decrement}
            disabled={current <= 0}
            title={`-${fmt(step)} ${unit}`}
            className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-90 disabled:opacity-20"
          >
            <ChevronDown size={12} strokeWidth={2} />
          </button>
          <button
            onClick={increment}
            disabled={current >= target}
            title={`+${fmt(step)} ${unit}`}
            className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-90 disabled:opacity-20"
          >
            <ChevronUp size={12} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * MAIN COMPONENT
 * ───────────────────────────────────────────────────────────── */
export function GoalsHubCard({ isDark }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      const data = await getUserGoals();
      setGoals(data || []);
    } catch (e) {
      console.error('GoalsHubCard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();

    const channel = supabase
      .channel('goals-hub-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => {
        loadGoals();
      })
      .subscribe();

    realtimeRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [loadGoals]);

  /* ── Create goal ── */
  const handleCreate = async (payload: GoalPayload) => {
    try {
      const result = await createGoal({
        title: payload.title,
        description: payload.description || '',
        category: payload.category,
        target_value: payload.target_value,
        current_value: 0,
        unit: payload.unit,
        frequency: payload.frequency,
        intensity: payload.intensity,
        progress: 0,
        deadline: payload.deadline || null,
        status: 'ativo',
      });

      // Log para debug — aparece no console do navegador
      if (result?.error) {
        console.error('❌ Erro ao criar meta:', result.error);
        alertDialog({ title: 'Erro', message: `Não foi possível criar a meta: ${result.error.message}`, danger: true });
        return;
      }

      setCreateOpen(false);
      await loadGoals();
    } catch (e) {
      console.error('❌ Exceção ao criar meta:', e);
      alertDialog({ title: 'Erro', message: 'Erro inesperado ao criar a meta.', danger: true });
    }
  };

  /* ── Update current value (valor concreto — o trigger recalcula progress) ── */
  const handleValueChange = async (id: string, newValue: number) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const target = goal.target_value ?? 100;
    const clamped = Math.max(0, Math.min(target, newValue));
    const derivedProgress = Math.round((clamped / target) * 100);
    // Optimistic update
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current_value: clamped, progress: derivedProgress } : g));
    await updateGoalCurrentValue(id, clamped);
  };

  /* ── Delete goal ── */
  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({
      title: 'Excluir meta',
      message: 'Remover esta meta permanentemente?',
      danger: true, confirmLabel: 'Excluir', cancelLabel: 'Cancelar',
    });
    if (!ok) return;
    setGoals(prev => prev.filter(g => g.id !== id));
    await deleteGoal(id);
  };

  /* ── Aggregate stats ── */
  const total = goals.length;
  const done = goals.filter(g => g.progress >= 100).length;
  const avgProgress = total > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / total) : 0;
  const onTrack = goals.filter(g => g.progress >= 70 && g.progress < 100).length;

  return (
    <>
      <div className="rounded-[28px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/80 overflow-hidden">

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={12} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
              <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-zinc-400/80 dark:text-zinc-500/80">
                Vetor de Progresso
              </span>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[8px] font-mono font-bold uppercase tracking-wider transition-all active:scale-95 hover:opacity-90"
            >
              <Plus size={10} strokeWidth={2.5} />
              Nova Meta
            </button>
          </div>
        </div>

        {/* ── Stats strip ── */}
        {total > 0 && (
          <div className="px-5 py-3 grid grid-cols-3 gap-3 border-b border-zinc-100 dark:border-zinc-800/50">
            <div className="text-center">
              <span className="text-[18px] font-outfit font-black text-zinc-900 dark:text-zinc-100 leading-none block">{total}</span>
              <span className="text-[6px] font-mono uppercase tracking-wider text-zinc-300 dark:text-zinc-700">Ativas</span>
            </div>
            <div className="text-center">
              <span className="text-[18px] font-outfit font-black text-zinc-900 dark:text-zinc-100 leading-none block">{avgProgress}%</span>
              <span className="text-[6px] font-mono uppercase tracking-wider text-zinc-300 dark:text-zinc-700">Média</span>
            </div>
            <div className="text-center">
              <span className="text-[18px] font-outfit font-black text-zinc-900 dark:text-zinc-100 leading-none block">{done}</span>
              <span className="text-[6px] font-mono uppercase tracking-wider text-zinc-300 dark:text-zinc-700">Concluídas</span>
            </div>
          </div>
        )}

        {/* ── Goal list ── */}
        <div className="px-5">
          {loading ? (
            <div className="py-8 text-center text-[8px] font-mono text-zinc-300 dark:text-zinc-700 uppercase tracking-wider">
              Carregando...
            </div>
          ) : goals.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                <Target size={16} strokeWidth={1.4} className="text-zinc-300 dark:text-zinc-700" />
              </div>
              <p className="text-[9px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-wider text-center">
                Nenhuma meta definida
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                className="text-[8px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-[10px] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all active:scale-95"
              >
                Criar primeira meta →
              </button>
            </div>
          ) : (
            goals.map(goal => (
              <GoalRow
                key={goal.id}
                goal={goal}
                onValueChange={handleValueChange}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* ── Footer ── */}
        {goals.length > 0 && (
          <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
            <span className="text-[7px] font-mono text-zinc-300 dark:text-zinc-700 tracking-wider uppercase">
              {onTrack} meta{onTrack !== 1 ? 's' : ''} no caminho
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-pulse" />
              <span className="text-[7px] font-mono text-zinc-300 dark:text-zinc-700 tracking-wider">SYNC ATIVO</span>
            </div>
          </div>
        )}
      </div>

      {/* ── QuickCreateMeta modal ── */}
      <QuickCreateMeta
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
    </>
  );
}
