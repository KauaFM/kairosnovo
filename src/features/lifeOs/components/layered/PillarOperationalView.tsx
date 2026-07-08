// =============================================================
// ORVAX · PillarOperationalView — Camada 1 · genérica.
// Mesma estrutura de Mind/Body Operational, mas data-driven.
// =============================================================
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import {
  ChevronLeft, ChevronRight, Clock, Calendar,
  AlertTriangle, Target, Compass, ArrowRight, Sparkles,
  TrendingDown, TrendingUp, Activity,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import type {
  PillarLayeredConfig, PillarLayeredData, PillarLayeredDiagnosis, PillarStatus,
} from './types';
import { ExecutionTimeline } from '../charts/primitives/ExecutionTimeline';

const PAGE_BG  = 'bg-zinc-50 dark:bg-zinc-950';
const CARD     = 'rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800';
const CARD_SUB = 'rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800';
const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

const EMERALD = '#10B981';

function statusToLight(status: PillarStatus) {
  if (status === 'excellent' || status === 'improving') {
    return { dot: 'bg-emerald-500', label: 'BOM' };
  }
  if (status === 'stable') return { dot: 'bg-amber-500', label: 'ATENÇÃO' };
  return { dot: 'bg-rose-500', label: 'CRÍTICO' };
}

const blockReveal = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' },
  }),
};

interface Props {
  config:    PillarLayeredConfig;
  data:      PillarLayeredData;
  diagnosis: PillarLayeredDiagnosis;
  onStrategic: () => void;
  onBack:      () => void;
}

