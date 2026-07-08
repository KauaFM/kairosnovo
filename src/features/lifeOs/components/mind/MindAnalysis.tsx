// =============================================================
// ORVAX · Life OS — Mind Analysis (Tela 2)
//
// Scroll vertical · 5 blocos com insights do engine:
//   1. Radar (5 eixos · highlight no pior)
//   2. Progresso 30d (AreaChart + média móvel)
//   3. Heatmap 90d (cascata · verde→cinza→vermelho)
//   4. Donut (foco profundo, distração, descanso)
//   5. Padrões IA (rankeados por impacto)
//   + CTA → Tela 3
//
// Hierarquia visual agressiva:
//   - Bloco com pior tendência: destaque máximo
//   - Outros blocos: opacidade reduzida
// =============================================================
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Brain, Activity, Compass, Target, Sparkles,
  TrendingUp, TrendingDown, AlertTriangle,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { MindData, MindDiagnosis, RadarAxis } from '../../data/mindTypes';
import { MIND_ACCENT } from '../../data/mindMockData';

// ─── Design tokens ──────────────────────────────────────────
const PAGE_BG  = 'bg-zinc-50 dark:bg-zinc-950';
const CARD     = 'rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800';
const CARD_ALERT = 'rounded-2xl bg-white dark:bg-zinc-900 border-2';
const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

// ─── Animation variants ─────────────────────────────────────
const blockReveal = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

// ─── Props ──────────────────────────────────────────────────
interface Props {
  data: MindData;
  diagnosis: MindDiagnosis;
  onDepth: () => void;
  onBack: () => void;
}

