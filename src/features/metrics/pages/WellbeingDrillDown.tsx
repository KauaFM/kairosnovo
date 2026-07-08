import { useState, useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, Minus,
  Smile, Shield, Sun, Moon,
} from 'lucide-react';
import type { DomainKey, Period } from '../types/metrics.types';
import { PERIOD_LABELS } from '../types/metrics.types';
import { WELLBEING_DATA } from '../data/mockData';
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
    line: isDark ? 'rgba(255,255,255,0.60)' : '#3f3f46',
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

/* ── Custom hero tooltip ─────────────────────── */
function HeroTooltip({ active, payload, label, colors, unit }: any) {
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
      <p className="text-sm font-mono font-bold tabular-nums">{payload[0].value.toFixed(1)} {unit}</p>
    </div>
  );
}

/* ── Wellness Log mock ───────────────────────── */
const WELLNESS_LOG = [
  { date: '11/04', state: 'Energizado'  as const, sleep: '7h20', exercise: 'Sim' as const, note: 8 },
  { date: '10/04', state: 'Neutro'      as const, sleep: '6h40', exercise: 'Sim' as const, note: 7 },
  { date: '09/04', state: 'Cansado'     as const, sleep: '5h50', exercise: 'Nao' as const, note: 5 },
  { date: '08/04', state: 'Energizado'  as const, sleep: '7h45', exercise: 'Sim' as const, note: 9 },
  { date: '07/04', state: 'Estressado'  as const, sleep: '6h10', exercise: 'Nao' as const, note: 4 },
  { date: '06/04', state: 'Neutro'      as const, sleep: '7h00', exercise: 'Sim' as const, note: 6 },
  { date: '05/04', state: 'Energizado'  as const, sleep: '7h30', exercise: 'Sim' as const, note: 8 },
  { date: '04/04', state: 'Cansado'     as const, sleep: '5h20', exercise: 'Nao' as const, note: 4 },
];

const STATE_CLS: Record<string, string> = {
  Energizado:  'text-zinc-700 dark:text-zinc-300 font-bold',
  Neutro:      'text-zinc-500 dark:text-zinc-400',
  Cansado:     'text-zinc-400 dark:text-zinc-500 italic',
  Estressado:  'text-zinc-400 dark:text-zinc-600 line-through',
};

/* ════════════════════════════════════════════════════ */
/*  COMPONENT                                          */
/* ════════════════════════════════════════════════════ */
interface Props {
  isDark: boolean;
  onBack: () => void;
  onCreateGoal: (domainKey: DomainKey) => void;
}

