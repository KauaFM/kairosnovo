// =============================================================
// ORVAX · Sankey — fluxo de comportamento (3 colunas)
// SVG puro · sem D3 · cubic-bezier · width proporcional ao valor.
// Usado para visualizar onde a vida "vaza":
//   tempo → atividade → resultado mental
// =============================================================
import React, { useId, useMemo } from 'react';

const EMERALD = '#10B981';
const ZINC    = '#71717a';

export interface SankeyNode {
  id:    string;
  label: string;
  /** posição vertical · 0..1 (auto-derivada se omitido) */
  yHint?: number;
}

export interface SankeyLink {
  source: string;     // node id
  target: string;     // node id
  value:  number;
  /** se true, fluxo é "vazamento" (cinza) · se false, fluxo positivo (emerald) */
  drain?: boolean;
}

interface Props {
  /** colunas de nós (left → right) */
  columns: SankeyNode[][];
  links:   SankeyLink[];
  /** altura total do gráfico em px */
  height?: number;
  className?: string;
}

export function Sankey({ columns, links, height = 280, className }: Props) {
  const uid = useId().replace(/[:]/g, '');
  const w = 100; // viewBox padrão (responsivo via SVG)

  const layout = useMemo(() => {
    const COLS = columns.length;
    const colX = columns.map((_, i) => COLS === 1 ? w / 2 : (i / (COLS - 1)) * w);

    // Calcula soma total por nó · cada nó tem altura proporcional
    const total = links.reduce((s, l) => s + l.value, 0) || 1;
    const padY  = 10;

    type Layout = {
      nodes: Map<string, { x: number; y: number; h: number; col: number; label: string }>;
      links: { source: string; target: string; value: number; drain: boolean; pathD: string; thickness: number }[];
    };

    const layout: Layout = { nodes: new Map(), links: [] };

    columns.forEach((col, ci) => {
      const colSum = col.reduce((s, n) => {
        const nVal = links
          .filter(l => l.source === n.id || l.target === n.id)
          .reduce((a, l) => a + l.value, 0) / 2; // /2 porque cada link conta duas vezes
        return s + nVal;
      }, 0) || 1;

      let cursor = padY;
      const usable = height - padY * 2;
      col.forEach((n) => {
        const nVal = links
          .filter(l => l.source === n.id || l.target === n.id)
          .reduce((a, l) => a + l.value, 0) / 2;
        const h = Math.max(8, (nVal / colSum) * usable);
        layout.nodes.set(n.id, {
          x: colX[ci],
          y: cursor,
          h,
          col: ci,
          label: n.label,
        });
        cursor += h + 4; // pequena gap vertical
      });
    });

    // Calcular paths
    layout.links = links.map(l => {
      const s = layout.nodes.get(l.source)!;
      const t = layout.nodes.get(l.target)!;
      const thickness = Math.max(2, (l.value / total) * 60);
      const sx = s.x + 1.5; // offset depois do retângulo do nó
      const tx = t.x - 1.5;
      const sy = s.y + s.h / 2;
      const ty = t.y + t.h / 2;
      const cp = (sx + tx) / 2;
      const pathD = `M ${sx},${sy} C ${cp},${sy} ${cp},${ty} ${tx},${ty}`;
      return {
        source: l.source,
        target: l.target,
        value:  l.value,
        drain:  !!l.drain,
        pathD,
        thickness,
      };
    });

    return layout;
  }, [columns, links, height]);

  return (
    <div className={['relative w-full', className || ''].join(' ')} style={{ height }}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`sankey-emerald-${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={EMERALD} stopOpacity={0.45} />
            <stop offset="100%" stopColor={EMERALD} stopOpacity={0.85} />
          </linearGradient>
          <linearGradient id={`sankey-drain-${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"  stopColor={ZINC} stopOpacity={0.18} />
            <stop offset="100%" stopColor={ZINC} stopOpacity={0.50} />
          </linearGradient>
        </defs>

        {/* Links (stroke = path) */}
        {layout.links.map((l, i) => (
          <path
            key={i}
            d={l.pathD}
            fill="none"
            stroke={l.drain ? `url(#sankey-drain-${uid})` : `url(#sankey-emerald-${uid})`}
            strokeWidth={l.thickness}
            strokeLinecap="round"
            opacity={0.92}
          >
            <title>{l.value}</title>
          </path>
        ))}

        {/* Nodes */}
        {Array.from(layout.nodes.values()).map((n, i) => (
          <rect
            key={i}
            x={n.x - 1.5}
            y={n.y}
            width={3}
            height={n.h}
            rx={1.5}
            fill={n.col === 1 ? ZINC : EMERALD}
            opacity={n.col === 1 ? 0.45 : 0.85}
          />
        ))}
      </svg>

      {/* Labels HTML overlay (SVG text é horrível em mobile) */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from(layout.nodes.values()).map((n, i) => {
          const isLeft   = n.col === 0;
          const isRight  = n.col === columns.length - 1;
          const isMiddle = !isLeft && !isRight;
          return (
            <div
              key={i}
              className="absolute text-[9.5px] font-mono tracking-wider uppercase whitespace-nowrap"
              style={{
                left:  `${n.x}%`,
                top:   `${n.y + n.h / 2}px`,
                transform: `translate(${isLeft ? '6px' : isRight ? 'calc(-100% - 6px)' : '-50%'}, -50%)`,
                color: '#71717a',
              }}
            >
              {n.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
