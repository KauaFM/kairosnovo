import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Brain, BookOpen, GraduationCap, Clock, Plus } from 'lucide-react';
import type { DetailPageProps } from '../types/metrics.types';
import { MIND_DATA } from '../data/mockData';
import { getChartColors } from '../utils/calculations';
import { fmtNumber, fmtDuration } from '../utils/formatters';
import { BackButton } from '../components/BackButton';
import { SectionCard } from '../components/SectionCard';
import { KPIBadge } from '../components/KPIBadge';
import { RingProgress } from '../components/RingProgress';

export function MindDetail({ isDark, onBack, onCreateGoal }: DetailPageProps) {
  const d = MIND_DATA;
  const c = getChartColors(isDark);

  const coursesData = [
    { label: 'Concluídos', completed: d.coursesCompleted, started: 0 },
    { label: 'Iniciados', completed: 0, started: d.coursesStarted },
  ];

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} />
        <button
          onClick={() => onCreateGoal('mind')}
          className="inline-flex items-center gap-1 rounded-lg bg-[#00E676]/10 px-3 py-1.5 text-xs font-semibold text-[#00E676] hover:bg-[#00E676]/20 transition-colors"
        >
          <Plus size={14} />
          Nova Meta
        </button>
      </div>

      {/* Title + KPI */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E676]/10">
          <Brain size={20} className="text-[#00E676]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white/90">Mente</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 dark:text-white/50">
              {fmtNumber(d.weeklyDeepWorkHours)}h de deep work esta semana
            </span>
            <KPIBadge variation={d.variation} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Clock, label: 'Sessões', value: String(d.studySessions) },
          { icon: BookOpen, label: 'Duração média', value: fmtDuration(d.avgStudyDurationMin) },
          { icon: GraduationCap, label: 'Cursos', value: `${d.coursesCompleted}/${d.coursesStarted}` },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center rounded-xl border border-neutral-200 dark:border-white/[0.055] bg-white dark:bg-[#161616] p-3"
          >
            <s.icon size={16} className="mb-1 text-neutral-400 dark:text-white/30" />
            <span className="text-base font-extrabold text-neutral-900 dark:text-white/90">{s.value}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/30">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Deep Work by Day — BarChart */}
      <SectionCard title="Horas de foco profundo por dia">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.deepWorkByDay} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: c.tick }}
                formatter={(v: number) => [`${fmtNumber(v)}h`, 'Deep Work']}
              />
              <Bar dataKey="value" fill="#00E676" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Dispersion Index — AreaChart */}
      <SectionCard title="Índice de dispersão (12 semanas)">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.dispersionIndex}>
              <defs>
                <linearGradient id="dispGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E53935" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E53935" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: c.tick }}
                formatter={(v: number) => [fmtNumber(v), 'Dispersão']}
              />
              <Area type="monotone" dataKey="value" stroke="#E53935" fill="url(#dispGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Retention Rate — LineChart */}
      <SectionCard title="Taxa de retenção de leitura/estudo">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.retentionRate}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} unit="%" />
              <Tooltip
                contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: c.tick }}
                formatter={(v: number) => [`${fmtNumber(v)}%`, 'Retenção']}
              />
              <Line type="monotone" dataKey="value" stroke="#00E676" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Cognitive Load — LineChart */}
      <SectionCard title="Carga cognitiva diária percebida">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.cognitiveLoad}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} domain={[0, 10]} />
              <Tooltip
                contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: c.tick }}
                formatter={(v: number) => [fmtNumber(v), 'Carga']}
              />
              <Line type="monotone" dataKey="value" stroke="#FFB300" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Courses — Stacked BarChart + Ring */}
      <SectionCard title="Cursos/módulos: concluídos vs. iniciados">
        <div className="flex items-center gap-4">
          <RingProgress
            value={Math.round((d.coursesCompleted / d.coursesStarted) * 100)}
            size={72}
            label={`${Math.round((d.coursesCompleted / d.coursesStarted) * 100)}%`}
          />
          <div className="flex-1 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coursesData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: c.tick }}
                />
                <Bar dataKey="completed" stackId="a" fill="#00E676" name="Concluídos" radius={[0, 0, 0, 0]} />
                <Bar dataKey="started" stackId="a" fill={isDark ? 'rgba(255,255,255,0.12)' : '#E5E5E5'} name="Iniciados" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionCard>

      {/* Study sessions stats */}
      <SectionCard title="Sessões de estudo">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-neutral-200 dark:border-white/[0.055] bg-neutral-50 dark:bg-white/[0.03] p-3 text-center">
            <p className="text-2xl font-extrabold text-neutral-900 dark:text-white/90">{d.studySessions}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/30">Total</p>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-white/[0.055] bg-neutral-50 dark:bg-white/[0.03] p-3 text-center">
            <p className="text-2xl font-extrabold text-neutral-900 dark:text-white/90">{fmtDuration(d.avgStudyDurationMin)}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/30">Duração média</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
