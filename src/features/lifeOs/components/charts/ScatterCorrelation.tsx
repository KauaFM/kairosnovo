// =============================================================
// ORVAX · ScatterCorrelation — Scatter + trend line + r label
// Recharts ScatterChart com regressão linear visual.
// =============================================================
import React, { useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Line as ReLine,
  ReferenceLine,
} from 'recharts';

const T_MUTED = 'text-zinc-400 dark:text-zinc-500';

interface Props {
  data: Array<{ x: number; y: number }>;
  xLabel: string;
  yLabel: string;
  accent: string;
  pearson: number;
  height?: number;
}

function corrStrength(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.7) return 'alta';
  if (abs >= 0.4) return 'moderada';
  return 'fraca';
}

export function ScatterCorrelation({ data, xLabel, yLabel, accent, pearson, height = 200 }: Props) {
  // Compute linear regression for trend line
  const trendLine = useMemo(() => {
    const n = data.length;
    if (n < 2) return [];
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    data.forEach(d => {
      sx += d.x; sy += d.y;
      sxy += d.x * d.y;
      sxx += d.x * d.x;
    });
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const intercept = (sy - slope * sx) / n;

    const xMin = Math.min(...data.map(d => d.x));
    const xMax = Math.max(...data.map(d => d.x));
    return [
      { x: xMin, y: Math.round(slope * xMin + intercept) },
      { x: xMax, y: Math.round(slope * xMax + intercept) },
    ];
  }, [data]);

  const direction = pearson > 0 ? '↑ positiva' : '↓ inversa';

  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="rgba(113,113,122,0.12)" />
            <XAxis
              type="number"
              dataKey="x"
              name={xLabel}
              tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yLabel}
              tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: accent }}
              contentStyle={{
                background: 'rgba(24,24,27,0.96)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 14, padding: '8px 12px',
                fontFamily: 'monospace', fontSize: 11, color: '#fafafa',
              }}
              formatter={(v: number, name: string) => [`${v}`, name]}
            />
            <Scatter
              data={data}
              fill={accent}
              fillOpacity={0.7}
              isAnimationActive
              animationDuration={800}
            />
            {/* Trend line overlay via reference */}
            {trendLine.length === 2 && (
              <ReferenceLine
                segment={[
                  { x: trendLine[0].x, y: trendLine[0].y },
                  { x: trendLine[1].x, y: trendLine[1].y },
                ]}
                stroke={accent}
                strokeDasharray="6 3"
                strokeWidth={1.5}
                strokeOpacity={0.6}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {/* Correlation label */}
      <div className="mt-2 flex items-center justify-between">
        <p className={`text-[10px] font-mono tracking-wider ${T_MUTED}`}>
          {xLabel} → {yLabel}
        </p>
        <p className={`text-[10px] font-mono font-bold tabular-nums`} style={{ color: accent }}>
          r = {pearson.toFixed(2)} · {corrStrength(pearson)} · {direction}
        </p>
      </div>
    </div>
  );
}