// ─── Helpers ────────────────────────────────────────────────
function SmallHead({
  title, sub, icon, alert,
}: { title: string; sub?: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <div>
      <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${alert ? 'text-rose-500 dark:text-rose-400 font-bold' : T_LABEL} flex items-center gap-1.5`}>
        {icon}{title}
      </p>
      {sub && <p className={`text-[9px] font-mono tracking-wider ${T_MUTED} mt-0.5`}>{sub}</p>}
    </div>
  );
}

function InsightBanner({ text, alert }: { text: string; alert?: boolean }) {
  return (
    <div className={[
      'mt-3 px-3 py-2.5 rounded-xl text-[12px] leading-relaxed font-medium',
      alert
        ? `bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 ${T_STRONG}`
        : `bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 ${T_NORMAL}`,
    ].join(' ')}>
      {alert && <AlertTriangle size={12} className="inline mr-1.5 text-rose-500" />}
      {text}
    </div>
  );
}

// =============================================================
// COMPONENT
// =============================================================
export function MindAnalysis({ data, diagnosis, onDepth, onBack }: Props) {
  const { radar, scoreSeries30d, heatmap90d, donut } = data;
  const insights = diagnosis.analysisInsights;

  // Find worst axis for visual hierarchy
  const worstAxis = useMemo(() => {
    return radar.reduce((w: RadarAxis, ax: RadarAxis) => {
      const d = ax.current - ax.previous;
      const wd = w.current - w.previous;
      return d < wd ? ax : w;
    }, radar[0]);
  }, [radar]);

  const distractionPct = donut.find(d => d.label.toLowerCase().includes('distração'))?.value ?? 0;
  const isDistracted = distractionPct > 35;

  return (
    <div className={`${PAGE_BG} min-h-screen w-full pb-12`}>
      {/* HEADER */}
      <header className="px-5 pt-6 pb-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className={`w-10 h-10 -ml-1 rounded-full flex items-center justify-center shrink-0
            ${T_LABEL} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800
            hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`}
          aria-label="Voltar"
        >
          <ChevronLeft size={20} strokeWidth={2.2} />
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: MIND_ACCENT }} />
            Mente · Análise
          </p>
          <h1 className={`mt-1 text-[24px] font-bold leading-tight tracking-tight ${T_STRONG}`}>
            Análise profunda
          </h1>
        </div>
      </header>

      {/* BLOCKS */}
      <div className="px-5 mt-4 space-y-3">

        {/* ─── BLOCO 1: RADAR ─────────────────────────────── */}
        <motion.div
          custom={0}
          variants={blockReveal}
          initial="hidden"
          animate="show"
          className={`${CARD} p-5`}
        >
          <SmallHead
            title="Mapa de equilíbrio"
            sub="Foco · calma · clareza · estabilidade · energia"
            icon={<Compass size={11} style={{ color: MIND_ACCENT }} />}
          />
          <div className="h-[240px] mt-2">
            <ResponsiveContainer>
              <RadarChart data={radar.map(a => ({ axis: a.axis, current: a.current, previous: a.previous }))} outerRadius="72%">
                <PolarGrid stroke="rgba(113,113,122,0.15)" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={({ x, y, payload }: any) => {
                    const isWorst = payload.value === worstAxis.axis;
                    return (
                      <text
                        x={x} y={y}
                        textAnchor="middle"
                        fontSize={isWorst ? 11 : 9}
                        fontFamily="ui-monospace, monospace"
                        fill={isWorst ? '#ef4444' : '#71717a'}
                        fontWeight={isWorst ? 700 : 400}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar
                  name="anterior"
                  dataKey="previous"
                  stroke="rgba(113,113,122,0.4)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  fill="transparent"
                  isAnimationActive={false}
                />
                <Radar
                  name="atual"
                  dataKey="current"
                  stroke={MIND_ACCENT}
                  strokeWidth={2}
                  fill={MIND_ACCENT}
                  fillOpacity={0.18}
                  isAnimationActive
                  animationDuration={1200}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex items-center justify-center gap-5 text-[9px] font-mono uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-zinc-500">
              <span className="w-4 h-px border-t border-dashed border-zinc-500" /> 7d atrás
            </span>
            <span className="flex items-center gap-1.5 font-bold" style={{ color: MIND_ACCENT }}>
              <span className="w-4 h-[2px] rounded-full" style={{ background: MIND_ACCENT }} /> hoje
            </span>
          </div>
          <InsightBanner
            text={insights.radar}
            alert={worstAxis.current - worstAxis.previous < -5}
          />
        </motion.div>

        {/* ─── BLOCO 2: PROGRESSO 30D ─────────────────────── */}
        <motion.div
          custom={1}
          variants={blockReveal}
          initial="hidden"
          animate="show"
          className={`${CARD} p-5`}
        >
          <SmallHead
            title="Evolução · 30 dias"
            sub="Score diário + média móvel 7d"
            icon={<TrendingUp size={11} style={{ color: MIND_ACCENT }} />}
          />
          <div className="h-[180px] mt-3 -mx-1">
            <ResponsiveContainer>
              <AreaChart data={scoreSeries30d} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="mind-progress-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={MIND_ACCENT} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={MIND_ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(113,113,122,0.12)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 8, fontFamily: 'monospace', fill: '#71717a' }}
                  axisLine={false} tickLine={false}
                  interval={6}
                />
                <YAxis
                  domain={[20, 100]}
                  tick={{ fontSize: 8, fontFamily: 'monospace', fill: '#71717a' }}
                  axisLine={false} tickLine={false}
                  width={24}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(24,24,27,0.96)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 14, padding: '8px 12px',
                    fontFamily: 'monospace', fontSize: 11, color: '#fafafa',
                  }}
                  formatter={(v: number) => [`${v}`, '']}
                />
                <ReferenceLine
                  y={70}
                  stroke={MIND_ACCENT}
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  strokeOpacity={0.4}
                />
                {/* Média móvel — dashed */}
                <Area
                  type="monotone"
                  dataKey="avg"
                  stroke="rgba(113,113,122,0.4)"
                  strokeDasharray="4 3"
                  strokeWidth={1.2}
                  fill="none"
                  dot={false}
                  isAnimationActive={false}
                />
                {/* Score principal */}
                <Area
                  type="natural"
                  dataKey="score"
                  stroke={MIND_ACCENT}
                  strokeWidth={2.5}
                  fill="url(#mind-progress-grad)"
                  dot={false}
                  activeDot={{ r: 4, fill: MIND_ACCENT, stroke: '#18181b', strokeWidth: 2 }}
                  isAnimationActive
                  animationDuration={1400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <InsightBanner text={insights.progress} />
        </motion.div>

        {/* ─── BLOCO 3: HEATMAP 90D ──────────────────────── */}
        <motion.div
          custom={2}
          variants={blockReveal}
          initial="hidden"
          animate="show"
          className={`${CARD} p-5`}
        >
          <SmallHead
            title="Consistência · 90 dias"
            sub="Dias com check-in mental"
            icon={<Activity size={11} style={{ color: MIND_ACCENT }} />}
          />
          <HeatmapGrid data={heatmap90d} />
          <InsightBanner text={insights.heatmap} />
        </motion.div>

        {/* ─── BLOCO 4: DONUT ────────────────────────────── */}
        <motion.div
          custom={3}
          variants={blockReveal}
          initial="hidden"
          animate="show"
          className={isDistracted ? `${CARD_ALERT} p-5` : `${CARD} p-5`}
          style={isDistracted ? { borderColor: '#f43f5e' } : undefined}
        >
          <SmallHead
            title="Distribuição mental · 7d"
            sub="Onde sua mente foi"
            icon={<Brain size={11} style={{ color: MIND_ACCENT }} />}
            alert={isDistracted}
          />
          <DonutBlock data={donut} />
          <InsightBanner text={insights.donut} alert={isDistracted} />
        </motion.div>

        {/* ─── BLOCO 5: PADRÕES IA ───────────────────────── */}
        <motion.div
          custom={4}
          variants={blockReveal}
          initial="hidden"
          animate="show"
          className={`${CARD} p-5`}
        >
          <SmallHead
            title="Padrões detectados"
            sub="Interpretação automática dos dados"
            icon={<Sparkles size={11} style={{ color: MIND_ACCENT }} />}
          />
          <ul className="mt-3 space-y-2">
            {data.patterns.map((pattern, i) => (
              <li key={i} className={[
                'flex items-start gap-3 p-3 rounded-xl',
                'bg-zinc-50 dark:bg-zinc-800/40',
                'border border-zinc-200 dark:border-zinc-800',
                i === 0 ? 'ring-1 ring-cyan-500/20' : '',
              ].join(' ')}>
                <div className={[
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                  i === 0 ? 'text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400',
                ].join(' ')}
                  style={i === 0 ? { backgroundColor: MIND_ACCENT } : undefined}
                >
                  <span className="text-[11px] font-mono font-bold">{i + 1}</span>
                </div>
                <p className={`text-[12px] leading-relaxed font-medium ${i === 0 ? T_STRONG : T_NORMAL}`}>
                  {pattern}
                </p>
              </li>
            ))}
          </ul>
          <InsightBanner text={insights.patterns} />
        </motion.div>

        {/* ─── CTA → TELA 3 ──────────────────────────────── */}
        <motion.button
          type="button"
          onClick={onDepth}
          custom={5}
          variants={blockReveal}
          initial="hidden"
          animate="show"
          className={[
            'w-full flex items-center justify-between gap-3',
            'h-14 px-5 rounded-2xl',
            'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900',
            'border border-white/10 dark:border-zinc-200',
            'shadow-xl transition-all hover:scale-[1.02] active:scale-[0.99]',
          ].join(' ')}
        >
          <span className="flex items-center gap-2">
            <Target size={18} />
            <span className="text-[13px] font-bold tracking-wide">Ver análise profunda</span>
          </span>
          <ChevronRight size={18} className="opacity-50" />
        </motion.button>
      </div>

      {/* Footer */}
      <p className={`mt-6 px-5 text-center text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>
        · análise gerada automaticamente ·
      </p>
    </div>
  );
}

