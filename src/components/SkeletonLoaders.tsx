/* ═══════════════════════════════════════════════════════════ */
/*  SKELETON LOADERS — Reusable loading placeholders           */
/*  Shimmer animation, black & white aesthetic                  */
/* ═══════════════════════════════════════════════════════════ */

/* ── Base shimmer block ── */
function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-neutral-200/60 dark:bg-white/[0.04] animate-pulse ${className}`}
    />
  );
}

/* ── Card Skeleton (for KPI cards, stat cards) ── */
export function CardSkeleton() {
  return (
    <div className="rounded-[28px] border border-neutral-200/80 dark:border-white/[0.04] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shimmer className="w-4 h-4 rounded-md" />
        <Shimmer className="w-24 h-3" />
      </div>
      <Shimmer className="w-20 h-7 mb-3" />
      <Shimmer className="w-full h-[120px] rounded-xl" />
    </div>
  );
}

/* ── Chart Skeleton ── */
export function ChartSkeleton({ height = 180 }: { height?: number }) {
  return (
    <div className="rounded-[28px] border border-neutral-200/80 dark:border-white/[0.04] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shimmer className="w-3 h-3 rounded-md" />
          <Shimmer className="w-28 h-3" />
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <Shimmer key={i} className="w-8 h-4 rounded-full" />
          ))}
        </div>
      </div>
      <Shimmer className={`w-full rounded-xl`} style={{ height }} />
      <div className="flex gap-4 mt-3">
        <Shimmer className="w-16 h-3" />
        <Shimmer className="w-16 h-3" />
      </div>
    </div>
  );
}

/* ── KPI Row Skeleton ── */
export function KpiRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-[20px] border border-neutral-200/80 dark:border-white/[0.04] p-4"
        >
          <Shimmer className="w-12 h-3 mb-2" />
          <Shimmer className="w-16 h-6 mb-1" />
          <Shimmer className="w-10 h-2.5" />
        </div>
      ))}
    </div>
  );
}

/* ── Domain Card Skeleton (for MasterDashboard grid) ── */
export function DomainCardSkeleton() {
  return (
    <div className="rounded-[20px] border border-neutral-200/80 dark:border-white/[0.04] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shimmer className="w-5 h-5 rounded-lg" />
          <Shimmer className="w-20 h-3" />
        </div>
        <Shimmer className="w-8 h-4 rounded-full" />
      </div>
      <Shimmer className="w-14 h-5 mb-2" />
      <Shimmer className="w-full h-8 rounded-lg" />
    </div>
  );
}

/* ── List Item Skeleton ── */
export function ListItemSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-neutral-200/80 dark:border-white/[0.04] p-3"
        >
          <Shimmer className="w-8 h-8 rounded-lg shrink-0" />
          <div className="flex-1">
            <Shimmer className="w-3/4 h-3 mb-1.5" />
            <Shimmer className="w-1/2 h-2.5" />
          </div>
          <Shimmer className="w-10 h-4 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ── Dashboard Full Skeleton ── */
export function DashboardSkeleton() {
  return (
    <div className="px-5 pb-20 space-y-4">
      {/* Header */}
      <div className="pt-2 pb-3">
        <Shimmer className="w-32 h-5 mb-2" />
        <Shimmer className="w-48 h-3" />
      </div>

      {/* Period pills */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Shimmer key={i} className="w-12 h-6 rounded-full" />
        ))}
      </div>

      {/* Hero card */}
      <CardSkeleton />

      {/* KPI row */}
      <KpiRowSkeleton count={3} />

      {/* Domain grid */}
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <DomainCardSkeleton key={i} />
        ))}
      </div>

      {/* Chart */}
      <ChartSkeleton />
    </div>
  );
}

/* ── Heatmap Skeleton ── */
export function HeatmapSkeleton() {
  return (
    <div className="rounded-[28px] border border-neutral-200/80 dark:border-white/[0.04] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shimmer className="w-3 h-3 rounded-md" />
        <Shimmer className="w-32 h-3" />
      </div>
      <div className="grid grid-cols-13 gap-[3px]" style={{ gridTemplateRows: 'repeat(7, 14px)' }}>
        {Array.from({ length: 91 }).map((_, i) => (
          <Shimmer key={i} className="rounded-[3px]" />
        ))}
      </div>
    </div>
  );
}
