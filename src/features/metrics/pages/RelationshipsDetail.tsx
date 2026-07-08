import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, Heart, UserPlus, Plus } from 'lucide-react';
import type { DetailPageProps } from '../types/metrics.types';
import { RELATIONSHIPS_DATA } from '../data/mockData';
import { getChartColors } from '../utils/calculations';
import { fmtNumber } from '../utils/formatters';
import { BackButton } from '../components/BackButton';
import { SectionCard } from '../components/SectionCard';
import { KPIBadge } from '../components/KPIBadge';

export function RelationshipsDetail({ isDark, onBack, onCreateGoal }: DetailPageProps) {
  const d = RELATIONSHIPS_DATA;
  const c = getChartColors(isDark);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} />
        <button
          onClick={() => onCreateGoal('relationships')}
          className="inline-flex items-center gap-1 rounded-lg bg-[#00E676]/10 px-3 py-1.5 text-xs font-semibold text-[#00E676] hover:bg-[#00E676]/20 transition-colors"
        >
          <Plus size={14} />
          Nova Meta
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E676]/10">
          <Users size={20} className="text-[#00E676]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white/90">Relacionamentos</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 dark:text-white/50">
              {fmtNumber(d.weeklyQualityHours)}h de tempo de qualidade
            </span>
            <KPIBadge variation={d.variation} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: UserPlus, label: 'Novas conexões', value: String(d.newConnections) },
          { icon: Heart, label: 'Mantidas', value: String(d.maintainedConnections) },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center rounded-xl border border-neutral-200 dark:border-white/[0.055] bg-white dark:bg-[#161616] p-3">
            <s.icon size={16} className="mb-1 text-neutral-400 dark:text-white/30" />
            <span className="text-base font-extrabold text-neutral-900 dark:text-white/90">{s.value}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/30">{s.label}</span>
          </div>
        ))}
      </div>

      <SectionCard title="Horas de tempo de qualidade (12 semanas)">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.qualityTimeHours}>
              <defs>
                <linearGradient id="qtGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E676" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} unit="h" />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Area type="monotone" dataKey="value" stroke="#00E676" fill="url(#qtGrad)" strokeWidth={2} name="Horas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Índice de conflito (12 semanas)">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.conflictIndex}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Line type="monotone" dataKey="value" stroke="#E53935" strokeWidth={2} dot={false} name="Conflitos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Satisfação geral (12 semanas)">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.satisfactionScore}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Line type="monotone" dataKey="value" stroke="#00E676" strokeWidth={2} dot={false} name="Satisfação" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
