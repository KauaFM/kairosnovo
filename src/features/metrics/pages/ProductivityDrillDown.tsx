import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, Minus,
  Target, Calendar, Clock, Zap, TrendingUp,
} from 'lucide-react';
import type { DomainKey, Period } from '../types/metrics.types';
import { PERIOD_LABELS } from '../types/metrics.types';
import { PRODUCTIVITY_DATA } from '../data/mockData';
import { ActivityHeatmap } from '../components/ActivityHeatmap';

/* ════════════════════════════════════════════════════ */
/*  INVERTED CONTRAST PALETTE                          */
/*  Light page  -> Hero card is DARK  (bg-zinc-950)    */
/*  Dark  page  -> Hero card is LIGHT (bg-zinc-50)     */
/* ════════════════════════════════════════════════════ */
function heroColors(isDark: boolean) {
  // The chart lives inside the *inverted* card
  return isDark
    ? {
        // Dark mode page → white hero card
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
        // Light mode page → black hero card
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
      <p className="text-sm font-mono font-bold tabular-nums">{payload[0].value.toFixed(0)} pts</p>
    </div>
  );
}

/* ── Execution Log mock ───────────────────────── */
const EXEC_LOG = [
  { date: '11/04', type: 'Deep Work',   time: '2h45',  status: 'DONE' as const },
  { date: '10/04', type: 'Sprint',      time: '4h10',  status: 'DONE' as const },
  { date: '10/04', type: 'Review',      time: '0h50',  status: 'DONE' as const },
  { date: '09/04', type: 'Deep Work',   time: '3h20',  status: 'DONE' as const },
  { date: '09/04', type: 'Estudo',      time: '1h15',  status: 'SKIP' as const },
  { date: '08/04', type: 'Sprint',      time: '3h55',  status: 'DONE' as const },
  { date: '08/04', type: 'Deep Work',   time: '2h00',  status: 'PART' as const },
  { date: '07/04', type: 'Planejamento', time: '1h30', status: 'DONE' as const },
  { date: '07/04', type: 'Deep Work',   time: '3h10',  status: 'DONE' as const },
  { date: '06/04', type: 'Sprint',      time: '4h25',  status: 'DONE' as const },
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

export function ProductivityDrillDown({ isDark, onBack }: Props) {
  const C = palette(isDark);
  const H = heroColors(isDark);
  const d = PRODUCTIVITY_DATA;

  const [period, setPeriod] = useState<Period>('month');
  const [goalInput, setGoalInput] = useState('');

  const pomoPct = Math.round((d.pomodoroCompleted / d.pomodoroPlanned) * 100);
  const totalOverdue = d.taskBreakdown.reduce((a, t) => a + t.overdue, 0);

  const heroGradientId = 'hero-area-grad';

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
            Produtividade // Execucao
          </span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-5xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
              {d.score}
            </span>
            <Delta value={d.variation.value} dir={d.variation.direction} />
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Pomodoros</span>
          <p className="text-lg font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
            {d.pomodoroCompleted}<span className="text-zinc-300 dark:text-zinc-600">/{d.pomodoroPlanned}</span>
          </p>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Zap,         label: 'Score',    value: String(d.score) },
          { icon: Clock,       label: 'Pomod.',   value: `${pomoPct}%` },
          { icon: Target,      label: 'Backlog',  value: String(totalOverdue) },
          { icon: TrendingUp,  label: 'Streak',   value: '14d' },
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
        {/* Title inside the inverted card */}
        <span className={`block text-[10px] font-mono font-semibold uppercase tracking-widest ${H.title} mb-3`}>
          Score de Produtividade // 30D
        </span>

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.antiProcScore} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id={heroGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={H.gradFrom} />
                  <stop offset="100%" stopColor={H.gradTo} />
                </linearGradient>
                {/* Glow filter */}
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
                domain={[0, 100]}
              />
              <Tooltip content={<HeroTooltip colors={H} />} />
              <ReferenceLine
                y={80}
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
              <ReferenceLine
                y={50}
                stroke={H.refLine}
                strokeDasharray="6 3"
                label={{
                  value: 'ALERT',
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
            { label: 'Min',  value: Math.round(Math.min(...d.antiProcScore.map((p) => p.value))) },
            { label: 'Avg',  value: Math.round(d.antiProcScore.reduce((a, p) => a + p.value, 0) / d.antiProcScore.length) },
            { label: 'Max',  value: Math.round(Math.max(...d.antiProcScore.map((p) => p.value))) },
            { label: 'P90',  value: Math.round([...d.antiProcScore.map((p) => p.value)].sort((a, b) => a - b)[Math.floor(d.antiProcScore.length * 0.9)]) },
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

      {/* ── Produtivo vs Ocioso ───────────────── */}
      <Mod title="Produtivo vs Ocioso // Semanal">
        <div className="h-[110px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.productiveVsIdle} barSize={18}>
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
              <Bar dataKey="productive" stackId="a" fill={C.bar} name="Produtivo" radius={[0, 0, 0, 0]} />
              <Bar dataKey="idle" stackId="a" fill={C.barMuted} name="Ocioso" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-zinc-500 dark:bg-zinc-400" />
            <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">Produtivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">Ocioso</span>
          </div>
        </div>
      </Mod>

      {/* ── Log de Execucao ───────────────────── */}
      <Mod title="Log de Execucao // Ultimos Registros">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Data', 'Tipo de Foco', 'Tempo', 'Status'].map((h) => (
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
              {EXEC_LOG.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
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

      {/* ── Breakdown por Categoria ────────────── */}
      <Mod title="Breakdown por Categoria">
        <div className="flex flex-col gap-3">
          {d.taskBreakdown.map((row) => {
            const total = row.completed + row.pending + row.overdue;
            return (
              <div key={row.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">{row.category}</span>
                  <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
                    {row.completed}/{total}
                  </span>
                </div>
                <div className="flex h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="bg-zinc-700 dark:bg-zinc-300" style={{ width: `${(row.completed / total) * 100}%` }} />
                  <div className="bg-zinc-400 dark:bg-zinc-500" style={{ width: `${(row.pending / total) * 100}%` }} />
                  <div className="bg-zinc-200 dark:bg-zinc-700" style={{ width: `${(row.overdue / total) * 100}%` }} />
                </div>
              </div>
            );
          })}
          <div className="flex gap-4 mt-1">
            {[
              { l: 'Concluidas', c: 'bg-zinc-700 dark:bg-zinc-300' },
              { l: 'Pendentes',  c: 'bg-zinc-400 dark:bg-zinc-500' },
              { l: 'Atrasadas',  c: 'bg-zinc-200 dark:bg-zinc-700' },
            ].map((item) => (
              <div key={item.l} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-sm ${item.c}`} />
                <span className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500">{item.l}</span>
              </div>
            ))}
          </div>
        </div>
      </Mod>

      {/* ── Vetor de Progresso (Inline Goal) ──── */}
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Target size={14} strokeWidth={1.6} className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Vetor de Progresso // Meta Ativa
          </span>
        </div>

        {/* Current goal */}
        <div className="border border-zinc-100 dark:border-zinc-800/60 rounded-xl p-3.5 mb-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
              Alcancar 80 de Score
            </p>
            <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0 ml-2">
              78/80
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-3 text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
            <Calendar size={10} strokeWidth={1.6} />
            <span>Prazo: 30/04/26</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-zinc-700 dark:bg-zinc-300 transition-all duration-700" style={{ width: '97.5%' }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums uppercase tracking-wider">
              Progresso: 97.5%
            </span>
            <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Ultima ativ: Hoje
            </span>
          </div>
        </div>

        {/* New goal input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="Definir nova meta..."
            className="
              flex-1 bg-zinc-50 dark:bg-zinc-900
              border border-zinc-200 dark:border-zinc-800
              rounded-xl px-3 py-2.5
              text-[10px] font-mono text-zinc-900 dark:text-zinc-200
              placeholder:text-zinc-300 dark:placeholder:text-zinc-600
              outline-none focus:border-zinc-400 dark:focus:border-zinc-600
              transition-colors
            "
          />
          <button
            disabled={!goalInput.trim()}
            onClick={() => {
              console.log('NEW_GOAL:', goalInput);
              setGoalInput('');
            }}
            className="
              px-4 py-2.5 rounded-xl
              bg-zinc-900 dark:bg-zinc-100
              text-white dark:text-zinc-900
              text-[9px] font-mono font-semibold uppercase tracking-widest
              hover:bg-zinc-800 dark:hover:bg-zinc-200
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-colors shrink-0
            "
          >
            Deploy
          </button>
        </div>
      </div>

      {/* ── Activity Heatmap // 90D ───────────── */}
      <ActivityHeatmap title="Activity Heatmap // 90 Dias" seed={314} />

      {/* ── Footer ────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600 tabular-nums">
          SYNC {new Date().toLocaleDateString('pt-BR')}{' '}
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600">PROD MODULE v2.0 // ORVAX SYS</span>
      </div>
    </div>
  );
}
