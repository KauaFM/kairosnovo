import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, Minus,
  Brain, BookOpen, Clock, GraduationCap,
} from 'lucide-react';
import type { DomainKey, Period } from '../types/metrics.types';
import { PERIOD_LABELS } from '../types/metrics.types';
import { MIND_DATA } from '../data/mockData';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { genPeriodDaily, genPeriodWeekly, scaleKpi, scaleVariation, periodLabel, periodCompareLabel } from '../utils/periodData';

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
    line: isDark ? 'rgba(255,255,255,0.55)' : '#52525b',
    lineMuted: isDark ? 'rgba(255,255,255,0.20)' : '#d4d4d8',
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

/* ── Study Log mock ──────────────────────────── */
const STUDY_LOG = [
  { date: '11/04', category: 'Cybersecurity', type: 'Pratica',  time: '1h30', status: 'DONE' as const },
  { date: '11/04', category: 'React',         type: 'Video',    time: '0h45', status: 'DONE' as const },
  { date: '10/04', category: 'Ingles',        type: 'Leitura',  time: '1h00', status: 'DONE' as const },
  { date: '10/04', category: 'Concursos',     type: 'Revisao',  time: '2h15', status: 'PART' as const },
  { date: '09/04', category: 'Cybersecurity', type: 'Pratica',  time: '1h45', status: 'DONE' as const },
  { date: '09/04', category: 'React',         type: 'Pratica',  time: '2h00', status: 'DONE' as const },
  { date: '08/04', category: 'Ingles',        type: 'Video',    time: '0h30', status: 'SKIP' as const },
  { date: '08/04', category: 'Concursos',     type: 'Leitura',  time: '1h15', status: 'DONE' as const },
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

export function MindDrillDown({ isDark, onBack }: Props) {
  const C = palette(isDark);
  const H = heroColors(isDark);
  const d = MIND_DATA;

  const [period, setPeriod] = useState<Period>('month');

  const heroGradientId = 'mind-hero-area-grad';

  /* ── Stats for hero chart ── */
  const cogValues = d.cognitiveLoad.map((p) => p.value);
  const cogMin = Math.round(Math.min(...cogValues) * 10) / 10;
  const cogAvg = Math.round((cogValues.reduce((a, v) => a + v, 0) / cogValues.length) * 10) / 10;
  const cogMax = Math.round(Math.max(...cogValues) * 10) / 10;
  const cogP90 = Math.round([...cogValues].sort((a, b) => a - b)[Math.floor(cogValues.length * 0.9)] * 10) / 10;

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
            Mente // Cognitivo
          </span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-5xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
              {d.weeklyDeepWorkHours}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">h/sem</span>
            <Delta value={d.variation.value} dir={d.variation.direction} />
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Sessoes</span>
          <p className="text-lg font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
            {d.studySessions}
          </p>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Brain,          label: 'Deep Work',  value: `${d.weeklyDeepWorkHours}h` },
          { icon: BookOpen,       label: 'Sessoes',    value: String(d.studySessions) },
          { icon: GraduationCap,  label: 'Cursos',     value: `${d.coursesCompleted}/${d.coursesStarted}` },
          { icon: Clock,          label: 'Duracao',    value: `${d.avgStudyDurationMin}m` },
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
          Carga Cognitiva // 30D
        </span>

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.cognitiveLoad} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id={heroGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={H.gradFrom} />
                  <stop offset="100%" stopColor={H.gradTo} />
                </linearGradient>
                <filter id="mind-hero-glow">
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
                  value: 'OVERLOAD',
                  fill: H.tick,
                  fontSize: 7,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  position: 'right',
                }}
              />
              <ReferenceLine
                y={5}
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
              <Area
                type="monotone"
                dataKey="value"
                stroke={H.line}
                strokeWidth={2}
                fill={`url(#${heroGradientId})`}
                filter="url(#mind-hero-glow)"
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
            { label: 'Min',  value: cogMin },
            { label: 'Avg',  value: cogAvg },
            { label: 'Max',  value: cogMax },
            { label: 'P90',  value: cogP90 },
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

      {/* ── Deep Work por Dia ─────────────────── */}
      <Mod title="Deep Work por Dia // Semanal">
        <div className="h-[110px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.deepWorkByDay} barSize={22}>
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
              <Bar dataKey="value" fill={C.bar} name="Deep Work" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Mod>

      {/* ── Retention vs Dispersion ───────────── */}
      <div className="grid grid-cols-2 gap-2">
        <Mod title="Retencao // 12 Sem">
          <div className="h-[100px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.retentionRate} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
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
                  domain={[0, 100]}
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
                  name="Retencao %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 mt-1.5 uppercase tracking-wider">
            Tendencia: Subindo
          </p>
        </Mod>

        <Mod title="Dispersao // 12 Sem">
          <div className="h-[100px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.dispersionIndex} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
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
                  domain={[0, 100]}
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
                  name="Dispersao Idx"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 mt-1.5 uppercase tracking-wider">
            Tendencia: Descendo
          </p>
        </Mod>
      </div>

      {/* ── Log de Estudo ─────────────────────── */}
      <Mod title="Log de Estudo // Ultimos Registros">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Data', 'Categoria', 'Tipo', 'Tempo', 'Status'].map((h) => (
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
              {STUDY_LOG.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                    {row.category}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {row.type}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {row.time}
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

      {/* ── Input vs Output ───────────────────── */}
      <Mod title="Input vs Output // Analise">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Consumo</span>
            <p className="text-xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none mt-0.5">12h</p>
            <p className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">Videos, Leitura, Cursos</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-[9px] font-mono font-bold text-zinc-500 dark:text-zinc-400 tabular-nums">1:3</span>
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="flex-1 text-right">
            <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Producao</span>
            <p className="text-xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none mt-0.5">4h</p>
            <p className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">Pratica, Projetos, Code</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="bg-zinc-700 dark:bg-zinc-300" style={{ width: '75%' }} />
            <div className="bg-zinc-300 dark:bg-zinc-600" style={{ width: '25%' }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-zinc-700 dark:bg-zinc-300" />
              <span className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500">Consumo 75%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-zinc-300 dark:bg-zinc-600" />
              <span className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500">Producao 25%</span>
            </div>
          </div>
        </div>
      </Mod>

      {/* ── Focus Heatmap // 90D ──────────────── */}
      <ActivityHeatmap title="Focus Heatmap // 90 Dias" seed={271} />

      {/* ── Footer ────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600 tabular-nums">
          SYNC {new Date().toLocaleDateString('pt-BR')}{' '}
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600">MIND MODULE v2.0 // ORVAX SYS</span>
      </div>
    </div>
  );
}
