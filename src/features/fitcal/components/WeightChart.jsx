import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

const WeightChart = ({ data = [] }) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-6 opacity-40">
        <p className="text-[10px] font-mono tracking-wider">SEM DADOS DE PESO</p>
      </div>
    );
  }

  const weights = data.map((d) => d.weight_kg);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const first = weights[0];
  const last = weights[weights.length - 1];
  const diff = (last - first).toFixed(1);
  const trend = diff < 0 ? 'down' : diff > 0 ? 'up' : 'stable';

  // Simple SVG line chart
  const width = 300;
  const height = 80;
  const padding = 4;
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((d.weight_kg - minW) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="p-3 rounded-sm border" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono font-bold tracking-wider opacity-60">EVOLUCAO DE PESO</span>
        <div className="flex items-center gap-1">
          {trend === 'down' && <TrendingDown size={12} className="text-[#22c55e]" />}
          {trend === 'up' && <TrendingUp size={12} className="text-[#ef4444]" />}
          {trend === 'stable' && <Minus size={12} className="opacity-40" />}
          <span className={`text-[11px] font-mono font-bold ${trend === 'down' ? 'text-[#22c55e]' : trend === 'up' ? 'text-[#ef4444]' : 'opacity-50'}`}>
            {diff > 0 ? '+' : ''}{diff}kg
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: '80px' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <line key={i} x1={padding} x2={width - padding}
            y1={padding + pct * (height - 2 * padding)}
            y2={padding + pct * (height - 2 * padding)}
            stroke="var(--border-color)" strokeWidth="0.5" opacity="0.3" />
        ))}
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
          const y = height - padding - ((d.weight_kg - minW) / range) * (height - 2 * padding);
          return <circle key={i} cx={x} cy={y} r="2.5" fill="#22c55e" />;
        })}
      </svg>

      <div className="flex justify-between mt-2 text-[8px] font-mono opacity-30">
        <span>{data[0]?.log_date}</span>
        <span>{data[data.length - 1]?.log_date}</span>
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[10px] font-mono opacity-50">{last}kg <span className="opacity-30">(atual)</span></span>
      </div>
    </div>
  );
};

export default WeightChart;
