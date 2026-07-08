import type { ScatterPoint } from "@/lib/data-engine";

export function Scatter({ points, xLabel, yLabel, correlation }: { points: ScatterPoint[]; xLabel: string; yLabel: string; correlation: number }) {
  const w = 500, h = 280;
  const pad = 36;
  const minX = 0, maxX = 100, minY = 0, maxY = 100;
  const sx = (x: number) => pad + (x / (maxX - minX)) * (w - pad * 2);
  const sy = (y: number) => h - pad - (y / (maxY - minY)) * (h - pad * 2);

  // Linha de regressão simples
  const meanX = points.reduce((s, p) => s + p.x, 0) / points.length;
  const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;
  let num = 0, den = 0;
  for (const p of points) { num += (p.x - meanX) * (p.y - meanY); den += (p.x - meanX) ** 2; }
  const slope = num / den;
  const intercept = meanY - slope * meanX;

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--border)" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="var(--border)" />

        <line
          x1={sx(0)} y1={sy(intercept)}
          x2={sx(100)} y2={sy(intercept + slope * 100)}
          stroke="var(--pillar)" strokeDasharray="4 4" strokeWidth="1.5" opacity={0.7}
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={sx(p.x)} cy={sy(p.y)} r={3.5}
            fill="var(--pillar)" fillOpacity={0.7}
            style={{ animation: `scale-in 0.4s ease-out ${i * 25}ms backwards` }}
          />
        ))}

        <text x={w / 2} y={h - 8} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.1em" }}>
          {xLabel.toUpperCase()}
        </text>
        <text x={12} y={h / 2} textAnchor="middle" transform={`rotate(-90 12 ${h / 2})`} className="fill-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.1em" }}>
          {yLabel.toUpperCase()}
        </text>
      </svg>
      <div className="text-xs text-muted-foreground">
        Correlação: <span className="text-pillar tabular font-medium">r = {correlation.toFixed(2)}</span>
        {Math.abs(correlation) > 0.6 ? " · forte" : Math.abs(correlation) > 0.3 ? " · moderada" : " · fraca"}
      </div>
    </div>
  );
}
