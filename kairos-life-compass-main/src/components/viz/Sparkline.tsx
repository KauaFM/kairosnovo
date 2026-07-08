export function Sparkline({ data, className = "", height = 48 }: { data: number[]; className?: string; height?: number }) {
  if (data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 200, h = height;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 6) - 3}`).join(" ");
  const area = `0,${h} ${points} ${w},${h}`;
  const id = `spark-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full ${className}`} style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--pillar)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--pillar)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={points}
        fill="none"
        stroke="var(--pillar)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 1000, strokeDashoffset: 1000, animation: "draw 1.4s ease-out forwards" }}
      />
    </svg>
  );
}
