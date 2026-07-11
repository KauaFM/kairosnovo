type Axis = { label: string; value: number; valuePast?: number };

export function RadarGlobal({ axes, size = 500 }: { axes: Axis[]; size?: number }) {
  const cx = size / 2, cy = size / 2;
  // Raio menor → mais margem pros rótulos laterais (ex: FINANCEIRO, APRENDIZADO)
  // não serem cortados pelo overflow-hidden do card.
  const r = size * 0.22;
  const n = axes.length;

  const point = (val: number, idx: number) => {
    const a = (Math.PI * 2 * idx) / n - Math.PI / 2;
    const d = (Math.max(2, val) / 100) * r;
    return [cx + Math.cos(a) * d, cy + Math.sin(a) * d] as const;
  };
  
  const path = (vals: number[]) =>
    vals.map((v, i) => {
      const [x, y] = point(v, i);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + ' Z';

  const rings = [0.2, 0.4, 0.6, 0.8, 1];
  const now = axes.map((a) => a.value);
  const past = axes.map((a) => a.valuePast ?? a.value);
  const hasPast = axes.some((a) => a.valuePast !== undefined);

  return (
    <svg 
      viewBox={`0 0 ${size} ${size}`} 
      className="w-full h-auto select-none overflow-visible"
    >
      {/* Background Rings */}
      {rings.map((rr, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r * rr}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth="1"
        />
      ))}
      
      {/* Axis Lines */}
      {axes.map((_, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + Math.cos(a) * r}
            y2={cy + Math.sin(a) * r}
            stroke="#F1F5F9" 
            strokeWidth="1" 
          />
        );
      })}

      {/* Past Data Area */}
      {hasPast && (
        <path d={path(past)} 
          fill="none"
          stroke="#CBD5E1" strokeWidth="1.5"
          strokeDasharray="4 4" opacity={0.6} />
      )}

      {/* Current Data Area */}
      <path d={path(now)}
        fill="#10B981" fillOpacity={0.15}
        stroke="#10B981" strokeWidth="2.5" strokeLinejoin="round"
        style={{ 
          filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.2))',
        }} />

      {/* Labels - High Contrast & Readable */}
      {axes.map((a, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const distance = r + 34;
        const lx = cx + Math.cos(angle) * distance;
        const ly = cy + Math.sin(angle) * distance;
        
        let textAnchor = "middle";
        const cos = Math.cos(angle);
        if (cos > 0.1) textAnchor = "start";
        else if (cos < -0.1) textAnchor = "end";

        const hasData = a.value > 0;

        return (
          <text key={i} x={lx} y={ly}
            textAnchor={textAnchor} 
            dominantBaseline="middle"
            className={hasData ? "fill-zinc-900" : "fill-zinc-500"}
            style={{
              fontSize: 8.5,
              letterSpacing: '0.02em',
              fontWeight: hasData ? 800 : 600,
              fontFamily: 'Inter, system-ui, sans-serif'
            }}>
            {a.label.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}
