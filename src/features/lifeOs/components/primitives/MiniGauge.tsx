// =============================================================
// ORVAX · Life OS — MiniGauge
// Arco semicircular suave (pílula).
// Trilho: zinc neutro. Preenchimento: Verde Esmeralda #10B981.
// =============================================================
import React from 'react';

const EMERALD = '#10B981';

type Props = {
  /** 0..100 */
  value: number;
  label: string;
  hint?: string;
  /** mostra número grande ao centro */
  display?: string;
  size?: number; // px
};

export function MiniGauge({ value, label, hint, display, size = 120 }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const R    = 36;
  const CIRC = Math.PI * R; // meio círculo
  const dash = (pct / 100) * CIRC;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size * 0.66 }}>
        <svg
          viewBox="0 0 100 60"
          className="w-full h-full overflow-visible"
        >
          {/* trilho de fundo — zinc neutro */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#3f3f46"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* glow sutil atrás do arco ativo */}
          {pct > 0 && (
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke={EMERALD}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRC}`}
              strokeOpacity={0.18}
              style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
            />
          )}
          {/* preenchimento — Verde Esmeralda */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={EMERALD}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span
            className="text-[18px] font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            {display ?? `${pct}%`}
          </span>
        </div>
      </div>
      <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-500 text-center leading-tight">
        {label}
      </span>
      {hint && (
        <span className="text-[9px] font-mono text-zinc-400 text-center">{hint}</span>
      )}
    </div>
  );
}