export function PillarOperationalView({
  config, data, diagnosis, onStrategic, onBack,
}: Props) {
  const light = statusToLight(diagnosis.status);

  const PillarIcon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>>)[config.icon] || Icons.Circle;

  const drainHours = useMemo(() => {
    return data.timeline24h.filter(b => b.tone === 'drain')
      .reduce((s, b) => s + (b.end - b.start), 0);
  }, [data.timeline24h]);

  const focusHours = useMemo(() => {
    return data.timeline24h.filter(b => b.tone === 'productive')
      .reduce((s, b) => s + (b.end - b.start), 0);
  }, [data.timeline24h]);

  const sparkId = `op-spark-${config.key}`;
  const weekId  = `op-week-${config.key}`;

  return (
    <div className={`min-h-screen ${PAGE_BG} pb-24`}>
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-zinc-50/80 dark:bg-zinc-950/80
        border-b border-zinc-200 dark:border-zinc-800 px-5 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className={`w-9 h-9 rounded-full flex items-center justify-center
            ${T_LABEL} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`}
          aria-label="Voltar"
        >
          <ChevronLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>
            Camada operacional · dia + semana
          </p>
          <h1 className={`text-[15px] font-bold leading-tight truncate ${T_STRONG}`}>
            <PillarIcon size={14} className="inline -mt-0.5 mr-1.5 text-emerald-500" />
            {config.label} · agora
          </h1>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
          <span className={`w-1.5 h-1.5 rounded-full ${light.dot}`} />
          <span className={`text-[9px] font-mono font-bold tracking-wider ${T_NORMAL}`}>{light.label}</span>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">

        {/* ── BLOCO 1 · STATUS ATUAL ─────────────────────────── */}
        <motion.div custom={0} initial="hidden" animate="show" variants={blockReveal}>
          <div className={[CARD, 'p-5'].join(' ')}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-baseline gap-1">
                  <span className={`text-[64px] font-bold tracking-tight leading-none tabular-nums ${T_STRONG}`}>
                    {data.snapshot.score}
                  </span>
                  <span className={`text-[18px] font-mono ${T_MUTED}`}>/100</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {data.snapshot.trend7d >= 0
                    ? <TrendingUp size={12} className="text-emerald-500" />
                    : <TrendingDown size={12} className="text-rose-500" />}
                  <span className={`text-[11px] font-mono font-semibold tabular-nums
                    ${data.snapshot.trend7d >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {data.snapshot.trend7d >= 0 ? '+' : ''}{data.snapshot.trend7d}% · 7d
                  </span>
                </div>
              </div>
              <div className="flex-1 h-16 -mr-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.snapshot.sparkline7d.map((v, i) => ({ i, v }))}
                    margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={EMERALD} stopOpacity={0.32} />
                        <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                    <Area type="monotone" dataKey="v" stroke={EMERALD} strokeWidth={2.5}
                      fill={`url(#${sparkId})`} dot={false} isAnimationActive />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className={`mt-4 text-[15px] font-medium leading-snug ${T_STRONG}`}>
              {diagnosis.snapshotStory}
            </p>
            <p className={`mt-1 text-[12px] leading-relaxed ${T_NORMAL}`}>
              {diagnosis.snapshotDiagnosis}
            </p>
          </div>
        </motion.div>

        {/* ── BLOCO 2 · HOJE · TIMELINE ───────────────────────── */}
        <motion.div custom={1} initial="hidden" animate="show" variants={blockReveal}>
          <div className={[CARD_SUB, 'p-5'].join(' ')}>
            <SectionHead
              icon={<Clock size={11} className="text-emerald-500" />}
              title="Hoje · execution map"
              sub={config.timelineSubtitle}
            />
            <div className="mt-3">
              <ExecutionTimeline blocks={data.timeline24h} startHour={6} endHour={24} />
            </div>
            <InsightStrip
              icon={drainHours > 2
                ? <AlertTriangle size={11} className="text-rose-500" />
                : <Sparkles size={11} className="text-emerald-500" />}
              tone={drainHours > 2 ? 'warning' : 'good'}
              text={
                drainHours > 2
                  ? `${drainHours.toFixed(1)}h de drenagem hoje · ${focusHours.toFixed(1)}h de execução produtiva`
                  : `Dia limpo · ${focusHours.toFixed(1)}h de execução real e apenas ${drainHours.toFixed(1)}h de drain`
              }
            />
          </div>
        </motion.div>

        {/* ── BLOCO 2b · MINI RADAR · ESTADO ATUAL ────────────── */}
        <motion.div custom={2} initial="hidden" animate="show" variants={blockReveal}>
          <div className={[CARD_SUB, 'p-5'].join(' ')}>
            <SectionHead
              icon={<Activity size={11} className="text-emerald-500" />}
              title="Estado atual"
              sub={config.internalAxesSubtitle}
            />
            <div className="mt-2 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data.radar} outerRadius="72%">
                  <PolarGrid stroke="rgba(113,113,122,0.25)" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', fill: '#71717a' }}
                  />
                  <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                  <Radar
                    name="atual"
                    dataKey="current"
                    stroke={EMERALD}
                    strokeWidth={1.8}
                    fill={EMERALD}
                    fillOpacity={0.18}
                    isAnimationActive
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* ── BLOCO 3 · SEMANA · LINHA 7d ────────────────────── */}
        <motion.div custom={3} initial="hidden" animate="show" variants={blockReveal}>
          <div className={[CARD_SUB, 'p-5'].join(' ')}>
            <SectionHead
              icon={<Calendar size={11} className="text-emerald-500" />}
              title="Semana · linha 7d"
              sub={`evolução do score de ${config.shortLabel}`}
            />
            <div className="mt-2 h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.snapshot.sparkline7d.map((v, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (data.snapshot.sparkline7d.length - 1 - i));
                    return {
                      day:  `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
                      score: v,
                    };
                  })}
                  margin={{ top: 6, right: 6, bottom: 0, left: -20 }}
                >
                  <defs>
                    <linearGradient id={weekId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={EMERALD} stopOpacity={0.30} />
                      <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', fill: '#71717a' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide domain={['dataMin - 4', 'dataMax + 4']} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(24,24,27,0.96)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 12, padding: '6px 10px',
                      fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#fafafa',
                    }}
                    formatter={(v: number) => [`${v}/100`, 'Score']}
                  />
                  <Area type="monotone" dataKey="score" stroke={EMERALD} strokeWidth={2.4}
                    fill={`url(#${weekId})`} dot={{ r: 3, stroke: EMERALD, strokeWidth: 2, fill: '#fff' }}
                    isAnimationActive />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <InsightStrip
              icon={<AlertTriangle size={11} className={data.snapshot.trend7d < -5 ? 'text-rose-500' : 'text-emerald-500'} />}
              tone={data.snapshot.trend7d < -5 ? 'warning' : 'good'}
              text={
                data.snapshot.trend7d < -5
                  ? `Você perdeu consistência · queda de ${Math.abs(data.snapshot.trend7d)}% em 7 dias`
                  : `Estabilidade boa · ${data.snapshot.trend7d >= 0 ? 'progresso' : 'leve oscilação'}`
              }
            />

            {/* Heatmap semanal · 7 quadradinhos */}
            <div className="mt-4">
              <p className={`text-[9px] font-mono tracking-widest uppercase ${T_LABEL} mb-2`}>
                Consistência · 7 dias
              </p>
              <div className="flex gap-1.5">
                {data.heatmap90d.slice(-7).map((cell, i) => (
                  <div
                    key={i}
                    className={[
                      'flex-1 h-9 rounded-md',
                      cell.level === 0 ? 'bg-zinc-200 dark:bg-zinc-800' :
                      cell.level === 1 ? 'bg-emerald-200 dark:bg-emerald-900' :
                      cell.level === 2 ? 'bg-emerald-400 dark:bg-emerald-700' :
                      cell.level === 3 ? 'bg-emerald-500' : 'bg-emerald-600',
                    ].join(' ')}
                    title={cell.date}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── BLOCO 4 · PROBLEMA PRINCIPAL ────────────────────── */}
        <motion.div custom={4} initial="hidden" animate="show" variants={blockReveal}>
          <div className={[
            'rounded-3xl p-5 border-2',
            'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60',
          ].join(' ')}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center">
                <AlertTriangle size={13} className="text-white" />
              </div>
              <p className={`text-[10px] font-mono tracking-[0.22em] uppercase font-bold text-rose-700 dark:text-rose-300`}>
                Problema principal
              </p>
            </div>
            <p className={`text-[20px] font-bold leading-tight ${T_STRONG}`}>
              {diagnosis.priority.problem}
            </p>
            <p className={`mt-1.5 text-[12.5px] leading-relaxed ${T_NORMAL}`}>
              {diagnosis.priority.problemDetail}
            </p>
          </div>
        </motion.div>

        {/* ── BLOCO 5 · AÇÃO IMEDIATA ─────────────────────────── */}
        <motion.div custom={5} initial="hidden" animate="show" variants={blockReveal}>
          <div className={[CARD_SUB, 'p-5'].join(' ')}>
            <SectionHead
              icon={<Target size={11} className="text-emerald-500" />}
              title="Ação imediata"
              sub="o que fazer agora"
            />
            <div className="mt-3 space-y-2">
              {diagnosis.actions.slice(0, 3).map((a, i) => {
                const ActionIcon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>>)[a.icon] || Icons.Zap;
                return (
                  <button
                    key={i}
                    type="button"
                    className={[
                      'group w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all',
                      'bg-white dark:bg-zinc-900',
                      'border border-zinc-200 dark:border-zinc-800',
                      'hover:border-emerald-500 hover:-translate-y-0.5',
                      'hover:shadow-md hover:shadow-emerald-500/10',
                      'active:scale-[0.99]',
                    ].join(' ')}
                  >
                    <div className={[
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                      a.urgency === 'high'   ? 'bg-rose-500 text-white' :
                      a.urgency === 'medium' ? 'bg-amber-500 text-white' :
                                                'bg-emerald-500 text-white',
                    ].join(' ')}>
                      <ActionIcon size={14} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold leading-tight ${T_STRONG} truncate`}>
                        {a.label}
                      </p>
                      <p className={`text-[10px] font-mono tracking-wide uppercase mt-0.5
                        ${a.urgency === 'high' ? 'text-rose-500' : a.urgency === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {a.urgency === 'high' ? 'urgente' : a.urgency === 'medium' ? 'recomendado' : 'opcional'}
                      </p>
                    </div>
                    <ChevronRight size={14} className={`${T_MUTED} group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all`} />
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ── CTA · ir pra estratégica ────────────────────────── */}
        <motion.div custom={6} initial="hidden" animate="show" variants={blockReveal}>
          <button
            type="button"
            onClick={onStrategic}
            className={[
              'group w-full flex items-center justify-center gap-3 h-14 rounded-2xl mt-4',
              'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900',
              'border border-zinc-800 dark:border-zinc-200',
              'hover:scale-[1.01] active:scale-[0.99] transition-transform',
              'shadow-lg',
            ].join(' ')}
          >
            <Compass size={15} strokeWidth={2.2} />
            <span className="text-[12px] font-bold tracking-[0.22em] uppercase">
              Ver visão estratégica
            </span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          <p className={`mt-2 text-center text-[10px] font-mono tracking-wider ${T_MUTED}`}>
            mês + ano · pra onde sua {config.shortLabel} está indo
          </p>
        </motion.div>

      </div>
    </div>
  );
}

// =============================================================
// helpers locais
// =============================================================
function SectionHead({
  icon, title, sub,
}: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div>
      <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}>
        {icon}{title}
      </p>
      {sub && <p className={`text-[9px] font-mono tracking-wider ${T_MUTED} mt-0.5`}>{sub}</p>}
    </div>
  );
}

function InsightStrip({
  icon, text, tone,
}: { icon: React.ReactNode; text: string; tone: 'good' | 'warning' }) {
  return (
    <div className={[
      'mt-3 px-3 py-2.5 rounded-xl text-[12px] leading-relaxed font-medium flex items-start gap-2',
      tone === 'warning'
        ? `bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 ${T_STRONG}`
        : `bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 ${T_STRONG}`,
    ].join(' ')}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
