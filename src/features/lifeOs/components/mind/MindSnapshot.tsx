// =============================================================
// ORVAX · Life OS — Mind Snapshot (Tela 1)
//
// Impacto imediato em 5 segundos:
//   Score → Variação → Sparkline → Diagnóstico → Story → CTA
//
// Micro UX de tensão:
//   - Score countUp (200ms)
//   - Sparkline draw (400ms delay)
//   - Diagnóstico reveal com tensão (800ms delay, 600ms fade)
//   - Story aparece por último (1200ms delay)
// =============================================================
import React from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Brain, ArrowDownRight, ArrowUpRight, Minus, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';
import { AnimatedScore } from './AnimatedScore';
import type { MindScoreData, MindDiagnosis } from '../../data/mindTypes';
import { MIND_ACCENT } from '../../data/mindMockData';

// ─── Design tokens ──────────────────────────────────────────
const PAGE_BG   = 'bg-zinc-50 dark:bg-zinc-950';
const T_STRONG  = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL  = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL   = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED   = 'text-zinc-400 dark:text-zinc-500';
const CARD_HERO = 'rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.07] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.8)]';

// ─── Stagger animation variants ─────────────────────────────
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const tensionReveal = {
  hidden: { opacity: 0, y: 8, filter: 'blur(4px)' },
  show: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.6, ease: 'easeOut', delay: 0.8 },
  },
};

const storyReveal = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: 'easeOut', delay: 1.2 },
  },
};

// ─── Props ──────────────────────────────────────────────────
interface Props {
  data: MindScoreData;
  diagnosis: MindDiagnosis;
  onAnalyze: () => void;
  onBack: () => void;
}

// =============================================================
// COMPONENT
// =============================================================
export function MindSnapshot({ data, diagnosis, onAnalyze, onBack }: Props) {
  const { score, trend7d, sparkline7d } = data;
  const isNegative = trend7d < 0;
  const TrendIcon = isNegative ? ArrowDownRight : trend7d > 0 ? ArrowUpRight : Minus;

  const sparkData = sparkline7d.map((v, i) => ({ i, v }));

  // Status indicator color
  const statusColor =
    diagnosis.status === 'critical' ? '#ef4444' :
    diagnosis.status === 'declining' ? '#eab308' :
    diagnosis.status === 'excellent' ? '#22c55e' :
    diagnosis.status === 'improving' ? '#22c55e' : '#71717a';

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
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${MIND_ACCENT}15` }}
          >
            <Brain size={16} style={{ color: MIND_ACCENT }} />
          </div>
          <h1 className={`text-[18px] font-bold tracking-tight ${T_STRONG}`}>
            Mente
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span className={`text-[9px] font-mono tracking-[0.2em] uppercase ${T_MUTED}`}>
            {diagnosis.status === 'critical' ? 'CRÍTICO' :
             diagnosis.status === 'declining' ? 'EM QUEDA' :
             diagnosis.status === 'excellent' ? 'EXCELENTE' :
             diagnosis.status === 'improving' ? 'EVOLUINDO' : 'ESTÁVEL'}
          </span>
        </div>
      </header>

      {/* MAIN CONTENT — staggered entrance */}
      <motion.section
        className="px-5 mt-4"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* SCORE HERO */}
        <motion.div variants={fadeUp} className={`${CARD_HERO} p-6 md:p-7`}>
          {/* Score + Status */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL}`}>
                Score Mental
              </p>
              <div className="mt-3">
                <AnimatedScore
                  value={score}
                  className="text-[64px] md:text-[80px]"
                  delay={200}
                />
              </div>
            </div>

            {/* Trend pill */}
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className={[
                'inline-flex items-center gap-1 px-3 h-8 rounded-full text-[12px] font-mono font-bold tabular-nums shrink-0 mt-2',
                isNegative
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                  : trend7d > 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700',
              ].join(' ')}
            >
              <TrendIcon size={14} strokeWidth={2.2} />
              {trend7d > 0 ? '+' : ''}{trend7d}% 7d
            </motion.span>
          </div>

          {/* Sparkline 7 days */}
          <motion.div
            className="mt-5 h-12 -mx-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="mind-snap-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={MIND_ACCENT} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={MIND_ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="natural"
                  dataKey="v"
                  stroke={MIND_ACCENT}
                  strokeWidth={2.5}
                  fill="url(#mind-snap-grad)"
                  isAnimationActive
                  animationDuration={1200}
                  animationBegin={400}
                  dot={false}
                  activeDot={false}
                />
                {/* Pulsing dot on last point */}
                <Area
                  type="natural"
                  dataKey="v"
                  stroke="none"
                  fill="none"
                  dot={(props: any) => {
                    const { cx, cy, index } = props;
                    if (index !== sparkData.length - 1) return <g key={index} />;
                    return (
                      <g key={index}>
                        <circle cx={cx} cy={cy} r={4} fill={MIND_ACCENT} stroke="none">
                          <animate
                            attributeName="r"
                            values="4;7;4"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="1;0.3;1"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        </circle>
                        <circle cx={cx} cy={cy} r={3} fill={MIND_ACCENT} stroke="white" strokeWidth={1.5} />
                      </g>
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        {/* DIAGNOSIS — tension reveal */}
        <motion.div
          variants={tensionReveal}
          className={`${CARD_HERO} p-5 mt-3`}
          style={{ borderLeft: `3px solid ${statusColor}` }}
        >
          <p className={`text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED} mb-2 flex items-center gap-1.5`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
            Diagnóstico
          </p>
          <p className={`text-[15px] leading-relaxed font-semibold ${T_STRONG}`}>
            {diagnosis.snapshotDiagnosis}
          </p>
        </motion.div>

        {/* STORY — last to appear */}
        <motion.div
          variants={storyReveal}
          className="mt-4 px-1"
        >
          <p className={`text-[20px] md:text-[24px] font-bold leading-snug tracking-tight ${T_STRONG}`}>
            {diagnosis.snapshotStory.split(' ').map((word, i) => {
              // Highlight key negative words
              const isKeyword = ['perdendo', 'caindo', 'crítico', 'queda', 'crítica'].some(kw =>
                word.toLowerCase().includes(kw)
              );
              return (
                <span
                  key={i}
                  style={isKeyword ? { color: '#ef4444' } : undefined}
                >
                  {word}{' '}
                </span>
              );
            })}
          </p>
        </motion.div>

        {/* CTA */}
        <motion.button
          type="button"
          onClick={onAnalyze}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.4 }}
          className={[
            'mt-6 w-full flex items-center justify-between gap-3',
            'h-14 px-5 rounded-2xl',
            'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900',
            'border border-white/10 dark:border-zinc-200',
            'shadow-xl transition-all hover:scale-[1.02] active:scale-[0.99]',
          ].join(' ')}
        >
          <span className="flex items-center gap-2">
            <Brain size={18} />
            <span className="text-[13px] font-bold tracking-wide">Analisar em detalhes</span>
          </span>
          <ChevronRight size={18} className="opacity-50" />
        </motion.button>
      </motion.section>

      {/* Footer */}
      <p className={`mt-8 px-5 text-center text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>
        · snapshot atualizado agora ·
      </p>
    </div>
  );
}
