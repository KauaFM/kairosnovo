import type { ExecutionBlock } from '../types';

const colorFor = (t: ExecutionBlock['type']) =>
  t === 'produtivo' ? 'var(--compass-success, #22c55e)' :
  t === 'distracao' ? 'var(--compass-destructive, #ef4444)' :
  'var(--compass-surface-2, #262626)';

export function ExecutionTimeline({ blocks }: { blocks: ExecutionBlock[] }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-[3px] h-10">
        {blocks.map((b, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm relative group transition-all hover:scale-y-110 origin-bottom"
            style={{
              backgroundColor: colorFor(b.type),
              opacity: b.type === 'neutro' ? 0.5 : 0.85,
              animation: `compass-slide-up 0.4s ease-out ${i * 18}ms backwards`,
            }}
            title={`${b.hour.toString().padStart(2, '0')}:00 — ${b.activity}`}
          >
            <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 text-white">
              {b.hour.toString().padStart(2, '0')}h · {b.activity}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between compass-label-meta compass-tabular">
        <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span>
      </div>
    </div>
  );
}
