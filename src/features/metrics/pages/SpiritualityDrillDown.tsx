import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, Minus,
  Heart, Eye, BookOpen, Compass,
} from 'lucide-react';
import type { DomainKey, Period } from '../types/metrics.types';
import { PERIOD_LABELS } from '../types/metrics.types';
import { SPIRITUALITY_DATA } from '../data/mockData';
import { ActivityHeatmap } from '../components/ActivityHeatmap';

/* ════════════════════════════════════════════════════ */
/*  INVERTED CONTRAST PALETTE                          */
/*  Light page  -> Hero card is DARK  (bg-zinc-950)    */
/*  Dark  page  -> Hero card is LIGHT (bg-zinc-50)     */
/* ════════════════════════════════════════════════════ */
function heroColors(isDark: boolean) {
  return isDark
    ? {
        // Dark mode page -> white hero card
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
        // Light mode page -> black hero card
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
    line: isDark ? 'rgba(255,255,255,0.60)' : '#3f3f46',
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

/* ── Standard tooltip ─────────────────────────── */
function StdTooltip({ active, payload, label, C, unit = '' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: C.tooltipBg,
        border: `1px solid ${C.tooltipBdr}`,
        borderRadius: 10,
      }}
      className="px-3 py-2 shadow-lg"
    >
      <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">{label}</p>
      <p className="text-sm font-mono font-bold tabular-nums text-zinc-800 dark:text-zinc-200">
        {typeof payload[0].value === 'number' ? payload[0].value.toFixed(1) : payload[0].value}{unit}
      </p>
    </div>
  );
}

