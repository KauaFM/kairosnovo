import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Flame, Target, Plus } from 'lucide-react';
import type { DetailPageProps } from '../types/metrics.types';
import { GROWTH_DATA } from '../data/mockData';
import { fmtNumber } from '../utils/formatters';
import { BackButton } from '../components/BackButton';
import { SectionCard } from '../components/SectionCard';
import { KPIBadge } from '../components/KPIBadge';
import { RingProgress } from '../components/RingProgress';

export function GrowthDetail({ isDark, onBack, onCreateGoal }: DetailPageProps) {
  const d = GROWTH_DATA;
  const perfectPct = Math.round((d.perfectDays / d.totalDays) * 100);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} />
        <button
          onClick={() => onCreateGoal('growth')}
          className="inline-flex items-center gap-1 rounded-lg bg-[#00E676]/10 px-3 py-1.5 text-xs font-semibold text-[#00E676] hover:bg-[#00E676]/20 transition-colors"
        >
          <Plus size={14} />
          Nova Meta
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E676]/10">
          <TrendingUp size={20} className="text-[#00E676]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white/90">Crescimento</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 dark:text-white/50">
              Taxa: {fmtNumber(d.growthRate)}%
            </span>
            <KPIBadge variation={d.variation} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center rounded-xl border border-neutral-200 dark:border-white/[0.055] bg-white dark:bg-[#161616] p-3">
          <Target size={16} className="mb-1 text-neutral-400 dark:text-white/30" />
          <span className="text-base font-extrabold text-neutral-900 dark:text-white/90">{d.perfectDays}/{d.totalDays}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/30">Dias perfeitos</span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-neutral-200 dark:border-white/[0.055] bg-white dark:bg-[#161616] p-3">
          <Flame size={16} className="mb-1 text-neutral-400 dark:text-white/30" />
          <span className="text-base font-extrabold text-neutral-900 dark:text-white/90">{fmtNumber(d.growthRate)}%</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/30">Taxa crescimento</span>
        </div>
      </div>

      {/* Habit Streaks */}
      <SectionCard title="Streaks de hábitos">
        <div className="flex flex-col gap-2.5">
          {d.habitStreaks.map((h) => (
            <div key={h.name}>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={12} className="text-[#FFB300]" />
                  <span className="text-xs font-semibold text-neutral-700 dark:text-white/70">{h.name}</span>
                </div>
                <span className="text-[10px] font-semibold text-neutral-500 dark:text-white/40">{h.streak}d &middot; {h.consistency}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/[0.04]">
                <div className="h-full rounded-full bg-[#00E676] transition-all" style={{ width: `${h.consistency}%` }} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* OKR Completion */}
      <SectionCard title="OKRs">
        <div className="flex flex-col gap-3">
          {d.okrCompletion.map((okr) => {
            const pct = Math.round((okr.progress / okr.target) * 100);
            return (
              <div key={okr.name}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700 dark:text-white/70">{okr.name}</span>
                  <span className="text-[10px] font-semibold text-neutral-500 dark:text-white/40">{pct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/[0.04]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct >= 75 ? '#00E676' : pct >= 40 ? '#FFB300' : '#E53935',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Skill Radar */}
      <SectionCard title="Radar de competências">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={d.skillRadar} outerRadius="75%">
              <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.055)' : '#E5E5E5'} />
              <PolarAngleAxis dataKey="skill" tick={{ fill: isDark ? 'rgba(255,255,255,0.50)' : '#525252', fontSize: 10 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar name="Anterior" dataKey="previous" stroke={isDark ? 'rgba(255,255,255,0.24)' : '#A3A3A3'} fill={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'} strokeWidth={1} />
              <Radar name="Atual" dataKey="current" stroke="#00E676" fill="#00E676" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Perfect Days Ring */}
      <SectionCard title="Dias perfeitos">
        <div className="flex items-center justify-center py-2">
          <RingProgress value={perfectPct} size={80} label={`${perfectPct}%`} />
        </div>
      </SectionCard>
    </div>
  );
}
