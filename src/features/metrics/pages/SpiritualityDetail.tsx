import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Compass, Sparkles, Heart, Plus } from 'lucide-react';
import type { DetailPageProps } from '../types/metrics.types';
import { SPIRITUALITY_DATA } from '../data/mockData';
import { getChartColors } from '../utils/calculations';
import { fmtNumber, fmtDuration } from '../utils/formatters';
import { BackButton } from '../components/BackButton';
import { SectionCard } from '../components/SectionCard';
import { KPIBadge } from '../components/KPIBadge';
import { RingProgress } from '../components/RingProgress';

export function SpiritualityDetail({ isDark, onBack, onCreateGoal }: DetailPageProps) {
  const d = SPIRITUALITY_DATA;
  const c = getChartColors(isDark);
  const clarityPct = Math.round((d.clarityDays / d.totalDays) * 100);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} />
        <button
          onClick={() => onCreateGoal('spirituality')}
          className="inline-flex items-center gap-1 rounded-lg bg-[#00E676]/10 px-3 py-1.5 text-xs font-semibold text-[#00E676] hover:bg-[#00E676]/20 transition-colors"
        >
          <Plus size={14} />
          Nova Meta
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFB300]/10">
          <Compass size={20} className="text-[#FFB300]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white/90">Sentido</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 dark:text-white/50">
              {fmtDuration(d.weeklyMinutes)} contemplativos
            </span>
            <KPIBadge variation={d.variation} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Sparkles, label: 'Dias de clareza', value: `${d.clarityDays}/${d.totalDays}` },
          { icon: Heart, label: 'Min semanais', value: String(d.weeklyMinutes) },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center rounded-xl border border-neutral-200 dark:border-white/[0.055] bg-white dark:bg-[#161616] p-3">
            <s.icon size={16} className="mb-1 text-neutral-400 dark:text-white/30" />
            <span className="text-base font-extrabold text-neutral-900 dark:text-white/90">{s.value}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/30">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Meditation */}
      <SectionCard title="Minutos de meditação (12 semanas)">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.meditationMinutes}>
              <defs>
                <linearGradient id="medGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFB300" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FFB300" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} unit="m" />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Area type="monotone" dataKey="value" stroke="#FFB300" fill="url(#medGrad)" strokeWidth={2} name="Minutos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Inner Peace */}
      <SectionCard title="Paz interior (30 dias)">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.innerPeace}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Line type="monotone" dataKey="value" stroke="#00E676" strokeWidth={2} dot={false} name="Paz interior" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Gratitude Entries */}
      <SectionCard title="Entradas de gratidão (12 semanas)">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.gratitudeEntries}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Line type="monotone" dataKey="value" stroke="#FFB300" strokeWidth={2} dot={false} name="Entradas" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Practice Distribution Pie */}
      <SectionCard title="Distribuição de práticas">
        <div className="flex items-center gap-4">
          <div className="h-36 w-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={d.practiceDistribution}
                  dataKey="minutes"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={55}
                  strokeWidth={0}
                >
                  {d.practiceDistribution.map((entry) => (
                    <Cell key={entry.type} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v}min`]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            {d.practiceDistribution.map((entry) => (
              <div key={entry.type} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] text-neutral-500 dark:text-white/40">{entry.type}</span>
                <span className="ml-auto text-[10px] font-semibold text-neutral-700 dark:text-white/60">{entry.minutes}min</span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Clarity Ring */}
      <SectionCard title="Dias de clareza">
        <div className="flex items-center justify-center py-2">
          <RingProgress value={clarityPct} size={80} color="#FFB300" label={`${clarityPct}%`} />
        </div>
      </SectionCard>

      {/* Value Alignment */}
      <SectionCard title="Alinhamento com valores (12 semanas)">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.valueAlignment}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} domain={[0, 5]} />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Line type="monotone" dataKey="value" stroke="#9C27B0" strokeWidth={2} dot={false} name="Alinhamento" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
