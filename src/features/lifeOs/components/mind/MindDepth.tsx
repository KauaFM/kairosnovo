// =============================================================
// ORVAX · Life OS — Mind Depth (Tela 3)
//
// Verdade profunda · ação direta:
//   1. PRIORIDADE DO DIA (destaque visual máximo)
//   2. Sankey (fluxo de atenção)
//   3. Execution Map (motor de decisão — padrões de horário)
//   4. Correlação (top 2 por Pearson)
//   5. Previsão contextual
//   6. Ações contextuais (derivadas dos dados)
// =============================================================
import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import {
  ChevronLeft, Target, Activity, AlertTriangle, Compass,
  Clock, Sparkles, ArrowUpRight, ArrowDownRight, Zap,
} from 'lucide-react';
import { Sankey } from '../charts/primitives/Sankey';
import { ExecutionTimeline } from '../charts/primitives/ExecutionTimeline';
import { ScatterCorrelation } from '../charts/ScatterCorrelation';
import type { MindData, MindDiagnosis } from '../../data/mindTypes';
import { MIND_ACCENT } from '../../data/mindMockData';

// ─── Design tokens ──────────────────────────────────────────
const PAGE_BG  = 'bg-zinc-50 dark:bg-zinc-950';
const CARD     = 'rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800';
const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

// ─── Variants ───────────────────────────────────────────────
const blockReveal = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

function SmallHead({
  title, sub, icon,
}: { title: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div>
      <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}>
        {icon}{title}
      </p>
      {sub && <p className={`text-[9px] font-mono tracking-wider ${T_MUTED} mt-0.5`}>{sub}</p>}
    </div>
  );
}

// ─── Icon resolver ──────────────────────────────────────────
type IconKey = keyof typeof Icons;
function ResolveIcon({ name, ...props }: { name: string; size?: number; className?: string }) {
  const Comp = (Icons[name as IconKey] as React.ComponentType<any>) || Icons.Circle;
  return <Comp {...props} />;
}

// ─── Props ──────────────────────────────────────────────────
interface Props {
  data: MindData;
  diagnosis: MindDiagnosis;
  onBack: () => void;
}

