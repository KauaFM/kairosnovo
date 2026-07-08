import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Smile, Sun, Moon, Plus } from 'lucide-react';
import type { DetailPageProps } from '../types/metrics.types';
import { WELLBEING_DATA } from '../data/mockData';
import { getChartColors } from '../utils/calculations';
import { BackButton } from '../components/BackButton';
import { SectionCard } from '../components/SectionCard';
import { KPIBadge } from '../components/KPIBadge';
import { RingProgress } from '../components/RingProgress';

export function WellbeingDetail({ isDark, onBack, onCreateGoal }: DetailPageProps) {
  const d = WELLBEING_DATA;
  const c = getChartColors(isDark);
  const totalDays = d.dayClassification.good + d.dayClassification.neutral + d.dayClassification.difficult;

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} />
        <button
          onClick={() => onCreateGoal('wellbeing')}
          className="inline-flex items-center gap-1 rounded-lg bg-[#00E676]/10 px-3 py-1.5 text-xs font-semibold text-[#00E676] hover:bg-[#00E676]/20 transition-colors"
        >
          <Plus size={14} />
          Nova Meta
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFB300]/10">
          <Smile size={20} className="text-[#FFB300]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white/90">Bem-Estar</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 dark:text-white/50">
              Score: {d.wellbeingScore}
            </span>
            <KPIBadge variation={d.variation} />
          </div>
        </div>
      </div>

      {/* Day Classification */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Sun, label: 'Bons', value: String(d.dayClassification.good), color: 'text-[#00E676]' },
          { icon: Moon, label: 'Neutros', value: String(d.dayClassification.neutral), color: 'text-neutral-400 dark:text-white/40' },
          { icon: Smile, label: 'Difíceis', value: String(d.dayClassification.difficult), color: 'text-[#E53935]' },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center rounded-xl border border-neutral-200 dark:border-white/[0.055] bg-white dark:bg-[#161616] p-3">
            <s.icon size={16} className={`mb-1 ${s.color}`} />
            <span className="text-base font-extrabold text-neutral-900 dark:text-white/90">{s.value}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/30">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Mood */}
      <SectionCard title="Humor diário (30 dias)">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.moodDaily}>
              <defs>
                <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFB300" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FFB300" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Area type="monotone" dataKey="value" stroke="#FFB300" fill="url(#moodGrad)" strokeWidth={2} name="Humor" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Stress */}
      <SectionCard title="Estresse por hora do dia">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.stressByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Line type="monotone" dataKey="value" stroke="#E53935" strokeWidth={2} dot={false} name="Estresse" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Leisure */}
      <SectionCard title="Horas de lazer (12 semanas)">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.leisureHours}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} unit="h" />
              <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: c.tick }} />
              <Line type="monotone" dataKey="value" stroke="#00E676" strokeWidth={2} dot={false} name="Lazer" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Recovery Ring */}
      <SectionCard title="Índice de recuperação">
        <div className="flex items-center justify-center gap-6 py-2">
          <RingProgress value={d.recoveryIndex} size={80} label={`${d.recoveryIndex}%`} />
          <div>
            <p className="text-sm font-semibold text-neutral-700 dark:text-white/70">
              {d.dayClassification.good} de {totalDays} dias bons
            </p>
            <p className="text-xs text-neutral-400 dark:text-white/30">
              {Math.round((d.dayClassification.good / totalDays) * 100)}% dos dias positivos
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
