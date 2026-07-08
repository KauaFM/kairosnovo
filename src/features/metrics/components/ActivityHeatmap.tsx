import { useMemo } from 'react';
import { Flame, Calendar } from 'lucide-react';

/* ═══════════════════════════════════════════════════════ */
/*  ACTIVITY HEATMAP — 90-DAY CONTRIBUTION GRID           */
/*  Shared across all domain drill-down pages             */
/* ═══════════════════════════════════════════════════════ */

interface Props {
  title: string;
  seed: number;
}

/* ── 5-level intensity scale with strong contrast ── */
const HEAT = [
  'bg-zinc-100 dark:bg-zinc-800/50',
  'bg-emerald-200 dark:bg-emerald-900/60',
  'bg-emerald-400 dark:bg-emerald-700',
  'bg-emerald-500 dark:bg-emerald-500',
  'bg-emerald-700 dark:bg-emerald-400',
];

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

export function ActivityHeatmap({ title, seed }: Props) {
  /* ── Generate deterministic 91-day data ── */
  const heat91 = useMemo(() => {
    const data: number[] = [];
    let s = seed;
    for (let i = 0; i < 91; i++) {
      s = (s * 16807) % 2147483647;
      const raw = s % 10;
      data.push(raw < 2 ? 0 : raw < 4 ? 1 : raw < 6 ? 2 : raw < 8 ? 3 : 4);
    }
    return data;
  }, [seed]);

  /* ── Summary statistics ── */
  const stats = useMemo(() => {
    const activeDays = heat91.filter(v => v > 0).length;
    let maxStreak = 0;
    let streak = 0;
    heat91.forEach(v => {
      if (v > 0) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 0;
      }
    });
    const avg = heat91.reduce((a, b) => a + b, 0) / heat91.length;
    return { activeDays, maxStreak, avg: avg.toFixed(1) };
  }, [heat91]);

  /* ── Month labels positioned at correct column ── */
  const weekLabels = useMemo(() => {
    const labels: { text: string; col: number }[] = [];
    const start = new Date();
    start.setDate(start.getDate() - 90);
    let prev = -1;
    for (let w = 0; w < 13; w++) {
      const dd = new Date(start);
      dd.setDate(dd.getDate() + w * 7);
      if (dd.getMonth() !== prev) {
        prev = dd.getMonth();
        labels.push({
          text: dd.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
          col: w,
        });
      }
    }
    return labels;
  }, []);

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl p-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={13} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {title}
          </span>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="flex items-center gap-4 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-1.5">
          <Flame size={12} strokeWidth={1.8} className="text-zinc-500 dark:text-zinc-400" />
          <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
            {stats.activeDays}
          </span>
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
            /91 ativos
          </span>
        </div>
        <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
            {stats.maxStreak}d
          </span>
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
            melhor seq.
          </span>
        </div>
        <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
            {stats.avg}
          </span>
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
            média
          </span>
        </div>
      </div>

      {/* ── Month labels row ── */}
      <div className="flex">
        <div className="w-8 shrink-0" />
        <div className="flex-1 relative h-4 mb-1.5">
          {weekLabels.map((m, idx) => (
            <span
              key={idx}
              className="absolute text-[9px] font-mono font-medium text-zinc-500 dark:text-zinc-400 capitalize"
              style={{ left: `${(m.col / 13) * 100}%` }}
            >
              {m.text}
            </span>
          ))}
        </div>
      </div>

      {/* ── Grid area ── */}
      <div className="flex gap-2">
        {/* Day-of-week labels */}
        <div className="flex flex-col shrink-0 w-7" style={{ gap: 3 }}>
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="text-[8px] font-mono font-medium text-zinc-400 dark:text-zinc-500 leading-none flex items-center justify-end pr-0.5"
              style={{ height: 14 }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Cell grid — 13 weeks × 7 days */}
        <div
          className="grid flex-1"
          style={{
            gridTemplateRows: 'repeat(7, 14px)',
            gridAutoFlow: 'column',
            gridAutoColumns: '1fr',
            gap: '3px',
          }}
        >
          {heat91.map((level, i) => (
            <div
              key={i}
              className={`rounded-[3px] ${HEAT[level]} transition-colors`}
            />
          ))}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center justify-end gap-2 mt-3.5">
        <span className="text-[9px] font-mono font-medium text-zinc-400 dark:text-zinc-500">Menos</span>
        <div className="flex items-center gap-1">
          {HEAT.map((cls, i) => (
            <div key={i} className={`w-3 h-3 rounded-[3px] ${cls}`} />
          ))}
        </div>
        <span className="text-[9px] font-mono font-medium text-zinc-400 dark:text-zinc-500">Mais</span>
      </div>
    </div>
  );
}
