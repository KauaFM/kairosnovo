import { useState, useEffect, useCallback, useRef } from 'react';
import { Flame, Plus, Check, Trash2, X } from 'lucide-react';
import {
  listHabitsWithTodayStatus,
  createHabit,
  checkInHabit,
  deleteHabit,
  PILLARS,
} from '../../../services/habits';
import { useRealtimeSync } from '../../../hooks/useRealtimeSync';

interface Habit {
  id: string;
  title: string;
  cue: string | null;
  reward: string | null;
  frequency: string;
  target_count: number;
  pillar: string;
  xp_reward: number;
  active: boolean;
  done_today?: boolean;
}

interface Props {
  isDark: boolean;
}

const PILLAR_LABELS: Record<string, string> = {
  disciplina:   'Disciplina',
  consistencia: 'Consistência',
  foco:         'Foco',
  energia:      'Energia',
  evolucao:     'Evolução',
};

export function HabitsHubCard({ isDark: _isDark }: Props) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { subscribeToHabits, subscribeToHabitLogs } = useRealtimeSync();
  const unsubRef = useRef<Array<() => void>>([]);

  const load = useCallback(async () => {
    const list = await listHabitsWithTodayStatus();
    setHabits(list as Habit[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const u1 = subscribeToHabits(() => load());
    const u2 = subscribeToHabitLogs(() => load());
    if (u1) unsubRef.current.push(u1);
    if (u2) unsubRef.current.push(u2);
    return () => {
      unsubRef.current.forEach(u => u?.());
      unsubRef.current = [];
    };
  }, [load, subscribeToHabits, subscribeToHabitLogs]);

  const handleCheckIn = async (habit: Habit) => {
    if (habit.done_today) return;
    setBusyId(habit.id);
    // Optimistic
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, done_today: true } : h)));
    const { error } = await checkInHabit(habit.id);
    if (error) {
      console.error('❌ check-in falhou:', error);
      alert('Não foi possível registrar o hábito. Tenta de novo.');
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, done_today: false } : h)));
    } else if ((navigator as any)?.vibrate) {
      (navigator as any).vibrate(20);
    }
    setBusyId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apagar este hábito? Os registros anteriores são preservados.')) return;
    await deleteHabit(id);
    await load();
  };

  // Stats
  const total = habits.length;
  const doneToday = habits.filter((h) => h.done_today).length;
  const pct = total > 0 ? Math.round((doneToday / total) * 100) : 0;

  return (
    <div className="rounded-[28px] p-5 relative overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/80">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={13} strokeWidth={1.6} className="text-zinc-600 dark:text-zinc-400" />
          <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            Hábitos de Hoje
          </span>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="h-7 px-3 flex items-center gap-1 rounded-[10px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
        >
          <Plus size={11} strokeWidth={2} />
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Novo</span>
        </button>
      </div>

      {/* Stats strip */}
      {total > 0 && (
        <div className="flex items-center gap-4 mb-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
          <Stat label="Hoje" value={`${doneToday}/${total}`} />
          <Stat label="Taxa" value={`${pct}%`} />
          <Stat label="Ativos" value={String(total)} />
        </div>
      )}

      {/* Habit list */}
      {loading ? (
        <div className="py-6 text-center text-[10px] font-mono text-zinc-400">carregando…</div>
      ) : habits.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">
            Nenhum hábito ainda.<br />
            Hábitos são o motor do sistema — criam XP, streak e alimentam seus pilares.
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-4"
          >
            Criar primeiro hábito →
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          {habits.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-3 py-3 border-b border-zinc-100/60 dark:border-zinc-800/30 last:border-0"
            >
              {/* Check button */}
              <button
                onClick={() => handleCheckIn(h)}
                disabled={h.done_today || busyId === h.id}
                className={`
                  shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
                  transition-all active:scale-90
                  ${h.done_today
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'border border-zinc-300 dark:border-zinc-700 text-zinc-400 hover:border-zinc-500 dark:hover:border-zinc-500'}
                `}
                aria-label={h.done_today ? 'Feito hoje' : 'Marcar como feito'}
              >
                <Check size={14} strokeWidth={2.5} />
              </button>

              {/* Title + meta */}
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-mono font-bold leading-snug truncate ${h.done_today ? 'text-zinc-400 dark:text-zinc-600 line-through' : 'text-zinc-800 dark:text-zinc-200'}`}>
                  {h.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[8px] font-mono uppercase tracking-wider text-zinc-400">
                    {PILLAR_LABELS[h.pillar] || h.pillar}
                  </span>
                  <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-700">·</span>
                  <span className="text-[8px] font-mono text-zinc-400 tabular-nums">+{h.xp_reward} XP</span>
                  {h.cue && (
                    <>
                      <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-700">·</span>
                      <span className="text-[8px] font-mono text-zinc-400 truncate">{h.cue}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(h.id)}
                className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-zinc-300 dark:text-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-90"
              >
                <Trash2 size={11} strokeWidth={1.8} />
              </button>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateHabitModal
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[7px] font-mono uppercase tracking-[0.2em] text-zinc-400/70">{label}</span>
      <span className="text-[13px] font-outfit font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * MODAL: Criar Hábito
 * ───────────────────────────────────────────────────────────── */
function CreateHabitModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [pillar, setPillar] = useState('disciplina');
  const [cue, setCue] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    // XP é definido pelo agente n8n — não pelo usuário
    const { error } = (await createHabit({
      title: title.trim(),
      pillar,
      cue: cue.trim() || undefined,
      frequency: 'daily',
      target_count: 1,
    })) as any;
    setSaving(false);
    if (error) {
      alert(`Erro: ${error.message}`);
      return;
    }
    onCreated();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-zinc-950 rounded-t-[28px] sm:rounded-[28px] border-t sm:border border-zinc-200 dark:border-zinc-800 p-6 pb-28 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-900 dark:text-zinc-100">
            Novo Hábito
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Título">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Ler 20min antes de dormir"
              className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[12px] font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
              autoFocus
            />
          </Field>

          <Field label="Pilar">
            <div className="grid grid-cols-5 gap-1">
              {PILLARS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPillar(p)}
                  className={`
                    h-9 rounded-xl text-[8px] font-mono font-bold uppercase tracking-wider transition-all active:scale-95
                    ${pillar === p
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400'}
                  `}
                >
                  {PILLAR_LABELS[p].slice(0, 4)}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Gatilho (opcional)">
            <input
              value={cue}
              onChange={(e) => setCue(e.target.value)}
              placeholder="Ex: Depois do café da manhã"
              className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[12px] font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
            />
          </Field>

          <button
            onClick={submit}
            disabled={!title.trim() || saving}
            className="h-11 rounded-[14px] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-mono font-bold uppercase tracking-[0.2em] disabled:opacity-40 active:scale-95 transition-all"
          >
            {saving ? 'criando…' : 'Criar hábito'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}
