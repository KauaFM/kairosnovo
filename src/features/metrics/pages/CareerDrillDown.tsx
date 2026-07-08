import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, Minus,
  Briefcase, Clock, Target, Award,
} from 'lucide-react';
import type { DomainKey, Period } from '../types/metrics.types';
import { PERIOD_LABELS } from '../types/metrics.types';
import { CAREER_DATA } from '../data/mockData';
import { ActivityHeatmap } from '../components/ActivityHeatmap';

/* ════════════════════════════════════════════════════ */
/*  INVERTED CONTRAST PALETTE                          */
/*  Light page  -> Hero card is DARK  (bg-zinc-950)    */
/*  Dark  page  -> Hero card is LIGHT (bg-zinc-50)     */
/* ════════════════════════════════════════════════════ */
function heroColors(isDark: boolean) {
  return isDark
    ? {
        bg: 'bg-zinc-50',
        border: 'border-zinc-200',
        title: 'text-zinc-500',
        grid: '#e4e4e7',
        tick: '#a1a1aa',
        line: '#18181b',
        lineGlow: '#3f3f46',
        gradFrom: 'rgba(63,63,70,0.35)',
        gradTo: 'rgba(63,63,70,0.0)',
        refLine: '#d4d4d8',
        tooltipBg: '#ffffff',
        tooltipBdr: '#e4e4e7',
        tooltipText: '#18181b',
        dotFill: '#18181b',
      }
    : {
        bg: 'bg-zinc-950',
        border: 'border-zinc-800',
        title: 'text-zinc-500',
        grid: 'rgba(255,255,255,0.05)',
        tick: 'rgba(255,255,255,0.30)',
        line: '#ffffff',
        lineGlow: 'rgba(255,255,255,0.6)',
        gradFrom: 'rgba(255,255,255,0.18)',
        gradTo: 'rgba(255,255,255,0.0)',
        refLine: 'rgba(255,255,255,0.10)',
        tooltipBg: '#09090b',
        tooltipBdr: '#27272a',
        tooltipText: '#fafafa',
        dotFill: '#ffffff',
      };
}

/* ── Standard module palette ──────────────────── */
function palette(isDark: boolean) {
  return {
    bar: isDark ? 'rgba(255,255,255,0.50)' : '#3f3f46',
    barMuted: isDark ? 'rgba(255,255,255,0.10)' : '#e4e4e7',
    grid: isDark ? 'rgba(255,255,255,0.04)' : '#f4f4f5',
    tick: isDark ? 'rgba(255,255,255,0.25)' : '#a1a1aa',
    tooltipBg: isDark ? '#09090b' : '#fafafa',
    tooltipBdr: isDark ? '#27272a' : '#e4e4e7',
  };
}

/* ── Delta indicator ──────────────────────────── */
function Delta({ value, dir }: { value: number; dir: 'up' | 'down' | 'neutral' }) {
  const Icon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
      <Icon size={10} strokeWidth={1.8} />
      {Math.abs(value)}%
    </span>
  );
}