/* ── Contemplation Log mock ──────────────────── */
const CONTEMPLATION_LOG = [
  { date: '11/04', pratica: 'Meditacao',              duracao: '30min', profundidade: 'Profunda',    status: 'DONE' as const },
  { date: '10/04', pratica: 'Reflexao',               duracao: '20min', profundidade: 'Moderada',    status: 'DONE' as const },
  { date: '10/04', pratica: 'Journaling',             duracao: '15min', profundidade: 'Moderada',    status: 'DONE' as const },
  { date: '09/04', pratica: 'Oracao',                 duracao: '25min', profundidade: 'Profunda',    status: 'DONE' as const },
  { date: '09/04', pratica: 'Meditacao',              duracao: '20min', profundidade: 'Superficial', status: 'SKIP' as const },
  { date: '08/04', pratica: 'Leitura Contemplativa',  duracao: '35min', profundidade: 'Profunda',    status: 'DONE' as const },
  { date: '08/04', pratica: 'Reflexao',               duracao: '15min', profundidade: 'Moderada',    status: 'PART' as const },
  { date: '07/04', pratica: 'Meditacao',              duracao: '30min', profundidade: 'Profunda',    status: 'DONE' as const },
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

export function SpiritualityDrillDown({ isDark, onBack }: Props) {
  const C = palette(isDark);
  const H = heroColors(isDark);
  const d = SPIRITUALITY_DATA;

  const [period, setPeriod] = useState<Period>('month');

  const clarityPct = Math.round((d.clarityDays / d.totalDays) * 100);
  const lastGratitude = d.gratitudeEntries[d.gratitudeEntries.length - 1]?.value ?? 0;
  const lastAlignment = d.valueAlignment[d.valueAlignment.length - 1]?.value ?? 0;

  /* ── Practice distribution totals ── */
  const practiceTotal = d.practiceDistribution.reduce((a, p) => a + p.minutes, 0);

  /* ── Zinc shades for practice bars ── */
  const practiceZincLight = ['#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];
  const practiceZincDark = ['#d4d4d8', '#a1a1aa', '#71717a', '#52525b'];

  const heroGradientId = 'spirit-hero-area-grad';

  /* ── Stats helpers for hero ── */
  const peaceValues = d.innerPeace.map((p) => p.value);
  const peaceMin = Math.round(Math.min(...peaceValues) * 10) / 10;
  const peaceAvg = Math.round((peaceValues.reduce((a, v) => a + v, 0) / peaceValues.length) * 10) / 10;
  const peaceMax = Math.round(Math.max(...peaceValues) * 10) / 10;
  const peaceP90 = Math.round([...peaceValues].sort((a, b) => a - b)[Math.floor(peaceValues.length * 0.9)] * 10) / 10;

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
            Espiritualidade // Sentido
          </span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-5xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
              {d.weeklyMinutes}
            </span>
            <span className="text-sm font-mono text-zinc-400 dark:text-zinc-500">min/sem</span>
            <Delta value={d.variation.value} dir={d.variation.direction} />
          </div>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Heart,    label: 'Min/Sem',     value: String(d.weeklyMinutes) },
          { icon: Eye,      label: 'Clareza',     value: `${d.clarityDays}/${d.totalDays}` },
          { icon: BookOpen, label: 'Gratidao',    value: String(Math.round(lastGratitude)) },
          { icon: Compass,  label: 'Alinhamento', value: lastAlignment.toFixed(1) },
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
          Paz Interior // 30D
        </span>

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.innerPeace} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id={heroGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={H.gradFrom} />
                  <stop offset="100%" stopColor={H.gradTo} />
                </linearGradient>
                <filter id="hero-glow">
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
                  value: 'SERENITY',
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
                  value: 'TURBULENCE',
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
                filter="url(#hero-glow)"
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
            { label: 'Min',  value: peaceMin },
            { label: 'Avg',  value: peaceAvg },
            { label: 'Max',  value: peaceMax },
            { label: 'P90',  value: peaceP90 },
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

      {/* ── Practice Distribution Breakdown ───── */}
      <Mod title="Distribuicao de Praticas // Semanal">
        <div className="flex flex-col gap-3">
          {d.practiceDistribution.map((practice, idx) => {
            const pct = Math.round((practice.minutes / practiceTotal) * 100);
            const barColor = isDark ? practiceZincDark[idx] : practiceZincLight[idx];
            return (
              <div key={practice.type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">{practice.type}</span>
                  <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
                    {practice.minutes}min / {pct}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Mod>

      {/* ── Meditation Trend ──────────────────── */}
      <Mod title="Tendencia de Meditacao // 12 Semanas">
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.meditationMinutes} barSize={16}>
              <CartesianGrid strokeDasharray="2 2" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false}
                tickLine={false}
                width={24}
                unit="m"
              />
              <Tooltip content={<StdTooltip C={C} unit=" min" />} />
              <Bar dataKey="value" fill={C.bar} name="Meditacao" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Mod>

      {/* ── Value Alignment Score ─────────────── */}
      <Mod title="Score de Alinhamento de Valores // 12 Semanas">
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.valueAlignment} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="2 2" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false}
                tickLine={false}
                width={28}
                domain={[0, 5]}
              />
              <Tooltip content={<StdTooltip C={C} />} />
              <ReferenceLine
                y={4.0}
                stroke={isDark ? 'rgba(255,255,255,0.12)' : '#e4e4e7'}
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
                stroke={C.line}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 3,
                  fill: isDark ? '#fafafa' : '#18181b',
                  strokeWidth: 0,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Mod>

      {/* ── Gratitude Entries ─────────────────── */}
      <Mod title="Entradas de Gratidao // 12 Semanas">
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.gratitudeEntries} barSize={16}>
              <CartesianGrid strokeDasharray="2 2" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false}
                tickLine={false}
                width={20}
              />
              <Tooltip content={<StdTooltip C={C} />} />
              <Bar dataKey="value" fill={C.bar} name="Entradas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Mod>

      {/* ── Contemplation Log ────────────────── */}
      <Mod title="Log de Contemplacao // Ultimos Registros">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Data', 'Pratica', 'Duracao', 'Profundidade', 'Status'].map((h) => (
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
              {CONTEMPLATION_LOG.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                    {row.pratica}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {row.duracao}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {row.profundidade}
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

      {/* ── Presence Index Card ───────────────── */}
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl p-4">
        <span className="block text-[10px] font-mono font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
          Indice de Presenca // Dias de Clareza Mental
        </span>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
            {d.clarityDays}
          </span>
          <span className="text-lg font-mono text-zinc-300 dark:text-zinc-600 tabular-nums">/{d.totalDays}</span>
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider ml-1">dias</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-zinc-700 dark:bg-zinc-300 transition-all duration-700"
            style={{ width: `${clarityPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums uppercase tracking-wider">
            Progresso: {clarityPct}%
          </span>
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Meta: {d.totalDays} dias
          </span>
        </div>
      </div>

      {/* ── Contemplation Heatmap // 90D ──────── */}
      <ActivityHeatmap title="Heatmap Contemplativo // 90 Dias" seed={777} />

      {/* ── Footer ────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600 tabular-nums">
          SYNC {new Date().toLocaleDateString('pt-BR')}{' '}
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600">SPIRIT MODULE v2.0 // ORVAX SYS</span>
      </div>
    </div>
  );
}
