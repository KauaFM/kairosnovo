import { useLang } from '../../../../i18n/LanguageContext';

type Cell = { day: number; intensity: number };

function levelFor(i: number): 0 | 1 | 2 | 3 | 4 {
  if (i < 0.15) return 0;
  if (i < 0.35) return 1;
  if (i < 0.55) return 2;
  if (i < 0.75) return 3;
  return 4;
}

const OPACITY = [0, 0.25, 0.45, 0.7, 1];

export function YearHeatmap({ cells }: { cells: Cell[] }) {
  const { t } = useLang();
  const cols = Math.ceil(cells.length / 7);
  const grid: (Cell | null)[][] = Array.from({ length: cols }, () => Array(7).fill(null));
  cells.forEach((c, i) => {
    const col = Math.floor(i / 7);
    const row = i % 7;
    if (col < cols) grid[col][row] = c;
  });

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto compass-no-scrollbar -mx-1 px-1">
        <div className="inline-flex gap-[3px]">
          {grid.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((cell, ri) => {
                if (!cell) return <div key={ri} className="w-[10px] h-[10px]" />;
                const lvl = levelFor(cell.intensity);
                return (
                  <div
                    key={ri}
                    className="w-[10px] h-[10px] rounded-[2px]"
                    style={{
                      backgroundColor: lvl === 0 ? 'var(--compass-surface-2, #262626)' : 'var(--compass-success, #22c55e)',
                      opacity: lvl === 0 ? 0.6 : OPACITY[lvl],
                      animation: `compass-fade-in 0.4s ease-out ${(ci * 7 + ri) * 1.5}ms backwards`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between compass-label-meta">
        <span>{t('lo.daysAgo365')}</span>
        <div className="flex items-center gap-1.5">
          <span>menos</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <div key={l} className="w-[10px] h-[10px] rounded-[2px]"
              style={{
                backgroundColor: l === 0 ? 'var(--compass-surface-2, #262626)' : 'var(--compass-success, #22c55e)',
                opacity: l === 0 ? 0.6 : OPACITY[l],
              }}
            />
          ))}
          <span>mais</span>
        </div>
        <span>{t('lo.todayLower')}</span>
      </div>
    </div>
  );
}
