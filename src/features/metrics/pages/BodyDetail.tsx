import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Activity, Droplets, Flame, Plus } from 'lucide-react';
import type { DetailPageProps } from '../types/metrics.types';
import { BODY_DATA } from '../data/mockData';
import { getChartColors } from '../utils/calculations';
import { fmtNumber } from '../utils/formatters';
import { BackButton } from '../components/BackButton';
import { SectionCard } from '../components/SectionCard';
import { KPIBadge } from '../components/KPIBadge';
import { RingProgress } from '../components/RingProgress';

export function BodyDetail({ isDark, onBack, onCreateGoal }: DetailPageProps) {
  const d = BODY_DATA;
  const c = getChartColors(isDark);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} />
        <button
          onClick={() => onCreateGoal('body')}
          className="inline-flex items-center gap-1 rounded-lg bg-[#00E676]/10 px-3 py-1.5 text-xs font-semibold text-[#00E676] hover:bg-[#00E676]/20 transition-colors"
        >
          <Plus size={14} />
          Nova Meta
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E676]/10">
          <Activity size={20} className="text-[#00E676]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white/90">Corpo</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 dark:text-white/50">
              Consistência: {d.consistencyScore}pts
            </span>
            <KPIBadge variation={d.variation} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Flame, label: 'Streak', value: `${d.workoutStreak}d` },
          { icon: Activity, label: 'Consistência', value: String(d.consistencyScore) },
          { icon: Droplets, label: 'Hidratação', value: `${fmtNumber(d.hydration[d.hydration.length - 1]?.value ?? 0)}L` },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center rounded-xl border border-neutral-200 dark:border-white/[0.055] bg-white dark:bg-[#161616] p-3">
            <s.icon size={16} className="mb-1 text-neutral-400 dark:text-white/30" />
            <span className="text-base font-extrabold text-neutral-900 dark:text-white/90">{s.value}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/30">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Sleep stacked bar */}
      <SectionCard title="Qualidade do sono (semanal)">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.sleepData} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} unit="h" />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Bar dataKey="deep" stackId="a" fill="#00E676" name="Profundo" />
              <Bar dataKey="rem" stackId="a" fill="#00BCD4" name="REM" />
              <Bar dataKey="light" stackId="a" fill={isDark ? 'rgba(255,255,255,0.12)' : '#E5E5E5'} name="Leve" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Energy Level */}
      <SectionCard title="Nível de energia (30 dias)">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.energyLevel}>
              <defs>
                <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E676" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Area type="monotone" dataKey="value" stroke="#00E676" fill="url(#energyGrad)" strokeWidth={2} name="Energia" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Training Load */}
      <SectionCard title="Carga de treino (12 semanas)">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.trainingLoad}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Line type="monotone" dataKey="value" stroke="#00E676" strokeWidth={2} dot={false} name="Carga" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Hydration */}
      <SectionCard title="Hidratação diária (semanal)">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.hydration} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} unit="L" />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Bar dataKey="value" fill="#00BCD4" radius={[4, 4, 0, 0]} name="Litros" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Consistency Ring */}
      <SectionCard title="Score de consistência">
        <div className="flex items-center justify-center py-2">
          <RingProgress value={d.consistencyScore} size={96} label={`${d.consistencyScore}%`} />
        </div>
      </SectionCard>
    </div>
  );
}