// =============================================================
// COMPONENT
// =============================================================
export function MindDepth({ data, diagnosis, onBack }: Props) {
  const { sankeyNodes, sankeyLinks, timeline24h } = data;
  const {
    priority, actions, predictions, predictionNarrative,
    timePatterns, topCorrelations, depthNarrative, drivers,
  } = diagnosis;

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
            Mente · Profundidade
          </p>
          <h1 className={`mt-1 text-[24px] font-bold leading-tight tracking-tight ${T_STRONG}`}>
            Verdade profunda
          </h1>
        </div>
      </header>

      <div className="px-5 mt-4 space-y-3">

        {/* ─── BLOCO 0: PRIORIDADE DO DIA ────────────────── */}
        <motion.div
          custom={0}
          variants={blockReveal}
          initial="hidden"
          animate="show"
          className={[
            'rounded-3xl p-6 overflow-hidden relative',
            'bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-zinc-900',
            'border-2 border-rose-300 dark:border-rose-900/50',
            'shadow-lg',
          ].join(' ')}
        >
          {/* Background pulse */}
          <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-rose-500 animate-ping" style={{ animationDuration: '3s' }} />
          </div>

          <div className="relative">
            <p className="text-[10px] font-mono tracking-[0.22em] uppercase text-rose-700 dark:text-rose-300 flex items-center gap-1.5 mb-4">
              <AlertTriangle size={12} />
              Prioridade do dia
            </p>

            <p className={`text-[12px] font-mono tracking-wider uppercase ${T_MUTED} mb-1`}>
              Seu maior problema hoje:
            </p>
            <h2 className={`text-[28px] md:text-[32px] font-bold leading-tight tracking-tight ${T_STRONG}`}>
              {priority.problem}
            </h2>
            <p className={`mt-2 text-[13px] leading-relaxed ${T_NORMAL}`}>
              {priority.problemDetail}
            </p>

            <div className="mt-5 pt-4 border-t border-rose-200 dark:border-rose-900/40">
              <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_MUTED} mb-2`}>
                Ação recomendada:
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: MIND_ACCENT }}
                >
                  <ResolveIcon name={priority.actionIcon} size={18} />
                </div>
                <p className={`text-[15px] font-bold leading-snug ${T_STRONG}`}>
                  {priority.action}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── BLOCO 1: CORRELAÇÕES ──────────────────────── */}
        <motion.div
          custom={1}
          variants={blockReveal}
          initial="hidden"
          animate="show"
          className={`${CARD} p-5`}
        >
          <SmallHead
            title="Correlações detectadas"
            sub="As 2 mais relevantes automaticamente"
            icon={<Compass size={11} style={{ color: MIND_ACCENT }} />}
          />

          {/* Driver strips */}
          <ul className="mt-3 space-y-2">
            {drivers.filter(d => d.tone === 'negative').slice(0, 3).map((d, i) => (
              <li key={i} className={[
                'flex items-center gap-3 p-3 rounded-xl',
                'bg-zinc-50 dark:bg-zinc-800/40',
                'border border-zinc-200 dark:border-zinc-800',
              ].join(' ')}>
                <div className={[
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  d.tone === 'positive'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                ].join(' ')}>
                  <ResolveIcon name={d.icon} size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-semibold ${T_STRONG}`}>{d.factor}</p>
                  <p className={`text-[10px] font-mono tracking-wider ${T_MUTED}`}>impacto · {d.metric}</p>
                </div>
                <span className={[
                  'text-[14px] font-bold tabular-nums shrink-0 flex items-center gap-0.5',
                  d.tone === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                ].join(' ')}>
                  {d.tone === 'positive' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {d.impact > 0 ? '+' : ''}{d.impact}%
                </span>
              </li>
            ))}
          </ul>

          {/* Scatter charts */}
          <div className="mt-4 space-y-4">
            {topCorrelations.map((corr, i) => (
              <div key={i}>
                <p className={`text-[11px] font-semibold mb-1 ${T_STRONG}`}>
                  {corr.xLabel} impacta diretamente {corr.yLabel.toLowerCase()}
                </p>
                <ScatterCorrelation
                  data={corr.data}
                  xLabel={corr.xLabel}
                  yLabel={corr.yLabel}
                  accent={MIND_ACCENT}
                  pearson={corr.pearson}
                  height={160}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── BLOCO 2: SANKEY ───────────────────────────── */}
        <motion.div
          custom={2}
          variants={blockReveal}
          initial="hidden"
          animate="show"
          className={`${CARD} p-5`}
        >
          <SmallHead
            title="Onde sua atenção foi"
            sub="Tempo livre → atividade → resultado mental"
            icon={<Activity size={11} style={{ color: MIND_ACCENT }} />}
          />
          <div className="mt-3">
            <Sankey columns={sankeyNodes} links={sankeyLinks} height={220} />
          </div>
          <p className={`mt-3 text-[11px] leading-relaxed font-medium ${T_NORMAL}`}>
            {depthNarrative}
          </p>
        </motion.div>

        {/* ─── BLOCO 3: EXECUTION MAP (Motor de Decisão) ─── */}
        <motion.div
          custom={3}
          variants={blockReveal}
          initial="hidden"
          animate="show"
          className={`${CARD} p-5`}
        >
          <SmallHead
            title="Timeline do dia"
            sub="06h → 24h · padrões detectados automaticamente"
            icon={<Clock size={11} style={{ color: MIND_ACCENT }} />}
          />
          <div className="mt-3">
            <ExecutionTimeline blocks={timeline24h} startHour={6} endHour={24} />
          </div>

          {/* Time patterns — motor de decisão */}
          {timePatterns.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}>
                <Zap size={10} style={{ color: MIND_ACCENT }} />
                Padrões detectados
              </p>
              {timePatterns.map((tp, i) => (
                <div key={i} className={[
                  'flex items-center gap-3 p-3 rounded-xl',
                  tp.type === 'peak_focus'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40'
                    : 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40',
                ].join(' ')}>
                  <div className={[
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    tp.type === 'peak_focus' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white',
                  ].join(' ')}>
                    {tp.type === 'peak_focus' ? <Target size={14} /> : <AlertTriangle size={14} />}
                  </div>
                  <p className={`text-[12px] font-semibold leading-snug ${T_STRONG}`}>
                    {tp.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ─── BLOCO 4: PREVISÃO ─────────────────────────── */}
        <motion.div
          custom={4}
          variants={blockReveal}
          initial="hidden"
          animate="show"
          className={[
            'rounded-2xl p-5 overflow-hidden',
            'bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-zinc-900',
            'border border-amber-200 dark:border-amber-900/50',
          ].join(' ')}
        >
          <SmallHead
            title="Previsão · 7 dias"
            sub="Se nada mudar"
            icon={<Sparkles size={11} className="text-amber-600 dark:text-amber-400" />}
          />

          {/* Metrics */}
          {predictions.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {predictions.slice(0, 4).map((p, i) => (
                <div key={i} className={[
                  'flex items-center gap-2 p-2.5 rounded-xl',
                  'bg-white/60 dark:bg-zinc-800/40',
                  'border border-amber-200/50 dark:border-amber-900/30',
                ].join(' ')}>
                  {p.direction === 'down'
                    ? <ArrowDownRight size={14} className="text-rose-500 shrink-0" />
                    : <ArrowUpRight size={14} className="text-emerald-500 shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className={`text-[10px] font-mono tracking-wider uppercase ${T_MUTED} truncate`}>
                      {p.metric}
                    </p>
                    <p className={[
                      'text-[14px] font-bold tabular-nums',
                      p.direction === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
                    ].join(' ')}>
                      {p.delta > 0 ? '+' : ''}{p.delta}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Narrative */}
          <motion.p
            className={`mt-4 text-[15px] leading-relaxed font-bold ${T_STRONG}`}
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            {predictionNarrative}
          </motion.p>
        </motion.div>

        {/* ─── BLOCO 5: AÇÕES CONTEXTUAIS ────────────────── */}
        <motion.div
          custom={5}
          variants={blockReveal}
          initial="hidden"
          animate="show"
          className={[
            'rounded-3xl p-5',
            'bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-zinc-900',
            'border border-cyan-200 dark:border-cyan-900/50',
          ].join(' ')}
        >
          <p className="text-[10px] font-mono tracking-[0.22em] uppercase mb-4 flex items-center gap-1.5"
            style={{ color: MIND_ACCENT }}>
            <Target size={10} />
            O que fazer agora
          </p>

          <div className="space-y-2">
            {actions.map((action, i) => (
              <motion.button
                key={i}
                type="button"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.15, duration: 0.3 }}
                className={[
                  'w-full flex items-center gap-3 h-12 px-4 rounded-xl text-left',
                  'bg-white dark:bg-zinc-900',
                  'border transition-all',
                  action.urgency === 'high'
                    ? 'border-cyan-300 dark:border-cyan-900/50 hover:border-cyan-500'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300',
                  'active:scale-[0.99]',
                ].join(' ')}
              >
                <div
                  className={[
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white',
                  ].join(' ')}
                  style={{
                    backgroundColor: action.urgency === 'high' ? MIND_ACCENT : '#71717a',
                  }}
                >
                  <ResolveIcon name={action.icon} size={14} />
                </div>
                <span className={`text-[13px] font-semibold ${T_STRONG}`}>{action.label}</span>
                {action.urgency === 'high' && (
                  <span className="ml-auto text-[8px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300">
                    urgente
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <p className={`mt-6 px-5 text-center text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>
        · esse sistema está te observando · não está te julgando ·
      </p>
    </div>
  );
}
