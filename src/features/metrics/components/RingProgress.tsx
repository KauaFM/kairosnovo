import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface RingProgressProps {
  value: number;
  size?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}

export function RingProgress({
  value,
  size = 64,
  color = '#00E676',
  trackColor,
  label,
}: RingProgressProps) {
  const data = [{ name: 'progress', value: Math.min(value, 100), fill: color }];
  const track = trackColor ?? 'rgba(115,115,115,0.15)';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
          barSize={size > 80 ? 8 : 5}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={size}
            background={{ fill: track }}
            isAnimationActive
            animationDuration={800}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      {label && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-neutral-900 dark:text-white/90">
          {label}
        </span>
      )}
    </div>
  );
}