// =============================================================
// Heatmap Grid — 90 dias em cascata
// =============================================================
const HEAT_TONES = [
  'bg-zinc-200 dark:bg-zinc-800/60',
  'bg-cyan-200 dark:bg-cyan-900',
  'bg-cyan-400 dark:bg-cyan-700',
  'bg-cyan-500',
  'bg-cyan-600 dark:bg-cyan-400',
];

function HeatmapGrid({ data }: { data: { date: string; level: number }[] }) {
  const weeks = useMemo(() => {
    if (!data.length) return [];
    const first = new Date(data[0].date);
    const pad = first.getDay();
    const padded: ({ date: string; level: number } | null)[] = [
      ...Array(pad).fill(null),
      ...data,
    ];
    const w: typeof padded[] = [];
    for (let i = 0; i < padded.length; i += 7) {
      w.push(padded.slice(i, i + 7));
    }
    return w;
  }, [data]);

  const activeDays = data.filter(d => d.level > 0).length;

  return (
    <div className="mt-3">
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="inline-grid grid-flow-col grid-rows-7 gap-[3px]">
          {weeks.flatMap((w, ci) =>
            Array.from({ length: 7 }).map((_, ri) => {
              const cell = w[ri];
              if (!cell) return <div key={`${ci}-${ri}`} className="w-2.5 h-2.5" />;
              return (
                <motion.div
                  key={`${ci}-${ri}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (ci * 7 + ri) * 0.003, duration: 0.2 }}
                  className={[
                    'w-2.5 h-2.5 rounded-sm transition-transform hover:scale-150',
                    HEAT_TONES[cell.level],
                  ].join(' ')}
                  title={`${cell.date} · nv ${cell.level}`}
                />
              );
            }),
          )}
        </div>
      </div>
      <p className={`mt-3 text-[10px] font-mono tracking-wider ${T_MUTED}`}>
        <span style={{ color: MIND_ACCENT }} className="font-bold">{activeDays}/{data.length}</span> dias com check-in
      </p>
    </div>
  );
}

// =============================================================
// Donut Block
// =============================================================
function DonutBlock({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="mt-2">
      <div className="h-[160px] relative">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={2}
              isAnimationActive
              animationDuration={1000}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'rgba(24,24,27,0.96)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 14, padding: '8px 12px',
                fontFamily: 'monospace', fontSize: 11, color: '#fafafa',
              }}
              formatter={(v: number) => [`${v}%`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`text-[22px] font-mono font-bold tabular-nums leading-none ${T_STRONG}`}>
            {total}%
          </span>
          <span className={`text-[9px] font-mono tracking-widest uppercase ${T_MUTED} mt-0.5`}>
            tempo mental
          </span>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
            <span className={`flex-1 text-[11px] ${T_NORMAL} truncate`}>{d.label}</span>
            <span className={`text-[11px] font-mono tabular-nums font-bold ${T_LABEL}`}>{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