/* ── Module container ─────────────────────────── */
function Mod({ title, children, className = '' }: {
  title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl p-4 ${className}`}>
      <span className="block text-[10px] font-mono font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
        {title}
      </span>
      {children}
    </div>
  );
}

/* ── Custom tooltip ──────────────────────────── */
function HeroTooltip({ active, payload, label, colors }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: colors.tooltipBg,
        border: `1px solid ${colors.tooltipBdr}`,
        color: colors.tooltipText,
      }}
      className="rounded-xl px-3 py-2 shadow-lg"
    >
      <p className="text-[9px] font-mono uppercase tracking-wider opacity-50 mb-0.5">{label}</p>
      <p className="text-sm font-mono font-bold tabular-nums">{payload[0].value.toFixed(1)}h</p>
    </div>
  );
}

/* ── Zinc shades for time distribution bars ──── */
const ZINC_SHADES = [
  'bg-zinc-800 dark:bg-zinc-200',
  'bg-zinc-600 dark:bg-zinc-400',
  'bg-zinc-500 dark:bg-zinc-500',
  'bg-zinc-400 dark:bg-zinc-600',
  'bg-zinc-300 dark:bg-zinc-700',
];

/* ── Career Log mock ─────────────────────────── */
const CAREER_LOG = [
  { date: '11/04', project: 'Produto Principal', type: 'Estrategico',  time: '3h30', impact: 'P0' as const },
  { date: '10/04', project: 'Mentoria',          type: 'Mentoria',     time: '1h00', impact: 'P1' as const },
  { date: '10/04', project: 'Produto Principal', type: 'Operacional',  time: '2h45', impact: 'P0' as const },
  { date: '09/04', project: 'Estrategia',        type: 'Estrategico',  time: '2h00', impact: 'P1' as const },
  { date: '09/04', project: 'Admin',             type: 'Admin',        time: '0h45', impact: 'P3' as const },
  { date: '08/04', project: 'Produto Principal', type: 'Estrategico',  time: '4h15', impact: 'P0' as const },
  { date: '07/04', project: 'Operacional',       type: 'Operacional',  time: '1h30', impact: 'P2' as const },
  { date: '06/04', project: 'Mentoria',          type: 'Mentoria',     time: '1h15', impact: 'P1' as const },
];

const IMPACT_PRIORITY_CLS: Record<string, string> = {
  P0: 'text-zinc-700 dark:text-zinc-300 font-bold',
  P1: 'text-zinc-600 dark:text-zinc-400',
  P2: 'text-zinc-500 dark:text-zinc-500',
  P3: 'text-zinc-400 dark:text-zinc-600',
};

/* ════════════════════════════════════════════════════ */
/*  COMPONENT                                          */
/* ════════════════════════════════════════════════════ */
interface Props {
  isDark: boolean;
  onBack: () => void;
  onCreateGoal: (domainKey: DomainKey) => void;
}

export function CareerDrillDown({ isDark, onBack }: Props) {
  const C = palette(isDark);
  const H = heroColors(isDark);
  const d = CAREER_DATA;

  const [period, setPeriod] = useState<Period>('month');

  const lastAlignment = d.alignmentScore[d.alignmentScore.length - 1]?.value ?? 0;
  const milestonesCompleted = d.milestones.filter((m) => m.completed).length;
  const projectsActive = d.timeDistribution.length;
  const totalProjectHours = d.timeDistribution.reduce((a, p) => a + p.hours, 0);

  /* ── Combined bar data for high vs low impact ── */
  const comparisonData = useMemo(() =>
    d.highImpactHours.map((h, i) => ({
      label: h.label,
      high: h.value,
      low: d.lowImpactHours[i]?.value ?? 0,
    })),
  [d.highImpactHours, d.lowImpactHours]);

  /* ── Hero chart stats (highImpactHours) ── */
  const heroValues = d.highImpactHours.map((p) => p.value);
  const heroStats = useMemo(() => [
    { label: 'Min', value: Math.round(Math.min(...heroValues) * 10) / 10 },
    { label: 'Avg', value: Math.round((heroValues.reduce((a, v) => a + v, 0) / heroValues.length) * 10) / 10 },
    { label: 'Max', value: Math.round(Math.max(...heroValues) * 10) / 10 },
    { label: 'P90', value: Math.round([...heroValues].sort((a, b) => a - b)[Math.floor(heroValues.length * 0.9)] * 10) / 10 },
  ], [heroValues]);

  const heroGradientId = 'career-hero-area-grad';

  return (
    <div className="flex flex-col gap-3 pb-6">

      {/* ── Header ────────────────────────────── */}
      <div className="flex items-center justify-between py-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.8} />
          Voltar
        </button>
        <div className="flex gap-1">
          {(['week', 'month', '3m', '6m', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`
                px-2.5 py-1 text-[9px] font-mono font-semibold uppercase tracking-wider
                rounded-full transition-all
                ${period === p
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}
              `}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Title + Score ─────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Carreira // Profissional
          </span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-5xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
              {d.weeklyHighImpactHours}h
            </span>
            <Delta value={d.variation.value} dir={d.variation.direction} />
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Alinhamento</span>
          <p className="text-lg font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
            {lastAlignment.toFixed(1)}<span className="text-zinc-300 dark:text-zinc-600">/10</span>
          </p>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Briefcase, label: 'Hi-Imp.',   value: `${d.weeklyHighImpactHours}h` },
          { icon: Clock,     label: 'Alinham.',  value: lastAlignment.toFixed(1) },
          { icon: Target,    label: 'Marcos',    value: String(milestonesCompleted) },
          { icon: Award,     label: 'Projetos',  value: String(projectsActive) },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl p-2.5 text-center"
          >
            <Icon size={14} strokeWidth={1.5} className="mx-auto text-zinc-400 dark:text-zinc-500 mb-1" />
            <p className="text-sm font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">{value}</p>
            <p className="text-[8px] font-mono font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════ */}
      {/*  HERO CHART — INVERTED CONTRAST         */}
      {/* ════════════════════════════════════════ */}
      <div className={`border ${H.border} ${H.bg} rounded-2xl p-4 relative overflow-hidden`}>
        <span className={`block text-[10px] font-mono font-semibold uppercase tracking-widest ${H.title} mb-3`}>
          Horas Alto Impacto // 12 Semanas
        </span>

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.highImpactHours} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id={heroGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={H.gradFrom} />
                  <stop offset="100%" stopColor={H.gradTo} />
                </linearGradient>
                <filter id="career-hero-glow">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="2 3" stroke={H.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{
                  fill: H.tick,
                  fontSize: 8,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                tick={{
                  fill: H.tick,
                  fontSize: 8,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}
                axisLine={false}
                tickLine={false}
                width={28}
                unit="h"
              />
              <Tooltip content={<HeroTooltip colors={H} />} />
              <ReferenceLine
                y={25}
                stroke={H.refLine}
                strokeDasharray="6 3"
                label={{
                  value: 'TARGET',
                  fill: H.tick,
                  fontSize: 7,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  position: 'right',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={H.line}
                strokeWidth={2}
                fill={`url(#${heroGradientId})`}
                filter="url(#career-hero-glow)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: H.dotFill,
                  strokeWidth: 0,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Inline stats below the chart */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/10 dark:border-zinc-200/10">
          {heroStats.map((s) => (
            <div key={s.label} className="text-center">
              <span
                className={`block text-[8px] font-mono uppercase tracking-widest ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {s.label}
              </span>
              <span
                className={`text-xs font-mono font-bold tabular-nums ${
                  isDark ? 'text-zinc-700' : 'text-zinc-300'
                }`}
              >
                {s.value}h
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── High vs Low Impact Comparison ─────── */}
      <Mod title="Alto Impacto vs Baixo Impacto // Semanal">
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} barSize={12} barGap={2}>
              <CartesianGrid strokeDasharray="2 2" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false} width={24} unit="h"
              />
              <Tooltip
                contentStyle={{
                  background: C.tooltipBg,
                  border: `1px solid ${C.tooltipBdr}`,
                  borderRadius: 10,
                  fontSize: 10,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}
              />
              <Bar dataKey="high" fill={C.bar} name="Alto Impacto" radius={[3, 3, 0, 0]} />
              <Bar dataKey="low" fill={C.barMuted} name="Baixo Impacto" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-zinc-500 dark:bg-zinc-400" />
            <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">Alto Impacto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">Baixo Impacto</span>
          </div>
        </div>
      </Mod>

      {/* ── Time Distribution Breakdown ───────── */}
      <Mod title="Distribuicao de Tempo // Por Projeto">
        <div className="flex flex-col gap-3">
          {d.timeDistribution.map((proj, idx) => {
            const pct = Math.round((proj.hours / totalProjectHours) * 100);
            return (
              <div key={proj.project}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">{proj.project}</span>
                  <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
                    {proj.hours}h ({pct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${ZINC_SHADES[idx % ZINC_SHADES.length]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Mod>

      {/* ── Alignment Score Trend ─────────────── */}
      <Mod title="Alignment Score // Tendencia 12S">
        <div className="h-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.alignmentScore} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="2 2" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false} width={24}
                domain={[0, 10]}
              />
              <Tooltip
                contentStyle={{
                  background: C.tooltipBg,
                  border: `1px solid ${C.tooltipBdr}`,
                  borderRadius: 10,
                  fontSize: 10,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}
              />
              <ReferenceLine
                y={8}
                stroke={isDark ? 'rgba(255,255,255,0.08)' : '#e4e4e7'}
                strokeDasharray="6 3"
                label={{
                  value: 'TARGET',
                  fill: C.tick,
                  fontSize: 7,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  position: 'right',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={isDark ? '#d4d4d8' : '#3f3f46'}
                strokeWidth={2}
                dot={{ r: 2.5, fill: isDark ? '#d4d4d8' : '#3f3f46', strokeWidth: 0 }}
                activeDot={{ r: 4, fill: isDark ? '#fafafa' : '#18181b', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Mod>

      {/* ── Milestone Timeline ────────────────── */}
      <Mod title="Milestones // Timeline">
        <div className="flex flex-col gap-0">
          {d.milestones.map((ms, idx) => (
            <div key={ms.name} className="flex items-start gap-3">
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-3 h-3 rounded-full border-2 mt-0.5 ${
                    ms.completed
                      ? 'bg-zinc-700 dark:bg-zinc-300 border-zinc-700 dark:border-zinc-300'
                      : 'bg-transparent border-zinc-300 dark:border-zinc-600'
                  }`}
                />
                {idx < d.milestones.length - 1 && (
                  <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" />
                )}
              </div>
              {/* Content */}
              <div className="pb-4">
                <p className={`text-[10px] font-mono font-bold ${
                  ms.completed ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-600'
                }`}>
                  {ms.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
                    {new Date(ms.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </span>
                  <span className={`text-[8px] font-mono font-semibold uppercase tracking-wider ${
                    ms.completed ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-600'
                  }`}>
                    {ms.completed ? 'CONCLUIDO' : 'PENDENTE'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Mod>

      {/* ── Career Log Table ──────────────────── */}
      <Mod title="Career Log // Ultimos Registros">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Data', 'Projeto', 'Tipo', 'Tempo', 'Impacto'].map((h) => (
                  <th
                    key={h}
                    className="py-1.5 px-1.5 text-[8px] font-mono font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAREER_LOG.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                    {row.project}
                  </td>
                  <td className="py-2 px-1.5 text-[9px] font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {row.type}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {row.time}
                  </td>
                  <td className={`py-2 px-1.5 text-[9px] font-mono font-semibold uppercase tracking-wider ${IMPACT_PRIORITY_CLS[row.impact] ?? ''}`}>
                    {row.impact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Mod>

      {/* ── Career Heatmap // 90D ────────────── */}
      <ActivityHeatmap title="Career Heatmap // 90 Dias" seed={523} />

      {/* ── Footer ────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600 tabular-nums">
          SYNC {new Date().toLocaleDateString('pt-BR')}{' '}
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600">CAREER MODULE v2.0 // ORVAX SYS</span>
      </div>
    </div>
  );
}
