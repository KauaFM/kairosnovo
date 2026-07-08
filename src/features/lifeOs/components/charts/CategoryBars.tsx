// =============================================================
// ORVAX · Life OS — CategoryBars (barras verticais ranqueadas)
// Verde Esmeralda #10B981 com gradiente de opacidade por rank.
// Vertical: categoria no X, valor no Y, barras altas arredondadas.
// =============================================================
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

type Datum = { label: string; value: number };

type Props = {
  data: Datum[];
  accent?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
};

const EMERALD = '#10B981';

const defaultFmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function CategoryBars({
  data, accent, height = 220,
  valueFormatter = defaultFmt,
}: Props) {
  if (!data.length) {
    return <p className="text-[10px] font-mono text-zinc-500 py-6 text-center">sem categorias ainda</p>;
  }

  const ink = accent || EMERALD;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="horizontal"
          margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
          barCategoryGap="28%"
        >
          <XAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#71717a' }}
            tickFormatter={(v: string) => v.toUpperCase().slice(0, 6)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="number"
            hide
            domain={[0, max * 1.12]}
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
            cursor={{ fill: 'rgba(16,185,129,0.06)' }}
            formatter={(v: number) => [valueFormatter(v), 'Total']}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => {
              // rank descendente: primeiro item = mais alto = mais vibrante
              const t = 1 - i / Math.max(data.length - 1, 1);
              const opacity = 0.30 + t * 0.70;
              return (
                <Cell key={d.label} fill={ink} fillOpacity={opacity} />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
