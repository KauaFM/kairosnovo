import type { DayPoint } from '../types';

export function LineArea({ data, height = 180 }: { data: DayPoint[]; height?: number }) {
  if (data.length === 0) return null;
  const w = 600, h = height;
  const padding = 20;
  const min = Math.min(...data.map((d) => d.value)) - 5;
  const max = Math.max(...data.map((d) => d.value)) + 5;
  const range = max - min || 1;
  const step = data.length > 1 ? (w - padding * 2) / (data.length - 1) : 0;
  const pts = data.map((d, i) => [data.length === 1 ? w / 2 : padding + i * step, padding + (h - padding * 2) - ((d.value - min) / range) * (h - padding * 2)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const area = data.length === 1 ? `${line} Z` : `${line} L${pts[pts.length - 1][0]},${h - padding} L${padding},${h - padding} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--pillar)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--pillar)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1={padding} x2={w - padding} y1={padding + (h - padding * 2) * p} y2={padding + (h - padding * 2) * p} stroke="var(--border)" strokeDasharray="2 4" />
      ))}
      <path d={area} fill="url(#line-grad)" />
      <path
        d={line}
        fill="none"
        stroke="var(--pillar)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: 'draw 1.6s ease-out forwards' }}
      />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill="var(--pillar)" style={{ animation: `fade-in 0.4s ease-out ${800 + i * 40}ms backwards` }} />
      ))}
      {data.map((d, i) => i % Math.ceil(data.length / 7) === 0 && (
        <text key={i} x={pts[i][0]} y={h - 4} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9 }}>
          {d.day}
        </text>
      ))}
    </svg>
  );
}
