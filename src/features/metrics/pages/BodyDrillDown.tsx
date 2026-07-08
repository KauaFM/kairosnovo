import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, Minus,
  Flame, Activity, Droplets, Dumbbell,
} from 'lucide-react';
import type { DomainKey, Period } from '../types/metrics.types';
import { PERIOD_LABELS } from '../types/metrics.types';
import { BODY_DATA } from '../data/mockData';
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
    barMid: isDark ? 'rgba(255,255,255,0.30)' : '#a1a1aa',
    line: isDark ? 'rgba(255,255,255,0.55)' : '#52525b',
    lineMuted: isDark ? 'rgba(255,255,255,0.20)' : '#d4d4d8',
    grid: isDark ? 'rgba(255,255,255,0.04)' : '#f4f4f5',
    tick: isDark ? 'rgba(255,255,255,0.25)' : '#a1a1aa',
    tooltipBg: isDark ? '#09090b' : '#fafafa',
    tooltipBdr: isDark ? '#27272a' : '#e4e4e7',
    /* Sleep stacked bars */
    sleepDeep: isDark ? 'rgba(255,255,255,0.55)' : '#3f3f46',
    sleepRem: isDark ? 'rgba(255,255,255,0.30)' : '#71717a',
    sleepLight: isDark ? 'rgba(255,255,255,0.12)' : '#d4d4d8',
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

/* ── Custom tooltip ───────────────────────────── */
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
      <p className="text-sm font-mono font-bold tabular-nums">{payload[0].value.toFixed(1)}</p>
    </div>
  );
}

/* ── Body Log mock ───────────────────────────── */
const BODY_LOG = [
  { date: '11/04', activity: 'Musculacao',  duration: '1h15', intensity: 'Alta'  as const, status: 'DONE' as const },
  { date: '11/04', activity: 'Caminhada',   duration: '0h40', intensity: 'Baixa' as const, status: 'DONE' as const },
  { date: '10/04', activity: 'HIIT',        duration: '0h30', intensity: 'Alta'  as const, status: 'DONE' as const },
  { date: '10/04', activity: 'Yoga',        duration: '0h45', intensity: 'Baixa' as const, status: 'DONE' as const },
  { date: '09/04', activity: 'Musculacao',  duration: '1h20', intensity: 'Alta'  as const, status: 'DONE' as const },
  { date: '09/04', activity: 'Cardio',      duration: '0h35', intensity: 'Media' as const, status: 'PART' as const },
  { date: '08/04', activity: 'Musculacao',  duration: '1h10', intensity: 'Media' as const, status: 'DONE' as const },
  { date: '08/04', activity: 'Caminhada',   duration: '0h50', intensity: 'Baixa' as const, status: 'SKIP' as const },
];

const STATUS_CLS: Record<string, string> = {
  DONE: 'text-zinc-700 dark:text-zinc-300',
  SKIP: 'text-zinc-400 dark:text-zinc-600 line-through',
  PART: 'text-zinc-500 dark:text-zinc-400 italic',
};

/* ════════════════════════════════════════════════════ */
/*  COMPONENT                                          */
/* ════════════════════════════════════════════════════ */
interface Props {
  isDark: boolean;
  onBack: () => void;
  onCreateGoal: (domainKey: DomainKey) => void;
}

