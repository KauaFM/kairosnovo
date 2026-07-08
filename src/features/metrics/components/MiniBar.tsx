import { ResponsiveContainer, BarChart, Bar } from 'recharts';

interface MiniBarProps {
  data: number[];
  color?: string;
  height?: number;
}

export function MiniBar({ data, color = '#00E676', height = 32 }: MiniBarProps) {
  const chartData = data.map((value, i) => ({ i, value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
        <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} isAnimationActive animationDuration={600} />
      </BarChart>
    </ResponsiveContainer>
  );
}
