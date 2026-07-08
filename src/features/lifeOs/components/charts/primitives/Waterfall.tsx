// =============================================================
// ORVAX · Waterfall — fluxo financeiro acumulado.
// Entrada → gastos categóricos → saldo final.
// SVG puro · sem dependências · barras steppadas com conectores.
//
// Usado em FinanceAnalysis para storytelling visual:
//   "Você ganhou X · gastou Y nas categorias · sobrou Z"
// =============================================================
import React, { useMemo } from 'react';

const EMERALD = '#10B981';
const ROSE    = '#f43f5e';
const ZINC    = '#71717a';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

export type WaterfallKind = 'income' | 'expense' | 'total';

export interface WaterfallStep {
  /** label · "Salário", "Mercado", "Saldo final" etc */
  label: string;
  /** valor positivo · use kind para distinguir income vs expense */
  value: number;
  kind:  WaterfallKind;
}

interface Props {
  steps: WaterfallStep[];
  /** altura do gráfico */
  height?: number;
  /** formatter para tooltips e labels · default BRL inteiro */
  formatter?: (n: number) => string;
  className?: string;
}

const defaultFmt = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

interface ComputedStep {
  label:    string;
  kind:     WaterfallKind;
  value:    number;
  /** valor cumulativo após este step */
  runningTotal: number;
  /** topo da barra (em valor) */
  top:      number;
  /** base da barra (em valor) */
  base:     number;
}

export function Waterfall({
  steps, height = 240, formatter = defaultFmt, className,
}: Props) {
  const { computed, maxAbs, finalTotal } = useMemo(() => {
    let running = 0;
    const computed: ComputedStep[] = steps.map((s) => {
      if (s.kind === 'total') {
        return {
          label:    s.label,
          kind:     s.kind,
          value:    running,
          runningTotal: running,
          top:      Math.max(running, 0),
          base:     Math.min(running, 0),
        };
      }
      const delta = s.kind === 'income' ? s.value : -s.value;
      const next  = running + delta;
      const step: ComputedStep = {
        label: s.label,
        kind:  s.kind,
        value: s.value,
        runningTotal: next,
        top:   Math.max(running, next),
        base:  Math.min(running, next),
      };
      running = next;
      return step;
    });
    const max = Math.max(...computed.map(c => Math.max(Math.abs(c.top), Math.abs(c.base))), 1);
    return { computed, maxAbs: max, finalTotal: running };
  }, [steps]);

  // Margens internas
  const padTop    = 14;
  const padBottom = 28;
  const padLeft   = 0;
  const usableH   = height - padTop - padBottom;

  // Layout horizontal
  const colW   = 100 / computed.length;       // %
  const barW   = colW * 0.6;
  const gapW   = colW * 0.4;

  // Mapeia valor → y · clampado entre [0, maxAbs * 1.05]
  const yOf = (v: number) => {
    const ratio = v / maxAbs;
    return padTop + (1 - ratio) * usableH * 0.9; // top
  };
  const baselineY = padTop + 0.92 * usableH;     // y onde valor = 0

  return (
    <div className={['w-full', className || ''].join(' ')}>
      <svg
        viewBox={`0 0 100 ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {/* Baseline · linha do zero */}
        <line
          x1={0} x2={100}
          y1={baselineY} y2={baselineY}
          stroke="rgba(113,113,122,0.25)"
          strokeWidth={0.3}
          strokeDasharray="0.6 0.6"
        />

        {computed.map((c, i) => {
          const cx     = i * colW + colW / 2;
          const x      = cx - barW / 2;
          const yTop   = yOf(c.top);
          const yBase  = c.kind === 'total' ? baselineY : yOf(c.base);
          const h      = Math.max(2, yBase - yTop);
          const fill   =
            c.kind === 'income' ? EMERALD :
            c.kind === 'expense' ? ROSE :
            (c.runningTotal >= 0 ? EMERALD : ROSE);
          const opacity = c.kind === 'total' ? 1 : 0.85;
          const isFinalTotal = c.kind === 'total';

          return (
            <g key={i}>
              {/* Conector horizontal · runningTotal entre passos */}
              {i < computed.length - 1 && c.kind !== 'total' && (
                <line
                  x1={cx + barW / 2}
                  x2={(i + 1) * colW + colW / 2 - barW / 2}
                  y1={yOf(c.runningTotal)}
                  y2={yOf(c.runningTotal)}
                  stroke={ZINC}
                  strokeWidth={0.2}
                  strokeDasharray="0.4 0.4"
                  opacity={0.5}
                />
              )}

              {/* Barra principal */}
              <rect
                x={x}
                y={yTop}
                width={barW}
                height={h}
                rx={0.6}
                fill={fill}
                fillOpacity={opacity}
              >
                <title>{`${c.label}: ${formatter(c.value)}${c.kind !== 'total' ? ` · saldo após: ${formatter(c.runningTotal)}` : ''}`}</title>
              </rect>

              {/* Outline mais forte no total final */}
              {isFinalTotal && (
                <rect
                  x={x - 0.3}
                  y={yTop - 0.3}
                  width={barW + 0.6}
                  height={h + 0.6}
                  rx={0.8}
                  fill="none"
                  stroke={fill}
                  strokeWidth={0.4}
                  strokeOpacity={0.6}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Labels HTML · sob cada coluna */}
      <div className="grid mt-2" style={{ gridTemplateColumns: `repeat(${computed.length}, 1fr)` }}>
        {computed.map((c, i) => {
          const isPositive = c.kind === 'income' || (c.kind === 'total' && c.runningTotal >= 0);
          const colorCls   =
            c.kind === 'income' ? 'text-emerald-600 dark:text-emerald-400' :
            c.kind === 'expense' ? 'text-rose-600 dark:text-rose-400' :
            (c.runningTotal >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400');
          return (
            <div key={i} className="flex flex-col items-center min-w-0 px-1">
              <span className={`text-[9px] font-mono tracking-wider uppercase ${T_LABEL} truncate max-w-full text-center`}>
                {c.label}
              </span>
              <span className={[
                'text-[11px] font-mono font-bold tabular-nums truncate max-w-full',
                colorCls,
                c.kind === 'total' ? 'mt-0.5' : '',
              ].join(' ')}>
                {c.kind === 'expense' ? '−' : c.kind === 'income' ? '+' : ''}
                {formatter(c.value)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer · runningTotal final */}
      <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <span className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL}`}>
          Saldo final
        </span>
        <span className={[
          'text-[16px] font-mono font-bold tabular-nums',
          finalTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
        ].join(' ')}>
          {finalTotal >= 0 ? '+' : '−'}{formatter(Math.abs(finalTotal))}
        </span>
      </div>
    </div>
  );
}
