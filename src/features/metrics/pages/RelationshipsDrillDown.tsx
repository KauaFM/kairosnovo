import { useState, useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, Minus,
  Users, UserPlus, Heart, MessageCircle,
} from 'lucide-react';
import type { DomainKey, Period } from '../types/metrics.types';
import { PERIOD_LABELS } from '../types/metrics.types';
import { RELATIONSHIPS_DATA } from '../data/mockData';
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
    line: isDark ? 'rgba(255,255,255,0.60)' : '#3f3f46',
    lineMuted: isDark ? 'rgba(255,255,255,0.25)' : '#d4d4d8',
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

/* ── Network Health mock ─────────────────────── */
const NETWORK_LOG = [
  { name: 'Joao M.',    tipo: 'Mentor',  lastContact: '2d',  quality: 'Alta'  as const, status: 'ATIVO'    as const },
  { name: 'Ana L.',     tipo: 'Amigo',   lastContact: '5d',  quality: 'Alta'  as const, status: 'ATIVO'    as const },
  { name: 'Carlos R.',  tipo: 'Familia', lastContact: '1d',  quality: 'Media' as const, status: 'ATIVO'    as const },
  { name: 'Mariana S.', tipo: 'Colega',  lastContact: '12d', quality: 'Baixa' as const, status: 'PENDENTE' as const },
  { name: 'Pedro H.',   tipo: 'Mentor',  lastContact: '3d',  quality: 'Alta'  as const, status: 'ATIVO'    as const },
  { name: 'Julia F.',   tipo: 'Amigo',   lastContact: '1m',  quality: 'Baixa' as const, status: 'FRIO'     as const },
  { name: 'Lucas T.',   tipo: 'Familia', lastContact: '7d',  quality: 'Media' as const, status: 'ATIVO'    as const },
  { name: 'Beatriz O.', tipo: 'Colega',  lastContact: '15d', quality: 'Baixa' as const, status: 'PENDENTE' as const },
];

const STATUS_CLS: Record<string, string> = {
  ATIVO:    'text-zinc-700 dark:text-zinc-300',
  PENDENTE: 'text-zinc-500 dark:text-zinc-400 italic',
  FRIO:     'text-zinc-400 dark:text-zinc-600 line-through',
};

const QUALITY_CLS: Record<string, string> = {
  Alta:  'text-zinc-700 dark:text-zinc-300 font-bold',
  Media: 'text-zinc-500 dark:text-zinc-400',
  Baixa: 'text-zinc-400 dark:text-zinc-600',
};

/* ════════════════════════════════════════════════════ */
/*  COMPONENT                                          */
/* ════════════════════════════════════════════════════ */
interface Props {
  isDark: boolean;
  onBack: () => void;
  onCreateGoal: (domainKey: DomainKey) => void;
}