export function WellbeingDrillDown({ isDark, onBack }: Props) {
  const C = palette(isDark);
  const H = heroColors(isDark);
  const d = WELLBEING_DATA;

  const [period, setPeriod] = useState<Period>('month');

  /* ── Derived KPIs ── */
  const avgStress = Math.round(
    (d.stressByHour.reduce((a, p) => a + p.value, 0) / d.stressByHour.length) * 10
  ) / 10;

  /* ── Hero chart stats ── */
  const heroValues = d.moodDaily.map((p) => p.value);
  const heroMin = Math.round(Math.min(...heroValues) * 10) / 10;
  const heroAvg = Math.round((heroValues.reduce((a, v) => a + v, 0) / heroValues.length) * 10) / 10;
  const heroMax = Math.round(Math.max(...heroValues) * 10) / 10;
  const heroP90 = Math.round([...heroValues].sort((a, b) => a - b)[Math.floor(heroValues.length * 0.9)] * 10) / 10;

  /* ── Day classification totals ── */
  const dayTotal = d.dayClassification.good + d.dayClassification.neutral + d.dayClassification.difficult;
  const goodPct = Math.round((d.dayClassification.good / dayTotal) * 100);
  const neutralPct = Math.round((d.dayClassification.neutral / dayTotal) * 100);
  const difficultPct = 100 - goodPct - neutralPct;

  /* ── Recovery bar width ── */
  const recoveryPct = Math.min(100, Math.max(0, d.recoveryIndex));

  const heroGradientId = 'wb-hero-area-grad';

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
            Bem-Estar // Wellness
          </span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-5xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
              {d.wellbeingScore}
            </span>
            <Delta value={d.variation.value} dir={d.variation.direction} />
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Recovery</span>
          <p className="text-lg font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
            {d.recoveryIndex}<span className="text-zinc-300 dark:text-zinc-600">%</span>
          </p>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Smile,   label: 'Bem-Estar', value: String(d.wellbeingScore) },
          { icon: Shield,  label: 'Recovery',  value: `${d.recoveryIndex}%` },
          { icon: Sun,     label: 'Bons Dias', value: String(d.dayClassification.good) },
          { icon: Moon,    label: 'Estresse',  value: avgStress.toFixed(1) },
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
      {/*  HERO CHART -- INVERTED CONTRAST        */}
      {/* ════════════════════════════════════════ */}
      <div className={`border ${H.border} ${H.bg} rounded-2xl p-4 relative overflow-hidden`}>
        <span className={`block text-[10px] font-mono font-semibold uppercase tracking-widest ${H.title} mb-3`}>
          Humor Diario // 30D
        </span>

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.moodDaily} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id={heroGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={H.gradFrom} />
                  <stop offset="100%" stopColor={H.gradTo} />
                </linearGradient>
                <filter id="wb-hero-glow">
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
              <Tooltip content={<HeroTooltip colors={H} unit="pts" />} />
              <ReferenceLine
                y={8}
                stroke={H.refLine}
                strokeDasharray="6 3"
                label={{
                  value: 'OPTIMAL',
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
                  value: 'CONCERN',
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
                filter="url(#wb-hero-glow)"
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

        {/* Inline stats */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/10 dark:border-zinc-200/10">
          {[
            { label: 'Min',  value: heroMin },
            { label: 'Avg',  value: heroAvg },
            { label: 'Max',  value: heroMax },
            { label: 'P90',  value: heroP90 },
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

      {/* ── Day Classification ───────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Bons',       count: d.dayClassification.good,      pct: goodPct },
          { label: 'Neutros',    count: d.dayClassification.neutral,   pct: neutralPct },
          { label: 'Dificeis',   count: d.dayClassification.difficult, pct: difficultPct },
        ].map((item) => (
          <div
            key={item.label}
            className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl p-3 text-center"
          >
            <p className="text-2xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
              {item.count}
            </p>
            <p className="text-[8px] font-mono font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mt-1 mb-2">
              {item.label}
            </p>
            <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-zinc-600 dark:bg-zinc-400 transition-all duration-500"
                style={{ width: `${item.pct}%` }}
              />
            </div>
            <p className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums mt-1">
              {item.pct}%
            </p>
          </div>
        ))}
      </div>

      {/* ── Stress by Hour (24h Pattern) ─────── */}
      <Mod title="Estresse por Hora // Padrao 24h">
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.stressByHour} margin={{ top: 5, right: 5, bottom: 0, left: -10 }} barSize={8}>
              <CartesianGrid strokeDasharray="2 2" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: C.tick, fontSize: 7, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false} width={20} domain={[0, 10]}
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
              <Bar dataKey="value" fill={C.bar} name="Estresse" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 mt-2">
          Horarios de pico indicam momentos de maior pressao no dia.
        </p>
      </Mod>

      {/* ── Leisure Hours Trend ──────────────── */}
      <Mod title="Horas de Lazer // 12 Semanas">
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.leisureHours} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
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
              <Line
                type="monotone"
                dataKey="value"
                stroke={C.line}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: C.line, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Mod>

      {/* ── Wellness Log Table ───────────────── */}
      <Mod title="Log de Bem-Estar // Ultimos Registros">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Data', 'Estado', 'Sono', 'Exercicio', 'Nota'].map((h) => (
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
              {WELLNESS_LOG.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className={`py-2 px-1.5 text-[10px] font-mono ${STATE_CLS[row.state] ?? ''}`}>
                    {row.state}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {row.sleep}
                  </td>
                  <td className={`py-2 px-1.5 text-[10px] font-mono ${
                    row.exercise === 'Sim'
                      ? 'text-zinc-700 dark:text-zinc-300 font-bold'
                      : 'text-zinc-400 dark:text-zinc-600'
                  }`}>
                    {row.exercise}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Mod>

      {/* ── Recovery Readiness Gauge ─────────── */}
      <Mod title="Prontidao de Recuperacao // Recovery Index">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
              {d.recoveryIndex}
            </span>
            <span className="text-lg font-mono font-bold text-zinc-300 dark:text-zinc-600">%</span>
          </div>
          <div className="w-full">
            <div className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-zinc-700 dark:bg-zinc-300 transition-all duration-700"
                style={{ width: `${recoveryPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">0%</span>
              <div className="flex items-center gap-3">
                {[
                  { label: 'Baixo', range: '0-40' },
                  { label: 'Medio', range: '41-70' },
                  { label: 'Alto', range: '71-100' },
                ].map((tier) => (
                  <span key={tier.label} className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600">
                    {tier.label} ({tier.range})
                  </span>
                ))}
              </div>
              <span className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">100%</span>
            </div>
          </div>
          <p className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 text-center">
            {recoveryPct >= 71
              ? 'Corpo e mente em condicao otima para alto desempenho.'
              : recoveryPct >= 41
              ? 'Recuperacao moderada. Considere descanso ativo.'
              : 'Recuperacao baixa. Priorize sono e alimentacao.'}
          </p>
        </div>
      </Mod>

      {/* ── Wellness Heatmap // 90D ──────────── */}
      <ActivityHeatmap title="Wellness Heatmap // 90 Dias" seed={517} />

      {/* ── Footer ────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600 tabular-nums">
          SYNC {new Date().toLocaleDateString('pt-BR')}{' '}
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600">WELL MODULE v2.0 // ORVAX SYS</span>
      </div>
    </div>
  );
}
