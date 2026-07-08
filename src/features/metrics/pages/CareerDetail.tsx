import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Rocket, CheckCircle2, Clock, Plus } from 'lucide-react';
import type { DetailPageProps } from '../types/metrics.types';
import { CAREER_DATA } from '../data/mockData';
import { getChartColors } from '../utils/calculations';
import { fmtNumber } from '../utils/formatters';
import { BackButton } from '../components/BackButton';
import { SectionCard } from '../components/SectionCard';
import { KPIBadge } from '../components/KPIBadge';

export function CareerDetail({ isDark, onBack, onCreateGoal }: DetailPageProps) {
  const d = CAREER_DATA;
  const c = getChartColors(isDark);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} />
        <button
          onClick={() => onCreateGoal('career')}
          className="inline-flex items-center gap-1 rounded-lg bg-[#00E676]/10 px-3 py-1.5 text-xs font-semibold text-[#00E676] hover:bg-[#00E676]/20 transition-colors"
        >
          <Plus size={14} />
          Nova Meta
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E676]/10">
          <Rocket size={20} className="text-[#00E676]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white/90">Carreira</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 dark:text-white/50">
              {fmtNumber(d.weeklyHighImpactHours)}h alto impacto
            </span>
            <KPIBadge variation={d.variation} />
          </div>
        </div>
      </div>

      {/* High vs Low Impact */}
      <SectionCard title="Horas alto vs. baixo impacto (12 semanas)">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} data={d.highImpactHours} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} unit="h" />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Line data={d.highImpactHours} type="monotone" dataKey="value" stroke="#00E676" strokeWidth={2} dot={false} name="Alto impacto" />
              <Line data={d.lowImpactHours} type="monotone" dataKey="value" stroke={isDark ? 'rgba(255,255,255,0.24)' : '#A3A3A3'} strokeWidth={1.5} dot={false} name="Baixo impacto" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Milestones */}
      <SectionCard title="Marcos de carreira">
        <div className="flex flex-col gap-2.5">
          {d.milestones.map((m) => (
            <div key={m.name} className="flex items-center gap-3">
              <CheckCircle2
                size={16}
                className={m.completed ? 'text-[#00E676]' : 'text-neutral-300 dark:text-white/20'}
              />
              <div className="flex-1">
                <p className={`text-xs font-semibold ${m.completed ? 'text-neutral-700 dark:text-white/70' : 'text-neutral-400 dark:text-white/30'}`}>
                  {m.name}
                </p>
                <p className="text-[10px] text-neutral-400 dark:text-white/30">
                  <Clock size={10} className="mr-0.5 inline" />
                  {new Date(m.date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Time Distribution Pie */}
      <SectionCard title="Distribuição de tempo">
        <div className="flex items-center gap-4">
          <div className="h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={d.timeDistribution}
                  dataKey="hours"
                  nameKey="project"
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  strokeWidth={0}
                >
                  {d.timeDistribution.map((entry) => (
                    <Cell key={entry.project} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${fmtNumber(v)}h`]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            {d.timeDistribution.map((entry) => (
              <div key={entry.project} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] text-neutral-500 dark:text-white/40">{entry.project}</span>
                <span className="ml-auto text-[10px] font-semibold text-neutral-700 dark:text-white/60">{fmtNumber(entry.hours)}h</span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Alignment Score */}
      <SectionCard title="Score de alinhamento (12 semanas)">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.alignmentScore}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Line type="monotone" dataKey="value" stroke="#00E676" strokeWidth={2} dot={false} name="Alinhamento" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
