// =============================================================
// ORVAX · Life OS — Evolution Line Chart (recharts)
// Mostra série temporal + linha tracejada de meta.
// Accent: Verde Esmeralda #10B981 (strokeWidth=3, gradient vibrante).
// =============================================================
import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';

export interface EvolutionDatum {
  d:    string;   // YYYY-MM-DD
  v:    number;   // valor do dia
  cum?: number;   // cumulativo opcional
}

type Props = {
  data: EvolutionDatum[];
  target?: number;
  accent?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
  cumulative?: boolean;
};

const EMERALD = '#10B981';
const defaultFmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

export function EvolutionLine({
  data, target, accent, height = 220,
  valueFormatter = defaultFmt, cumulative,
}: Props) {
  const ink = accent || EMERALD;

  const dataset = React.useMemo(() => {
    if (!cumulative) return data;
    let acc = 0;
    return data.map((d) => { acc += d.v; return { ...d, cum: acc }; });
  }, [data, cumulative]);

  const key = cumulative ? 'cum' : 'v';

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={dataset} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={ink} stopOpacity={0.40} />
              <stop offset="55%"  stopColor={ink} stopOpacity={0.12} />
              <stop offset="100%" stopColor={ink} stopOpacity={0.00} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="rgba(113,113,122,0.15)" vertical={false} />

          <XAxis
            dataKey="d"
            tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#71717a', opacity: 0.8 }}
            tickFormatter={(v: string) => {
              const d = new Date(v + 'T00:00:00');
              return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            }}
            minTickGap={28}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#71717a', opacity: 0.8 }}
            tickFormatter={valueFormatter}
            axisLine={false}
            tickLine={false}
            width={56}
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
            labelFormatter={(v: string) =>
              new Date(v + 'T00:00:00').toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'short', year: 'numeric',
              })
            }
            formatter={(v: number) => [valueFormatter(v), cumulative ? 'Acumulado' : 'Valor']}
          />

          {target != null && target > 0 && (
            <ReferenceLine
              y={target}
              stroke={ink}
              strokeDasharray="4 3"
              strokeWidth={1.2}
              label={{
                value: `META ${valueFormatter(target)}`,
                position: 'insideTopRight',
                fontSize: 9,
                fontFamily: 'monospace',
                fill: ink,
                opacity: 0.85,
              }}
            />
          )}

          <Area
            type="natural"
            dataKey={key}
            stroke={ink}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="url(#colorGreen)"
            dot={false}
            activeDot={{ r: 5, stroke: ink, strokeWidth: 2, fill: '#18181b' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