export function RelationshipsDrillDown({ isDark, onBack }: Props) {
  const C = palette(isDark);
  const H = heroColors(isDark);
  const d = RELATIONSHIPS_DATA;

  const [period, setPeriod] = useState<Period>('month');

  const lastSatisfaction = d.satisfactionScore[d.satisfactionScore.length - 1]?.value ?? 0;

  /* ── Social vs Focus balance (weekly mock) ── */
  const socialHours = d.weeklyQualityHours;
  const focusHours = 14.2;
  const totalBalance = socialHours + focusHours;
  const socialPct = Math.round((socialHours / totalBalance) * 100);
  const focusPct = 100 - socialPct;

  /* ── Hero chart stats ── */
  const heroValues = d.qualityTimeHours.map((p) => p.value);
  const heroMin = Math.round(Math.min(...heroValues) * 10) / 10;
  const heroAvg = Math.round((heroValues.reduce((a, v) => a + v, 0) / heroValues.length) * 10) / 10;
  const heroMax = Math.round(Math.max(...heroValues) * 10) / 10;
  const heroP90 = Math.round([...heroValues].sort((a, b) => a - b)[Math.floor(heroValues.length * 0.9)] * 10) / 10;

  const heroGradientId = 'rel-hero-area-grad';

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
            Relacionamentos // Social
          </span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-5xl font-mono font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
              {d.weeklyQualityHours}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">h/sem</span>
            <Delta value={d.variation.value} dir={d.variation.direction} />
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Satisfacao</span>
          <p className="text-lg font-mono font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
            {lastSatisfaction.toFixed(1)}<span className="text-zinc-300 dark:text-zinc-600">/10</span>
          </p>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Users,          label: 'Qualidade',   value: `${d.weeklyQualityHours}h` },
          { icon: UserPlus,       label: 'Novas',       value: String(d.newConnections) },
          { icon: Heart,          label: 'Mantidas',    value: String(d.maintainedConnections) },
          { icon: MessageCircle,  label: 'Satisf.',     value: lastSatisfaction.toFixed(1) },
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
          Horas de Qualidade // 12 Semanas
        </span>

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.qualityTimeHours} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id={heroGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={H.gradFrom} />
                  <stop offset="100%" stopColor={H.gradTo} />
                </linearGradient>
                <filter id="rel-hero-glow">
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
                domain={[0, 'auto']}
              />
              <Tooltip content={<HeroTooltip colors={H} unit="h" />} />
              <ReferenceLine
                y={10}
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
                filter="url(#rel-hero-glow)"
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
                {s.value}h
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Satisfaction Score Trend ──────────── */}
      <Mod title="Score de Satisfacao // 12 Semanas">
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.satisfactionScore} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="2 2" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false} width={24} domain={[0, 10]}
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

      {/* ── Conflict Resolution Index ────────── */}
      <Mod title="Indice de Conflito // 12 Semanas">
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.conflictIndex} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="2 2" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: C.tick, fontSize: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                axisLine={false} tickLine={false} width={24} domain={[0, 10]}
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
                y={3}
                stroke={C.lineMuted}
                strokeDasharray="6 3"
                label={{
                  value: 'ZONA SAUDAVEL',
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
                activeDot={{ r: 3, fill: C.line, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 mt-2">
          Valores abaixo da linha tracejada indicam zona saudavel de resolucao.
        </p>
      </Mod>

      {/* ── Network Health Table ──────────────── */}
      <Mod title="Saude da Rede // Contatos">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Contato', 'Tipo', 'Ult. Contato', 'Qualidade', 'Status'].map((h) => (
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
              {NETWORK_LOG.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="py-2 px-1.5 text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                    {row.name}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {row.tipo}
                  </td>
                  <td className="py-2 px-1.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
                    {row.lastContact}
                  </td>
                  <td className={`py-2 px-1.5 text-[10px] font-mono ${QUALITY_CLS[row.quality] ?? ''}`}>
                    {row.quality}
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

      {/* ── Social vs Focus Balance ──────────── */}
      <Mod title="Social vs Foco // Balanco Semanal">
        <div className="flex flex-col gap-3">
          {/* Social bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">Social</span>
              <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
                {socialHours}h ({socialPct}%)
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="bg-zinc-700 dark:bg-zinc-300 rounded-full transition-all duration-500"
                style={{ width: `${socialPct}%` }}
              />
            </div>
          </div>
          {/* Focus bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">Foco</span>
              <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
                {focusHours}h ({focusPct}%)
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="bg-zinc-400 dark:bg-zinc-500 rounded-full transition-all duration-500"
                style={{ width: `${focusPct}%` }}
              />
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-zinc-700 dark:bg-zinc-300" />
              <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">Social</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-zinc-400 dark:bg-zinc-500" />
              <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">Foco</span>
            </div>
          </div>
        </div>
      </Mod>

      {/* ── Social Heatmap // 90D ────────────── */}
      <ActivityHeatmap title="Social Heatmap // 90 Dias" seed={729} />

      {/* ── Footer ────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600 tabular-nums">
          SYNC {new Date().toLocaleDateString('pt-BR')}{' '}
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600">REL MODULE v2.0 // ORVAX SYS</span>
      </div>
    </div>
  );
}
