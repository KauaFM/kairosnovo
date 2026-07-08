type Point = { label: string; value: number; year: number };

export function MultiYearLine({ data, height = 160 }: { data: Point[]; height?: number }) {
  if (data.length === 0) return null;
  const w = 600, h = height;
  const padX = 8, padY = 22;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const range = max - min || 1;
  const step = (w - padX * 2) / (data.length - 1);
  const pts = data.map((d, i) => [
    padX + i * step,
    padY + (h - padY * 2) - ((d.value - min) / range) * (h - padY * 2),
  ] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${h - padY} L${padX},${h - padY} Z`;

  // Marcadores de ano
  const yearMarkers = data
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => i === 0 || d.year !== data[i - 1].year);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
      <defs>
        <linearGradient id="myl-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--success)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1={padX} x2={w - padX}
          y1={padY + (h - padY * 2) * p} y2={padY + (h - padY * 2) * p}
          stroke="var(--border)" strokeDasharray="2 4" opacity={0.6} />
      ))}
      <path d={area} fill="url(#myl-grad)" />
      <path d={line} fill="none" stroke="var(--success)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 2400, strokeDashoffset: 2400, animation: "draw 1.6s ease-out forwards" }} />
      {yearMarkers.map(({ d, i }) => (
        <g key={i}>
          <circle cx={pts[i][0]} cy={pts[i][1]} r={3} fill="var(--success)"
            style={{ animation: `fade-in 0.4s ease-out ${800 + i * 30}ms backwards` }} />
          <text x={pts[i][0]} y={h - 4} textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 9, letterSpacing: "0.08em" }}>
            {d.year}
          </text>
        </g>
      ))}
    </svg>
  );
}
