type Axis = { label: string; value: number; valuePast?: number };

export function RadarGlobal({ axes, size = 280 }: { axes: Axis[]; size?: number }) {
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 38;
  const n = axes.length;

  const point = (val: number, idx: number) => {
    const a = (Math.PI * 2 * idx) / n - Math.PI / 2;
    const d = (val / 100) * r;
    return [cx + Math.cos(a) * d, cy + Math.sin(a) * d] as const;
  };
  const path = (vals: number[]) =>
    vals.map((v, i) => {
      const [x, y] = point(v, i);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    }).join(" ") + " Z";

  const rings = [0.25, 0.5, 0.75, 1];
  const now = axes.map((a) => a.value);
  const past = axes.map((a) => a.valuePast ?? a.value);
  const hasPast = axes.some((a) => a.valuePast !== undefined);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
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
          opacity={0.55}
        />
      ))}
      {axes.map((_, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + Math.cos(a) * r}
            y2={cy + Math.sin(a) * r}
            stroke="var(--border)" strokeWidth="1" opacity={0.35}
          />
        );
      })}

      {hasPast && (
        <path d={path(past)} fill="none"
          stroke="var(--muted-foreground)" strokeWidth="1.2"
          strokeDasharray="3 3" opacity={0.55} />
      )}

      <path d={path(now)}
        fill="var(--success)" fillOpacity={0.12}
        stroke="var(--success)" strokeWidth="1.8" strokeLinejoin="round"
        style={{ animation: "scale-in 0.7s cubic-bezier(0.16,1,0.3,1)" }} />

      {axes.map((a, i) => {
        const [x, y] = point(a.value, i);
        return <circle key={i} cx={x} cy={y} r={2.5} fill="var(--success)" />;
      })}

      {axes.map((a, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (r + 22);
        const ly = cy + Math.sin(angle) * (r + 22);
        return (
          <text key={i} x={lx} y={ly}
            textAnchor="middle" dominantBaseline="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 9, letterSpacing: "0.08em" }}>
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
