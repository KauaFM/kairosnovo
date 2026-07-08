// =============================================================
// ORVAX · Life OS — IncomeExpenseArea
// Receita: Verde Esmeralda #10B981 (stroke 2.5 + gradient vibrante)
// Despesa: cinza neutro tracejado (stroke 1.5 + gradient sutil)
// Sem linha de saldo para manter visual limpo.
// =============================================================
import React from 'react';
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export interface Datum {
  d:       string;
  income:  number;
  expense: number;
}

type Props = {
  data: Datum[];
  height?: number;
};

const EMERALD = '#10B981';
const GRAY    = '#71717a';

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function IncomeExpenseArea({ data, height = 240 }: Props) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <defs>
            {/* Receita — gradiente esmeralda vibrante */}
            <linearGradient id="grad-income" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={EMERALD} stopOpacity={0.40} />
              <stop offset="55%"  stopColor={EMERALD} stopOpacity={0.10} />
              <stop offset="100%" stopColor={EMERALD} stopOpacity={0.00} />
            </linearGradient>
            {/* Despesa — gradiente cinza sutil */}
            <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={GRAY} stopOpacity={0.18} />
              <stop offset="100%" stopColor={GRAY} stopOpacity={0.00} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="rgba(113,113,122,0.12)" vertical={false} />

          <XAxis
            dataKey="d"
            tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#71717a' }}
            tickFormatter={(v: string) => {
              const d = new Date(v + 'T00:00:00');
              return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            }}
            minTickGap={28}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#71717a' }}
            tickFormatter={(v: number) =>
              `R$${Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`
            }
            axisLine={false}
            tickLine={false}
            width={52}
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
            formatter={(v: number, k: string) =>
              [fmt(v), k === 'income' ? '↑ Receita' : '↓ Despesa']
            }
          />

          <Legend
            iconType="plainline"
            wrapperStyle={{ fontFamily: 'monospace', fontSize: 10, opacity: 0.75 }}
            formatter={(v) => v === 'income' ? 'RECEITA' : 'DESPESA'}
          />

          {/* Despesa — cinza tracejado (atrás) */}
          <Area
            type="natural"
            dataKey="expense"
            stroke={GRAY}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            strokeOpacity={0.55}
            fill="url(#grad-expense)"
            name="expense"
            dot={false}
          />

          {/* Receita — esmeralda vibrante (na frente) */}
          <Area
            type="natural"
            dataKey="income"
            stroke={EMERALD}
            strokeWidth={2.5}
            fill="url(#grad-income)"
            name="income"
            dot={false}
            activeDot={{ r: 5, stroke: EMERALD, strokeWidth: 2, fill: '#18181b' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
