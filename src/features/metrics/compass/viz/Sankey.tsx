import type { SankeyLink } from '../types';

export function Sankey({ nodes, links }: { nodes: string[]; links: SankeyLink[] }) {
  const w = 600, h = 240;
  const cols: Record<string, number> = {
    'Tempo livre': 0,
    'Foco': 1, 'Distração': 1,
    'Resultado +': 2, 'Resultado −': 2,
  };
  const colNodes: Record<number, string[]> = { 0: [], 1: [], 2: [] };
  nodes.forEach((n) => { const c = cols[n] ?? 0; colNodes[c].push(n); });

  const colX = [40, w / 2 - 40, w - 120];
  const nodeW = 16;
  const totalIn = (n: string) => links.filter((l) => l.target === n).reduce((s, l) => s + l.value, 0)
    || links.filter((l) => l.source === n).reduce((s, l) => s + l.value, 0);
  const maxVal = Math.max(...nodes.map(totalIn), 1);
  const scale = (h - 40) / (maxVal * 2.5);

  const nodePos: Record<string, { x: number; y: number; height: number }> = {};
  Object.entries(colNodes).forEach(([col, ns]) => {
    let y = 20;
    ns.forEach((n) => {
      const height = Math.max(20, totalIn(n) * scale);
      nodePos[n] = { x: colX[+col], y, height };
      y += height + 16;
    });
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {links.map((l, i) => {
        const s = nodePos[l.source];
        const t = nodePos[l.target];
        if (!s || !t) return null;
        const sy = s.y + s.height / 2;
        const ty = t.y + t.height / 2;
        const sx = s.x + nodeW;
        const tx = t.x;
        const cx = (sx + tx) / 2;
        const stroke = l.target.includes('+') || l.source === 'Foco' ? 'var(--compass-success, #22c55e)' : l.target.includes('−') || l.source === 'Distração' ? 'var(--compass-destructive, #ef4444)' : 'var(--pillar)';
        return (
          <path
            key={i}
            d={`M${sx},${sy} C${cx},${sy} ${cx},${ty} ${tx},${ty}`}
            stroke={stroke}
            strokeWidth={Math.max(2, l.value * scale * 0.8)}
            fill="none"
            opacity={0.35}
            style={{ animation: `compass-fade-in 0.6s ease-out ${i * 120}ms backwards` }}
          />
        );
      })}
      {Object.entries(nodePos).map(([n, p]) => (
        <g key={n}>
          <rect x={p.x} y={p.y} width={nodeW} height={p.height} rx={3}
            fill={n.includes('+') ? 'var(--compass-success, #22c55e)' : n.includes('−') ? 'var(--compass-destructive, #ef4444)' : 'var(--pillar)'} />
          <text x={p.x + nodeW + 6} y={p.y + p.height / 2} dominantBaseline="middle"
            className="fill-current" style={{ fontSize: 11 }}>
            {n}
          </text>
        </g>
      ))}
    </svg>
  );
}
