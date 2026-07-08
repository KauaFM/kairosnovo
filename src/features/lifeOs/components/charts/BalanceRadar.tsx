// =============================================================
// ORVAX · Life OS — Balance Radar (recharts)
// Compara eixos arbitrários (ex: categorias de despesa) em escala
// 0..100 normalizada, com série "atual" vs "anterior".
// =============================================================
import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export interface RadarAxis {
  label: string;
  current: number;
  previous?: number;
}

type Props = {
  axes: RadarAxis[];
  accent?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
};

export function BalanceRadar({
  axes, accent, height = 260,
  valueFormatter = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
}: Props) {
  // sem accent → MONO (usa currentColor da tinta do tema)
  const useInk = !accent;
  const strokeCurrent = useInk ? 'currentColor' : accent;
  if (axes.length < 3) {
    return (
      <div className="py-10 text-center text-[10px] font-mono text-zinc-500">
        precisa 3+ eixos pra gerar equilíbrio
      </div>
    );
  }

  // normaliza pra 0..100 pra radar ficar visualmente legível
  const max = Math.max(1, ...axes.flatMap((a) => [a.current, a.previous || 0]));
  const data = axes.map((a) => ({
    label: a.label,
    atual: Math.round(((a.current || 0) / max) * 100),
    anterior: Math.round(((a.previous || 0) / max) * 100),
    rawCurrent: a.current,
    rawPrevious: a.previous || 0,
  }));

  return (
    <div style={{ width: '100%', height }} className="text-zinc-900 dark:text-zinc-100">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="currentColor" strokeOpacity={0.15} />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'currentColor', opacity: 0.7 }}
          />
          <PolarRadiusAxis
            tick={false}
            axisLine={false}
            stroke="currentColor"
            strokeOpacity={0.12}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(24,24,27,0.96)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14,
              padding: '8px 12px',
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#fafafa',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
            }}
            formatter={(_v, name, entry: any) => {
              const raw = name === 'atual' ? entry?.payload?.rawCurrent : entry?.payload?.rawPrevious;
              return [valueFormatter(Number(raw ?? 0)), name === 'atual' ? 'Atual' : 'Anterior'];
            }}
          />
          <Radar
            name="anterior"
            dataKey="anterior"
            stroke="currentColor"
            strokeOpacity={0.45}
            strokeDasharray="3 3"
            fill="currentColor"
            fillOpacity={0.04}
          />
          <Radar
            name="atual"
            dataKey="atual"
            stroke={strokeCurrent}
            strokeWidth={1.8}
            strokeLinejoin="round"
            fill={strokeCurrent}
            fillOpacity={useInk ? 0.16 : 0.22}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontFamily: 'monospace', fontSize: 10, opacity: 0.75 }}
            formatter={(v) => String(v).toUpperCase()}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
