// =============================================================
// ORVAX · PillarStrategicView — Camada 2 · genérica.
// Isolamento absoluto · radar interno only · zero global pillar leak.
//
// Sankey é opcional (só renderiza se config.data.sankey existir).
// Insights de radar derivados dos deltas current vs previous.
// =============================================================
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import {
  ChevronLeft, TrendingUp, Compass, Hexagon,
  ArrowRight, Sparkles, Target, Repeat,
  TrendingDown, BarChart3, Network, AlertTriangle,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import type {
  PillarLayeredConfig, PillarLayeredData, PillarLayeredDiagnosis,
} from './types';
import { Sankey } from '../charts/primitives/Sankey';

const PAGE_BG  = 'bg-zinc-50 dark:bg-zinc-950';
const CARD     = 'rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800';
const CARD_SUB = 'rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800';
const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

const EMERALD = '#10B981';

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
  onOperational: () => void;
  onBack:        () => void;
}

export function PillarStrategicView({
  config, data, diagnosis, onOperational, onBack,
}: Props) {
  const PillarIcon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>>)[config.icon] || Icons.Circle;

  // Evolução 30d
  const monthDelta = useMemo(() => {
    const first = data.series30d[0]?.value ?? 0;
    const last  = data.series30d[data.series30d.length - 1]?.value ?? 0;
    return Math.round(((last - first) / Math.max(1, first)) * 100);
  }, [data.series30d]);

  // Radar normalizado pra atual vs anterior (ghost layer)
  const radarData = useMemo(() => data.radar.map(r => ({
    axis:     r.axis,
    atual:    r.current,
    anterior: r.previous,
  })), [data.radar]);

  // Insight automático do radar · pior queda + maior evolução
  const radarInsight = useMemo(() => {
    const sorted = [...data.radar]
      .map(r => ({ axis: r.axis, delta: r.current - r.previous }))
      .sort((a, b) => a.delta - b.delta);
    if (sorted.length === 0) return null;
    const worst = sorted[0];
    const best  = sorted[sorted.length - 1];
    return {
      worstAxis:  worst.axis,
      worstDelta: Math.abs(worst.delta),
      worstNeg:   worst.delta < 0,
      bestAxis:   best.axis,
      bestDelta:  best.delta,
      bestPos:    best.delta > 0,
    };
  }, [data.radar]);

  const topCorrelation = diagnosis.topCorrelations?.[0] || data.correlations?.[0];

  const evoId = `strat-30d-${config.key}`;

  return (
    <div className={`min-h-screen ${PAGE_BG} pb-24`}>
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-zinc-50/80 dark:bg-zinc-950/80
        border-b border-zinc-200 dark:border-zinc-800 px-5 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className={`w-9 h-9 rounded-full flex items-center justify-center
            ${T_LABEL} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`}
          aria-label="Fechar"
        >
          <ChevronLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>
            Camada estratégica · mês + ano
          </p>
          <h1 className={`text-[15px] font-bold leading-tight truncate ${T_STRONG}`}>
            <Compass size={14} className="inline -mt-0.5 mr-1.5 text-emerald-500" />
            {config.label} · direção
          </h1>
        </div>
        <button
          onClick={onOperational}
          className={`text-[10px] font-mono tracking-wider uppercase font-bold
            px-3 py-1.5 rounded-full
            bg-zinc-100 dark:bg-zinc-800 ${T_NORMAL}
            hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors`}
          aria-label="Voltar à visão operacional"
        >
          ← Hoje
        </button>
      </header>

      <div className="px-5 pt-4 space-y-4">

        {/* ── BLOCO 1 · EVOLUÇÃO 30d ─────────────────────────── */}
        <motion.div custom={0} initial="hidden" animate="show" variants={blockReveal}>
          <div className={[CARD, 'p-5'].join(' ')}>
            <SectionHead
              icon={<TrendingUp size={11} className="text-emerald-500" />}
              title="Evolução · 30 dias"
              sub={`trajetória do score de ${config.shortLabel}`}
            />
            <div className="mt-2 mb-1 flex items-baseline gap-2">
              <span className={`text-[28px] font-bold tracking-tight tabular-nums ${T_STRONG}`}>
                {monthDelta >= 0 ? '+' : ''}{monthDelta}%
              </span>
              <span className={`text-[11px] font-mono ${T_LABEL}`}>vs 30d atrás</span>
            </div>
            <p className={`mt-1 text-[13px] leading-relaxed ${T_NORMAL}`}>
              {monthDelta >= 0
                ? `Você evoluiu ${monthDelta}% no último mês · trajetória de subida sustentada`
                : `Queda de ${Math.abs(monthDelta)}% no último mês · curva de regressão`}
            </p>
            <div className="mt-3 h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.series30d} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id={evoId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={EMERALD} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(113,113,122,0.12)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', fill: '#71717a' }}
                    interval={5}
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
                  />
                  <Area type="monotone" dataKey="value" stroke={EMERALD} strokeWidth={2.4}
                    fill={`url(#${evoId})`} dot={false} isAnimationActive />
                  <Area type="monotone" dataKey="avg" stroke="#a1a1aa" strokeWidth={1}
                    strokeDasharray="3 3" fill="none" dot={false} isAnimationActive />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* ── BLOCO 2 · MAPA INTERNO · ghost layer ──────────── */}
        <motion.div custom={1} initial="hidden" animate="show" variants={blockReveal}>
          <div className={[CARD_SUB, 'p-5'].join(' ')}>
            <SectionHead
              icon={<Hexagon size={11} className="text-emerald-500" />}
              title={`Mapa interno · ${config.label}`}
              sub="atual vs 30 dias atrás · ghost layer"
            />
            <div className="mt-2 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke="rgba(113,113,122,0.18)" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', fill: '#71717a' }}
                  />
                  <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                  <Radar name="30d atrás" dataKey="anterior" stroke="#a1a1aa"
                    strokeWidth={1.2} strokeDasharray="3 3" fill="transparent" isAnimationActive />
                  <Radar name="atual" dataKey="atual" stroke={EMERALD}
                    strokeWidth={2} fill={EMERALD} fillOpacity={0.18} isAnimationActive />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-5 mt-1">
              <span className={`flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider ${T_MUTED}`}>
                <span className="w-4 h-px border-t border-dashed border-zinc-400 dark:border-zinc-500 inline-block" />
                30d atrás
              </span>
              <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider"
                style={{ color: EMERALD }}>
                <span className="w-4 h-[2px] inline-block rounded-full" style={{ background: EMERALD }} />
                atual
              </span>
            </div>

            {radarInsight && (
              <p className={`mt-3 text-[11.5px] leading-relaxed ${T_NORMAL}`}>
                {radarInsight.worstNeg
                  ? <><strong>{radarInsight.worstAxis}</strong> caiu <strong>{radarInsight.worstDelta}pts</strong> em 30 dias</>
                  : <>Todos os eixos estáveis ou em alta</>}
                {radarInsight.bestPos &&
                  <> · <strong>{radarInsight.bestAxis}</strong> foi o que mais evoluiu (+{radarInsight.bestDelta}pts)</>}
              </p>
            )}
          </div>
        </motion.div>

        {/* ── BLOCO 2b · FOCO DA ÁREA · áreas impactadas ─────── */}
        <motion.div custom={1.5} initial="hidden" animate="show" variants={blockReveal}>
          <div className={[CARD_SUB, 'p-5'].join(' ')}>
            <SectionHead
              icon={<Sparkles size={11} className="text-emerald-500" />}
              title="Essa área está impactando diretamente"
              sub="alavancagem cruzada"
            />
            <div className="mt-3 space-y-2">
              {config.impacts.map((imp) => (
                <div
                  key={imp.label}
                  className={[
                    'flex items-center gap-3 p-3 rounded-xl border',
                    'bg-white dark:bg-zinc-900',
                    'border-zinc-200 dark:border-zinc-800',
                  ].join(' ')}
                >
                  <div className={[
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    imp.strength === 'forte'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
                  ].join(' ')}>
                    <ArrowRight size={13} strokeWidth={2.4} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12.5px] font-semibold leading-tight ${T_STRONG}`}>
                      {imp.label}
                    </p>
                    <p className={`text-[10px] font-mono ${T_MUTED} truncate`}>{imp.sub}</p>
                  </div>
                  <span className={[
                    'text-[9px] font-mono font-bold tracking-widest uppercase shrink-0',
                    imp.strength === 'forte'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : T_LABEL,
                  ].join(' ')}>
                    {imp.strength}
                  </span>
                </div>
              ))}
            </div>
            {config.impactsNarrative && (
              <p className={`mt-3 text-[11px] leading-relaxed ${T_NORMAL}`}>
                {config.impactsNarrative}
              </p>
            )}
          </div>
        </motion.div>

        {/* ── BLOCO 3 · PADRÕES DE VIDA · CORRELATION ────────── */}
        {topCorrelation && (
          <motion.div custom={2} initial="hidden" animate="show" variants={blockReveal}>
            <div className={[CARD_SUB, 'p-5'].join(' ')}>
              <SectionHead
                icon={<BarChart3 size={11} className="text-emerald-500" />}
                title="Padrões de vida"
                sub={`${topCorrelation.xLabel} ↔ ${topCorrelation.yLabel}`}
              />
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-[24px] font-bold tabular-nums ${T_STRONG}`}>
                  {(topCorrelation.pearson * 100 | 0)}%
                </span>
                <span className={`text-[10px] font-mono uppercase tracking-wider
                  ${Math.abs(topCorrelation.pearson) > 0.6 ? 'text-emerald-500 font-bold' : T_MUTED}`}>
                  correlação{Math.abs(topCorrelation.pearson) > 0.6 ? ' · forte' : ''}
                </span>
              </div>
              <div className="mt-2 h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 6, right: 6, bottom: 4, left: -12 }}>
                    <CartesianGrid stroke="rgba(113,113,122,0.12)" />
                    <XAxis type="number" dataKey="x" name={topCorrelation.xLabel}
                      tick={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', fill: '#71717a' }}
                      axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="y" name={topCorrelation.yLabel}
                      tick={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', fill: '#71717a' }}
                      axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(24,24,27,0.96)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 12, padding: '6px 10px',
                        fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#fafafa',
                      }}
                    />
                    <Scatter data={topCorrelation.data} fill={EMERALD} fillOpacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className={`mt-2 text-[12px] leading-relaxed ${T_NORMAL}`}>
                Seu desempenho em {config.shortLabel} depende diretamente de <strong>{topCorrelation.xLabel.toLowerCase()}</strong>.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── BLOCO 4 · FLUXO DE VIDA (SANKEY) · OPCIONAL ────── */}
        {data.sankey && (
          <motion.div custom={3} initial="hidden" animate="show" variants={blockReveal}>
            <div className={[CARD_SUB, 'p-5'].join(' ')}>
              <SectionHead
                icon={<Network size={11} className="text-emerald-500" />}
                title="Fluxo de vida"
                sub="tempo → comportamento → resultado"
              />
              <div className="mt-3">
                <Sankey columns={data.sankey.nodes} links={data.sankey.links} height={220} />
              </div>
              <p className={`mt-3 text-[12px] leading-relaxed ${T_NORMAL}`}>
                {diagnosis.depthNarrative}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── BLOCO 5 · PREVISÃO ──────────────────────────────── */}
        <motion.div custom={4} initial="hidden" animate="show" variants={blockReveal}>
          <div className={[CARD_SUB, 'p-5'].join(' ')}>
            <SectionHead
              icon={<TrendingDown size={11} className="text-emerald-500" />}
              title="Previsão · próximos 30 dias"
              sub="se você continuar nesse caminho"
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              {diagnosis.predictions.slice(0, 4).map((p, i) => {
                const isUp = p.direction === 'up';
                // métricas onde subir é bom · vem da config
                const goodIfUp = config.positiveDirectionMatcher.test(p.metric);
                const isPositive = goodIfUp ? isUp : !isUp;
                return (
                  <div key={i} className={[
                    'p-3 rounded-xl border',
                    isPositive
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50',
                  ].join(' ')}>
                    <p className={`text-[9px] font-mono tracking-widest uppercase
                      ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                      font-bold`}>
                      {p.metric}
                    </p>
                    <p className={`mt-1 text-[20px] font-bold tabular-nums leading-none
                      ${isPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                      {isUp ? '↑' : '↓'} {Math.abs(p.delta)}%
                    </p>
                    <p className={`mt-1 text-[9px] font-mono ${T_MUTED}`}>
                      em {p.days}d
                    </p>
                  </div>
                );
              })}
            </div>
            <p className={`mt-3 text-[12px] leading-relaxed ${T_NORMAL}`}>
              {diagnosis.predictionNarrative}
            </p>
          </div>
        </motion.div>

        {/* ── BLOCO 6 · A VERDADE ─────────────────────────────── */}
        <motion.div custom={5} initial="hidden" animate="show" variants={blockReveal}>
          <div className={[
            'rounded-3xl p-6 border-2',
            'bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-200',
            'border-zinc-800 dark:border-zinc-300',
          ].join(' ')}>
            <p className={`text-[10px] font-mono tracking-[0.22em] uppercase text-emerald-400 dark:text-emerald-600 font-bold mb-3`}>
              <AlertTriangle size={11} className="inline -mt-0.5 mr-1.5" />
              A verdade
            </p>
            <p className={`text-[22px] font-bold leading-tight text-white dark:text-zinc-900`}>
              {diagnosis.headline}
            </p>
            <p className={`mt-3 text-[13px] leading-relaxed text-zinc-300 dark:text-zinc-700`}>
              {diagnosis.rootCause}
            </p>
          </div>
        </motion.div>

        {/* ── BLOCO 7 · DIREÇÃO (1 foco + 1 hábito) ───────────── */}
        <motion.div custom={6} initial="hidden" animate="show" variants={blockReveal}>
          <div className="grid grid-cols-1 gap-3">
            <div className={[
              'rounded-3xl p-5',
              'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
            ].join(' ')}>
              <p className="text-[10px] font-mono tracking-[0.22em] uppercase opacity-80 mb-2">
                <Target size={11} className="inline -mt-0.5 mr-1.5" />
                Prioridade · 1 foco
              </p>
              <p className="text-[18px] font-bold leading-tight">
                {diagnosis.priority.problem}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed opacity-90">
                {diagnosis.priority.problemDetail}
              </p>
            </div>
            <div className={[CARD_SUB, 'p-5'].join(' ')}>
              <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} mb-2`}>
                <Repeat size={11} className="inline -mt-0.5 mr-1.5 text-emerald-500" />
                Ação · 1 hábito chave
              </p>
              <p className={`text-[16px] font-bold leading-tight ${T_STRONG}`}>
                {diagnosis.priority.action}
              </p>
              <p className={`mt-2 text-[11px] leading-relaxed ${T_NORMAL}`}>
                Comece pelo menor passo executável hoje. Repetição cria identidade.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── footer · botão voltar ───────────────────────────── */}
        <motion.div custom={7} initial="hidden" animate="show" variants={blockReveal}>
          <button
            type="button"
            onClick={onOperational}
            className={[
              'group w-full flex items-center justify-center gap-3 h-12 rounded-2xl mt-4',
              'bg-white dark:bg-zinc-900',
              'border border-zinc-200 dark:border-zinc-800',
              `${T_NORMAL}`,
              'hover:border-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all',
            ].join(' ')}
          >
            <ChevronLeft size={14} strokeWidth={2.2} />
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase">
              Voltar à visão operacional
            </span>
          </button>
          <p className={`mt-2 text-center text-[10px] font-mono tracking-wider ${T_MUTED}`}>
            o que fazer hoje · agora
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
