// =============================================================
// ORVAX · Life OS — Execution Map (heatmap estilo GitHub)
// 7 linhas × N colunas com quadradinhos arredondados.
// Escala de cor: Verde Esmeralda (#10B981) por intensidade.
// =============================================================
import React, { useMemo, useState } from 'react';

export interface HeatCell {
  d:   string;
  c:   number;
  net?:number;
}

type Props = {
  cells: HeatCell[];
  accent?: string;
  range?: 30 | 90 | 180 | 365;
};

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const WD = ['D','S','T','Q','Q','S','S'];

// Escala esmeralda por nível 0..4
// Dia sem atividade: zinc neutro. Atividade cresce de emerald-900 até emerald-400.
const EMERALD_SCALE_DARK  = ['#27272a', '#064e3b', '#065f46', '#10b981', '#34d399'];
const EMERALD_SCALE_LIGHT = ['#f4f4f5', '#d1fae5', '#6ee7b7', '#10b981', '#059669'];

const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function ExecutionMap({ cells, range = 365 }: Props) {
  const [hover, setHover] = useState<HeatCell | null>(null);
  // Detecta dark mode via classe no <html>
  const [isDark, setIsDark] = React.useState(
    () => document.documentElement.classList.contains('dark')
  );
  React.useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const scale = isDark ? EMERALD_SCALE_DARK : EMERALD_SCALE_LIGHT;

  const trimmed = useMemo(() => cells.slice(-range), [cells, range]);

  const weeks = useMemo(() => {
    if (!trimmed.length) return [] as (HeatCell | null)[][];
    const first = new Date(trimmed[0].d + 'T00:00:00');
    const firstWd = first.getDay();
    const padded: (HeatCell | null)[] = [];
    for (let i = 0; i < firstWd; i++) padded.push(null);
    padded.push(...trimmed);
    const out: (HeatCell | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) out.push(padded.slice(i, i + 7));
    return out;
  }, [trimmed]);

  const monthLabels = useMemo(() => {
    const labels: { idx: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((w, i) => {
      const first = w.find((c) => c);
      if (!first) return;
      const m = new Date(first.d + 'T00:00:00').getMonth();
      if (m !== lastMonth) {
        labels.push({ idx: i, label: MONTHS[m] });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  const cellSize = 11;
  const radius   = 3;
  const gap      = 3;
  const cols     = weeks.length;
  const width    = cols * (cellSize + gap);
  const rowHeight = cellSize + gap;
  const gridHeight = rowHeight * 7;

  return (
    <div className="relative">
      {hover && (
        <div
          className="absolute z-10 pointer-events-none px-2.5 py-1.5 rounded-xl text-[10px] font-mono bg-zinc-900 text-zinc-100 border border-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]"
          style={{ left: 4, top: -34 }}
        >
          {new Date(hover.d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          {' · '}
          <span className="font-bold">{hover.c} lançamento{hover.c !== 1 ? 's' : ''}</span>
          {typeof hover.net === 'number' && (
            <span className="opacity-70"> · {fmtBRL(hover.net)}</span>
          )}
        </div>
      )}

      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="relative" style={{ width }}>
          {/* Month labels */}
          <div className="relative" style={{ height: 16 }}>
            {monthLabels.map((m) => (
              <span
                key={`${m.idx}-${m.label}`}
                className="absolute text-[9px] font-mono tracking-wider text-zinc-500 dark:text-zinc-400 uppercase"
                style={{ left: m.idx * (cellSize + gap) }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex" style={{ height: gridHeight, gap }}>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap }}>
                {Array.from({ length: 7 }).map((_, di) => {
                  const cell = week[di];
                  if (!cell) {
                    return <div key={di} style={{ width: cellSize, height: cellSize }} />;
                  }
                  const level = Math.max(0, Math.min(4, cell.c));
                  return (
                    <div
                      key={di}
                      onMouseEnter={() => setHover(cell)}
                      onMouseLeave={() => setHover(null)}
                      className="cursor-pointer transition-transform hover:scale-125"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: radius,
                        backgroundColor: scale[level],
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Weekday labels */}
          <div className="absolute -left-6 top-4 flex flex-col" style={{ gap }}>
            {WD.map((w, i) => (
              <span
                key={i}
                className="text-[8px] font-mono text-zinc-500 leading-[11px]"
                style={{ height: cellSize, visibility: i === 1 || i === 3 || i === 5 ? 'visible' : 'hidden' }}
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-[9px] font-mono text-zinc-500 dark:text-zinc-400 tracking-wider">
        <span>MENOS</span>
        {scale.map((color, i) => (
          <span
            key={i}
            style={{ width: cellSize, height: cellSize, borderRadius: radius, backgroundColor: color, display: 'inline-block' }}
          />
        ))}
        <span>MAIS</span>
        <span className="ml-auto">{range} DIAS</span>
      </div>
    </div>
  );
}
