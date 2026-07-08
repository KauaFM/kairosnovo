import { useMemo } from 'react';
import { Flame, Activity } from 'lucide-react';

/* ═══════════════════════════════════════════════════════ */
/*  EXECUTION MAP — 30-DAY MINI HEATMAP                   */
/*  Used on MasterDashboard overview                      */
/* ═══════════════════════════════════════════════════════ */

interface Props {
  seed?: number;
}

/* ── 5-level intensity scale ── */
const HEAT = [
  'bg-zinc-100 dark:bg-zinc-800/50',
  'bg-emerald-200 dark:bg-emerald-900/60',
  'bg-emerald-400 dark:bg-emerald-700',
  'bg-emerald-500 dark:bg-emerald-500',
  'bg-emerald-700 dark:bg-emerald-400',
];

const DAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export function ExecutionMap({ seed = 77 }: Props) {
  /* ── Generate 35 days (5 weeks × 7 days) ── */
  const { cells, weekDates, stats } = useMemo(() => {
    const data: number[] = [];
    let s = seed;
    for (let i = 0; i < 35; i++) {
      s = (s * 16807) % 2147483647;
      data.push(s % 5);
    }

    // Only use last 30 days (first 5 cells may be "future" padding)
    const last30 = data.slice(5);
    const activeDays = last30.filter(v => v > 0).length;
    let maxStreak = 0;
    let streak = 0;
    last30.forEach(v => {
      if (v > 0) { streak++; maxStreak = Math.max(maxStreak, streak); }
      else { streak = 0; }
    });

    // Week date labels
    const today = new Date();
    const wDates: string[] = [];
    for (let w = 0; w < 5; w++) {
      const d = new Date(today);
      d.setDate(d.getDate() - 30 + w * 7);
      wDates.push(
        d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      );
    }

    return { cells: data, weekDates: wDates, stats: { activeDays, maxStreak } };
  }, [seed]);

  return (
    <div className="rounded-[28px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/80 p-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={13} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Execution Map // 30D
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Flame size={11} strokeWidth={1.8} className="text-zinc-500 dark:text-zinc-400" />
          <span className="text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300 tabular-nums">
            {stats.activeDays}/30
          </span>
        </div>
      </div>

      {/* ── Week date labels ── */}
      <div className="flex mb-1.5">
        <div className="w-6 shrink-0" />
        <div className="flex-1 grid grid-cols-5 gap-[3px]">
          {weekDates.map((d, i) => (
            <span
              key={i}
              className="text-[8px] font-mono font-medium text-zinc-400 dark:text-zinc-500 text-center tabular-nums"
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* ── Grid: 5 weeks × 7 days ── */}
      <div className="flex gap-1.5">
        {/* Day labels */}
        <div className="flex flex-col shrink-0 w-5" style={{ gap: 3 }}>
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="text-[8px] font-mono font-medium text-zinc-400 dark:text-zinc-500 leading-none flex items-center justify-end"
              style={{ height: 14 }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Cell grid */}
        <div
          className="grid flex-1"
          style={{
            gridTemplateRows: 'repeat(7, 14px)',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridAutoFlow: 'column',
            gap: '3px',
          }}
        >
          {cells.map((level, i) => (
            <div
              key={i}
              className={`rounded-[3px] ${i < 5 ? 'opacity-30 ' : ''}${HEAT[level]} transition-colors`}
            />
          ))}
        </div>
      </div>

      {/* ── Legend + stats ── */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
          Seq. max: <span className="font-bold text-zinc-700 dark:text-zinc-300">{stats.maxStreak}d</span>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-mono font-medium text-zinc-400 dark:text-zinc-500">Menos</span>
          <div className="flex items-center gap-0.5">
            {HEAT.map((cls, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${cls}`} />
            ))}
          </div>
          <span className="text-[8px] font-mono font-medium text-zinc-400 dark:text-zinc-500">Mais</span>
        </div>
      </div>
    </div>
  );
}
