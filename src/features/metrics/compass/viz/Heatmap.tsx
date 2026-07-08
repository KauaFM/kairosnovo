import type { HeatCell } from '../types';

const DAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export function Heatmap({ cells }: { cells: HeatCell[] }) {
  return (
    <div className="space-y-1">
      {DAYS.map((d, dayIdx) => (
        <div key={dayIdx} className="flex items-center gap-2">
          <span className="compass-label-meta w-3 text-right">{d}</span>
          <div className="flex gap-[2px] flex-1">
            {Array.from({ length: 24 }).map((_, h) => {
              const cell = cells.find((c) => c.day === dayIdx && c.hour === h);
              const i = cell?.intensity ?? 0;
              return (
                <div
                  key={h}
                  className="flex-1 aspect-square rounded-[2px]"
                  style={{
                    backgroundColor: i < 0.05 ? 'var(--compass-surface-2, #262626)' : 'var(--pillar)',
                    opacity: i < 0.05 ? 0.6 : 0.15 + i * 0.85,
                    animation: `compass-fade-in 0.5s ease-out ${(dayIdx * 24 + h) * 6}ms backwards`,
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