export function BodyDrillDown({ isDark, onBack }: Props) {
  const C = palette(isDark);
  const H = heroColors(isDark);
  const d = BODY_DATA;

  const [period, setPeriod] = useState<Period>('month');

  const heroGradientId = 'body-hero-area-grad';

  /* ── Stats for hero chart ── */
  const energyValues = d.energyLevel.map((p) => p.value);
  const eMin = Math.round(Math.min(...energyValues) * 10) / 10;
  const eAvg = Math.round((energyValues.reduce((a, v) => a + v, 0) / energyValues.length) * 10) / 10;
  const eMax = Math.round(Math.max(...energyValues) * 10) / 10;
  const eP90 = Math.round([...energyValues].sort((a, b) => a - b)[Math.floor(energyValues.length * 0.9)] * 10) / 10;

  /* ── Hydration avg ── */
  const hydrationAvg = Math.round((d.hydration.reduce((a, p) => a + p.value, 0) / d.hydration.length) * 10) / 10;

  /* ── Recovery readiness (derived) ── */
  const recoveryScore = Math.round(d.consistencyScore * 0.85 + d.workoutStreak * 0.4);
  const recoveryClamped = Math.min(100, Math.max(0, recoveryScore));

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
            Corpo // Bio-Fisico
          </span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-5xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
              {d.consistencyScore}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">pts</span>
            <Delta value={d.variation.value} dir={d.variation.direction} />
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Streak</span>
          <p className="text-lg font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
            {d.workoutStreak}<span className="text-zinc-300 dark:text-zinc-600">d</span>
          </p>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Flame,     label: 'Streak',       value: `${d.workoutStreak}d` },
          { icon: Activity,  label: 'Consist.',     value: `${d.consistencyScore}%` },
          { icon: Droplets,  label: 'Hidrat.',      value: `${hydrationAvg}L` },
          { icon: Dumbbell,  label: 'Carga',        value: String(Math.round(d.trainingLoad[d.trainingLoad.length - 1].value)) },
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
          Nivel de Energia // 30D
        </span>

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.energyLevel} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id={heroGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={H.gradFrom} />
                  <stop offset="100%" stopColor={H.gradTo} />
                </linearGradient>
                <filter id="body-hero-glow">
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
                interval={5}
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
                domain={[0, 10]}
              />
              <Tooltip content={<HeroTooltip colors={H} />} />
              <ReferenceLine
                y={8}
                stroke={H.refLine}
                strokeDasharray="6 3"
                label={{
                  value: 'HIGH',
                  fill: H.tick,
                  fontSize: 7,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  position: 'right',
                }}
              />
              <ReferenceLine
                y={4}
                stroke={H.refLine}
                strokeDasharray="6 3"
                label={{
                  value: 'LOW',
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
                filter="url(#body-hero-glow)"
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
          {[
            { label: 'Min',  value: eMin },
            { label: 'Avg',  value: eAvg },
            { label: 'Max',  value: eMax },
            { label: 'P90',  value: eP90 },
          ].map((s) => (
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
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sleep Architecture ─────────────────── */}
      <Mod title="Arquitetura do Sono // Semanal">
        <div className="h-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.sleepData} barSize={20}>
              <CartesianGrid strokeDasharray="2 2" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false} width={20} unit="h"
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
              <Bar dataKey="deep" stackId="sleep" fill={C.sleepDeep} name="Profundo" radius={[0, 0, 0, 0]} />
              <Bar dataKey="rem" stackId="sleep" fill={C.sleepRem} name="REM" radius={[0, 0, 0, 0]} />
              <Bar dataKey="light" stackId="sleep" fill={C.sleepLight} name="Leve" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2">
          {[
            { l: 'Profundo', c: 'bg-zinc-700 dark:bg-zinc-300' },
            { l: 'REM',      c: 'bg-zinc-500 dark:bg-zinc-500' },
            { l: 'Leve',     c: 'bg-zinc-200 dark:bg-zinc-700' },
          ].map((item) => (
            <div key={item.l} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${item.c}`} />
              <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">{item.l}</span>
            </div>
          ))}
        </div>
      </Mod>

      {/* ── Training Load vs Frequency ────────── */}
      <div className="grid grid-cols-2 gap-2">
        <Mod title="Carga Treino // 12 Sem">
          <div className="h-[100px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.trainingLoad} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={C.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: C.tick, fontSize: 7, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                  axisLine={false} tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: C.tick, fontSize: 7, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                  axisLine={false} tickLine={false} width={22}
                />
                <Tooltip
                  contentStyle={{
                    background: C.tooltipBg,
                    border: `1px solid ${C.tooltipBdr}`,
                    borderRadius: 10,
                    fontSize: 9,
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={C.line}
                  strokeWidth={1.5}
                  dot={false}
                  name="Carga"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 mt-1.5 uppercase tracking-wider">
            Tendencia: Subindo
          </p>
        </Mod>

        <Mod title="Frequencia // 12 Sem">
          <div className="h-[100px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.weeklyFrequency} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={C.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: C.tick, fontSize: 7, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                  axisLine={false} tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: C.tick, fontSize: 7, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                  axisLine={false} tickLine={false} width={22}
                  unit="x"
                />
                <Tooltip
                  contentStyle={{
                    background: C.tooltipBg,
                    border: `1px solid ${C.tooltipBdr}`,
                    borderRadius: 10,
                    fontSize: 9,
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={C.line}
                  strokeWidth={1.5}
                  dot={false}
                  name="Freq/sem"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 mt-1.5 uppercase tracking-wider">
            Media: {(d.weeklyFrequency.reduce((a, p) => a + p.value, 0) / d.weeklyFrequency.length).toFixed(1)}x/sem
          </p>
        </Mod>
      </div>

      {/* ── Hydration Tracker ─────────────────── */}
      <Mod title="Hidratacao // Semanal">
        <div className="h-[110px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.hydration} barSize={22}>
              <CartesianGrid strokeDasharray="2 2" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false} width={20} unit="L"
                domain={[0, 4]}
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
                y={2.5}
                stroke={C.line}
                strokeDasharray="6 3"
                label={{
                  value: 'META 2.5L',
                  fill: C.tick,
                  fontSize: 7,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  position: 'right',
                }}
              />
              <Bar dataKey="value" fill={C.bar} name="Litros" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 mt-1.5 uppercase tracking-wider">
          Media: {hydrationAvg}L / dia
        </p>
      </Mod>

      {/* ── Body Log ──────────────────────────── */}
      <Mod title="Log Corporal // Ultimos Registros">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Data', 'Atividade', 'Duracao', 'Intens.', 'Status'].map((h) => (
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
              {BODY_LOG.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                    {row.activity}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {row.duration}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {row.intensity}
                  </td>
                  <td className={`py-2 px-1.5 text-[9px] font-mono font-semibold uppercase tracking-wider ${STATUS_CLS[row.status] ?? ''}`}>
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Mod>

      {/* ── Recovery Readiness ─────────────────── */}
      <Mod title="Recovery Readiness // Prontidao">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-3xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
              {recoveryClamped}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 ml-1">/100</span>
          </div>
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            {recoveryClamped >= 80 ? 'PRONTO' : recoveryClamped >= 60 ? 'MODERADO' : 'BAIXO'}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-zinc-700 dark:bg-zinc-300 transition-all duration-700"
            style={{ width: `${recoveryClamped}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'Sono',        value: '7.3h',  sub: 'Media semanal' },
            { label: 'Streak',      value: `${d.workoutStreak}d`, sub: 'Consecutivos' },
            { label: 'Hidratacao',  value: `${hydrationAvg}L`,    sub: 'Media diaria' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">{item.value}</p>
              <p className="text-[8px] font-mono font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{item.label}</p>
              <p className="text-[7px] font-mono text-zinc-300 dark:text-zinc-600">{item.sub}</p>
            </div>
          ))}
        </div>
      </Mod>

      {/* ── Activity Heatmap // 90D ───────────── */}
      <ActivityHeatmap title="Activity Heatmap // 90 Dias" seed={523} />

      {/* ── Footer ────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600 tabular-nums">
          SYNC {new Date().toLocaleDateString('pt-BR')}{' '}
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600">BODY MODULE v2.0 // ORVAX SYS</span>
      </div>
    </div>
  );
}
