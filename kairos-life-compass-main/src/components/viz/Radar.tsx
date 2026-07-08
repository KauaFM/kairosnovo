import type { AxisValue } from "@/lib/data-engine";

type Props = {
  axes: AxisValue[];
  axesPast?: AxisValue[];
  size?: number;
};

export function Radar({ axes, axesPast, size = 280 }: Props) {
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 36;
  const n = axes.length;

  const pointAt = (value: number, idx: number) => {
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    const dist = (value / 100) * r;
    return [cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist] as const;
  };

  const buildPath = (vals: AxisValue[]) =>
    vals.map((a, i) => {
      const [x, y] = pointAt(a.value, i);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    }).join(" ") + " Z";

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-md mx-auto">
      {rings.map((rr, i) => (
        <polygon
          key={i}
          points={axes.map((_, idx) => {
            const a = (Math.PI * 2 * idx) / n - Math.PI / 2;
            return `${cx + Math.cos(a) * r * rr},${cy + Math.sin(a) * r * rr}`;
          }).join(" ")}
          fill="none"
          stroke="var(--border)"
          strokeWidth="1"
          opacity={0.6}
        />
      ))}
      {axes.map((_, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + Math.cos(a) * r}
            y2={cy + Math.sin(a) * r}
            stroke="var(--border)"
            strokeWidth="1"
            opacity={0.4}
          />
        );
      })}

      {axesPast && (
        <path
          d={buildPath(axesPast)}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          opacity={0.6}
        />
      )}

      <path
        d={buildPath(axes)}
        fill="var(--pillar)"
        fillOpacity={0.18}
        stroke="var(--pillar)"
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ animation: "scale-in 0.8s cubic-bezier(0.16,1,0.3,1)" }}
      />
      {axes.map((a, i) => {
        const [x, y] = pointAt(a.value, i);
        return <circle key={i} cx={x} cy={y} r={3.5} fill="var(--pillar)" />;
      })}

      {axes.map((a, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (r + 22);
        const ly = cy + Math.sin(angle) * (r + 22);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
