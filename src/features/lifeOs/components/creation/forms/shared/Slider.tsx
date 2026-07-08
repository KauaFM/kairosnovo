// =============================================================
// ORVAX · Slider — range 0..N com thumb esmeralda glow.
// Usado em Carreira (foco), Relações (qualidade), Sentido (paz), etc.
// =============================================================
import React from 'react';

const EMERALD = '#10B981';

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** se true, valor baixo é "bom" (ex: distração) → trilho preenche da direita */
  inverted?: boolean;
  className?: string;
}

export function Slider({
  value, onChange,
  min = 0, max = 10, step = 1,
  inverted, className,
}: Props) {
  const pct = ((value - min) / (max - min)) * 100;
  // valor "bom" → quanto da barra fica preenchido
  const fillPct = inverted ? 100 - pct : pct;

  return (
    <div className={['relative h-7 flex items-center', className || ''].join(' ')}>
      <div className="absolute inset-x-0 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div
        className="absolute h-1.5 rounded-full transition-all"
        style={{
          [inverted ? 'right' : 'left']: 0,
          width: `${fillPct}%`,
          backgroundColor: EMERALD,
        } as React.CSSProperties}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="orvax-slider relative w-full appearance-none bg-transparent cursor-pointer h-7 z-10"
      />
      <style>{`
        .orvax-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: ${EMERALD};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(16,185,129,0.45);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .orvax-slider::-webkit-slider-thumb:active { transform: scale(1.15); }
        .orvax-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: ${EMERALD};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(16,185,129,0.45);
          cursor: pointer;
        }
        .dark .orvax-slider::-webkit-slider-thumb { border-color: #18181b; }
        .dark .orvax-slider::-moz-range-thumb { border-color: #18181b; }
      `}</style>
    </div>
  );
}
