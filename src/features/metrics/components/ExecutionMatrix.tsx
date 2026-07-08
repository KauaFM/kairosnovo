import { useState, useMemo, useCallback } from 'react';
import { Grid3x3, Flame, TrendingDown, Plus, X, Check } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════════
 * EXECUTION MATRIX — Daily Habit/Task Tracking Grid
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Replaces traditional to-do lists with a high-density data grid.
 * Each ROW = a habit/recurring task.
 * Each COL = a day of the current week (Seg–Dom).
 * Intersection = brutalista checkbox (filled square = done).
 *
 * Visual cues:
 *   - Streak counter per habit (STRK: 14D)
 *   - Broken streak = strikethrough + dimmed opacity
 *   - Weekly completion rate bar (ultrafine h-1)
 *   - Today column highlighted
 *   - Future days disabled (no pre-marking)
 *
 * Props:
 *   habits    — array of HabitData (name, target, streak, weekly marks)
 *   onToggle  — callback when a cell is toggled
 *   onAdd     — callback to add a new habit
 *
 * ═══════════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ───────────────────────────────────────────────────────────────────────────── */

export interface HabitData {
  id: string;
  name: string;                        // Display name: "Deep Work - 2h"
  target: string;                      // Short target label: "2h", "1h", "30min"
  domain: string;                      // Domain tag: "MENTE", "CORPO", etc.
  streak: number;                      // Current streak in days
  streakBroken: boolean;               // True if yesterday was missed
  /** Boolean array [Seg, Ter, Qua, Qui, Sex, Sab, Dom] — true = completed */
  weekDays: [boolean, boolean, boolean, boolean, boolean, boolean, boolean];
}

export interface ExecutionMatrixProps {
  habits: HabitData[];
  isDark: boolean;
  onToggle?: (habitId: string, dayIndex: number) => void;
  onAdd?: () => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CONSTANTS
 * ───────────────────────────────────────────────────────────────────────────── */

const DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const;

/** Map JS getDay() (0=Sun) to our index (0=Mon) */
function getTodayIndex(): number {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon, ..., 6=Sun
}

/* ─────────────────────────────────────────────────────────────────────────────
 * MOCK DATA GENERATOR
 *
 * Creates a realistic set of habits with varying streaks and completion.
 * Deterministic: same output on same day for visual consistency.
 * ───────────────────────────────────────────────────────────────────────────── */

function createMockHabits(): HabitData[] {
  const todayIdx = getTodayIndex();

  // Helper: generate weekDays where past days have random completion
  // and future days (after today) are always false
  const gen = (
    seed: number,
    completionRate: number
  ): [boolean, boolean, boolean, boolean, boolean, boolean, boolean] => {
    let s = seed;
    const rng = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    const days: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      if (i > todayIdx) {
        days.push(false); // Future: not yet available
      } else if (i === todayIdx) {
        days.push(rng() < completionRate * 0.6); // Today: lower chance (day not over)
      } else {
        days.push(rng() < completionRate);
      }
    }
    return days as [boolean, boolean, boolean, boolean, boolean, boolean, boolean];
  };

