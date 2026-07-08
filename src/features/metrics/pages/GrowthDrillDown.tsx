import { useState, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, Minus,
  TrendingUp, Trophy, Target, Flame,
} from 'lucide-react';
import type { DomainKey, Period } from '../types/metrics.types';
import { PERIOD_LABELS } from '../types/metrics.types';
import { GROWTH_DATA } from '../data/mockData';
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

/* ── Hero Radar tooltip ──────────────────────── */
function HeroRadarTooltip({ active, payload, colors }: any) {
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
      <p className="text-[9px] font-mono uppercase tracking-wider opacity-50 mb-0.5">{payload[0]?.payload?.skill}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-[10px] font-mono tabular-nums">
          <span className="opacity-50">{p.dataKey === 'current' ? 'Atual' : 'Anterior'}:</span>{' '}
          <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ── Growth Log mock ─────────────────────────── */
const GROWTH_LOG = [
  { date: '11/04', activity: 'Leitura',    category: 'Conhecimento', time: '1h30', impact: 'Alto' as const },
  { date: '10/04', activity: 'Curso',      category: 'Hard Skill',   time: '2h15', impact: 'Alto' as const },
  { date: '10/04', activity: 'Projeto',    category: 'Hard Skill',   time: '3h00', impact: 'Medio' as const },
  { date: '09/04', activity: 'Mentoria',   category: 'Soft Skill',   time: '1h00', impact: 'Alto' as const },
  { date: '09/04', activity: 'Leitura',    category: 'Conhecimento', time: '0h45', impact: 'Medio' as const },
  { date: '08/04', activity: 'Hackathon',  category: 'Hard Skill',   time: '4h30', impact: 'Alto' as const },
  { date: '07/04', activity: 'Curso',      category: 'Hard Skill',   time: '1h45', impact: 'Medio' as const },
  { date: '06/04', activity: 'Projeto',    category: 'Soft Skill',   time: '2h00', impact: 'Baixo' as const },
];

const IMPACT_CLS: Record<string, string> = {
  Alto:  'text-zinc-700 dark:text-zinc-300',
  Medio: 'text-zinc-500 dark:text-zinc-400',
  Baixo: 'text-zinc-400 dark:text-zinc-600',
};

/* ════════════════════════════════════════════════════ */
/*  COMPONENT                                          */
/* ════════════════════════════════════════════════════ */
interface Props {
  isDark: boolean;
  onBack: () => void;
  onCreateGoal: (domainKey: DomainKey) => void;
}

export function GrowthDrillDown({ isDark, onBack }: Props) {
  const _C = palette(isDark);
  const H = heroColors(isDark);
  const d = GROWTH_DATA;

  const [period, setPeriod] = useState<Period>('month');

  const activeOkrs = d.okrCompletion.length;
  const avgStreak = Math.round(d.habitStreaks.reduce((a, h) => a + h.streak, 0) / d.habitStreaks.length);

  /* ── Radar data for hero chart ── */
  const radarData = useMemo(() =>
    d.skillRadar.map((s) => ({
      skill: s.skill,
      current: s.current,
      previous: s.previous,
    })),
  [d.skillRadar]);

  /* ── Stats strip for radar (current values) ── */
  const currentValues = d.skillRadar.map((s) => s.current);
  const radarStats = useMemo(() => [
    { label: 'Min', value: Math.min(...currentValues) },
    { label: 'Avg', value: Math.round(currentValues.reduce((a, v) => a + v, 0) / currentValues.length) },
    { label: 'Max', value: Math.max(...currentValues) },
    { label: 'P90', value: [...currentValues].sort((a, b) => a - b)[Math.floor(currentValues.length * 0.9)] },
  ], [currentValues]);

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
            Crescimento // Evolucao
          </span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-5xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
              {d.growthRate}%
            </span>
            <Delta value={d.variation.value} dir={d.variation.direction} />
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Dias Perfeitos</span>
          <p className="text-lg font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
            {d.perfectDays}<span className="text-zinc-300 dark:text-zinc-600">/{d.totalDays}</span>
          </p>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: TrendingUp, label: 'Growth',    value: `${d.growthRate}%` },
          { icon: Trophy,     label: 'Perfect',   value: `${d.perfectDays}/${d.totalDays}` },
          { icon: Target,     label: 'OKRs',      value: String(activeOkrs) },
          { icon: Flame,      label: 'Streak',    value: `${avgStreak}d` },
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
      {/*  HERO CHART — INVERTED CONTRAST RADAR   */}
      {/* ════════════════════════════════════════ */}
      <div className={`border ${H.border} ${H.bg} rounded-2xl p-4 relative overflow-hidden`}>
        <span className={`block text-[10px] font-mono font-semibold uppercase tracking-widest ${H.title} mb-3`}>
          Skill Radar // Atual vs Anterior
        </span>

        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <defs>
                <filter id="growth-radar-glow">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <PolarGrid stroke={H.grid} strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{
                  fill: H.tick,
                  fontSize: 8,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{
                  fill: H.tick,
                  fontSize: 7,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}
                axisLine={false}
              />
              <Tooltip content={<HeroRadarTooltip colors={H} />} />
              <Radar
                name="Anterior"
                dataKey="previous"
                stroke={H.tick}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="transparent"
                dot={false}
              />
              <Radar
                name="Atual"
                dataKey="current"
                stroke={H.line}
                strokeWidth={2}
                fill={H.gradFrom}
                fillOpacity={0.4}
                filter="url(#growth-radar-glow)"
                dot={{
                  r: 3,
                  fill: H.dotFill,
                  strokeWidth: 0,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Inline stats below the chart */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/10 dark:border-zinc-200/10">
          {radarStats.map((s) => (
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

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5" style={{ background: H.line }} />
            <span className={`text-[8px] font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Atual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 border-t border-dashed" style={{ borderColor: H.tick }} />
            <span className={`text-[8px] font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Anterior</span>
          </div>
        </div>
      </div>

      {/* ── Habit Streaks Table ───────────────── */}
      <Mod title="Habit Streaks // Sequencias Ativas">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Habito', 'Streak', 'Consistencia', ''].map((h) => (
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
              {d.habitStreaks.map((habit) => (
                <tr
                  key={habit.name}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                    {habit.name}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {habit.streak}d
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 tabular-nums">
                    {habit.consistency}%
                  </td>
                  <td className="py-2 px-1.5 w-24">
                    <div className="w-full h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-600 dark:bg-zinc-400 transition-all duration-500"
                        style={{ width: `${habit.consistency}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Mod>

      {/* ── OKR Completion ────────────────────── */}
      <Mod title="OKR Completion // Objetivos">
        <div className="flex flex-col gap-3">
          {d.okrCompletion.map((okr) => {
            const pct = Math.round((okr.progress / okr.target) * 100);
            return (
              <div key={okr.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">{okr.name}</span>
                  <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
                    {okr.progress}/{okr.target} ({pct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-zinc-700 dark:bg-zinc-300 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Mod>

      {/* ── Skill Progression Detail ──────────── */}
      <Mod title="Skill Progression // Detalhado">
        <div className="flex flex-col gap-2.5">
          {d.skillRadar.map((skill) => {
            const delta = skill.current - skill.previous;
            return (
              <div key={skill.skill}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">{skill.skill}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-600 tabular-nums">{skill.previous}</span>
                    <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
                      {delta > 0 ? <ArrowUpRight size={9} strokeWidth={2} className="inline" /> : delta < 0 ? <ArrowDownRight size={9} strokeWidth={2} className="inline" /> : <Minus size={9} strokeWidth={2} className="inline" />}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">{skill.current}</span>
                    <span className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
                      ({delta > 0 ? '+' : ''}{delta})
                    </span>
                  </div>
                </div>
                <div className="w-full h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-zinc-600 dark:bg-zinc-400 transition-all duration-500"
                    style={{ width: `${skill.current}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Mod>

      {/* ── Growth Log Table ──────────────────── */}
      <Mod title="Growth Log // Ultimos Registros">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Data', 'Atividade', 'Categoria', 'Tempo', 'Impacto'].map((h) => (
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
              {GROWTH_LOG.map((row, i) => (
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
                  <td className="py-2 px-1.5 text-[9px] font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {row.category}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {row.time}
                  </td>
                  <td className={`py-2 px-1.5 text-[9px] font-mono font-semibold uppercase tracking-wider ${IMPACT_CLS[row.impact] ?? ''}`}>
                    {row.impact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Mod>

      {/* ── Growth Heatmap // 90D ────────────── */}
      <ActivityHeatmap title="Growth Heatmap // 90 Dias" seed={719} />

      {/* ── Footer ────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600 tabular-nums">
          SYNC {new Date().toLocaleDateString('pt-BR')}{' '}
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600">GROWTH MODULE v2.0 // ORVAX SYS</span>
      </div>
    </div>
  );
}
