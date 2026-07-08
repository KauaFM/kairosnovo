import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Zap, CheckCircle2, Timer, AlertTriangle, Plus } from 'lucide-react';
import type { DetailPageProps } from '../types/metrics.types';
import { PRODUCTIVITY_DATA } from '../data/mockData';
import { getChartColors } from '../utils/calculations';
import { fmtNumber } from '../utils/formatters';
import { BackButton } from '../components/BackButton';
import { SectionCard } from '../components/SectionCard';
import { KPIBadge } from '../components/KPIBadge';
import { RingProgress } from '../components/RingProgress';

export function ProductivityDetail({ isDark, onBack, onCreateGoal }: DetailPageProps) {
  const d = PRODUCTIVITY_DATA;
  const c = getChartColors(isDark);

  const pomoPct = Math.round((d.pomodoroCompleted / d.pomodoroPlanned) * 100);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} />
        <button
          onClick={() => onCreateGoal('productivity')}
          className="inline-flex items-center gap-1 rounded-lg bg-[#00E676]/10 px-3 py-1.5 text-xs font-semibold text-[#00E676] hover:bg-[#00E676]/20 transition-colors"
        >
          <Plus size={14} />
          Nova Meta
        </button>
      </div>

      {/* Title + KPI */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E676]/10">
          <Zap size={20} className="text-[#00E676]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white/90">Produtividade</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 dark:text-white/50">
              Score antiprocrastinação: {d.score}
            </span>
            <KPIBadge variation={d.variation} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: CheckCircle2, label: 'Pomodoros', value: `${d.pomodoroCompleted}/${d.pomodoroPlanned}` },
          { icon: Timer, label: 'Score', value: String(d.score) },
          { icon: AlertTriangle, label: 'Backlog', value: String(d.taskBreakdown.reduce((a, t) => a + t.overdue, 0)) },
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

      {/* Anti-Procrastination Score — LineChart with thresholds */}
      <SectionCard title="Score de antiprocrastinação (30 dias)">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.antiProcScore}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: c.tick }}
                formatter={(v: number) => [fmtNumber(v, 0), 'Score']}
              />
              <ReferenceLine y={80} stroke="#00E676" strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: 'Bom', fill: '#00E676', fontSize: 10, position: 'right' }} />
              <ReferenceLine y={50} stroke="#E53935" strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: 'Risco', fill: '#E53935', fontSize: 10, position: 'right' }} />
              <Line type="monotone" dataKey="value" stroke="#00E676" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Task Completion Rate — LineChart */}
      <SectionCard title="Taxa de conclusão de tarefas no prazo">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.taskCompletionRate}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} unit="%" />
              <Tooltip
                contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: c.tick }}
                formatter={(v: number) => [`${fmtNumber(v)}%`, 'Conclusão']}
              />
              <Line type="monotone" dataKey="value" stroke="#00E676" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Productive vs Idle — Stacked BarChart */}
      <SectionCard title="Tempo produtivo vs. ocioso (semanal)">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.productiveVsIdle} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} unit="h" />
              <Tooltip
                contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: c.tick }}
                formatter={(v: number) => [`${fmtNumber(v)}h`]}
              />
              <Bar dataKey="productive" stackId="a" fill="#00E676" name="Produtivo" radius={[0, 0, 0, 0]} />
              <Bar dataKey="idle" stackId="a" fill={isDark ? 'rgba(255,255,255,0.12)' : '#E5E5E5'} name="Ocioso" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Backlog Accumulation — LineChart */}
      <SectionCard title="Taxa de acumulação de backlog">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.backlogAccumulation}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: c.tick }}
                formatter={(v: number) => [fmtNumber(v, 0), 'Itens']}
              />
              <Line type="monotone" dataKey="value" stroke="#FFB300" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Task Breakdown — Horizontal bars */}
      <SectionCard title="Tarefas por categoria">
        <div className="flex flex-col gap-2.5">
          {d.taskBreakdown.map((row) => {
            const total = row.completed + row.pending + row.overdue;
            return (
              <div key={row.category}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700 dark:text-white/70">{row.category}</span>
                  <span className="text-[10px] text-neutral-400 dark:text-white/30">
                    {row.completed}/{total}
                  </span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/[0.04]">
                  <div
                    className="bg-[#00E676] transition-all"
                    style={{ width: `${(row.completed / total) * 100}%` }}
                  />
                  <div
                    className="bg-[#FFB300] transition-all"
                    style={{ width: `${(row.pending / total) * 100}%` }}
                  />
                  <div
                    className="bg-[#E53935] transition-all"
                    style={{ width: `${(row.overdue / total) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
          {/* Legend */}
          <div className="flex gap-4 pt-1">
            {[
              { label: 'Concluídas', color: 'bg-[#00E676]' },
              { label: 'Pendentes', color: 'bg-[#FFB300]' },
              { label: 'Atrasadas', color: 'bg-[#E53935]' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${l.color}`} />
                <span className="text-[10px] text-neutral-400 dark:text-white/30">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Pomodoros — Ring + Stats */}
      <SectionCard title="Pomodoros concluídos vs. planejados">
        <div className="flex items-center gap-4">
          <RingProgress value={pomoPct} size={80} label={`${pomoPct}%`} />
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-neutral-200 dark:border-white/[0.055] bg-neutral-50 dark:bg-white/[0.03] p-2.5 text-center">
                <p className="text-xl font-extrabold text-[#00E676]">{d.pomodoroCompleted}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/30">Concluídos</p>
              </div>
              <div className="rounded-lg border border-neutral-200 dark:border-white/[0.055] bg-neutral-50 dark:bg-white/[0.03] p-2.5 text-center">
                <p className="text-xl font-extrabold text-neutral-900 dark:text-white/90">{d.pomodoroPlanned}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/30">Planejados</p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
