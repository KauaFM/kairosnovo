// =============================================================
// ORVAX · ExecutionTimeline — timeline horizontal do dia (24h)
// Blocos coloridos · cada bloco tem hora início/fim, label e tom.
// Usado em deep dives para mostrar onde o tempo foi gasto.
// =============================================================
import React, { useMemo } from 'react';

const T_LABEL = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED = 'text-zinc-400 dark:text-zinc-500';
const T_STRONG = 'text-zinc-900 dark:text-zinc-50';

export type BlockTone = 'productive' | 'neutral' | 'drain';

export interface TimelineBlock {
  start: number;     // 0..24 (decimal · 8.5 = 08:30)
  end:   number;     // 0..24
  label: string;
  tone:  BlockTone;
  /** opcional · número complementar mostrado no tooltip/legend */
  meta?: string;
}

interface Props {
  /** lista de blocos · ordem irrelevante */
  blocks: TimelineBlock[];
  /** janela visível · default 06h → 24h */
  startHour?: number;
  endHour?:   number;
  className?: string;
}

const TONE_CLASS: Record<BlockTone, string> = {
  productive: 'bg-emerald-500',
  neutral:    'bg-zinc-300 dark:bg-zinc-700',
  drain:      'bg-rose-300 dark:bg-rose-900/70',
};

const TONE_LABEL: Record<BlockTone, string> = {
  productive: 'Produtivo',
  neutral:    'Neutro',
  drain:      'Vazamento',
};

export function ExecutionTimeline({
  blocks, startHour = 6, endHour = 24, className,
}: Props) {
  const span = endHour - startHour;

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.start - b.start),
    [blocks],
  );

  // Calcular totais por tom para legenda
  const totals = useMemo(() => {
    const t: Record<BlockTone, number> = { productive: 0, neutral: 0, drain: 0 };
    blocks.forEach(b => { t[b.tone] += (b.end - b.start); });
    return t;
  }, [blocks]);

  // Gerar marcações de hora · a cada 3h
  const ticks = useMemo(() => {
    const arr: number[] = [];
    for (let h = startHour; h <= endHour; h += 3) arr.push(h);
    return arr;
  }, [startHour, endHour]);

  return (
    <div className={['w-full', className || ''].join(' ')}>
      {/* Eixo de horas */}
      <div className="relative h-4">
        {ticks.map(h => {
          const pct = ((h - startHour) / span) * 100;
          return (
            <span
              key={h}
              className={`absolute text-[8.5px] font-mono tracking-wider ${T_MUTED}`}
              style={{
                left: `${pct}%`,
                transform: h === startHour ? 'translateX(0)' : h === endHour ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              {String(h).padStart(2, '0')}h
            </span>
          );
        })}
      </div>

      {/* Trilha de blocos */}
      <div className="relative h-7 mt-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 overflow-hidden">
        {sortedBlocks.map((b, i) => {
          const left  = ((Math.max(b.start, startHour) - startHour) / span) * 100;
          const width = ((Math.min(b.end, endHour) - Math.max(b.start, startHour)) / span) * 100;
          if (width <= 0) return null;
          return (
            <div
              key={i}
              className={[
                'absolute top-0 bottom-0 transition-all',
                TONE_CLASS[b.tone],
                'hover:scale-y-110 hover:z-10 origin-center',
              ].join(' ')}
              style={{
                left:  `${left}%`,
                width: `${width}%`,
                opacity: b.tone === 'productive' ? 0.92 : 0.85,
              }}
              title={`${formatHour(b.start)}–${formatHour(b.end)} · ${b.label}${b.meta ? ' · ' + b.meta : ''}`}
            />
          );
        })}
        {/* "agora" reference line */}
        <NowMarker startHour={startHour} endHour={endHour} />
      </div>

      {/* Labels textual abaixo · só os blocos > 30min */}
      <div className="relative h-4 mt-1">
        {sortedBlocks.filter(b => b.end - b.start >= 0.5).map((b, i) => {
          const center = ((b.start + b.end) / 2 - startHour) / span * 100;
          return (
            <span
              key={i}
              className={`absolute text-[8.5px] font-mono tracking-wider uppercase ${T_LABEL} truncate`}
              style={{
                left: `${center}%`,
                transform: 'translateX(-50%)',
                maxWidth: `${(b.end - b.start) / span * 100 + 5}%`,
              }}
            >
              {b.label}
            </span>
          );
        })}
      </div>

      {/* Legenda total · 3 tons */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(['productive', 'neutral', 'drain'] as const).map(tone => (
          <div key={tone} className="flex items-center gap-2">
            <span className={['w-2.5 h-2.5 rounded-sm', TONE_CLASS[tone]].join(' ')} />
            <div className="flex-1 min-w-0">
              <p className={`text-[9px] font-mono tracking-wider uppercase ${T_LABEL}`}>
                {TONE_LABEL[tone]}
              </p>
              <p className={`text-[12px] font-bold tabular-nums ${T_STRONG}`}>
                {formatDuration(totals[tone])}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NowMarker({ startHour, endHour }: { startHour: number; endHour: number }) {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < startHour || h > endHour) return null;
  const pct = ((h - startHour) / (endHour - startHour)) * 100;
  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-zinc-900 dark:bg-zinc-100"
      style={{ left: `${pct}%`, opacity: 0.55 }}
    >
      <span className="absolute -top-1 -left-[3px] w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
    </div>
  );
}

function formatHour(h: number) {
  const hours = Math.floor(h);
  const mins  = Math.round((h - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatDuration(hours: number) {
  if (hours <= 0) return '0m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}