  return [
    {
      id: 'h1',
      name: 'Deep Work',
      target: '2h',
      domain: 'MENTE',
      streak: 14,
      streakBroken: false,
      weekDays: gen(101, 0.85),
    },
    {
      id: 'h2',
      name: 'Estudo Cybersec',
      target: '1h',
      domain: 'MENTE',
      streak: 7,
      streakBroken: false,
      weekDays: gen(202, 0.78),
    },
    {
      id: 'h3',
      name: 'Treino',
      target: '45min',
      domain: 'CORPO',
      streak: 0,
      streakBroken: true,
      weekDays: gen(303, 0.55),
    },
    {
      id: 'h4',
      name: 'Meditacao',
      target: '15min',
      domain: 'SENTIDO',
      streak: 30,
      streakBroken: false,
      weekDays: gen(404, 0.95),
    },
    {
      id: 'h5',
      name: 'Leitura',
      target: '30min',
      domain: 'CRESCIMENTO',
      streak: 5,
      streakBroken: false,
      weekDays: gen(505, 0.70),
    },
    {
      id: 'h6',
      name: 'Journaling',
      target: '10min',
      domain: 'BEM-ESTAR',
      streak: 3,
      streakBroken: false,
      weekDays: gen(606, 0.62),
    },
    {
      id: 'h7',
      name: 'Pomodoro Focus',
      target: '4x',
      domain: 'EXECUCAO',
      streak: 0,
      streakBroken: true,
      weekDays: gen(707, 0.48),
    },
    {
      id: 'h8',
      name: 'Agua 2L',
      target: '2L',
      domain: 'CORPO',
      streak: 11,
      streakBroken: false,
      weekDays: gen(808, 0.88),
    },
  ];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SUBCOMPONENTS
 * ───────────────────────────────────────────────────────────────────────────── */

/** Brutalista checkbox — filled square when done, thin border when not */
function Cell({
  done,
  isToday,
  isFuture,
  onClick,
}: {
  done: boolean;
  isToday: boolean;
  isFuture: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={isFuture ? undefined : onClick}
      disabled={isFuture}
      className={`
        w-full aspect-square rounded-[4px] transition-all duration-150
        flex items-center justify-center
        ${isFuture
          ? 'opacity-[0.08] cursor-default'
          : 'cursor-pointer active:scale-90 hover:scale-105'
        }
        ${done
          ? 'bg-zinc-900 dark:bg-zinc-100'
          : 'border border-zinc-200 dark:border-zinc-800 bg-transparent hover:border-zinc-400 dark:hover:border-zinc-600'
        }
        ${isToday && !done
          ? 'border-zinc-400 dark:border-zinc-500 shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]'
          : ''
        }
      `}
      aria-label={done ? 'Concluido' : 'Pendente'}
    >
      {done && (
        <Check
          size={9}
          strokeWidth={3}
          className="text-white dark:text-zinc-900"
        />
      )}
    </button>
  );
}

/** Ultrafine progress bar */
function MiniBar({ ratio }: { ratio: number }) {
  const pct = Math.min(100, Math.max(0, ratio * 100));
  return (
    <div className="w-full h-[3px] rounded-full bg-zinc-100 dark:bg-zinc-800/80 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          pct >= 85
            ? 'bg-zinc-800 dark:bg-zinc-200'
            : pct >= 57
            ? 'bg-zinc-500 dark:bg-zinc-400'
            : 'bg-zinc-300 dark:bg-zinc-600'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT
 * ───────────────────────────────────────────────────────────────────────────── */

export function ExecutionMatrix({
  habits: externalHabits,
  isDark,
  onToggle,
  onAdd,
}: ExecutionMatrixProps) {
  const todayIdx = useMemo(() => getTodayIndex(), []);

  // Internal state for toggling (when no external onToggle)
  const [localHabits, setLocalHabits] = useState<HabitData[]>(() =>
    externalHabits.length > 0 ? externalHabits : createMockHabits()
  );

  const habits = externalHabits.length > 0 ? externalHabits : localHabits;

  const handleToggle = useCallback(
    (habitId: string, dayIndex: number) => {
      if (dayIndex > todayIdx) return; // Cannot mark future

      if (onToggle) {
        onToggle(habitId, dayIndex);
        return;
      }

      // Local toggle fallback
      setLocalHabits((prev) =>
        prev.map((h) => {
          if (h.id !== habitId) return h;
          const newDays = [...h.weekDays] as HabitData['weekDays'];
          newDays[dayIndex] = !newDays[dayIndex];
          return { ...h, weekDays: newDays };
        })
      );
    },
    [onToggle, todayIdx]
  );

  // ── Aggregate metrics ──────────────────────────────────
  const totalDone = habits.reduce(
    (sum, h) => sum + h.weekDays.filter((d, i) => d && i <= todayIdx).length,
    0
  );
  const totalPossible = habits.length * (todayIdx + 1);
  const globalRate = totalPossible > 0 ? totalDone / totalPossible : 0;
  const perfectDays = useMemo(() => {
    let count = 0;
    for (let d = 0; d <= todayIdx; d++) {
      if (habits.every((h) => h.weekDays[d])) count++;
    }
    return count;
  }, [habits, todayIdx]);

  return (
    <div className="rounded-[28px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/80 overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Grid3x3 size={13} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
            <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-zinc-400/80 dark:text-zinc-500/80">
              Matriz de Execucao
            </span>
          </div>
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1 text-[8px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              <Plus size={10} strokeWidth={2} />
              Habito
            </button>
          )}
        </div>

        {/* ── Summary strip ── */}
        <div className="flex items-center gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-sm bg-zinc-800 dark:bg-zinc-200"
              style={{ opacity: globalRate }}
            />
            <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
              {Math.round(globalRate * 100)}% semanal
            </span>
          </div>
          <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-700">|</span>
          <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
            {totalDone}/{totalPossible} checks
          </span>
          <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-700">|</span>
          <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
            {perfectDays} dia{perfectDays !== 1 ? 's' : ''} perfeito{perfectDays !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Column headers (days) ── */}
      <div className="px-5">
        <div
          className="grid items-center gap-x-1.5 gap-y-0"
          style={{ gridTemplateColumns: '1fr repeat(7, 28px) 44px' }}
        >
          {/* Empty corner */}
          <div />
          {DAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={`text-center py-1.5 rounded-t-lg transition-colors ${
                i === todayIdx
                  ? 'bg-zinc-100 dark:bg-zinc-800/60'
                  : ''
              }`}
            >
              <span
                className={`text-[7px] font-mono font-bold uppercase tracking-widest ${
                  i === todayIdx
                    ? 'text-zinc-700 dark:text-zinc-200'
                    : i > todayIdx
                    ? 'text-zinc-200 dark:text-zinc-800'
                    : 'text-zinc-400 dark:text-zinc-600'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
          {/* Rate header */}
          <div className="text-right">
            <span className="text-[6px] font-mono font-bold uppercase tracking-widest text-zinc-300 dark:text-zinc-700">
              Rate
            </span>
          </div>
        </div>
      </div>

      {/* ── Habit rows ── */}
      <div className="px-5 pb-4">
        {habits.map((habit, rowIdx) => {
          const doneCount = habit.weekDays.filter((d, i) => d && i <= todayIdx).length;
          const possibleCount = todayIdx + 1;
          const weekRate = possibleCount > 0 ? doneCount / possibleCount : 0;

          return (
            <div
              key={habit.id}
              className={`
                grid items-center gap-x-1.5
                py-2.5
                ${rowIdx < habits.length - 1 ? 'border-b border-zinc-100/80 dark:border-zinc-800/40' : ''}
              `}
              style={{ gridTemplateColumns: '1fr repeat(7, 28px) 44px' }}
            >
              {/* ── Habit label cell ── */}
              <div className="min-w-0 pr-2">
                {/* Name + target */}
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-200 truncate leading-tight">
                    {habit.name}
                  </span>
                  <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-700 shrink-0 tabular-nums">
                    {habit.target}
                  </span>
                </div>

                {/* Streak + Domain */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Flame
                      size={8}
                      strokeWidth={1.8}
                      className={
                        habit.streakBroken
                          ? 'text-zinc-200 dark:text-zinc-800'
                          : habit.streak >= 14
                          ? 'text-zinc-600 dark:text-zinc-300'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }
                    />
                    <span
                      className={`text-[8px] font-mono font-bold tabular-nums tracking-wider ${
                        habit.streakBroken
                          ? 'text-zinc-300 dark:text-zinc-700 line-through'
                          : habit.streak >= 14
                          ? 'text-zinc-600 dark:text-zinc-300'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {habit.streak}D
                    </span>
                    {habit.streakBroken && (
                      <TrendingDown size={7} strokeWidth={2} className="text-zinc-300 dark:text-zinc-700" />
                    )}
                  </div>
                  <span className="text-[6px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-300 dark:text-zinc-700 px-1 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-800/60">
                    {habit.domain}
                  </span>
                </div>
              </div>

              {/* ── Day cells ── */}
              {habit.weekDays.map((done, dayIdx) => (
                <div
                  key={dayIdx}
                  className={`flex items-center justify-center ${
                    dayIdx === todayIdx ? 'bg-zinc-100/60 dark:bg-zinc-800/30 rounded-lg py-0.5' : ''
                  }`}
                >
                  <div className="w-5 h-5">
                    <Cell
                      done={done}
                      isToday={dayIdx === todayIdx}
                      isFuture={dayIdx > todayIdx}
                      onClick={() => handleToggle(habit.id, dayIdx)}
                    />
                  </div>
                </div>
              ))}

              {/* ── Weekly rate ── */}
              <div className="flex flex-col items-end gap-1 pl-1">
                <span className="text-[9px] font-mono font-bold text-zinc-600 dark:text-zinc-400 tabular-nums">
                  {Math.round(weekRate * 100)}%
                </span>
                <div className="w-full">
                  <MiniBar ratio={weekRate} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer: today indicator ── */}
      <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
        <span className="text-[7px] font-mono text-zinc-300 dark:text-zinc-700 tracking-wider uppercase">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-[3px] bg-zinc-900 dark:bg-zinc-100" />
            <span className="text-[7px] font-mono text-zinc-400 dark:text-zinc-600 tracking-wider">Feito</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-[3px] border border-zinc-300 dark:border-zinc-700" />
            <span className="text-[7px] font-mono text-zinc-400 dark:text-zinc-600 tracking-wider">Pendente</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * DEFAULT EXPORT: Pre-loaded with mock data (plug-and-play for MasterDashboard)
 * ───────────────────────────────────────────────────────────────────────────── */

export const MOCK_HABITS: HabitData[] = createMockHabits();
